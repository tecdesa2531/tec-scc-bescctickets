import os
import re
import shutil

import lib.config as config
import lib.proyectos as proyectos
import lib.bitacora as bitacora
import lib.indice as indice
import lib.cola as cola
from lib.util import (
    ErrorUsuario, ahora, texto_fecha, leer_json, escribir_json,
    nuevo_id, ruta_segura, duracion_segundos,
)


def _regenerar_cola():
    cola.regenerar(buscar_atenciones())


# ---------------------------------------------------------------------------
# Busqueda y acceso a registros
# ---------------------------------------------------------------------------

def buscar_atenciones():
    # Recorre la raiz de proceso buscando ticket-datos.json creados por la herramienta
    registros = []
    for proyecto in sorted(os.listdir(config.RAIZ_PROCESO)):
        ruta_proyecto = os.path.join(config.RAIZ_PROCESO, proyecto)
        if not config.PATRON_PROYECTO.match(proyecto) or not os.path.isdir(ruta_proyecto):
            continue
        for entorno in sorted(os.listdir(ruta_proyecto)):
            ruta_entorno = os.path.join(ruta_proyecto, entorno)
            if not os.path.isdir(ruta_entorno):
                continue
            for atencion in sorted(os.listdir(ruta_entorno)):
                relativa = os.path.join(proyecto, entorno, atencion)
                _agregar_registro(registros, relativa, False)
                ruta_atencion = os.path.join(ruta_entorno, atencion)
                if os.path.isdir(ruta_atencion):
                    for hijo in sorted(os.listdir(ruta_atencion)):
                        if config.PATRON_NUMERADO.match(hijo) and os.path.isdir(os.path.join(ruta_atencion, hijo)):
                            _agregar_registro(registros, os.path.join(proyecto, entorno, atencion, hijo), False)
    sin_asignar = os.path.join(config.RAIZ_PROCESO, config.CARPETA_SIN_ASIGNAR)
    if os.path.isdir(sin_asignar):
        for nombre in sorted(os.listdir(sin_asignar)):
            _agregar_registro(registros, os.path.join(config.CARPETA_SIN_ASIGNAR, nombre), True)
    return registros


def _agregar_registro(registros, relativa, temporal):
    ruta = os.path.join(config.RAIZ_PROCESO, relativa, "ticket-datos.json")
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


def _siguiente_correlativo_hijo(padre_relativa):
    numeros = [0]
    prefijo = padre_relativa + os.sep
    for reg in buscar_atenciones():
        rel = reg["relativa"]
        if rel.startswith(prefijo) and os.sep not in rel[len(prefijo):]:
            m = config.PATRON_NUMERADO.match(rel[len(prefijo):])
            if m:
                numeros.append(int(m.group(1)))
    return max(numeros) + 1


def buscar_atencion(id_atencion):
    for registro in buscar_atenciones():
        if registro["id"] == id_atencion:
            return registro
    raise ErrorUsuario("No se encontro la atencion")


def carpetas_de(registro):
    carpeta_proceso = os.path.join(config.RAIZ_PROCESO, registro["relativa"])
    if registro["temporal"]:
        carpeta_trabajo = os.path.join(carpeta_proceso, config.SUB_TRABAJO_TEMPORAL)
    else:
        carpeta_trabajo = os.path.join(config.RAIZ_TRABAJO, registro["relativa"])
    return carpeta_trabajo, carpeta_proceso


def ruta_datos(registro):
    return os.path.join(config.RAIZ_PROCESO, registro["relativa"], "ticket-datos.json")


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


# ---------------------------------------------------------------------------
# Validacion e identidad
# ---------------------------------------------------------------------------

def identidad_completa(tipo, codigo, tracking_id, entornos):
    if not re.match(r"^[A-Z]{6}$", codigo or ""):
        return False
    if not tracking_id:
        return False
    if tipo in ("ticket", "int"):
        return ",".join(entornos) in config.ENTORNOS_CARPETA
    return True


