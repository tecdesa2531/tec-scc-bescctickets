# Diseño y acuerdos

Este documento resume el análisis hecho con Jhans antes de construir la herramienta: qué problema resuelve, qué se decidió y por qué, y qué falta. Los nombres de proyectos, tickets y claves son ejemplos ficticios.

## 1. El problema

Jhans trabaja en infraestructura con varias atenciones en paralelo (en general hasta cuatro tickets a la vez, a veces más) y pierde el hilo:

- **Pestañas**: muchas abiertas, varias sesiones de AWS, repartidas en varios escritorios y ventanas. No sabe qué hay en cada uno.
- **Favoritos**: la lista es larga y las herramientas de uso diario quedan enterradas.
- **Seguimiento**: los tickets de referencia y lo que va haciendo están en un bloc de notas, sin enlaces ni búsqueda.
- **Capturas**: se pierden en la carpeta de Descargas.
- **Jira**: llenarlo es tedioso. Las historias de usuario se cierran con el sprint y lo que no nace de un ticket (llamadas de otros equipos, correcciones, documentación) no queda reflejado.
- **Ortografía**: quiere que una IA mejore la redacción antes de subir a Jira.

## 2. Restricciones del entorno

- Laptop corporativa con Windows, sin permisos para instalar software. La extensión Toby (gestor de pestañas) fue rechazada.
- Python sí está disponible y el servidor local en `127.0.0.1` funciona.
- Edge tiene Áreas de trabajo (Workspaces) disponibles. El botón para copiar el vínculo de un área de trabajo no aparece (probablemente bloqueado por política), así que la herramienta guarda solo su **nombre**.
- Una página web no puede leer ni agrupar las pestañas del navegador; eso solo lo hace una extensión.
- Edge no permite poner una página propia como "nueva pestaña" sin extensión o política. Se usa como página de inicio, botón de inicio y pestaña anclada.

## 3. Decisiones principales

| Decisión | Motivo |
|---|---|
| Herramienta propia en vez de OneNote u otra | Necesita datos estructurados (JSON) que Copilot pueda leer. |
| Python con biblioteca estándar + un HTML | No requiere instalar nada; las capturas y correos necesitan guardarse como archivos reales. |
| JSON en carpetas, sin SQLite | Copilot lee JSON directamente; la estructura de carpetas ya es la "base de datos"; OneDrive sincroniza mejor archivos sueltos. SQLite solo tendría sentido para reportes de muchos meses. |
| Áreas de trabajo de Edge para las pestañas de cada ticket | La página no puede manejar pestañas. Un área de trabajo por ticket, con el mismo nombre que su número. Los escritorios de Windows ya no se usan para separar tickets. |
| Dos raíces de datos | La carpeta que ven otros queda limpia; todo lo de Jira, Copilot y la herramienta va a una carpeta privada. |
| Un dueño por archivo | Evita que la herramienta y Copilot se pisen al escribir el mismo archivo. |
| Lo mecánico a código, el criterio a Copilot (a mediano plazo) | Crear carpetas, armar payloads y subir comentarios es más confiable como código. Copilot queda para resumir, redactar y proponer fases. |
| Servidor iniciado a mano | Jhans prefiere ejecutar `python servidor.py` al entrar, sin arranque automático. |
| Construcción por etapas | Cada etapa queda usable por sí sola y se prueba en la laptop antes de seguir. |

## 4. Cómo trabaja Jhans (flujos reales)

Una solicitud llega por correo a la bandeja del área. Otra persona crea el ticket en ServiceNow y lo asigna; a veces ese correo de asignación **no trae los adjuntos** del correo original. Jhans prioriza los tickets de su proyecto, pero atiende de otros. A veces empieza a trabajar **antes** de que exista el ticket, solo con el correo del solicitante.

Tipos de trabajo que se repiten (son la base de los futuros flujos A-D, que solo cambiarían la vista en la herramienta; para Jira el proceso es el mismo):

