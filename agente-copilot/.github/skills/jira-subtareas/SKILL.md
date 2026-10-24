---
name: jira-subtareas
description: Crea las subtareas de Jira y cambia su estado (En curso, Espera externa, FINALIZADO). Semanal: una subtarea por entorno bajo la HU semanal, en /inicia. Independiente: las tareas secuenciales bajo la HU, en /procede. Usalo tambien al poner en espera, retomar, cerrar o descartar una subtarea.
---

# Subtareas de Jira

Sigue `.github/copilot-instructions.md`. Generas el script `.py` en `040_ProcesoJira` y **lo ejecutas tu** en la terminal. Solo biblioteca estandar y `curl.exe --ssl-no-revoke` via `subprocess`.

**Gate de ejecucion:**
- **Subtareas creadas en `/inicia`** (semanal, o hija de raiz semanal): directo, sin `--dry-run` ni "crear".
- **Todo lo demas** (`/procede`, cambios de estado, `/corrige`): primero `--dry-run` y, tras el "crear" de Jhans, la ejecucion real.

Los datos de Jira salen del destino del proyecto (`config-jira.json`). Si el proyecto tiene varios destinos, se repite por cada uno.

## Cuando se crean

- **Semanal** (en `/inicia`): una subtarea **por entorno** bajo la HU de la semana que corresponde por fecha (de `hu_semanales` de `config-jira.json`). Una atencion en PRE y PRO genera dos subtareas. Guardalas en `subtareas[]` de `ticket-datos.json` con `entorno`, `key`, `url`. Ejecuta directo, sin dry-run ni confirmacion. Si no hay en `hu_semanales` una HU que cubra la fecha, avisa y salta esa atencion (no crees HU semanales aqui).
- **Independiente** (en `/procede`): las tareas secuenciales aprobadas por Jhans, bajo `jira.padre_key` de la atencion. Una tarea puede abarcar varios entornos si comparten repositorio o flujo. Guardalas en `subtareas[]` con `secuencia`, `fase`, `entornos`, `key`, `url`.
- **Hija** (`padre_id` con valor): usa `hu_tipo_raiz` de la cola, no su propio `hu_tipo`.
  - Raiz **semanal** (en `/inicia`): se crea **como una semanal**: una subtarea por entorno bajo la HU de `hu_semanales` que cubre la fecha del hijo, titulo `PROYAA(ENT): <ID del hijo> - titulo` (si no tiene entornos propios, los de la raiz).
  - Raiz **independiente**: el hijo **no** tiene subtarea propia. Sus entradas se analizan junto con las de la raiz al proponer las fases de la HU (en el `/procede` de la raiz). Ver "Padre e hijos" en `copilot-instructions.md`.
- **Fase fija "Consultas y seguimiento"** (HU independiente, por una NPL): no es una fase propuesta desde la bitacora, es **fija** y se crea **perezosa**: la primera vez que una interrupcion (`padre_id` con `hu_tipo_raiz: "independiente"`) necesita subir su comentario en el `/procede` de esa NPL y la fase todavia no existe en `subtareas[]` de la raiz (buscala por `fase == "Consultas y seguimiento"`). Nunca se crea en `/inicia` ni junto con las demas fases propuestas; no pasa por la aprobacion de fases de Jhans (es fija, siempre la misma). Se crea con el mismo mecanismo de una tarea de HU independiente (`parent.key` = `jira.padre_key` de la raiz, `summary`: solo `"Consultas y seguimiento"`), dentro del mismo `--dry-run`/"crear" del `/procede` de la NPL. Guardala en `subtareas[]` de la raiz como cualquier otra fase (con la siguiente `secuencia` disponible). Las siguientes NPL de esa misma HU la reutilizan: no la vuelvas a crear. Si la raiz todavia no tiene HU (`jira.padre_key` vacio), no la crees: avisa y salta esa NPL. No la incluyas al proponer las fases de la raiz ni repartas ahi comentarios de la bitacora normal. Queda abierta mientras la HU este abierta: la cierra el `/procede` de la raiz junto con las demas fases, y en el cierre de sprint pasa a la Parte 02 como cualquier subtarea pendiente.

## Titulo

