// Focus Flow - util.js: estado global, tema y funciones de uso general

// -- Estado global
var proyectos = [];
var atenciones = [];
var foco = { actual: null, anterior_abierto: null, hoy: [], totales: [] };
var ideas = [];
var detalle = null;
var nuevasCapturas = [];
var nuevosArchivos = [];
var edicion = null;
var ideaEnConversion = null;
var vistaBitacora = (function () {
  try { return localStorage.getItem("focus-flow-vista-bitacora") || "corregido"; } catch (e) { return "corregido"; }
})();

var NOMBRES_TIPO    = { ticket: "Ticket", int: "Iniciativa interna", doc: "Documentacion", con: "Consulta o Reunion", npl: "Interrupcion" };
var NOMBRES_ESTADO  = { en_curso: "En curso", en_espera: "En espera", atendido: "Atendido", reabierto: "Reabierto", descartado: "Descartado" };
var NOMBRES_ENTRADA = { solicitud: "Solicitud", asignacion: "Asignacion", avance: "Avance", cierre: "Cierre", interrupcion: "Interrupcion" };

// -- Tema
function aplicarTema(tema) {
  document.documentElement.setAttribute("data-tema", tema);
  var btn = document.getElementById("btn-tema");
  if (btn) btn.textContent = tema === "oscuro" ? "Modo claro" : "Modo oscuro";
  try { localStorage.setItem("focus-flow-tema", tema); } catch (e) {}
}

function alternarTema() {
  var actual = document.documentElement.getAttribute("data-tema") || "claro";
  aplicarTema(actual === "oscuro" ? "claro" : "oscuro");
}

function iniciarTema() {
  var guardado = null;
  try { guardado = localStorage.getItem("focus-flow-tema"); } catch (e) {}
  if (!guardado) {
    guardado = window.matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
  }
  aplicarTema(guardado);
}

// -- Utilidades de HTML
function esc(texto) {
  return String(texto == null ? "" : texto).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

// -- HTTP
async function leer(ruta) {
  var respuesta = await fetch(ruta);
  var datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error || "Error");
  return datos;
}

async function enviar(ruta, datos) {
  var respuesta = await fetch(ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos || {})
  });
  var resultado = await respuesta.json();
  if (!respuesta.ok) throw new Error(resultado.error || "Error");
  return resultado;
}

function mostrarError(error) {
  alert(error.message || String(error));
}

// -- Utilidades de tiempo y UI
function duracion(segundos) {
  var minutos = Math.floor(segundos / 60);
  var h = Math.floor(minutos / 60);
  var m = minutos % 60;
  return h + "h " + String(m).padStart(2, "0") + "m";
}

function segundosDesde(textoFecha) {
  var inicio = new Date(textoFecha.replace(" ", "T"));
  return Math.max(0, Math.floor((Date.now() - inicio.getTime()) / 1000));
}

function alternar(id) {
  var el = document.getElementById(id);
  el.hidden = !el.hidden;
}

function urlArchivo(raiz, ruta) {
  return "/archivo?id=" + encodeURIComponent(detalle.id) + "&raiz=" + raiz + "&ruta=" + encodeURIComponent(ruta);
}

function leerComoDataUrl(archivo) {
  return new Promise(function (resolver, rechazar) {
    var lector = new FileReader();
    lector.onload  = function () { resolver(lector.result); };
    lector.onerror = function () { rechazar(new Error("No se pudo leer " + archivo.name)); };
    lector.readAsDataURL(archivo);
  });
}

function nombreAtencion(a) {
  return (a.tracking_id || a.numero || "Sin ID") + " - " + a.titulo;
}

function abrirDetalleNueva(tipo, numero) {
  window.location.href = "/" + tipo + "/" + numero;
}

// -- Carga general
async function cargarTodo() {
  try {
    var inicio = await leer("/api/inicio");
    var aviso = document.getElementById("aviso-config");
    aviso.hidden = inicio.correo_configurado;
    aviso.textContent = "Falta la variable AT_CORREO: todos los correos se tomaran como asignado.";
    var accesos = await leer("/api/accesos");
    pintarAccesos(accesos);
    proyectos = await leer("/api/proyectos");
    await cargarAtenciones();
    await cargarFoco();
    await cargarIdeas();
  } catch (error) {
    mostrarError(error);
  }
}

async function cargarAtenciones() {
  atenciones = await leer("/api/atenciones");
  pintarAtenciones();
  pintarChips();
}