- **A. Operación directa**: subir archivos a S3, actualizar datos en DynamoDB, actualizar el código de una Lambda. Ejecutar, validar, cerrar y notificar.
- **B. Cambio por GitOps** (por ejemplo, un ingress): issue → PR → pedir aprobación a un autorizador por correo o Teams → merge → Flux despliega solo → validar → cerrar y notificar.
- **C. Cambio de infraestructura con Terraform** (por ejemplo, OpenAPI): si es urgente, cambio directo en consola y luego regularización → issue → PR → aprobación → **agendar sesión de despliegue con otra persona** (el despliegue es manual, con una herramienta interna a la que Jhans aún no tiene acceso) → corregir errores → cerrar y notificar.
- **D. Corrección interna sin ticket**: por ejemplo, Flux deja de sincronizar en EKS porque otro equipo subió un manifiesto con errores. Igual que B, pero con un código interno.

También hay **documentación** (de un ticket o propia) y **llamadas o reuniones** de otros equipos de 30 a 60 minutos, fuera de los tickets, que quiere registrar para evidenciar en qué invierte su tiempo.

## 5. Modelo de datos

### Relación padre-hijo

Una atención puede tener un padre. Reglas:

- El padre se asigna al crear la atención o al editarla, **mientras no haya sido procesada** (`atencion_procesada`). Si la atención es temporal, solo se fija el vínculo y hereda el proyecto. Si ya está ubicada, `cambiar_padre` (`/api/atencion/padre`) mueve su carpeta dentro de la del padre y hereda su proyecto y carpeta de entorno. No se permite quitar el padre de una atención ubicada, colgarla de una de sus hijas ni de un padre sin carpeta definitiva. Una vez procesada, el padre queda fijo.
- En la lista, los hijos aparecen indentados bajo su padre con el ID alineado a la derecha. El padre muestra un badge con el número de hijos **antes del ID**; si algún hijo está en foco, el badge cambia a verde.
- Clic en el badge o en la celda ID del padre: expande o contrae los hijos.
- Clic en la celda Proyecto (padre o hijo): copia `tracking_id-tracking_code` al portapapeles. Para hijos sin proyecto propio se usa el proyecto del padre.
- El campo **Atención padre** del formulario de edición se deshabilita cuando la atención ya fue procesada. Si está ubicada y ya tiene padre, la opción "Sin padre" se deshabilita.
- En la lista, las líneas divisorias solo aparecen entre grupos (después del último hijo de cada padre o después de un padre sin hijos). No hay línea entre el padre y sus hijos, ni entre los hijos del mismo padre.

### Atención

Unidad de trabajo. Tipos:

| Tipo | Nombre en la interfaz | ID | Proyecto | Entornos |
|---|---|---|---|---|
| `ticket` | Ticket | Número de ServiceNow (`PTSK0000123`) | El del ticket | DEV, PRE, PRO o combinación |
| `int` | Iniciativa interna | `INT001`, correlativo global automático | `INFRAS` (proyecto transversal) u otro | Como un ticket |
| `doc` | Documentacion | `DOC001`, automático | `DOCINF` (documentación propia) | `000_SinEntorno` |
| `con` | Consulta o Reunion | `CON001`, automático | El del equipo que llamó | `000_SinEntorno` |

El nombre de cada tipo aparece en los encabezados de columna de los chips de foco, en el título de la vista de detalle y en el selector del formulario de nueva atención. El tipo `ticket` usa el ID que Jhans escribe (viene de ServiceNow); los otros tres tienen un ID interno correlativo asignado automáticamente.

- La documentación **de un ticket** no es una atención aparte: va como entradas en la bitácora de ese ticket y sube a Jira con él.
- El código propio (INT, DOC, CON) ocupa el lugar del Tracking ID, así Copilot lo trata como cualquier atención.
- **Tracking Code**: 6 letras, es el nombre de la carpeta del proyecto (`010_Proyaa` → `PROYAA`). Proyectos nuevos: siguiente número de 10 en 10.
- Las URL de ServiceNow cambian por ticket (no siguen un patrón), por eso se guardan a mano.

