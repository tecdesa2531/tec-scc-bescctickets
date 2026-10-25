---
name: jira-comentarios
description: Parte de /procede. Convierte las entradas corregidas de la bitacora en comentarios de las subtareas de Jira, aplicando criterio de seleccion. Mantiene un JSON de comentarios por subtarea con el bitacora_id de cada entrada y un script que sube solo los pendientes. Admite varias capturas por comentario.
---

# Comentarios de Jira (`/procede`)

Sigue `.github/copilot-instructions.md`. Generas el script `.py` en `040_ProcesoJira` y **lo ejecutas tu** en la terminal tras la confirmacion "crear" de Jhans. Solo biblioteca estandar y `curl.exe --ssl-no-revoke` via `subprocess`.

## 1. Fuente del texto

Usa el **texto corregido** de `040_ProcesoJira/bitacora-correccion.json` (campo `texto`, por `bitacora_id`; en el formato antiguo el valor es el texto directo); si una entrada no tiene correccion, usa su texto original de `bitacora.json`. Si la correccion esta vencida (la entrada se edito en o despues de su `corregido`, ver skill `correo-procesar`), no la subas: avisa a Jhans que corra `/limpia` antes. Las capturas, correos y adjuntos salen de la entrada de `bitacora.json`.

## 2. Seleccion con criterio

Solo entran las entradas con `para_jira: true` que aun no figuran como subidas. **No subas todas:** aplica criterio, descarta lo incoherente o redundante y deja lo que tiene sentido como comentario de Jira. Puedes **agrupar** varias entradas en un comentario o dejar uno por entrada; razona segun el caso.

## 3. A que subtarea va cada comentario

- **Independiente:** reparte cada comentario en la **tarea (fase)** que le corresponde segun lo que describe la entrada. Incluye las entradas de los **hijos** con conforme (raiz independiente): van a las fases de la HU de la raiz, salvo los hijos con `fase_independiente: true`, que comentan en su propia subtarea. Si la fase destino ya esta en `FINALIZADO`, aplica la regla de reapertura de `jira-subtareas`.
- **Semanal** (y todo hijo de raiz semanal): el comentario va a la subtarea **vigente** del **entorno** correspondiente (la que no esta en `FINALIZADO`; tras un cierre de sprint, la Parte 02); si la entrada aplica a varios entornos, repitelo en cada subtarea de esos entornos.

**Comentarios de un hijo de raiz independiente:** registralos en un `jira-comentarios_<fase>.json` dentro del `040_ProcesoJira` **del propio hijo** (no en el de la raiz), con la `key` de la fase de la raiz. La herramienta solo marca como enviada una entrada si la encuentra en la carpeta de esa misma atencion; si la registras en la carpeta de la raiz, el hijo quedara con pendientes para siempre.

**Interrupcion (tipo `npl`).** No pasa por `/limpia` ni por el conforme: su resumen se corrige aqui, antes del `--dry-run`.

1. **Corrige el resumen:** toma `npl.resumen` de `ticket-datos.json`, corrige redaccion y ortografia sin cambiar el sentido, y guardalo en `bitacora-correccion.json` con el `bitacora_id` de su unica entrada (tipo `interrupcion`) y la fecha `corregido` (ver `correo-procesar`, seccion 3). Si ya hay una correccion vigente, usala. **Nunca** modifiques `npl.resumen` ni ningun otro campo de `npl`. Las notas (`texto` de la entrada) no se corrigen ni se suben.
2. **Arma el comentario:** el texto es el resumen corregido, convertido de Markdown a formato wiki (ver "De Markdown a formato wiki de Jira" en `copilot-instructions.md`); antepon una linea de contexto, p. ej. `*Llamada Teams con Maria:*` o `*Chat Teams con Maria:*` segun `npl.tipo_contacto` y `npl.quien`. El `--dry-run` muestra este texto final: es la revision de Jhans antes del "crear".

Segun su `padre_id` y `hu_tipo_raiz` (ver "Interrupciones" en `copilot-instructions.md`):

