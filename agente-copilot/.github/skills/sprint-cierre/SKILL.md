---
name: sprint-cierre
description: Cierre de semana y cierre de sprint. Son distintos. Cierre de semana: las subtareas semanales abiertas cambian de padre a la HU de la semana siguiente, sin duplicar. Cierre de sprint: lo que continua pasa al sprint siguiente como Parte 02 y el agente crea las nuevas HU padre. Nunca cierra el sprint ni cambia el estado de historias de usuario.
---

# Cierre de semana y de sprint

Sigue `.github/copilot-instructions.md`. Generas los scripts `.py` en `<raiz_proceso>/003_Herramienta/020_ProcesoSprint/` (con su `jira-ejecuciones.log`; creala si no existe) y **los ejecutas tu** en la terminal tras la confirmacion "crear" de Jhans (primero un `--dry-run`). Jhans crea el sprint y lo cierra en el tablero; el agente crea las HU semanales y, al cerrar sprint, las HU padre de la Parte 02.

**Son dos operaciones distintas.** La diferencia clave: la "Parte 02" (la continuacion duplicada del trabajo) **solo** nace en el cierre de sprint, nunca en el de semana, para no duplicar contenido dentro del sprint activo.

## Cierre de semana (dentro del mismo sprint)

Las subtareas semanales que siguen abiertas al terminar una semana **cambian de padre** a la HU de la semana siguiente. No se crea una subtarea nueva ni se duplica nada: es el mismo issue, movido de HU.

1. **Como encontrarlas:** la cola no trae estas atenciones (ya tienen su subtarea y no les queda accion pendiente), asi que aqui, **y solo aqui** (cierre de semana y de sprint), recorres en **solo lectura** los `ticket-datos.json` de la raiz de proceso. Toma las subtareas **abiertas** (su `estado` no es `FINALIZADO`) cuyo `hu_key` es la HU de la semana que cierra (la de `hu_semanales` cuyo rango termina). Si una subtarea antigua no tiene `hu_key`, deducelo por la fecha de la atencion (`creado`; sabado o domingo cuentan como el viernes anterior) y avisalo. Incluye a los **hijos**: para ellos usa el `hu_tipo` de la atencion raiz, no el suyo (ver "Padre e hijos" en `copilot-instructions.md`). Muestrale la lista de titulos a Jhans. Si son **5 o menos**, confirma cuales continuan antes de proceder; si son **mas de 5**, procede con todas sin preguntar por cada una. Si alguna termino o se descarta, aplica ese caso en vez de mover.
2. La HU de la semana siguiente debe existir en `hu_semanales`; si no, creala primero (skill `jira-historia-usuario`).
3. Por cada subtarea que continua:
   - Agrega un comentario breve de continuidad (skill `jira-comentarios`): `*Continua la proxima semana.*` con un resumen de una linea. Asi queda el historial en Jira.
   - **Cambia el padre** de la subtarea a la `key` de la HU de la semana siguiente: `PUT /issue/<key>` con `{"fields": {"parent": {"key": "<hu_semana_siguiente>"}}}`.
   - En `subtareas[]` de `ticket-datos.json`, actualiza el padre de esa subtarea (campo `hu_key`) a la nueva HU y deja el anterior en un `historial` breve.

Las atenciones con **HU independiente** no se tocan en el cierre de semana.

**Subtarea fija de interrupciones.** La de la semana que cierra (`subtarea_interrupciones_key` en su entrada de `hu_semanales`) **no** cambia de padre ni continua: pasa a `FINALIZADO` (transicion del skill `jira-subtareas`), en el mismo `--dry-run`/"crear" del cierre. La semana siguiente usa la suya propia. Si la entrada no tiene esa key (no hubo interrupciones sin padre esa semana), no hay nada que cerrar.

Script de cambio de padre (referencia). Con `--dry-run` solo muestra el cambio, sin llamar a Jira.

