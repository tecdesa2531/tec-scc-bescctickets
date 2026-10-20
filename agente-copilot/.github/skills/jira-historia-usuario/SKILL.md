---
name: jira-historia-usuario
description: Crea las historias de usuario (HU) en Jira. La independiente para una atencion compleja (en /inicia) y la semanal para los tickets simples (cuando Jhans la pide o cuando /inicia de una semanal no encuentra una HU vigente). No cambia estados de HU ni cierra sprints.
---

# Historias de usuario

Sigue `.github/copilot-instructions.md`. Generas el script `.py` en `040_ProcesoJira` y **lo ejecutas tu** en la terminal tras la confirmacion "crear" de Jhans (primero un `--dry-run`). Solo biblioteca estandar y `curl.exe --ssl-no-revoke` via `subprocess`.

| Tipo | Cuando | Cuantas |
|---|---|---|
| Independiente | atencion con `hu_tipo: "independiente"`, en `/inicia` | una por atencion; sus subtareas son sus tareas |
| Semanal | tickets simples | una por semana (lun-vie) del sprint; estan en `hu_semanales` de `config-jira.json` |

Los datos de Jira salen del destino del proyecto: `config-jira.json` -> `proyectos[tracking_code]` -> `destinos[...]`. Si el proyecto tiene varios destinos, se crea una HU por destino.

La API no asocia la HU a la epica ni al sprint: eso lo hace Jhans en el tablero. Aqui solo se crea.

## HU independiente (en `/inicia`)

En `/inicia`, el `titulo_jira` y la `descripcion` aun no existen (los escribe `/limpia`). Toma el `titulo` de `ticket-datos.json`, mejoralo levemente (ortografia, claridad, coherencia entre palabras) y usalo como `summary` de la HU. No lo copies literal pero tampoco lo reescribas desde cero: es una mejora menor. Crea la HU directamente, sin mostrar propuesta ni pedir confirmacion a Jhans. En `/procede`, el agente actualiza el titulo a `titulo_jira` y la descripcion a la `descripcion` ya corregida.

**Titulo** (sin corchetes; entornos entre parentesis en mayusculas):

```
INFRAS(DEV,PRE): JINT0000000001 - titulo
DOCINF: JDOC0000000005 - titulo
```

Con todos los entornos de la atencion separados por coma; sin parentesis si la atencion no tiene entorno.

**Descripcion** (formato wiki de Jira, saltos como `\n` en el JSON). Contenido **breve, sin rodeos**. Saca el OBJETIVO y el ALCANCE de tu analisis de la bitacora:

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

- Mismas reglas que las subtareas: `*COMO*` es el rol (sin nombres); el **Solicitante** (con nombre) sale del **correo de solicitud**, no del de asignacion; el Tracking ID como enlace si hay `url_servicenow`.
- La **captura del correo de asignacion** se sube como adjunto y se referencia con `!archivo.png|thumbnail!`; si no hay correo de asignacion, usa la del **correo de solicitud** (`captura_correo_solicitud`). El `.eml` y la captura de cierre van en el comentario final (ver `jira-comentarios`).

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

Jhans crea el sprint y te da su duracion (inicio y fin). El agente crea **una HU por semana** (lunes a viernes) dentro del rango del sprint. Tambien cuando en `/inicia` de una atencion semanal no hay en `hu_semanales` una HU que cubra su fecha: avisa y crea las que falten.

Para calcular las semanas: parte del lunes de la semana del inicio del sprint y avanza en tramos de lunes a viernes hasta cubrir el fin del sprint. Una HU por cada tramo (semana completa lun-vie, aunque el sprint empiece o termine a mitad de semana).

**Titulo** (uno por semana): `[INFRA] Atencion de tickets multiproyecto - Semana DD/MM al DD/MM`. No se nombran proyectos: siempre multiproyecto.

**Descripcion** (wiki, sin titulo DESCRIPCION; COMO/QUIERO/PARA en negrita): `*COMO* equipo de infraestructura multiproyecto, *QUIERO* atender y registrar las solicitudes, *PARA* dar soporte y trazabilidad`; con OBJETIVO de esa semana, ALCANCE (atencion en DEV/PRE/PRO y solicitudes sin Tracking ID), CRITERIOS (cada solicitud tiene su subtarea con avances y cierre) y DOD.

**Archivos** para las HU semanales (en la carpeta que use Jhans): un payload por semana, `AAAAMMDD_hu_semana.json` (fecha del lunes), y su `AAAAMMDD_hu_respuesta.json`. Si hay varios destinos, una por destino.

Cuando cada HU exista (key en la respuesta), registrala en `hu_semanales` de `config-jira.json` del destino: `{ "inicio": "AAAA-MM-DD", "fin": "AAAA-MM-DD", "key": "..." }` (lunes y viernes de esa semana). `hu_semanales` guarda **solo el sprint activo**: las HU de un sprint nuevo **reemplazan** a las del anterior, no se acumulan. Actualiza tambien `sprint` con las fechas que te dio Jhans. La `epica` la cambia Jhans.

## Script de creacion (referencia)

Script `.py` de biblioteca estandar. Lee los nombres de las variables de entorno del destino desde `config-jira.json` (no incrusta credenciales). Crea el issue, guarda la respuesta y muestra la key.

```python
import json
import os
import subprocess
import sys

CARPETA = os.path.dirname(os.path.abspath(__file__))
CREAR = os.path.join(CARPETA, "jira-hu_crear.json")
RESP = os.path.join(CARPETA, "jira-hu_respuesta.json")

# Nombres de las variables de entorno del destino (de config-jira.json)
URL = os.environ["JIRA_ACMEBANK_URL"].rstrip("/") + "/rest/api/2"
AUTH = os.environ["JIRA_ACMEBANK_EMAIL"] + ":" + os.environ["JIRA_ACMEBANK_TOKEN"]


def crear():
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
    crear()
```

Despues de ejecutar el script (tras el "crear" de Jhans), confirma la key en `jira-hu_respuesta.json`, guardala donde corresponda (`jira.padre_key` para la independiente; un elemento en `hu_semanales` de `config-jira.json` por cada HU semanal) y registra una linea en `jira-ejecuciones.log`.
