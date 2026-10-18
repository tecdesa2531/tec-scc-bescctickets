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

import base64
import binascii
import datetime
import email
import email.policy
import email.utils
import json
import os
import re
import secrets
import shutil
import sys
import threading
import time
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse


# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

PUERTO = int(os.environ.get("AT_PUERTO", "8765"))
CARPETA_CODIGO = os.path.dirname(os.path.abspath(__file__))
TAMANIO_MAXIMO = 100 * 1024 * 1024  # 100 MB por peticion

CARPETA_HERRAMIENTA = "003_Herramienta"
CARPETA_SIN_ASIGNAR = "004_SinAsignar"
CARPETA_FOCOS = "010_Focos"
CARPETA_JIRA = "040_ProcesoJira"
SUB_TRABAJO_TEMPORAL = "trabajo"

CARPETA_ADJ_ASIGNADO = "010_CorreoAsignadoAdjuntos"
CARPETA_ADJ_ATENDIDO = "020_CorreoAtendidoAdjuntos"
CARPETA_PROCESO_ATENCION = "030_ProcesoAtencion"
SUBCARPETAS_TRABAJO = [CARPETA_ADJ_ASIGNADO, CARPETA_ADJ_ATENDIDO, CARPETA_PROCESO_ATENCION]

# Combinaciones de entornos permitidas y su carpeta
ENTORNOS_CARPETA = {
    "DEV": "010_Dev",
    "PRE": "020_Pre",
    "PRO": "030_Pro",
    "VARIOS": "040_Varios",
    "DEV,PRE": "050_DevPre",
    "PRE,PRO": "060_PrePro",
    "DEV,PRE,PRO": "070_DevPrePro",
}
ORDEN_ENTORNOS = ["DEV", "PRE", "PRO", "VARIOS"]

TIPOS_ATENCION = ["ticket", "int", "doc", "con"]
PREFIJOS_PROPIOS = {"int": "INT", "doc": "DOC", "con": "CON"}
PROYECTOS_FIJOS = ["INFRAS", "DOCINF"]
ESTADOS = ["en_curso", "en_espera", "atendido", "descartado"]
TIPOS_ENTRADA = ["solicitud", "asignacion", "avance", "cierre"]
HU_TIPOS = ["semanal", "independiente"]

PATRON_PROYECTO = re.compile(r"^(\d{3})_([A-Za-z]{6})$")
PATRON_NUMERADO = re.compile(r"^(\d{3})_")

FORMATO_FECHA = "%Y-%m-%d %H:%M"
FORMATO_FECHA_SEG = "%Y-%m-%d %H:%M:%S"

BLOQUEO = threading.RLock()

RAIZ_TRABAJO = ""
RAIZ_PROCESO = ""
MI_CORREO = ""


class ErrorUsuario(Exception):
    """Error que se muestra tal cual en la pantalla."""


# ---------------------------------------------------------------------------
# Utilidades generales
# ---------------------------------------------------------------------------

def ahora():
    return datetime.datetime.now()


def texto_fecha(fecha):
    return fecha.strftime(FORMATO_FECHA)


def texto_fecha_seg(fecha):
    return fecha.strftime(FORMATO_FECHA_SEG)


def leer_fecha_seg(texto):
    return datetime.datetime.strptime(texto, FORMATO_FECHA_SEG)


def nuevo_id(prefijo):
    return prefijo + ahora().strftime("%Y%m%d%H%M%S") + secrets.token_hex(2)


def leer_json(ruta, por_defecto):
    if not os.path.isfile(ruta):
        return por_defecto
    with open(ruta, "r", encoding="utf-8") as archivo:
        return json.load(archivo)


def escribir_json(ruta, datos):
    # Escribe en un archivo temporal y luego lo reemplaza, para no dejar
    # un JSON a medias. OneDrive puede bloquear el archivo un instante,
    # por eso se reintenta unas veces.
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    temporal = ruta + ".tmp"
    with open(temporal, "w", encoding="utf-8") as archivo:
        json.dump(datos, archivo, ensure_ascii=False, indent=2)
        archivo.write("\n")
    for intento in range(5):
        try:
            os.replace(temporal, ruta)
            return
        except PermissionError:
            if intento == 4:
                raise
            time.sleep(0.3)


def escribir_binario(ruta, contenido):
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    with open(ruta, "wb") as archivo:
        archivo.write(contenido)


def limpiar_nombre(nombre):
    # Deja solo el nombre del archivo y quita caracteres no validos en Windows
    nombre = os.path.basename((nombre or "").replace("\\", "/"))
    nombre = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", nombre).strip(" .")
    return nombre or "archivo"


def ruta_segura(base, relativa):
    # Evita que una ruta relativa salga de la carpeta base
    base_real = os.path.realpath(base)
    final = os.path.realpath(os.path.join(base_real, relativa))
    if final != base_real and not final.startswith(base_real + os.sep):
        raise ErrorUsuario("Ruta no permitida")
    return final


def nombre_libre(carpeta, base, extension):
    # Devuelve base.ext o, si ya existe, base_02.ext, base_03.ext...
    candidato = base + extension
    numero = 2
    while os.path.exists(os.path.join(carpeta, candidato)):
        candidato = "%s_%02d%s" % (base, numero, extension)
        numero += 1
    return candidato


def mismo_contenido(ruta, contenido):
    if not os.path.isfile(ruta) or os.path.getsize(ruta) != len(contenido):
        return False
    with open(ruta, "rb") as archivo:
        return archivo.read() == contenido


def guardar_sin_duplicar(carpeta, nombre, contenido):
    # Guarda con el nombre original. Si ya existe un archivo igual, lo reutiliza.
    # Si existe uno distinto con el mismo nombre, agrega _02, _03...
    os.makedirs(carpeta, exist_ok=True)
    if mismo_contenido(os.path.join(carpeta, nombre), contenido):
        return nombre
    base, extension = os.path.splitext(nombre)
    numero = 2
    candidato = nombre
    while os.path.exists(os.path.join(carpeta, candidato)):
        if mismo_contenido(os.path.join(carpeta, candidato), contenido):
            return candidato
        candidato = "%s_%02d%s" % (base, numero, extension)
        numero += 1
    escribir_binario(os.path.join(carpeta, candidato), contenido)
    return candidato


