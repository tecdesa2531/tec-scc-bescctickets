"""
Diagnostica y repara atenciones cuya carpeta quedo fuera del alcance del servidor.

Uso (desde la carpeta mi-dia):
  python reparar.py                       -- solo diagnostica
  python reparar.py --reparar             -- muestra que moveria (dry-run)
  python reparar.py --reparar --ejecutar  -- aplica los movimientos

Variables de entorno requeridas: AT_RAIZ_TRABAJO, AT_RAIZ_PROCESO
"""

import json
import os
import re
import shutil
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

CARPETA_SIN_ASIGNAR = "004_SinAsignar"
PATRON_PROYECTO     = re.compile(r"^(\d{3})_([A-Za-z]{6})$")
PATRON_NUMERADO     = re.compile(r"^(\d{3})_")
ENTORNOS_CARPETA    = {
    "DEV":             "010_Dev",
    "PRE":             "020_Pre",
    "PRO":             "030_Pro",
    "SIN_ENTORNO":     "000_SinEntorno",
    "DEV,PRE":         "040_DevPre",
    "PRE,PRO":         "050_PrePro",
    "DEV,PRE,PRO":     "060_DevPrePro",
}
ORDEN_ENTORNOS = ["DEV", "PRE", "PRO", "SIN_ENTORNO"]


# ---------------------------------------------------------------------------
# Escaneo
# ---------------------------------------------------------------------------

