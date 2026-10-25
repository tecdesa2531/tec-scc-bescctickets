# Atención de tickets de infraestructura multiproyecto

Asistes a Jhans (infraestructura/DevOps) a registrar sus atenciones en Jira. Él trabaja con la herramienta local **Focus Flow** (organizador de atenciones): ella organiza las carpetas, guarda los correos y las capturas, y lleva la bitácora de cada atención. Tú **no** organizas nada de eso; partes de lo que la herramienta ya dejó y preparas la información para Jira.

Los nombres de proyectos, claves de Jira y rutas que aparecen aquí son ejemplos ficticios. Los valores reales viven en `config-jira.json` y en las carpetas de datos, fuera del repositorio.

## Cómo ves los datos

VS Code abre un workspace con esta carpeta (`agente-copilot`) y las dos raíces de datos:

- **Raíz de trabajo**: correos `.eml`, adjuntos y capturas de avance.
- **Raíz de proceso** (privada): `ticket-datos.json`, `bitacora.json`, la carpeta `040_ProcesoJira/` de cada atención y la carpeta `003_Herramienta/`.

**No recorras las carpetas para buscar atenciones.** Lee `003_Herramienta/agente-cola.json` en la raíz de proceso: la herramienta lo mantiene con las atenciones pendientes, la acción que te toca en cada una y su ruta. También trae las rutas absolutas de ambas raíces.

```json
{
  "actualizado": "2026-10-18 18:45",
  "raiz_trabajo": "...",
  "raiz_proceso": "...",
  "atenciones": [
    {
      "id": "a20261018184545fdde",
      "tracking_id": "JINT0000000001",
      "tracking_code": "INFRAS",
      "tipo": "int",
      "hu_tipo": "independiente",
      "padre_id": "",
      "raiz_id": "a20261018184545fdde",
      "hu_tipo_raiz": "independiente",
      "fase_independiente": false,
      "relativa": "010_Infras/010_Dev/001_JINT0000000001",
      "accion": "pendiente_inicio"
    }
  ]
}
```

La carpeta de una atención es `<raiz>/<relativa>` en cada raíz. Los correos y capturas de avance están en la raíz de trabajo; `ticket-datos.json`, `bitacora.json` y `040_ProcesoJira/` en la raíz de proceso.

El `config-jira.json` con los valores reales vive en la **raíz de proceso** (no en el repositorio); el que está en `agente-copilot/config-jira.json` es solo una plantilla de ejemplo.

## Quién escribe qué

| Archivo | Lo escribe | Tú |
|---|---|---|
| `ticket-datos.json` (datos base, estado, `correos[]`, `listo_para_limpieza`, `listo_para_jira`) | Herramienta | Lees; completas `correos[].resumen`, `descripcion`, `titulo_jira`, el objeto `jira` y las `subtareas[]` |
| `bitacora.json` | Herramienta | **Solo lees. Nunca modificas el texto original.** |
| `003_Herramienta/agente-cola.json` | Herramienta | Solo lees |
| `040_ProcesoJira/bitacora-correccion.json` | Tú | Texto corregido de la bitácora |
| `040_ProcesoJira/jira-*.json` | Tú | Payloads, respuestas y comentarios de Jira |

La herramienta nunca pisa tus campos. Tú nunca tocas los de ella ni el contenido de `030_ProcesoAtencion`.

## Conceptos