### Carpetas

Ambas raíces usan la estructura de la convención existente:

```
NNN_<Proyecto>/NNN_<Entorno>/NNN_<TrackingID>/
```

Entornos: `000_SinEntorno`, `010_Dev`, `020_Pre`, `030_Pro`, `040_DevPre`, `050_PrePro`, `060_DevPrePro`. La combinación DEV + PRO sin PRE no existe y se rechaza.

Raíz de trabajo por atención: `.eml`, `010_CorreoAsignadoAdjuntos`, `020_CorreoAtendidoAdjuntos`, `030_ProcesoAtencion` (capturas de avance y archivos).

Raíz de proceso por atención: `ticket-datos.json`, `bitacora.json`, `040_ProcesoJira/` (capturas de correo y archivos de Copilot). Además, en la raíz de proceso:

- `003_Herramienta/`: `accesos.json`, `ideas.json`, `010_Focos/AAAAMMDD_focos.json`.
- `004_SinAsignar/<id>/`: atenciones que aún no tienen proyecto o ID. Sus archivos de trabajo esperan en una subcarpeta `trabajo/`. Al completar los datos, la herramienta crea las carpetas definitivas en ambas raíces y mueve todo. Así nada aparece en la carpeta compartida con nombres provisionales.

Si cambian los entornos de una atención definitiva, la herramienta mueve las dos carpetas a la nueva carpeta de entorno con el siguiente correlativo. Las rutas de la bitácora son relativas a la carpeta de la atención, por eso no se rompen.

### Bitácora

Línea de tiempo por atención. Las entradas **solo se agregan**, en el orden en que se crean; no se reordenan (se descartó arrastrar o editar la hora porque complica el código y el procesamiento de Copilot).

| Tipo | Uso |
|---|---|
| `solicitud` | Correo del solicitante, cuando se empieza antes del ticket. |
| `asignacion` | Correo de asignación. Si faltan adjuntos, se arrastran a mano o se arrastra también el correo original. |
| `avance` | Lo normal; acepta también correos intermedios. |
| `cierre` | Correo atendido. Marca la atención como `atendido` y `listo_para_jira`. |

- Cada captura lleva **descripción obligatoria**, porque Copilot solo lee texto.
- En solicitud, asignación y cierre, una captura puede marcarse como *captura del correo*: va a `040_ProcesoJira/AAAAMMDD_captura_correo_<tipo>.png` en la raíz de proceso.
- Cada entrada se marca **para Jira** o **privada**.
- Se puede **editar** cualquier entrada no enviada (texto, para Jira, descripciones, quitar o agregar capturas y archivos). Las enviadas a Jira quedan **bloqueadas**; para corregir algo enviado se agrega una entrada nueva.
- Cada entrada tiene un `id` fijo; Copilot usa ese `id`, no la posición.
- Al arrastrar un `.eml`: se guarda como `AAAAMMDD_correo_<tipo>.eml` (fecha del correo, `_02` si se repite el día), se extraen sus adjuntos con su nombre original, se ignoran las imágenes incrustadas (firmas) y un correo adjunto dentro de otro se guarda entero. Un correo idéntico no se duplica.

### Estados de una atención

`en_curso` → `en_espera` → `atendido` → `reabierto` → `descartado` (cualquier transición manual, salvo las reglas de bloqueo de abajo).

Efectos visuales por estado:

| Estado | Lista principal | Chips de foco | Botón "Poner foco" | Botón "Terminar" |
|---|---|---|---|---|
| `en_curso` | Normal | Aparece | Visible | Visible |
| `en_espera` | Normal | Aparece | Visible | Visible |
| `reabierto` | Normal | Aparece | Visible | Visible |
| `atendido` | Texto gris (apagado) | No aparece | Oculto | Oculto |
| `descartado` | Texto gris (apagado) | No aparece | Oculto | Oculto |

