---
agent: atencion-tickets
description: Sube a Jira las atenciones con el conforme dado y las interrupciones cerradas (subtareas y comentarios).
---

# Comando PROCEDE

Sigue `.github/copilot-instructions.md`. Esta es la etapa `pendiente_jira`.

- Si en la peticion viene un ID, trabaja solo sobre esa atencion, y solo si la cola la trae como `pendiente_jira`; si no, avisame y no subas nada.
- Si no viene ID, lee `003_Herramienta/agente-cola.json` y toma las atenciones con `accion: "pendiente_jira"`. Si son **5 o menos**, confirmame cuales vas a subir antes de empezar; si son **mas de 5**, listalas y procede. (Esto es aparte del "crear" de cada script.)

Antes de subir, **si el padre aun no existe en Jira (no se corrio `/inicia`), crealo primero**: la HU independiente o las subtareas semanales (revisa `jira.padre_key` y las `key` de `subtareas[]`), con `titulo_jira`. **Si ya existe**, actualiza primero su titulo a `titulo_jira` y rearma su descripcion de Jira (formato wiki, "Formato de la descripcion del issue") con lo que aporto `/limpia`; nunca copies la `descripcion` de la herramienta. Nada de esto aplica a una interrupcion (ver abajo) ni a una hija normal de raiz independiente: su padre es la HU de la raiz, nunca le crees uno propio.

**Interrupcion (tipo `npl`):** nunca tiene padre propio y no pasa por `/limpia` ni por el conforme. **No** le crees HU ni subtareas, y **no** la trates como atencion hija aunque tenga `padre_id`. Antes del `--dry-run`, corrige su `npl.resumen` y guardalo en `bitacora-correccion.json` (nunca modifiques `npl` en `ticket-datos.json`); el dry-run me muestra el texto final. Sube su unico comentario al destino que le corresponde (ver "Interrupciones" en `copilot-instructions.md` y el skill `jira-comentarios`), sin aplicar criterio de descarte. Al terminar **no** transiciones subtareas (el destino es compartido o pertenece a otra atencion), salvo cerrar "Consultas y seguimiento" si todas las demas fases de la raiz ya estan en `FINALIZADO`.

Usa el texto corregido de `bitacora-correccion.json`. Entre las entradas `para_jira: true` aplica criterio: no subas todas, deja solo lo coherente.

- **Independiente** (skills `jira-historia-usuario`, `jira-subtareas`, `jira-comentarios`): analiza en orden la bitacora de la raiz **y la de sus hijos que ya tienen conforme** (salvo los hijos con `fase_independiente: true`, que tienen su propia subtarea), **propon las fases** (cuantas y en que orden) y espera mi aprobacion; luego crea las subtareas bajo la HU y reparte los comentarios de todos (razona si van agrupados o uno por subtarea). Los comentarios de cada hijo se registran en el `040_ProcesoJira` **del hijo**, con la `key` de la fase.
- **Semanal** (skills `jira-subtareas`, `jira-comentarios`): sube los comentarios de sus subtareas por entorno. Las subtareas de los hijos **no** las tocas aqui: cada hijo las sube en su propio `/procede`.
- **Atencion hija** (`padre_id` con valor): usa `hu_tipo_raiz` de la cola, no su propio `hu_tipo`. Con raiz **semanal**, se trata como una semanal (sus subtareas por entorno y sus comentarios). Con raiz **independiente** (salvo fase independiente, ver abajo), reparte sus comentarios en las fases que ya tiene la raiz (si ninguna encaja, propon una fase nueva); si la raiz aun no tiene HU o fases, avisame y espera al `/procede` de la raiz. Si la fase ya esta en `FINALIZADO`, aplica la regla de reapertura: con trabajo nuevo real la reabres, comentas y la vuelves a cerrar; si es solo evidencia, comentas sin reabrir.
- **Hija marcada como fase independiente** (`fase_independiente: true`, raiz independiente): actualiza el titulo de **su propia subtarea** (la de `subtareas[]` del hijo) a su `titulo_jira` (solo el titulo, sin proyecto ni ID) y sube ahi sus comentarios, registrados en su `040_ProcesoJira`. Si aun no existe (se salto `/inicia`), creala antes bajo la HU de la raiz, dentro del mismo `--dry-run`/"crear"; si la raiz no tiene HU, avisame y salta esa hija.

Genera los scripts `.py` en `040_ProcesoJira`, corre primero un `--dry-run` y muestrame el resumen. Tras mi **"crear"**, ejecutalos tu en la terminal; guarda las `key` y `url` en `ticket-datos.json` y marca lo subido con `bitacora_id` y `subido: true` en los `jira-comentarios_*.json`. No subas nada a Jira sin mi "crear".

## Cierre de subtareas al terminar

Una vez subidos todos los comentarios de una atencion (incluido el comentario de cierre), **transiciona cada subtarea a `FINALIZADO`** (en una interrupcion, solo el caso de "Consultas y seguimiento" de arriba) usando el skill `jira-subtareas` (seccion "Cambio de estado"). El comentario de cierre debe quedar subido **antes** de cambiar el estado. Actualiza tambien el campo `estado` de cada entrada en `subtareas[]` de `ticket-datos.json` a `"FINALIZADO"`.

- **Semanal** (y todo hijo de raiz semanal): cierra cada subtarea de entorno vigente de esta atencion (la que no esta en `FINALIZADO`). Las de sus hijos las cierra el `/procede` de cada hijo.
- **Independiente**: cierra cada subtarea de fase (lo hace el `/procede` de la raiz, no el de un hijo).
- **Hija marcada como fase independiente**: su propio `/procede` cierra su subtarea; el de la raiz no la toca.
- Si una subtarea no tiene transicion directa a `FINALIZADO` desde su estado actual, avisame para moverla a mano; no la saltes.
- Si la subtarea ya esta en `FINALIZADO` (segunda vuelta de una atencion reabierta) y hay trabajo nuevo real, sigue la regla de reapertura del `copilot-instructions.md`.
