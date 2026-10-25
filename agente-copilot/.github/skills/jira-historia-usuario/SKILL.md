---
name: jira-historia-usuario
description: Crea las historias de usuario (HU) en Jira. La independiente para una atencion compleja (en /inicia, o en /procede si se salto /inicia) y las semanales del sprint para los tickets simples (cuando Jhans las pide, con dry-run y "crear"; /inicia no las crea). Nunca crea HU para una atencion hija. No cambia estados de HU ni cierra sprints.
---

# Historias de usuario

Sigue `.github/copilot-instructions.md`. Generas el script `.py` en `040_ProcesoJira` (las HU semanales, en `003_Herramienta/020_ProcesoSprint`) y **lo ejecutas tu** en la terminal. Solo biblioteca estandar y `curl.exe --ssl-no-revoke` via `subprocess`.

**Gate de ejecucion:**
- **HU independiente en `/inicia`**: directo, sin `--dry-run` ni "crear".
- **Todo lo demas** (HU independiente creada o actualizada en `/procede`, HU semanales del sprint, `/corrige`): primero `--dry-run` y, tras el "crear" de Jhans, la ejecucion real.

Una atencion **hija** nunca es HU (ver "Padre e hijos" en `copilot-instructions.md`): no crees una HU para ella.

| Tipo | Cuando | Cuantas |
|---|---|---|
| Independiente | atencion con `hu_tipo: "independiente"`, en `/inicia` | una por atencion; sus subtareas son sus tareas |
| Semanal | tickets simples | una por semana (lun-vie) del sprint; estan en `hu_semanales` de `config-jira.json` |

Los datos de Jira salen del destino del proyecto: `<raiz_proceso>/config-jira.json` -> `proyectos[tracking_code]` -> `destinos[...]`. Hoy cada proyecto tiene un solo destino; si trae mas de uno, avisa y pregunta antes de crear.

La API no asocia la HU a la epica ni al sprint: eso lo hace Jhans en el tablero. Aqui solo se crea.

## HU independiente (en `/inicia`)

En `/inicia`, el `titulo_jira` y la `descripcion` aun no existen (los escribe `/limpia`). Toma el `titulo` de `ticket-datos.json`, mejoralo levemente (ortografia, claridad, coherencia entre palabras) y usalo como `summary` de la HU. No lo copies literal pero tampoco lo reescribas desde cero: es una mejora menor. Crea la HU directamente, sin mostrar propuesta ni pedir confirmacion a Jhans. En `/procede` (con `--dry-run` y "crear"), actualiza el titulo a la forma completa con `titulo_jira` y rearma la descripcion con el formato de abajo, con lo que aporto `/limpia`. **Nunca** copies en Jira la `descripcion` de `ticket-datos.json`: es la de la herramienta, en markdown.

**Titulo** (sin corchetes; entornos entre parentesis en mayusculas):

```
INFRAS(DEV,PRE): JINT0000000001 - titulo
DOCINF: JDOC0000000005 - titulo
```

Con todos los entornos de la atencion separados por coma; sin parentesis si la atencion no tiene entorno.

**Descripcion** (formato wiki de Jira, saltos como `\n` en el JSON). Contenido **breve, sin rodeos**. Fuente del OBJETIVO y el ALCANCE: en `/inicia`, el correo de asignacion o de solicitud **si existe**; si no hay correos (lo normal en `JINT`, `JDOC`, `JCON`), redactalos breves a partir del `titulo` de la atencion. **Nunca te detengas por falta de correos.** En `/procede`, la rearmas con este mismo formato a partir de la bitacora corregida y de los datos que ya hay (solicitante, correos, captura):

```
*COMO* <rol de Jhans, nunca un nombre: p. ej. DevOps del equipo de nube o miembro del equipo de infraestructura>, *QUIERO* <lo que pide>, *PARA* <para que lo necesita>.

*OBJETIVO:*
<resultado concreto, breve>

*ALCANCE:*
<que abarca; menciona los entornos, breve>

*DATOS:*
* Tracking ID: [PTSK0000123|https://.../PTSK0000123]
* Proyecto: PROYAA
* Entornos: PRE, PRO
* Solicitante: Nombre del solicitante

*CAPTURA DEL CORREO DE ASIGNACION:*
!20261005_captura_correo_asignado.png|thumbnail!
```

