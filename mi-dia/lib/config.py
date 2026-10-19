import os
import re
import threading


PUERTO = int(os.environ.get("AT_PUERTO", "8765"))

CARPETA_HERRAMIENTA = "003_Herramienta"
CARPETA_SIN_ASIGNAR = "004_SinAsignar"
CARPETA_FOCOS = "010_Focos"
CARPETA_JIRA = "040_ProcesoJira"
SUB_TRABAJO_TEMPORAL = "trabajo"
ARCHIVO_COLA = "agente-cola.json"
ARCHIVO_CORRECCION = "bitacora-correccion.json"

CARPETA_ADJ_ASIGNADO = "010_CorreoAsignadoAdjuntos"
CARPETA_ADJ_ATENDIDO = "020_CorreoAtendidoAdjuntos"
CARPETA_PROCESO_ATENCION = "030_ProcesoAtencion"

ENTORNOS_CARPETA = {
    "DEV": "010_Dev",
    "PRE": "020_Pre",
    "PRO": "030_Pro",
    "SIN_ENTORNO": "000_SinEntorno",
    "DEV,PRE": "040_DevPre",
    "PRE,PRO": "050_PrePro",
    "DEV,PRE,PRO": "060_DevPrePro",
}
ORDEN_ENTORNOS = ["DEV", "PRE", "PRO", "SIN_ENTORNO"]

TIPOS_ATENCION = ["ticket", "int", "doc", "con"]
PREFIJOS_PROPIOS = {"int": "JINT", "doc": "JDOC", "con": "JCON"}
PREFIJOS_NUMERO = {"ticket": "JSNT", "int": "JINT", "doc": "JDOC", "con": "JCON"}
PROYECTOS_FIJOS = ["INFRAS", "DOCINF"]
ESTADOS = ["en_curso", "en_espera", "atendido", "reabierto", "descartado"]
TIPOS_ENTRADA = ["solicitud", "asignacion", "avance", "cierre"]
HU_TIPOS = ["semanal", "independiente"]

PATRON_PROYECTO = re.compile(r"^(\d{3})_([A-Za-z]{6})$")
PATRON_NUMERADO = re.compile(r"^(\d{3})_")

FORMATO_FECHA = "%Y-%m-%d %H:%M"
FORMATO_FECHA_SEG = "%Y-%m-%d %H:%M:%S"

BLOQUEO = threading.RLock()

# Estas tres variables se asignan al iniciar el servidor via configurar()
RAIZ_TRABAJO = ""
RAIZ_PROCESO = ""
MI_CORREO = ""


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


def ruta_accesos():
    return os.path.join(RAIZ_PROCESO, CARPETA_HERRAMIENTA, "accesos.json")


def ruta_ideas():
    return os.path.join(RAIZ_PROCESO, CARPETA_HERRAMIENTA, "ideas.json")


def ruta_cola():
    return os.path.join(RAIZ_PROCESO, CARPETA_HERRAMIENTA, ARCHIVO_COLA)


def carpeta_focos():
    return os.path.join(RAIZ_PROCESO, CARPETA_HERRAMIENTA, CARPETA_FOCOS)


def archivos_de_focos():
    carpeta = carpeta_focos()
    if not os.path.isdir(carpeta):
        return []
    return sorted(n for n in os.listdir(carpeta) if re.match(r"^\d{8}_focos\.json$", n))
