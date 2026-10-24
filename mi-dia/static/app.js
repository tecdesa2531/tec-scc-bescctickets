// Focus Flow - app.js: arranque, routing, eventos globales y actualizacion periodica

// -- Routing
function rutear() {
  var partes = window.location.pathname.match(/^\/(ticket|int|doc|con|npl)\/([A-Z0-9]+)$/);
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
    window.scrollTo(0, 0);
    await cargarFoco();
    await focoAlAbrir(detalle.id);
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
  var esNpl = detalle && detalle.datos && detalle.datos.tipo === "npl";
  for (var i = 0; i < imagenes.length; i++) {
    if (esNpl) await agregarAdjuntoInterrupcion(imagenes[i]);
    else await agregarCaptura(imagenes[i]);
  }
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

var zonaNpl = document.getElementById("npl-zona");
zonaNpl.addEventListener("dragover",  function (e) { e.preventDefault(); zonaNpl.classList.add("encima"); });
zonaNpl.addEventListener("dragleave", function ()  { zonaNpl.classList.remove("encima"); });
zonaNpl.addEventListener("drop", async function (e) {
  e.preventDefault();
  zonaNpl.classList.remove("encima");
  var archivos = e.dataTransfer.files;
  for (var i = 0; i < archivos.length; i++) await agregarAdjuntoInterrupcion(archivos[i]);
});

window.addEventListener("dragover", function (e) { e.preventDefault(); });
window.addEventListener("drop",     function (e) { e.preventDefault(); });

// -- Atajos de teclado: I abre Idea, N inicia Interrupcion (solo fuera de campos)
document.addEventListener("keydown", function (e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  var t = e.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
  if (document.getElementById("vista-inicio").hidden) return;
  var k = (e.key || "").toLowerCase();
  if (k === "i") { e.preventDefault(); focoIdea(); }
  else if (k === "n") { e.preventDefault(); iniciarInterrupcion(); }
});

// -- Actualizacion periodica
setInterval(actualizarCronometros, 30000);
setInterval(function () { if (!detalle) cargarFoco().catch(function () {}); }, 120000);

// -- Arranque
iniciarTema();
rutear();