- **Semanal** (una por entorno): `PROYAA(PRE): PTSK0000123 - titulo` (sin parentesis si no hay entorno). En `/inicia` aun no existe `titulo_jira`; toma el `titulo` de `ticket-datos.json`, mejoralo levemente (ortografia, claridad) y usalo. No lo copies literal pero no lo reescribas desde cero. En `/procede`, actualiza (PUT `/issue/<key>`) el titulo a `titulo_jira` y la descripcion con lo que aporto `/limpia` (solicitante, correos, captura), porque en `/inicia` pudo quedar minima.
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
- **Solicitante** = quien pidio la atencion; su nombre sale del **correo de solicitud** (entrada tipo `solicitud`), **no** del de asignacion (ese es quien asigno, otra persona). Si no hay correo de solicitud, usa `solicitante` de `ticket-datos.json`; si tampoco hay, **omite la linea** (no preguntes).
- La **captura del correo de asignacion** va embebida en la descripcion: subela como adjunto (`POST /issue/<key>/attachments`) y referenciala con `!archivo.png|thumbnail!`. No se adjunta el `.eml` de asignacion. **Si no hay correo de asignacion**, usa la captura del **correo de solicitud** (`captura_correo_solicitud`); si no hay ninguno, **omite la seccion de captura**.
- **Sin correos** (lo normal en `JINT`, `JDOC`, `JCON`): redacta el COMO/QUIERO/PARA y el OBJETIVO breves a partir del `titulo`. Nunca te detengas por falta de correos, solicitante o capturas.
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
- En independiente, en `/procede`: si `jira.padre_key` no existe (se salto `/inicia`), crea primero la HU usando `titulo_jira` (siguiendo el skill `jira-historia-usuario`) y guarda la key antes de crear las tareas. Si ya existe, **actualiza primero la HU** (PUT `/issue/<padre_key>`) con `titulo_jira` y la `descripcion` corregida, antes de crear las tareas.
- En semanal, en `/procede`: si `subtareas[]` no tiene ninguna con `key` (se salto `/inicia`), crea primero las subtareas por entorno (como lo haria `/inicia`) usando `titulo_jira` en lugar del `titulo`, y guardalas antes de subir comentarios.

## Script de creacion (referencia)

Recorre `jira-crear_subtareas.json` en orden de `secuencia`, crea cada subtarea y guarda las keys en `jira-respuesta_subtareas.json`. Si se interrumpe, omite las que ya tengan key. Acepta `--dry-run` para simular sin tocar Jira: en `/procede` corres primero el dry-run, y tras el "crear" de Jhans lo ejecutas sin `--dry-run`; en `/inicia` lo ejecutas directo. El script nunca pide confirmacion por teclado.

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

El script consulta las transiciones disponibles (`GET /issue/<key>/transitions`), busca la que lleva al estado destino y la aplica (`POST /issue/<key>/transitions`). Si no hay transicion directa (el flujo exige pasar antes por otro estado), avisa a Jhans para que lo mueva a mano. Nunca cambies el estado de la HU ni cierres sprints: solo subtareas. El `/procede` de una interrupcion (NPL) **nunca** cambia el estado de ninguna subtarea.

**Subtarea reabierta.** Si en un `/procede` posterior la subtarea ya esta en `FINALIZADO` y la atencion se reabrio con **trabajo nuevo** (entradas nuevas por subir), reabrela antes de comentar: `FINALIZADO -> En curso`, sube los comentarios nuevos (`jira-comentarios`) y vuelve a cerrarla (`En curso -> FINALIZADO`). Si lo nuevo es solo evidencia o una aclaracion, comenta sin reabrir.

## Corregir un issue ya creado (`/corrige`)

Para ajustar un issue que ya existe (tiene `key`), actualiza su `summary` (titulo) y/o `description` con el formato vigente, sin crear nada nuevo:

```python
# PUT /issue/<key> con {"fields": {"summary": "...", "description": "..."}}
# Lee el nuevo contenido de un archivo JSON y lo envia con curl.exe
# (mismo patron que el script de cambio de padre del skill sprint-cierre).
```

Aplica el formato vigente (sin titulo `DESCRIPCION`, `*COMO*`/`*QUIERO*`/`*PARA*` en negrita, rol sin nombres, DATOS con Tracking ID como enlace si hay `url_servicenow`, Proyecto, Entorno y Solicitante; **sin** linea de correo de asignacion). Si la **captura** del correo de asignacion (o la de solicitud) no esta adjunta, subela y referenciala con `!archivo.png|thumbnail!`; **no** adjuntes el `.eml` de asignacion. No toques los comentarios ya subidos.
