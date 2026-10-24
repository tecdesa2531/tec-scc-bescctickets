import datetime
import os
import re

import lib.config as config
import lib.atenciones as atenciones
from lib.util import (
    ErrorUsuario, ahora, texto_fecha, texto_fecha_seg, leer_fecha_seg,
    leer_json, escribir_json, nuevo_id, duracion_segundos,
)


def ruta_focos_del_dia(fecha):
    return os.path.join(config.carpeta_focos(), fecha.strftime("%Y%m%d") + "_focos.json")


def tramo_abierto():
    # Busca el ultimo tramo sin hora de fin en los archivos mas recientes
    for nombre in reversed(config.archivos_de_focos()[-10:]):
        ruta = os.path.join(config.carpeta_focos(), nombre)
        datos = leer_json(ruta, {"tramos": []})
        tramos = datos.get("tramos", [])
        if tramos and not tramos[-1].get("fin"):
            return ruta, datos, tramos[-1]
    return None


def leer_ideas():
    return leer_json(config.ruta_ideas(), {"ideas": []})


def crear_idea(texto):
    texto = str(texto or "").strip()
    if not texto:
        raise ErrorUsuario("Escribe la idea")
    ideas = leer_ideas()
    idea = {"id": nuevo_id("i"), "fecha": texto_fecha(ahora()), "texto": texto,
            "estado": "pendiente", "atencion_id": ""}
    ideas["ideas"].append(idea)
    escribir_json(config.ruta_ideas(), ideas)
    return idea


def cambiar_foco(parametros):
    tipo = parametros.get("tipo", "")
    if tipo not in ("atencion", "pausa", "idea", "reunion", "interrupcion"):
        raise ErrorUsuario("Tipo de foco no valido")
    with config.BLOQUEO:
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
            registro = atenciones.buscar_atencion(parametros.get("atencion_id", ""))
            tramo["atencion_id"] = registro["id"]
            tramo["etiqueta"] = atenciones.etiqueta_de_atencion(registro["datos"])
        elif tipo == "pausa":
            tramo["etiqueta"] = "Pausa"
        elif tipo == "idea":
            idea = crear_idea(parametros.get("texto", ""))
            tramo["idea_id"] = idea["id"]
            tramo["etiqueta"] = "Idea: " + idea["texto"][:80]
        elif tipo == "interrupcion":
            titulo = "Interrupcion " + momento.strftime("%H:%M")
            resultado = atenciones.crear_atencion({"tipo": "npl", "titulo": titulo, "hu_tipo": "semanal",
                                                   "tracking_code": config.PROYECTO_NPL_SIN_PADRE})
            id_npl = resultado["id"]
            registro = atenciones.buscar_atencion(id_npl)
            atenciones.iniciar_notas_interrupcion(registro)
            tramo["tipo"] = "atencion"
            tramo["atencion_id"] = id_npl
            tramo["etiqueta"] = atenciones.etiqueta_de_atencion(registro["datos"])
        else:
            titulo = str(parametros.get("texto", "")).strip()
            if not titulo:
                raise ErrorUsuario("Escribe un titulo para la reunion")
            # crear_atencion devuelve {"id": ..., "numero": ..., "tipo": ...}
            resultado = atenciones.crear_atencion({"tipo": "con", "titulo": titulo, "hu_tipo": "semanal"})
            id_con = resultado["id"]
            registro = atenciones.buscar_atencion(id_con)
            tramo["tipo"] = "atencion"
            tramo["atencion_id"] = id_con
            tramo["etiqueta"] = atenciones.etiqueta_de_atencion(registro["datos"])

        if abierto:
            abierto[2]["fin"] = texto_fecha_seg(momento)
            escribir_json(abierto[0], abierto[1])
        dia = leer_json(ruta_hoy, {"fecha": momento.strftime("%Y-%m-%d"), "tramos": []})
        dia["tramos"].append(tramo)
        escribir_json(ruta_hoy, dia)
        resultado = {"atencion_id": tramo["atencion_id"]}
        if tramo["atencion_id"]:
            reg = atenciones.buscar_atencion(tramo["atencion_id"])
            resultado["numero"] = reg["datos"].get("numero", "")
            resultado["tipo"] = reg["datos"].get("tipo", "")
        return resultado


def terminar_dia():
    with config.BLOQUEO:
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
    with config.BLOQUEO:
        abierto = tramo_abierto()
        if not abierto:
            return
        inicio = leer_fecha_seg(abierto[2]["inicio"])
        fin = datetime.datetime.strptime(
            inicio.strftime("%Y-%m-%d") + " " + hora + ":00", "%Y-%m-%d %H:%M:%S")
        if fin < inicio:
            raise ErrorUsuario("La hora de fin no puede ser anterior al inicio (%s)" % inicio.strftime("%H:%M"))
        abierto[2]["fin"] = texto_fecha_seg(fin)
        escribir_json(abierto[0], abierto[1])


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


def cambiar_estado_idea(parametros):
    estado = parametros.get("estado", "")
    if estado not in ("pendiente", "convertida", "descartada"):
        raise ErrorUsuario("Estado de idea no valido")
    with config.BLOQUEO:
        ideas = leer_ideas()
        for idea in ideas["ideas"]:
            if idea["id"] == parametros.get("id"):
                idea["estado"] = estado
                idea["atencion_id"] = str(parametros.get("atencion_id", ""))
                escribir_json(config.ruta_ideas(), ideas)
                return
        raise ErrorUsuario("No se encontro la idea")
