---
name: correo-procesar
description: Base del comando /limpia. Lee los correos y la bitacora de una atencion ya organizada por la herramienta, corrige el texto de cada entrada, resume los correos y propone la descripcion y el titulo_jira. No mueve archivos, no organiza carpetas y no sube nada a Jira.
---

# Limpieza de contenido (`/limpia`)

Sigue `.github/copilot-instructions.md`. La herramienta ya organizo las carpetas, guardo los correos y llevo la bitacora. Tu **no mueves ni organizas nada**: partes de lo que ya existe.

Esta etapa corre cuando Jhans marca la atencion como *atendida* (`accion: pendiente_limpieza` en la cola). Tomas la atencion por su ID o, sin ID, todas las `pendiente_limpieza` (si hay varias, confirma antes).

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
{ "correcciones": { "e20261018163626...": "Al ejecutar `flux get ks` aparece un error en el EKS." } }
```

## 4. Resumir los correos

En `ticket-datos.json`, completa `correos[].resumen` con un resumen breve de lo nuevo de cada correo (solo tu campo; no toques el resto).

## 5. Proponer descripcion y titulo_jira

- **descripcion**: un parrafo breve que resume la atencion, con ortografia corregida y coherencia con la bitacora.
- **titulo_jira**: corto y claro, que exprese lo que realmente es la atencion.

**Proponselos a Jhans en el chat y espera su visto bueno** (aplica los ajustes que pida). Recien entonces guardalos en `ticket-datos.json` (campos `descripcion` y `titulo_jira`).

## Limites

No subes nada a Jira en esta etapa: solo dejas el contenido listo para que Jhans lo revise (en la herramienta ve el texto corregido con el selector Original / Corregido) y de el conforme. La subida ocurre despues, en `/procede`.
