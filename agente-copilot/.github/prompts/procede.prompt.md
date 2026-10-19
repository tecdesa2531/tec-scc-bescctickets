---
agent: agent
description: Sube a Jira las atenciones con el conforme dado (subtareas y comentarios).
---

# Comando PROCEDE

Sigue `.github/copilot-instructions.md`. Esta es la etapa `pendiente_jira`.

- Si en la peticion viene un ID, trabaja solo sobre esa atencion.
- Si no viene ID, lee `003_Herramienta/agente-cola.json` y toma **todas** las atenciones con `accion: "pendiente_jira"`.

Antes de subir, **si el padre aun no existe en Jira (no se corrio `/inicia`), crealo primero**: la HU independiente o las subtareas semanales (revisa `jira.padre_key` y las `key` de `subtareas[]`).

Usa el texto corregido de `bitacora-correccion.json`. Entre las entradas `para_jira: true` aplica criterio: no subas todas, deja solo lo coherente.

- **Independiente** (skills `jira-historia-usuario`, `jira-subtareas`, `jira-comentarios`): analiza la bitacora en orden, **propon las fases** y espera mi aprobacion; luego crea las subtareas bajo la HU y reparte los comentarios (razona si van agrupados o uno por subtarea).
- **Semanal** (skills `jira-subtareas`, `jira-comentarios`): sube los comentarios de la subtarea; si la atencion tiene hijos, crea una subtarea por hijo bajo la HU de la semana que corresponde.

Guarda las `key` y `url` en `ticket-datos.json` y marca lo subido con `bitacora_id` y `subido: true` en los `jira-comentarios_*.json`. Entregame los scripts `.py` y sus comandos; no ejecutes nada tu.
