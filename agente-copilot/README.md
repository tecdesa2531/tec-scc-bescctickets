# Atención de tickets con Copilot

Este agente de GitHub Copilot prepara tus atenciones para Jira. No organiza carpetas ni correos: eso ya lo hace la herramienta **Mi día**. El agente lee los archivos que ella deja y crea las historias de usuario, las subtareas y los comentarios en Jira.

## Instalar (una sola vez)

1. Abre en VS Code un workspace que incluya tres carpetas: `agente-copilot` y tus dos raíces de datos (la de trabajo y la de proceso). Lo más cómodo es un archivo `.code-workspace` con las tres.
2. Revisa `config-jira.json`: los destinos de Jira y el mapeo de cada proyecto, con tus valores reales (viven fuera del repositorio).
3. Revisa tus variables de entorno de credenciales, las que nombra `config-jira.json` en cada destino (`url_var`, `email_var`, `token_var`).
4. En Copilot Chat elige el agente **atencion-tickets** o usa directamente los comandos `/inicia`, `/limpia` y `/procede`.

## Uso diario

Le hablas en corto. Hay tres comandos; cada uno acepta un ID (Tracking ID) o, sin ID, toma de la cola todas las pendientes de esa etapa:

| Quieres | Le dices |
|---|---|
| Crear el issue padre al llegar la asignación | `/inicia` o `/inicia PTSK0000123` |
| Limpiar el texto y proponer descripción y título (cuando marcas *Terminar* en Mi día) | `/limpia` o `/limpia PTSK0000123` |
| Subir a Jira lo que diste por conforme | `/procede` o `/procede PTSK0000123` |
| Crear la HU de la semana | `crea la HU de la semana` |
| Cierre de semana o de sprint | `cierre de semana` / `cierre de sprint` |

En `/limpia`, el agente te **propone** la descripción y el título; tú los apruebas o ajustas antes de que los guarde.

## Lo que haces tú

- En **Mi día**: trabajas, llevas la bitácora, marcas *Terminar* (el agente limpia el texto) y, tras revisarlo, *Dar conforme* (el agente sube a Jira).
- Revisas el texto corregido con el selector *Original / Corregido* antes de dar el conforme.
- Confirmas con **"crear"** en el chat cuando el agente te muestra el dry-run; él ejecuta el script `.py` en la terminal (no tienes que copiar comandos ni buscar carpetas).
- Cierras la historia de usuario y el sprint en el tablero de Jira, y asocias la HU nueva a la épica y al sprint.

## Cómo se comunican la herramienta y el agente

- La herramienta deja `003_Herramienta/agente-cola.json` con los pendientes y su acción; el agente lo lee en vez de recorrer las carpetas.
- El agente escribe el texto corregido en `040_ProcesoJira/bitacora-correccion.json`, y la `descripcion`, el `titulo_jira` y las `key`/`url` de los issues en `ticket-datos.json`.
- El contrato completo está en `copilot-instructions.md`.