- **Tracking Code**: código del proyecto, 6 letras (por ejemplo `INFRAS`, `DOCINF`, `PROYAA`). Va en mayúsculas en Jira.
- **Tracking ID**: identificador de la atención. Para tickets es el número de ServiceNow (`PTSK0000123`); para los tipos propios es un código correlativo (`JINT0000000001`, `JDOC...`, `JCON...`). Ocupa el lugar del Tracking ID, así lo tratas como cualquier atención.
- **Tipos** (`tipo` en `ticket-datos.json`): `ticket`, `int` (iniciativa interna, proyecto `INFRAS`), `doc` (documentación, `DOCINF`), `con` (consulta o reunión), `npl` (interrupción: llamada o chat de Teams sin agendar; ver "Interrupciones" más abajo).
- **HU semanal**: una historia de usuario por semana (lunes a viernes) para los tickets de poca complejidad. Las del sprint activo están en `hu_semanales` de `config-jira.json`, cada una con su rango (`inicio`, `fin`) y su `key`. Cada atención semanal es una **subtarea** bajo la HU de la semana que le corresponde por fecha.
- **HU independiente**: una historia de usuario propia para una atención compleja. Sus **subtareas** son las fases secuenciales del trabajo. Jhans elige semanal o independiente en la herramienta (`hu_tipo`); tú no lo decides.
- **Padre e hijos**: una atención puede tener hijos (otras atenciones, con `padre_id`). La cola trae de cada atención `raiz_id` y `hu_tipo_raiz` (el tipo de la atención raíz, la que no tiene padre). **En un hijo usa siempre `hu_tipo_raiz` e ignora su propio `hu_tipo`** (no es confiable). Un hijo **nunca** es historia de usuario. Una interrupción (`npl`) con `padre_id` **no** sigue estas reglas de hijo: ver "Interrupciones" más abajo. Según la raíz:
  - **Raíz semanal** → el hijo es **su propia subtarea**, igual que una semanal: una por entorno, bajo la HU de la semana que corresponde a su fecha, con título `PROYAA(ENT): <Tracking ID del hijo> - titulo` (si no tiene entornos propios, usa los de la raíz). Pasa por sus propios `/inicia`, `/limpia` y `/procede`; el `/procede` del padre no toca sus subtareas.
  - **Raíz independiente** → el hijo **no tiene subtarea propia**. En el `/procede` de la raíz analizas **en conjunto** la bitácora de la raíz y la de sus hijos que ya tienen conforme, **propones las fases** de la HU (cuántas y en qué orden) y, tras la aprobación de Jhans, repartes en ellas los comentarios de todos. El título de cada fase es solo su nombre (ver `jira-subtareas`). Este hijo no aparece en la cola para `/inicia`; sí pasa por su propio `/limpia`. El cierre de las fases lo hace el `/procede` de la raíz.
  - **Dónde se registran los comentarios de un hijo** (raíz independiente): en los `jira-comentarios_*.json` de la **carpeta del propio hijo** (su `040_ProcesoJira`), con la `key` de la fase de la raíz. La herramienta solo da por enviada una entrada si la encuentra en la carpeta de esa misma atención.
  - **Hijo que da el conforme después** (raíz independiente): si la raíz ya tiene fases, el `/procede` del hijo reparte sus comentarios en esas fases; si ninguna encaja, propone una fase nueva para que Jhans la apruebe. Si la raíz aún no tiene fases, avisa y espera al `/procede` de la raíz.
  - **Hijo marcado como fase independiente** (`fase_independiente: true` en la cola; solo tipos `int`, `doc` y `con`, nunca `ticket` ni `npl`) con **raíz independiente**: es la excepción a las dos reglas anteriores. Tiene **su propia subtarea** bajo la HU de la raíz (`parent.key` = `jira.padre_key` de la raíz), que se crea en su `/inicia`, directo y sin aprobación de fases, con título solo el `titulo` del hijo levemente mejorado (como cualquier fase). Se guarda en `subtareas[]` **del propio hijo** con `fase`, `entornos`, `key` y `url` (sin `secuencia`). Si la raíz aún no tiene HU, avisa y salta ese hijo. Su `/procede` sube sus comentarios a esa subtarea (registrados en su propia carpeta) y la pasa a `FINALIZADO` al terminar; si se saltó `/inicia`, la crea antes, dentro del mismo `--dry-run`/"crear". El `/procede` de la raíz **no** lo incluye en la propuesta de fases ni cierra su subtarea. Con raíz semanal el check no cambia nada (ya tiene su propia subtarea).
