# Cola de pendientes para el agente Copilot.
# La herramienta la mantiene para que el agente no tenga que recorrer las
# carpetas: lee este unico archivo y sabe que accion le toca a cada atencion.

import lib.config as config
import lib.bitacora as bitacora
from lib.util import escribir_json, ahora, texto_fecha


def _raiz(datos, mapa):
    # Sube por padre_id hasta la atencion sin padre (la raiz).
    visto = set()
    while datos.get("padre_id") in mapa and datos["padre_id"] not in visto:
        visto.add(datos["padre_id"])
        datos = mapa[datos["padre_id"]]
    return datos


def _hay_pendientes(registro):
    # True si queda alguna entrada para Jira que aun no figura como subida.
    datos_bitacora = bitacora.leer_bitacora(registro)
    enviados = bitacora.ids_enviados(registro)
    return bitacora.contar_pendientes(
        registro, datos_bitacora.get("entradas", []), enviados) > 0


def _accion(registro, mapa):
    # Devuelve la accion pendiente del agente, o "" si no hay nada que hacer.
    datos = registro["datos"]
    if registro["temporal"]:
        return ""
    estado = datos.get("estado", "")
    if estado == "descartado":
        return ""
    # Una interrupcion (NPL) nunca tiene issue propio: siempre sube como
    # comentario (en la subtarea fija de interrupciones, en la fase fija
    # "Consultas y seguimiento", o directo en la subtarea del padre). No pasa
    # por /inicia, /limpia ni el conforme: cerrarla con los datos completos ya
    # la deja lista, y su texto se revisa en el dry-run de /procede.
    if datos.get("tipo") == "npl":
        if estado != "atendido" or (datos.get("npl") or {}).get("pendiente_cierre"):
            return ""
        return "pendiente_jira" if _hay_pendientes(registro) else ""
    jira = datos.get("jira") or {}
    if datos.get("listo_para_jira"):
        return "pendiente_jira" if _hay_pendientes(registro) else ""
    if datos.get("listo_para_limpieza"):
        return "pendiente_limpieza"
    # El padre esta creado si hay HU (independiente) o alguna subtarea con key (semanal).
    tiene_subtarea = any(s.get("key") for s in (datos.get("subtareas") or []))
    if not jira.get("padre_key") and not tiene_subtarea:
        # Un hijo de una raiz independiente no tiene issue propio: sus
        # comentarios van a las fases de la HU de la raiz, salvo que este
        # marcado como fase independiente, que si crea su propia subtarea.
        if datos.get("padre_id") and _raiz(datos, mapa).get("hu_tipo") == "independiente":
            return "pendiente_inicio" if datos.get("fase_independiente") else ""
        return "pendiente_inicio"
    return ""


def regenerar(registros):
    mapa = {registro["id"]: registro["datos"] for registro in registros}
    atenciones = []
    for registro in registros:
        accion = _accion(registro, mapa)
        if not accion:
            continue
        datos = registro["datos"]
        raiz = _raiz(datos, mapa)
        atenciones.append({
            "id": registro["id"],
            "tracking_id": datos.get("tracking_id", ""),
            "tracking_code": datos.get("tracking_code", ""),
            "tipo": datos.get("tipo", ""),
            "hu_tipo": datos.get("hu_tipo", ""),
            "padre_id": datos.get("padre_id", ""),
            "raiz_id": raiz.get("id_herramienta", ""),
            "hu_tipo_raiz": raiz.get("hu_tipo", ""),
            "fase_independiente": bool(datos.get("fase_independiente")),
            "relativa": registro["relativa"].replace("\\", "/"),
            "accion": accion,
        })
    escribir_json(config.ruta_cola(), {
        "actualizado": texto_fecha(ahora()),
        "raiz_trabajo": config.RAIZ_TRABAJO,
        "raiz_proceso": config.RAIZ_PROCESO,
        "atenciones": atenciones,
    })
