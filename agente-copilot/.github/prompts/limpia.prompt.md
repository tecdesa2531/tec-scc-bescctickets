---
agent: agent
description: Corrige el texto de la bitacora y escribe la descripcion y el titulo para Jira.
---

# Comando LIMPIA

Sigue `.github/copilot-instructions.md` y el skill `correo-procesar`. Esta es la etapa `pendiente_limpieza`.

- Si en la peticion viene un ID, trabaja solo sobre esa atencion.
- Si no viene ID, lee `003_Herramienta/agente-cola.json` y toma las atenciones con `accion: "pendiente_limpieza"`. Si hay varias, confirmame antes.

Para cada atencion:
- Lee los correos `.eml` (cabeceras y cuerpo) de la raiz de trabajo y la `bitacora.json`.
- Corrige el texto de **cada entrada** con redaccion clara y coherente, **sin unir, reordenar ni cambiar la cantidad** de entradas, y guardalo en `040_ProcesoJira/bitacora-correccion.json` por `bitacora_id`. No modifiques el texto original.
- Completa `correos[].resumen`. **Proponme** la `descripcion` y un `titulo_jira` corto y claro, muestramelos y espera mi visto bueno (aplica mis ajustes) antes de guardarlos en `ticket-datos.json`.

No subas nada a Jira: esto solo deja el contenido listo para que yo lo revise y de el conforme.
