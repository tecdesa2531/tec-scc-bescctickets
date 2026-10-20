---
name: jira-comentarios
description: Parte de /procede. Convierte las entradas corregidas de la bitacora en comentarios de las subtareas de Jira, aplicando criterio de seleccion. Mantiene un JSON de comentarios por subtarea con el bitacora_id de cada entrada y un script que sube solo los pendientes. Admite varias capturas por comentario.
---

# Comentarios de Jira (`/procede`)

Sigue `.github/copilot-instructions.md`. Generas el script `.py` en `040_ProcesoJira` y **lo ejecutas tu** en la terminal tras la confirmacion "crear" de Jhans. Solo biblioteca estandar y `curl.exe --ssl-no-revoke` via `subprocess`.

## 1. Fuente del texto

Usa el **texto corregido** de `040_ProcesoJira/bitacora-correccion.json` (por `bitacora_id`); si una entrada no tiene correccion, usa su texto original de `bitacora.json`. Las capturas, correos y adjuntos salen de la entrada de `bitacora.json`.

## 2. Seleccion con criterio

Solo entran las entradas con `para_jira: true` que aun no figuran como subidas. **No subas todas:** aplica criterio, descarta lo incoherente o redundante y deja lo que tiene sentido como comentario de Jira. Puedes **agrupar** varias entradas en un comentario o dejar uno por entrada; razona segun el caso.

## 3. A que subtarea va cada comentario

- **Independiente:** reparte cada comentario en la **tarea (fase)** que le corresponde segun lo que describe la entrada. Incluye las entradas de los **hijos** con conforme (raiz independiente): van a las fases de la HU de la raiz.
- **Semanal** (y todo hijo de raiz semanal): el comentario va a la subtarea del **entorno** correspondiente; si la entrada aplica a varios entornos, repitelo en cada subtarea de esos entornos.

**Comentarios de un hijo de raiz independiente:** registralos en un `jira-comentarios_<fase>.json` dentro del `040_ProcesoJira` **del propio hijo** (no en el de la raiz), con la `key` de la fase de la raiz. La herramienta solo marca como enviada una entrada si la encuentra en la carpeta de esa misma atencion; si la registras en la carpeta de la raiz, el hijo quedara con pendientes para siempre.

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
- `texto` en espanol con tildes, en formato wiki de Jira si hace falta (`*negrita*`, `* vineta`, `\n`).
- `capturas`: puede haber **varias** por comentario. `raiz` es `trabajo` o `proceso`; `ruta` es relativa a la carpeta de la atencion en esa raiz. Las de avance estan en la raiz de trabajo (`030_ProcesoAtencion`); las de correo en la raiz de proceso (`040_ProcesoJira`). Se suben como adjunto y se referencian con `!archivo|thumbnail!`.
- `adjuntos`: archivos que se adjuntan al issue **sin** embeberlos como imagen (p. ej. un `.eml`). Mismo formato `{raiz, ruta}`.
- **Comentario final (cierre/entrega):** es donde se dice que se entregaron los datos solicitados. Lleva la **captura del correo de cierre** (en `capturas`) **y el `.eml` del correo de cierre** (en `adjuntos`, desde la raiz de trabajo).
- Nunca modifiques comentarios con `subido: true`.

## 5. Script de subida (referencia)

Sube solo los comentarios con `subido: false`, adjunta sus capturas y marca en el mismo JSON cuales subieron. Lee los nombres de las variables de entorno del destino desde `config-jira.json`.

```python
import json
import os
import subprocess

CARPETA = os.path.dirname(os.path.abspath(__file__))
ARCHIVO = os.path.join(CARPETA, "jira-comentarios_fase1.json")
# Raices de las capturas (de agente-cola.json). Ajusta al generar el script.
RAIZ_TRABAJO = r"<raiz_trabajo>\<relativa>"
RAIZ_PROCESO = r"<raiz_proceso>\<relativa>"

URL = os.environ["JIRA_ACMEBANK_URL"].rstrip("/") + "/rest/api/2"
AUTH = os.environ["JIRA_ACMEBANK_EMAIL"] + ":" + os.environ["JIRA_ACMEBANK_TOKEN"]


def ruta_captura(captura):
    base = RAIZ_TRABAJO if captura["raiz"] == "trabajo" else RAIZ_PROCESO
    return os.path.join(base, captura["ruta"].replace("/", os.sep))


def subir(datos):
    clave = datos.get("key")
    if not clave:
        print("La subtarea aun no esta creada")
        return
    for com in datos["comentarios"]:
        if com.get("subido"):
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
    with open(ARCHIVO, "w", encoding="utf-8") as archivo:
        json.dump(datos, archivo, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    subir(json.load(open(ARCHIVO, encoding="utf-8")))
```

## 6. Despues de subir

Confirma en el JSON cuales quedaron `subido: true`. La herramienta ya los mostrara como enviados y bloqueara esas entradas. Registra una linea en `jira-ejecuciones.log`. Si un comentario quedo con `error`, muestraselo a Jhans; si hay que corregir el texto, corrigelo y vacia `error` para reintentar.
