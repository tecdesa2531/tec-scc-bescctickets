# Optimizar la `description` para que el skill DISPARE

Fuente: https://agentskills.io/skill-creation/optimizing-descriptions

La `description` carga toda la responsabilidad del disparo: al arranque el agente
solo ve `name` + `description` de cada skill y con eso decide si cargarlo.

> Matiz: los agentes suelen consultar skills solo para tareas que exceden lo que
> pueden hacer solos. Un «lee este PDF» simple puede no disparar aunque la
> descripción calce; donde un buen wording marca diferencia es en tareas con
> conocimiento especializado (API poco común, workflow de dominio, formato raro).

## Principios de una buena descripción
- **Imperativo**: «Usa este skill cuando…», no «Este skill hace…».
- **Intención del usuario**, no mecánica interna.
- **Insistente**: lista contextos donde aplica, incluidos los que no nombran el
  dominio («aunque no mencione explícitamente "CSV" o "análisis"»).
- **Concisa**: de unas frases a un párrafo corto. Límite duro **1024 chars**.

## Antes / después
```yaml
# Antes
description: Procesa archivos CSV.

# Después
description: >
  Analiza CSV y datos tabulares — estadísticas, columnas derivadas, gráficos y
  limpieza. Úsalo cuando el usuario tenga un CSV/TSV/Excel y quiera explorar,
  transformar o visualizar datos, aunque no diga explícitamente "CSV" o
  "análisis".
```

## Probar el disparo (si quieres rigor)
1. Arma ~20 queries etiquetadas `should_trigger` true/false (8–10 de cada).
   - **Positivas**: varía fraseo (formal/casual/typos), explicitud (nombra o no
     el dominio), detalle y complejidad (1 paso vs multi-paso). Las más útiles:
     casos donde el skill ayuda pero la conexión no es obvia.
   - **Negativas**: *near-misses* que comparten keywords pero necesitan otra cosa
     (p.ej. «actualiza fórmulas en mi Excel» vs. análisis de CSV).
   - Realismo: rutas de archivo, contexto personal, abreviaturas.
2. Corre cada query ≥3 veces; calcula **trigger rate**. Umbral 0.5: positiva pasa
   si >0.5, negativa pasa si <0.5.
3. **Split train/validation (~60/40)**: ajusta con train, verifica generalización
   con validation (fija el split).
4. Loop: evalúa → identifica fallos del *train* → revisa descripción
   (ensancha si no dispara; especifica/aclara el límite si falsea). No metas
   keywords exactas de los fallos (overfitting): ataca la **categoría** general.
   Si te atascas, cambia la *estructura* de la descripción, no tweaks menores.
5. Elige la iteración con mejor **validation pass rate** (puede no ser la última).
   ~5 iteraciones suele bastar.

> El skill `skill-creator` de Anthropic automatiza este loop (split, eval en
> paralelo, propuestas y reporte HTML en vivo).
