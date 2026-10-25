# Organizador de atenciones

Herramienta local para organizar el día de trabajo en infraestructura: accesos rápidos, atenciones (tickets, trabajo interno, documentación y consultas), bitácora con capturas y correos, y registro de tiempo por foco.

Funciona como una página web que sirve un pequeño servidor en Python dentro de tu propia laptop (`http://127.0.0.1:8765`). No usa internet, no instala paquetes y solo acepta conexiones desde la misma máquina.

## Requisitos

- Python 3.9 o superior (solo la biblioteca estándar).
- Microsoft Edge u otro navegador moderno.
- Dos carpetas: una de **trabajo** (limpia, la que pueden ver otros) y una de **proceso** (privada).

## Contenido del repositorio

```
servidor.py              servidor local (Python, biblioteca estándar)
index.html               interfaz
ejemplos/accesos.json    ejemplo de accesos rápidos
README.md                esta guía
```

El repositorio no guarda datos. Tus datos viven en las carpetas que indiques con las variables de entorno.

## 1. Variables de entorno

Configúralas una sola vez en PowerShell. Se guardan a nivel de usuario, sin permisos de administrador:

```powershell
[Environment]::SetEnvironmentVariable("AT_RAIZ_TRABAJO", "C:\Users\TU_USUARIO\OneDrive - Empresa\010_AtencionTickes", "User")
[Environment]::SetEnvironmentVariable("AT_RAIZ_PROCESO", "C:\Users\TU_USUARIO\OneDrive - Empresa\Privado\010_AtencionTickesProceso", "User")
[Environment]::SetEnvironmentVariable("AT_CORREO", "tu.correo@empresa.com", "User")
```

| Variable | Para qué sirve |
|---|---|
| `AT_RAIZ_TRABAJO` | Carpeta limpia: correos, adjuntos y capturas de avance. Sin nada de Jira ni Copilot. El agente deja además un `README.md` por atención subida, como portada para quien entre a la carpeta (sin datos de Jira). |
| `AT_RAIZ_PROCESO` | Carpeta privada: JSON de la herramienta, archivos de Copilot y Jira, foco e ideas. |
| `AT_CORREO` | Tu correo. Los `.eml` que envías tú se guardan como `atendido`; el resto como `asignado`. |
| `AT_PUERTO` | Opcional. Puerto del servidor; por defecto `8765`. |

Las dos carpetas deben existir y ser distintas, y una no puede estar dentro de la otra. **Cierra y vuelve a abrir PowerShell** después de crearlas para que tomen efecto.

Para revisar los valores:

```powershell
$env:AT_RAIZ_TRABAJO; $env:AT_RAIZ_PROCESO; $env:AT_CORREO
```

## 2. Iniciar y detener

```powershell
cd "RUTA_DEL_REPOSITORIO"
python servidor.py
```

Abre `http://127.0.0.1:8765` en Edge. Para detenerlo, presiona `Ctrl+C` en la ventana de PowerShell.

Si falta alguna variable o una carpeta no existe, el servidor no arranca y te dice qué revisar.

## 3. Configurar Edge

- **Página de inicio:** Configuración → Inicio, página principal y nuevas pestañas → *Abrir estas páginas* → `http://127.0.0.1:8765`.
- **Botón de inicio:** en la misma sección, activa el botón de inicio y pon la misma dirección.
- **Fijar la pestaña:** clic derecho sobre la pestaña → *Anclar pestaña*.

## 4. Accesos rápidos

La primera vez se crea `003_Herramienta\accesos.json` en la raíz de proceso, copiado del ejemplo. Edítalo con tus enlaces y recarga la página:

```json
{
  "grupos": [
    { "nombre": "Gestion", "enlaces": [ { "nombre": "ServiceNow", "url": "https://..." } ] }
  ]
}
```

Los enlaces del banco quedan en tu carpeta privada, no en el repositorio.

## 5. Uso diario

**Crear una atención.** Botón *Nueva atención*:

| Tipo | Proyecto | ID | Entornos |
|---|---|---|---|
| Ticket | El del ticket | Número de ServiceNow | DEV, PRE, PRO o combinación |
| INT | `INFRAS` por defecto (o el del proyecto) | `INT001`, automático | Como un ticket |
| DOC | `DOCINF` por defecto | `DOC001`, automático | Varios |
| CON | El del equipo que te llamó | `CON001`, automático | Varios |

Si aún no tienes el número de ticket o el proyecto, déjalo vacío. La atención se guarda en una carpeta temporal privada (`004_SinAsignar`) y, cuando completes los datos en *Proyecto, ID y entornos*, la herramienta crea las carpetas definitivas en ambas raíces y mueve todo.

**Bitácora.** Cada atención tiene una línea de tiempo. Las entradas se agregan en el orden en que las creas:

| Tipo de entrada | Uso |
|---|---|
| Solicitud | Correo del solicitante, cuando empiezas antes de tener el ticket. |
| Asignación | Correo de asignación del ticket. Si no trae los adjuntos, arrástralos a mano o arrastra también el correo original. |
| Avance | Lo normal: qué hiciste, qué pasó, qué falta. |
| Cierre | Correo atendido. Marca la atención como atendida (paso 1 de abajo). |

- **Capturas:** pégalas con `Ctrl+V`. Cada una necesita una descripción, porque Copilot solo lee texto. En Solicitud, Asignación y Cierre puedes marcarla como *captura del correo*.
- **Correos:** arrastra el `.eml`. Se guarda con tu convención (`AAAAMMDD_correo_asignado.eml`) y sus adjuntos se extraen solos a `010_CorreoAsignadoAdjuntos` o `020_CorreoAtendidoAdjuntos`.
- **Para Jira o privada:** desmarca *Para Jira* en notas que son solo para ti.
- **Editar:** puedes editar cualquier entrada que aún no se haya subido a Jira.

**Terminar en dos pasos.** El cierre de una atención se hace en dos tiempos:

1. **Terminar** (botón *Terminar*, o una entrada de Cierre): marca la atención como *atendida*. El agente puede entonces limpiar el texto de la bitácora (corrige la redacción sin unir ni reordenar), escribir la descripción y proponer un título corto para Jira. Tú no pierdes nada: el texto original se conserva y en la bitácora hay un selector *Original / Corregido por el agente*.
2. **Dar conforme** (botón *Dar conforme*): cuando revisaste el texto corregido y estás de acuerdo, lo marcas listo para Jira. Recién aquí el agente sube los comentarios. Si después agregas más entradas (reabres), vuelves a terminar y dar conforme, y solo se procesan las nuevas.

**Lista de atenciones.** La tabla muestra todas tus atenciones ordenadas primero por estado y luego, dentro de cada grupo, por fecha de actualización (la más reciente arriba):

| Orden | Estado | Significa |
|---|---|---|
| 1 | Reabierto | Estaba cerrada y volvió a activarse; requiere atención inmediata. |
| 2 | En curso | Trabajo activo del día, incluyendo las temporales sin ID. |
| 3 | En espera | Bloqueada, esperando algo externo. |
| 4 | Atendido | Terminada. |
| 5 | Descartado | Archivada sin completar. |

La columna **Tiempo** muestra el tiempo acumulado de foco registrado para esa atención (suma de todos los tramos). Las atenciones sin ningún tramo de foco muestran la celda vacía.

**Foco.** En la portada, un clic en una atención la marca como tu foco. Al cambiar de foco se cierra el tramo anterior. El encabezado de la página muestra el nombre de la atención en foco y la duración del tramo actual; hacer clic en ese texto abre directamente su bitácora.