def _leer_json(ruta):
    try:
        with open(ruta, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def scan_todos():
    """
    Camina todo RAIZ_PROCESO buscando ticket-datos.json sin filtros de profundidad.
    Devuelve {id_herramienta: info} con el PRIMER registro encontrado (para compatibilidad),
    y por separado expone los duplicados via scan_todos_lista().
    """
    encontrados = {}
    for raiz_actual, dirs, archivos in os.walk(RAIZ_PROCESO):
        dirs[:] = [d for d in dirs if d != "trabajo"]
        if "ticket-datos.json" in archivos:
            datos = _leer_json(os.path.join(raiz_actual, "ticket-datos.json"))
            if datos and datos.get("id_herramienta"):
                rel = os.path.relpath(raiz_actual, RAIZ_PROCESO)
                id_h = datos["id_herramienta"]
                if id_h not in encontrados:
                    encontrados[id_h] = {"relativa_actual": rel, "datos": datos}
    return encontrados


def scan_todos_lista():
    """Como scan_todos pero devuelve TODOS los registros, incluyendo duplicados."""
    lista = []
    for raiz_actual, dirs, archivos in os.walk(RAIZ_PROCESO):
        dirs[:] = [d for d in dirs if d != "trabajo"]
        if "ticket-datos.json" in archivos:
            datos = _leer_json(os.path.join(raiz_actual, "ticket-datos.json"))
            if datos and datos.get("id_herramienta"):
                rel = os.path.relpath(raiz_actual, RAIZ_PROCESO)
                lista.append({"id_h": datos["id_herramienta"], "relativa_actual": rel, "datos": datos})
    return lista


def detectar_duplicados(lista):
    """
    Devuelve los grupos con mas de una carpeta para el mismo id_herramienta.
    Dentro de cada grupo marca cual es el huerfano (sin carpeta trabajo,
    o el que tiene entornos distintos a los del ticket-datos.json actual).
    """
    grupos = {}
    for item in lista:
        id_h = item["id_h"]
        grupos.setdefault(id_h, []).append(item)
    resultado = []
    for id_h, items in grupos.items():
        if len(items) < 2:
            continue
        anotados = []
        for item in items:
            rel = item["relativa_actual"]
            es_sin_asignar = rel.replace("\\", "/").startswith(CARPETA_SIN_ASIGNAR + "/")
            tiene_trabajo = es_sin_asignar or os.path.isdir(os.path.join(RAIZ_TRABAJO, rel))
            anotados.append(dict(item, tiene_trabajo=tiene_trabajo))
        resultado.append(anotados)
    return resultado


def scan_normal():
    """Simula buscar_atenciones() del servidor: solo encuentra lo que el servidor veria."""
    encontrados = {}

    for proyecto in sorted(os.listdir(RAIZ_PROCESO)):
        ruta_proyecto = os.path.join(RAIZ_PROCESO, proyecto)
        if not PATRON_PROYECTO.match(proyecto) or not os.path.isdir(ruta_proyecto):
            continue
        for entorno in sorted(os.listdir(ruta_proyecto)):
            ruta_entorno = os.path.join(ruta_proyecto, entorno)
            if not os.path.isdir(ruta_entorno):
                continue
            for atencion in sorted(os.listdir(ruta_entorno)):
                rel = os.path.join(proyecto, entorno, atencion)
                _agregar_normal(encontrados, rel)
                ruta_atencion = os.path.join(ruta_entorno, atencion)
                if os.path.isdir(ruta_atencion):
                    for hijo in sorted(os.listdir(ruta_atencion)):
                        if PATRON_NUMERADO.match(hijo) and os.path.isdir(
                                os.path.join(ruta_atencion, hijo)):
                            _agregar_normal(encontrados, os.path.join(proyecto, entorno, atencion, hijo))

    sin_asignar = os.path.join(RAIZ_PROCESO, CARPETA_SIN_ASIGNAR)
    if os.path.isdir(sin_asignar):
        for nombre in sorted(os.listdir(sin_asignar)):
            _agregar_normal(encontrados, os.path.join(CARPETA_SIN_ASIGNAR, nombre))

    return encontrados


def _agregar_normal(encontrados, relativa):
    ruta = os.path.join(RAIZ_PROCESO, relativa, "ticket-datos.json")
    if not os.path.isfile(ruta):
        return
    datos = _leer_json(ruta)
    if datos and datos.get("id_herramienta"):
        encontrados[datos["id_herramienta"]] = {
            "relativa_actual": relativa,
            "datos": datos,
        }


# ---------------------------------------------------------------------------
# Calculo de ruta esperada
# ---------------------------------------------------------------------------

def _carpeta_proyecto_existente(codigo):
    for raiz in (RAIZ_TRABAJO, RAIZ_PROCESO):
        for nombre in sorted(os.listdir(raiz)):
            m = PATRON_PROYECTO.match(nombre)
            if m and int(m.group(1)) >= 10 and m.group(2).upper() == codigo.upper():
                return nombre
    return None


def calcular_relativa_esperada(datos, relativa_actual):
    """
    Dados los campos del ticket-datos.json y su ruta actual,
    devuelve (relativa_esperada, None) o (None, motivo_del_error).
    """
    tracking_code = (datos.get("tracking_code") or "").strip().upper()
    tracking_id   = (datos.get("tracking_id")   or "").strip().upper()
    entornos_raw  = datos.get("entornos") or []
    padre_id      = (datos.get("padre_id") or "").strip()

    if not tracking_code or not tracking_id:
        return None, "sin identidad completa (atencion temporal o sin proyecto/ticket)"

    if padre_id:
        return None, "es hija de otra atencion; su ubicacion depende de la carpeta de la atencion padre"

    carpeta_proy = _carpeta_proyecto_existente(tracking_code)
    if not carpeta_proy:
        return None, "no hay carpeta de proyecto para el codigo " + tracking_code

    entornos_norm = sorted(
        [e for e in entornos_raw if e in ORDEN_ENTORNOS],
        key=lambda e: ORDEN_ENTORNOS.index(e)
    )
    clave_entorno = ",".join(entornos_norm)
    carpeta_entorno = ENTORNOS_CARPETA.get(clave_entorno)
    if not carpeta_entorno:
        return None, "combinacion de entornos no reconocida: " + (clave_entorno or "vacia")

    # Buscar el segmento de la ruta actual que contiene el tracking_id
    partes = relativa_actual.replace("\\", "/").split("/")
    nombre_carpeta_atencion = None
    for parte in partes:
        if tracking_id in parte.upper():
            nombre_carpeta_atencion = parte
            break

    if not nombre_carpeta_atencion:
        return None, "no se encontro el segmento con " + tracking_id + " en la ruta " + relativa_actual

    relativa_esperada = os.path.join(carpeta_proy, carpeta_entorno, nombre_carpeta_atencion)
    return relativa_esperada, None


# ---------------------------------------------------------------------------
# Diagnostico y reparacion
# ---------------------------------------------------------------------------

def diagnosticar_trabajo_faltante(normales):
    """Detecta atenciones visibles al servidor que no tienen carpeta en RAIZ_TRABAJO."""
    problemas = []
    for id_h, info in normales.items():
        rel = info["relativa_actual"].replace("\\", "/")
        # Las temporales (SinAsignar) guardan su trabajo dentro de proceso; no aplica
        if rel.startswith(CARPETA_SIN_ASIGNAR + "/") or rel.startswith(CARPETA_SIN_ASIGNAR + "\\"):
            continue
        if info["datos"].get("tipo"):
            ruta_trab = os.path.join(RAIZ_TRABAJO, info["relativa_actual"])
            if not os.path.isdir(ruta_trab):
                problemas.append((id_h, info["relativa_actual"], info["datos"]))
    return problemas


def main():
    reparar  = "--reparar"  in sys.argv
    ejecutar = "--ejecutar" in sys.argv

    print("Raiz proceso : " + RAIZ_PROCESO)
    print("Raiz trabajo : " + RAIZ_TRABAJO)
    print()

    todos    = scan_todos()
    normales = scan_normal()
    lista    = scan_todos_lista()
    duplicados = detectar_duplicados(lista)

    perdidas = {id_h: info for id_h, info in todos.items() if id_h not in normales}

    # --- Atenciones que el servidor si ve ---
    print("Atenciones visibles al servidor : " + str(len(normales)))

    # Carpetas de trabajo faltantes para atenciones visibles
    sin_trabajo = diagnosticar_trabajo_faltante(normales)
    if sin_trabajo:
        print()
        print("  Carpetas de TRABAJO faltantes (proceso existe, trabajo no):")
        for id_h, rel, datos in sin_trabajo:
            tid = datos.get("tracking_id", "?")
            print("    " + id_h + "  " + tid + "  ->  " + rel)

    # --- Duplicados (mismo id_herramienta en dos carpetas) ---
    if duplicados:
        print()
        print("DUPLICADOS: id_herramienta repetido en varias carpetas (" + str(len(duplicados)) + " grupos)")
        print("  El servidor toma el primero en orden alfabetico, ignorando el resto.")
        print("  La carpeta huerfana (sin trabajo) se puede eliminar manualmente.")
        print()
        for grupo in duplicados:
            tid = grupo[0]["datos"].get("tracking_id", "?")
            print("  tracking_id: " + tid)
            for item in grupo:
                marca = "  tiene trabajo" if item["tiene_trabajo"] else "  SIN TRABAJO <- huerfana"
                print("    " + item["relativa_actual"] + marca)
            print()

    # --- Atenciones perdidas ---
    print()
    if not perdidas:
        print("No se encontraron atenciones perdidas.")
        if not sin_trabajo and not duplicados:
            print("Todo parece estar en orden.")
        return

    print("Atenciones perdidas (no visibles al servidor) : " + str(len(perdidas)))
    print()

    movimientos = []

    for id_h, info in sorted(perdidas.items(), key=lambda x: x[1]["relativa_actual"]):
        rel_actual = info["relativa_actual"]
        datos      = info["datos"]
        tid        = datos.get("tracking_id") or "(sin tracking ID)"
        estado     = datos.get("estado") or "?"

        print("  ID           : " + id_h)
        print("  tracking_id  : " + tid)
        print("  entornos     : " + str(datos.get("entornos", [])))
        print("  estado       : " + estado)
        print("  ruta actual  : " + rel_actual)

        rel_esperada, error = calcular_relativa_esperada(datos, rel_actual)

        if error:
            print("  no reparable : " + error)
        else:
            norm = lambda r: r.replace("\\", "/")
            if norm(rel_actual) == norm(rel_esperada):
                print("  La ruta ya es la esperada pero el scanner no la ve.")
                print("  Verifica que la carpeta del proyecto cumpla el patron NNN_CCCCCC (6 letras).")
            else:
                print("  ruta esperada: " + rel_esperada)
                ruta_proc_actual = os.path.join(RAIZ_PROCESO, rel_actual)
                ruta_proc_nueva  = os.path.join(RAIZ_PROCESO, rel_esperada)
                ruta_trab_actual = os.path.join(RAIZ_TRABAJO, rel_actual)
                ruta_trab_nueva  = os.path.join(RAIZ_TRABAJO, rel_esperada)

                hay_proc = os.path.isdir(ruta_proc_actual)
                hay_trab = os.path.isdir(ruta_trab_actual)
                print("  carpeta proceso actual : " + ("existe" if hay_proc else "NO EXISTE"))
                print("  carpeta trabajo actual : " + ("existe" if hay_trab else "no existe"))

                if hay_proc:
                    movimientos.append({"tipo": "proceso", "desde": ruta_proc_actual, "hasta": ruta_proc_nueva})
                if hay_trab:
                    movimientos.append({"tipo": "trabajo", "desde": ruta_trab_actual, "hasta": ruta_trab_nueva})
        print()

    if not movimientos:
        print("No hay movimientos automaticos posibles con la informacion disponible.")
        return

    print("Movimientos planificados (" + str(len(movimientos)) + "):")
    for m in movimientos:
        print("  [" + m["tipo"] + "]")
        print("    desde : " + m["desde"])
        print("    hasta : " + m["hasta"])
    print()

    if not reparar:
        print("Para aplicar los movimientos: python reparar.py --reparar")
        print("Para aplicarlos de inmediato: python reparar.py --reparar --ejecutar")
        return

    if not ejecutar:
        print("[DRY-RUN] Se aplicarian estos movimientos (sin cambios reales):")
        for m in movimientos:
            print("  " + m["desde"])
            print("    -> " + m["hasta"])
        print()
        print("Si el dry-run es correcto: python reparar.py --reparar --ejecutar")
        return

    print("Aplicando movimientos...")
    errores = []
    for m in movimientos:
        if os.path.exists(m["hasta"]):
            print("  SALTAR (ya existe el destino): " + m["hasta"])
            continue
        try:
            os.makedirs(os.path.dirname(m["hasta"]), exist_ok=True)
            shutil.move(m["desde"], m["hasta"])
            print("  OK [" + m["tipo"] + "] " + os.path.basename(m["desde"]))
        except Exception as e:
            errores.append("  ERROR [" + m["tipo"] + "] " + m["desde"] + ": " + str(e))

    if errores:
        print()
        print("Errores:")
        for err in errores:
            print(err)
    else:
        print()
        print("Listo. Reinicia el servidor para que rescannee las carpetas.")


if __name__ == "__main__":
    main()