El filtro "Abiertas o con pendientes" de la lista incluye `en_curso`, `en_espera` y `reabierto`.

### Reglas de bloqueo por tipo

| Acción | Tipo `ticket` | Otros tipos |
|---|---|---|
| Agregar entrada a bitácora | Requiere al menos un correo recibido (`asignado`) | Sin restricción |
| Terminar (marcar como atendida) | Requiere al menos un correo enviado (`atendido`) | Sin restricción |
| Agregar entrada cuando estado es `atendido` | Bloqueado para todos los tipos; hay que cambiar el estado a `reabierto` primero | Ídem |

### Terminar y subida a Jira

- La subtarea (HU semanal) o la historia de usuario (HU independiente) puede crearse en Jira **al inicio**, cuando llega la asignación.
- Los comentarios se suben **solo al presionar Terminar** (o al guardar una entrada de cierre). Hasta entonces todo se puede editar.
- Si después del cierre aparece algo más (por ejemplo, el solicitante avisa por Teams que una tabla era otra), se cambia el estado a `reabierto`, se agregan entradas nuevas; la atención muestra pendientes y al presionar Terminar otra vez se procesan solo las nuevas.
- **HU semanal**: una subtarea bajo la HU semanal vigente.
- **HU independiente**: se crea la HU sola. Al terminar, Copilot analiza la bitácora en orden, propone las fases, Jhans las aprueba, se crean las subtareas y Copilot reparte cada comentario en la fase que corresponde. El último correo marca el cierre.
- Jhans elige semanal o independiente en la herramienta; Copilot no lo decide.

### Foco

- Un solo foco a la vez. Al cambiar, se cierra el tramo anterior con hora de inicio y fin.
- Focos especiales: **Pausa** (baño, agua, estirarse), **Idea** (pide una línea y la deja en *Ideas pendientes*), **Nueva reunión** (crea una CON sin proyecto y la pone como foco), **Terminar día**.
- Si un tramo quedó abierto de un día anterior, la página pide la hora en que terminó antes de permitir otro foco.
- Al escribir en una atención que no es el foco, la página pregunta si cambiar el foco.
- El tiempo es **solo registro interno**; no se envía a Jira.
- Al presionar **Terminar** en una atención que era el foco actual, el foco cambia automáticamente a **Pausa**. Así, al volver a la lista, la fila de esa atención ya no aparece resaltada en verde.
- El botón de pausa muestra un icono SVG (dos barras). Cuando el foco está en pausa y hay al menos un tramo de atención en el historial del día, el icono cambia a un triángulo (reproducir) y al pulsarlo reanuda la última atención del día. El botón se resalta con el estilo activo (verde) mientras el foco está en pausa.

### Ideas

Lista aparte. Cada idea se puede agregar a la bitácora de una atención (como entrada privada), convertir en atención nueva o descartar.

### Interrupciones (tipo NPL)

Quinto tipo de atención, para llamadas o chats de Teams sin agendar (a diferencia de CON, que es una reunión programada). Se decidió que fuera un tipo de atención más, no una entidad aparte, para reutilizar sin duplicar: numeración automática, carpetas, foco y tiempo, lista principal.