- *Pausa*: baño, agua, estirarte.
- *Idea*: algo que se te ocurrió; queda en *Ideas pendientes* para decidir después.
- *Nueva reunión*: crea una CON sin proyecto y la pone como foco al instante.
- *Interrupción*: ver más abajo.
- *Terminar día*: cierra el último tramo. Si lo olvidas, al día siguiente la página te pide la hora en que terminaste.
- *Ver mi día*: totales y tramos de hoy.

El tiempo es solo un registro interno y no se envía a Jira.

**Interrupción.** Para llamadas o chats de Teams que llegan sin aviso (tipo NPL, numeración `JNPL001` automática). Botón *Interrupción* en Foco:

- Al presionar, el cronómetro arranca de inmediato; no se pide ningún dato. Se crea con el proyecto `INFRAS` y sin entorno (carpeta `NNN_Infras/000_SinEntorno/`). Mientras no tenga padre puedes cambiarlo en el campo *Proyecto* de la tarjeta (por ejemplo, al del equipo que llamó) y la carpeta se mueve a `NNN_<Proyecto>/000_SinEntorno/`. Si le asignas un padre, el campo desaparece y toma el proyecto y la carpeta del padre. Ambos se pueden cambiar mientras el agente no la haya procesado.
- Mientras está abierta, la vista de la atención muestra solo una zona de *Notas* (texto libre que se guarda solo mientras escribes) y una zona de adjuntos: pega capturas con `Ctrl+V` o arrastra archivos; a diferencia de la bitácora normal, **no piden descripción** y se ordenan por orden de llegada.
- *Cerrar interrupción* detiene el cronómetro al instante (pasa el foco a Pausa) y abre un formulario con: tipo de contacto (Llamada o Chat Teams), quién contactó y un resumen, todos obligatorios; y un ticket relacionado, opcional. El título de la atención queda corto ("Llamada con Maria", "Chat con Juan"); el resumen completo se guarda aparte y solo se ve dentro de la tarjeta de Interrupción.
- Si guardas el cierre sin completar los tres campos obligatorios, la interrupción queda *Pendiente de cerrar*: aparece con esa etiqueta en la lista de atenciones hasta que vuelvas a abrirla y termines de llenarlos. El cronómetro ya quedó detenido, así que no se pierde el tiempo registrado.
- Una vez cerrada, el resumen se muestra en Markdown (igual que la bitácora normal, con los enlaces largos acortados). Mientras el agente Copilot no haya procesado la interrupción, el botón cambia a *Editar cierre* y puedes corregir notas, adjuntos, padre o los datos de cierre cuando haga falta.
- **Vincular con un ticket existente:** usa *Atención padre* dentro de la tarjeta de Interrupción (la sección Datos no se muestra para este tipo). La interrupción se anida en la carpeta del padre y toma su proyecto en lugar de `INFRAS`. El campo *Ticket relacionado* del formulario de cierre es solo texto libre de respaldo para cuando el ticket todavía no existe como atención en la herramienta. Al revés no se puede: una interrupción nunca aparece como *Atención padre* de otra atención, porque no tiene issue en Jira donde colgar hijas.
- **Camino a Jira:** una interrupción no pasa por *Terminar*, limpieza ni *Dar conforme*. Cerrada con los tres datos obligatorios, queda lista para subir (*Por subir* en la lista). El agente corrige el resumen en `/procede`, te lo muestra en el dry-run y lo sube cuando confirmas con "crear"; al quedar subida pasa a *En Jira*.
- A dónde sube el agente Copilot el comentario de la interrupción depende de la Atención padre: sin padre, va a la subtarea fija de interrupciones de la HU semanal vigente; con padre de HU independiente, a la fase fija "Consultas y seguimiento" de esa HU (se crea con la primera interrupción que la necesita); con padre que ya es una subtarea de una HU semanal, directo como comentario en esa subtarea, sin crear nada nuevo.

**URLs en la bitácora.** Las URLs pegadas en el texto de una entrada se convierten automáticamente en enlaces; se muestra solo el dominio (`empresa.atlassian.net/…`) y la URL completa aparece al pasar el mouse. El formato Markdown `[texto](https://...)` y `[texto](www....)` también genera enlaces.

