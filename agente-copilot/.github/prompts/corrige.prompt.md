---
agent: atencion-tickets
description: Corrige en Jira el titulo y la descripcion de issues ya creados de una atencion.
---

# Comando CORRIGE

Sigue `.github/copilot-instructions.md`. Actualiza en Jira los issues **ya creados** de la atencion (los que tienen `key` en `ticket-datos.json`: la HU en `jira.padre_key` y/o las `subtareas[]`).

- Siempre necesitas un ID (este comando no usa la cola): si viene, trabaja sobre esa atencion; si no, preguntame cual. Ubica su carpeta como indica "Atenciones que no estan en la cola" de `copilot-instructions.md`.
- Corrige cada issue **segun su tipo** (ver "Formato del titulo del issue" en `copilot-instructions.md`):
  - **HU independiente** y **subtarea semanal** (incluida la de un hijo de raiz semanal): titulo completo con `titulo_jira` (`PROYAA(ENT): ID - titulo_jira`) y descripcion con el formato vigente: sin titulo `DESCRIPCION`, `*COMO*`/`*QUIERO*`/`*PARA*` en negrita, el rol de Jhans (nunca un nombre), y en DATOS el Tracking ID (como enlace si hay `url_servicenow`), Proyecto, Entorno y Solicitante. **No** pongas una linea de correo de asignacion en DATOS.
  - **Fase de una HU independiente**: **no** cambies su titulo (es solo el nombre de la fase) salvo que yo lo pida; su descripcion es la de tarea (OBJETIVO, DEPENDENCIA, CRITERIOS DE ACEPTACION), sin COMO/QUIERO/PARA ni DATOS.
  - **Subtarea de un hijo con fase independiente**: titulo = su `titulo_jira` a secas; descripcion de tarea.
- Aplica el cambio con `PUT /issue/<key>` (campos `summary` y `description`). Corre primero un `--dry-run`/resumen y, tras mi **"crear"**, ejecutalo tu.
- En la HU independiente y la subtarea semanal: si la **captura** del correo de asignacion (o la de solicitud, si no hay asignacion) aun no esta adjunta al issue, subela y referenciala en la descripcion con su nombre real (`!AAAAMMDD_captura_correo_asignado.png|thumbnail!`). Las fases no llevan captura. **No** adjuntes el `.eml` de asignacion.
- **No** crees issues nuevos ni toques comentarios ya subidos.
