# Requisitos funcionales

Ultima actualizacion: 2026-10-25

Herramienta personal de Jhans para registrar y gestionar atenciones de
infraestructura/DevOps, llevar bitacora de trabajo y preparar la subida a Jira.
Se ejecuta como servidor local Python en la laptop corporativa con Windows.

---

## Atenciones

| ID | Descripcion | Estado |
|---|---|---|
| RF-001 | Crear atenciones con tipo (ticket, int, doc, con), titulo y proyecto. | implementado |
| RF-002 | Asignar numero interno automatico segun tipo (JSNT, JINT, JDOC, JCON). | implementado |
| RF-003 | Registrar ID de seguimiento externo (numero ServiceNow) para atenciones tipo ticket. | implementado |
| RF-004 | Asignar ID propio automatico (JINT/JDOC/JCON + correlativo) para tipos internos. | implementado |
| RF-005 | Asociar una atencion a un proyecto (Tracking Code de 6 letras). | implementado |
| RF-006 | Definir entornos de una atencion (DEV, PRE, PRO o combinaciones validas). | implementado |
| RF-007 | Crear atenciones temporales cuando faltan proyecto o ID; moverlas a carpeta definitiva al completar datos. | implementado |
| RF-008 | Marcar una atencion como padre de otra; la hija hereda el proyecto del padre. Una interrupcion no puede ser padre. | implementado |
| RF-009 | Anidar la carpeta de la atencion hija dentro de la carpeta de la atencion padre. | implementado |
| RF-010 | Auto-generar el nombre del area de trabajo Edge como `tracking_id-tracking_code`. | implementado |
| RF-011 | Cambiar entornos de una atencion definitiva; la herramienta mueve las carpetas automaticamente. | implementado |
| RF-012 | Terminar una atencion (marcar como atendida y lista para Jira). | implementado |
| RF-013 | Buscar y filtrar atenciones por ID, proyecto, titulo y estado. | implementado |
| RF-014 | Mostrar atenciones en arbol padre-hijo con colapso por rama. | implementado |
| RF-015 | Guardar URL de ServiceNow por atencion. | implementado |
| RF-016 | Abrir la carpeta de trabajo o de proceso de una atencion desde la interfaz (solo Windows). | implementado |
| RF-017 | Impedir cambiar el proyecto padre de una atencion ya ubicada definitivamente. | implementado |
| RF-047 | Crear atencion tipo interrupcion (NPL) con cronometro que arranca al presionar el boton, sin pedir datos iniciales; sin padre usa el proyecto INFRAS por defecto, que Jhans puede cambiar al del equipo que llamo mientras el agente no la procese; con padre toma el proyecto del padre. | implementado |
| RF-048 | Anotar notas de texto libre y adjuntar capturas, archivos o grabaciones sin descripcion obligatoria durante una interrupcion activa, ordenados cronologicamente. | implementado |
| RF-050 | Solicitar al cerrar una interrupcion el tipo de contacto, quien contacto y un resumen como obligatorios, y ticket relacionado y adjuntos adicionales como opcionales. El campo ticket relacionado es solo respaldo en texto libre para cuando el ticket aun no existe como atencion en la herramienta; si ya existe, el vinculo real es la Atencion padre (reutiliza el mecanismo existente de padre-hijo). | implementado |
| RF-051 | Calcular el tiempo total de una interrupcion desde que se abrio hasta que se cerro. | implementado |
| RF-052 | Dejar una interrupcion sin datos obligatorios completos en estado "Pendiente de cerrar" y mostrarla como alerta hasta completarse. | implementado |
| RF-056 | Permitir editar las notas, los adjuntos, la atencion padre y los datos de cierre de una interrupcion ya cerrada, mientras el agente no la haya procesado; mostrar el resumen en Markdown con enlaces largos acortados, igual que el resto de la bitacora. | implementado |
| RF-059 | Dejar lista para Jira una interrupcion cerrada con sus datos obligatorios completos, sin pasar por la limpieza ni el conforme; el agente corrige el resumen y Jhans lo revisa en el dry-run de la subida. | implementado |
| RF-058 | Ofrecer un check de "fase independiente" en una atencion hija de tipo int, doc o con cuya raiz tiene HU independiente, editable mientras no tenga issue en Jira, y ponerla en la cola de inicio como fase propia cuando esta marcado. | implementado |

## Bitacora

