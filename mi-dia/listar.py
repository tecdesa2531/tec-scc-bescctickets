"""
Lista todas las atenciones con su tipo, entornos, estado y ruta.
Util para detectar duplicados o tipos incorrectos.

Uso:
  python listar.py
  python listar.py NEXHUB       -- filtra por tracking_code
  python listar.py PTSK0001234  -- filtra por tracking_id (parcial)

Variables de entorno: AT_RAIZ_PROCESO, AT_RAIZ_TRABAJO
"""

import json
import os
import re
import sys


def _raiz(nombre_var):
    valor = os.environ.get(nombre_var, "").strip().strip('"')
    if not valor:
        print("ERROR: falta la variable de entorno " + nombre_var)
        sys.exit(1)
    ruta = os.path.realpath(valor)
    if not os.path.isdir(ruta):
        print("ERROR: " + nombre_var + " no es una carpeta valida: " + ruta)
        sys.exit(1)
    return ruta


RAIZ_PROCESO = _raiz("AT_RAIZ_PROCESO")
RAIZ_TRABAJO = _raiz("AT_RAIZ_TRABAJO")

TIPOS_NOMBRE = {"ticket": "Ticket (ServiceNow)", "int": "Iniciativa interna",
                "doc": "Documento", "con": "Consultoria"}

PATRON_PROYECTO = re.compile(r"^(\d{3})_([A-Za-z]{6})$")
PATRON_NUMERADO = re.compile(r"^(\d{3})_")
CARPETA_SIN_ASIGNAR = "004_SinAsignar"


def _leer(ruta):
    try:
        with open(ruta, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def todas():
    entradas = []
    for raiz_actual, dirs, archivos in os.walk(RAIZ_PROCESO):
        dirs[:] = [d for d in dirs if d != "trabajo"]
        if "ticket-datos.json" in archivos:
            datos = _leer(os.path.join(raiz_actual, "ticket-datos.json"))
            if datos and datos.get("id_herramienta"):
                rel = os.path.relpath(raiz_actual, RAIZ_PROCESO)
                entradas.append((rel, datos))
    return sorted(entradas)


def main():
    filtro = sys.argv[1].strip().upper() if len(sys.argv) > 1 else ""

    registros = todas()

    if filtro:
        registros = [
            (rel, d) for rel, d in registros
            if filtro in (d.get("tracking_code") or "").upper()
            or filtro in (d.get("tracking_id") or "").upper()
        ]

    if not registros:
        print("No se encontraron atenciones" + (" con el filtro " + filtro if filtro else "") + ".")
        return

    print("%-14s %-20s %-8s %-18s %-12s %s" % (
        "ID_herramienta", "tracking_id", "tipo", "tipo_nombre", "estado", "ruta"))
    print("-" * 110)

    for rel, d in registros:
        tipo     = d.get("tipo") or "?"
        tid      = d.get("tracking_id") or "(sin asignar)"
        estado   = d.get("estado") or "?"
        nombre_t = TIPOS_NOMBRE.get(tipo, tipo)
        id_h     = d.get("id_herramienta", "?")[:14]

        trab = os.path.join(RAIZ_TRABAJO, rel)
        aviso = ""
        if not rel.startswith(CARPETA_SIN_ASIGNAR) and not os.path.isdir(trab):
            aviso = "  <-- sin carpeta trabajo"

        print("%-14s %-20s %-8s %-18s %-12s %s%s" % (
            id_h, tid, tipo, nombre_t, estado, rel, aviso))


if __name__ == "__main__":
    main()