## 6. Dónde se guarda cada cosa

Las dos raíces tienen la misma estructura `proyecto / entorno / atención`, así cada atención tiene su par.

**Raíz de trabajo** (limpia):

```
NNN_Proyecto\060_PrePro\NNN_PTSK0000000\
    20261005_correo_asignado.eml
    20261020_correo_atendido.eml
    010_CorreoAsignadoAdjuntos\
    020_CorreoAtendidoAdjuntos\
    030_ProcesoAtencion\          capturas de avance y archivos de trabajo
```

**Raíz de proceso** (privada):

```
003_Herramienta\
    accesos.json
    ideas.json
    agente-cola.json              pendientes del agente, para que no escanee
    010_Focos\AAAAMMDD_focos.json
004_SinAsignar\                   atenciones sin proyecto o ID todavía
NNN_Proyecto\060_PrePro\NNN_PTSK0000000\
    ticket-datos.json
    bitacora.json
    040_ProcesoJira\              capturas de correo y archivos de Copilot y Jira
        bitacora-correccion.json  texto corregido por el agente
```

Los proyectos nuevos toman el siguiente número de 10 en 10 (`040_Infras`), con el mismo nombre en ambas raíces.

## 7. Formato de los datos (para Copilot)

**Quién escribe qué:**

| Archivo | Lo escribe | Notas |
|---|---|---|
| `ticket-datos.json` | La herramienta | Copilot completa `correos[].resumen`, `subtareas`, `descripcion`, `titulo_jira` y las `key`/`url` de los issues. La herramienta nunca toca esos campos. |
| `bitacora.json` | La herramienta | Copilot solo lo lee; el texto original nunca se modifica. |
| `040_ProcesoJira\bitacora-correccion.json` | Copilot | Texto corregido de la bitácora por `bitacora_id`: `{"correcciones": {"<id>": {"texto": "...", "corregido": "AAAA-MM-DD HH:MM"}}}`. La herramienta lo lee para mostrar original / corregido. Si la entrada se editó en o después de `corregido`, la corrección no se muestra y aparece "Correccion pendiente". |
| `040_ProcesoJira\jira-*.json` | Copilot | La herramienta solo los lee para saber qué entradas ya se subieron. |
| `003_Herramienta\agente-cola.json` | La herramienta | Cola de pendientes del agente (`pendiente_inicio`, `pendiente_limpieza`, `pendiente_jira`), para que no escanee. Una interrupción cerrada completa entra directo como `pendiente_jira`. |

**Campos que la herramienta agrega a `ticket-datos.json`:** `id_herramienta`, `tipo` (`ticket`, `int`, `doc`, `con`, `npl`), `url_servicenow`, `workspace_edge`, `listo_para_limpieza` (fecha del *Terminar*, paso 1) y `listo_para_jira` (fecha del *Dar conforme*, paso 2). Una interrupción no usa estos dos: su paso a Jira lo marca el cierre completo.

**Campo `npl` (solo en atenciones tipo NPL, interrupciones):** `{ "tipo_contacto": "llamada" | "chat" | "", "quien": "...", "resumen": "...", "ticket_relacionado": "...", "pendiente_cierre": true | false }`. Se completa al *Cerrar interrupción*; si falta algún dato obligatorio, `pendiente_cierre` queda en `true` y la herramienta la muestra como alerta hasta que se complete. El agente nunca lo modifica: el resumen corregido lo deja en `bitacora-correccion.json`. `ticket_relacionado` es solo texto libre de respaldo (ticket que aun no existe como atencion); el vinculo real para el enrutamiento a Jira es `padre_id`, que el agente lee junto con el `hu_tipo` de la raiz de ese padre.