- El botón **Interrupción** del Foco crea la atención y la pone como foco en el mismo paso, sin pedir ningún dato. Se crea con el proyecto `INFRAS` y sin entorno: así tiene carpeta definitiva desde el inicio y entra a la cola del agente aunque nunca tenga padre (una atención temporal nunca llega a la cola). `INFRAS` es solo el valor por defecto: sin padre, Jhans puede cambiarlo al proyecto del equipo que llamó (campo *Proyecto* de la tarjeta, que mueve la carpeta a `NNN_<Proyecto>/000_SinEntorno/`); con padre, pasa al proyecto y a la carpeta del padre y el campo se oculta. Es una excepción acotada a la regla general "una atención ubicada no cambia de proyecto": solo NPL, solo sin padre y solo mientras el agente no la haya procesado (`cambiar_proyecto_interrupcion`). El título se auto-genera (`Interrupcion HH:MM`) y al cerrar se reemplaza por un título corto ("Llamada con Maria", "Chat con Juan") construido del tipo de contacto y quién contactó. El título **no** es el resumen: el resumen completo es un dato aparte (ver más abajo).
- Reutiliza la bitácora, pero con una sola entrada (tipo `interrupcion`) que se va editando en vivo: el campo `texto` son las notas libres, y sus capturas y archivos **no llevan descripción obligatoria** (única excepción a la regla general de la bitácora), porque se pegan al vuelo durante la llamada.
- **Cerrar interrupción** siempre detiene el cronómetro al presionarlo (pasa el foco a Pausa), independientemente de si el formulario de cierre se completa o no; así no se pierde el registro si Jhans retoma su trabajo de inmediato.
- **Edición posterior al cierre:** se bloquea solo cuando el agente ya procesó la interrupción (mismo criterio `atencion_procesada` que usa el resto de la herramienta), no simplemente por estar `atendido`. Mientras no esté procesada, el botón de cierre cambia a "Editar cierre" y Jhans puede corregir notas, adjuntos, padre y los datos de cierre. El resumen completo se guarda en `npl.resumen` (el `titulo` de la atención es un texto corto aparte, no el resumen) y se muestra con el mismo renderizador Markdown de la bitácora normal, que acorta enlaces largos.
- Los datos de cierre (tipo de contacto, quién contactó, ticket relacionado) viven en un campo `npl` propio de `ticket-datos.json`. Si al cerrar faltan datos obligatorios (tipo de contacto, quién, resumen), queda `pendiente_cierre: true` y la atención se muestra con la etiqueta "Pendiente de cerrar" en la lista hasta completarla.
- **Vínculo con un ticket existente:** se usa el mecanismo normal de **Atención padre**, no un campo aparte, pero con su propio selector dentro de la tarjeta de Interrupción (las secciones Datos, Jira y Descripción se ocultan para NPL, porque nada más de ellas aplica). Así la interrupción queda anidada en la carpeta del ticket y toma su proyecto en lugar de `INFRAS`, igual que cualquier otra atención hija. El campo de texto libre `ticket_relacionado` del formulario de cierre es solo un **respaldo** para cuando el ticket todavía no existe como atención en la herramienta (por ejemplo, llaman por un ticket de ServiceNow que Jhans no ha abierto aún): ahí no hay nada que seleccionar como padre, pero el número queda anotado para referencia futura o para que Copilot lo use después.
- **Enrutamiento a Jira** (responsabilidad del agente Copilot, etapa 5; la herramienta solo guarda el dato, no construye la subida), según la Atención padre de la interrupción:
  - **Sin padre:** comentario en la subtarea fija "Interrupciones y consultas no planificadas - semana X" de la HU semanal vigente.
  - **Padre con HU independiente** (la interrupción es hija de una raíz independiente): comentario en la fase fija **"Consultas y seguimiento"**, que debe existir siempre en toda HU independiente (no es una fase propuesta por el agente según el contenido de la bitácora: es obligatoria). Ver también la sección 7.4.
  - **Padre que es a su vez una subtarea de una HU semanal:** excepción a la regla general de hijos de una atención semanal (que crean una subtarea hermana nueva, sección 7.4): aquí el comentario va directo en esa subtarea ya existente, sin crear ninguna subtarea nueva para la interrupción.

## 6. Contrato con Copilot

