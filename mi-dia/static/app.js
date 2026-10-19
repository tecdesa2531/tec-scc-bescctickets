// Mi dia - app.js: arranque, routing, eventos globales y actualizacion periodica

// -- Routing
function rutear() {
  var partes = window.location.pathname.match(/^\/(ticket|int|doc|con)\/([A-Z0-9]+)$/);
  if (partes) {
    cargarPaginaDetalle(partes[2]);
  } else {
    cargarTodo();
  }
}

async function cargarPaginaDetalle(numero) {
  try {
    proyectos = await leer("/api/proyectos");
    await cargarAtenciones();
    detalle = await leer("/api/atencion?numero=" + encodeURIComponent(numero));
    document.getElementById("vista-inicio").hidden   = true;
    document.getElementById("vista-atencion").hidden = false;
    limpiarRedactor();
    pintarDetalle();
    cargarFoco().catch(function () {});
    window.scrollTo(0, 0);
  } catch (error) {
    mostrarError(error);
  }
}

// -- Eventos de paste y drag-drop
document.addEventListener("paste", async function (evento) {
  if (document.getElementById("vista-atencion").hidden) return;
  var imagenes = Array.from(evento.clipboardData.items)
    .filter(function (item) { return item.kind === "file" && item.type.startsWith("image/"); })
    .map(function (item) { return item.getAsFile(); });
  if (!imagenes.length) return;
  evento.preventDefault();
  for (var i = 0; i < imagenes.length; i++) await agregarCaptura(imagenes[i]);
});

var zona = document.getElementById("r-zona");
zona.addEventListener("dragover",  function (e) { e.preventDefault(); zona.classList.add("encima"); });
zona.addEventListener("dragleave", function ()  { zona.classList.remove("encima"); });
zona.addEventListener("drop", async function (e) {
  e.preventDefault();
  zona.classList.remove("encima");
  var archivos = e.dataTransfer.files;
  for (var i = 0; i < archivos.length; i++) {
    var archivo = archivos[i];
    if (archivo.type.startsWith("image/") && confirm("Agregar " + archivo.name + " como captura? (Cancelar = adjuntarlo como archivo)")) {
      await agregarCaptura(archivo);
    } else {
      await agregarArchivo(archivo);
    }
  }
});

window.addEventListener("dragover", function (e) { e.preventDefault(); });
window.addEventListener("drop",     function (e) { e.preventDefault(); });

// -- Actualizacion periodica
setInterval(pintarFoco, 30000);
setInterval(function () { if (!detalle) cargarFoco().catch(function () {}); }, 120000);

// -- Arranque
iniciarTema();
rutear();
