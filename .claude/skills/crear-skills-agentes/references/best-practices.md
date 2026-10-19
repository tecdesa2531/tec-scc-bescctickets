# Best practices (agentskills.io) — detalle y ejemplos

Fuente: https://agentskills.io/skill-creation/best-practices

## Partir de experiencia real
No pidas a un LLM que "genere un skill" a secas: sale vago y genérico. Aterriza
el skill en contexto real:
- **Extrae de una tarea hecha a mano**: fíjate en los pasos que funcionaron, las
  correcciones que hiciste, los formatos de entrada/salida y el contexto que
  aportaste.
- **Sintetiza de artefactos del proyecto**: runbooks, specs/esquemas, comentarios
  de code review, historial de parches, casos de fallo reales y su resolución.

## Gastar contexto con cabeza
Al activarse, todo el SKILL.md entra al contexto y compite por la atención.
- **Añade lo que el agente NO sabría; omite lo que ya sabe.** Ejemplo:

  ```markdown
  <!-- Verboso: el agente ya sabe qué es un PDF -->
  Los PDF son un formato que contiene texto e imágenes. Para extraer texto
  necesitas una librería. Se recomienda pdfplumber porque...

  <!-- Mejor: directo a lo que no sabría -->
  Usa pdfplumber para extraer texto. Para escaneados, cae a pdf2image +
  pytesseract.
  ```
- **Unidades coherentes.** Como diseñar una función: ni muy estrecha (obliga a
  cargar varios skills) ni muy amplia (no dispara con precisión).
- **Detalle moderado.** Guía concisa y por pasos con un ejemplo que funcione
  supera a documentación exhaustiva. Si cubres cada edge-case, probablemente el
  juicio del agente basta para la mayoría.

## Calibrar el control a la fragilidad
- **Da libertad** cuando hay varios caminos válidos; explica el *porqué*:

  ```markdown
  ## Proceso de code review
  1. Revisa queries por inyección SQL (usa parametrizadas)
  2. Verifica auth en cada endpoint
  3. Busca race conditions en código concurrente
  ```
- **Sé prescriptivo** en lo frágil:

  ````markdown
  ## Migración de BD
  Ejecuta exactamente esta secuencia:
  ```bash
  python scripts/migrate.py --verify --backup
  ```
  No modifiques el comando ni añadas flags.
  ````

## Defaults, no menús
```markdown
<!-- Mal -->
Puedes usar pypdf, pdfplumber, PyMuPDF o pdf2image...

<!-- Bien -->
Usa pdfplumber. Para PDFs escaneados con OCR, usa pdf2image + pytesseract.
```

## Patrones reutilizables
- **Gotchas**: hechos del entorno que desafían suposiciones razonables. Van en el
  SKILL.md (el agente los lee antes de tropezar). Cuando corrijas un error del
  agente, añade la corrección aquí.
  ```markdown
  ## Gotchas
  - La tabla `users` usa soft-deletes: filtra `WHERE deleted_at IS NULL`.
  - El id es `user_id` en BD, `uid` en auth y `accountId` en billing.
  - `/health` da 200 aunque la BD esté caída; usa `/ready`.
  ```
- **Plantillas de salida**: más fiables que describir el formato en prosa. Cortas
  inline; largas en `assets/` y referenciadas.
- **Checklists** para flujos multi-paso con dependencias/validaciones.
- **Loops de validación**: haz → valida (script o checklist) → corrige → repite
  hasta pasar.
- **Plan-valida-ejecuta** para operaciones destructivas/batch: genera un plan en
  formato estructurado, valídalo contra la fuente de verdad con un script, y solo
  entonces ejecuta.
- **Bundlear scripts repetidos**: si en cada run el agente reinventa la misma
  lógica, escríbela una vez (probada) en `scripts/`.

## Refinar con ejecución real
Corre el skill contra tareas reales y realimenta TODO (no solo fallos). Lee los
*transcripts*, no solo las salidas: pasos improductivos suelen venir de
instrucciones vagas, inaplicables o de demasiadas opciones sin un default claro.
