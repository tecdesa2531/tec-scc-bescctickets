---
agent: agent
description: Crea en Jira el padre de una atencion (HU independiente o subtarea semanal).
---

# Comando INICIA

Sigue `.github/copilot-instructions.md`. Es un paso **opcional**: crea el padre en Jira temprano, cuando llega la asignacion. Si el padre ya existe, no hay nada que crear (avisame).

- Si en la peticion viene un ID (Tracking ID o `id_herramienta`), trabaja sobre esa atencion **aunque ya este en otra etapa** (p. ej. si se trabajo y termino toda de una vez sin `/inicia`). Crea el padre solo si aun no existe (revisa `jira.padre_key` y las `key` de `subtareas[]`).
- Si no viene ID, lee `003_Herramienta/agente-cola.json` y toma las atenciones con `accion: "pendiente_inicio"`. `/inicia` crea directo: no pidas confirmacion previa; crea el padre de todas (solo el que aun no exista).

Crea **solo el padre**:
- `hu_tipo` independiente -> crea la **historia de usuario** (skill `jira-historia-usuario`) y guarda `jira.padre_key`, `jira.padre_url` y `jira.tipo_padre: "hu"` en `ticket-datos.json`.
- `hu_tipo` semanal -> crea una **subtarea por entorno** bajo la HU de la semana que corresponde por fecha (`hu_semanales` de `config-jira.json`) (skill `jira-subtareas`) y guardalas en `subtareas[]` con `entorno`, `key` y `url`. **No** uses `jira.padre_key` en una semanal. Si no hay HU semanal que cubra la fecha, **avisame y salta esa atencion**; no crees HU semanales aqui.
- **Atencion hija** (`padre_id` con valor): usa `hu_tipo_raiz` de la cola, no su propio `hu_tipo`. Con raiz **semanal**, crea su subtarea por entorno como una semanal (titulo `PROYAA(ENT): <ID del hijo> - titulo`). Con raiz **independiente** no le toca `/inicia` (la herramienta no la pone en la cola); si te la piden por ID, avisame que no hay nada que crear. Ver "Padre e hijos" en `copilot-instructions.md`.

Genera el script `.py` en `040_ProcesoJira` y **ejecutalo directo** en la terminal, **sin `--dry-run` ni confirmacion "crear"** (este comando es el paso rapido). Crea el padre solo si aun no existe. Avisame en una linea que lo creaste (o que ya existia).
