# Guía de puesta en marcha (laptop Windows)

Pasos para dejar funcionando la herramienta **Mi día** y el **agente de Copilot** en la laptop corporativa. Las variables de entorno se definen en **PowerShell** (donde corre la herramienta); los cambios del código llegan con `git pull`.

## 1. Traer los cambios (terminal de Git)

```bash
cd <ruta-del-repo>/tec-scc-bescctickets
git pull
```

La primera vez, en lugar del `pull`, clonar el repositorio y entrar a la carpeta.

## 2. Archivos cuyo contenido debes editar

Solo hay que tocar **dos archivos** (más las variables de entorno del paso 3):

| Archivo | Dónde está | Qué cambiar |
|---|---|---|
| `config-jira.json` | **Cópialo** desde `agente-copilot\config-jira.json` (plantilla) a la **raíz de proceso** y edítalo ahí. El real **no** va al repositorio. | En `destinos`: `url_var`, `email_var`, `token_var` (nombres de tus variables de entorno), `proyecto_key`, `tipo_subtarea_id`, `tipo_historia_id`, `asignado_account_id`, `epica`. En `sprint` las fechas del sprint y en `hu_semanales` las HU de cada semana (las crea el agente). En `proyectos`, el mapeo de cada Tracking Code a su destino. |
| `atencion-tickets.code-workspace` | En la raíz del repo | Las **dos rutas**: la de la raíz de trabajo y la de la raíz de proceso (tus carpetas de OneDrive). |

El `token` de Jira **nunca** va en un archivo: solo en una variable de entorno (paso 3).

## 3. Variables de entorno en PowerShell

La herramienta y los scripts de Jira las leen de aquí. Reemplaza las rutas y valores por los tuyos. Los nombres `JIRA_ACMEBANK_*` son de ejemplo: usa los que pusiste en `url_var`, `email_var` y `token_var` de tu `config-jira.json`.

**Para la sesión actual** (se pierden al cerrar la ventana):

```powershell
$env:AT_RAIZ_TRABAJO = "C:\Ruta\A\Tu\Raiz_Trabajo"
$env:AT_RAIZ_PROCESO = "C:\Ruta\A\Tu\Raiz_Proceso"
$env:AT_CORREO       = "tucorreo@empresa.com"

$env:JIRA_ACMEBANK_URL   = "https://tuempresa.atlassian.net"
$env:JIRA_ACMEBANK_EMAIL = "tucorreo@empresa.com"
$env:JIRA_ACMEBANK_TOKEN = "tu-api-token"
```

**Para dejarlas permanentes** (a nivel usuario, una sola vez; luego cierra y abre PowerShell):

```powershell
[Environment]::SetEnvironmentVariable("AT_RAIZ_TRABAJO", "C:\Ruta\A\Tu\Raiz_Trabajo", "User")
[Environment]::SetEnvironmentVariable("AT_RAIZ_PROCESO", "C:\Ruta\A\Tu\Raiz_Proceso", "User")
[Environment]::SetEnvironmentVariable("AT_CORREO",       "tucorreo@empresa.com", "User")
[Environment]::SetEnvironmentVariable("JIRA_ACMEBANK_URL",   "https://tuempresa.atlassian.net", "User")
[Environment]::SetEnvironmentVariable("JIRA_ACMEBANK_EMAIL", "tucorreo@empresa.com", "User")
[Environment]::SetEnvironmentVariable("JIRA_ACMEBANK_TOKEN", "tu-api-token", "User")
```

Para verificar que quedaron:

```powershell
$env:AT_RAIZ_TRABAJO
$env:AT_RAIZ_PROCESO
```

## 4. Correr la herramienta (PowerShell)

```powershell
cd <ruta-del-repo>\tec-scc-bescctickets\mi-dia
python .\servidor.py
```

Luego abre en Edge: **http://127.0.0.1:8765**. Para detenerla, `Ctrl + C` en la terminal.

(Opcional, para cambiar el puerto: `$env:AT_PUERTO = "8799"` antes de iniciar.)

## 5. Agente de Copilot (VS Code)

1. Abre `atencion-tickets.code-workspace` (Archivo → Abrir área de trabajo desde archivo).
2. En Copilot Chat usa los comandos: `/inicia`, `/limpia`, `/procede` (con un ID, o sin ID para tomar de la cola).

## 6. Las operaciones de Jira

El agente prepara el script `.py` y **lo ejecuta él mismo** en la terminal de VS Code: primero un `--dry-run` que te muestra qué hará, y cuando tú le dices **"crear"** en el chat, lo ejecuta de verdad. No tienes que copiar comandos ni buscar carpetas.

Para que funcione, las variables `JIRA_*` deben estar definidas a nivel **usuario** (paso 3), así la terminal de VS Code las toma.

Si prefieres correr un script a mano, puedes hacerlo igual desde su carpeta `040_ProcesoJira`:

```powershell
python .\nombre_script.py --dry-run   # simula, no toca Jira
python .\nombre_script.py             # ejecuta de verdad
```

## Resumen del orden

1. `git pull`.
2. Editar `config-jira.json` (en la raíz de proceso) y `atencion-tickets.code-workspace`.
3. Definir las variables de entorno en PowerShell.
4. `python .\servidor.py` y abrir el navegador.
5. Abrir el workspace en VS Code y usar los comandos del agente.
