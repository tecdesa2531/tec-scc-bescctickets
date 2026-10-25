# Contexto del proyecto

Repositorio personal de Jhans (infraestructura/DevOps) para organizar su día de trabajo y registrar sus atenciones en Jira. Tiene dos partes que trabajan juntas:

```
/
├── CLAUDE.md                 este archivo
├── docs/diseno.md            decisiones y acuerdos completos: LEER antes de proponer cambios de diseño
├── mi-dia/                   herramienta local (Python + HTML): bitácora, foco, accesos
└── agente-copilot/           agente y skills de GitHub Copilot (carpeta .github) que preparan Jira
```

El código se desarrolla aquí y se ejecuta en la laptop corporativa (Windows), que solo baja cambios con `git pull`.

Los nombres de proyectos, tickets, claves de Jira y herramientas internas que aparecen en la documentación son **ejemplos ficticios**. Los valores reales viven en las carpetas de datos y en `config-jira.json`, fuera del repositorio. Interpreta cada valor por su formato (por ejemplo, Tracking Code = 6 letras), no por el ejemplo.

## Reglas de trabajo (obligatorias)

1. **Analizar antes de entregar.** Antes de escribir código o cualquier entregable, analizar la tarea con Jhans y acordar el enfoque. Solo entregar directo si lo pide explícitamente.
2. **Sin tildes, ñ ni caracteres especiales en el código**: variables, comentarios, mensajes de consola y textos de la interfaz. Los datos que escribe el usuario sí pueden llevarlos (UTF-8).
3. **Documentación en español bien escrito**, con tildes y ñ (README, docs, este archivo).
4. **Simple y legible**: código fácil de entender por una persona, sin adornos visuales (colores en consola, barras, iconos).
5. **Solo biblioteca estándar de Python.** No instalar paquetes, no crear entornos virtuales, no cambiar el intérprete.
6. **HTTPS desde Python**: `curl.exe --ssl-no-revoke` vía `subprocess`. No usar `urllib` para HTTPS ni desactivar la validación de certificados.
7. **No crear scripts `.ps1`.** Las operaciones de Jira son scripts `.py`. El agente Copilot los ejecuta en la terminal de VS Code tras la confirmacion "crear" de Jhans en el chat (primero un `--dry-run`); Jhans tambien puede correrlos a mano con `python nombre_script.py` (sin `.\`, para que funcione igual en PowerShell y en Git Bash).
8. **Credenciales**: siempre en variables de entorno. Nunca leerlas, mostrarlas ni escribirlas en archivos.
9. **Nada del banco en el repositorio**: ni `config-jira.json`, ni enlaces reales, ni datos de atenciones.

## Entorno de destino

- Laptop corporativa con Windows y PowerShell, sin permisos para instalar software (tampoco Docker).
- Python disponible. El servidor local en `127.0.0.1` funciona (probado).
- Navegador Edge, con Áreas de trabajo (Workspaces) disponibles. No se pueden instalar extensiones.
- Datos en OneDrive corporativo, en dos raíces separadas (ver abajo).
- Jira Cloud.

## Arquitectura en una mirada

**Dos raíces de datos** (variables de entorno), con la misma estructura `proyecto / entorno / atención`:

| Variable | Contenido | Quién la ve |
|---|---|---|
| `AT_RAIZ_TRABAJO` | Correos `.eml`, adjuntos, capturas de avance. Nada de Jira ni Copilot. | Otras personas (OneDrive) |
| `AT_RAIZ_PROCESO` | `ticket-datos.json`, `bitacora.json`, `040_ProcesoJira/`, foco, ideas, accesos, `config-jira.json`, índice | Solo Jhans |

`AT_CORREO` es el correo de Jhans: los `.eml` que envía él se guardan como `atendido`; el resto como `asignado`.

**Un dueño por archivo:**

| Archivo | Escribe | Lee |
|---|---|---|
| `ticket-datos.json` | Herramienta (Copilot solo completa `correos[].resumen`, `descripcion`, `titulo_jira`, `jira` y `subtareas`) | Ambos |
| `040_ProcesoJira/bitacora-correccion.json` | Copilot | Herramienta (original / corregido) |
| `bitacora.json` | Herramienta | Copilot |
| `040_ProcesoJira/jira-*.json` | Copilot | Herramienta (solo para saber qué se subió) |

**Herramienta** (`mi-dia/`): `servidor.py` (biblioteca estándar, `ThreadingHTTPServer`) + `index.html` (JavaScript sin librerías). Datos en JSON, sin base de datos. Su `README.md` documenta uso, formato de datos y la lista de prueba.

**Agente Copilot** (`agente-copilot/.github/`): `copilot-instructions.md`, el agente `atencion-tickets`, los prompts `/inicia`, `/limpia`, `/procede` y `/corrige`, y cinco skills (`correo-procesar`, `jira-comentarios`, `jira-historia-usuario`, `jira-subtareas`, `sprint-cierre`; `indice-atenciones` ya se eliminó, el índice lo genera la herramienta). Ya trabaja sobre las dos raíces vía `agente-cola.json`: no organiza carpetas ni correos. Copilot solo carga `copilot-instructions.md` desde `agente-copilot/.github/`, y los prompts usan `agent: atencion-tickets`. El `config-jira.json` del repositorio es una plantilla; el real está en la raíz de proceso.

## Estado actual

- **Etapas 1 a 4 terminadas y probadas**: accesos rápidos, atenciones, bitácora (correos, adjuntos, capturas, edición, bloqueo de enviadas, Terminar) y foco (pausa, idea, reunión, interrupción, terminar día, ideas pendientes).
- **Etapa 5 (adaptar el agente Copilot al nuevo flujo) ya está hecha**: el agente lee las dos raíces vía `agente-cola.json` y trabaja solo con `/inicia`, `/limpia`, `/procede` y `/corrige`. La sección "Etapa 5" de `docs/diseno.md` queda como historial de esa decisión, no como pendiente.
- **Modo Interrupción (NPL)** agregado en la herramienta: registra llamadas y chats sin agendar, con cierre diferido y vínculo a un ticket existente vía Atención padre (ver `docs/diseno.md`). No pasa por limpieza ni conforme: cerrada con los datos completos queda en `pendiente_jira` (RF-059). El agente ya conoce el tipo `npl`: corrige el resumen en `/procede` y enruta el comentario según los tres casos (RF-053 a RF-055); falta probarlo contra Jira en la laptop.
- Después: flujos A-D como lista de pasos, índice semanal generado por la herramienta, relación DOC-ticket y, más adelante, la subida a Jira desde la herramienta.

## Cómo probar la herramienta aquí

```bash
mkdir -p /tmp/at/trabajo /tmp/at/proceso
cd mi-dia
AT_RAIZ_TRABAJO=/tmp/at/trabajo AT_RAIZ_PROCESO=/tmp/at/proceso AT_CORREO=yo@empresa.com python3 servidor.py
```

Luego abrir `http://127.0.0.1:8765`. Antes de entregar cambios: verificar que el código no tenga caracteres no ASCII (`grep -nP '[^\x00-\x7F]'`) y que el JavaScript de `index.html` compile.
