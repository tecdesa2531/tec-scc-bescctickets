---
name: correo-procesar
description: Base del comando /limpia. Lee los correos y la bitacora de una atencion ya organizada por la herramienta, corrige el texto de cada entrada, resume los correos y propone la descripcion y el titulo_jira. No mueve archivos, no organiza carpetas y no sube nada a Jira.
---

# Limpieza de contenido (`/limpia`)

Sigue `.github/copilot-instructions.md`. La herramienta ya organizo las carpetas, guardo los correos y llevo la bitacora. Tu **no mueves ni organizas nada**: partes de lo que ya existe.

Esta etapa corre cuando Jhans marca la atencion como *atendida* (`accion: pendiente_limpieza` en la cola). Tomas la atencion por su ID o, sin ID, todas las `pendiente_limpieza`: si son **5 o menos**, confirma cuales antes de empezar; si son **mas de 5**, listalas y procede.

## 0. Atencion tipo `npl` (interrupcion)

Una interrupcion no sigue los pasos 2, 4 y 5: no tiene correos que leer ni issue propio que describir. Corrige unicamente el campo `resumen` del objeto `npl` en `ticket-datos.json` (redaccion clara, ortografia) y guarda la version corregida en `bitacora-correccion.json`, enganchada por el `bitacora_id` de su unica entrada (tipo `interrupcion`), igual que cualquier otra entrada. Las "notas" (`texto` de esa entrada) no se corrigen: son apuntes propios de Jhans, nunca suben a Jira. No escribas `descripcion` ni `titulo_jira`: una NPL nunca tiene issue propio (ver "Interrupciones" en `copilot-instructions.md`). Avisa en una linea que dejaste el resumen corregido para revisar.

## 1. Ubicar la atencion

De `agente-cola.json`: `relativa`, `raiz_trabajo`, `raiz_proceso`. La carpeta de la atencion es `<raiz>/<relativa>` en cada raiz. Lees:
- `<raiz_proceso>/<relativa>/ticket-datos.json`
- `<raiz_proceso>/<relativa>/bitacora.json`
- los correos `.eml` en `<raiz_trabajo>/<relativa>/`

## 2. Leer los correos

Lee cada `.eml` indicado en `ticket-datos.json` -> `correos[].archivo`. Lee **solo cabeceras y el cuerpo de texto**; no cargues el archivo completo si es grande (los adjuntos van codificados al final). Busca `Subject`, `From`, `Date` y la parte `text/plain`. De ahi sacas que se pidio y el contexto.

## 3. Corregir la bitacora

Corrige el texto de **cada** entrada de `bitacora.json` (todas, no solo las `para_jira`): redaccion clara y coherente, ortografia corregida. **No unas, no reordenes, no cambies la cantidad de entradas ni su sentido.** El texto original no se toca.

Escribe el texto corregido en `<raiz_proceso>/<relativa>/040_ProcesoJira/bitacora-correccion.json`, enganchado por `bitacora_id`:

```json
{ "correcciones": { "e20261018163626...": { "texto": "Al ejecutar `flux get ks` aparece un error en el EKS.", "corregido": "2026-10-21 15:40" } } }
```

`corregido` es la fecha y hora local en que escribes la correccion, formato `AAAA-MM-DD HH:MM`. Tomala de la terminal (`python -c "import datetime; print(datetime.datetime.now().strftime('%Y-%m-%d %H:%M'))"`); no la inventes.

**Limpieza incremental.** `/limpia` puede correr varias veces sobre la misma atencion (por ejemplo, si Jhans no dio el conforme, o si reabrio y agrego entradas). Antes de corregir:

- Si `bitacora-correccion.json` ya existe, leelo y conserva sus correcciones.
- Una correccion esta **vigente** si la entrada no tiene campo `editado`, o si su `corregido` es mayor que el `editado` de la entrada. Si la entrada se edito despues (o en el mismo minuto), o la correccion no tiene `corregido` y la entrada tiene `editado`, la correccion esta **vencida**.
- Si una entrada tiene correccion vigente, **saltala**: Jhans ya pudo revisarla.
- Corrige las entradas sin correccion o con correccion vencida y **escribelas** en el archivo (merge: reemplaza solo esas, sin borrar las demas). Si encuentras correcciones en el formato antiguo (solo texto, sin `corregido`) y vigentes, dejalas como estan.
- Solo vuelves a corregir una entrada ya corregida si Jhans lo pide de forma explicita en el chat.
- Si no hay entradas nuevas, no reescribas el archivo y avisalo en una linea.

## 4. Resumir los correos

En `ticket-datos.json`, completa `correos[].resumen` con un resumen breve de lo nuevo de cada correo (solo tu campo; no toques el resto).

## 5. Descripcion y titulo_jira (de la herramienta)

Esta `descripcion` es la **de la herramienta, NO la del issue de Jira** (esa se arma aparte al subir). Es un texto en **markdown** (la herramienta renderiza `## titulo`, `- lista`, `**negrita**`, `` `codigo` `` y enlaces `[texto](url)`). Va **primero DATOS y luego un resumen breve**:

```markdown
## Datos
- **Tracking ID:** [PTSK0000123](https://.../PTSK0000123)
- **Proyecto:** PROYAA
- **Entorno:** PRE
- **Solicitante:** Nombre del solicitante

## Resumen
En pocas lineas, que se hizo segun el historial de la bitacora.
```

- **Datos** primero: Tracking ID (enlace `[ID](url)` solo si la atencion tiene `url_servicenow`; si no, el ID a secas), Proyecto (`tracking_code`), Entorno(s) y Solicitante (del correo de solicitud o del campo `solicitante` de `ticket-datos.json`; si no hay, omite esa linea y no preguntes).
- **Resumen** despues: explica brevemente lo que se hizo, segun el recorrido de la bitacora (no copies el COMO/QUIERO/PARA de Jira).
- **titulo_jira**: corto y claro, que exprese lo que realmente es la atencion. La fuente depende del estado de la atencion:
  - Si ya hay padre en Jira (`jira.padre_key` o alguna subtarea con `key`): el titulo propuesto debe ser coherente con el `titulo` de `ticket-datos.json` que uso `/inicia` para crearlo. No lo cambies radicalmente; es una refinacion.
  - Si no hay padre en Jira (se salto `/inicia`): deriva el titulo del contenido de la bitacora y del `titulo` de `ticket-datos.json`. Que refleje lo que realmente se hizo.

**Guardalos de una** en `ticket-datos.json`, al **primer nivel**, en los campos `descripcion` y `titulo_jira` (merge: relee el archivo y cambia solo esos campos; no los anides dentro de `jira` ni de ningun otro objeto). Son una **propuesta**: Jhans los revisa en la herramienta y, si quiere cambios, te los pide por el chat y tu reescribes el archivo. Avisale en una linea que ya los dejaste para revisar.

## Limites

No subes nada a Jira en esta etapa: solo dejas el contenido listo para que Jhans lo revise en la herramienta (el texto corregido con el selector Original / Corregido, y la descripcion y el titulo propuestos) y de el conforme. El conforme (boton "Dar conforme") es la compuerta real: recien ahi la atencion queda lista para `/procede`. La subida ocurre despues.
