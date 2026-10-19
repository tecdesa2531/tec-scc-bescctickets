import datetime
import email
import email.policy
import email.utils
import os

import lib.config as config
from lib.util import (
    ErrorUsuario, ahora, texto_fecha, leer_json, escribir_json,
    escribir_binario, limpiar_nombre, ruta_segura, nombre_libre,
    mismo_contenido, guardar_sin_duplicar, decodificar_base64,
    extension_de_imagen, nuevo_id,
)


def ruta_bitacora(registro):
    return os.path.join(config.RAIZ_PROCESO, registro["relativa"], "bitacora.json")


def leer_bitacora(registro):
    return leer_json(ruta_bitacora(registro), {"entradas": []})


def ruta_correccion(registro):
    return os.path.join(config.RAIZ_PROCESO, registro["relativa"],
                        config.CARPETA_JIRA, config.ARCHIVO_CORRECCION)


def leer_correcciones(registro):
    # Texto corregido por el agente, enganchado por bitacora_id. Solo lectura.
    # Formato: {"correcciones": {"<bitacora_id>": "<texto corregido>"}}.
    # Se tolera tambien {"<bitacora_id>": {"texto": "..."}} por si el agente lo anida.
    datos = leer_json(ruta_correccion(registro), {"correcciones": {}})
    bruto = datos.get("correcciones", {}) or {}
    correcciones = {}
    for clave, valor in bruto.items():
        if isinstance(valor, dict):
            correcciones[clave] = valor.get("texto", "") or ""
        else:
            correcciones[clave] = valor or ""
    return correcciones


def ids_enviados(registro):
    # Lee (sin modificar) los archivos de comentarios de Copilot para saber
    # que entradas ya se subieron a Jira
    enviados = set()
    carpeta = os.path.join(config.RAIZ_PROCESO, registro["relativa"], config.CARPETA_JIRA)
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
    tipo = "atendido" if config.MI_CORREO and direccion == config.MI_CORREO else "asignado"

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

    carpeta_adjuntos = config.CARPETA_ADJ_ATENDIDO if tipo == "atendido" else config.CARPETA_ADJ_ASIGNADO
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
            subcarpeta = config.CARPETA_ADJ_ASIGNADO
        elif tipo_entrada == "cierre":
            subcarpeta = config.CARPETA_ADJ_ATENDIDO
        else:
            subcarpeta = config.CARPETA_PROCESO_ATENCION
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
            tipo_correo = {"cierre": "atendido", "solicitud": "solicitud"}.get(tipo_entrada, "asignado")
            fecha = ahora()
            if entrada["correos"]:
                fecha = datetime.datetime.strptime(entrada["correos"][-1]["fecha"], config.FORMATO_FECHA)
            carpeta = os.path.join(carpeta_proceso, config.CARPETA_JIRA)
            os.makedirs(carpeta, exist_ok=True)
            base = "%s_captura_correo_%s" % (fecha.strftime("%Y%m%d"), tipo_correo)
            nombre = nombre_libre(carpeta, base, extension)
            escribir_binario(os.path.join(carpeta, nombre), contenido)
            entrada["capturas"].append({"raiz": "proceso", "ruta": config.CARPETA_JIRA + "/" + nombre,
                                        "descripcion": descripcion})
        else:
            carpeta = os.path.join(carpeta_trabajo, config.CARPETA_PROCESO_ATENCION)
            os.makedirs(carpeta, exist_ok=True)
            base = "%s_captura" % ahora().strftime("%Y%m%d_%H%M%S")
            nombre = nombre_libre(carpeta, base, extension)
            escribir_binario(os.path.join(carpeta, nombre), contenido)
            entrada["capturas"].append({"raiz": "trabajo",
                                        "ruta": config.CARPETA_PROCESO_ATENCION + "/" + nombre,
                                        "descripcion": descripcion})
    return correos_nuevos


def registrar_correos_en_datos(registro, correos_nuevos, tipo_entrada=""):
    if not correos_nuevos:
        return {}
    ruta = os.path.join(config.RAIZ_PROCESO, registro["relativa"], "ticket-datos.json")
    datos = leer_json(ruta, {})
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
    # El solicitante es quien pide la atencion: sale del correo de solicitud,
    # no del de asignacion (ese remitente es quien asigno, otra persona).
    # Una entrada de solicitud siempre reescribe el solicitante (es la fuente
    # autoritativa), aunque ya tuviera un valor de un flujo anterior.
    if tipo_entrada == "solicitud":
        for correo in correos_nuevos:
            if correo["de"]:
                cambios["solicitante"] = correo["de"]
                break
    return cambios


def entrada_vacia(entrada):
    return not (entrada["texto"] or entrada["capturas"] or entrada["correos"] or entrada["archivos"])
