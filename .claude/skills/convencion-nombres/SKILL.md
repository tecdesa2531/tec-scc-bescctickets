---
name: convencion-nombres
description: >-
  Convenciones de nombres de archivos y carpetas del sistema personal de Jhans.
  Aplicar SIEMPRE que se vaya a proponer, crear o renombrar un archivo o carpeta
  fuera de un repositorio de codigo: entregables, documentacion, registros,
  carpetas de organizacion, recursos de proyecto. Disparadores: "como llamo",
  "como nombro", "nombre del archivo", "crea la carpeta", "nueva carpeta",
  "renombra", "estructura de carpetas", o cualquier tarea que genere un archivo
  o directorio cuyo nombre no venga dado de antemano.
---

## Principio general

Los repositorios de codigo conservan su nombre exacto (el del remoto) y no se
toca su interior. Todo lo demas sigue las reglas de abajo.

---

## Directorios

| Tipo | Formato | Ejemplo |
|---|---|---|
| Contenedor (carpeta de organizacion) | `NNN_PascalCase` | `010_Software`, `070_DocumentosPersonales` |
| Repositorio (control de versiones) | Nombre exacto del remoto, sin cambios | `mi-chacra-frontend` |
| Carpeta de entorno | `NNN_PascalCase` (tabla abajo) | `010_Dev`, `030_Pro` |
| Carpeta de atencion tipo ticket (TIC) | `NNN_tracking_id_externo` | `001_INC0001234` |
| Carpeta de atencion otros tipos | `tracking_id` (sin correlativo) | `INT0000000001` |
| Carpeta de atencion hijo | `tracking_id-tracking_id_padre` | `DOC0000000001-INC0001234` |

### Carpetas de entorno

Las carpetas de entorno viven dentro de cada proyecto y siguen `NNN_PascalCase`.
El numero refleja posicion en el ciclo de vida (Dev < Pre < Pro); las
combinaciones y el caso sin entorno tienen numeros propios para no colisionar.
La combinacion Dev + Pro sin Pre no es valida.

| Entorno | Carpeta |
|---|---|
| Sin entorno (no aplica) | `000_SinEntorno` |
| Solo DEV | `010_Dev` |
| Solo PRE | `020_Pre` |
| Solo PRO | `030_Pro` |
| DEV + PRE | `040_DevPre` |
| PRE + PRO | `050_PrePro` |
| DEV + PRE + PRO | `060_DevPrePro` |

### Carpetas de atenciones: reglas detalladas

**TIC (ticket ServiceNow)** — excepcion: lleva correlativo porque el numero
ServiceNow llega despues y la carpeta puede crearse antes de tenerlo.
- Con numero ServiceNow: `NNN_INC0001234` (o el formato que use ServiceNow)
- Sin numero aun (pendiente de asignacion): `NNN_TIC0000000001` (ID interno)

**INT, DOC, CON** — sin correlativo: el ID auto-generado ya es secuencial y
basta para ordenar. La carpeta se nombra directamente con el ID.
- Independiente: `INT0000000001`, `DOC0000000001`, `CON0000000001`
- Hijo de TIC: `DOC0000000001-INC0001234` (ID propio guion ID padre ServiceNow)
- Hijo de INT: `CON0000000001-INT0000000001` (ID propio guion ID padre INT)

---

## Archivos

Minusculas, palabras separadas por guion bajo, sin acentos ni enes.
`anio2026` no `año2026`, `documentacion` no `documentación`.

Elegir uno de tres formatos segun lo que sea mas relevante encontrar:

| Caso | Formato | Ejemplo |
|---|---|---|
| Con fecha (lo importante es cuando) | `AAAAMMDD_nombre_descriptivo.ext` | `20261005_acta_kickoff.pdf` |
| Sin fecha (lo importante es de que tipo) | `palabraclave-nombre_descriptivo.ext` | `config-base_datos.yaml` |
| Con version | agregar `-vNN` antes de la extension | `20261005_reporte-v02.pdf` |

