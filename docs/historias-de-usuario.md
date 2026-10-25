# Historias de usuario

Ultima actualizacion: 2026-10-25

---

## Atenciones

### HU-001: Crear una atencion nueva

**Como** Jhans,
**quiero** crear una atencion con tipo, titulo, proyecto y entornos,
**para** tener un registro estructurado desde el primer momento del trabajo.

**Criterios de aceptacion:**
- [ ] Se puede crear sin proyecto ni ID (queda en carpeta temporal).
- [ ] Al tener todos los datos, la herramienta crea las carpetas definitivas y mueve los archivos.
- [ ] El numero interno se asigna automaticamente segun el tipo.
- [ ] El area de trabajo Edge se auto-genera como `tracking_id-tracking_code`.

**RF relacionados:** RF-001, RF-002, RF-003, RF-004, RF-007, RF-010
**Estado:** implementada

---

### HU-002: Organizar una atencion como hija de otra

**Como** Jhans,
**quiero** vincular una atencion como hija de otra ya existente,
**para** saber de que ticket o trabajo padre proviene sin perder el hilo.

**Criterios de aceptacion:**
- [ ] La atencion hija aparece anidada bajo el padre en la lista.
- [ ] Solo hay un nivel: el padre debe ser una atencion sin padre y una hija no puede tener hijas.
- [ ] La carpeta de la hija se crea dentro de la carpeta del padre.
- [ ] La hija hereda el proyecto del padre automaticamente.
- [ ] El padre se puede asignar o cambiar mientras la atencion no haya sido procesada; si ya esta ubicada, su carpeta se mueve dentro de la del padre. No se puede quitar el padre de una atencion ubicada.

**RF relacionados:** RF-008, RF-009, RF-017
**Estado:** implementada

---

### HU-003: Buscar y localizar una atencion rapido

**Como** Jhans,
**quiero** buscar atenciones por ID, proyecto o titulo y filtrar por estado,
**para** encontrar cualquier atencion en segundos sin revisar la lista completa.

**Criterios de aceptacion:**
- [ ] La busqueda filtra en tiempo real mientras se escribe.
- [ ] El filtro por estado oculta las cerradas por defecto.
- [ ] Las ramas padre-hijo se pueden colapsar para reducir el ruido visual.

**RF relacionados:** RF-013, RF-014
**Estado:** implementada

---

### HU-004: Cambiar los entornos de una atencion

**Como** Jhans,
**quiero** actualizar los entornos de una atencion ya ubicada,
**para** reflejar que el trabajo paso de DEV a PRE o a PRO sin perder el historial.

**Criterios de aceptacion:**
- [ ] La herramienta mueve las carpetas de trabajo y proceso a la carpeta de entorno correcta.
- [ ] El proyecto no cambia al cambiar entornos.
- [ ] Las atenciones hijas anidadas se mueven con el padre.

**RF relacionados:** RF-006, RF-011, RF-042
**Estado:** implementada

---

### HU-005: Terminar una atencion

**Como** Jhans,
**quiero** marcar una atencion como atendida y lista para Jira,
**para** cerrar el ciclo de trabajo y saber que esta lista para subir.

**Criterios de aceptacion:**
- [ ] Solo se puede terminar una atencion con carpeta definitiva (no temporal).
- [ ] Queda marcada como atendida y con fecha de cierre.

**RF relacionados:** RF-012
**Estado:** implementada

---

### HU-014: Capturar una interrupcion sin perder tiempo real

**Como** Jhans,
**quiero** iniciar el registro de una llamada o chat no planificado con un clic y sin llenar datos previos,
**para** no perder tiempo real completando un formulario mientras atiendo la interrupcion.

**Criterios de aceptacion:**
- [ ] Un boton "Interrupcion" inicia el cronometro de inmediato sin pedir datos.
- [ ] El cronometro sigue corriendo aunque cambie de pestana.
- [ ] Puedo anotar notas de texto libre durante la interrupcion.
- [ ] Puedo pegar o arrastrar adjuntos sin describirlos, ordenados por hora de llegada.

**RF relacionados:** RF-047, RF-048, RF-049
**Estado:** implementada

---

### HU-015: Cerrar una interrupcion con los datos minimos

**Como** Jhans,
**quiero** completar tipo de contacto, quien contacto y un resumen al cerrar la interrupcion,
**para** dejar un registro util aunque breve de cada llamada o chat no planificado.