- **Interrupciones (tipo `npl`):** llamada o chat de Teams sin agendar. **Nunca** tiene HU ni subtarea propia: siempre sube como **comentario**. No pasa por `/inicia` (nunca aparece como `pendiente_inicio`). Sus datos de cierre viven en el campo `npl` de `ticket-datos.json`: `tipo_contacto` (`llamada`/`chat`), `quien`, `resumen` (el texto a subir; las "notas" de `bitacora.json` son solo apuntes del propio Jhans, nunca van a Jira), `ticket_relacionado` (texto libre, úsalo solo de referencia si no hay `padre_id`) y `pendiente_cierre`. Según su `padre_id` (y `hu_tipo_raiz` de la cola):
  - **Sin padre** (su `tracking_code` es el que eligió Jhans, `INFRAS` por defecto; con padre toma el del padre): el comentario va a la **subtarea fija de interrupciones** de la HU semanal vigente (`subtarea_interrupciones_key` en el `hu_semanales` que cubre la fecha). Se crea junto con cada HU semanal; si esa entrada no la tiene, créala la primera vez que una NPL la necesite (ver `jira-historia-usuario`). Al cerrar la semana pasa a `FINALIZADO` (ver `sprint-cierre`).
  - **Con padre y `hu_tipo_raiz: "independiente"`:** va a la **fase fija "Consultas y seguimiento"** de esa HU. Si todavía no existe en `subtareas[]` de la raíz (búscala por `fase == "Consultas y seguimiento"`), **créala primero** (ver `jira-subtareas`): se crea la primera vez que una NPL la necesita, nunca en `/inicia`.
  - **Con padre y `hu_tipo_raiz: "semanal"`:** va **directo** a las subtareas propias del padre (las que ya tiene por pertenecer a una raíz semanal); si el padre tiene una por entorno (p. ej. PRE y PRO), el comentario se repite en **cada una**. No crea nada nuevo.
  - **Siempre se sube** (no aplica el criterio de descarte). Si el destino todavía no existe en Jira (padre semanal sin subtarea creada, raíz independiente sin HU, o semana sin HU semanal), **avisa y salta esa NPL**; no crees el padre de otra atención por ella.
  - El `/procede` de una NPL **nunca transiciona** ninguna subtarea: la subtarea fija y la fase "Consultas y seguimiento" son compartidas, y la del padre es del padre. (La subtarea fija solo se cierra en el cierre de semana.)
  - "Consultas y seguimiento" es solo para comentarios de NPL: no la incluyas al proponer las fases de la raíz ni repartas ahí comentarios de la bitácora normal.
  - Detalle de dónde se sube cada caso: ver `jira-comentarios`. Detalle de `/limpia` para una NPL: ver `correo-procesar`.

## Sprint y HU semanales

Jhans crea el sprint y te dice su duración. El agente crea las **HU semanales** del sprint: una por semana de **lunes a viernes** dentro del rango del sprint, y las guarda en `hu_semanales` de `config-jira.json` (cada una con `inicio`, `fin`, `key`). Si el sprint empieza o termina a mitad de semana, esa HU abarca igual la semana completa de lunes a viernes.

Al crear la subtarea de una atención semanal, usa la **fecha de la atención** para ubicarla bajo la HU de la semana que corresponde, dentro del sprint activo. Una fecha en **fin de semana** (sábado o domingo) se asigna a la semana que acaba de terminar (la del viernes anterior). Si la fecha cae fuera del sprint activo, pregunta a Jhans. Si en `hu_semanales` **no hay una HU que cubra esa fecha**, en `/inicia` **avisa y salta esa atención** (las demás siguen): no crees HU semanales dentro de `/inicia`. Las HU semanales se crean aparte, con `--dry-run` y "crear" (skill `jira-historia-usuario`).

Un trimestre tiene varios sprints (unos tres, de ~5 semanas, aproximadamente mensuales). Jhans crea cada sprint y te da sus fechas; tú no calculas sus límites.

La **épica representa el trimestre** (por ejemplo, Q4 2026); un trimestre puede tener varios sprints, todos bajo la misma épica. La épica (`epica` en `config-jira.json`) solo la cambia Jhans, al cambiar de trimestre.

