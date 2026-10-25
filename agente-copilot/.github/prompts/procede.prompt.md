---
agent: agent
description: Sube a Jira las atenciones con el conforme dado (subtareas y comentarios).
---

# Comando PROCEDE

Sigue `.github/copilot-instructions.md`. Esta es la etapa `pendiente_jira`.

- Si en la peticion viene un ID, trabaja solo sobre esa atencion.
- Si no viene ID, lee `003_Herramienta/agente-cola.json` y toma las atenciones con `accion: "pendiente_jira"`. Si son **5 o menos**, confirmame cuales vas a subir antes de empezar; si son **mas de 5**, listalas y procede. (Esto es aparte del "crear" de cada script.)

Antes de subir, **si el padre aun no existe en Jira (no se corrio `/inicia`), crealo primero**: la HU independiente o las subtareas semanales (revisa `jira.padre_key` y las `key` de `subtareas[]`). Esto **no** aplica a una interrupcion (ver abajo).

**Interrupcion (tipo `npl`):** nunca tiene padre propio. **No** le crees HU ni subtareas, y **no** la trates como atencion hija aunque tenga `padre_id`. Sube su unico comentario al destino que le corresponde (ver "Interrupciones" en `copilot-instructions.md` y el skill `jira-comentarios`), sin aplicar criterio de descarte. Al terminar **no** transiciones ninguna subtarea: el destino es compartido o pertenece a otra atencion.

Usa el texto corregido de `bitacora-correccion.json`. Entre las entradas `para_jira: true` aplica criterio: no subas todas, deja solo lo coherente.

- **Independiente** (skills `jira-historia-usuario`, `jira-subtareas`, `jira-comentarios`): analiza en orden la bitacora de la raiz **y la de sus hijos que ya tienen conforme** (salvo los hijos con `fase_independiente: true`, que tienen su propia subtarea), **propon las fases** (cuantas y en que orden) y espera mi aprobacion; luego crea las subtareas bajo la HU y reparte los comentarios de todos (razona si van agrupados o uno por subtarea). Los comentarios de cada hijo se registran en el `040_ProcesoJira` **del hijo**, con la `key` de la fase.
- **Semanal** (skills `jira-subtareas`, `jira-comentarios`): sube los comentarios de sus subtareas por entorno. Las subtareas de los hijos **no** las tocas aqui: cada hijo las sube en su propio `/procede`.
- **Atencion hija** (`padre_id` con valor): usa `hu_tipo_raiz` de la cola, no su propio `hu_tipo`. Con raiz **semanal**, se trata como una semanal (sus subtareas por entorno y sus comentarios). Con raiz **independiente**, reparte sus comentarios en las fases que ya tiene la raiz (si ninguna encaja, propon una fase nueva); si la raiz aun no tiene fases, avisame y espera al `/procede` de la raiz.
- **Hija marcada como fase independiente** (`fase_independiente: true`, raiz independiente): sube sus comentarios a **su propia subtarea** (la de `subtareas[]` del hijo), registrados en su `040_ProcesoJira`. Si aun no existe (se salto `/inicia`), creala antes bajo la HU de la raiz, dentro del mismo `--dry-run`/"crear"; si la raiz no tiene HU, avisame y salta esa hija.

Genera los scripts `.py` en `040_ProcesoJira`, corre primero un `--dry-run` y muestrame el resumen. Tras mi **"crear"**, ejecutalos tu en la terminal; guarda las `key` y `url` en `ticket-datos.json` y marca lo subido con `bitacora_id` y `subido: true` en los `jira-comentarios_*.json`. No subas nada a Jira sin mi "crear".

## Cierre de subtareas al terminar

Una vez subidos todos los comentarios de una atencion (incluido el comentario de cierre), **transiciona cada subtarea a `FINALIZADO`** (nunca en una interrupcion) usando el skill `jira-subtareas` (seccion "Cambio de estado"). El comentario de cierre debe quedar subido **antes** de cambiar el estado. Actualiza tambien el campo `estado` de cada entrada en `subtareas[]` de `ticket-datos.json` a `"FINALIZADO"`.

- **Semanal** (y todo hijo): cierra cada subtarea de entorno de esta atencion. Las de sus hijos las cierra el `/procede` de cada hijo.
- **Independiente**: cierra cada subtarea de fase (lo hace el `/procede` de la raiz, no el de un hijo).
- **Hija marcada como fase independiente**: su propio `/procede` cierra su subtarea; el de la raiz no la toca.
- Si una subtarea no tiene transicion directa a `FINALIZADO` desde su estado actual, avisame para moverla a mano; no la saltes.
- Si la subtarea ya esta en `FINALIZADO` (segunda vuelta de una atencion reabierta) y hay trabajo nuevo real, sigue la regla de reapertura del `copilot-instructions.md`.
