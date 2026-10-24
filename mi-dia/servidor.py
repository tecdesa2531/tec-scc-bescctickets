# Organizador de atenciones - servidor local
# Solo usa la biblioteca estandar de Python. No requiere instalar paquetes.
#
# Uso:
#   python servidor.py
#
# Variables de entorno:
#   AT_RAIZ_TRABAJO  carpeta limpia (correos, adjuntos, capturas de avance)
#   AT_RAIZ_PROCESO  carpeta privada (JSON de la herramienta, Copilot y Jira)
#   AT_CORREO        tu correo, para reconocer los correos que tu envias
#   AT_PUERTO        opcional, por defecto 8765

import json
import os
import re
import shutil
import sys
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse

import lib.config as config
import lib.atenciones as atenciones
import lib.foco as foco
import lib.indice as indice
import lib.cola as cola
import lib.proyectos as proyectos
from lib.util import ErrorUsuario, leer_json

CARPETA_CODIGO = os.path.dirname(os.path.abspath(__file__))
TAMANIO_MAXIMO = 100 * 1024 * 1024  # 100 MB por peticion

TIPOS_CONTENIDO = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
    ".pdf": "application/pdf", ".txt": "text/plain; charset=utf-8",
}

RUTAS_POST = {
    "/api/atencion/crear":        lambda p: atenciones.crear_atencion(p),
    "/api/atencion/datos":        lambda p: atenciones.guardar_datos_generales(p),
    "/api/atencion/identidad":    lambda p: {"id": atenciones.cambiar_identidad(p)},
    "/api/atencion/padre":        lambda p: {"id": atenciones.cambiar_padre(p)},
    "/api/atencion/terminar":     lambda p: atenciones.terminar_atencion(p),
    "/api/atencion/conforme":     lambda p: atenciones.dar_conforme(p),
    "/api/atencion/abrir_carpeta": lambda p: atenciones.abrir_carpeta(p),
    "/api/entrada/crear":         lambda p: {"id": atenciones.crear_entrada(p)},
    "/api/entrada/editar":        lambda p: atenciones.editar_entrada(p),
    "/api/interrupcion/notas":    lambda p: atenciones.guardar_notas_interrupcion(p),
    "/api/interrupcion/proyecto": lambda p: {"id": atenciones.cambiar_proyecto_interrupcion(p)},
    "/api/interrupcion/adjunto":  lambda p: atenciones.agregar_adjunto_interrupcion(p),
    "/api/interrupcion/cerrar":   lambda p: atenciones.cerrar_interrupcion(p),
    "/api/interrupcion/cancelar": lambda p: atenciones.cancelar_interrupcion(p),
    "/api/foco/cambiar":          lambda p: foco.cambiar_foco(p),
    "/api/foco/terminar_dia":     lambda p: foco.terminar_dia(),
    "/api/foco/cerrar_anterior":  lambda p: foco.cerrar_foco_anterior(p),
    "/api/ideas/crear":           lambda p: foco.crear_idea(p.get("texto")),
    "/api/ideas/estado":          lambda p: foco.cambiar_estado_idea(p),
}


def preparar_carpetas_herramienta():
    os.makedirs(os.path.join(config.RAIZ_PROCESO, config.CARPETA_HERRAMIENTA,
                             config.CARPETA_FOCOS), exist_ok=True)
    os.makedirs(os.path.join(config.RAIZ_PROCESO, config.CARPETA_SIN_ASIGNAR), exist_ok=True)
    destino = config.ruta_accesos()
    if not os.path.isfile(destino):
        ejemplo = os.path.join(CARPETA_CODIGO, "ejemplos", "accesos.json")
        if os.path.isfile(ejemplo):
            shutil.copyfile(ejemplo, destino)
        else:
            from lib.util import escribir_json
            escribir_json(destino, {"grupos": []})


