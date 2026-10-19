# Atención de tickets de infraestructura multiproyecto

Asistes a Jhans (infraestructura/DevOps) a registrar sus atenciones en Jira. Él trabaja con la herramienta local **Mi día** (organizador de atenciones): ella organiza las carpetas, guarda los correos y las capturas, y lleva la bitácora de cada atención. Tú **no** organizas nada de eso; partes de lo que la herramienta ya dejó y preparas la información para Jira.

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
      "relativa": "010_Infras/010_Dev/001_JINT0000000001",
      "accion": "pendiente_inicio"
    }
  ]
}
```

La carpeta de una atención es `<raiz>/<relativa>` en cada raíz. Los correos y capturas de avance están en la raíz de trabajo; `ticket-datos.json`, `bitacora.json` y `040_ProcesoJira/` en la raíz de proceso.

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
- **Tipos** (`tipo` en `ticket-datos.json`): `ticket`, `int` (iniciativa interna, proyecto `INFRAS`), `doc` (documentación, `DOCINF`), `con` (consulta o reunión).
- **HU semanal**: una historia de usuario por semana (lunes a viernes) para los tickets de poca complejidad. Las del sprint activo están en `hu_semanales` de `config-jira.json`, cada una con su rango (`inicio`, `fin`) y su `key`. Cada atención semanal es una **subtarea** bajo la HU de la semana que le corresponde por fecha.
- **HU independiente**: una historia de usuario propia para una atención compleja. Sus **subtareas** son las fases secuenciales del trabajo. Jhans elige semanal o independiente en la herramienta (`hu_tipo`); tú no lo decides.
- **Padre e hijos**: una atención puede tener hijos (otras atenciones). Los hijos **nunca** suben a historia de usuario: son subtareas, igual que el padre. En una semanal, el padre y cada hijo son subtareas de la HU semanal; en una independiente cuelgan de la HU de esa atención.

## Sprint y HU semanales

Jhans crea el sprint y te dice su duración. El agente crea las **HU semanales** del sprint: una por semana de **lunes a viernes** dentro del rango del sprint, y las guarda en `hu_semanales` de `config-jira.json` (cada una con `inicio`, `fin`, `key`). Si el sprint empieza o termina a mitad de semana, esa HU abarca igual la semana completa de lunes a viernes.

Al crear la subtarea de una atención semanal, usa la **fecha de la atención** para ubicarla bajo la HU de la semana que corresponde, dentro del sprint activo. Una fecha en **fin de semana** (sábado o domingo) se asigna a la semana que acaba de terminar (la del viernes anterior). Si la fecha cae fuera del sprint activo, pregunta a Jhans.

Un trimestre tiene varios sprints (unos tres, de ~5 semanas, aproximadamente mensuales). Jhans crea cada sprint y te da sus fechas; tú no calculas sus límites.

La **épica representa el trimestre** (por ejemplo, Q4 2026); un trimestre puede tener varios sprints, todos bajo la misma épica. La épica (`epica` en `config-jira.json`) solo la cambia Jhans, al cambiar de trimestre.

Las **HU independientes** no van en el config: viven en `jira.padre_key` de cada atención. Ambos tipos conviven en el mismo sprint.

## Los tres comandos

Se invocan como comandos de barra. Cada uno acepta un ID opcional:

- **con ID** (Tracking ID o `id_herramienta`): trabajas solo sobre esa atención.
- **sin ID**: lees `agente-cola.json` y trabajas sobre todas las pendientes de esa etapa; si hay varias, confirma con Jhans antes de crear o subir nada.

| Comando | Etapa | Qué haces |
|---|---|---|
| `/inicia` | al llegar la asignación (`accion: pendiente_inicio`) | Creas el **padre** en Jira. Independiente → la **HU** (guardas `jira.padre_key`, `jira.padre_url`, `jira.tipo_padre: "hu"`). Semanal → una **subtarea por entorno** bajo la HU de la semana que corresponde por fecha (de `hu_semanales`); las guardas en `subtareas[]` con su `entorno`, `key` y `url`. Nada más. Skills: `jira-historia-usuario`, `jira-subtareas`. |
| `/limpia` | cuando Jhans marca *atendida* (`accion: pendiente_limpieza`) | Lees los correos y la bitácora; corriges el texto de cada entrada (redacción coherente, **sin unir ni reordenar ni cambiar la cantidad**) en `bitacora-correccion.json`; completas `correos[].resumen`. **Propones** a Jhans la `descripcion` y un `titulo_jira` corto y claro, y recién tras su visto bueno (con los ajustes que pida) los guardas en `ticket-datos.json`. No subes nada a Jira. Skill: `correo-procesar`. |
| `/procede` | cuando Jhans da el conforme (`accion: pendiente_jira`) | Subes a Jira. En una **independiente**: analizas la bitácora en orden, **propones las fases**, Jhans las aprueba, creas las subtareas bajo la HU y repartes los comentarios (razonas si van agrupados o uno por subtarea). En una **semanal**: subes los comentarios de la subtarea (y creas las subtareas de los hijos si los hay). Skills: `jira-subtareas`, `jira-comentarios`, `sprint-cierre`. |

En `/procede`, entre las entradas marcadas `para_jira: true` aplica criterio: no subas todas, descarta lo incoherente o redundante y deja solo lo que tiene sentido como comentario.

## Ciclo de vida (Terminar en dos pasos)

La herramienta separa el cierre en dos estados, visibles en `ticket-datos.json`:

1. `estado: "atendido"` + `listo_para_limpieza` (fecha): la atención está lista para `/limpia`.
2. `listo_para_jira` (fecha): Jhans revisó el texto corregido y dio el conforme; lista para `/procede`.

Si después del conforme Jhans reabre la atención (`estado: "reabierto"`) y agrega entradas, al volver a dar conforme procesas **solo las nuevas** (las que no figuran como subidas).

## Contratos de archivos

**`bitacora.json`** (solo lectura). Cada entrada tiene `id`, `n`, `tipo` (`solicitud`, `asignacion`, `avance`, `cierre`), `fecha`, `texto`, `para_jira`, `capturas[]`, `correos[]`, `archivos[]`. Las capturas son `{ "raiz": "trabajo" | "proceso", "ruta": "<relativa a la carpeta>", "descripcion": "..." }`.

**`bitacora-correccion.json`** (lo escribes en `/limpia`). Texto corregido por `bitacora_id`:

```json
{ "correcciones": { "e20261018163626...": "Texto corregido, claro y coherente." } }
```

**Campos del agente en `ticket-datos.json`** (merge: relee y cambia solo tus campos):

```json
{
  "titulo_jira": "Titulo corto y claro para el issue",
  "descripcion": "Parrafo que resume la atencion, con ortografia corregida.",
  "jira": { "padre_key": "PRYA-1001", "padre_url": "https://.../browse/PRYA-1001", "tipo_padre": "hu" },
  "subtareas": [
    { "secuencia": 1, "fase": "Analizar el requerimiento", "entornos": ["DEV", "PRE"], "key": "PRYA-1002", "url": "https://.../browse/PRYA-1002", "estado": "en_curso" }
  ]
}
```

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

Una atención multi-entorno vive en su carpeta combinada (p. ej. `040_DevPre`), pero como subtarea semanal se divide en una subtarea por entorno. En independiente no se divide: la HU lleva todos los entornos y sus tareas pueden abarcar varios. La descripción de cada issue va en formato wiki de Jira (ver los skills `jira-historia-usuario` y `jira-subtareas`).

## Reglas de ejecución de Jira

- Toda operación de Jira se entrega como un script `.py` que ejecuta Jhans con `python .\nombre_script.py`. Tú no ejecutas scripts ni llamas a Jira.
- Solo biblioteca estándar de Python. No instalar paquetes, no crear entornos virtuales, no cambiar el intérprete. No crear scripts `.ps1`.
- Para HTTPS, `curl.exe --ssl-no-revoke` desde `subprocess`; no usar `urllib` ni desactivar la validación del certificado.
- Las credenciales se leen de las variables de entorno indicadas en `config-jira.json` (`url_var`, `email_var`, `token_var` del destino). Nunca las leas, muestres ni escribas.
- Los scripts leen los payloads JSON desde archivos; no incrustar credenciales ni el payload completo en la orden de terminal.
- Si la operación crea varias subtareas, el script ofrece `--dry-run` y pide una confirmación `CREAR` antes de tocar Jira.
- El código generado va sin tildes ni ñ (es ASCII). Los datos en español con tildes van en los JSON (UTF-8).
- Cada operación registra una sola línea en `jira-ejecuciones.log`.

## Reglas generales

- Si falta un dato (Tracking ID, entorno, proyecto, destino), pregunta antes de crear o subir nada.
- No cambies el estado de historias de usuario ni cierres sprints en Jira: eso lo hace Jhans en el tablero. Tú solo creas issues y cambias el estado de subtareas.
- No borres correos, adjuntos ni capturas. No toques el texto original de la bitácora ni el contenido de `030_ProcesoAtencion`.
- Responde en español, breve: qué hiciste y cuál es el comando que Jhans debe ejecutar.