```python
import json
import os
import subprocess
import sys

CARPETA = os.path.dirname(os.path.abspath(__file__))
# Ajusta al generar el script: key de la subtarea y HU de la semana siguiente.
SUBTAREA = "PRYA-1002"
HU_SIGUIENTE = "PRYA-1005"

# Nombres de ejemplo: usa los del destino (url_var, email_var, token_var)
URL = os.environ["JIRA_ACMEBANK_URL"].rstrip("/") + "/rest/api/2"
AUTH = os.environ["JIRA_ACMEBANK_EMAIL"] + ":" + os.environ["JIRA_ACMEBANK_TOKEN"]


def mover(seco):
    if seco:
        print("[dry-run] movera " + SUBTAREA + " a la HU " + HU_SIGUIENTE)
        return
    tmp = os.path.join(CARPETA, "_parent.json")
    with open(tmp, "w", encoding="utf-8") as archivo:
        json.dump({"fields": {"parent": {"key": HU_SIGUIENTE}}}, archivo)
    codigo = subprocess.run(
        ["curl.exe", "-sS", "--ssl-no-revoke", "-u", AUTH, "-X", "PUT",
         URL + "/issue/" + SUBTAREA, "-H", "Content-Type: application/json",
         "--data-binary", "@" + tmp, "-o", os.devnull, "-w", "%{http_code}"],
        capture_output=True, text=True).stdout
    os.remove(tmp)
    print("Movida " + SUBTAREA + " a " + HU_SIGUIENTE + ": HTTP " + codigo)


if __name__ == "__main__":
    mover("--dry-run" in sys.argv)
```

## Cierre de sprint (pasa al sprint siguiente)

Un trimestre (la **epica**) tiene varios sprints (unos tres, de ~5 semanas). Jhans **crea el nuevo sprint** y te da sus fechas; tu no lo creas ni lo cierras, y no cambias el estado de las HU.

1. Con las fechas del nuevo sprint, crea sus **HU semanales** (lun-vie) y con ellas **reemplaza** `hu_semanales` (solo se guarda el sprint activo); actualiza tambien `sprint` (skill `jira-historia-usuario`).
2. Lo que siga abierto **pasa al nuevo sprint como Parte 02** (continuacion duplicada del trabajo):
   - Encuentralas igual que en el cierre de semana: recorriendo en solo lectura los `ticket-datos.json` de la raiz de proceso (subtareas abiertas = `estado` distinto de `FINALIZADO`).
   - **Semanal:** la subtarea abierta se cierra en FINALIZADO con un comentario de continuidad, y se crea su continuacion (Parte 02) bajo la HU de la primera semana del nuevo sprint, con el mismo titulo terminado en ` (Parte 02)`. En `subtareas[]` agrega la nueva como entrada aparte con `"parte": 2`, su `entorno`, `hu_key`, `key`, `url` y `estado: ""`; la anterior queda con `estado: "FINALIZADO"`. Desde ahi los comentarios de ese entorno van a la vigente (la que no esta en FINALIZADO).
   - **Independiente:** si la atencion sigue abierta, crea una **HU independiente nueva** (Parte 02) para el nuevo sprint, con el mismo titulo terminado en ` (Parte 02)`. Mueve a ella sus fases pendientes cambiando su padre (`PUT /issue/<key>` con `parent`, como en el cierre de semana), **incluidas** las subtareas abiertas de sus hijos con `fase_independiente: true` (estan en el `ticket-datos.json` de cada hijo, no en el de la raiz). En `ticket-datos.json`, la nueva HU reemplaza a `jira.padre_key`/`jira.padre_url` y la anterior se agrega a `jira.historial` (lista de `{ "padre_key", "padre_url" }`).
3. Las descripciones de la Parte 02 referencian la subtarea/HU anterior (key y resumen del avance).
   - La **subtarea fija de interrupciones** de la ultima semana del sprint no tiene Parte 02: pasa a `FINALIZADO` (igual que en el cierre de semana); las HU semanales del nuevo sprint traen la suya. La fase "Consultas y seguimiento" de una HU independiente que continua pasa a la Parte 02 como cualquier subtarea pendiente.
4. **Dentro del mismo trimestre la epica no cambia.** Solo al cambiar de trimestre Jhans crea una epica nueva; la asociacion de las HU a la epica y al sprint la hace Jhans en el tablero.

## Cerrar

Resumen para Jhans: los comandos vigentes a ejecutar, en orden, y el recordatorio de cerrar en el tablero la HU/el sprint anterior y asociar lo nuevo a la epica y al sprint.