def ubicacion_definitiva(codigo, tracking_id, entornos, padre_relativa=None, padre_carpeta_entorno=None):
    if padre_relativa is not None:
        numero = _siguiente_correlativo_hijo(padre_relativa)
        relativa = os.path.join(padre_relativa, "%03d_%s" % (numero, tracking_id))
        return relativa, padre_carpeta_entorno or ""
    carpeta_proyecto = proyectos.carpeta_de_proyecto(codigo)
    carpeta_entorno = proyectos.carpeta_de_entornos(entornos)
    relativa_entorno = os.path.join(carpeta_proyecto, carpeta_entorno)
    numero = proyectos.siguiente_correlativo(relativa_entorno)
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
    entornos = proyectos.normalizar_entornos(parametros.get("entornos", []))
    if not entornos:
        entornos = ["SIN_ENTORNO"]
    proyectos.carpeta_de_entornos(entornos)
    return codigo, entornos


# ---------------------------------------------------------------------------
# Numeracion automatica
# ---------------------------------------------------------------------------

def siguiente_codigo_propio(prefijo):
    mayor = 0
    patron = re.compile("^" + prefijo + r"(\d+)$")
    for registro in buscar_atenciones():
        coincidencia = patron.match(registro["datos"].get("tracking_id", ""))
        if coincidencia:
            mayor = max(mayor, int(coincidencia.group(1)))
    return "%s%010d" % (prefijo, mayor + 1)


def siguiente_numero_atencion(tipo):
    prefijo = config.PREFIJOS_NUMERO[tipo]
    mayor = 0
    patron = re.compile("^" + re.escape(prefijo) + r"(\d+)$")
    for registro in buscar_atenciones():
        coincidencia = patron.match(registro["datos"].get("numero", ""))
        if coincidencia:
            mayor = max(mayor, int(coincidencia.group(1)))
    return "%s%09d" % (prefijo, mayor + 1)


# ---------------------------------------------------------------------------
# CRUD de atenciones
# ---------------------------------------------------------------------------

def validar_padre_id(padre_id, id_propio):
    if not padre_id:
        return
    if padre_id == id_propio:
        raise ErrorUsuario("Una atencion no puede ser su propio padre")
    try:
        buscar_atencion(padre_id)
    except ErrorUsuario:
        raise ErrorUsuario("La atencion padre no existe")


def crear_atencion(parametros):
    tipo = parametros.get("tipo", "")
    if tipo not in config.TIPOS_ATENCION:
        raise ErrorUsuario("Tipo de atencion no valido")
    titulo = str(parametros.get("titulo", "")).strip()
    if not titulo:
        raise ErrorUsuario("El titulo es obligatorio")
    hu_tipo = parametros.get("hu_tipo", "semanal")
    if hu_tipo not in config.HU_TIPOS:
        raise ErrorUsuario("Tipo de HU no valido")

    with config.BLOQUEO:
        padre_id = str(parametros.get("padre_id", "")).strip()
        if padre_id:
            validar_padre_id(padre_id, "")
        codigo, entornos = leer_entrada_identidad(parametros, tipo)
        padre_relativa = None
        padre_carpeta_entorno = None
        if padre_id:
            padre_registro = buscar_atencion(padre_id)
            codigo = padre_registro["datos"].get("tracking_code", "")
            if not padre_registro["temporal"]:
                padre_relativa = padre_registro["relativa"]
                padre_carpeta_entorno = padre_registro["datos"].get("carpeta_entorno", "")
        if tipo == "ticket":
            tracking_id = str(parametros.get("tracking_id", "")).strip().upper()
            if tracking_id and not re.match(r"^[A-Z0-9_-]+$", tracking_id):
                raise ErrorUsuario("El numero de ticket solo puede tener letras, numeros, - y _")
        else:
            tracking_id = siguiente_codigo_propio(config.PREFIJOS_PROPIOS[tipo])
        if tracking_id:
            validar_tracking_id(tracking_id, "")

        workspace = str(parametros.get("workspace_edge", "")).strip()
        if not workspace and tracking_id and codigo:
            workspace = tracking_id + "-" + codigo

        id_atencion = nuevo_id("a")
        numero = siguiente_numero_atencion(tipo)
        momento = texto_fecha(ahora())
        datos = {
            "id_herramienta": id_atencion,
            "numero": numero,
            "tipo": tipo,
            "padre_id": padre_id,
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
            "workspace_edge": workspace,
            "listo_para_limpieza": "",
            "listo_para_jira": "",
            "correos": [],
            "subtareas": [],
            "creado": momento,
            "actualizado": momento,
        }

        if padre_relativa is not None:
            if tracking_id:
                relativa, carpeta_entorno = ubicacion_definitiva(
                    codigo, tracking_id, entornos, padre_relativa, padre_carpeta_entorno)
                datos["carpeta_entorno"] = carpeta_entorno
                temporal = False
            else:
                relativa = os.path.join(config.CARPETA_SIN_ASIGNAR, id_atencion)
                temporal = True
        elif identidad_completa(tipo, codigo, tracking_id, entornos):
            relativa, carpeta_entorno = ubicacion_definitiva(codigo, tracking_id, entornos)
            datos["carpeta_entorno"] = carpeta_entorno
            temporal = False
        else:
            relativa = os.path.join(config.CARPETA_SIN_ASIGNAR, id_atencion)
            temporal = True

        registro = {"id": id_atencion, "relativa": relativa, "temporal": temporal, "datos": datos}
        carpeta_trabajo, carpeta_proceso = carpetas_de(registro)
        if not temporal:
            os.makedirs(carpeta_trabajo, exist_ok=True)
        escribir_json(ruta_datos(registro), datos)
        escribir_json(bitacora.ruta_bitacora(registro), {"entradas": []})
        indice.indexar_atencion(datos)
        _regenerar_cola()
        return {"id": id_atencion, "numero": numero, "tipo": tipo}


