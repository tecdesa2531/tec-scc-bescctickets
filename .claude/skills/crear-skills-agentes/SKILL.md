---
name: crear-skills-agentes
description: >-
  Usa este skill SIEMPRE que el usuario pida crear, modificar u optimizar un
  skill o un agente/subagente en este proyecto (p.ej. «crea un skill para X»,
  «hazme un agente que…», «mejora la descripción de este skill», «nuevo
  subagente»). Aplica la especificación de agentskills.io: estructura de
  carpetas, frontmatter válido (name en minúsculas-con-guiones que coincide con
  la carpeta; description ≤1024 chars orientada a disparadores), divulgación
  progresiva (SKILL.md <500 líneas / ~5000 tokens, el detalle va en
  references/), defaults en vez de menús, secciones de gotchas y plantillas, y
  el formato de subagentes de Claude Code (name/description/tools/model).
  Dispara aunque no se nombre «agentskills» ni «skill» explícitamente.
license: Proprietary
metadata:
  source: https://agentskills.io/specification
  owner: jhansdelacruz
---

# Crear skills y agentes (convención agentskills.io)

Guía para crear/editar **skills** y **agentes (subagentes)** en este proyecto
siguiendo la especificación de [agentskills.io](https://agentskills.io/specification)
y sus best-practices. Síguela cada vez que el usuario pida uno.

## 0. Antes de escribir: dónde van los archivos (gotcha de ESTE proyecto)

Claude Code **solo descubre** desde `.claude/`. Las carpetas `./skills/` y
`./agents/` del repo son **documentales**: un archivo ahí NO se carga.

- **Skill** → `.claude/skills/<name>/SKILL.md` (más `scripts/`, `references/`,
  `assets/` si hace falta). El `<name>` **debe coincidir** con el de la carpeta.
- **Agente/subagente** → `.claude/agents/<name>.md` (un solo archivo).

## 1. ¿Skill o agente? Elige bien la unidad

- **Skill**: conocimiento/procedimiento reutilizable que se carga en el contexto
  actual cuando la tarea lo pide. Un skill = **una unidad coherente de trabajo**
  (ni tan estrecha que obligue a cargar varios, ni tan amplia que no dispare bien).
- **Agente**: un ejecutor con su propio contexto y set de tools, para delegar una
  tarea acotada (p.ej. validar, auditar, migrar). Ver §6.

## 2. Frontmatter del SKILL.md (spec — obligatorio)

```yaml
---
name: mi-skill            # OBLIGATORIO
description: >-           # OBLIGATORIO
  Qué hace y CUÁNDO usarlo, con palabras-disparador.
license: Proprietary     # opcional
compatibility: ...        # opcional, solo si hay requisitos de entorno
metadata: { clave: valor } # opcional
allowed-tools: Read Bash   # opcional (experimental), separado por espacios
---
```

Reglas del campo `name`:
- 1–64 chars, solo `a-z`, `0-9` y `-`. **Minúsculas**.
- No empieza ni termina en `-`; sin `--` consecutivos.
- **Debe coincidir con el nombre de la carpeta** que lo contiene.

Reglas del campo `description` (es lo que hace que el skill **dispare**):
- 1–1024 chars. Describe **qué hace Y cuándo usarlo**.
- **Imperativo**: «Usa este skill cuando…», no «Este skill hace…».
- Enfócate en la **intención del usuario**, no en la mecánica interna.
- Sé **insistente**: lista contextos donde aplica, incluso si el usuario no
  nombra el dominio («aunque no mencione explícitamente X»).
- Conciso. Ver `references/optimizing-descriptions.md` para el método de prueba.

## 3. Cuerpo del SKILL.md — reglas de oro

Escribe para un agente que **ya sabe lo general**. Añade solo lo que NO sabría.

- **Añade lo que falta, omite lo obvio.** Nada de «qué es un PDF». Ve directo a
  convenciones del proyecto, APIs concretas, edge-cases no evidentes. Pregúntate
  por cada línea: «¿el agente lo haría mal sin esto?». Si no, córtala.
- **Divulgación progresiva.** SKILL.md **< 500 líneas / ~5000 tokens**: solo el
  núcleo. El detalle va a `references/` y le dices **cuándo** cargarlo
  («lee `references/x.md` si ocurre Y»), no un genérico «ver references/».
- **Defaults, no menús.** Elige una herramienta por defecto y menciona
  alternativas de pasada; no presentes 4 opciones como iguales.
- **Procedimientos, no respuestas puntuales.** Enseña *cómo abordar* una clase de
  problemas, no la solución de un caso concreto.
- **Calibra el control a la fragilidad.** Da libertad (y explica el *porqué*)
  cuando hay varios caminos válidos; sé prescriptivo y exacto en pasos frágiles
  («ejecuta exactamente esta secuencia, no añadas flags»).
- **Parte de experiencia real**, no de generalidades inventadas. Si falta
  contexto del dominio, pídelo; no rellenes con «buenas prácticas» genéricas.

Patrones útiles (usa los que apliquen): **Gotchas** (hechos del entorno que
rompen suposiciones razonables), **plantillas** de formato de salida,
**checklists** para flujos multi-paso, **loops de validación** (haz → valida →
corrige → repite) y **plan-valida-ejecuta** para operaciones destructivas/batch.
Detalle y ejemplos en `references/best-practices.md`.

## 4. Estructura de carpetas del skill (spec)

```
<name>/
├── SKILL.md          # obligatorio
├── scripts/          # código ejecutable (autocontenido, con errores claros)
├── references/       # docs que se cargan on-demand (archivos enfocados)
├── assets/           # plantillas, imágenes, datos
└── evals/evals.json  # casos de prueba (ver §5)
```

Referencias a archivos: rutas **relativas** desde la raíz del skill, un solo
nivel de profundidad. Evita cadenas de referencias anidadas.

## 5. Evaluar el skill (opcional pero recomendado)

No afirmes que «funciona» sin probarlo. Método resumido:
1. Escribe 2–3 casos en `evals/evals.json` (prompt realista + salida esperada +
   archivos). Varía fraseo/detalle; incluye ≥1 edge-case.
2. Corre cada caso **con** y **sin** el skill (baseline). En subagentes, cada run
   arranca en contexto limpio.
3. Tras ver salidas, añade **assertions** verificables (no «quedó bien»).
4. Califica PASS/FAIL con evidencia concreta; agrega resultados y mira el delta
   (calidad ganada vs. tokens/tiempo gastados).
5. Itera: pasa fallos + transcripts + SKILL.md a un LLM y pide mejoras que
   **generalicen** (no parches para el caso puntual).

Método completo en `references/evaluating-skills.md`. Para disparo/descripción,
`references/optimizing-descriptions.md`.

## 6. Crear un AGENTE (subagente de Claude Code)

Archivo único en `.claude/agents/<name>.md` con frontmatter:

```yaml
---
name: mi-agente
description: >-
  Cuándo invocarlo, en imperativo y con ejemplos de peticiones del usuario.
tools: Read, Bash, Grep, Glob   # opcional; omitir = hereda todas
model: sonnet                   # opcional (sonnet/opus/haiku), si no se hereda
---
```

Buenas prácticas para agentes (mismos principios que skills):
- `description` orientada a **cuándo delegar** en él, con ejemplos; dispara mejor.
- **Principio de menor privilegio en `tools`**: da solo lo necesario. Si el agente
  no debe modificar nada, NO le des `Edit`/`Write` y prohíbe mutaciones en el
  prompt (como hace `convenciones-nombres`).
- Cuerpo = rol claro + reglas duras + cómo responde. Conciso y procedimental.

## 7. Gotchas específicos de este proyecto

- **Ubicación real**: `.claude/skills/` y `.claude/agents/` (ver §0). El validador
  de nombres del repo NO aplica a estos archivos internos de tooling.
- **Fuente de verdad del dominio**: `~/010_ClaudeCode/CLAUDE.md`. Respeta sus
  reglas de oro (§1): nunca borrar/renombrar sin confirmación, lista intocable,
  no entrar en `node_modules`, validar contenido no por nombre.
- **Idioma**: documenta en español (es el idioma del proyecto).
- Tras crear/editar un skill o agente, **registra** el cambio en la bitácora del
  CLAUDE.md (§7).
```
