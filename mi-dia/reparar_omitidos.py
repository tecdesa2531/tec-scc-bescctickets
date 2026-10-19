"""
Agrega el campo 'omitidos' a los archivos jira-comentarios_*.json existentes.

Para cada atencion que ya tiene comentarios subidos a Jira, detecta las
entradas de bitacora con para_jira: true que quedaron sin cubrir (el agente
las proceso pero no las subio) y las registra en 'omitidos' para que la
herramienta deje de contarlas como pendientes.

Uso (desde la carpeta mi-dia):
  python reparar_omitidos.py             -- muestra que haria, sin tocar nada
  python reparar_omitidos.py --ejecutar  -- aplica los cambios

Variable de entorno requerida: AT_RAIZ_PROCESO
"""

import json
import os
import sys

CARPETA_JIRA = "040_ProcesoJira"


def _raiz_proceso():
    valor = os.environ.get("AT_RAIZ_PROCESO", "").strip().strip('"')
    if not valor:
        print("ERROR: falta la variable de entorno AT_RAIZ_PROCESO")
        sys.exit(1)
    ruta = os.path.realpath(valor)
    if not os.path.isdir(ruta):
        print("ERROR: la carpeta AT_RAIZ_PROCESO no existe: " + ruta)
        sys.exit(1)
    return ruta


def _leer_json(ruta):
    try:
        with open(ruta, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _escribir_json(ruta, datos):
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)


def _ids_cubiertos(archivos_comentarios):
    """IDs de bitacora ya cubiertos: subidos o en omitidos de algun archivo."""
    cubiertos = set()
    for datos in archivos_comentarios.values():
        for id_entrada in datos.get("omitidos") or []:
            cubiertos.add(id_entrada)
        for comentario in datos.get("comentarios") or []:
            if comentario.get("subido"):
                if comentario.get("bitacora_id"):
                    cubiertos.add(comentario["bitacora_id"])
                for id_entrada in comentario.get("bitacora_ids") or []:
                    cubiertos.add(id_entrada)
    return cubiertos


def _tiene_comentarios_procesados(archivos_comentarios):
    """True si al menos un comentario ya se subio a Jira."""
    for datos in archivos_comentarios.values():
        for comentario in datos.get("comentarios") or []:
            if comentario.get("subido"):
                return True
    return False


def escanear(raiz_proceso):
    """
    Camina raiz_proceso buscando atenciones con jira-comentarios_*.json procesados
    que tengan entradas huerfanas (para_jira: true, no cubiertas).
    Devuelve lista de dicts con la info necesaria para el reporte y la reparacion.
    """
    hallazgos = []
    for carpeta_actual, dirs, archivos in os.walk(raiz_proceso):
        dirs[:] = [d for d in dirs if d != "trabajo"]
        if "bitacora.json" not in archivos:
            continue
        carpeta_jira = os.path.join(carpeta_actual, CARPETA_JIRA)
        if not os.path.isdir(carpeta_jira):
            continue

        nombres_comentarios = [
            n for n in os.listdir(carpeta_jira)
            if n.startswith("jira-comentarios") and n.endswith(".json")
        ]
        if not nombres_comentarios:
            continue

        archivos_comentarios = {}
        for nombre in sorted(nombres_comentarios):
            datos = _leer_json(os.path.join(carpeta_jira, nombre))
            if datos is not None:
                archivos_comentarios[nombre] = datos

        if not _tiene_comentarios_procesados(archivos_comentarios):
            continue

        bitacora = _leer_json(os.path.join(carpeta_actual, "bitacora.json"))
        if not bitacora:
            continue
        entradas_para_jira = [
            e for e in bitacora.get("entradas") or []
            if e.get("para_jira") and e.get("id")
        ]
        if not entradas_para_jira:
            continue

        cubiertos = _ids_cubiertos(archivos_comentarios)
        huerfanos = [e["id"] for e in entradas_para_jira if e["id"] not in cubiertos]
        if not huerfanos:
            continue

        nombre_destino = sorted(nombres_comentarios)[0]
        relativa = os.path.relpath(carpeta_actual, raiz_proceso)
        hallazgos.append({
            "relativa": relativa,
            "carpeta_jira": carpeta_jira,
            "nombre_destino": nombre_destino,
            "datos_destino": archivos_comentarios[nombre_destino],
            "huerfanos": huerfanos,
        })
    return hallazgos


def reportar(hallazgos):
    if not hallazgos:
        print("Sin pendientes huerfanos. No hay nada que reparar.")
        return
    total_ids = sum(len(h["huerfanos"]) for h in hallazgos)
    print(
        "Atenciones con pendientes huerfanos: "
        + str(len(hallazgos))
        + "  |  IDs a registrar: "
        + str(total_ids)
    )
    print()
    for h in hallazgos:
        print("  " + h["relativa"])
        print("    Archivo destino : " + h["nombre_destino"])
        print("    IDs a agregar   : " + str(len(h["huerfanos"])))
        for id_h in h["huerfanos"]:
            print("      - " + id_h)
        print()


def aplicar(hallazgos):
    for h in hallazgos:
        datos = h["datos_destino"]
        existentes = list(datos.get("omitidos") or [])
        nuevos = [i for i in h["huerfanos"] if i not in existentes]
        if not nuevos:
            continue
        datos["omitidos"] = existentes + nuevos
        ruta = os.path.join(h["carpeta_jira"], h["nombre_destino"])
        _escribir_json(ruta, datos)
        print("  Actualizado: " + h["relativa"] + os.sep + CARPETA_JIRA + os.sep + h["nombre_destino"])


def main():
    ejecutar = "--ejecutar" in sys.argv
    raiz_proceso = _raiz_proceso()

    print("Escaneando: " + raiz_proceso)
    print()

    hallazgos = escanear(raiz_proceso)

    if ejecutar:
        if not hallazgos:
            print("Sin pendientes huerfanos. No hay nada que reparar.")
            return
        print(
            "Aplicando cambios en "
            + str(len(hallazgos))
            + " atencion(es)..."
        )
        print()
        aplicar(hallazgos)
        print()
        print("Listo.")
    else:
        reportar(hallazgos)
        if hallazgos:
            print("Para aplicar los cambios ejecuta:")
            print("  python reparar_omitidos.py --ejecutar")


if __name__ == "__main__":
    main()