**Criterios de aceptacion:**
- [ ] Al cerrar se piden tipo de contacto, quien contacto y resumen como obligatorios.
- [ ] Puedo indicar un ticket relacionado y adjuntar archivos adicionales de forma opcional.
- [ ] El tiempo total se calcula automaticamente entre apertura y cierre.
- [ ] Si no completo los datos obligatorios, la interrupcion queda "Pendiente de cerrar" y aparece como alerta.

**RF relacionados:** RF-050, RF-051, RF-052
**Estado:** implementada

---

### HU-017: Corregir una interrupcion despues de cerrarla

**Como** Jhans,
**quiero** poder corregir las notas, los adjuntos, el padre o los datos de cierre de una interrupcion que ya cerre,
**para** arreglar errores (un numero mal anotado, un resumen incompleto) sin perder el registro ni tener que crear una nueva.

**Criterios de aceptacion:**
- [ ] Mientras el agente no haya procesado la interrupcion, se puede reabrir el formulario de cierre y guardar correcciones.
- [ ] El resumen se muestra en Markdown, con los enlaces largos acortados igual que en la bitacora normal.
- [ ] Una vez que el agente la procesa, queda bloqueada para edicion, igual que el resto de la herramienta.

**RF relacionados:** RF-056
**Estado:** implementada

---

## Bitacora

### HU-006: Registrar el avance de una atencion

**Como** Jhans,
**quiero** agregar entradas de bitacora con texto, capturas y archivos,
**para** tener un registro cronologico de todo lo que hice y poder subirlo a Jira.

**Criterios de aceptacion:**
- [ ] Se puede agregar texto en Markdown.
- [ ] Se pueden pegar capturas de pantalla con descripcion obligatoria.
- [ ] Se pueden arrastrar archivos y correos .eml.
- [ ] Cada entrada se puede marcar como privada (no va a Jira).

**RF relacionados:** RF-018, RF-019, RF-020, RF-021
**Estado:** implementada

---

### HU-007: Procesar un correo .eml al arrastrarlo

**Como** Jhans,
**quiero** arrastrar un correo .eml a la bitacora y que la herramienta extraiga sus adjuntos,
**para** no tener que hacerlo a mano ni guardar el correo en otro lado.

**Criterios de aceptacion:**
- [ ] Los adjuntos reales se extraen; las imagenes incrustadas (firmas) se ignoran.
- [ ] Un correo identico no se duplica si ya fue agregado.
- [ ] Un correo adjunto dentro de otro se guarda completo.

**RF relacionados:** RF-022, RF-023
**Estado:** implementada

---

### HU-008: Editar o corregir una entrada antes de subir a Jira

**Como** Jhans,
**quiero** editar el texto y los archivos de una entrada que aun no se subio a Jira,
**para** corregir errores antes de que queden permanentes.

**Criterios de aceptacion:**
- [ ] Se puede editar texto, marcar/desmarcar "para Jira" y quitar capturas.
- [ ] Las entradas enviadas a Jira quedan bloqueadas y no se pueden editar.

**RF relacionados:** RF-024, RF-025
**Estado:** implementada

---

## Foco

### HU-009: Registrar en que estoy trabajando en este momento

**Como** Jhans,
**quiero** indicar en que atencion estoy enfocado,
**para** llevar un registro real de donde fue mi tiempo durante el dia.

**Criterios de aceptacion:**
- [ ] Solo hay un foco activo a la vez.
- [ ] Al cambiar de foco, el tramo anterior se cierra con hora exacta.
- [ ] Si el dia anterior quedo un foco abierto, la herramienta lo pide antes de continuar.
- [ ] El tiempo acumulado por atencion se muestra en su detalle.

**RF relacionados:** RF-027, RF-028, RF-030, RF-031
**Estado:** implementada

---

### HU-010: Pausar, anotar una idea o registrar una reunion

**Como** Jhans,
**quiero** poder pausar el foco, anotar una idea rapida o crear una atencion de reunion en un clic,
**para** no perder el hilo ni interrumpir el foco para abrir un formulario completo.

**Criterios de aceptacion:**
- [ ] Pausa cierra el tramo actual sin abrir otro ticket.
- [ ] Idea pide una linea de texto y la agrega a Ideas pendientes.
- [ ] Nueva reunion crea una atencion CON sin proyecto y la pone como foco automaticamente.

**RF relacionados:** RF-029, RF-032
**Estado:** implementada

---

## Ideas

### HU-011: Gestionar ideas anotadas durante el trabajo