`config-jira.json` guarda **solo lo activo**: `epica`, `sprint` y `hu_semanales` del sprint vigente. Al empezar un sprint nuevo, su `sprint` y sus `hu_semanales` **reemplazan** a los del anterior (no se acumulan). El historial de HU y sprints pasados vive en Jira y en el `ticket-datos.json` de cada atención (que guarda las `key`/`url` reales), así que no se pierde.

Las **HU independientes** no van en el config: viven en `jira.padre_key` de cada atención. Ambos tipos conviven en el mismo sprint.

## Los comandos

Se invocan como comandos de barra. Cada uno acepta un ID opcional:

- **con ID** (Tracking ID o `id_herramienta`): trabajas solo sobre esa atención.
- **sin ID**: lees `agente-cola.json` y trabajas sobre todas las pendientes de esa etapa. Si son **5 o menos**, lista los títulos y confirma con Jhans cuáles vas a procesar antes de empezar; si son **más de 5**, lista solo los títulos (una línea por ítem) y procede sin preguntar por cada uno. Esa confirmación de alcance es distinta del gate **"crear"** de cada script. (`/inicia` es la excepción: crea el padre directo, sin confirmación de alcance ni "crear").

| Comando | Etapa | Qué haces |
|---|---|---|
| `/inicia` | al llegar la asignación, para crear el padre temprano. **Es opcional** (`accion: pendiente_inicio` en la cola) | Creas el **padre** en Jira **si aún no existe**, directo (sin dry-run ni "crear"). Es un paso **mínimo**: usa lo que haya (título, y correo si existe) y no te detengas por falta de solicitante, correos ni capturas; `/procede` completa la descripción después. Que `jira.padre_key` y las `key` de `subtareas[]` estén vacías es **lo normal** en `pendiente_inicio`: justamente es lo que vas a crear. Si la atención es **hija**, nunca es HU (ver "Padre e hijos"): con raíz semanal creas su subtarea; con raíz independiente no le corresponde `/inicia`, salvo que esté marcada como fase independiente (creas su subtarea bajo la HU de la raíz). Independiente → la **HU** (guardas `jira.padre_key`, `jira.padre_url`, `jira.tipo_padre: "hu"`). Semanal → una **subtarea por entorno** bajo la HU de la semana que corresponde por fecha (de `hu_semanales`); las guardas en `subtareas[]` con su `entorno`, `key` y `url`. Nada más. Con un ID actúas sobre esa atención aunque ya esté en otra etapa (p. ej. si se trabajó y terminó toda de una vez sin `/inicia`); si el padre ya existe, avisa que no hay nada que crear. Una interrupción (`npl`) nunca tiene padre propio: avisa que no hay nada que crear. Skills: `jira-historia-usuario`, `jira-subtareas`. |
| `/limpia` | cuando Jhans marca *atendida* (`accion: pendiente_limpieza`) | Lees los correos y la bitácora; corriges el texto de cada entrada (redacción coherente, **sin unir ni reordenar ni cambiar la cantidad**) en `bitacora-correccion.json`; completas `correos[].resumen`. **Escribes tu propuesta** de `descripcion` y `titulo_jira` (corto y claro) **directamente** en `ticket-datos.json`, al primer nivel, para que Jhans las revise en la herramienta; si pide ajustes por el chat, reescribes esos campos. No subes nada a Jira; la compuerta es el "Dar conforme". En una interrupción (`npl`) solo corriges `npl.resumen`, sin `descripcion` ni `titulo_jira`. Skill: `correo-procesar`. |
| `/procede` | cuando Jhans da el conforme (`accion: pendiente_jira`) | Subes a Jira. **Si el padre aún no existe (no se corrió `/inicia`), créalo primero** (la HU independiente o las subtareas semanales). En una **independiente**: creas la HU si falta, analizas en orden la bitácora de la raíz **y la de sus hijos con conforme**, **propones las fases**, Jhans las aprueba, creas las subtareas bajo la HU y repartes los comentarios (razonas si van agrupados o uno por subtarea; los de cada hijo se registran en la carpeta del hijo; un hijo marcado como fase independiente queda fuera, tiene su propia subtarea). En una **semanal** (y en todo hijo de raíz semanal): creas las subtareas que falten (una por entorno) y subes sus comentarios; las subtareas de los hijos las sube el `/procede` de cada hijo. **Después de subir el comentario de cierre**, transicionas cada subtarea a `FINALIZADO` y actualizas `subtareas[].estado` en `ticket-datos.json`. Si no hay transición directa, avisas a Jhans. Una interrupción (`npl`) es la excepción: no crea padre ni transiciona subtareas, solo sube su comentario (ver "Interrupciones"). Skills: `jira-subtareas`, `jira-comentarios`. |
| `/corrige <id>` | cuando un issue ya creado necesita ajuste | Actualizas en Jira los issues ya creados de la atención (los que tienen `key`): corriges su **título** (a `titulo_jira`) y su **descripción** con el formato vigente, vía `PUT /issue/<key>`. No creas issues nuevos ni tocas comentarios ya subidos. Skills: `jira-subtareas`, `jira-historia-usuario`. |

