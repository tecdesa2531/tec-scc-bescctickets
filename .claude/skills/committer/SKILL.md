---
name: committer
description: Crea y ejecuta commits de Git en formato Conventional Commits (tipo(scope): descripcion), sin emojis, uno por cada funcionalidad terminada, y los sube al repositorio remoto de GitHub usando SSH. Úsalo cuando el usuario pida "haz un commit", "commitea esto", "sube los cambios" o termine una tarea y quiera guardar el avance.
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git add *) Bash(git commit *) Bash(git log *) Bash(git remote *) Bash(git push *) Bash(ssh -T git@github.com)
---

# Committer

Genera y ejecuta commits siguiendo estas reglas de forma estricta, y sube los cambios al repositorio remoto de GitHub usando SSH (nunca HTTPS).

## Formato obligatorio del commit
<tipo>(<scope>): <descripcion>

- Nunca uses emojis, en ninguna parte del mensaje.
- <descripcion> en minúscula, modo imperativo ("add", "fix", "remove"...), sin punto final.
- <scope> es el módulo afectado (backend, web, api, auth, dashboard...). Si el cambio es transversal, omite el scope.

## Tipos válidos
feat, fix, docs, style, refactor, test, chore, build, ci, perf

## Ejemplos
feat(backend): add filter for cars
fix(web): remove wrong color

## Conexión al repositorio: siempre por SSH

1. Antes de hacer push, ejecuta `git remote -v` y verifica que la URL del remoto `origin` tenga el formato SSH: `git@github.com:<owner>/<repo>.git`.
2. Si el remoto está configurado con HTTPS (`https://github.com/...`), **no lo cambies por tu cuenta**: avísale al usuario y pregúntale si quiere que lo actualices con `git remote set-url origin git@github.com:<owner>/<repo>.git`. Solo ejecútalo si el usuario confirma.
3. Si tienes dudas de si la conexión SSH está funcionando en la máquina, puedes verificarla con `ssh -T git@github.com` (debe responder con un saludo de autenticación de GitHub, no un error de permisos). Si falla, avisa al usuario — requiere que tenga su llave SSH agregada a su cuenta de GitHub, eso no lo resuelve el skill.
4. Nunca uses `https://` para clonar, hacer fetch, pull o push dentro de este flujo.

## Proceso

1. Ejecuta `git status` y `git diff` para ver los cambios.
2. Si detectas cambios de más de una funcionalidad sin relación entre sí, sugiere dividirlos en varios commits en vez de uno solo.
3. Propón el mensaje siguiendo el formato de arriba y muéstraselo al usuario ANTES de ejecutar nada.
4. Solo tras la confirmación, corre `git add` de los archivos relevantes y `git commit -m "<mensaje>"`.
5. Verifica el remoto según la sección "Conexión al repositorio" de arriba.
6. Pregunta al usuario si quiere hacer push ahora. Si confirma, ejecuta `git push origin <rama-actual>` usando el remoto SSH ya verificado.