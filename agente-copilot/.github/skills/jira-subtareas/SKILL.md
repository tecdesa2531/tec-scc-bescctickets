---
name: jira-subtareas
description: Crea las subtareas de Jira y cambia su estado (En curso, Espera externa, FINALIZADO). Semanal: una subtarea por entorno bajo la HU semanal, en /inicia. Independiente: las tareas secuenciales bajo la HU, en /procede. Usalo tambien al poner en espera, retomar, cerrar o descartar una subtarea.
---

# Subtareas de Jira

Sigue `.github/copilot-instructions.md`. Generas el script `.py` en `040_ProcesoJira` y **lo ejecutas tu** en la terminal tras la confirmacion "crear" de Jhans (primero un `--dry-run`). Solo biblioteca estandar y `curl.exe --ssl-no-revoke` via `subprocess`.

Los datos de Jira salen del destino del proyecto (`config-jira.json`). Si el proyecto tiene varios destinos, se repite por cada uno.

## Cuando se crean

- **Semanal** (en `/inicia`): una subtarea **por entorno** bajo la HU de la semana que corresponde por fecha (de `hu_semanales` de `config-jira.json`). Una atencion en PRE y PRO genera dos subtareas. Guardalas en `subtareas[]` de `ticket-datos.json` con `entorno`, `key`, `url`.
- **Independiente** (en `/procede`): las tareas secuenciales aprobadas por Jhans, bajo `jira.padre_key` de la atencion. Una tarea puede abarcar varios entornos si comparten repositorio o flujo. Guardalas en `subtareas[]` con `secuencia`, `fase`, `entornos`, `key`, `url`.

## Titulo

- **Semanal** (una por entorno): `PROYAA(PRE): PTSK0000123 - titulo` (sin parentesis si no hay entorno). En `/inicia` aun no existe `titulo_jira`; usa el `titulo` actual y, en `/procede`, actualiza el titulo a `titulo_jira`.
- **Independiente** (tareas de la HU): **solo el nombre de la tarea** (`fase`), sin proyecto ni Tracking ID, porque ya estan en la HU padre.

## Descripcion (formato wiki de Jira, saltos como `\n`)

**Subtarea semanal** (sin titulo DESCRIPCION; COMO/QUIERO/PARA en negrita; rol, no nombres):

```
*COMO* DevOps del equipo de nube, *QUIERO* <lo que pide>, *PARA* <para que>.

*OBJETIVO:*
<resultado en este entorno>

*DATOS:*
* Tracking ID: [PTSK0000123|https://.../PTSK0000123]
* Proyecto: PROYAA
* Entorno: PRE
* Solicitante: Nombre del solicitante

*CAPTURA DEL CORREO DE ASIGNACION:*
!20261005_captura_correo_asignado.png|thumbnail!
```

- `*COMO*` es el rol de Jhans segun el proyecto (nube/infra), **nunca** un nombre.
- Tracking ID como enlace `[ID|URL]` solo si la atencion tiene `url_servicenow`; si no, deja solo el ID.
- **Solicitante** = quien pidio la atencion; su nombre sale del **correo de solicitud** (entrada tipo `solicitud`), **no** del de asignacion (ese es quien asigno, otra persona). Si no hay correo de solicitud, usa `solicitante` de `ticket-datos.json` o pregunta.
- La **captura del correo de asignacion** va embebida en la descripcion: subela como adjunto (`POST /issue/<key>/attachments`) y referenciala con `!archivo.png|thumbnail!`. No se adjunta el `.eml` de asignacion. **Si no hay correo de asignacion**, usa la captura del **correo de solicitud** (`captura_correo_solicitud`).
- El `.eml` y la captura del **correo de cierre** van en el comentario final, no aqui (ver `jira-comentarios`).

**Tarea de una HU independiente:**

```
*OBJETIVO:*
<resultado de esta tarea>

*DEPENDENCIA:*
<tarea anterior que debe estar lista antes>

*CRITERIOS DE ACEPTACION:*
<resultado verificable>
```

La captura de asignacion se sube como adjunto y se referencia en la descripcion con `!archivo.png|thumbnail!`. La captura y el `.eml` del correo de cierre van en el comentario final (ver `jira-comentarios`).

## Payload

Para **independiente**, agrupa todas las tareas aprobadas en un solo `jira-crear_subtareas.json`:

```json
{
  "subtareas": [
    {
      "secuencia": 1,
      "fase": "Analizar el requerimiento",
      "entornos": ["DEV", "PRE"],
      "fields": {
        "project": { "key": "PRYA" },
        "issuetype": { "id": "10001" },
        "parent": { "key": "PRYA-1001" },
        "assignee": { "accountId": "000000:aaaaaaaa-0000-0000-0000-000000000001" },
        "summary": "Analizar el requerimiento",
        "description": "*OBJETIVO:*\n..."
      }
    }
  ]
}
```