En `/procede`, entre las entradas marcadas `para_jira: true` aplica criterio: no subas todas, descarta lo incoherente o redundante y deja solo lo que tiene sentido como comentario.

## Ciclo de vida (Terminar en dos pasos)

La herramienta separa el cierre en dos estados, visibles en `ticket-datos.json`:

1. `estado: "atendido"` + `listo_para_limpieza` (fecha): la atención está lista para `/limpia`.
2. `listo_para_jira` (fecha): Jhans revisó el texto corregido y dio el conforme; lista para `/procede`.

### Atención reabierta (segunda vuelta a Jira)

Tras subir la primera parte, Jhans puede poner `estado: "reabierto"`, agregar entradas nuevas y volver a terminar. Al reabrir, la herramienta limpia `listo_para_limpieza` y `listo_para_jira`, así que el texto nuevo vuelve a pasar por `/limpia` → conforme → `/procede` como siempre. En ese segundo `/procede`:

- La épica, la HU y las subtareas **ya existen** (tienen `key`): **no las recrees** (ver la regla de idempotencia: te guías por las keys guardadas, no por el endpoint de búsqueda).
- Sube **solo los comentarios nuevos** (las entradas que aún no figuran como subidas), a las **mismas subtareas**.
- Si la subtarea quedó en `FINALIZADO` y hay **trabajo nuevo real**, el agente la **reabre en Jira** (`FINALIZADO → En curso`), sube los comentarios nuevos y la **vuelve a cerrar** (`→ FINALIZADO`). Si solo agregas evidencia o una aclaración, comenta sin reabrir. Las transiciones están en `jira-subtareas`.
- Si la reapertura trajo un **nuevo correo de cierre**, su captura y su `.eml` van en el nuevo comentario final (`jira-comentarios`).

## Contratos de archivos

**`bitacora.json`** (solo lectura). Cada entrada tiene `id`, `n`, `tipo` (`solicitud`, `asignacion`, `avance`, `cierre` o `interrupcion`), `fecha`, `texto`, `para_jira`, `capturas[]`, `correos[]`, `archivos[]`. Las capturas son `{ "raiz": "trabajo" | "proceso", "ruta": "<relativa a la carpeta>", "descripcion": "..." }`. Una NPL tiene una sola entrada, tipo `interrupcion`; su `texto` son las notas de Jhans (no van a Jira) y sus capturas pueden venir con `descripcion` vacía.

**`bitacora-correccion.json`** (lo escribes en `/limpia`). Texto corregido por `bitacora_id`, con la fecha de la corrección (ver `correo-procesar`):

```json
{ "correcciones": { "e20261018163626...": { "texto": "Texto corregido, claro y coherente.", "corregido": "2026-10-21 15:40" } } }
```

**Campos del agente en `ticket-datos.json`** (merge: relee y cambia solo tus campos):