**Campos que agrega el agente a `ticket-datos.json`:** `titulo_jira` (titulo corto para el issue), `descripcion`, y en una independiente un objeto `jira` con la HU creada: `{ "padre_key": "...", "padre_url": "...", "tipo_padre": "hu" }` (una semanal no usa `jira`). En `subtareas[]`, cada una lleva su `key` y `url`. La herramienta nunca pisa estos campos.

**`bitacora.json`:**

```json
{
  "entradas": [
    {
      "id": "e20261020111500a1b2",
      "n": 3,
      "tipo": "avance",
      "fecha": "2026-10-20 11:15",
      "texto": "Se aprobo el PR, falta agendar la sesion de despliegue",
      "para_jira": true,
      "capturas": [
        { "raiz": "trabajo", "ruta": "030_ProcesoAtencion/20261020_111500_captura.png", "descripcion": "PR aprobado" }
      ],
      "correos": [],
      "archivos": [],
      "editado": ""
    }
  ]
}
```

- `raiz` indica en qué raíz está el archivo; `ruta` es relativa a la carpeta de la atención en esa raíz.
- `tipo`: `solicitud`, `asignacion`, `avance`, `cierre` o `interrupcion` (una sola entrada por atención NPL, con las notas y adjuntos de la interrupción; sus capturas y archivos no llevan `descripcion` obligatoria).

**Cómo marca Copilot lo que ya subió:** en cada comentario de `jira-comentarios_*.json` agrega `"bitacora_id"` (o `"bitacora_ids"` si un comentario junta varias entradas). Cuando ese comentario queda con `"subido": true`, la entrada se muestra como *Enviada a Jira* y se bloquea su edición.

**Qué debe procesar Copilot:** no necesita escanear las carpetas. Lee `003_Herramienta/agente-cola.json`, que lista cada atención pendiente con su `accion`: `pendiente_inicio` (crear el padre en Jira), `pendiente_limpieza` (corregir el texto, escribir descripción y título) o `pendiente_jira` (subir los comentarios de las entradas `para_jira: true` aún no subidas). Cada fila trae su `relativa` para ubicar los archivos en ambas raíces, y `raiz_id`, `hu_tipo_raiz` y `fase_independiente` (la atención raíz, su tipo de HU y si la hija es una fase aparte), que el agente usa en los hijos en lugar de su propio `hu_tipo`. Un hijo cuya raíz es independiente no aparece como `pendiente_inicio`: no tiene issue propio, sus comentarios van a las fases de la HU de la raíz. **Excepción:** si está marcado como fase independiente (`fase_independiente: true`; solo int, doc o con), sí aparece como `pendiente_inicio` y obtiene su propia subtarea bajo la HU de la raíz.

## 8. Limitaciones conocidas

- Solo se leen correos `.eml`. Los `.msg` de Outlook no se procesan; guárdalos como `.eml` o adjúntalos como archivo.
- La combinación de entornos DEV y PRO sin PRE no existe en la convención de carpetas y se rechaza.
- Las atenciones creadas antes de esta herramienta no aparecen en la lista, porque no tienen `id_herramienta`.
- *Carpeta de trabajo* y *Carpeta de proceso* abren el Explorador solo en Windows.

## 9. Lista de prueba

1. El servidor arranca y muestra las dos raíces.
2. La página abre en `http://127.0.0.1:8765` y muestra los accesos.
3. Crear un ticket sin número: queda en `004_SinAsignar`.
4. Arrastrar un `.eml` real de Outlook en una entrada de Asignación: se guarda con su fecha y se extraen sus adjuntos.
5. Pegar una captura con `Ctrl+V`, describirla y guardar.
6. Completar proyecto, número y entornos: las carpetas aparecen en ambas raíces con el mismo nombre.
7. Editar una entrada.
8. Cambiar el foco entre dos atenciones, usar *Pausa* y revisar *Ver mi día*.
9. Revisar que la raíz de trabajo no tenga ningún JSON.
10. Interrupción: abrirla, pegar una captura sin descripción, cerrarla sin el resumen (debe quedar *Pendiente de cerrar*) y luego completar el cierre.
