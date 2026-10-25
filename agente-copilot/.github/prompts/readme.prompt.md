---
agent: atencion-tickets
description: Escribe o actualiza el README.md de la carpeta de trabajo de atenciones ya subidas.
---

# Comando README

Sigue `.github/copilot-instructions.md` y el skill `readme-atencion`. Este comando no llama a Jira.

- Si en la peticion viene un ID, escribe (o reemplaza) el README de esa atencion. Ubica su carpeta como indica "Atenciones que no estan en la cola" de `copilot-instructions.md`.
- Si no viene ID, busca las atenciones que ya tienen algo subido y todavia no tienen `README.md` en su carpeta de trabajo (seccion 1 del skill). Si son **5 o menos**, confirmame cuales antes de escribir; si son **mas de 5**, listalas y procede.

Escribe solo el `README.md` en la carpeta de trabajo; no toques ningun otro archivo de esa carpeta.
