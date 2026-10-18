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

### Atención

Unidad de trabajo. Tipos:

| Tipo | ID | Proyecto | Entornos |
|---|---|---|---|
| `ticket` | Número de ServiceNow (`PTSK0000123`) | El del ticket | DEV, PRE, PRO o combinación |
| `int` | `INT001`, correlativo global automático | `INFRAS` (proyecto transversal) u otro | Como un ticket |
| `doc` | `DOC001`, automático | `DOCINF` (documentación propia) | `VARIOS` |
| `con` | `CON001`, automático | El del equipo que llamó | `VARIOS` |

- La documentación **de un ticket** no es una atención aparte: va como entradas en la bitácora de ese ticket y sube a Jira con él.
- El código propio (INT, DOC, CON) ocupa el lugar del Tracking ID, así Copilot lo trata como cualquier atención.
- **Tracking Code**: 6 letras, es el nombre de la carpeta del proyecto (`010_Proyaa` → `PROYAA`). Proyectos nuevos: siguiente número de 10 en 10.
- Las URL de ServiceNow cambian por ticket (no siguen un patrón), por eso se guardan a mano.

### Carpetas

Ambas raíces usan la estructura de la convención existente:

```
NNN_<Proyecto>/NNN_<Entorno>/NNN_<TrackingID>/
```

Entornos: `010_Dev`, `020_Pre`, `030_Pro`, `040_Varios`, `050_DevPre`, `060_PrePro`, `070_DevPrePro`. La combinación DEV + PRO sin PRE no existe y se rechaza.

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

### Terminar y subida a Jira

- La subtarea (HU semanal) o la historia de usuario (HU independiente) puede crearse en Jira **al inicio**, cuando llega la asignación.
- Los comentarios se suben **solo al presionar Terminar** (o al guardar una entrada de cierre). Hasta entonces todo se puede editar.
- Si después del cierre aparece algo más (por ejemplo, el solicitante avisa por Teams que una tabla era otra), se agregan entradas nuevas; la atención muestra pendientes y al presionar Terminar otra vez se procesan solo las nuevas.
- **HU semanal**: una subtarea bajo la HU semanal vigente.
- **HU independiente**: se crea la HU sola. Al terminar, Copilot analiza la bitácora en orden, propone las fases, Jhans las aprueba, se crean las subtareas y Copilot reparte cada comentario en la fase que corresponde. El último correo marca el cierre.
- Jhans elige semanal o independiente en la herramienta; Copilot no lo decide.

### Foco

- Un solo foco a la vez. Al cambiar, se cierra el tramo anterior con hora de inicio y fin.
- Focos especiales: **Pausa** (baño, agua, estirarse), **Idea** (pide una línea y la deja en *Ideas pendientes*), **Nueva reunión** (crea una CON sin proyecto y la pone como foco), **Terminar día**.
- Si un tramo quedó abierto de un día anterior, la página pide la hora en que terminó antes de permitir otro foco.
- Al escribir en una atención que no es el foco, la página pregunta si cambiar el foco.
- El tiempo es **solo registro interno**; no se envía a Jira.

### Ideas

Lista aparte. Cada idea se puede agregar a la bitácora de una atención (como entrada privada), convertir en atención nueva o descartar.

## 6. Contrato con Copilot

- La herramienta agrega a `ticket-datos.json`: `id_herramienta`, `tipo`, `url_servicenow`, `workspace_edge` y `listo_para_jira`. Al escribir, relee el archivo y solo cambia sus campos, para no pisar `correos[].resumen` ni `subtareas`.
- Copilot procesa atenciones con `listo_para_jira` y entradas `para_jira: true` que aún no figuran como subidas.
- En cada comentario de `jira-comentarios_*.json`, Copilot agrega `bitacora_id` (o `bitacora_ids` si junta varias). Con `subido: true`, la herramienta muestra la entrada como enviada y la bloquea.
- El texto original queda en la bitácora; el texto corregido por Copilot va al JSON de comentarios, donde Jhans lo revisa antes de subir.
- Las rutas de capturas en la bitácora son `{ "raiz": "trabajo" | "proceso", "ruta": "<relativa a la carpeta de la atención>" }`.

El formato completo está en `organizador-atenciones/README.md`, sección 7.

## 7. Etapa 5: adaptar el agente Copilot (siguiente)

**Primer tema a resolver: cómo ve Copilot el agente y los datos a la vez.** Antes, `.github` estaba dentro de la carpeta de datos. Ahora vive en `agente-copilot/` y los datos en dos raíces de OneDrive. Copilot lee `.github` desde la raíz de cada carpeta abierta en VS Code, así que la opción más probable es un archivo `.code-workspace` que abra `agente-copilot/` junto con las dos raíces. Hay que probarlo en la laptop.

Cambios por skill:

| Skill | Cambio |
|---|---|
| `correo-procesar` | Ya no organiza el inbox, no mueve archivos ni pregunta la clasificación (la herramienta lo hace). Parte de la carpeta y del `ticket-datos.json` creados, resume los correos y prepara los registros de Jira. |
| `jira-comentarios` | Nueva fuente: `bitacora.json`. Registrar `bitacora_id`. Admitir **varias capturas por comentario** (ajustar el script) y buscar las capturas de avance en la raíz de trabajo. |
| `jira-subtareas` / `jira-historia-usuario` | Crear la subtarea o la HU al llegar la asignación; fases de la HU independiente al terminar, a partir de la bitácora. |
| `indice-atenciones` | Candidata a eliminarse: el índice lo puede generar la herramienta. |
| `sprint-cierre` | Revisar que use las rutas nuevas. |
| `copilot-instructions.md` | Rutas de las dos raíces (variables de entorno), quién escribe qué archivo, quitar ejemplos PowerShell heredados y reglas duplicadas (credenciales, `jira-ejecuciones.log` y la definición de HU semanal aparecen dos veces). |

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