```json
{
  "titulo_jira": "Titulo corto y claro para el issue",
  "descripcion": "## Datos\n- **Tracking ID:** [PTSK0000123](https://.../PTSK0000123)\n- **Proyecto:** PROYAA\n- **Entorno:** PRE\n- **Solicitante:** Nombre del solicitante\n\n## Resumen\nResumen breve de lo que se hizo, segun el historial de la bitacora.",
  "jira": { "padre_key": "PRYA-1001", "padre_url": "https://.../browse/PRYA-1001", "tipo_padre": "hu" },
  "subtareas": [
    { "secuencia": 1, "fase": "Analizar el requerimiento", "entornos": ["DEV", "PRE"], "key": "PRYA-1002", "url": "https://.../browse/PRYA-1002", "estado": "en_curso" }
  ]
}
```

- **`descripcion` es la de la herramienta, NO la de Jira.** Es un texto en **markdown** (la herramienta renderiza `## titulo`, `- lista`, `**negrita**`, `` `codigo` `` y enlaces `[texto](url)`). Va **primero DATOS y luego un resumen breve**: en DATOS, Tracking ID (enlace `[ID](url)` solo si la atención tiene `url_servicenow`; si no, el ID a secas), Proyecto, Entorno(s) y Solicitante (de `ticket-datos.json`); en Resumen, qué se hizo según el historial de la bitácora, en pocas líneas. La descripción del **issue de Jira** (COMO/QUIERO/PARA, OBJETIVO, captura, etc.) es otra y se arma aparte al subir (ver "Formato de la descripción del issue").

- **Independiente:** `jira` es la HU (`tipo_padre: "hu"`), creada en `/inicia`. `subtareas[]` son sus tareas (campo `fase` con el nombre, `secuencia`, `entornos`), creadas en `/procede`.
- **Semanal:** no uses `jira.padre_key`. Las subtareas (una por entorno) van en `subtareas[]` con `entorno`, `key`, `url`, creadas en `/inicia`.
- La `url` es la de navegación del issue: `<url_del_destino>/browse/<key>`; la herramienta solo la muestra como enlace.

**`040_ProcesoJira/jira-*.json`**: mantén solo los payloads vigentes de la siguiente operación. Para una independiente, agrupa todas las subtareas aprobadas en un solo `jira-crear_subtareas.json` y guarda las keys en `jira-respuesta_subtareas.json`; conserva un archivo de comentarios por subtarea (`jira-comentarios_*.json`) con la `key` de su subtarea.

**Marcar lo subido:** en cada comentario de `jira-comentarios_*.json` agrega `bitacora_id` (o `bitacora_ids` si junta varias entradas). Cuando queda con `subido: true`, la herramienta muestra esa entrada como enviada y la bloquea.

## Formato del título del issue

El `titulo_jira` siempre lo **propone el agente** y Jhans lo aprueba o ajusta; es la parte descriptiva. El título completo lleva el proyecto (sin corchetes), los entornos entre paréntesis en mayúsculas, dos puntos, el Tracking ID y el `titulo_jira`:

- **HU independiente** (todos sus entornos juntos, separados por coma):
  - Con entornos: `INFRAS(DEV,PRE): JINT0000000001 - Error en secrets de Flux`
  - Sin entorno: `DOCINF: JDOC0000000005 - Guia de despliegue`
- **Subtarea de la HU semanal** (una por entorno):
  - Con entorno: `PROYAA(PRE): PTSK0000123 - Exportar data de tablas`
  - Sin entorno: `PROYAA: PTSK0000123 - Exportar data de tablas`
- **Subtareas de una HU independiente**: solo el nombre de la tarea (el campo `fase`); no repiten proyecto ni Tracking ID porque ya están en la HU padre.

Una atención multi-entorno vive en su carpeta combinada (p. ej. `040_DevPre`), pero como subtarea semanal se divide en una subtarea por entorno. En independiente no se divide: la HU lleva todos los entornos y sus tareas pueden abarcar varios.

## Formato de la descripción del issue

Formato wiki de Jira. Reglas (ver ejemplos en `jira-historia-usuario` y `jira-subtareas`):