def cambiar_identidad(parametros):
    with config.BLOQUEO:
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

        padre_id = datos.get("padre_id", "")
        padre_relativa = None
        padre_carpeta_entorno = None
        if padre_id:
            try:
                padre_registro = buscar_atencion(padre_id)
                if not padre_registro["temporal"]:
                    padre_relativa = padre_registro["relativa"]
                    padre_carpeta_entorno = padre_registro["datos"].get("carpeta_entorno", "")
            except ErrorUsuario:
                pass

        identidad_ok = (bool(tracking_id) if padre_relativa is not None
                        else identidad_completa(tipo, codigo, tracking_id, entornos))
        if not identidad_ok:
            actualizar_datos(registro, {"tracking_code": codigo, "tracking_id": tracking_id,
                                        "entornos": entornos})
            indice.indexar_atencion(registro["datos"])
            _regenerar_cola()
            return registro["id"]

        trabajo_anterior, proceso_anterior = carpetas_de(registro)
        relativa, carpeta_entorno = ubicacion_definitiva(
            codigo, tracking_id, entornos, padre_relativa, padre_carpeta_entorno)
        trabajo_nueva = os.path.join(config.RAIZ_TRABAJO, relativa)
        proceso_nueva = os.path.join(config.RAIZ_PROCESO, relativa)
        if os.path.exists(trabajo_nueva) or os.path.exists(proceso_nueva):
            raise ErrorUsuario("Ya existe la carpeta destino " + relativa)

        os.makedirs(os.path.dirname(trabajo_nueva), exist_ok=True)
        os.makedirs(os.path.dirname(proceso_nueva), exist_ok=True)
        if os.path.isdir(trabajo_anterior):
            shutil.move(trabajo_anterior, trabajo_nueva)
        else:
            os.makedirs(trabajo_nueva, exist_ok=True)
        shutil.move(proceso_anterior, proceso_nueva)

        registro["relativa"] = relativa
        registro["temporal"] = False
        actualizar_datos(registro, {"tracking_code": codigo, "tracking_id": tracking_id,
                                    "entornos": entornos, "carpeta_entorno": carpeta_entorno})
        indice.indexar_atencion(registro["datos"])
        _cascadear_carpeta_entorno(registro["id"], carpeta_entorno)
        _regenerar_cola()
        return registro["id"]


