---
name: sprint-cierre
description: Cierre de semana y cierre de sprint. Son distintos. Cierre de semana: las subtareas semanales abiertas cambian de padre a la HU de la semana siguiente, sin duplicar. Cierre de sprint: lo que continua pasa al sprint siguiente como Parte 02 y el agente crea las nuevas HU padre. Nunca cierra el sprint ni cambia el estado de historias de usuario.
---

# Cierre de semana y de sprint

Sigue `.github/copilot-instructions.md`. Preparas scripts `.py` que ejecuta Jhans; tu no ejecutas nada. Jhans crea el sprint y lo cierra en el tablero; el agente crea las HU semanales y, al cerrar sprint, las HU padre de la Parte 02.

**Son dos operaciones distintas.** La diferencia clave: la "Parte 02" (la continuacion duplicada del trabajo) **solo** nace en el cierre de sprint, nunca en el de semana, para no duplicar contenido dentro del sprint activo.

## Cierre de semana (dentro del mismo sprint)

Las subtareas semanales que siguen abiertas al terminar una semana **cambian de padre** a la HU de la semana siguiente. No se crea una subtarea nueva ni se duplica nada: es el mismo issue, movido de HU.

1. Toma las atenciones `hu_tipo: "semanal"` con subtareas abiertas (`en_curso`, `en_espera`) cuyo padre es la HU de la semana que cierra (la de `hu_semanales` cuyo rango termina). Muestrale la lista a Jhans y **confirma cuales continuan**. Si alguna termino o se descarta, aplica ese caso en vez de mover.
2. La HU de la semana siguiente debe existir en `hu_semanales`; si no, creala primero (skill `jira-historia-usuario`).
3. Por cada subtarea que continua:
   - Agrega un comentario breve de continuidad (skill `jira-comentarios`): `*Continua la proxima semana.*` con un resumen de una linea. Asi queda el historial en Jira.
   - **Cambia el padre** de la subtarea a la `key` de la HU de la semana siguiente: `PUT /issue/<key>` con `{"fields": {"parent": {"key": "<hu_semana_siguiente>"}}}`.
   - En `subtareas[]` de `ticket-datos.json`, actualiza el padre de esa subtarea (campo `hu_key`) a la nueva HU y deja el anterior en un `historial` breve.

Las atenciones con **HU independiente** no se tocan en el cierre de semana.

```python
import json
import os
import subprocess

CARPETA = os.path.dirname(os.path.abspath(__file__))
# Ajusta al generar el script: key de la subtarea y HU de la semana siguiente.
SUBTAREA = "PRYA-1002"
HU_SIGUIENTE = "PRYA-1005"

URL = os.environ["JIRA_ACMEBANK_URL"].rstrip("/") + "/rest/api/2"
AUTH = os.environ["JIRA_ACMEBANK_EMAIL"] + ":" + os.environ["JIRA_ACMEBANK_TOKEN"]


def mover():
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
    mover()
```

## Cierre de sprint (pasa al sprint siguiente)

Un trimestre (la **epica**) tiene varios sprints (unos tres, de ~5 semanas). Jhans **crea el nuevo sprint** y te da sus fechas; tu no lo creas ni lo cierras, y no cambias el estado de las HU.

1. Con las fechas del nuevo sprint, crea sus **HU semanales** (lun-vie) y con ellas **reemplaza** `hu_semanales` (solo se guarda el sprint activo); actualiza tambien `sprint` (skill `jira-historia-usuario`).
2. Lo que siga abierto **pasa al nuevo sprint como Parte 02** (continuacion duplicada del trabajo):
   - **Semanal:** la subtarea abierta se cierra en FINALIZADO con un comentario de continuidad, y se crea su continuacion (Parte 02) bajo la HU de la primera semana del nuevo sprint.
   - **Independiente:** si la atencion sigue abierta, crea una **HU independiente nueva** (Parte 02) para el nuevo sprint; sus subtareas pendientes cuelgan de ella.
3. Las descripciones de la Parte 02 referencian la subtarea/HU anterior (key y resumen del avance).
4. **Dentro del mismo trimestre la epica no cambia.** Solo al cambiar de trimestre Jhans crea una epica nueva; la asociacion de las HU a la epica y al sprint la hace Jhans en el tablero.

## Cerrar

Resumen para Jhans: los comandos vigentes a ejecutar, en orden, y el recordatorio de cerrar en el tablero la HU/el sprint anterior y asociar lo nuevo a la epica y al sprint.
