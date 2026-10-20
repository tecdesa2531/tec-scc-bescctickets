---
agent: agent
description: Corrige en Jira el titulo y la descripcion de issues ya creados de una atencion.
---

# Comando CORRIGE

Sigue `.github/copilot-instructions.md`. Actualiza en Jira los issues **ya creados** de la atencion (los que tienen `key` en `ticket-datos.json`: la HU en `jira.padre_key` y/o las `subtareas[]`).

- Si en la peticion viene un ID, trabaja sobre esa atencion; si no, preguntame cual.
- Regenera el **titulo** (`titulo_jira`, con el formato vigente) y la **descripcion** con el formato vigente: sin titulo `DESCRIPCION`, `*COMO*`/`*QUIERO*`/`*PARA*` en negrita, el rol de Jhans (nunca un nombre), y en DATOS el Tracking ID (como enlace si hay `url_servicenow`), Proyecto, Entorno y Solicitante. **No** pongas una linea de correo de asignacion en DATOS.
- Aplica el cambio con `PUT /issue/<key>` (campos `summary` y `description`). Corre primero un `--dry-run`/resumen y, tras mi **"crear"**, ejecutalo tu.
- Si la **captura** del correo de asignacion (o la de solicitud, si no hay asignacion) aun no esta adjunta al issue, subela y referenciala en la descripcion con `!archivo.png|thumbnail!`. **No** adjuntes el `.eml` de asignacion.
- **No** crees issues nuevos ni toques comentarios ya subidos.