- **No** pongas un título `*DESCRIPCIÓN*` dentro: el campo de Jira ya se llama Descripción, sería redundante.
- Las palabras **COMO**, **QUIERO** y **PARA** van en **negrita y mayúsculas** (`*COMO*`, `*QUIERO*`, `*PARA*`).
- **COMO** es el **rol** desde el que Jhans atiende, **nunca un nombre de persona** en esa línea. Por ejemplo: `*COMO* DevOps del equipo de nube` (proyectos de nube como NEXHUB) o `*COMO* miembro del equipo de infraestructura`. Si no está claro el rol, usa por defecto `miembro del equipo de infraestructura` (o `DevOps del equipo de nube` en proyectos de nube); no preguntes. (El nombre del solicitante sí va en DATOS, abajo.)
- En **DATOS**: `Tracking ID` (como enlace `[ID|URL]` si la atención tiene `url_servicenow`; si no, solo el ID), `Proyecto`, `Entorno` y `Solicitante: <nombre>`. El **Solicitante es quien pidió** la atención: su nombre sale del **correo de solicitud** (entrada tipo `solicitud`), **no** del correo de asignación (ese remitente es otra persona, quien asignó). Si no hay correo de solicitud, usa el campo `solicitante` de `ticket-datos.json`; **si tampoco hay, omite la línea `Solicitante`** (no preguntes: en iniciativas, documentación y consultas es normal que no haya). No pongas una línea "Correo de asignación".
- **La captura del correo de asignación** (imagen) va **embebida en la descripción** (súbela como adjunto y referénciala con `!captura_correo_asignado.png|thumbnail!`). No adjuntes el `.eml` de asignación. **Si no hay correo de asignación**, usa la captura del **correo de solicitud** (`captura_correo_solicitud`); **si no hay ninguno, omite la sección de captura**.
- **Sin correos** (lo normal en `JINT`, `JDOC`, `JCON`): arma el COMO/QUIERO/PARA, el OBJETIVO y el ALCANCE breves a partir del `titulo` de la atención. Nunca te detengas por falta de correos.
- El **`.eml` y la captura del correo de cierre** van en el **comentario final** (el de entrega), no en la descripción (ver `jira-comentarios`).
- Mantén el contenido **breve**, sin rodeos.

## Reglas de ejecución de Jira

