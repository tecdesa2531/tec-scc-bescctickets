---
agent: agent
description: Sube a Jira las atenciones con el conforme dado (subtareas y comentarios).
---

# Comando PROCEDE

Sigue `.github/copilot-instructions.md`. Esta es la etapa `pendiente_jira`.

- Si en la peticion viene un ID, trabaja solo sobre esa atencion.
- Si no viene ID, lee `003_Herramienta/agente-cola.json` y toma las atenciones con `accion: "pendiente_jira"`. Si son **5 o menos**, confirmame cuales vas a subir antes de empezar; si son **mas de 5**, listalas y procede. (Esto es aparte del "crear" de cada script.)

Antes de subir, **si el padre aun no existe en Jira (no se corrio `/inicia`), crealo primero**: la HU independiente o las subtareas semanales (revisa `jira.padre_key` y las `key` de `subtareas[]`).

Usa el texto corregido de `bitacora-correccion.json`. Entre las entradas `para_jira: true` aplica criterio: no subas todas, deja solo lo coherente.

- **Independiente** (skills `jira-historia-usuario`, `jira-subtareas`, `jira-comentarios`): analiza la bitacora en orden, **propon las fases** y espera mi aprobacion; luego crea las subtareas bajo la HU y reparte los comentarios (razona si van agrupados o uno por subtarea).
- **Semanal** (skills `jira-subtareas`, `jira-comentarios`): sube los comentarios de la subtarea; si la atencion tiene hijos, crea una subtarea por hijo bajo la HU de la semana que corresponde.

Genera los scripts `.py` en `040_ProcesoJira`, corre primero un `--dry-run` y muestrame el resumen. Tras mi **"crear"**, ejecutalos tu en la terminal; guarda las `key` y `url` en `ticket-datos.json` y marca lo subido con `bitacora_id` y `subido: true` en los `jira-comentarios_*.json`. No subas nada a Jira sin mi "crear".

## Cierre de subtareas al terminar

Una vez subidos todos los comentarios de una atencion (incluido el comentario de cierre), **transiciona cada subtarea a `FINALIZADO`** usando el skill `jira-subtareas` (seccion "Cambio de estado"). El comentario de cierre debe quedar subido **antes** de cambiar el estado. Actualiza tambien el campo `estado` de cada entrada en `subtareas[]` de `ticket-datos.json` a `"FINALIZADO"`.

- **Semanal**: cierra cada subtarea de entorno (y las de hijos si los hay).
- **Independiente**: cierra cada subtarea de fase.
- Si una subtarea no tiene transicion directa a `FINALIZADO` desde su estado actual, avisame para moverla a mano; no la saltes.
- Si la subtarea ya esta en `FINALIZADO` (segunda vuelta de una atencion reabierta) y hay trabajo nuevo real, sigue la regla de reapertura del `copilot-instructions.md`.
