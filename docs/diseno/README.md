# Focus Flow — rediseño de interfaz

Esta carpeta contiene el rediseño acordado de Focus Flow. Es **referencia de diseño**, no código para copiar tal cual.

## Contenido

| Archivo | Pantalla |
|---|---|
| `pantallas/01_vista_principal.dc.html` | Vista principal: foco, lista de atenciones, accesos rápidos, ideas |
| `pantallas/02_detalle.dc.html` | Detalle de una atención: cabecera, pasos a Jira, bitácora, edición de datos |
| `pantallas/03_nueva_atencion.dc.html` | Formulario de nueva atención |
| `pantallas/04_interrupcion.dc.html` | Vista de interrupción (NPL) |
| `pantallas/05_colores.dc.html` | Tokens de color en modo claro y oscuro |

### Cómo leer los archivos `.dc.html`

Son prototipos de una herramienta de diseño. No se abren solos en el navegador, pero el código se lee fácilmente:

- El HTML dentro de `<x-dc>` es la estructura. Los estilos van en línea (`style="..."`).
- `{{valor}}` es un dato que viene de la función `renderVals()` del script al final del archivo.
- `<sc-if value="{{cond}}">` muestra un bloque solo si se cumple la condición.
- `<sc-for list="{{lista}}" as="x">` repite un bloque por cada elemento.
- El script `class Component extends DCLogic` tiene la lógica de ejemplo y los datos falsos. Las opciones de `data-props` (por ejemplo `estadoFoco`, `paso`, `vista`) solo sirven para ver los distintos estados en el prototipo.

Para la implementación hay que tomar de aquí la estructura, los textos, los colores y el comportamiento, y adaptarlos al código actual de `mi-dia/static/`.

---

## 1. Vista principal

### Cabecera
- Logo, píldora de foco y buscador.
- La píldora de foco aparece en **todas las pantallas**:
  - En foco (verde): "En foco: PTSK0001234 1h 22m".
  - En pausa (ámbar): "En pausa: …".
  - Sin foco (gris): "Sin foco".
- Al hacer clic en la píldora se abre la atención en foco.

### Franja de interrupción
- Mientras hay una interrupción activa, se muestra una franja rosada arriba con el cronómetro **con segundos**, y los botones "Anotar" y "Cerrar interrupción".

### Panel de foco
- **Estados:**
  - **En foco:** muestra el Tracking ID, el título y el tiempo en **horas y minutos** ("1h 22m").
  - **En pausa:** el botón Pausa pasa a ser **Reanudar** (botón principal). Reanudar solo se ofrece si la última atención sigue abierta (en curso, en espera o reabierto).
  - **Sin foco:** "¿En qué trabajas ahora?". El botón Pausa se oculta. Al **terminar** (o descartar) la atención en foco, el panel pasa a este estado "Sin foco" aunque internamente el tramo quede en pausa.
  - **Foco abierto de ayer:** el panel queda bloqueado y pide la hora de cierre antes de continuar.
- **Botones:** Pausa/Reanudar, Idea `I`, Reunión, Interrupción `N` y, separado a la derecha, **Terminar día** (botón con borde e ícono de luna). Terminar día pide confirmación **en línea** dentro del panel ("¿Terminar el día? Se cerrará el foco actual a las HH:MM") con Cancelar y Terminar día; sin `confirm()`.
- **Idea:** abre un campo **crema** dentro del panel, sin `prompt()`. Enter guarda (se añade a Ideas pendientes, no cambia el foco), Esc cierra y, si queda vacío, se cierra al perder el foco. El botón Guardar es oscuro.
- **Reunión:** abre un campo **lila** "Título de la reunión (el proyecto lo asignas al terminar)" dentro del panel, sin `prompt()`. "Iniciar" (botón oscuro) crea la atención CON, pasa el foco a ella y abre su detalle. Esc cierra y, si queda vacío, se cierra al perder el foco.
- **Atajos de teclado:** `I` abre Idea y `N` inicia una interrupción. Solo funcionan cuando el cursor **no** está en un campo de texto. Los botones muestran la tecla en un pequeño `<kbd>`.

### Lista de atenciones
- **Filtros:** Abiertas | Por revisar (con contador) | Todas. Botón "+ Nueva atención".
- **Cada fila tiene 3 zonas:**
  1. Línea 1: etiqueta de tipo (ancho fijo, 46 px), **Tracking ID** en negrita, `- PROYECTO - ENTORNO`. En DOC, CON y NPL no se muestra el entorno.
  2. Línea 2: el tiempo de foco debajo de la etiqueta de tipo, alineado con ella, y el título alineado con el Tracking ID.
  3. A la derecha: una sola etiqueta de estado y la acción (Enfocar / En foco).
