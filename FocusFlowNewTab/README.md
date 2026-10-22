# Focus Flow — Extensión de nueva pestaña para Edge

## Qué es y para qué sirve

Esta extensión reemplaza la página de nueva pestaña de Microsoft Edge por la herramienta **Focus Flow**, que corre localmente en tu laptop. Al abrir una pestaña nueva, la extensión verifica si el servidor está activo y, si lo está, redirige automáticamente. Si el servidor está apagado, muestra un aviso con un botón para reintentar.

---

## Requisitos

- Microsoft Edge (versión moderna con soporte para Manifest V3).
- El servidor de Focus Flow corriendo en `http://focusflow.localhost:8765`.
- Modo desarrollador activo en Edge (ver instalación).

---

## Estructura de la carpeta

```
FocusFlowNewTab/
├── manifest.json   declaración de la extensión
├── newtab.html     página que reemplaza la pestaña nueva
└── README.md       este archivo
```

---

## Cómo instalar

1. Abre Edge y navega a `edge://extensions`.
2. Activa el interruptor **Modo de desarrollador** (esquina superior izquierda).
3. Haz clic en **Cargar descomprimida** y selecciona la carpeta `FocusFlowNewTab`.
4. Edge mostrará un aviso en la barra de herramientas diciendo que hay extensiones en modo desarrollador. Es normal; aparece cada vez que abres el navegador mientras el modo esté activo. Puedes cerrarlo con la X o ignorarlo.

---

## Cómo usar

Con el servidor corriendo, abre una pestaña nueva (`Ctrl+T`). La extensión detecta el servidor y redirige en menos de un segundo. No hace falta ninguna acción adicional.

Si el servidor está apagado, verás el mensaje **"Focus Flow no esta activo. Inicia el servidor y recarga."** junto con un botón **Reintentar**. Una vez que levantes el servidor, haz clic en Reintentar o abre una pestaña nueva.

---

## Cómo pausar o desactivar temporalmente

1. Ve a `edge://extensions`.
2. Apaga el interruptor de la extensión **Focus Flow Nueva Pestana**.
3. `Ctrl+T` vuelve a mostrar la pestaña nueva normal de Edge.
4. Para reactivarla, enciende el interruptor nuevamente.

---

## Cómo cambiar la URL de destino

Abre `newtab.html` con un editor de texto y modifica la primera línea del bloque `<script>`:

```js
var URL_DESTINO = "http://focusflow.localhost:8765";
```

Reemplaza la URL por la que necesites, guarda el archivo y recarga la extensión en `edge://extensions` (ícono de recarga junto a la extensión).

> **Nota:** si cambias el nombre de host (por ejemplo, de `focusflow.localhost` a `localhost`), el `localStorage` del navegador para esa página queda en un origen distinto y los datos guardados ahí no se comparten entre ambos. Focus Flow guarda sus datos en archivos JSON en disco, no en `localStorage`, así que en la práctica no hay problema.

---

## Cómo desinstalar

1. Ve a `edge://extensions`.
2. Haz clic en **Quitar** en la tarjeta de **Focus Flow Nueva Pestana**.
3. Confirma la eliminación.

La carpeta `FocusFlowNewTab` queda en disco; puedes borrarla o conservarla para reinstalarla.

---

## Solución de problemas

**El servidor está apagado y aparece el aviso.**
Inicia el servidor con `python servidor.py` desde la carpeta `mi-dia` del repositorio y haz clic en Reintentar.

**La extensión fue borrada o la carpeta fue movida.**
Vuelve a cargarla desde `edge://extensions → Cargar descomprimida`. Si moviste la carpeta, selecciona la nueva ubicación.

**Edge muestra un aviso de extensiones en modo desarrollador cada vez que abro el navegador.**
Es el comportamiento normal de Edge cuando hay extensiones cargadas sin publicar en la tienda. Puedes cerrarlo con la X; no afecta el funcionamiento.

**La pestaña nueva no redirige aunque el servidor esté corriendo.**
Verifica que el servidor acepte conexiones desde `focusflow.localhost`. En `servidor.py`, el origen `focusflow.localhost` debe estar en la lista de orígenes permitidos (ya está incluido desde la versión actual del repositorio). Si cambiaste el puerto, actualiza también `URL_DESTINO` en `newtab.html`.