def decodificar_base64(texto):
    # Acepta base64 puro o el formato data:...;base64,...
    if not isinstance(texto, str) or not texto:
        raise ErrorUsuario("Archivo vacio")
    if texto.startswith("data:") and "," in texto:
        texto = texto.split(",", 1)[1]
    try:
        return base64.b64decode(texto, validate=False)
    except (binascii.Error, ValueError):
        raise ErrorUsuario("No se pudo leer el archivo enviado")


def extension_de_imagen(texto):
    if isinstance(texto, str) and texto.startswith("data:image/jpeg"):
        return ".jpg"
    return ".png"


def ruta_relativa(base, ruta):
    return os.path.relpath(ruta, base).replace("\\", "/")


# ---------------------------------------------------------------------------
# Configuracion
# ---------------------------------------------------------------------------

def configurar():
    global RAIZ_TRABAJO, RAIZ_PROCESO, MI_CORREO
    errores = []
    RAIZ_TRABAJO = os.environ.get("AT_RAIZ_TRABAJO", "").strip().strip('"')
    RAIZ_PROCESO = os.environ.get("AT_RAIZ_PROCESO", "").strip().strip('"')
    MI_CORREO = os.environ.get("AT_CORREO", "").strip().lower()

    if not RAIZ_TRABAJO:
        errores.append("Falta la variable de entorno AT_RAIZ_TRABAJO")
    elif not os.path.isdir(RAIZ_TRABAJO):
        errores.append("No existe la carpeta de AT_RAIZ_TRABAJO: " + RAIZ_TRABAJO)

    if not RAIZ_PROCESO:
        errores.append("Falta la variable de entorno AT_RAIZ_PROCESO")
    elif not os.path.isdir(RAIZ_PROCESO):
        errores.append("No existe la carpeta de AT_RAIZ_PROCESO: " + RAIZ_PROCESO)

    if not errores:
        trabajo = os.path.realpath(RAIZ_TRABAJO)
        proceso = os.path.realpath(RAIZ_PROCESO)
        if trabajo == proceso:
            errores.append("AT_RAIZ_TRABAJO y AT_RAIZ_PROCESO deben ser carpetas distintas")
        elif trabajo.startswith(proceso + os.sep) or proceso.startswith(trabajo + os.sep):
            errores.append("Una raiz no puede estar dentro de la otra")
        RAIZ_TRABAJO = trabajo
        RAIZ_PROCESO = proceso
    return errores


def preparar_carpetas_herramienta():
    os.makedirs(os.path.join(RAIZ_PROCESO, CARPETA_HERRAMIENTA, CARPETA_FOCOS), exist_ok=True)
    os.makedirs(os.path.join(RAIZ_PROCESO, CARPETA_SIN_ASIGNAR), exist_ok=True)
    destino = ruta_accesos()
    if not os.path.isfile(destino):
        ejemplo = os.path.join(CARPETA_CODIGO, "ejemplos", "accesos.json")
        if os.path.isfile(ejemplo):
            shutil.copyfile(ejemplo, destino)
        else:
            escribir_json(destino, {"grupos": []})


def ruta_accesos():
    return os.path.join(RAIZ_PROCESO, CARPETA_HERRAMIENTA, "accesos.json")


def ruta_ideas():
    return os.path.join(RAIZ_PROCESO, CARPETA_HERRAMIENTA, "ideas.json")


def carpeta_focos():
    return os.path.join(RAIZ_PROCESO, CARPETA_HERRAMIENTA, CARPETA_FOCOS)


# ---------------------------------------------------------------------------
# Proyectos y carpetas
# ---------------------------------------------------------------------------

def carpetas_proyecto_existentes():
    # Devuelve {codigo: nombre_carpeta} con los proyectos de ambas raices
    proyectos = {}
    for raiz in (RAIZ_TRABAJO, RAIZ_PROCESO):
        for nombre in sorted(os.listdir(raiz)):
            coincidencia = PATRON_PROYECTO.match(nombre)
            if not coincidencia or int(coincidencia.group(1)) < 10:
                continue
            if not os.path.isdir(os.path.join(raiz, nombre)):
                continue
            proyectos.setdefault(coincidencia.group(2).upper(), nombre)
    return proyectos


def listar_proyectos():
    proyectos = carpetas_proyecto_existentes()
    for codigo in PROYECTOS_FIJOS:
        proyectos.setdefault(codigo, "")
    return [{"codigo": codigo, "carpeta": proyectos[codigo]} for codigo in sorted(proyectos)]