- **Etiqueta de estado:** una sola etiqueta de **ancho fijo (112 px)**, alto 24 px, texto centrado. Une el estado y el camino a Jira:
  - En curso / En espera / Reabierto / Descartado: fondo de superficie, borde de 1 px y una **marca de color a la izquierda**; texto en gris medio.
  - **Por limpiar** (ámbar), **Por revisar** (rosado), **Por subir** (azul), **En Jira** (verde con ✓). Textos cortos.
  - La columna de la etiqueta de estado mide **120 px**.
- **Fila en foco:** fondo verde suave, barra verde de 4 px a la izquierda y etiqueta "En foco" en verde sólido.
- **Terminadas** (En Jira) y **descartadas:** la fila se ve atenuada (opacidad ~55 %). Las descartadas además llevan el título tachado. Solo aparecen con el filtro "Todas".
- **Hijas:** van indentadas, con una línea a la izquierda. En una fila con hijas, **la columna izquierda** (etiqueta de tipo y, debajo, el tiempo) es el botón para contraer y expandir; la etiqueta de tipo lleva en su esquina un círculo con el número de hijas (borde del color del tipo = expandida; sólido = contraída; verde si hay una hija en foco con el padre contraído). El estado contraído/expandido se guarda por atención.
- **Temporales:** etiqueta "Temporal" y "Sin Tracking ID" / "Sin proyecto".
- **Espacio:** las filas tienen bastante aire entre sí (16 px arriba y abajo en las principales).

### Columna derecha
- **Accesos rápidos:**
  - Grupos colapsables dentro de una caja con **altura máxima y scroll propio**, para que Ideas no se mueva.
  - Cada enlace es una tarjeta: ícono cuadrado con la inicial, nombre, descripción corta y flecha ↗.
  - El color del ícono se asigna **automáticamente por grupo**, según el orden en `accesos.json`.
- **Ideas pendientes:**
  - Cada idea tiene tres acciones: A bitácora, Nueva atención y Descartar.
  - "A bitácora" abre en la misma tarjeta un selector de atención (por defecto la que está en foco) con Cancelar / Agregar.

### Abrir una atención pasa el foco
- Abrir una atención **abierta** (en curso, en espera o reabierta) le pasa el foco.
- Aparece un aviso abajo, "Foco en XXXX · **Deshacer**", que desaparece solo a los **5 segundos**. Deshacer devuelve el foco a la atención anterior sin registrar tiempo.
- Abrir una atención atendida o descartada **no** cambia el foco.

---

## 2. Detalle de una atención

### Cabecera (modo lectura)
- Línea 1: `[TIPO] TRACKING_ID - PROYECTO - ENTORNO · HU`, y el selector de estado a la derecha (En curso, En espera, Descartado; si está reabierta, "Reabierto" aparece seleccionado). Elegir **Descartado** pide confirmación **en línea** en la cabecera (Cancelar / Descartar); En curso y En espera se guardan directo. En **atendido**, en vez del selector se muestra "Atendido" y el botón **Reabrir**.
- Línea 2: título y lápiz ✎ para editar.
- Línea 3: accesos pequeños en gris: ServiceNow ↗, Área Edge (copia el nombre y muestra "Copiado"), Trabajo y Proceso (abren las carpetas).
- ServiceNow y Área Edge **solo aparecen en tickets**.
- La antigua columna "Datos generales" se eliminó. La bitácora ocupa todo el ancho.

### Cabecera (modo edición, al pulsar ✎)
- Mismos campos y diseño que Nueva atención.
- Si la atención ya tiene carpetas definitivas, el Tracking ID, el proyecto y los entornos aparecen bloqueados en gris, con un candado y un aviso. Solo se editan el título, la HU y la URL de ServiceNow.
- Si es temporal, todo es editable y aparece también la atención padre.

### Reunión sin proyecto (CON)
- Bajo los accesos aparece un aviso ámbar compacto: "Falta el proyecto del equipo que te llamó [______] Guardar".
- Si se pulsa **Terminar** y falta el proyecto, la barra de guía pide el proyecto con los botones "Cancelar" y "Guardar y terminar".

### Pasos hacia Jira
- Cuatro pasos: Trabajo, Limpieza, Conforme, Jira. Debajo hay una línea de guía con la acción del momento.
- **Textos neutros:** no se menciona Copilot ni los comandos `/limpia` o `/procede`.
- "Dar conforme" queda **deshabilitado** con un tooltip ("Disponible cuando la bitácora esté corregida") mientras ninguna entrada tenga `texto_corregido`.
- En "Revisar y dar conforme", las entradas para Jira se muestran con el **original y el corregido lado a lado**.
- El botón **Terminar** se mantiene para todos los tipos. Solo el ticket exige el correo de respuesta.