- Mismas reglas que las subtareas: `*COMO*` es el rol (sin nombres); el **Solicitante** (solo el nombre, sin el correo) sale del **correo de solicitud**, no del de asignacion; si no hay correo ni campo `solicitante`, **omite esa linea** (no preguntes); el Tracking ID como enlace si hay `url_servicenow`; sin entorno (`["SIN_ENTORNO"]`), omite la linea `Entornos`.
- La **captura del correo de asignacion** (`040_ProcesoJira/AAAAMMDD_captura_correo_asignado.<ext>`, en las `capturas` de la entrada `asignacion`) se sube como adjunto y se referencia con su nombre real, `!archivo|thumbnail!`; si no hay correo de asignacion, usa la del **correo de solicitud** (`..._captura_correo_solicitud.<ext>`); si no hay ninguno, **omite la seccion de captura**. El `.eml` y la captura de cierre van en el comentario final (ver `jira-comentarios`).

No muestres la propuesta ni esperes ajustes: genera el script y ejecutalo directamente.

**Archivos** en `040_ProcesoJira`: `jira-hu_crear.json` (payload) y `jira-hu_respuesta.json` (lo escribe el script).

```json
{
  "fields": {
    "project": { "key": "PRYA" },
    "issuetype": { "id": "10002" },
    "assignee": { "accountId": "000000:aaaaaaaa-0000-0000-0000-000000000001" },
    "summary": "INFRAS(DEV,PRE): JINT0000000001 - titulo",
    "description": "*COMO* DevOps del equipo de nube, *QUIERO* ..."
  }
}
```

Sin `parent` ni campo de sprint. `project.key`, `issuetype.id` (`tipo_historia_id`) y `assignee.accountId` (`asignado_account_id`) salen del destino. Si hay `prioridad` o `etiquetas` en el destino, agregalos.

Al crear, guarda en `ticket-datos.json`: `jira.padre_key`, `jira.padre_url` (`<url_del_destino>/browse/<key>`) y `jira.tipo_padre: "hu"`.

## HU semanales del sprint

Jhans crea el sprint y te da su duracion (inicio y fin). El agente crea **una HU por semana** (lunes a viernes) dentro del rango del sprint, con `--dry-run` y "crear". Si en `/inicia` de una atencion semanal no hay en `hu_semanales` una HU que cubra su fecha, **no la crees ahi**: avisa a Jhans y salta esa atencion; las HU semanales se crean aparte con este flujo.

Para calcular las semanas: parte del lunes de la semana del inicio del sprint y avanza en tramos de lunes a viernes hasta cubrir el fin del sprint. Una HU por cada tramo (semana completa lun-vie, aunque el sprint empiece o termine a mitad de semana).

**Titulo** (uno por semana): `[INFRA] Atencion de tickets multiproyecto - Semana DD/MM al DD/MM`. No se nombran proyectos: siempre multiproyecto.

**Descripcion** (wiki, sin titulo DESCRIPCION; COMO/QUIERO/PARA en negrita): `*COMO* equipo de infraestructura multiproyecto, *QUIERO* atender y registrar las solicitudes, *PARA* dar soporte y trazabilidad`; con OBJETIVO de esa semana, ALCANCE (atencion en DEV/PRE/PRO y solicitudes sin Tracking ID), CRITERIOS (cada solicitud tiene su subtarea con avances y cierre) y DOD.

**Archivos** para las HU semanales, en `<raiz_proceso>/003_Herramienta/020_ProcesoSprint/` (creala si no existe): un payload por semana, `AAAAMMDD_hu_semana.json` (fecha del lunes), y su `AAAAMMDD_hu_respuesta.json`. Si `destinos` tiene varios destinos, una por destino. El script y su `jira-ejecuciones.log` van en la misma carpeta.