- La herramienta agrega a `ticket-datos.json`: `id_herramienta`, `tipo`, `url_servicenow`, `workspace_edge` y `listo_para_jira`. Al escribir, relee el archivo y solo cambia sus campos, para no pisar los campos de Copilot: `correos[].resumen`, `subtareas`, `descripcion` y `titulo_jira` (ni las `key`/`url` de los issues).
- Copilot escribe el campo `descripcion` en `ticket-datos.json`: un párrafo breve que resume la atención, con ortografía corregida y coherencia entre los comentarios de la bitácora. La herramienta lo muestra en la vista de detalle como sección colapsable en formato Markdown, solo lectura para Jhans.
- Copilot procesa atenciones con `listo_para_jira` y entradas `para_jira: true` que aún no figuran como subidas.
- En cada comentario de `jira-comentarios_*.json`, Copilot agrega `bitacora_id` (o `bitacora_ids` si junta varias). Con `subido: true`, la herramienta muestra la entrada como enviada y la bloquea.
- El texto original de la bitácora **nunca se modifica**. En la limpieza (estado 1), Copilot escribe el texto corregido de cada entrada en `040_ProcesoJira/bitacora-correccion.json`, enganchado por `bitacora_id`. La herramienta muestra ambos (original y corregido). Lo que sube a Jira es el texto corregido.
- Copilot también escribe en `ticket-datos.json` el `titulo_jira` (título corto y claro para el issue) y, al crear issues, la `key` y la `url` completa de cada uno (HU y subtareas), para que la herramienta muestre el link directo.
- Las rutas de capturas en la bitácora son `{ "raiz": "trabajo" | "proceso", "ruta": "<relativa a la carpeta de la atención>" }`.

El formato completo está en `mi-dia/README.md`, sección 7.

### Navegación

- El logo **Focus Flow** del encabezado actúa como "Volver": desde cualquier vista de detalle regresa a la lista principal.

## 7. Etapa 5: adaptar el agente Copilot (siguiente)

Esta etapa cambia el agente **y la herramienta**, porque se agregan datos y vistas nuevas en ambos lados.

### 7.1 El giro

El agente deja de ser el punto de entrada. Ya no organiza inbox, no mueve archivos ni pregunta la clasificación: la herramienta ya dejó las carpetas y los JSON listos. El agente pasa a ser un **procesador de Jira** que:

- recibe las **dos raíces por variable de entorno** y encuentra los datos ya ubicados;
- **extrae el texto** del correo `.eml` (solo cabeceras y cuerpo) para analizar, redactar la descripción y tener contexto al armar la HU;
- lee y escribe JSON según el contrato de la sección 6.

La herramienta **sí se nombra** en las instrucciones del agente, para dar contexto de quién produce cada archivo.

**Primer tema (resuelto, a falta de probar en la laptop): cómo ve Copilot el agente y los datos a la vez.** `.github` vive en `agente-copilot/` y los datos en dos raíces de OneDrive. Copilot lee `.github` desde la raíz de cada carpeta abierta en VS Code. Se creó `atencion-tickets.code-workspace` (en la raíz del repo) que abre `agente-copilot/` junto con las dos raíces de datos; Jhans solo reemplaza las dos rutas absolutas de OneDrive. Falta probarlo en la laptop.

### 7.2 Comandos (entrada corta)

Jhans escribe poco. Tres gatillos:

| Comando | Cuándo | Qué hace |
|---|---|---|
| `/inicia <id>` | al llegar la asignación | crea el **padre** en Jira: la **HU** si es independiente, o una **subtarea** bajo la HU semanal vigente si es semanal. Nada más. |
| `/limpia <id>` | estado 1 (ver 7.3) | corrige el texto de la bitácora, crea la `descripcion` y escribe el `titulo_jira`. No sube nada a Jira. |
| `/procede` | estado 2 (ver 7.3) | recorre la **cola** y sube a Jira **todos** los terminados pendientes. |

El agente **no escanea** carpetas: lee `003_Herramienta/agente-cola.json`, que la herramienta mantiene con qué acción le toca a cada atención (`pendiente_inicio`, `pendiente_limpieza`, `pendiente_jira`). Cada fila incluye `raiz_id` y `hu_tipo_raiz`: en un hijo manda el tipo de la raíz. Con raíz semanal el hijo es su propia subtarea; con raíz independiente no tiene issue propio (no entra como `pendiente_inicio`) y sus entradas se analizan junto con las de la raíz al proponer las fases de la HU.