Para **semanal**, una entrada por entorno con `parent.key` = la `key` de la HU de `hu_semanales` cuya ventana (`inicio`-`fin`) cubre la fecha de la atencion, y el `summary` con el formato `PROYAA(PRE): ID - titulo`.

- `issuetype.id` = `tipo_subtarea_id`; `assignee.accountId` = `asignado_account_id`; `parent.key` = la HU (independiente: `jira.padre_key`; semanal: la HU de `hu_semanales` que cubre la fecha de la atencion). Si el destino tiene `prioridad` o `etiquetas`, agregalos.
- En independiente, en `/procede` **actualiza primero la HU** (PUT `/issue/<padre_key>`) con `titulo_jira` y la `descripcion` corregida, antes de crear las tareas.

## Script de creacion (referencia)

Recorre `jira-crear_subtareas.json` en orden de `secuencia`, crea cada subtarea y guarda las keys en `jira-respuesta_subtareas.json`. Si se interrumpe, omite las que ya tengan key. Acepta `--dry-run` para simular sin tocar Jira: corres primero el dry-run, y tras el "crear" de Jhans lo ejecutas sin `--dry-run`. El script no pide confirmacion por teclado (la compuerta es el "crear" del chat).

```python
import json
import os
import subprocess
import sys

CARPETA = os.path.dirname(os.path.abspath(__file__))
CREAR = os.path.join(CARPETA, "jira-crear_subtareas.json")
RESP = os.path.join(CARPETA, "jira-respuesta_subtareas.json")

URL = os.environ["JIRA_ACMEBANK_URL"].rstrip("/") + "/rest/api/2"
AUTH = os.environ["JIRA_ACMEBANK_EMAIL"] + ":" + os.environ["JIRA_ACMEBANK_TOKEN"]


def crear_una(fields):
    cuerpo = json.dumps({"fields": fields}, ensure_ascii=False)
    tmp = os.path.join(CARPETA, "_payload.json")
    with open(tmp, "w", encoding="utf-8") as archivo:
        archivo.write(cuerpo)
    salida = subprocess.run(
        ["curl.exe", "-sS", "--ssl-no-revoke", "-u", AUTH, "-X", "POST",
         URL + "/issue", "-H", "Content-Type: application/json",
         "--data-binary", "@" + tmp],
        capture_output=True, text=True).stdout
    os.remove(tmp)
    return json.loads(salida) if salida else {}


def main():
    datos = json.load(open(CREAR, encoding="utf-8"))
    hechas = {}
    if os.path.isfile(RESP):
        hechas = json.load(open(RESP, encoding="utf-8"))
    seco = "--dry-run" in sys.argv
    for sub in sorted(datos["subtareas"], key=lambda s: s["secuencia"]):
        clave_local = str(sub["secuencia"])
        if hechas.get(clave_local, {}).get("key"):
            continue
        if seco:
            print("[dry-run] creara:", sub["fields"]["summary"])
            continue
        respuesta = crear_una(sub["fields"])
        clave = respuesta.get("key")
        hechas[clave_local] = {"fase": sub.get("fase", ""), "key": clave or "",
                               "error": "" if clave else json.dumps(respuesta)}
        print(("OK " + clave) if clave else ("ERROR en " + sub["fields"]["summary"]))
    with open(RESP, "w", encoding="utf-8") as archivo:
        json.dump(hechas, archivo, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
```

Despues de ejecutarse: guarda las `key` y `url` en `subtareas[]` de `ticket-datos.json`, escribe la `key` en cada `jira-comentarios_*.json` y registra una linea en `jira-ejecuciones.log`.

## Cambio de estado

| Situacion | Estado destino | Antes, en `jira-comentarios` |
|---|---|---|
| "en espera de ..." | `Espera externa` | comentario con que se espera |
| "retome ..." | `En curso` | comentario opcional |
| correo atendido / "cerrada" | `FINALIZADO` | comentario de cierre con la captura |
| "descarta ..." | `FINALIZADO` | comentario con el motivo |

El script consulta las transiciones disponibles (`GET /issue/<key>/transitions`), busca la que lleva al estado destino y la aplica (`POST /issue/<key>/transitions`). Si no hay transicion directa (el flujo exige pasar antes por otro estado), avisa a Jhans para que lo mueva a mano. Nunca cambies el estado de la HU ni cierres sprints: solo subtareas.

## Corregir un issue ya creado (`/corrige`)

Para ajustar un issue que ya existe (tiene `key`), actualiza su `summary` (titulo) y/o `description` con el formato vigente, sin crear nada nuevo:

```python
# PUT /issue/<key> con {"fields": {"summary": "...", "description": "..."}}
# Lee el nuevo contenido de un archivo JSON y lo envia con curl.exe (como en el re-parent).
```

Aplica el formato vigente (sin titulo `DESCRIPCION`, `*COMO*`/`*QUIERO*`/`*PARA*` en negrita, rol sin nombres, DATOS con enlace de ServiceNow y correo). Si el `.eml` de asignacion no esta adjunto, adjuntalo. No toques los comentarios ya subidos.
