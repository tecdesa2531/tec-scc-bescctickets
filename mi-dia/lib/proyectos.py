import os

import lib.config as config
from lib.util import ErrorUsuario


def carpetas_proyecto_existentes():
    # Devuelve {codigo: nombre_carpeta} con los proyectos de ambas raices
    proyectos = {}
    for raiz in (config.RAIZ_TRABAJO, config.RAIZ_PROCESO):
        for nombre in sorted(os.listdir(raiz)):
            coincidencia = config.PATRON_PROYECTO.match(nombre)
            if not coincidencia or int(coincidencia.group(1)) < 10:
                continue
            if not os.path.isdir(os.path.join(raiz, nombre)):
                continue
            proyectos.setdefault(coincidencia.group(2).upper(), nombre)
    return proyectos


def listar_proyectos():
    proyectos = carpetas_proyecto_existentes()
    for codigo in config.PROYECTOS_FIJOS:
        proyectos.setdefault(codigo, "")
    return [{"codigo": codigo, "carpeta": proyectos[codigo]} for codigo in sorted(proyectos)]


def carpeta_de_proyecto(codigo):
    # Usa la carpeta existente del proyecto o calcula el nombre de una nueva
    existentes = carpetas_proyecto_existentes()
    if codigo in existentes:
        return existentes[codigo]
    numeros = []
    for raiz in (config.RAIZ_TRABAJO, config.RAIZ_PROCESO):
        for nombre in os.listdir(raiz):
            coincidencia = config.PATRON_NUMERADO.match(nombre)
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
        if entorno in config.ORDEN_ENTORNOS and entorno not in limpios:
            limpios.append(entorno)
    return sorted(limpios, key=config.ORDEN_ENTORNOS.index)


def carpeta_de_entornos(entornos):
    clave = ",".join(entornos)
    if clave not in config.ENTORNOS_CARPETA:
        raise ErrorUsuario("Combinacion de entornos no soportada: " + (clave or "ninguno"))
    return config.ENTORNOS_CARPETA[clave]


def siguiente_correlativo(relativa_entorno):
    numeros = [0]
    for raiz in (config.RAIZ_TRABAJO, config.RAIZ_PROCESO):
        carpeta = os.path.join(raiz, relativa_entorno)
        if os.path.isdir(carpeta):
            for nombre in os.listdir(carpeta):
                coincidencia = config.PATRON_NUMERADO.match(nombre)
                if coincidencia:
                    numeros.append(int(coincidencia.group(1)))
    return max(numeros) + 1