| ID | Descripcion | Estado |
|---|---|---|
| RF-018 | Agregar entradas de bitacora por atencion (avance, solicitud, asignacion, cierre). | implementado |
| RF-019 | Marcar cada entrada como para Jira o privada. | implementado |
| RF-020 | Adjuntar capturas de pantalla a una entrada con descripcion obligatoria. | implementado |
| RF-021 | Adjuntar archivos y correos .eml a una entrada. | implementado |
| RF-022 | Al arrastrar un .eml, extraer adjuntos automaticamente e ignorar imagenes incrustadas (firmas). | implementado |
| RF-023 | Detectar correos duplicados y no volver a guardarlos. | implementado |
| RF-024 | Editar entradas de bitacora no enviadas a Jira (texto, archivos, capturas). | implementado |
| RF-025 | Bloquear la edicion de entradas ya enviadas a Jira. | implementado |
| RF-026 | Mostrar la entrada de cierre como la que marca el estado atendido. | implementado |

## Foco

| ID | Descripcion | Estado |
|---|---|---|
| RF-027 | Registrar el foco de trabajo actual (una sola atencion a la vez). | implementado |
| RF-028 | Cambiar el foco cerrando el tramo anterior con hora de inicio y fin. | implementado |
| RF-029 | Focos especiales: Pausa, Idea, Nueva reunion, Terminar dia. | implementado |
| RF-030 | Detectar un tramo abierto del dia anterior y pedir la hora de cierre antes de continuar. | implementado |
| RF-031 | Acumular y mostrar el tiempo invertido por atencion. | implementado |
| RF-032 | Registrar ideas en una lista separada durante el foco. | implementado |
| RF-049 | Mantener el cronometro de una interrupcion corriendo en segundo plano aunque el usuario cambie de pestana. | implementado |

## Ideas

| ID | Descripcion | Estado |
|---|---|---|
| RF-033 | Listar ideas pendientes en la pantalla principal. | implementado |
| RF-034 | Agregar una idea como entrada de bitacora en una atencion existente. | implementado |
| RF-035 | Convertir una idea en una nueva atencion. | implementado |
| RF-036 | Descartar una idea. | implementado |

## Accesos rapidos

| ID | Descripcion | Estado |
|---|---|---|
| RF-037 | Gestionar una lista de accesos rapidos (URL + etiqueta). | implementado |
| RF-038 | Mostrar accesos rapidos en la pantalla principal como lista colapsable. | implementado |

## Estructura de carpetas

| ID | Descripcion | Estado |
|---|---|---|
| RF-039 | Crear carpetas de trabajo y de proceso con la estructura NNN_Proyecto/NNN_Entorno/NNN_ID al completar identidad. | implementado |
| RF-040 | Mantener dos raices separadas (trabajo compartido y proceso privado) con estructura espejo. | implementado |
| RF-041 | Atenciones temporales esperan en 004_SinAsignar hasta tener proyecto e ID. | implementado |
| RF-042 | Carpetas de hijos anidadas dentro de la carpeta del padre (no al mismo nivel). | implementado |
| RF-060 | Dejar en la carpeta de trabajo de cada atencion subida un README con titulo, proyecto, entorno, solicitante, fecha de asignacion, resumen de lo hecho y la lista de sus archivos, sin datos de Jira; generarlo al terminar la subida y a pedido para las atenciones ya subidas. | implementado |

## Jira (futuro)

| ID | Descripcion | Estado |
|---|---|---|
| RF-043 | Generar payloads JSON para comentarios de Jira a partir de la bitacora. | futuro |
| RF-044 | Crear historia de usuario o subtarea en Jira al llegar la asignacion. | futuro |
| RF-045 | Subir comentarios a Jira desde la herramienta con un boton que ejecuta Jhans. | futuro |
| RF-046 | Bloquear entradas subidas a Jira para evitar modificaciones. | implementado |
| RF-053 | Subir una interrupcion sin atencion padre como comentario en la subtarea fija de interrupciones de la HU semanal vigente. | futuro |
| RF-054 | Subir una interrupcion cuya atencion padre tiene HU independiente como comentario en la fase fija "Consultas y seguimiento", que se crea con la primera interrupcion que la necesita y se cierra tras el comentario si las demas fases de la HU ya estan finalizadas. | futuro |
| RF-055 | Subir una interrupcion cuya atencion padre es una subtarea de una HU semanal como comentario directo en esa subtarea existente, sin crear nada nuevo. | futuro |
| RF-057 | Crear en Jira, como subtarea propia bajo la HU de la raiz y sin pasar por la propuesta de fases, el issue de una atencion hija int/doc/con marcada como fase independiente; subir sus comentarios a esa subtarea y cerrarla en su propio /procede, sin que la raiz la incluya entre sus fases. | futuro |