- Toda operación de Jira es un script `.py`. **Lo ejecutas tú** (el agente) en la terminal de VS Code, desde la carpeta `040_ProcesoJira` de la atención. En `/procede` y `/corrige`, tras la confirmación **"crear"** de Jhans en el chat; **`/inicia` es la excepción y se ejecuta directo, sin dry-run ni "crear"**. Tú manejas la ruta; Jhans no copia comandos ni busca carpetas. Invoca el script como `python nombre_script.py` (**sin `.\`**, para que funcione igual en PowerShell y en Git Bash). **No uses `Start-Process` ni `& operador`**: PowerShell falla con rutas que tienen espacios (p. ej. "OneDrive - Santander"); usa siempre `python nombre_script.py` directamente.
- **Antes de ejecutar cualquier script** (incluyendo el `--dry-run`), copia las variables de entorno del nivel User a la sesión actual con estos comandos en la terminal. Hazlo siempre; no asumas que ya están en la sesión:

  ```powershell
  $env:AT_RAIZ_TRABAJO     = [Environment]::GetEnvironmentVariable("AT_RAIZ_TRABAJO","User")
  $env:AT_RAIZ_PROCESO     = [Environment]::GetEnvironmentVariable("AT_RAIZ_PROCESO","User")
  $env:AT_CORREO           = [Environment]::GetEnvironmentVariable("AT_CORREO","User")
  $env:JIRA_ACMEBANK_URL   = [Environment]::GetEnvironmentVariable("JIRA_ACMEBANK_URL","User")
  $env:JIRA_ACMEBANK_EMAIL = [Environment]::GetEnvironmentVariable("JIRA_ACMEBANK_EMAIL","User")
  $env:JIRA_ACMEBANK_TOKEN = [Environment]::GetEnvironmentVariable("JIRA_ACMEBANK_TOKEN","User")
  ```

  Los nombres de las variables (`JIRA_ACMEBANK_*`) salen de los campos `url_var`, `email_var`, `token_var` del destino en `config-jira.json`; si el destino usa otros nombres, adapta las líneas.
- **Flujo de confirmación (`/procede` y `/corrige`):** primero corres el script con `--dry-run` (o le resumes a Jhans qué hará) y esperas su **"crear"**; recién entonces lo ejecutas de verdad (sin `--dry-run`). La compuerta es el "crear" del chat. **`/inicia` es la excepción:** crea el padre directo, sin `--dry-run` ni "crear". En ningún caso pongas un `input()` interactivo en los scripts.
- **Solo biblioteca estándar de Python.** Nunca instales paquetes (`pip install`), nunca crees entornos virtuales (`venv`, `virtualenv`, `conda` o cualquier otro), nunca cambies el intérprete. La laptop corporativa no tiene permisos de instalación y el proyecto no lo necesita. No crear scripts `.ps1`.
- Para HTTPS, `curl.exe --ssl-no-revoke` desde `subprocess`; no usar `urllib` ni desactivar la validación del certificado.
- Las credenciales se leen de las variables de entorno indicadas en `config-jira.json` (`url_var`, `email_var`, `token_var` del destino). Nunca las leas, muestres ni escribas.
- Los scripts leen los payloads JSON desde archivos; no incrustar credenciales ni el payload completo en la orden de terminal.
- **No uses el endpoint de busqueda de Jira para encontrar o reutilizar issues.** Atlassian retiro `GET/POST /rest/api/2/search` y `/rest/api/3/search` (responden HTTP 410). Para saber que existe, usa las keys ya guardadas (`jira.padre_key`, `subtareas[].key`, `hu_semanales`, los `jira-*respuesta*.json`) y crea solo lo que no tenga key. Si alguna vez una operacion necesita buscar de verdad, usa `/rest/api/3/search/jql`.
- Para crear issues, comentarios, adjuntos y transiciones, `/rest/api/2` sigue vigente.
- El código generado va sin tildes ni ñ (es ASCII). Los datos en español con tildes van en los JSON (UTF-8).
- Cada operación registra una sola línea en `jira-ejecuciones.log`.

## Reglas generales

- **Solo biblioteca estándar de Python.** Nunca instales paquetes, nunca crees entornos virtuales (`venv`, `virtualenv`, `conda` o cualquier otro) y nunca cambies el intérprete. La laptop corporativa no tiene permisos de instalación y el proyecto no lo necesita.
- **No uses herramientas MCP ni extensiones del IDE** (Pylance, pylanceFileSyntaxErrors, getDiagnostics ni ninguna otra) para validar sintaxis ni para ninguna otra operación. Están bloqueadas en la laptop corporativa y siempre fallan. La validación de un script se hace ejecutándolo con `--dry-run`.
- Solo te detienes si falta un dato **indispensable para Jira**: el Tracking ID, el proyecto (`tracking_code`) o su destino en `config-jira.json`; en ese caso pregunta antes de crear. La falta de entorno, solicitante, correos o capturas **no** detiene nada: omites esas líneas y sigues.
- En la línea `*COMO*` usa el **rol**, nunca un nombre; Jhans es a la vez de infraestructura y DevOps de nube, y para proyectos de nube (p. ej. NEXHUB) el rol es "DevOps del equipo de nube". El **nombre del solicitante** sí va en DATOS, y sale del **correo de solicitud**, no del de asignación.
- No cambies el estado de historias de usuario ni cierres sprints en Jira: eso lo hace Jhans en el tablero. Tú solo creas issues y cambias el estado de subtareas.
- No borres correos, adjuntos ni capturas. No toques el texto original de la bitácora ni el contenido de `030_ProcesoAtencion`.
- Responde en español, breve: qué hiciste, qué mostró el dry-run y qué queda pendiente de tu "crear".