**Ejecución de Jira (actualizado):** el agente ya no solo entrega los scripts `.py`; los **ejecuta él** en la terminal de VS Code. Primero corre un `--dry-run` y, tras la confirmación **"crear"** de Jhans en el chat, la ejecución real. Esto evita copiar comandos y buscar carpetas. Las credenciales siguen solo en variables de entorno (deben estar a nivel usuario para la terminal).

### 7.3 Terminar se divide en dos estados

| Estado | Señal | Qué ocurre |
|---|---|---|
| **1. Limpieza** | Jhans lo marca en la herramienta | Con `/limpia`, el agente corrige **solo el texto** de cada entrada de la bitácora (oraciones coherentes, para dejar el historial limpio). **No une, no reordena, no cambia la estructura ni la cantidad** de entradas. Corrige **todas** las entradas, no solo las `para_jira`. Además crea la `descripcion` y el `titulo_jira`. El original nunca se toca: lo corregido va a `bitacora-correccion.json`. La limpieza es **incremental**: si `/limpia` corre otra vez (sin conforme, o tras reabrir y agregar entradas), salta las entradas con corrección vigente y solo corrige las nuevas o las editadas. Cada corrección guarda su fecha (`corregido`); si la entrada se editó en o después de esa fecha, la corrección vence: la herramienta deja de mostrarla (etiqueta "Correccion pendiente") y el siguiente `/limpia` la rehace. Re-corregir una vigente solo si Jhans lo pide. |
| **2. Terminado** | Jhans revisa lo corregido y da el conforme | Habilita `/procede`. El agente analiza los terminados y sube a Jira. |

### 7.4 Mapeo a Jira

- **Independiente** (flujo con el que arrancamos): el padre es la **HU**. Al `/procede`, el agente analiza la bitácora en orden, **propone las fases**, Jhans las aprueba y se crean las **subtareas** bajo esa HU; luego reparte los comentarios (el agente **razona** si van agrupados o uno por subtarea). Toda HU independiente incluye además una fase fija **"Consultas y seguimiento"** (no propuesta por el agente, siempre presente) para los comentarios de interrupciones (NPL) cuya atención padre cuelga de esa HU.
- **Semanal**: el padre es una **subtarea** bajo la HU semanal vigente. Si la atención **tiene hijos**, cada hijo es **otra subtarea** bajo la misma HU semanal (planas, hermanas; los hijos nunca suben a HU).
- **Selección con criterio**: entre las entradas `para_jira: true`, el agente no sube todas; descarta lo incoherente o redundante y deja solo lo que tiene sentido como comentario.

### 7.4b Sprint y HU semanales

- La **épica representa el trimestre** (p. ej. Q4 2026) y contiene **varios sprints** (unos tres, de ~5 semanas, aproximadamente mensuales). La épica solo la cambia Jhans, al cambiar de trimestre.
- Jhans **crea el sprint** y le da al agente su duración. El agente crea las **HU semanales** del sprint: una por semana de **lunes a viernes** dentro del rango. Se guardan en `config-jira.json` en `hu_semanales` (lista de `{ inicio, fin, key }`), que **reemplaza** a `hu_padre` + `hu_semana`. El config guarda **solo lo activo** (épica, sprint, hu_semanales); al cambiar de sprint se reemplazan, no se acumulan. El historial vive en Jira y en el `ticket-datos.json` de cada atención.
- Cada atención semanal se ubica, por su **fecha**, bajo la HU de la semana que le corresponde (dentro del sprint activo). Una fecha de fin de semana va a la semana que acaba de terminar.
- Las **HU independientes** no van en el config: viven en `jira.padre_key` de cada atención. Ambos tipos conviven en el sprint.
- **Cierre de semana** (mismo sprint): las subtareas abiertas **cambian de padre** a la HU de la semana siguiente (PUT del `parent`), sin duplicar. Queda historial (comentario de continuidad).
- **Cierre de sprint** (al siguiente, misma épica dentro del trimestre): lo que sigue abierto pasa como **Parte 02**; el agente crea las nuevas HU padre (semanales e independientes abiertas). Jhans crea el sprint y, al cambiar de trimestre, la épica nueva.

