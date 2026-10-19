# Evaluar la calidad de salida de un skill (eval-driven)

Fuente: https://agentskills.io/skill-creation/evaluating-skills

Objetivo: comprobar que el skill funciona **de forma fiable** y **mejor que sin
él**, con un loop de mejora sistemático.

## 1. Casos de prueba — `evals/evals.json`
Cada caso: **prompt** realista + **expected_output** legible + **files** (opc.).
```json
{
  "skill_name": "csv-analyzer",
  "evals": [
    {
      "id": 1,
      "prompt": "Tengo ventas mensuales en data/sales_2025.csv. Saca los 3 mejores meses por ingresos y haz un gráfico de barras.",
      "expected_output": "Gráfico de barras con los 3 meses top, ejes etiquetados y valores.",
      "files": ["evals/files/sales_2025.csv"]
    }
  ]
}
```
Tips: empieza con 2–3 casos; varía fraseo/detalle/formalidad; cubre ≥1
edge-case; usa contexto realista (rutas, nombres de columnas). Aún no definas
checks: primero mira qué produce el primer run.

## 2. Correr evals
Patrón: cada caso **con skill** y **sin skill** (baseline) para comparar.
- Workspace aparte: `iteration-N/<eval>/{with_skill,without_skill}/{outputs,timing.json,grading.json}` + `benchmark.json`.
- Cada run arranca en **contexto limpio** (subagente o sesión nueva).
- Para mejorar un skill existente: snapshot de la versión previa como baseline
  (`cp -r <skill> <ws>/skill-snapshot/`), guarda en `old_skill/outputs/`.
- Guarda `timing.json` con `total_tokens` y `duration_ms` (en Claude Code vienen
  en la notificación de fin de subagente; guárdalos al momento).

## 3. Assertions (tras ver la primera salida)
Verificables y específicas:
- Bien: «La salida es JSON válido», «El gráfico tiene ejes etiquetados», «Incluye
  ≥3 recomendaciones».
- Mal: «La salida es buena» (vago), «Usa exactamente la frase X» (frágil).
No todo necesita assertion (estilo, diseño visual → revisión humana).

## 4. Calificar — `grading.json`
PASS/FAIL **con evidencia concreta** que cite la salida. Para checks mecánicos
(JSON válido, nº de filas, dimensiones) usa un **script**, más fiable que un LLM.
Exige evidencia para un PASS (una sección "Resumen" con una frase vaga es FAIL).
Revisa también las assertions: elimina las que siempre pasan, arregla las que
siempre fallan o no son verificables.

## 5. Agregar — `benchmark.json`
Calcula `pass_rate`, `time_seconds`, `tokens` (media/stddev) por configuración y
el **delta** con/sin skill. Un skill que suma 13s pero +50pts de pass_rate vale;
uno que duplica tokens por +2pts, quizá no. (stddev solo es útil con varios runs.)

## 6. Analizar patrones
- Quita assertions que pasan en ambas configuraciones (no informan).
- Investiga las que fallan en ambas (rota, caso muy difícil, o mide lo que no es).
- Estudia las que pasan **con** skill y fallan **sin**: ahí aporta valor; entiende
  por qué (qué instrucción/script lo logró).
- Si un caso pasa a veces sí y a veces no (stddev alto): instrucciones ambiguas →
  añade ejemplos/precisión.
- Revisa outliers de tiempo/tokens leyendo el transcript.

## 7. Revisión humana — `feedback.json`
Un humano capta lo que no previste. Feedback **accionable** por caso («faltan
etiquetas de ejes y los meses están en orden alfabético»), vacío si estuvo bien.

## 8. Loop de iteración
1. Da a un LLM: assertions falladas + feedback + transcripts + SKILL.md actual, y
   pide mejoras.
2. Aplica cambios. Guías: **generaliza** (no parches del caso puntual), **mantén
   lean** (menos y mejores instrucciones; quita trabajo inútil que veas en
   transcripts), **explica el porqué**, **bundlea** scripts repetidos.
3. Re-corre en `iteration-<N+1>/`, califica, agrega, revisa. Repite.
Para cuando el feedback esté consistentemente vacío o no veas mejora.