- **Sin padre:** va a la subtarea fija de interrupciones (`subtarea_interrupciones_key` del `hu_semanales` que cubre la fecha de la NPL: su `creado`, con sabado o domingo como el viernes anterior; si falta la key, creala primero, ver `jira-historia-usuario`).
- **Con padre y raiz independiente:** va a la fase fija "Consultas y seguimiento" de esa HU (creala primero si falta; ver `jira-subtareas`). Si despues del comentario todas las demas fases de la raiz ya estan en `FINALIZADO`, pasa "Consultas y seguimiento" a `FINALIZADO` (unica transicion del `/procede` de una NPL).
- **Con padre y raiz semanal:** va directo a las subtareas propias del padre; si tiene una por entorno (p. ej. PRE y PRO), repite el comentario en **cada una**, igual que una entrada que aplica a varios entornos. No crea nada.

Registra el comentario en el `040_ProcesoJira` **de la propia NPL** (nunca en la carpeta del padre ni de la subtarea fija), un archivo por destino: `jira-comentarios_interrupcion.json` cuando hay un solo destino, o `jira-comentarios_interrupcion_<entorno>.json` (uno por cada subtarea de entorno del padre), cada uno con la `key` de su destino y el mismo `bitacora_id`. Las capturas y archivos pegados durante la llamada van como `capturas`/`adjuntos` igual que en cualquier otro comentario. Una NPL normalmente no tiene correos; si su entrada trae un `.eml` (en `correos[]`), va en `adjuntos`. Si hay `npl.ticket_relacionado` (solo cuando no hay padre), mencionalo en una linea del comentario como referencia.

El comentario de una NPL **siempre se sube**: no aplica el criterio de seleccion de la seccion 2. Si el destino aun no existe en Jira (padre semanal sin subtarea, raiz independiente sin HU, o semana sin HU semanal), avisa y salta esa NPL.

## 4. Archivo por subtarea

Uno por subtarea en `040_ProcesoJira`, con la `key` de su subtarea. Nombre segun la fase o el entorno (`jira-comentarios_<fase>.json`, `jira-comentarios_<entorno>.json`):

```json
{
  "key": "PRYA-1002",
  "omitidos": ["e20261018163626abc"],
  "comentarios": [
    {
      "n": 1,
      "fecha": "2026-10-18 10:30",
      "texto": "Se exportaron las tablas 009 y 010.",
      "bitacora_ids": ["e20261018163626..."],
      "capturas": [
        { "raiz": "trabajo", "ruta": "030_ProcesoAtencion/20261018_163626_captura.png" }
      ],
      "adjuntos": [],
      "subido": false,
      "jira_id": "",
      "error": ""
    }
  ]
}
```

- `omitidos`: lista de `bitacora_id` de entradas que revisaste y decidiste **no subir** (por criterio: redundantes, incoherentes o ya cubiertas por otra entrada). La herramienta las deja de contar como pendientes. Si no hay ninguna omitida, omite el campo o deja `[]`.
- `bitacora_ids`: lista de los `id` de las entradas que resume ese comentario (asi la herramienta marca esas entradas como enviadas y las bloquea).
- `texto` en espanol con tildes y **en formato wiki de Jira**: la bitacora y su correccion estan en Markdown, asi que conviertelo al escribir este campo (`**negrita**` -> `*negrita*`, `[texto](https://...)` -> `[texto|https://...]`, `` `codigo` `` -> `{{codigo}}`, `- vineta` -> `* vineta`; tabla completa en "De Markdown a formato wiki de Jira" de `copilot-instructions.md`). Saltos de linea como `\n`.
- `capturas`: puede haber **varias** por comentario. `raiz` es `trabajo` o `proceso`; `ruta` es relativa a la carpeta de la atencion en esa raiz. Las de avance estan en la raiz de trabajo (`030_ProcesoAtencion`); las de correo en la raiz de proceso (`040_ProcesoJira`). Se suben como adjunto y se referencian con `!archivo|thumbnail!`.
- `adjuntos`: archivos que se adjuntan al issue **sin** embeberlos como imagen (p. ej. un `.eml`). Mismo formato `{raiz, ruta}`.
- **Comentario final (cierre/entrega):** es donde se dice que se entregaron los datos solicitados. Lleva la **captura del correo de cierre** (en `capturas`: la `040_ProcesoJira/AAAAMMDD_captura_correo_atendido.<ext>` de la entrada `cierre`, raiz `proceso`) **y el `.eml` del correo de cierre** (en `adjuntos`, raiz `trabajo`, con el nombre de `correos[].archivo`).
- Nunca modifiques comentarios con `subido: true`.

## 5. Script de subida (referencia)

