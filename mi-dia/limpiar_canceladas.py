"""
Elimina las carpetas (trabajo y proceso) de interrupciones NPL
que quedaron con estado=descartado antes del fix de cancelacion.
Tambien las borra del indice SQLite.

Uso:
  python limpiar_canceladas.py          -- muestra que borraria (dry-run)
  python limpiar_canceladas.py --borrar -- borra de verdad

Variables de entorno: AT_RAIZ_PROCESO, AT_RAIZ_TRABAJO
"""

import json
import os
import stat
import sqlite3
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


def _leer(ruta):
    try:
        with open(ruta, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _rmtree_robusto(ruta):
    # os.walk bottom-up: primero archivos, luego directorios, finalmente la raiz.
    # En OneDrive (Windows) las carpetas pueden tener solo lectura; chmod fuerza el borrado.
    if not os.path.isdir(ruta):
        return
    for raiz_actual, dirs, archivos in os.walk(ruta, topdown=False):
        for nombre in archivos:
            p = os.path.join(raiz_actual, nombre)
            try:
                os.chmod(p, stat.S_IWRITE)
                os.remove(p)
            except Exception:
                pass
        for nombre in dirs:
            p = os.path.join(raiz_actual, nombre)
            try:
                os.chmod(p, stat.S_IWRITE)
                os.rmdir(p)
            except Exception:
                pass
    try:
        os.chmod(ruta, stat.S_IWRITE)
        os.rmdir(ruta)
    except Exception:
        pass


def _eliminar_vacias(ruta_borrada, raiz):
    raiz = os.path.abspath(raiz)
    actual = os.path.dirname(os.path.abspath(ruta_borrada))
    while actual != raiz and actual.startswith(raiz + os.sep):
        try:
            os.rmdir(actual)
        except OSError:
            break
        actual = os.path.dirname(actual)


def buscar_canceladas():
    encontradas = []
    for raiz_actual, dirs, archivos in os.walk(RAIZ_PROCESO):
        dirs[:] = [d for d in dirs if d != "trabajo"]
        if "ticket-datos.json" not in archivos:
            continue
        datos = _leer(os.path.join(raiz_actual, "ticket-datos.json"))
        if not datos:
            continue
        if datos.get("tipo") == "npl" and datos.get("estado") == "descartado":
            rel = os.path.relpath(raiz_actual, RAIZ_PROCESO)
            encontradas.append((rel, datos.get("id_herramienta", ""), datos.get("tracking_id", "")))
    return encontradas


def borrar(canceladas, en_seco):
    if not canceladas:
        print("No hay interrupciones canceladas pendientes de limpiar.")
        return

    ruta_db = os.path.join(RAIZ_PROCESO, "indice.db")

    for rel, id_h, tid in canceladas:
        carpeta_proceso = os.path.join(RAIZ_PROCESO, rel)
        carpeta_trabajo = os.path.join(RAIZ_TRABAJO, rel)

        print(("  [dry-run] " if en_seco else "  ") + rel + "  (" + tid + ")")

        if not en_seco:
            if os.path.isdir(carpeta_trabajo):
                _rmtree_robusto(carpeta_trabajo)
                _eliminar_vacias(carpeta_trabajo, RAIZ_TRABAJO)
            if os.path.isdir(carpeta_proceso):
                _rmtree_robusto(carpeta_proceso)
                _eliminar_vacias(carpeta_proceso, RAIZ_PROCESO)
            if id_h and os.path.isfile(ruta_db):
                try:
                    con = sqlite3.connect(ruta_db)
                    con.execute("DELETE FROM atenciones WHERE id = ?", (id_h,))
                    con.commit()
                    con.close()
                except Exception:
                    pass

    if en_seco:
        print("\nNada borrado. Vuelve a correr con --borrar para ejecutar de verdad.")
    else:
        print("\nListo. " + str(len(canceladas)) + " interrupcion(es) eliminada(s).")


def main():
    en_seco = "--borrar" not in sys.argv
    canceladas = buscar_canceladas()

    if canceladas:
        print("Interrupciones NPL descartadas encontradas:")
    borrar(canceladas, en_seco)


if __name__ == "__main__":
    main()
