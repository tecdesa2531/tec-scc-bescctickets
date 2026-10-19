import base64
import binascii
import datetime
import json
import os
import re
import secrets
import time


class ErrorUsuario(Exception):
    """Error que se muestra tal cual en la pantalla."""


def ahora():
    return datetime.datetime.now()


def texto_fecha(fecha):
    return fecha.strftime("%Y-%m-%d %H:%M")


def texto_fecha_seg(fecha):
    return fecha.strftime("%Y-%m-%d %H:%M:%S")


def leer_fecha_seg(texto):
    return datetime.datetime.strptime(texto, "%Y-%m-%d %H:%M:%S")


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


def duracion_segundos(tramo, momento):
    inicio = leer_fecha_seg(tramo["inicio"])
    fin = leer_fecha_seg(tramo["fin"]) if tramo.get("fin") else momento
    return max(0, int((fin - inicio).total_seconds()))