### Bitácora
- Las entradas van en orden de creación. Las subidas a Jira se ven bloqueadas con un candado.
- **Las capturas se muestran con su descripción debajo.**
- **Markdown:** negrita, listas, código en línea y **bloques de código** estilo Notion: fondo crema `#F7F6F3`, texto `#37352F`, borde `#EDECE9` y letra monoespaciada. En modo oscuro: fondo `#2F2F2F` y texto `#E6E6E5`.

### Nueva entrada (barra fija abajo)
- Es una barra de una línea pegada al borde inferior ("+ Escribe una entrada…"). Al hacer clic se expande con el formulario completo, y una flecha la minimiza sin perder lo escrito.
- Al abrir el detalle, la vista baja sola hasta la **última entrada**.
- **Tipo:** botones Avance (por defecto), Solicitud, Asignación y Cierre. Cierre muestra el aviso "Al guardar, la atención pasa a Atendido".
- **Texto:** acepta Markdown, con una ayuda pequeña debajo.
- **Capturas pegadas (Ctrl+V) o arrastradas:**
  - Se muestran **en vertical**: imagen a la izquierda y descripción amplia a la derecha.
  - El checkbox **"Captura del correo"** viene marcado por defecto cuando el tipo es Solicitud, Asignación o Cierre. Con el checkbox marcado, la descripción es opcional. Si no, es obligatoria y el campo vacío se marca en rojo, **sin texto adicional**.
- **Para Jira:** checkbox marcado por defecto.
- **Validaciones en el formulario, no con alertas:** "Agregar entrada" queda deshabilitado si la entrada está vacía, si falta la descripción de una captura o si el ticket aún no tiene correo recibido. En ese último caso aparece el aviso "Primero registra el correo de Solicitud o Asignación".
- **Foco distinto:** aviso pequeño "No es tu foco actual · Enfocar", sin `confirm()`.
- **Atención atendida:** en lugar del formulario aparece "Reábrela para agregar entradas" con el botón **Reabrir**.

---

## 3. Nueva atención

- **Tipo:** 4 botones en una fila (Ticket, Iniciativa interna, Documentación, Consulta o Reunión). NPL no se crea desde aquí.
- **Tracking ID y Título** en la misma fila.
  - Ticket: Tracking ID editable (letras, números, `-`, `_`), opcional.
  - Tipos propios: solo lectura, con el siguiente correlativo de **10 dígitos** (`JINT0000000002`).
  - Título obligatorio.
- **Atención padre** en una fila propia, **antes** del proyecto. Al elegir un padre se ocultan proyecto, entornos y HU, y aparece "Hereda proyecto, entornos y HU de …".
- **Proyecto, Entornos y HU** en un bloque gris en una sola fila:
  - Proyecto: 6 letras con autocompletado. Valor por defecto según el tipo: INFRAS para INT, DOCINF para DOC, vacío para Ticket y CON.
  - Entornos: botones DEV / PRE / PRO. DEV + PRO sin PRE muestra un error y bloquea Crear.
  - HU: Semanal | Independiente.
- **Solo en tickets:** URL ServiceNow y Área de trabajo Edge en la misma fila. El área se sugiere como `NUMERO-PROYECTO`.
- **Nota por tipo** debajo, usando el término **Tracking ID**, no "número interno".
- **Pie:** a la izquierda, cómo nacerá la atención (verde "Se creará con sus carpetas definitivas" o ámbar "Se creará como temporal: falta …"). A la derecha, Cancelar y Crear. Crear abre el detalle.
- **Desde una idea:** el título viene precargado y aparece un aviso. Al crear, la idea pasa a "convertida".

---

## 4. Interrupción (NPL)

- **Cabecera:** `[NPL] JNPL… - PROYECTO`, el estado y el título ("Interrupcion HH:MM"; al cerrarla, "Llamada con …" o "Chat con …"). Cronómetro grande **con segundos**.
- **Atención padre y Proyecto** en una fila. Con padre, el proyecto se muestra heredado y sin campo.
- **Notas privadas:** se guardan solas (debounce de 800 ms) con el indicador "Guardando…" / "Guardado".
- **Adjuntos:** miniaturas **sin descripción obligatoria**, y un recuadro para pegar, arrastrar o elegir archivos.
- **Un solo botón de acción**, abajo a la derecha:
  - Durante la llamada: **Cerrar interrupción**. Pausa el foco y abre el bloque de cierre.
  - Con el bloque abierto o pendiente: **Guardar cierre**.
  - "Cancelar interrupción" va como texto rojo a la izquierda.