def _cascadear_carpeta_entorno(padre_id, carpeta_entorno):
    for reg in buscar_atenciones():
        if reg["datos"].get("padre_id") == padre_id and not reg["temporal"]:
            if reg["datos"].get("carpeta_entorno") != carpeta_entorno:
                actualizar_datos(reg, {"carpeta_entorno": carpeta_entorno})
                _cascadear_carpeta_entorno(reg["id"], carpeta_entorno)


def guardar_datos_generales(parametros):
    with config.BLOQUEO:
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
            if parametros["hu_tipo"] not in config.HU_TIPOS:
                raise ErrorUsuario("Tipo de HU no valido")
            cambios["hu_tipo"] = parametros["hu_tipo"]
        if "estado" in parametros:
            if parametros["estado"] not in config.ESTADOS:
                raise ErrorUsuario("Estado no valido")
            cambios["estado"] = parametros["estado"]
        if "padre_id" in parametros:
            if not registro["temporal"]:
                raise ErrorUsuario("El padre no se puede cambiar en una atencion ya ubicada")
            padre_id = str(parametros["padre_id"]).strip()
            validar_padre_id(padre_id, registro["id"])
            cambios["padre_id"] = padre_id
        actualizar_datos(registro, cambios)
        indice.indexar_atencion(registro["datos"])
        _regenerar_cola()


def terminar_atencion(parametros):
    # Estado 1: marca la atencion como atendida y la deja lista para que el
    # agente limpie el texto de la bitacora. No habilita aun la subida a Jira.
    with config.BLOQUEO:
        registro = buscar_atencion(parametros.get("id", ""))
        if registro["temporal"]:
            raise ErrorUsuario("Completa el proyecto y el ID antes de terminar")
        actualizar_datos(registro, {"estado": "atendido",
                                    "listo_para_limpieza": texto_fecha(ahora())})
        indice.indexar_atencion(registro["datos"])
        _regenerar_cola()


def dar_conforme(parametros):
    # Estado 2: Jhans revisa el texto corregido por el agente y da el conforme.
    # Recien aqui la atencion queda lista para enviar a Jira.
    with config.BLOQUEO:
        registro = buscar_atencion(parametros.get("id", ""))
        if registro["datos"].get("estado") != "atendido":
            raise ErrorUsuario("Primero marca la atencion como atendida (Terminar)")
        actualizar_datos(registro, {"listo_para_jira": texto_fecha(ahora())})
        indice.indexar_atencion(registro["datos"])
        _regenerar_cola()


# ---------------------------------------------------------------------------
# Operaciones de bitacora sobre una atencion
# ---------------------------------------------------------------------------

def crear_entrada(parametros):
    tipo = parametros.get("tipo", "avance")
    if tipo not in config.TIPOS_ENTRADA:
        raise ErrorUsuario("Tipo de entrada no valido")
    with config.BLOQUEO:
        registro = buscar_atencion(parametros.get("id", ""))
        carpeta_trabajo, carpeta_proceso = carpetas_de(registro)
        datos_bitacora = bitacora.leer_bitacora(registro)
        entradas = datos_bitacora.setdefault("entradas", [])
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
        correos_nuevos = bitacora.agregar_archivos_a_entrada(
            entrada, parametros, carpeta_trabajo, carpeta_proceso)
        if bitacora.entrada_vacia(entrada):
            raise ErrorUsuario("La entrada esta vacia")
        entradas.append(entrada)
        escribir_json(bitacora.ruta_bitacora(registro), datos_bitacora)

        cambios = bitacora.registrar_correos_en_datos(registro, correos_nuevos, tipo)
        if tipo == "cierre" and not registro["temporal"]:
            cambios["estado"] = "atendido"
            cambios["listo_para_limpieza"] = texto_fecha(ahora())
        actualizar_datos(registro, cambios)
        indice.indexar_atencion(registro["datos"])
        _regenerar_cola()
        return entrada["id"]


