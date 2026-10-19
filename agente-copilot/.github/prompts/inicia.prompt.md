---
agent: agent
description: Crea en Jira el padre de una atencion (HU independiente o subtarea semanal).
---

# Comando INICIA

Sigue `.github/copilot-instructions.md`. Esta es la etapa `pendiente_inicio`.

- Si en la peticion viene un ID (Tracking ID o `id_herramienta`), trabaja solo sobre esa atencion.
- Si no viene ID, lee `003_Herramienta/agente-cola.json` y toma las atenciones con `accion: "pendiente_inicio"`. Si hay mas de una, confirmame cuales antes de crear nada.

Crea **solo el padre**:
- `hu_tipo` independiente -> crea la **historia de usuario** (skill `jira-historia-usuario`).
- `hu_tipo` semanal -> crea una **subtarea por entorno** bajo la HU de la semana que corresponde por fecha (`hu_semanales` de `config-jira.json`) (skill `jira-subtareas`).

Guarda `jira.padre_key`, `jira.padre_url` y `jira.tipo_padre` en `ticket-datos.json`. Entregame el script `.py` y el comando `python .\nombre_script.py` para ejecutarlo yo; no subas nada tu.
