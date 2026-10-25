# Atención de tickets con Copilot

Este agente de GitHub Copilot prepara tus atenciones para Jira. No organiza carpetas ni correos: eso ya lo hace la herramienta **Focus Flow**. El agente lee los archivos que ella deja y crea las historias de usuario, las subtareas y los comentarios en Jira.

## Instalar (una sola vez)

1. Abre en VS Code un workspace que incluya tres carpetas: `agente-copilot` y tus dos raíces de datos (la de trabajo y la de proceso). Lo más cómodo es un archivo `.code-workspace` con las tres.
2. Revisa `config-jira.json`: los destinos de Jira y el mapeo de cada proyecto, con tus valores reales (viven fuera del repositorio).
3. Revisa tus variables de entorno de credenciales, las que nombra `config-jira.json` en cada destino (`url_var`, `email_var`, `token_var`).
4. En Copilot Chat elige el agente **atencion-tickets** o usa directamente los comandos `/inicia`, `/limpia`, `/procede` y `/corrige`.

## Uso diario

Le hablas en corto. Cada comando acepta un ID (Tracking ID) o, sin ID, toma de la cola todas las pendientes de esa etapa (si son 5 o menos te pide confirmar cuáles; si son más, las lista y avanza). `/inicia` no pide esa confirmación: crea directo. `/corrige` siempre necesita el ID.

| Quieres | Le dices |
|---|---|
| Crear el issue padre al llegar la asignación | `/inicia` o `/inicia PTSK0000123` |
| Limpiar el texto y proponer descripción y título (cuando marcas *Terminar* en Focus Flow) | `/limpia` o `/limpia PTSK0000123` |
| Subir a Jira lo que diste por conforme | `/procede` o `/procede PTSK0000123` |
| Corregir título y descripción de issues ya creados | `/corrige PTSK0000123` |
| Crear las HU semanales del sprint (cada una con su subtarea fija de interrupciones) | `crea las HU semanales del sprint` |
| Cierre de semana o de sprint | `cierre de semana` / `cierre de sprint` |

En `/limpia`, el agente deja **su propuesta** de descripción y título en `ticket-datos.json`; tú la revisas en la herramienta y, si quieres cambios, se los pides por el chat.

Si una atención semanal no tiene HU semanal que cubra su fecha, `/inicia` te avisa y la salta: primero crea las HU semanales del sprint.

Las **interrupciones** (llamadas y chats sin agendar, tipo NPL) nunca tienen issue propio: en `/limpia` solo se corrige su resumen y en `/procede` se suben como un comentario, en la subtarea fija de interrupciones de la semana (sin padre), en la fase "Consultas y seguimiento" de la HU independiente del padre, o directo en la subtarea del padre si es semanal.

## Lo que haces tú

- En **Focus Flow**: trabajas, llevas la bitácora, marcas *Terminar* (el agente limpia el texto) y, tras revisarlo, *Dar conforme* (el agente sube a Jira).
- Revisas el texto corregido con el selector *Original / Corregido* antes de dar el conforme.
- En `/procede`, `/corrige` y la creación de HU semanales, confirmas con **"crear"** en el chat cuando el agente te muestra el dry-run; él ejecuta el script `.py` en la terminal (no tienes que copiar comandos ni buscar carpetas). `/inicia` es la excepción: crea el padre directo, sin dry-run.
- Cierras la historia de usuario y el sprint en el tablero de Jira, y asocias la HU nueva a la épica y al sprint.

## Cómo se comunican la herramienta y el agente

- La herramienta deja `003_Herramienta/agente-cola.json` con los pendientes y su acción; el agente lo lee en vez de recorrer las carpetas.
- El agente escribe el texto corregido en `040_ProcesoJira/bitacora-correccion.json`, y la `descripcion`, el `titulo_jira` y las `key`/`url` de los issues en `ticket-datos.json`.
- El contrato completo está en `copilot-instructions.md`.
