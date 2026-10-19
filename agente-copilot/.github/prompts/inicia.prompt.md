---
agent: agent
description: Crea en Jira el padre de una atencion (HU independiente o subtarea semanal).
---

# Comando INICIA

Sigue `.github/copilot-instructions.md`. Es un paso **opcional**: crea el padre en Jira temprano, cuando llega la asignacion. Si el padre ya existe, no hay nada que crear (avisame).

- Si en la peticion viene un ID (Tracking ID o `id_herramienta`), trabaja sobre esa atencion **aunque ya este en otra etapa** (p. ej. si se trabajo y termino toda de una vez sin `/inicia`). Crea el padre solo si aun no existe (revisa `jira.padre_key` y las `key` de `subtareas[]`).
- Si no viene ID, lee `003_Herramienta/agente-cola.json` y toma las atenciones con `accion: "pendiente_inicio"`. Si hay mas de una, confirmame cuales antes de crear nada.

Crea **solo el padre**:
- `hu_tipo` independiente -> crea la **historia de usuario** (skill `jira-historia-usuario`).
- `hu_tipo` semanal -> crea una **subtarea por entorno** bajo la HU de la semana que corresponde por fecha (`hu_semanales` de `config-jira.json`) (skill `jira-subtareas`).

Guarda `jira.padre_key`, `jira.padre_url` y `jira.tipo_padre` en `ticket-datos.json`. Entregame el script `.py` y el comando `python .\nombre_script.py` para ejecutarlo yo; no subas nada tu.
