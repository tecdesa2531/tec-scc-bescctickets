# Cola de pendientes para el agente Copilot.
# La herramienta la mantiene para que el agente no tenga que recorrer las
# carpetas: lee este unico archivo y sabe que accion le toca a cada atencion.

import lib.config as config
import lib.bitacora as bitacora
from lib.util import escribir_json, ahora, texto_fecha


def _accion(registro):
    # Devuelve la accion pendiente del agente, o "" si no hay nada que hacer.
    datos = registro["datos"]
    if registro["temporal"]:
        return ""
    estado = datos.get("estado", "")
    if estado == "descartado":
        return ""
    jira = datos.get("jira") or {}
    if datos.get("listo_para_jira"):
        datos_bitacora = bitacora.leer_bitacora(registro)
        enviados = bitacora.ids_enviados(registro)
        pendientes = bitacora.contar_pendientes(
            registro, datos_bitacora.get("entradas", []), enviados)
        return "pendiente_jira" if pendientes else ""
    if datos.get("listo_para_limpieza"):
        return "pendiente_limpieza"
    # El padre esta creado si hay HU (independiente) o alguna subtarea con key (semanal).
    tiene_subtarea = any(s.get("key") for s in (datos.get("subtareas") or []))
    if not jira.get("padre_key") and not tiene_subtarea:
        return "pendiente_inicio"
    return ""


def regenerar(registros):
    atenciones = []
    for registro in registros:
        accion = _accion(registro)
        if not accion:
            continue
        datos = registro["datos"]
        atenciones.append({
            "id": registro["id"],
            "tracking_id": datos.get("tracking_id", ""),
            "tracking_code": datos.get("tracking_code", ""),
            "tipo": datos.get("tipo", ""),
            "hu_tipo": datos.get("hu_tipo", ""),
            "padre_id": datos.get("padre_id", ""),
            "relativa": registro["relativa"].replace("\\", "/"),
            "accion": accion,
        })
    escribir_json(config.ruta_cola(), {
        "actualizado": texto_fecha(ahora()),
        "raiz_trabajo": config.RAIZ_TRABAJO,
        "raiz_proceso": config.RAIZ_PROCESO,
        "atenciones": atenciones,
    })
