---
name: gestion-requisitos
description: >-
  Usa este skill SIEMPRE que el usuario pida agregar, cambiar o eliminar una
  funcionalidad del proyecto; cuando pregunte que cubre o que falta; cuando de
  una instruccion que podria estar fuera del alcance definido; o cuando pida
  actualizar requisitos, historias de usuario o el alcance del proyecto.
  Disparadores: "agrega", "quiero que", "nueva funcion", "cambia el
  comportamiento de", "que cubre el proyecto", "esta en el alcance", "actualiza
  los requisitos", "nueva historia", "HU", "RF".
license: Proprietary
metadata:
  owner: jhansdelacruz
  docs:
    requisitos: docs/requisitos-funcionales.md
    historias: docs/historias-de-usuario.md
---

# Gestion de requisitos y alcance

## 0. Archivos a mantener

| Archivo | Que contiene |
|---|---|
| `docs/requisitos-funcionales.md` | Lista numerada de requisitos (RF). Fuente de verdad del alcance. |
| `docs/historias-de-usuario.md` | HUs en formato estandar. Cada una referencia uno o mas RF. |

**Antes de cualquier accion, leer ambos archivos.** Son la fuente de verdad del
proyecto; `docs/diseno.md` es el historico de decisiones y no se reemplaza.

---

## 1. Cuando llega una nueva instruccion: verificar alcance primero

Antes de analizar o implementar cualquier cambio funcional:

1. Leer `docs/requisitos-funcionales.md`.
2. Buscar si la instruccion cabe dentro de un RF existente (puede ser una mejora
   o un detalle de uno ya definido).
3. Si **no cabe** en ningun RF existente:
   - Decir exactamente: "Esta instruccion no esta en los requisitos establecidos.
     El alcance actual cubre: [listar los RFs afines mas cercanos]. Quieres
     agregarlo como nuevo RF antes de continuar?"
   - No implementar nada hasta que el usuario confirme o descarte.
4. Si **cabe** en un RF existente: proceder con el analisis/implementacion de
   forma normal, sin interrumpir.

**No aplicar este chequeo** a cambios de diseno visual, correcciones de bugs
evidentes o ajustes de texto que no amplian el alcance.

---

## 2. Como actualizar los documentos

### Despues de implementar una funcionalidad nueva o modificar una existente:

1. **`docs/requisitos-funcionales.md`**:
   - Si es funcionalidad nueva: agregar un RF en el area que corresponde, con
     estado `implementado`.
   - Si es cambio a uno existente: editar la descripcion del RF afectado.
   - Si es funcionalidad descartada: cambiar estado a `descartado` con una nota
     breve de por que.

2. **`docs/historias-de-usuario.md`**:
   - Si la funcionalidad nueva tiene un actor y un objetivo claros: agregar una HU.
   - Si modifica una HU existente: actualizar el criterio de aceptacion.
   - No duplicar: una HU por comportamiento observable por el usuario.

### Cuando el usuario pida actualizar sin haber implementado nada:

Actualizar los documentos reflejando el nuevo alcance acordado, con estado
`pendiente`. El estado cambia a `implementado` cuando el codigo este listo.

---

## 3. Formato de `docs/requisitos-funcionales.md`

```markdown
# Requisitos funcionales

Ultima actualizacion: YYYY-MM-DD

## [Area]

| ID | Descripcion | Estado |
|---|---|---|
| RF-NNN | Descripcion concisa en infinitivo. | implementado / pendiente / futuro / descartado |
```

- IDs: correlativos globales (`RF-001`, `RF-002`, ...), no reiniciar por area.
- Descripcion: una linea, en infinitivo, sin adornos. Ejemplo: "Crear atenciones
  con tipo, titulo, proyecto e ID de seguimiento."
- Estado:
  - `implementado` — en el codigo y funcionando.
  - `pendiente` — acordado pero no construido.
  - `futuro` — mencionado pero sin decision de hacerlo.
  - `descartado` — evaluado y decidido no hacer; dejar la fila con nota.
- Areas actuales del proyecto: Atenciones, Bitacora, Foco, Ideas, Accesos,
  Estructura de carpetas, Jira (futuro).

---

## 4. Formato de `docs/historias-de-usuario.md`

```markdown
# Historias de usuario

Ultima actualizacion: YYYY-MM-DD

## [Area]

### HU-NNN: [titulo corto]

**Como** Jhans,  
**quiero** [accion concreta],  
**para** [beneficio directo].

**Criterios de aceptacion:**
- [ ] Criterio 1
- [ ] Criterio 2

**RF relacionados:** RF-NNN, RF-MMM  
**Estado:** implementada / pendiente / descartada
```

- IDs: correlativos globales, no reiniciar por area.
- Actor siempre es Jhans (herramienta personal).
- Criterios de aceptacion: solo lo verificable, sin tecnicismos de
  implementacion. Maximo 4 criterios por HU; si hay mas, dividir la HU.
- No documentar detalles internos (rutas, JSON, nombres de funciones): eso va
  en `docs/diseno.md`.

---

## 5. Gotchas

- **`docs/diseno.md` no se modifica con este skill.** Es el historico de
  decisiones de arquitectura. Si hay contradiccion entre `diseno.md` y los RFs,
  los RFs ganan (son el estado actual acordado).
- **No agregar RFs que ya esten implicitos** en otro mas general. Ejemplo: si
  RF-005 dice "editar entradas de bitacora", no agregar RF-030 "editar el texto
  de una entrada"; es el mismo.
- **El chequeo de alcance aplica a funcionalidad, no a refactorizacion.** Si el
  usuario pide refactorizar o mejorar el rendimiento de algo ya implementado,
  proceder sin preguntar.
- **Mantener los documentos cortos.** Si un area tiene mas de 15 RFs, revisar si
  algunos se pueden fusionar. La claridad es mas valiosa que la exhaustividad.