Cuando cada HU exista (key en la respuesta), registrala en `hu_semanales` del destino en `<raiz_proceso>/config-jira.json` (nunca en la plantilla del repositorio): `{ "inicio": "AAAA-MM-DD", "fin": "AAAA-MM-DD", "key": "...", "subtarea_interrupciones_key": "..." }` (lunes y viernes de esa semana). `hu_semanales` guarda **solo el sprint activo**: las HU de un sprint nuevo **reemplazan** a las del anterior, no se acumulan. Actualiza tambien `sprint` con las fechas que te dio Jhans. La `epica` la cambia Jhans.

**Subtarea fija de interrupciones.** Junto con cada HU semanal (mismo `--dry-run` y "crear", mismo lote), crea tambien una subtarea bajo esa HU para las interrupciones (NPL) sin ticket relacionado de esa semana: titulo `Interrupciones y consultas no planificadas - semana DD/MM al DD/MM`, sin descripcion especial (una linea basta, p. ej. "Comentarios de llamadas y chats no planificados de esta semana, sin ticket relacionado."). Usa el mismo mecanismo de `jira-subtareas` (`parent.key` = la HU recien creada). Guarda su `key` como `subtarea_interrupciones_key` en la misma entrada de `hu_semanales`. El `/procede` de una NPL sin padre la usa para subir su comentario (ver "Interrupciones" en `copilot-instructions.md` y el skill `jira-comentarios`). Si la HU semanal ya existe pero su entrada en `hu_semanales` no tiene `subtarea_interrupciones_key` (p. ej. se creo antes de esta regla), el `/procede` de la primera NPL que la necesite la crea en ese momento (dentro de su mismo `--dry-run`/"crear") y guarda la key; las siguientes NPL de esa semana la reutilizan.

## Script de creacion (referencia)

Script `.py` de biblioteca estandar. Las credenciales se leen de variables de entorno (no se incrustan); los nombres del ejemplo son ficticios: al generar el script, pon los de `url_var`, `email_var` y `token_var` del destino. Crea el issue, guarda la respuesta y muestra la key. Con `--dry-run` solo muestra que HU crearia, sin llamar a Jira.

```python
import json
import os
import subprocess
import sys

CARPETA = os.path.dirname(os.path.abspath(__file__))
# HU semanal: AAAAMMDD_hu_semana.json y AAAAMMDD_hu_respuesta.json
CREAR = os.path.join(CARPETA, "jira-hu_crear.json")
RESP = os.path.join(CARPETA, "jira-hu_respuesta.json")

# Nombres de ejemplo: usa los del destino (url_var, email_var, token_var)
URL = os.environ["JIRA_ACMEBANK_URL"].rstrip("/") + "/rest/api/2"
AUTH = os.environ["JIRA_ACMEBANK_EMAIL"] + ":" + os.environ["JIRA_ACMEBANK_TOKEN"]


def crear(seco):
    if seco:
        datos = json.load(open(CREAR, encoding="utf-8"))
        print("[dry-run] creara la HU: " + datos["fields"]["summary"])
        return
    salida = subprocess.run(
        ["curl.exe", "-sS", "--ssl-no-revoke", "-u", AUTH, "-X", "POST",
         URL + "/issue", "-H", "Content-Type: application/json",
         "--data-binary", "@" + CREAR],
        capture_output=True, text=True).stdout
    with open(RESP, "w", encoding="utf-8") as archivo:
        archivo.write(salida)
    datos = json.loads(salida) if salida else {}
    clave = datos.get("key")
    if not clave:
        print("Error al crear la HU:")
        print(salida)
        sys.exit(1)
    print("Historia de usuario creada: " + clave)
    print("Recuerda asociarla a la epica y al sprint desde el tablero.")


if __name__ == "__main__":
    crear("--dry-run" in sys.argv)
```

Despues de ejecutar el script (directo en `/inicia`; tras el "crear" de Jhans en lo demas), confirma la key en `jira-hu_respuesta.json`, guardala donde corresponda (`jira.padre_key` para la independiente; un elemento en `hu_semanales` de `<raiz_proceso>/config-jira.json` por cada HU semanal) y registra una linea en `jira-ejecuciones.log`.