- **Bloque de cierre:** tipo de contacto (Llamada Teams | Chat Teams), quién contactó, ticket relacionado (se oculta si hay padre) y resumen (Markdown).
- **Pendiente de cerrar:** aviso ámbar con lo que falta y los campos vacíos marcados en rojo.
- **Cancelar:** confirmación dentro de la misma tarjeta, no con `confirm()`.
- **Procesada:** todo en solo lectura con el aviso "Esta interrupción ya fue procesada. Solo lectura".

---

## 5. Colores

- Ver `pantallas/05_colores.dc.html`. Los nombres de token son los mismos en claro y oscuro; solo cambia el valor.

| Token | Claro | Oscuro |
|---|---|---|
| Fondo página | `#F4F3F8` | `#141318` |
| Superficie | `#FFFFFF` | `#1E1D24` |
| Superficie suave | `#F8F7FB` | `#26252E` |
| Borde | `#E6E4EE` | `#34323D` |
| Texto | `#1C1A27` | `#ECEAF3` |
| Texto secundario | `#5F5B70` | `#A9A5B8` |
| Acento | `#C2185B` | `#E8558E` |
| En foco | `#1A7F46` / fondo `#E3F5EA` | `#5FD08F` / fondo `#183324` |
| Aviso ámbar | texto `#5C4410` / fondo `#FFF6E5` | texto `#F2C76B` / fondo `#33290F` |
| Error | `#B42318` | `#FF8A80` |
| Bloque de código | fondo `#F7F6F3` / texto `#37352F` | fondo `#2F2F2F` / texto `#E6E6E5` |
| Ticket | `#1E4FC2` / `#E4ECFF` | `#8FB2FF` / `#1C2A4A` |
| Iniciativa | `#0B6B62` / `#DCF2EE` | `#6FD6C6` / `#123330` |
| Documentación | `#8A4B08` / `#FBEDD3` | `#F2B866` / `#3A2A12` |
| Consulta | `#6127C9` / `#ECE4FD` | `#B79BFF` / `#2A2045` |
| Interrupción | `#A3154C` / `#FCE7F0` | `#FF8DB8` / `#3D1828` |
| Revisar y dar conforme | `#A3154C` / `#FDF0F5` | `#FF8DB8` / `#33192A` |
| En Jira | `#1A7F46` / `#E3F5EA` | `#5FD08F` / `#183324` |
| Texto medio | `#3B3850` | `#CFCBDB` |
| En foco (sólido) | `#1F9D55` | `#5FD08F` |
| Texto sobre foco sólido | `#FFFFFF` | `#0B1F14` |
| Fondo fila en foco | `#EAF7EF` | `#183324` |
| Píldora foco (fondo / borde / texto) | `#F2FAF5 / #CDEBD8 / #1A5E36` | `#183324 / #2A5A3D / #8FE3B1` |
| Por limpiar | `#8A5E00` / `#FFF4DC` | `#F2C76B` / `#33290F` |
| Por revisar | `#A3154C` / `#FDF0F5` | `#FF8DB8` / `#33192A` |
| Por subir | `#1E4FC2` / `#EEF3FF` | `#8FB2FF` / `#1C2A4A` |
| Campo Idea (fondo) | `#FFFCF2` | `#2A2516` |
| Campo Reunión (fondo) | `#F6F2FE` | `#2A2045` |

Los tokens del foco se exponen como variables CSS: `--foco` (texto verde), `--foco-solido` (barra de la fila, fondo de la etiqueta "En foco" y puntos), `--foco-sobre-solido` (texto y punto dentro de la etiqueta) y `--foco-fila` (fondo de la fila en foco).

Tipografía: **fuentes del sistema** (no se usan Google Fonts por la laptop corporativa). Texto: `Segoe UI`, `system-ui`. Monoespaciada (Tracking ID, código y cronómetros): `Consolas`, `Cascadia Mono`. Definidas en `--fuente` y `--fuente-mono`.

---

## Reglas generales

- **Tracking ID** es el nombre único del identificador de cualquier atención. Correlativos propios: 10 dígitos (`JINT0000000001`). Ticket: el número de ServiceNow.
- Los textos de la interfaz **no mencionan Copilot**.
- Se reemplazan **todos** los `prompt()`, `confirm()` y `alert()` por campos y avisos dentro de la propia pantalla.
- El tiempo de foco se calcula desde la hora de inicio guardada, no con un contador.
- Queda fuera de este rediseño el resumen del día ("Ver mi día").

## Confirmado en el código

- **Correlativos:** el `tracking_id` de los tipos propios es de **10 dígitos** (`JINT0000000001`), como pide este diseño. Existe además un campo interno `numero` de 9 dígitos que no se muestra en la interfaz (en la fase 4 el formulario previsualiza el Tracking ID, no el `numero`).