### 7.5 Archivos y dueños nuevos

| Archivo | Dueño | Contenido |
|---|---|---|
| `bitacora.json` | herramienta | texto original, intacto |
| `040_ProcesoJira/bitacora-correccion.json` | agente | texto corregido por `bitacora_id` (se escribe en `/limpia`) |
| `003_Herramienta/agente-cola.json` | herramienta | cola de pendientes del agente, para no escanear |
| `ticket-datos.json` (campos nuevos del agente) | agente | `descripcion`, `titulo_jira`, y `key` + `url` de cada issue creado |

### 7.6 Cambios en la herramienta (`mi-dia`)

- **Botón/estado nuevo** para el estado 1 (limpieza), separado de Terminado.
- Escribir y mantener `agente-cola.json`.
- Vista de detalle: la bitácora muestra cada entrada tipo **chat con toggle** original / corregido (lee `bitacora-correccion.json`).
- Vista de detalle: **sección "Jira" después de Datos**, con el `titulo_jira` y el **link clickeable** al issue (`url` guardada por el agente). La herramienta no toca config ni credenciales de Jira: solo renderiza la `url`.

### 7.7 Cambios por skill

| Skill | Cambio |
|---|---|
| `correo-procesar` | Ya no organiza inbox ni mueve archivos. Parte de la carpeta y el `ticket-datos.json` ya creados; extrae el texto del `.eml`, resume los correos y prepara los registros. Es la base de `/limpia`. |
| `jira-comentarios` | Fuente nueva: `bitacora.json` + `bitacora-correccion.json`. Registrar `bitacora_id`, aplicar criterio de selección, admitir **varias capturas por comentario** y buscar las capturas de avance en la raíz de trabajo. |
| `jira-subtareas` / `jira-historia-usuario` | `/inicia` crea el padre (HU o subtarea). `/procede` crea las fases de la independiente desde la bitácora, y las subtareas de hijos en la semanal. Guardar `key` y `url` en `ticket-datos.json`. |
| `indice-atenciones` | Eliminada del agente: el índice lo generará la herramienta. |
| `sprint-cierre` | Revisar que use las rutas nuevas (dos raíces). |
| `copilot-instructions.md` | Rutas de las dos raíces (variables de entorno), nombrar la herramienta y quién escribe qué, quitar ejemplos PowerShell heredados y reglas duplicadas (credenciales, `jira-ejecuciones.log` y la definición de HU semanal aparecen dos veces). |

Proyectos que no son de un proyecto real (`INFRAS`, `DOCINF`) deben agregarse a `proyectos` en `config-jira.json` con su destino de Jira.

## 8. Pendientes y extras

- Flujos A-D como lista de pasos en la herramienta (solo vista).
- Índice semanal generado por la herramienta.
- Relación DOC-ticket en la interfaz.
- Subida a Jira desde la herramienta, con un botón que ejecuta Jhans (credenciales desde variables de entorno), dejando a Copilot solo la redacción y el análisis.
- Limitaciones actuales: solo `.eml` (no `.msg`); las atenciones anteriores a la herramienta no aparecen porque no tienen `id_herramienta`.

## 9. Pruebas realizadas

Se probó de punta a punta con datos de ejemplo: creación de atenciones con y sin ID; correos con adjuntos, firmas incrustadas y un correo reenviado dentro de otro; capturas pegadas; edición; bloqueo de entradas enviadas; conservación de los campos de Copilot; movimiento de carpetas al completar la identidad y al cambiar entornos; foco, pausas, ideas y foco abierto del día anterior; rutas fuera de la carpeta bloqueadas; peticiones de otros sitios rechazadas. La interfaz se revisó en Chromium sin errores.

Queda por confirmar en la laptop: un `.eml` real de Outlook, las rutas de OneDrive y el botón para abrir carpetas en el Explorador.