**Como** Jhans,
**quiero** ver mis ideas pendientes y decidir que hacer con cada una,
**para** que no se pierdan y pueda procesarlas cuando tenga tiempo.

**Criterios de aceptacion:**
- [ ] Las ideas pendientes aparecen en la pantalla principal.
- [ ] Cada idea se puede agregar a la bitacora de una atencion, convertir en atencion nueva o descartar.

**RF relacionados:** RF-033, RF-034, RF-035, RF-036
**Estado:** implementada

---

## Accesos rapidos

### HU-012: Acceder rapido a las herramientas del dia

**Como** Jhans,
**quiero** tener una lista de enlaces rapidos en la pantalla principal,
**para** abrir AWS, Jira o cualquier herramienta con un clic sin buscar en favoritos.

**Criterios de aceptacion:**
- [ ] Se pueden agregar, editar y eliminar accesos.
- [ ] La lista es colapsable para no ocupar espacio cuando no se necesita.

**RF relacionados:** RF-037, RF-038
**Estado:** implementada

---

## Jira (futuro)

### HU-013: Subir el trabajo registrado a Jira

**Como** Jhans,
**quiero** subir los comentarios y capturas de una atencion a Jira con un boton,
**para** no tener que copiar y pegar a mano ni olvidar ninguna entrada.

**Criterios de aceptacion:**
- [ ] Solo se suben las entradas marcadas "para Jira".
- [ ] Las entradas subidas quedan bloqueadas para evitar cambios posteriores.
- [ ] Si hay entradas nuevas despues de una primera subida, solo se suben las nuevas.

**RF relacionados:** RF-043, RF-045, RF-046
**Estado:** pendiente

---

### HU-016: Enrutar interrupciones a Jira segun su contexto

**Como** Jhans,
**quiero** que cada interrupcion se suba al lugar correcto de Jira segun si tiene un ticket relacionado,
**para** no perder el contexto de la llamada ni duplicar informacion.

**Criterios de aceptacion:**
- [ ] Sin atencion padre, se sube como comentario en la subtarea fija de interrupciones de la HU semanal vigente.
- [ ] Con atencion padre de HU independiente, se sube como comentario en la fase fija "Consultas y seguimiento" de esa HU, que se crea con la primera interrupcion y no queda abierta si la HU ya termino.
- [ ] Con atencion padre que es subtarea de una HU semanal, se sube como comentario directo en esa subtarea, sin crear nada nuevo.
- [ ] Al cerrarla con los datos completos queda lista para subir, sin limpieza ni conforme; veo el texto final antes de confirmar la subida.

**RF relacionados:** RF-053, RF-054, RF-055, RF-059
**Estado:** pendiente

---

### HU-018: Registrar una atencion hija como fase independiente

**Como** Jhans,
**quiero** marcar una iniciativa, documentacion o consulta hija de una HU independiente como fase independiente,
**para** que tenga su propia subtarea en Jira sin esperar al analisis de fases de la atencion padre.

**Criterios de aceptacion:**
- [x] El check solo aparece en una hija int, doc o con cuya raiz tiene HU independiente, y queda bloqueado cuando ya hay issue en Jira.
- [ ] Al iniciarla, se crea su subtarea bajo la HU del padre con su titulo.
- [ ] Sus comentarios suben a su propia subtarea, que se cierra al terminar la atencion.
- [ ] El analisis de fases del padre no la incluye.

**RF relacionados:** RF-058 (herramienta, implementado), RF-057 (agente, futuro)
**Estado:** herramienta lista; la subida a Jira queda a cargo del agente (futuro)

---

### HU-019: Encontrar contexto en la carpeta de trabajo de una atencion

**Como** Jhans,
**quiero** que la carpeta de trabajo de cada atencion subida tenga un README con lo que se pidio, lo que se hizo y lo que hay en ella,
**para** que quien entre directo a esa carpeta (yo mismo o un companero) entienda la atencion sin abrir cada archivo.

**Criterios de aceptacion:**
- [ ] Al terminar la subida, la carpeta de trabajo tiene un README con titulo, proyecto, entorno, solicitante, fecha de asignacion y un resumen breve.
- [ ] El README lista cada archivo de la carpeta con una descripcion corta.
- [ ] El README no menciona Jira ni el ID de seguimiento.
- [ ] Puedo generarlo a pedido para las atenciones que ya subi antes.

**RF relacionados:** RF-060
**Estado:** pendiente (falta probarlo en la laptop)
