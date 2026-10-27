# Atencion de tickets

## Nombre del repositorio

`tec-scc-bescctickets` sigue la convencion `[empresa]-[aplicacion]-[short_name]`:

| Parte           | Significado                                             |
|-----------------|---------------------------------------------------------|
| `tec`           | Organizacion GitHub: tecdesa2531                        |
| `scc`           | Aplicacion **Focus Flow** (Sprint, Comentarios y Cierres) |
| `bescctickets`  | Short name: BE (Backend) + SCCTICKETS (nombre corto)    |

Herramientas personales para organizar el dia de trabajo en infraestructura y registrar las atenciones en Jira con la herramienta **Focus Flow** y el agente de GitHub Copilot.

| Carpeta           | Contenido |
|---|---|
| `mi-dia/`         | Focus Flow: accesos rapidos, atenciones, bitacora con correos y capturas, foco. Guia en su `README.md`. |
| `agente-copilot/` | Agente SprintDesk y skills de GitHub Copilot que crean y suben los registros a Jira. |
| `docs/diseno.md`  | Decisiones y acuerdos del diseno. |
| `CLAUDE.md`       | Contexto para Claude Code. |

Este repositorio no contiene datos. Los datos viven en dos carpetas de OneDrive indicadas con variables de entorno (ver `mi-dia/README.md`).

## Arrancar Focus Flow en Windows

Ejecutar `iniciar_focus_flow.bat` con doble clic. Abre Edge en `http://127.0.0.1:8765` y mantiene la consola visible con los logs. Cerrar la ventana detiene el servidor.

**Crear acceso directo en el escritorio**

1. Clic derecho sobre `iniciar_focus_flow.bat` > **Enviar a** > **Escritorio (crear acceso directo)**.
2. (Opcional) Clic derecho sobre el acceso directo > **Propiedades** > **Cambiar icono** para asignar un icono personalizado.
