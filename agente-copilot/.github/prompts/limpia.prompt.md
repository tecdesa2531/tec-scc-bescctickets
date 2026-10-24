---
agent: agent
description: Corrige el texto de la bitacora y escribe la descripcion y el titulo para Jira.
---

# Comando LIMPIA

Sigue `.github/copilot-instructions.md` y el skill `correo-procesar`. Esta es la etapa `pendiente_limpieza`.

- Si en la peticion viene un ID, trabaja solo sobre esa atencion.
- Si no viene ID, lee `003_Herramienta/agente-cola.json` y toma las atenciones con `accion: "pendiente_limpieza"`. Si son **5 o menos**, confirmame cuales antes de empezar; si son **mas de 5**, listalas y procede.

Para cada atencion:
- Lee los correos `.eml` (cabeceras y cuerpo) de la raiz de trabajo y la `bitacora.json`.
- Corrige el texto de **cada entrada** con redaccion clara y coherente, **sin unir, reordenar ni cambiar la cantidad** de entradas, y guardalo en `040_ProcesoJira/bitacora-correccion.json` por `bitacora_id`. No modifiques el texto original. La limpieza es incremental: salta las entradas con correccion vigente (ver `correo-procesar`).
- **Interrupcion (tipo `npl`):** no leas correos ni escribas `descripcion` ni `titulo_jira`. Corrige solo `npl.resumen` (skill `correo-procesar`, seccion 0).
- Completa `correos[].resumen`. **Escribe tu propuesta** de `descripcion` y un `titulo_jira` corto y claro **directamente** en `ticket-datos.json`, al primer nivel (merge: no los anides en `jira`), para que yo las vea en la herramienta. La `descripcion` es la **de la herramienta** (markdown): primero un bloque **## Datos** (Tracking ID, Proyecto, Entorno, Solicitante) y luego **## Resumen** breve de lo que se hizo segun la bitacora; no es la descripcion del issue de Jira. Avisame en una linea que ya las dejaste; si pido ajustes, reescribes esos campos.

No subas nada a Jira: esto solo deja el contenido listo para que yo lo revise en la herramienta y de el conforme (ese es el gate).