def carpeta_de_proyecto(codigo):
    # Usa la carpeta existente del proyecto o calcula el nombre de una nueva
    existentes = carpetas_proyecto_existentes()
    if codigo in existentes:
        return existentes[codigo]
    numeros = []
    for raiz in (RAIZ_TRABAJO, RAIZ_PROCESO):
        for nombre in os.listdir(raiz):
            coincidencia = PATRON_NUMERADO.match(nombre)
            if coincidencia and int(coincidencia.group(1)) >= 10:
                numeros.append(int(coincidencia.group(1)))
    siguiente = (max(numeros) // 10 + 1) * 10 if numeros else 10
    return "%03d_%s" % (siguiente, codigo.capitalize())


def normalizar_entornos(entornos):
    if not isinstance(entornos, list):
        return []
    limpios = []
    for entorno in entornos:
        entorno = str(entorno).strip().upper()
        if entorno in ORDEN_ENTORNOS and entorno not in limpios:
            limpios.append(entorno)
    return sorted(limpios, key=ORDEN_ENTORNOS.index)


def carpeta_de_entornos(entornos):
    clave = ",".join(entornos)
    if clave not in ENTORNOS_CARPETA:
        raise ErrorUsuario("Combinacion de entornos no soportada: " + (clave or "ninguno"))
    return ENTORNOS_CARPETA[clave]


def siguiente_correlativo(relativa_entorno):
    numeros = [0]
    for raiz in (RAIZ_TRABAJO, RAIZ_PROCESO):
        carpeta = os.path.join(raiz, relativa_entorno)
        if os.path.isdir(carpeta):
            for nombre in os.listdir(carpeta):
                coincidencia = PATRON_NUMERADO.match(nombre)
                if coincidencia:
                    numeros.append(int(coincidencia.group(1)))
    return max(numeros) + 1


def siguiente_codigo_propio(prefijo):
    mayor = 0
    patron = re.compile("^" + prefijo + r"(\d+)$")
    for registro in buscar_atenciones():
        coincidencia = patron.match(registro["datos"].get("tracking_id", ""))
        if coincidencia:
            mayor = max(mayor, int(coincidencia.group(1)))
    return "%s%03d" % (prefijo, mayor + 1)


def crear_subcarpetas(carpeta_trabajo, carpeta_proceso):
    for sub in SUBCARPETAS_TRABAJO:
        os.makedirs(os.path.join(carpeta_trabajo, sub), exist_ok=True)
    os.makedirs(os.path.join(carpeta_proceso, CARPETA_JIRA), exist_ok=True)


# ---------------------------------------------------------------------------
# Atenciones
# ---------------------------------------------------------------------------

def buscar_atenciones():
    # Recorre la raiz de proceso buscando ticket-datos.json creados por la herramienta
    registros = []
    for proyecto in sorted(os.listdir(RAIZ_PROCESO)):
        ruta_proyecto = os.path.join(RAIZ_PROCESO, proyecto)
        if not PATRON_PROYECTO.match(proyecto) or not os.path.isdir(ruta_proyecto):
            continue
        for entorno in sorted(os.listdir(ruta_proyecto)):
            ruta_entorno = os.path.join(ruta_proyecto, entorno)
            if not os.path.isdir(ruta_entorno):
                continue
            for atencion in sorted(os.listdir(ruta_entorno)):
                relativa = os.path.join(proyecto, entorno, atencion)
                agregar_registro(registros, relativa, False)
    sin_asignar = os.path.join(RAIZ_PROCESO, CARPETA_SIN_ASIGNAR)
    if os.path.isdir(sin_asignar):
        for nombre in sorted(os.listdir(sin_asignar)):
            agregar_registro(registros, os.path.join(CARPETA_SIN_ASIGNAR, nombre), True)
    return registros


def agregar_registro(registros, relativa, temporal):
    ruta = os.path.join(RAIZ_PROCESO, relativa, "ticket-datos.json")
    if not os.path.isfile(ruta):
        return
    try:
        datos = leer_json(ruta, {})
    except (ValueError, OSError):
        print("Aviso: no se pudo leer " + ruta)
        return
    if datos.get("id_herramienta"):
        registros.append({"id": datos["id_herramienta"], "relativa": relativa,
                          "temporal": temporal, "datos": datos})


def buscar_atencion(id_atencion):
    for registro in buscar_atenciones():
        if registro["id"] == id_atencion:
            return registro
    raise ErrorUsuario("No se encontro la atencion")


def carpetas_de(registro):
    carpeta_proceso = os.path.join(RAIZ_PROCESO, registro["relativa"])
    if registro["temporal"]:
        carpeta_trabajo = os.path.join(carpeta_proceso, SUB_TRABAJO_TEMPORAL)
    else:
        carpeta_trabajo = os.path.join(RAIZ_TRABAJO, registro["relativa"])
    return carpeta_trabajo, carpeta_proceso


def ruta_datos(registro):
    return os.path.join(RAIZ_PROCESO, registro["relativa"], "ticket-datos.json")


def ruta_bitacora(registro):
    return os.path.join(RAIZ_PROCESO, registro["relativa"], "bitacora.json")


def actualizar_datos(registro, cambios):
    # Lee el archivo actual y solo cambia los campos indicados,
    # para no pisar lo que Copilot haya escrito (resumen, subtareas...)
    ruta = ruta_datos(registro)
    datos = leer_json(ruta, {})
    datos.update(cambios)
    datos["actualizado"] = texto_fecha(ahora())
    escribir_json(ruta, datos)
    registro["datos"] = datos
    return datos


def identidad_completa(tipo, codigo, tracking_id, entornos):
    if not re.match(r"^[A-Z]{6}$", codigo or ""):
        return False
    if not tracking_id:
        return False
    if tipo in ("ticket", "int"):
        return ",".join(entornos) in ENTORNOS_CARPETA and entornos != ["VARIOS"]
    return True


def ubicacion_definitiva(codigo, tracking_id, entornos):
    carpeta_proyecto = carpeta_de_proyecto(codigo)
    carpeta_entorno = carpeta_de_entornos(entornos)
    relativa_entorno = os.path.join(carpeta_proyecto, carpeta_entorno)
    numero = siguiente_correlativo(relativa_entorno)
    relativa = os.path.join(relativa_entorno, "%03d_%s" % (numero, tracking_id))
    return relativa, carpeta_entorno


def validar_tracking_id(tracking_id, id_actual):
    for registro in buscar_atenciones():
        if registro["id"] != id_actual and registro["datos"].get("tracking_id") == tracking_id:
            raise ErrorUsuario("Ya existe una atencion con el ID " + tracking_id)


def leer_entrada_identidad(parametros, tipo):
    codigo = str(parametros.get("tracking_code", "")).strip().upper()
    if codigo and not re.match(r"^[A-Z]{6}$", codigo):
        raise ErrorUsuario("El codigo de proyecto debe tener 6 letras")
    if tipo in ("doc", "con"):
        entornos = ["VARIOS"]
    else:
        entornos = normalizar_entornos(parametros.get("entornos", []))
        if "VARIOS" in entornos:
            raise ErrorUsuario("Varios solo aplica a DOC y CON")
        if entornos:
            carpeta_de_entornos(entornos)
    return codigo, entornos


def crear_atencion(parametros):
    tipo = parametros.get("tipo", "")
    if tipo not in TIPOS_ATENCION:
        raise ErrorUsuario("Tipo de atencion no valido")
    titulo = str(parametros.get("titulo", "")).strip()
    if not titulo:
        raise ErrorUsuario("El titulo es obligatorio")
    hu_tipo = parametros.get("hu_tipo", "semanal")
    if hu_tipo not in HU_TIPOS:
        raise ErrorUsuario("Tipo de HU no valido")

    with BLOQUEO:
        codigo, entornos = leer_entrada_identidad(parametros, tipo)
        if tipo == "ticket":
            tracking_id = str(parametros.get("tracking_id", "")).strip().upper()
            if tracking_id and not re.match(r"^[A-Z0-9_-]+$", tracking_id):
                raise ErrorUsuario("El numero de ticket solo puede tener letras, numeros, - y _")
        else:
            tracking_id = siguiente_codigo_propio(PREFIJOS_PROPIOS[tipo])
        if tracking_id:
            validar_tracking_id(tracking_id, "")

        id_atencion = nuevo_id("a")
        momento = texto_fecha(ahora())
        datos = {
            "id_herramienta": id_atencion,
            "tipo": tipo,
            "tracking_code": codigo,
            "tracking_id": tracking_id,
            "nombre": "",
            "hu_tipo": hu_tipo,
            "carpeta_entorno": "",
            "entornos": entornos,
            "titulo": titulo,
            "resumen": "",
            "solicitante": "",
            "estado": "en_curso",
            "url_servicenow": str(parametros.get("url_servicenow", "")).strip(),
            "workspace_edge": str(parametros.get("workspace_edge", "")).strip(),
            "listo_para_jira": "",
            "correos": [],
            "subtareas": [],
            "creado": momento,
            "actualizado": momento,
        }

        if identidad_completa(tipo, codigo, tracking_id, entornos):
            relativa, carpeta_entorno = ubicacion_definitiva(codigo, tracking_id, entornos)
            datos["carpeta_entorno"] = carpeta_entorno
            temporal = False
        else:
            relativa = os.path.join(CARPETA_SIN_ASIGNAR, id_atencion)
            temporal = True

        registro = {"id": id_atencion, "relativa": relativa, "temporal": temporal, "datos": datos}
        carpeta_trabajo, carpeta_proceso = carpetas_de(registro)
        crear_subcarpetas(carpeta_trabajo, carpeta_proceso)
        escribir_json(ruta_datos(registro), datos)
        escribir_json(ruta_bitacora(registro), {"entradas": []})
        return id_atencion


def cambiar_identidad(parametros):
    with BLOQUEO:
        registro = buscar_atencion(parametros.get("id", ""))
        datos = registro["datos"]
        tipo = datos.get("tipo", "")
        codigo, entornos = leer_entrada_identidad(parametros, tipo)
        tracking_id = datos.get("tracking_id", "")

        if tipo == "ticket" and registro["temporal"]:
            tracking_id = str(parametros.get("tracking_id", "")).strip().upper()
            if tracking_id and not re.match(r"^[A-Z0-9_-]+$", tracking_id):
                raise ErrorUsuario("El numero de ticket solo puede tener letras, numeros, - y _")
            if tracking_id:
                validar_tracking_id(tracking_id, registro["id"])

        if not registro["temporal"]:
            if codigo != datos.get("tracking_code"):
                raise ErrorUsuario("El proyecto ya no se puede cambiar; solo los entornos")
            if entornos == datos.get("entornos"):
                return registro["id"]

        if not identidad_completa(tipo, codigo, tracking_id, entornos):
            # Sigue sin identidad completa: solo guarda lo que haya
            actualizar_datos(registro, {"tracking_code": codigo, "tracking_id": tracking_id,
                                        "entornos": entornos})
            return registro["id"]

        trabajo_anterior, proceso_anterior = carpetas_de(registro)
        relativa, carpeta_entorno = ubicacion_definitiva(codigo, tracking_id, entornos)
        trabajo_nueva = os.path.join(RAIZ_TRABAJO, relativa)
        proceso_nueva = os.path.join(RAIZ_PROCESO, relativa)
        if os.path.exists(trabajo_nueva) or os.path.exists(proceso_nueva):
            raise ErrorUsuario("Ya existe la carpeta destino " + relativa)

        os.makedirs(os.path.dirname(trabajo_nueva), exist_ok=True)
        os.makedirs(os.path.dirname(proceso_nueva), exist_ok=True)
        if os.path.isdir(trabajo_anterior):
            shutil.move(trabajo_anterior, trabajo_nueva)
        shutil.move(proceso_anterior, proceso_nueva)

        registro["relativa"] = relativa
        registro["temporal"] = False
        crear_subcarpetas(trabajo_nueva, proceso_nueva)
        actualizar_datos(registro, {"tracking_code": codigo, "tracking_id": tracking_id,
                                    "entornos": entornos, "carpeta_entorno": carpeta_entorno})
        return registro["id"]


def guardar_datos_generales(parametros):
    with BLOQUEO:
        registro = buscar_atencion(parametros.get("id", ""))
        cambios = {}
        if "titulo" in parametros:
            titulo = str(parametros["titulo"]).strip()
            if not titulo:
                raise ErrorUsuario("El titulo es obligatorio")
            cambios["titulo"] = titulo
        if "url_servicenow" in parametros:
            cambios["url_servicenow"] = str(parametros["url_servicenow"]).strip()
        if "workspace_edge" in parametros:
            cambios["workspace_edge"] = str(parametros["workspace_edge"]).strip()
        if "hu_tipo" in parametros:
            if parametros["hu_tipo"] not in HU_TIPOS:
                raise ErrorUsuario("Tipo de HU no valido")
            cambios["hu_tipo"] = parametros["hu_tipo"]
        if "estado" in parametros:
            if parametros["estado"] not in ESTADOS:
                raise ErrorUsuario("Estado no valido")
            cambios["estado"] = parametros["estado"]
        actualizar_datos(registro, cambios)


def terminar_atencion(parametros):
    with BLOQUEO:
        registro = buscar_atencion(parametros.get("id", ""))
        if registro["temporal"]:
            raise ErrorUsuario("Completa el proyecto y el ID antes de terminar")
        actualizar_datos(registro, {"estado": "atendido",
                                    "listo_para_jira": texto_fecha(ahora())})


# ---------------------------------------------------------------------------
# Bitacora
# ---------------------------------------------------------------------------

def leer_bitacora(registro):
    return leer_json(ruta_bitacora(registro), {"entradas": []})


def ids_enviados(registro):
    # Lee (sin modificar) los archivos de comentarios de Copilot para saber
    # que entradas ya se subieron a Jira
    enviados = set()
    carpeta = os.path.join(RAIZ_PROCESO, registro["relativa"], CARPETA_JIRA)
    if not os.path.isdir(carpeta):
        return enviados
    for nombre in os.listdir(carpeta):
        if not (nombre.startswith("jira-comentarios") and nombre.endswith(".json")):
            continue
        try:
            datos = leer_json(os.path.join(carpeta, nombre), {})
        except (ValueError, OSError):
            continue
        for comentario in datos.get("comentarios", []):
            if not comentario.get("subido"):
                continue
            if comentario.get("bitacora_id"):
                enviados.add(comentario["bitacora_id"])
            for id_entrada in comentario.get("bitacora_ids") or []:
                enviados.add(id_entrada)
    return enviados


def contar_pendientes(registro, entradas, enviados):
    return len([e for e in entradas if e.get("para_jira") and e["id"] not in enviados])


def guardar_correo(contenido, carpeta_trabajo):
    mensaje = email.message_from_bytes(contenido, policy=email.policy.default)
    remitente = str(mensaje.get("From", "") or "")
    direccion = email.utils.parseaddr(remitente)[1].lower()
    tipo = "atendido" if MI_CORREO and direccion == MI_CORREO else "asignado"

    fecha = ahora()
    try:
        fecha_correo = email.utils.parsedate_to_datetime(str(mensaje.get("Date", "")))
        if fecha_correo.tzinfo is not None:
            fecha_correo = fecha_correo.astimezone().replace(tzinfo=None)
        fecha = fecha_correo
    except (TypeError, ValueError, IndexError):
        pass
    asunto = " ".join(str(mensaje.get("Subject", "") or "").split())

    # Si ya existe un correo identico en la atencion, se reutiliza
    nombre = ""
    for existente in os.listdir(carpeta_trabajo):
        if existente.lower().endswith(".eml") and mismo_contenido(
                os.path.join(carpeta_trabajo, existente), contenido):
            nombre = existente
    if not nombre:
        base = "%s_correo_%s" % (fecha.strftime("%Y%m%d"), tipo)
        nombre = nombre_libre(carpeta_trabajo, base, ".eml")
        escribir_binario(os.path.join(carpeta_trabajo, nombre), contenido)

    carpeta_adjuntos = CARPETA_ADJ_ATENDIDO if tipo == "atendido" else CARPETA_ADJ_ASIGNADO
    adjuntos = extraer_adjuntos(mensaje, os.path.join(carpeta_trabajo, carpeta_adjuntos))
    return {
        "archivo": nombre,
        "tipo": tipo,
        "fecha": texto_fecha(fecha),
        "asunto": asunto,
        "de": remitente,
        "adjuntos": [carpeta_adjuntos + "/" + adjunto for adjunto in adjuntos],
    }


def partes_adjuntas(parte, padre=""):
    # Devuelve las partes marcadas como adjunto. No entra en correos adjuntos
    # (message/rfc822): esos se guardan completos como .eml.
    # Ignora las imagenes incrustadas en el cuerpo (firmas, logos): van dentro
    # de multipart/related y tienen Content-ID.
    if padre == "multipart/related" and parte.get("Content-ID"):
        return
    if parte.get_content_disposition() == "attachment":
        yield parte
        return
    if parte.is_multipart() and parte.get_content_type() != "message/rfc822":
        for subparte in parte.iter_parts():
            yield from partes_adjuntas(subparte, parte.get_content_type())


def extraer_adjuntos(mensaje, carpeta):
    guardados = []
    for parte in partes_adjuntas(mensaje):
        nombre = parte.get_filename()
        if parte.get_content_type() == "message/rfc822":
            try:
                contenido = parte.get_content().as_bytes()
            except (KeyError, AttributeError, TypeError):
                contenido = parte.get_payload(decode=True)
            nombre = nombre or "correo_adjunto.eml"
        else:
            contenido = parte.get_payload(decode=True)
        if not contenido:
            continue
        guardados.append(guardar_sin_duplicar(carpeta, limpiar_nombre(nombre or "adjunto"), contenido))
    return guardados


def agregar_archivos_a_entrada(entrada, parametros, carpeta_trabajo, carpeta_proceso):
    # Primero los archivos (para conocer la fecha de un correo) y luego las capturas.
    # Devuelve los correos nuevos para registrarlos en ticket-datos.json
    tipo_entrada = entrada["tipo"]
    correos_nuevos = []

    for archivo in parametros.get("archivos", []) or []:
        nombre = limpiar_nombre(archivo.get("nombre", ""))
        contenido = decodificar_base64(archivo.get("datos", ""))
        if nombre.lower().endswith(".eml"):
            correo = guardar_correo(contenido, carpeta_trabajo)
            entrada["correos"].append(correo)
            correos_nuevos.append(correo)
            continue
        if tipo_entrada in ("solicitud", "asignacion"):
            subcarpeta = CARPETA_ADJ_ASIGNADO
        elif tipo_entrada == "cierre":
            subcarpeta = CARPETA_ADJ_ATENDIDO
        else:
            subcarpeta = CARPETA_PROCESO_ATENCION
        guardado = guardar_sin_duplicar(os.path.join(carpeta_trabajo, subcarpeta), nombre, contenido)
        entrada["archivos"].append({"raiz": "trabajo", "ruta": subcarpeta + "/" + guardado})

    for captura in parametros.get("capturas", []) or []:
        descripcion = str(captura.get("descripcion", "")).strip()
        if not descripcion:
            raise ErrorUsuario("Cada captura necesita una descripcion")
        texto_datos = captura.get("datos", "")
        contenido = decodificar_base64(texto_datos)
        extension = extension_de_imagen(texto_datos)
        es_de_correo = bool(captura.get("de_correo")) and tipo_entrada != "avance"
        if es_de_correo:
            tipo_correo = "atendido" if tipo_entrada == "cierre" else "asignado"
            fecha = ahora()
            if entrada["correos"]:
                fecha = datetime.datetime.strptime(entrada["correos"][-1]["fecha"], FORMATO_FECHA)
            carpeta = os.path.join(carpeta_proceso, CARPETA_JIRA)
            os.makedirs(carpeta, exist_ok=True)
            base = "%s_captura_correo_%s" % (fecha.strftime("%Y%m%d"), tipo_correo)
            nombre = nombre_libre(carpeta, base, extension)
            escribir_binario(os.path.join(carpeta, nombre), contenido)
            entrada["capturas"].append({"raiz": "proceso", "ruta": CARPETA_JIRA + "/" + nombre,
                                        "descripcion": descripcion})
        else:
            carpeta = os.path.join(carpeta_trabajo, CARPETA_PROCESO_ATENCION)
            os.makedirs(carpeta, exist_ok=True)
            base = "%s_captura" % ahora().strftime("%Y%m%d_%H%M%S")
            nombre = nombre_libre(carpeta, base, extension)
            escribir_binario(os.path.join(carpeta, nombre), contenido)
            entrada["capturas"].append({"raiz": "trabajo", "ruta": CARPETA_PROCESO_ATENCION + "/" + nombre,
                                        "descripcion": descripcion})
    return correos_nuevos


def registrar_correos_en_datos(registro, correos_nuevos):
    if not correos_nuevos:
        return {}
    datos = leer_json(ruta_datos(registro), {})
    lista = datos.get("correos", [])
    archivos_existentes = {c.get("archivo") for c in lista}
    for correo in correos_nuevos:
        if correo["archivo"] in archivos_existentes:
            continue
        lista.append({
            "archivo": correo["archivo"],
            "tipo": correo["tipo"],
            "fecha": correo["fecha"],
            "asunto": correo["asunto"],
            "adjuntos": correo["adjuntos"],
            "resumen": "",
        })
    cambios = {"correos": lista}
    if not datos.get("solicitante"):
        for correo in correos_nuevos:
            if correo["tipo"] == "asignado" and correo["de"]:
                cambios["solicitante"] = correo["de"]
                break
    return cambios


def entrada_vacia(entrada):
    return not (entrada["texto"] or entrada["capturas"] or entrada["correos"] or entrada["archivos"])


def crear_entrada(parametros):
    tipo = parametros.get("tipo", "avance")
    if tipo not in TIPOS_ENTRADA:
        raise ErrorUsuario("Tipo de entrada no valido")
    with BLOQUEO:
        registro = buscar_atencion(parametros.get("id", ""))
        carpeta_trabajo, carpeta_proceso = carpetas_de(registro)
        bitacora = leer_bitacora(registro)
        entradas = bitacora.setdefault("entradas", [])
        numero = max([e.get("n", 0) for e in entradas] + [0]) + 1
        entrada = {
            "id": nuevo_id("e"),
            "n": numero,
            "tipo": tipo,
            "fecha": texto_fecha(ahora()),
            "texto": str(parametros.get("texto", "")).strip(),
            "para_jira": bool(parametros.get("para_jira", True)),
            "capturas": [],
            "correos": [],
            "archivos": [],
            "editado": "",
        }
        correos_nuevos = agregar_archivos_a_entrada(entrada, parametros, carpeta_trabajo, carpeta_proceso)
        if entrada_vacia(entrada):
            raise ErrorUsuario("La entrada esta vacia")
        entradas.append(entrada)
        escribir_json(ruta_bitacora(registro), bitacora)

        cambios = registrar_correos_en_datos(registro, correos_nuevos)
        if tipo == "cierre" and not registro["temporal"]:
            cambios["estado"] = "atendido"
            cambios["listo_para_jira"] = texto_fecha(ahora())
        actualizar_datos(registro, cambios)
        return entrada["id"]


def editar_entrada(parametros):
    with BLOQUEO:
        registro = buscar_atencion(parametros.get("id", ""))
        carpeta_trabajo, carpeta_proceso = carpetas_de(registro)
        bitacora = leer_bitacora(registro)
        id_entrada = parametros.get("entrada_id", "")
        entrada = None
        for candidata in bitacora.get("entradas", []):
            if candidata["id"] == id_entrada:
                entrada = candidata
        if entrada is None:
            raise ErrorUsuario("No se encontro la entrada")
        if id_entrada in ids_enviados(registro):
            raise ErrorUsuario("La entrada ya se envio a Jira y no se puede editar")

        if "texto" in parametros:
            entrada["texto"] = str(parametros["texto"]).strip()
        if "para_jira" in parametros:
            entrada["para_jira"] = bool(parametros["para_jira"])

        descripciones = parametros.get("descripciones", {}) or {}
        quitar = set(parametros.get("quitar_capturas", []) or [])
        capturas_finales = []
        for captura in entrada["capturas"]:
            if captura["ruta"] in quitar:
                base = carpeta_trabajo if captura["raiz"] == "trabajo" else carpeta_proceso
                ruta = ruta_segura(base, captura["ruta"])
                if os.path.isfile(ruta):
                    os.remove(ruta)
                continue
            if captura["ruta"] in descripciones:
                nueva = str(descripciones[captura["ruta"]]).strip()
                if not nueva:
                    raise ErrorUsuario("Cada captura necesita una descripcion")
                captura["descripcion"] = nueva
            capturas_finales.append(captura)
        entrada["capturas"] = capturas_finales

        correos_nuevos = agregar_archivos_a_entrada(entrada, parametros, carpeta_trabajo, carpeta_proceso)
        if entrada_vacia(entrada):
            raise ErrorUsuario("La entrada quedaria vacia")
        entrada["editado"] = texto_fecha(ahora())
        escribir_json(ruta_bitacora(registro), bitacora)
        actualizar_datos(registro, registrar_correos_en_datos(registro, correos_nuevos))


# ---------------------------------------------------------------------------
# Foco
# ---------------------------------------------------------------------------

def ruta_focos_del_dia(fecha):
    return os.path.join(carpeta_focos(), fecha.strftime("%Y%m%d") + "_focos.json")


def archivos_de_focos():
    carpeta = carpeta_focos()
    if not os.path.isdir(carpeta):
        return []
    return sorted(n for n in os.listdir(carpeta) if re.match(r"^\d{8}_focos\.json$", n))


def tramo_abierto():
    # Busca el ultimo tramo sin hora de fin en los archivos mas recientes
    for nombre in reversed(archivos_de_focos()[-10:]):
        ruta = os.path.join(carpeta_focos(), nombre)
        datos = leer_json(ruta, {"tramos": []})
        tramos = datos.get("tramos", [])
        if tramos and not tramos[-1].get("fin"):
            return ruta, datos, tramos[-1]
    return None


def etiqueta_de_atencion(datos):
    identificador = datos.get("tracking_id") or "Sin ID"
    return identificador + " - " + datos.get("titulo", "")


def leer_ideas():
    return leer_json(ruta_ideas(), {"ideas": []})


def crear_idea(texto):
    texto = str(texto or "").strip()
    if not texto:
        raise ErrorUsuario("Escribe la idea")
    ideas = leer_ideas()
    idea = {"id": nuevo_id("i"), "fecha": texto_fecha(ahora()), "texto": texto,
            "estado": "pendiente", "atencion_id": ""}
    ideas["ideas"].append(idea)
    escribir_json(ruta_ideas(), ideas)
    return idea


def cambiar_foco(parametros):
    tipo = parametros.get("tipo", "")
    if tipo not in ("atencion", "pausa", "idea", "reunion"):
        raise ErrorUsuario("Tipo de foco no valido")
    with BLOQUEO:
        momento = ahora()
        ruta_hoy = ruta_focos_del_dia(momento)
        abierto = tramo_abierto()
        if abierto and abierto[0] != ruta_hoy:
            raise ErrorUsuario("Hay un foco abierto de un dia anterior. Indica primero a que hora terminaste.")
        if abierto and tipo == "atencion" and abierto[2].get("atencion_id") == parametros.get("atencion_id"):
            return {"atencion_id": parametros.get("atencion_id")}

        tramo = {"inicio": texto_fecha_seg(momento), "fin": "", "tipo": tipo,
                 "atencion_id": "", "idea_id": "", "etiqueta": ""}
        if tipo == "atencion":
            registro = buscar_atencion(parametros.get("atencion_id", ""))
            tramo["atencion_id"] = registro["id"]
            tramo["etiqueta"] = etiqueta_de_atencion(registro["datos"])
        elif tipo == "pausa":
            tramo["etiqueta"] = "Pausa"
        elif tipo == "idea":
            idea = crear_idea(parametros.get("texto", ""))
            tramo["idea_id"] = idea["id"]
            tramo["etiqueta"] = "Idea: " + idea["texto"][:80]
        else:
            titulo = str(parametros.get("texto", "")).strip()
            if not titulo:
                raise ErrorUsuario("Escribe un titulo para la reunion")
            id_atencion = crear_atencion({"tipo": "con", "titulo": titulo, "hu_tipo": "semanal"})
            registro = buscar_atencion(id_atencion)
            tramo["tipo"] = "atencion"
            tramo["atencion_id"] = id_atencion
            tramo["etiqueta"] = etiqueta_de_atencion(registro["datos"])

        if abierto:
            abierto[2]["fin"] = texto_fecha_seg(momento)
            escribir_json(abierto[0], abierto[1])
        dia = leer_json(ruta_hoy, {"fecha": momento.strftime("%Y-%m-%d"), "tramos": []})
        dia["tramos"].append(tramo)
        escribir_json(ruta_hoy, dia)
        return {"atencion_id": tramo["atencion_id"]}


def terminar_dia():
    with BLOQUEO:
        abierto = tramo_abierto()
        if not abierto:
            return
        if abierto[0] != ruta_focos_del_dia(ahora()):
            raise ErrorUsuario("El foco abierto es de un dia anterior. Indica a que hora terminaste.")
        abierto[2]["fin"] = texto_fecha_seg(ahora())
        escribir_json(abierto[0], abierto[1])


def cerrar_foco_anterior(parametros):
    hora = str(parametros.get("hora", "")).strip()
    if not re.match(r"^\d{2}:\d{2}$", hora):
        raise ErrorUsuario("Indica la hora en formato HH:MM")
    with BLOQUEO:
        abierto = tramo_abierto()
        if not abierto:
            return
        inicio = leer_fecha_seg(abierto[2]["inicio"])
        fin = datetime.datetime.strptime(inicio.strftime("%Y-%m-%d") + " " + hora + ":00", FORMATO_FECHA_SEG)
        if fin < inicio:
            raise ErrorUsuario("La hora de fin no puede ser anterior al inicio (" + inicio.strftime("%H:%M") + ")")
        abierto[2]["fin"] = texto_fecha_seg(fin)
        escribir_json(abierto[0], abierto[1])


def duracion_segundos(tramo, momento):
    inicio = leer_fecha_seg(tramo["inicio"])
    fin = leer_fecha_seg(tramo["fin"]) if tramo.get("fin") else momento
    return max(0, int((fin - inicio).total_seconds()))


def estado_foco():
    momento = ahora()
    ruta_hoy = ruta_focos_del_dia(momento)
    abierto = tramo_abierto()
    resultado = {"actual": None, "anterior_abierto": None, "hoy": [], "totales": []}
    if abierto:
        if abierto[0] == ruta_hoy:
            resultado["actual"] = abierto[2]
        else:
            resultado["anterior_abierto"] = abierto[2]
    dia = leer_json(ruta_hoy, {"tramos": []})
    totales = {}
    for tramo in dia.get("tramos", []):
        segundos = duracion_segundos(tramo, momento)
        copia = dict(tramo)
        copia["segundos"] = segundos
        resultado["hoy"].append(copia)
        clave = tramo.get("atencion_id") or tramo.get("tipo")
        if clave not in totales:
            nombre = tramo.get("etiqueta") if tramo.get("atencion_id") else (
                "Pausas" if tramo.get("tipo") == "pausa" else "Ideas")
            totales[clave] = {"etiqueta": nombre, "segundos": 0}
        totales[clave]["segundos"] += segundos
    resultado["totales"] = sorted(totales.values(), key=lambda t: -t["segundos"])
    return resultado


def tiempo_por_atencion():
    momento = ahora()
    tiempos = {}
    for nombre in archivos_de_focos():
        dia = leer_json(os.path.join(carpeta_focos(), nombre), {"tramos": []})
        for tramo in dia.get("tramos", []):
            if tramo.get("atencion_id"):
                tiempos[tramo["atencion_id"]] = tiempos.get(tramo["atencion_id"], 0) + duracion_segundos(tramo, momento)
    return tiempos


def cambiar_estado_idea(parametros):
    estado = parametros.get("estado", "")
    if estado not in ("pendiente", "convertida", "descartada"):
        raise ErrorUsuario("Estado de idea no valido")
    with BLOQUEO:
        ideas = leer_ideas()
        for idea in ideas["ideas"]:
            if idea["id"] == parametros.get("id"):
                idea["estado"] = estado
                idea["atencion_id"] = str(parametros.get("atencion_id", ""))
                escribir_json(ruta_ideas(), ideas)
                return
        raise ErrorUsuario("No se encontro la idea")


# ---------------------------------------------------------------------------
# Consultas para la pantalla
# ---------------------------------------------------------------------------

def resumen_atenciones():
    lista = []
    for registro in buscar_atenciones():
        datos = registro["datos"]
        bitacora = leer_bitacora(registro)
        enviados = ids_enviados(registro)
        lista.append({
            "id": registro["id"],
            "temporal": registro["temporal"],
            "tipo": datos.get("tipo", ""),
            "tracking_code": datos.get("tracking_code", ""),
            "tracking_id": datos.get("tracking_id", ""),
            "titulo": datos.get("titulo", ""),
            "estado": datos.get("estado", ""),
            "pendientes": contar_pendientes(registro, bitacora.get("entradas", []), enviados),
            "actualizado": datos.get("actualizado", ""),
        })
    lista.sort(key=lambda a: a["actualizado"], reverse=True)
    return lista


def detalle_atencion(id_atencion):
    registro = buscar_atencion(id_atencion)
    carpeta_trabajo, carpeta_proceso = carpetas_de(registro)
    bitacora = leer_bitacora(registro)
    enviados = ids_enviados(registro)
    entradas = bitacora.get("entradas", [])
    for entrada in entradas:
        entrada["enviada"] = entrada["id"] in enviados
    return {
        "id": registro["id"],
        "temporal": registro["temporal"],
        "datos": registro["datos"],
        "entradas": entradas,
        "pendientes": contar_pendientes(registro, entradas, enviados),
        "segundos": tiempo_por_atencion().get(registro["id"], 0),
        "carpeta_trabajo": carpeta_trabajo,
        "carpeta_proceso": carpeta_proceso,
    }


def abrir_carpeta(parametros):
    registro = buscar_atencion(parametros.get("id", ""))
    carpeta_trabajo, carpeta_proceso = carpetas_de(registro)
    carpeta = carpeta_trabajo if parametros.get("raiz") == "trabajo" else carpeta_proceso
    os.makedirs(carpeta, exist_ok=True)
    if not hasattr(os, "startfile"):
        raise ErrorUsuario("Abrir carpetas solo funciona en Windows. Ruta: " + carpeta)
    os.startfile(carpeta)


TIPOS_CONTENIDO = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
    ".pdf": "application/pdf", ".txt": "text/plain; charset=utf-8",
}


