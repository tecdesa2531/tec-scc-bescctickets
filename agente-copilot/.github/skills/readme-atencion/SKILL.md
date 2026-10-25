---
name: readme-atencion
description: Ultimo paso de /procede y base del comando /readme. Escribe un README.md en la carpeta de trabajo de una atencion ya subida, para que quien entre a esa carpeta sepa que se pidio, que se hizo y que hay en ella. No llama a Jira ni toca otros archivos de la carpeta de trabajo.
---

# README de la atencion (`/procede` y `/readme`)

Sigue `.github/copilot-instructions.md`. La carpeta de trabajo la ven **otras personas** (OneDrive): el README es la portada de esa carpeta. Es el **unico archivo** que escribes en la raiz de trabajo.

## 1. Cuando se genera

- **Al final de `/procede`**, por cada atencion que quedo subida (incluidas las hijas y las interrupciones), despues de los comentarios y de los cambios de estado. Si la atencion se salto (falto el destino, la HU, etc.), no generes su README.
- **Con `/readme <ID>`**: para esa atencion, aunque no este en la cola (ubicala como indica "Atenciones que no estan en la cola" de `copilot-instructions.md`). Si aun no tiene nada subido, avisa y genera igual solo si Jhans lo confirma.
- **Con `/readme` sin ID** (atenciones ya subidas antes de existir este paso): aqui, **y solo aqui** (ademas del cierre de semana y de sprint), recorres en **solo lectura** los `ticket-datos.json` de la raiz de proceso, sin entrar en `003_Herramienta` ni en `004_SinAsignar`. Toma las que tienen algo subido (algun comentario con `subido: true` en sus `040_ProcesoJira/jira-comentarios_*.json`) y **no** tienen `README.md` en su carpeta de trabajo. La `relativa` de cada una es la ruta de su carpeta respecto de la raiz de proceso (la de trabajo tiene la misma estructura). Lista los titulos: si son **5 o menos**, confirma cuales antes de escribir; si son **mas de 5**, procede con todas.

Si el `README.md` ya existe, lo **reemplazas** completo (por ejemplo, en la segunda vuelta de una atencion reabierta).

## 2. De donde sale cada dato

Todo sale de `<raiz_proceso>/<relativa>/ticket-datos.json`, `bitacora.json`, `040_ProcesoJira/bitacora-correccion.json` y del contenido real de `<raiz_trabajo>/<relativa>/`.

| Dato | Fuente |
|---|---|
| Titulo | `titulo_jira`; si esta vacio, `titulo`. |
| Proyecto | `tracking_code`. |
| Entorno | `entornos`, separados por coma. Omite la linea si es `["SIN_ENTORNO"]` (siempre en una NPL). |
| Solicitante | El mismo de la `descripcion` (correo de solicitud o campo `solicitante`, solo el nombre). En una NPL, `npl.quien`. Si no hay, omite la linea. |
| Asignado | Fecha (AAAA-MM-DD) del correo **mas antiguo** de `correos[]` con `tipo: "asignado"` (campo `fecha`). Si no hay ninguno, la fecha de `creado`. Aqui **no** se aplica la regla del fin de semana. |
| Que se hizo | La seccion `## Resumen` de la `descripcion` (sin la seccion Datos). En una NPL, su resumen corregido de `bitacora-correccion.json` (o `npl.resumen` si no hay correccion). Si no hay ninguno, redacta un resumen breve con el texto corregido de las entradas `para_jira: true`. |

## 3. Lista de archivos

Recorre la carpeta de trabajo de la atencion, **incluidas sus subcarpetas** (`010_CorreoAsignadoAdjuntos`, `020_CorreoAtendidoAdjuntos`, `030_ProcesoAtencion` y cualquier otra), y lista **cada archivo** con su ruta relativa a la carpeta y una descripcion breve. Omite el propio `README.md`.

- **Correo `.eml`**: segun su entrada en `correos[]` (por `archivo`): de quien es y de que trata, en pocas palabras (usa su `asunto` y su `resumen`).
- **Adjunto de correo** (en `correos[].adjuntos`): "adjunto del correo ..." y el asunto o tema de ese correo.
- **Captura de avance** (en `capturas[]` de una entrada, `raiz: "trabajo"`): su `descripcion`; si esta vacia, "captura del AAAA-MM-DD" con la fecha de la entrada.
- **Archivo de una entrada** (en `archivos[]`): una descripcion breve segun la entrada de la bitacora donde se adjunto.
- **Archivo que no aparece en ningun registro**: solo el nombre, sin inventar su contenido.
- **Carpeta de una atencion hija** (subcarpeta `NNN_<Tracking ID>` que tiene su propio `ticket-datos.json` en la raiz de proceso): **no** listes sus archivos; pon una sola linea con la carpeta y el titulo de esa atencion. Tiene su propio README.

## 4. Formato

Escribe el README en **espanol correcto, con tildes y enes** (es documentacion para personas). El ejemplo de abajo va sin tildes solo porque este archivo es ASCII: en el README, "Que se hizo" lleva tilde en la e de "Que", "Atencion" en la o, y cada palabra del contenido la suya. Codificacion UTF-8.

```markdown
# Migracion del cluster EKS a version 1.30

**Proyecto:** NUBPRO
**Entorno:** PRO
**Solicitante:** Carlos Mendez
**Asignado:** 2026-10-08

## Que se hizo

Se actualizo el cluster EKS de produccion de la version 1.28 a 1.30. Se resolvio
un problema de permisos en el rol del nodo que impedia levantar los pods.

## Archivos en esta carpeta

- `20261008_correo_asignado.eml` - correo de Carlos Mendez con la solicitud de la migracion
- `010_CorreoAsignadoAdjuntos/plan_migracion.xlsx` - adjunto del correo de solicitud
- `030_ProcesoAtencion/20261014_101500_captura.png` - estado del cluster antes del upgrade
- `20261014_correo_atendido.eml` - correo de confirmacion del cierre
- `001_JINT0000000002/` - atencion: Validar add-ons del cluster (tiene su propio README)
```

Cada linea de metadatos termina con dos espacios para que se vean en lineas separadas.

## 5. Que nunca va en el README

- Nada de Jira (claves, enlaces, HU, subtareas, estados), del agente, de Copilot ni de IA.
- Ni el Tracking ID ni el enlace de ServiceNow: la carpeta ya lleva el ID en su nombre.
- Ni rutas de la raiz de proceso, ni el texto original de la bitacora, ni las notas de una NPL (`texto` de su entrada), ni nombres de archivos de `040_ProcesoJira`.
- No modifiques, muevas ni borres ningun otro archivo de la carpeta de trabajo.

Al terminar, avisa en una linea por atencion que README dejaste.