class Manejador(BaseHTTPRequestHandler):

    def log_message(self, formato, *argumentos):
        # Sin registro de cada peticion, para mantener limpia la consola
        pass

    def origen_permitido(self):
        # Solo acepta peticiones de la propia pagina (127.0.0.1 o localhost)
        anfitrion = (self.headers.get("Host") or "").split(":")[0]
        if anfitrion not in ("127.0.0.1", "localhost", "focusflow.localhost"):
            return False
        origen = self.headers.get("Origin")
        if origen and urlparse(origen).hostname not in ("127.0.0.1", "localhost", "focusflow.localhost"):
            return False
        return True

    def enviar(self, codigo, contenido, tipo):
        self.send_response(codigo)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(contenido)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(contenido)

    def enviar_json(self, codigo, datos):
        self.enviar(codigo, json.dumps(datos, ensure_ascii=False).encode("utf-8"),
                    "application/json; charset=utf-8")

    def ejecutar(self, funcion):
        try:
            resultado = funcion()
            self.enviar_json(200, resultado if resultado is not None else {"ok": True})
        except ErrorUsuario as error:
            self.enviar_json(400, {"error": str(error)})
        except Exception as error:  # se muestra en consola para revisarlo
            traceback.print_exc()
            self.enviar_json(500, {"error": "Error interno: " + str(error)})

    def do_GET(self):
        if not self.origen_permitido():
            self.enviar(403, b"No permitido", "text/plain")
            return
        url = urlparse(self.path)
        consulta = parse_qs(url.query)

        def parametro(nombre):
            return consulta.get(nombre, [""])[0]

        es_ruta_detalle = any(
            url.path.startswith("/" + t + "/") and
            re.match(r"^[A-Z0-9]+$", url.path[len("/" + t + "/"):])
            for t in config.TIPOS_ATENCION
        )
        if url.path in ("/", "/index.html") or es_ruta_detalle:
            with open(os.path.join(CARPETA_CODIGO, "index.html"), "rb") as archivo:
                self.enviar(200, archivo.read(), "text/html; charset=utf-8")
        elif url.path.startswith("/static/"):
            nombre = os.path.basename(url.path)
            if not re.match(r'^[\w.-]+\.(css|js)$', nombre):
                self.enviar(404, b"No encontrado", "text/plain")
                return
            ruta_static = os.path.join(CARPETA_CODIGO, "static", nombre)
            if not os.path.isfile(ruta_static):
                self.enviar(404, b"No encontrado", "text/plain")
                return
            tipos_static = {".css": "text/css; charset=utf-8",
                            ".js": "application/javascript; charset=utf-8"}
            tipo_static = tipos_static.get(os.path.splitext(nombre)[1].lower(),
                                           "application/octet-stream")
            with open(ruta_static, "rb") as archivo:
                self.enviar(200, archivo.read(), tipo_static)
        elif url.path == "/api/inicio":
            self.ejecutar(lambda: {"correo_configurado": bool(config.MI_CORREO),
                                   "raiz_trabajo": config.RAIZ_TRABAJO,
                                   "raiz_proceso": config.RAIZ_PROCESO})
        elif url.path == "/api/accesos":
            self.ejecutar(lambda: leer_json(config.ruta_accesos(), {"grupos": []}))
        elif url.path == "/api/proyectos":
            self.ejecutar(proyectos.listar_proyectos)
        elif url.path == "/api/atenciones":
            self.ejecutar(atenciones.resumen_atenciones)
        elif url.path == "/api/atencion/siguiente_numero":
            t = parametro("tipo")
            self.ejecutar(lambda: atenciones.proximo_numero(t))
        elif url.path == "/api/atencion":
            num = parametro("numero")
            id_ = parametro("id")
            if num:
                self.ejecutar(lambda: atenciones.detalle_atencion_por_numero(num))
            else:
                self.ejecutar(lambda: atenciones.detalle_atencion(id_))
        elif url.path == "/api/foco":
            self.ejecutar(foco.estado_foco)
        elif url.path == "/api/ideas":
            self.ejecutar(foco.leer_ideas)
        elif url.path == "/api/buscar":
            q = parametro("q")
            self.ejecutar(lambda: indice.buscar(q))
        elif url.path == "/archivo":
            self.enviar_archivo(parametro("id"), parametro("raiz"), parametro("ruta"))
        elif url.path == "/favicon.ico":
            self.enviar(204, b"", "image/x-icon")
        else:
            self.enviar(404, b"No encontrado", "text/plain")

    def enviar_archivo(self, id_atencion, raiz, ruta):
        try:
            from lib.util import ruta_segura
            registro = atenciones.buscar_atencion(id_atencion)
            carpeta_trabajo, carpeta_proceso = atenciones.carpetas_de(registro)
            base = carpeta_trabajo if raiz == "trabajo" else carpeta_proceso
            completa = ruta_segura(base, ruta)
            if not os.path.isfile(completa):
                raise ErrorUsuario("No existe el archivo")
            extension = os.path.splitext(completa)[1].lower()
            with open(completa, "rb") as archivo:
                contenido = archivo.read()
            self.send_response(200)
            self.send_header("Content-Type",
                             TIPOS_CONTENIDO.get(extension, "application/octet-stream"))
            self.send_header("Content-Length", str(len(contenido)))
            if extension not in TIPOS_CONTENIDO:
                nombre = os.path.basename(completa)
                nombre_ascii = nombre.encode("ascii", "ignore").decode("ascii").replace('"', "") or "archivo"
                self.send_header("Content-Disposition",
                                 "attachment; filename=\"%s\"; filename*=UTF-8''%s"
                                 % (nombre_ascii, quote(nombre)))
            self.end_headers()
            self.wfile.write(contenido)
        except ErrorUsuario as error:
            self.enviar(404, str(error).encode("utf-8"), "text/plain; charset=utf-8")

    def do_POST(self):
        if not self.origen_permitido():
            self.enviar(403, b"No permitido", "text/plain")
            return
        if not (self.headers.get("Content-Type") or "").startswith("application/json"):
            self.enviar_json(415, {"error": "Se esperaba JSON"})
            return
        largo = int(self.headers.get("Content-Length") or 0)
        if largo > TAMANIO_MAXIMO:
            self.enviar_json(413, {"error": "El envio supera los 100 MB"})
            return
        try:
            parametros = json.loads(self.rfile.read(largo).decode("utf-8") or "{}")
        except ValueError:
            self.enviar_json(400, {"error": "JSON no valido"})
            return
        funcion = RUTAS_POST.get(urlparse(self.path).path)
        if funcion is None:
            self.enviar_json(404, {"error": "Ruta no encontrada"})
            return
        self.ejecutar(lambda: funcion(parametros))


def main():
    errores = config.configurar()
    if errores:
        for error in errores:
            print("ERROR: " + error)
        print("Revisa la seccion de variables de entorno en README.md")
        sys.exit(1)
    if not config.MI_CORREO:
        print("Aviso: falta AT_CORREO. Todos los correos se tomaran como 'asignado'.")
    preparar_carpetas_herramienta()
    registros = atenciones.buscar_atenciones()
    indice.init_indice(registros)
    cola.regenerar(registros)
    servidor = ThreadingHTTPServer(("127.0.0.1", config.PUERTO), Manejador)
    print("Focus Flow iniciado en http://127.0.0.1:%d" % config.PUERTO)
    print("Raiz de trabajo: " + config.RAIZ_TRABAJO)
    print("Raiz de proceso: " + config.RAIZ_PROCESO)
    print("Para detenerlo presiona Ctrl+C")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("Servidor detenido")
    finally:
        servidor.server_close()


if __name__ == "__main__":
    main()