Sube solo los comentarios con `subido: false`, adjunta sus capturas y marca en el mismo JSON cuales subieron. Con `--dry-run` solo muestra cada comentario y sus adjuntos, sin llamar a Jira ni tocar el JSON. Los nombres de las variables de entorno son de ejemplo: al generar el script, pon los de `url_var`, `email_var` y `token_var` del destino en `config-jira.json`.

```python
import json
import os
import subprocess
import sys

CARPETA = os.path.dirname(os.path.abspath(__file__))
ARCHIVO = os.path.join(CARPETA, "jira-comentarios_fase1.json")
# Raices de las capturas (de agente-cola.json). Ajusta al generar el script.
RAIZ_TRABAJO = r"<raiz_trabajo>\<relativa>"
RAIZ_PROCESO = r"<raiz_proceso>\<relativa>"

# Nombres de ejemplo: usa los del destino (url_var, email_var, token_var)
URL = os.environ["JIRA_ACMEBANK_URL"].rstrip("/") + "/rest/api/2"
AUTH = os.environ["JIRA_ACMEBANK_EMAIL"] + ":" + os.environ["JIRA_ACMEBANK_TOKEN"]


def ruta_captura(captura):
    base = RAIZ_TRABAJO if captura["raiz"] == "trabajo" else RAIZ_PROCESO
    return os.path.join(base, captura["ruta"].replace("/", os.sep))


def mostrar(clave, com):
    print("[dry-run] comentario " + str(com.get("n", "")) + " en " + clave + ":")
    print(com["texto"])
    for archivo in com.get("capturas", []) + com.get("adjuntos", []):
        ruta = ruta_captura(archivo)
        print("  adjunto: " + ruta + ("" if os.path.isfile(ruta) else " (NO EXISTE)"))


def subir(datos, seco):
    clave = datos.get("key")
    if not clave:
        print("La subtarea aun no esta creada")
        return
    for com in datos["comentarios"]:
        if com.get("subido"):
            continue
        if seco:
            mostrar(clave, com)
            continue
        texto = com["texto"]
        for captura in com.get("capturas", []):
            ruta = ruta_captura(captura)
            if os.path.isfile(ruta):
                subprocess.run(
                    ["curl.exe", "-sS", "--ssl-no-revoke", "-u", AUTH, "-X", "POST",
                     URL + "/issue/" + clave + "/attachments",
                     "-H", "X-Atlassian-Token: no-check", "-F", "file=@" + ruta],
                    capture_output=True, text=True)
                texto += "\n\n!" + os.path.basename(ruta) + "|thumbnail!"
        for adjunto in com.get("adjuntos", []):
            ruta = ruta_captura(adjunto)
            if os.path.isfile(ruta):
                subprocess.run(
                    ["curl.exe", "-sS", "--ssl-no-revoke", "-u", AUTH, "-X", "POST",
                     URL + "/issue/" + clave + "/attachments",
                     "-H", "X-Atlassian-Token: no-check", "-F", "file=@" + ruta],
                    capture_output=True, text=True)
        tmp = os.path.join(CARPETA, "_comentario.json")
        with open(tmp, "w", encoding="utf-8") as archivo:
            json.dump({"body": texto}, archivo, ensure_ascii=False)
        salida = subprocess.run(
            ["curl.exe", "-sS", "--ssl-no-revoke", "-u", AUTH, "-X", "POST",
             URL + "/issue/" + clave + "/comment", "-H", "Content-Type: application/json",
             "--data-binary", "@" + tmp],
            capture_output=True, text=True).stdout
        os.remove(tmp)
        respuesta = json.loads(salida) if salida else {}
        if respuesta.get("id"):
            com["subido"] = True
            com["jira_id"] = respuesta["id"]
            com["error"] = ""
        else:
            com["error"] = salida
    if seco:
        return
    with open(ARCHIVO, "w", encoding="utf-8") as archivo:
        json.dump(datos, archivo, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    subir(json.load(open(ARCHIVO, encoding="utf-8")), "--dry-run" in sys.argv)
```

## 6. Despues de subir

Confirma en el JSON cuales quedaron `subido: true`. La herramienta ya los mostrara como enviados y bloqueara esas entradas. Registra una linea en `jira-ejecuciones.log`. Si un comentario quedo con `error`, muestraselo a Jhans; si hay que corregir el texto, corrigelo y vacia `error` para reintentar.