**Cuando usar cada uno:**
- Fecha al inicio → actas, reportes, correos exportados, capturas, cualquier
  cosa donde la cronologia es el criterio de busqueda.
- Palabra clave al inicio → configuraciones, plantillas, documentos de
  referencia donde el tipo importa mas que la fecha.
- Version → cuando el archivo tiene revisiones y hay que distinguirlas;
  empezar en `v01`, no en `v1` ni en `v00`.

---

## Numeracion de directorios contenedores

- **Por frecuencia de acceso** (lo habitual): el directorio mas usado lleva el
  numero mas bajo. Saltar de 10 en 10 (`010_`, `020_`, `030_`) para poder
  insertar nuevas carpetas sin renumerar las existentes.
- **Cronologico** en colecciones temporales donde buscar por fecha tiene mas
  sentido que por uso: fotos, viajes, finanzas por anio, material academico.
- **`900_` para lo residual**: siempre al final de su carpeta padre.

---

## Ejemplos en el contexto de la herramienta de atenciones

La herramienta `mi-dia` registra el trabajo diario (foco, bitacora, atenciones)
y Copilot lo sube a Jira. Hay dos raices de datos separadas:

- `AT_RAIZ_TRABAJO` — archivos que comparte con otros: correos, capturas,
  adjuntos. Nada de Jira ni de proceso.
- `AT_RAIZ_PROCESO` — solo para Jhans: datos del ticket, bitacora, borradores
  de Jira, datos de la herramienta.

Ambas raices tienen la misma estructura `PROYECTO/ENTORNO/CARPETA_ATENCION/`.
Dentro de cada carpeta de atencion en la raiz de trabajo hay tres subcarpetas
fijas mas los `.eml` sueltos en la raiz.

```
AT_RAIZ_TRABAJO/
  INFRAS/
    010_Dev/
      001_INC0001234/                     <- TIC asignado
        010_CorreoAsignadoAdjuntos/       <- adjuntos del correo de asignacion
        020_CorreoAtendidoAdjuntos/       <- adjuntos del correo de cierre
        030_ProcesoAtencion/              <- capturas y archivos de avance
          20261015_captura_error_consola.png
          20261018_captura_solucion_aplicada.png
        20261015_correo_asignacion.eml
        20261018_correo_atendido.eml
      002_TIC0000000002/                  <- TIC sin numero ServiceNow aun
        010_CorreoAsignadoAdjuntos/
        020_CorreoAtendidoAdjuntos/
        030_ProcesoAtencion/
        20261018_correo_asignacion.eml
      INT0000000001/                      <- trabajo interno, sin correlativo
        010_CorreoAsignadoAdjuntos/
        020_CorreoAtendidoAdjuntos/
        030_ProcesoAtencion/
        20261010_correo_aprobacion.eml
    030_Pro/
      003_INC0001235/
        010_CorreoAsignadoAdjuntos/
        020_CorreoAtendidoAdjuntos/
        030_ProcesoAtencion/
        DOC0000000001-INC0001235/         <- DOC hijo: documentacion del ticket
          20261020_borrador_documentacion-v01.docx
        CON0000000001-INC0001235/         <- CON hijo: consulta sobre el ticket
  DOCINF/
    000_SinEntorno/
      DOC0000000002/                      <- DOC independiente
        20261012_guia_acceso_vpn-v02.pdf
  CONGEN/
    000_SinEntorno/
      CON0000000002/                      <- consulta general sin proyecto

AT_RAIZ_PROCESO/                          <- privado; misma estructura de carpetas
  003_Herramienta/                        <- datos de la herramienta mi-dia
    accesos.json
    ideas.json
    010_Focos/
      20261018_focos.json
  004_SinAsignar/                         <- atenciones sin proyecto ni ID aun
    TMP0000000001/
      ticket-datos.json
      trabajo/
  INFRAS/
    010_Dev/
      001_INC0001234/
        ticket-datos.json
        bitacora.json
        040_ProcesoJira/
          jira-historia_usuario-v01.json
          jira-subtareas-v01.json
      INT0000000001/
        ticket-datos.json
        bitacora.json
```