# ---------------------------------------------------------------------------
# Servidor HTTP
# ---------------------------------------------------------------------------

RUTAS_POST = {
    "/api/atencion/crear": lambda p: {"id": crear_atencion(p)},
    "/api/atencion/datos": lambda p: guardar_datos_generales(p),
    "/api/atencion/identidad": lambda p: {"id": cambiar_identidad(p)},
    "/api/atencion/terminar": lambda p: terminar_atencion(p),
    "/api/atencion/abrir_carpeta": lambda p: abrir_carpeta(p),
    "/api/entrada/crear": lambda p: {"id": crear_entrada(p)},
    "/api/entrada/editar": lambda p: editar_entrada(p),
    "/api/foco/cambiar": lambda p: cambiar_foco(p),
    "/api/foco/terminar_dia": lambda p: terminar_dia(),
    "/api/foco/cerrar_anterior": lambda p: cerrar_foco_anterior(p),
    "/api/ideas/crear": lambda p: crear_idea(p.get("texto")),
    "/api/ideas/estado": lambda p: cambiar_estado_idea(p),
}


class Manejador(BaseHTTPRequestHandler):

    def log_message(self, formato, *argumentos):
        # Sin registro de cada peticion, para mantener limpia la consola
        pass

    def origen_permitido(self):
        # Solo acepta peticiones de la propia pagina (127.0.0.1 o localhost)
        anfitrion = (self.headers.get("Host") or "").split(":")[0]
        if anfitrion not in ("127.0.0.1", "localhost"):
            return False
        origen = self.headers.get("Origin")
        if origen and urlparse(origen).hostname not in ("127.0.0.1", "localhost"):
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

        if url.path in ("/", "/index.html"):
            with open(os.path.join(CARPETA_CODIGO, "index.html"), "rb") as archivo:
                self.enviar(200, archivo.read(), "text/html; charset=utf-8")
        elif url.path == "/api/inicio":
            self.ejecutar(lambda: {"correo_configurado": bool(MI_CORREO),
                                   "raiz_trabajo": RAIZ_TRABAJO, "raiz_proceso": RAIZ_PROCESO})
        elif url.path == "/api/accesos":
            self.ejecutar(lambda: leer_json(ruta_accesos(), {"grupos": []}))
        elif url.path == "/api/proyectos":
            self.ejecutar(listar_proyectos)
        elif url.path == "/api/atenciones":
            self.ejecutar(resumen_atenciones)
        elif url.path == "/api/atencion":
            self.ejecutar(lambda: detalle_atencion(parametro("id")))
        elif url.path == "/api/foco":
            self.ejecutar(estado_foco)
        elif url.path == "/api/ideas":
            self.ejecutar(leer_ideas)
        elif url.path == "/archivo":
            self.enviar_archivo(parametro("id"), parametro("raiz"), parametro("ruta"))
        elif url.path == "/favicon.ico":
            self.enviar(204, b"", "image/x-icon")
        else:
            self.enviar(404, b"No encontrado", "text/plain")

    def enviar_archivo(self, id_atencion, raiz, ruta):
        try:
            registro = buscar_atencion(id_atencion)
            carpeta_trabajo, carpeta_proceso = carpetas_de(registro)
            base = carpeta_trabajo if raiz == "trabajo" else carpeta_proceso
            completa = ruta_segura(base, ruta)
            if not os.path.isfile(completa):
                raise ErrorUsuario("No existe el archivo")
            extension = os.path.splitext(completa)[1].lower()
            with open(completa, "rb") as archivo:
                contenido = archivo.read()
            self.send_response(200)
            self.send_header("Content-Type", TIPOS_CONTENIDO.get(extension, "application/octet-stream"))
            self.send_header("Content-Length", str(len(contenido)))
            if extension not in TIPOS_CONTENIDO:
                nombre = os.path.basename(completa)
                nombre_ascii = nombre.encode("ascii", "ignore").decode("ascii").replace('"', "") or "archivo"
                self.send_header("Content-Disposition", "attachment; filename=\"%s\"; filename*=UTF-8''%s"
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
    errores = configurar()
    if errores:
        for error in errores:
            print("ERROR: " + error)
        print("Revisa la seccion de variables de entorno en README.md")
        sys.exit(1)
    if not MI_CORREO:
        print("Aviso: falta AT_CORREO. Todos los correos se tomaran como 'asignado'.")
    preparar_carpetas_herramienta()
    servidor = ThreadingHTTPServer(("127.0.0.1", PUERTO), Manejador)
    print("Organizador iniciado en http://127.0.0.1:%d" % PUERTO)
    print("Raiz de trabajo: " + RAIZ_TRABAJO)
    print("Raiz de proceso: " + RAIZ_PROCESO)
    print("Para detenerlo presiona Ctrl+C")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("Servidor detenido")
    finally:
        servidor.server_close()


if __name__ == "__main__":
    main()