def editar_entrada(parametros):
    with config.BLOQUEO:
        registro = buscar_atencion(parametros.get("id", ""))
        carpeta_trabajo, carpeta_proceso = carpetas_de(registro)
        datos_bitacora = bitacora.leer_bitacora(registro)
        id_entrada = parametros.get("entrada_id", "")
        entrada = None
        for candidata in datos_bitacora.get("entradas", []):
            if candidata["id"] == id_entrada:
                entrada = candidata
        if entrada is None:
            raise ErrorUsuario("No se encontro la entrada")
        if id_entrada in bitacora.ids_enviados(registro):
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

        correos_nuevos = bitacora.agregar_archivos_a_entrada(
            entrada, parametros, carpeta_trabajo, carpeta_proceso)
        if bitacora.entrada_vacia(entrada):
            raise ErrorUsuario("La entrada quedaria vacia")
        entrada["editado"] = texto_fecha(ahora())
        escribir_json(bitacora.ruta_bitacora(registro), datos_bitacora)
        actualizar_datos(registro, bitacora.registrar_correos_en_datos(registro, correos_nuevos, entrada["tipo"]))
        _regenerar_cola()


# ---------------------------------------------------------------------------
# Helpers de display
# ---------------------------------------------------------------------------

def etiqueta_de_atencion(datos):
    identificador = datos.get("tracking_id") or "Sin ID"
    return identificador + " - " + datos.get("titulo", "")


def tiempo_por_atencion():
    momento = ahora()
    tiempos = {}
    for nombre in config.archivos_de_focos():
        dia = leer_json(os.path.join(config.carpeta_focos(), nombre), {"tramos": []})
        for tramo in dia.get("tramos", []):
            if tramo.get("atencion_id"):
                tiempos[tramo["atencion_id"]] = (tiempos.get(tramo["atencion_id"], 0)
                                                  + duracion_segundos(tramo, momento))
    return tiempos


# ---------------------------------------------------------------------------
# Consultas para la pantalla
# ---------------------------------------------------------------------------

def resumen_atenciones():
    lista = []
    for registro in buscar_atenciones():
        datos = registro["datos"]
        datos_bitacora = bitacora.leer_bitacora(registro)
        enviados = bitacora.ids_enviados(registro)
        lista.append({
            "id": registro["id"],
            "numero": datos.get("numero", ""),
            "temporal": registro["temporal"],
            "tipo": datos.get("tipo", ""),
            "padre_id": datos.get("padre_id", ""),
            "tracking_code": datos.get("tracking_code", ""),
            "tracking_id": datos.get("tracking_id", ""),
            "titulo": datos.get("titulo", ""),
            "estado": datos.get("estado", ""),
            "pendientes": bitacora.contar_pendientes(
                registro, datos_bitacora.get("entradas", []), enviados),
            "actualizado": datos.get("actualizado", ""),
        })
    lista.sort(key=lambda a: a["actualizado"], reverse=True)
    return lista


def proximo_numero(tipo):
    if tipo not in config.TIPOS_ATENCION:
        raise ErrorUsuario("Tipo no valido")
    return {"numero": siguiente_numero_atencion(tipo)}


def buscar_atencion_por_numero(numero):
    for registro in buscar_atenciones():
        if registro["datos"].get("numero") == numero:
            return registro
    raise ErrorUsuario("No se encontro la atencion con numero " + numero)


def detalle_atencion_por_numero(numero):
    return _detalle_desde_registro(buscar_atencion_por_numero(numero))


def detalle_atencion(id_atencion):
    return _detalle_desde_registro(buscar_atencion(id_atencion))


def _detalle_desde_registro(registro):
    carpeta_trabajo, carpeta_proceso = carpetas_de(registro)
    datos_bitacora = bitacora.leer_bitacora(registro)
    enviados = bitacora.ids_enviados(registro)
    correcciones = bitacora.leer_correcciones(registro)
    entradas = datos_bitacora.get("entradas", [])
    for entrada in entradas:
        entrada["enviada"] = entrada["id"] in enviados
        entrada["texto_corregido"] = correcciones.get(entrada["id"], "")
    return {
        "id": registro["id"],
        "temporal": registro["temporal"],
        "datos": registro["datos"],
        "entradas": entradas,
        "pendientes": bitacora.contar_pendientes(registro, entradas, enviados),
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
