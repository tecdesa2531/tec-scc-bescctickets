// Focus Flow - foco.js: pildora de cabecera, panel de foco y franja de interrupcion

var pildoraDestino = null;   // atencion que abre la pildora / el titulo del panel
var franjaNplId    = null;   // atencion npl de la interrupcion activa
var tickFranja     = null;   // intervalo de 1 s de la franja

// -- Helpers
function atencionPorId(id) {
  for (var i = 0; i < atenciones.length; i++) {
    if (atenciones[i].id === id) return atenciones[i];
  }
  return null;
}

function ultimaAtencionFoco() {
  for (var i = foco.hoy.length - 1; i >= 0; i--) {
    if (foco.hoy[i].atencion_id) return foco.hoy[i].atencion_id;
  }
  return "";
}

// La ultima atencion solo se puede reanudar si sigue abierta (no atendida/descartada)
function ultimaAtencionAbierta() {
  var id = ultimaAtencionFoco();
  if (!id) return "";
  var a = atencionPorId(id);
  if (a && (a.estado === "en_curso" || a.estado === "en_espera" || a.estado === "reabierto")) return id;
  return "";
}

function fmtSegundos(segundos) {
  var h = Math.floor(segundos / 3600);
  var m = Math.floor(segundos / 60) % 60;
  var s = segundos % 60;
  var dd = function (n) { return String(n).padStart(2, "0"); };
  return (h > 0 ? h + ":" + dd(m) : m) + ":" + dd(s);
}

function interrupcionActiva() {
  if (!foco.actual || !foco.actual.atencion_id) return null;
  var reg = atencionPorId(foco.actual.atencion_id);
  if (reg && reg.tipo === "npl" && reg.estado !== "atendido" && reg.estado !== "descartado") return reg;
  return null;
}

// -- Carga
async function cargarFoco() {
  foco = await leer("/api/foco");
  pintarFoco();
}

// -- Pildora de cabecera
function pintarPildora() {
  var pil  = document.getElementById("foco-pildora");
  var lbl  = document.getElementById("pildora-label");
  var idEl = document.getElementById("pildora-id");
  var codeEl = document.getElementById("pildora-code");
  var tEl  = document.getElementById("pildora-timer");
  pil.className = "pildora";
  var enPausa = foco.actual && foco.actual.tipo === "pausa";
  var id = foco.actual ? (enPausa ? ultimaAtencionAbierta() : foco.actual.atencion_id) : "";
  if (!foco.actual || (enPausa && !id)) {
    pil.classList.add("pildora-sin");
    lbl.textContent = "Sin foco";
    idEl.hidden = true; codeEl.hidden = true; tEl.hidden = true;
    pildoraDestino = null;
    return;
  }
  var reg = id ? atencionPorId(id) : null;
  var corto  = reg ? (reg.tracking_id || reg.numero || "") : "";
  var codigo = reg ? (reg.tracking_code || "") : "";
  pildoraDestino = id || null;
  pil.classList.add(enPausa ? "pildora-pausa" : "pildora-foco");
  lbl.textContent = enPausa ? "En pausa:" : "En foco:";
  if (corto) { idEl.hidden = false; idEl.textContent = corto; } else { idEl.hidden = true; }
  if (codigo) { codeEl.hidden = false; codeEl.textContent = "- " + codigo; } else { codeEl.hidden = true; }
  tEl.hidden = false;
  tEl.textContent = duracion(segundosDesde(foco.actual.inicio));
}

function clicPildora(evento) {
  if (evento) evento.preventDefault();
  if (pildoraDestino) abrirAtencion(pildoraDestino);
}

// -- Panel de foco
function pintarFoco() {
  var ayer = document.getElementById("foco-ayer");
  var sin  = document.getElementById("foco-sinfoco");
  var act  = document.getElementById("foco-activo");
  var bot  = document.getElementById("foco-botones");
  var btn  = document.getElementById("btn-pausa");

  // Foco abierto de ayer: bloquea el panel
  if (foco.anterior_abierto) {
    ayer.hidden = false;
    sin.hidden = true; act.hidden = true; bot.hidden = true;
    cerrarFocoIdea(); cerrarFocoReunion(); cancelarTerminarDia();
    document.getElementById("anterior-etiqueta").textContent = foco.anterior_abierto.etiqueta;
    document.getElementById("anterior-inicio").textContent  = foco.anterior_abierto.inicio;
    pintarPildora(); pintarFranja(); pintarAtenciones();
    return;
  }
  ayer.hidden = true;
  bot.hidden = false;

  var enPausa = foco.actual && foco.actual.tipo === "pausa";
  var enFoco  = foco.actual && foco.actual.atencion_id && !enPausa;
  // En pausa solo es "activo" si la ultima atencion sigue abierta; si se termino
  // o descarto, el panel queda Sin foco (y sin boton Reanudar).
  var idPausa = enPausa ? ultimaAtencionAbierta() : "";

  if (enFoco || (enPausa && idPausa)) {
    sin.hidden = true; act.hidden = false;
    var id  = enFoco ? foco.actual.atencion_id : idPausa;
    var reg = id ? atencionPorId(id) : null;
    document.getElementById("foco-kicker").textContent = enPausa ? "EN PAUSA / ULTIMA ATENCION" : "EN FOCO";
    document.getElementById("foco-id").textContent = reg ? (reg.tracking_id || reg.numero || "") : "";
    document.getElementById("foco-titulo-link").textContent = reg ? reg.titulo : (foco.actual.etiqueta || "");
    document.getElementById("foco-timer").textContent = duracion(segundosDesde(foco.actual.inicio));
    act.classList.toggle("foco-activo-pausa", !!enPausa);

    btn.hidden = false;
    if (enPausa) {
      btn.classList.add("btn-reanudar");
      btn.title   = "Reanudar";
      btn.onclick = focoReanudar;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><polygon points="3,2 12,7 3,12"/></svg> Reanudar';
    } else {
      btn.classList.remove("btn-reanudar");
      btn.title   = "Pausa";
      btn.onclick = focoPausa;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="2" width="4" height="10" rx="1"/><rect x="8" y="2" width="4" height="10" rx="1"/></svg> Pausa';
    }
  } else {
    sin.hidden = false; act.hidden = true;
    btn.hidden = true;
  }

  pintarPildora(); pintarFranja(); pintarAtenciones();
  // Si hay una interrupcion abierta, refresca su cabecera (cronometro y estado)
  if (detalle && detalle.datos && detalle.datos.tipo === "npl") pintarEstadoDetalle();
}

// -- Franja de interrupcion (cronometro con segundos)
function pintarFranja() {
  var franja = document.getElementById("franja-npl");
  var npl = interrupcionActiva();
  if (!npl) {
    franja.hidden = true;
    franjaNplId = null;
    detenerTickFranja();
    return;
  }
  franja.hidden = false;
  franjaNplId = npl.id;
  document.getElementById("franja-detalle").textContent = npl.tracking_id || npl.numero || "";
  actualizarFranjaTimer();
  iniciarTickFranja();
}

// Tiempo de foco acumulado de una atencion: suma de sus tramos cerrados mas el
// tramo abierto en vivo si es el foco actual. Lo usan la franja y el cronometro NPL.
function segundosFocoNpl(id) {
  var total = 0;
  (foco.hoy || []).forEach(function (t) {
    if (t.atencion_id === id && t.fin) total += (t.segundos || 0);
  });
  if (foco.actual && foco.actual.atencion_id === id) total += segundosDesde(foco.actual.inicio);
  return total;
}

function actualizarFranjaTimer() {
  if (!franjaNplId) return;
  document.getElementById("franja-timer").textContent = fmtSegundos(segundosFocoNpl(franjaNplId));
  // Si el detalle de esa NPL esta abierto, su cronometro grande coincide con la franja
  var crono = document.getElementById("npl-cronometro");
  if (crono && detalle && detalle.id === franjaNplId) crono.textContent = fmtSegundos(segundosFocoNpl(franjaNplId));
}

function iniciarTickFranja() {
  if (tickFranja) return;
  tickFranja = setInterval(actualizarFranjaTimer, 1000);
}

function detenerTickFranja() {
  if (tickFranja) { clearInterval(tickFranja); tickFranja = null; }
}

function anotarInterrupcion() {
  if (franjaNplId) abrirAtencion(franjaNplId);
}

// Abre el detalle de la interrupcion con el bloque de cierre ya abierto
async function cerrarDesdeFranja() {
  if (!franjaNplId) return;
  await abrirAtencion(franjaNplId);
  if (detalle && detalle.datos.tipo === "npl" &&
      detalle.datos.estado !== "atendido" && detalle.datos.estado !== "descartado") {
    mostrarCierreInterrupcion();
  }
}

// -- Cronometros (refresco periodico ligero, sin volver a pedir datos)
function actualizarCronometros() {
  pintarPildora();
  if (foco.actual && !document.getElementById("foco-activo").hidden) {
    document.getElementById("foco-timer").textContent = duracion(segundosDesde(foco.actual.inicio));
  }
}

// -- Cambios de foco
async function cambiarFoco(datos) {
  try {
    var resultado = await enviar("/api/foco/cambiar", datos);
    await cargarAtenciones();
    await cargarFoco();
    await cargarIdeas();
    return resultado;
  } catch (error) { mostrarError(error); return null; }
}

function focoAtencion(id) { return cambiarFoco({ tipo: "atencion", atencion_id: id }); }
function focoPausa()      { return cambiarFoco({ tipo: "pausa" }); }

// -- Abrir una atencion pasa el foco (salvo atendidas/descartadas o si ya es el foco)
async function focoAlAbrir(id) {
  var a = atencionPorId(id);
  if (!a) return;
  var abierta = a.estado === "en_curso" || a.estado === "en_espera" || a.estado === "reabierto";
  if (!abierta) return;
  if (foco && foco.actual && foco.actual.atencion_id === id) return;
  var r = await cambiarFoco({ tipo: "atencion", atencion_id: id, origen: "abrir" });
  if (r) mostrarAvisoFoco(a.tracking_id || a.numero || "la atencion");
}

// -- Aviso "Foco en ... / Deshacer"
var _avisoFocoTimer = null;

function mostrarAvisoFoco(nombre) {
  document.getElementById("aviso-foco-texto").textContent = "Foco en " + nombre;
  document.getElementById("aviso-foco").hidden = false;
  clearTimeout(_avisoFocoTimer);
  _avisoFocoTimer = setTimeout(ocultarAvisoFoco, 5000);
}

function ocultarAvisoFoco() {
  clearTimeout(_avisoFocoTimer);
  var el = document.getElementById("aviso-foco");
  if (el) el.hidden = true;
}

async function deshacerFoco() {
  ocultarAvisoFoco();
  try {
    await enviar("/api/foco/deshacer", {});
    await cargarAtenciones();
    await cargarFoco();
  } catch (error) { mostrarError(error); }
}

function focoReanudar() {
  var ultimo = ultimaAtencionAbierta();
  if (ultimo) focoAtencion(ultimo);
}

// -- Idea en linea (se guarda en la lista de ideas, no toca el foco)
function focoIdea() {
  var fila = document.getElementById("foco-idea-fila");
  var abrir = fila.hidden;
  cerrarFocoReunion();
  fila.hidden = !abrir;
  if (abrir) {
    var i = document.getElementById("foco-idea-input");
    i.value = ""; i.focus();
  }
}

function cerrarFocoIdea() {
  var fila = document.getElementById("foco-idea-fila");
  if (!fila) return;
  fila.hidden = true;
  var i = document.getElementById("foco-idea-input");
  if (i) i.value = "";
}

async function guardarFocoIdea() {
  var i = document.getElementById("foco-idea-input");
  var texto = (i.value || "").trim();
  if (!texto) return;
  try {
    await enviar("/api/ideas/crear", { texto: texto });
    cerrarFocoIdea();
    await cargarIdeas();
  } catch (error) { mostrarError(error); }
}

// -- Reunion en linea (crea la atencion CON y pasa el foco)
function focoReunion() {
  var fila = document.getElementById("foco-reunion-fila");
  var abrir = fila.hidden;
  cerrarFocoIdea();
  fila.hidden = !abrir;
  if (abrir) {
    var i = document.getElementById("foco-reunion-input");
    i.value = ""; i.focus();
    document.getElementById("foco-reunion-iniciar").disabled = true;
  }
}

function cerrarFocoReunion() {
  var fila = document.getElementById("foco-reunion-fila");
  if (!fila) return;
  fila.hidden = true;
  var i = document.getElementById("foco-reunion-input");
  if (i) i.value = "";
}

async function iniciarFocoReunion() {
  var i = document.getElementById("foco-reunion-input");
  var texto = (i.value || "").trim();
  if (!texto) return;
  var resultado = await cambiarFoco({ tipo: "reunion", texto: texto });
  cerrarFocoReunion();
  if (!resultado) return;
  if (resultado.numero && resultado.tipo) abrirDetalleNueva(resultado.tipo, resultado.numero);
  else if (resultado.atencion_id) abrirAtencion(resultado.atencion_id);
}

async function iniciarInterrupcion() {
  var resultado = await cambiarFoco({ tipo: "interrupcion" });
  if (!resultado) return;
  if (resultado.numero && resultado.tipo) abrirDetalleNueva(resultado.tipo, resultado.numero);
  else if (resultado.atencion_id) abrirAtencion(resultado.atencion_id);
}

function pedirTerminarDia() {
  cerrarFocoIdea(); cerrarFocoReunion();
  var texto = "Terminar el dia?";
  if (foco.actual) {
    var hora = new Date().toTimeString().slice(0, 5);
    texto += " Se cerrara el foco actual a las " + hora;
  }
  document.getElementById("foco-terminar-texto").textContent = texto;
  document.getElementById("foco-terminar-fila").hidden = false;
}

function cancelarTerminarDia() {
  var fila = document.getElementById("foco-terminar-fila");
  if (fila) fila.hidden = true;
}

async function terminarDia() {
  cancelarTerminarDia();
  try { await enviar("/api/foco/terminar_dia"); await cargarFoco(); }
  catch (error) { mostrarError(error); }
}

async function cerrarAnterior() {
  try {
    await enviar("/api/foco/cerrar_anterior", { hora: document.getElementById("anterior-hora").value });
    await cargarFoco();
  } catch (error) { mostrarError(error); }
}

// -- Eventos de los campos en linea (Enter guarda, Esc cierra)
(function () {
  var ideaInput = document.getElementById("foco-idea-input");
  if (ideaInput) {
    ideaInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); guardarFocoIdea(); }
      else if (e.key === "Escape") { cerrarFocoIdea(); }
    });
    ideaInput.addEventListener("blur", function () {
      if (!ideaInput.value.trim()) cerrarFocoIdea();
    });
  }
  var reunionInput = document.getElementById("foco-reunion-input");
  if (reunionInput) {
    reunionInput.addEventListener("input", function () {
      document.getElementById("foco-reunion-iniciar").disabled = !reunionInput.value.trim();
    });
    reunionInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); iniciarFocoReunion(); }
      else if (e.key === "Escape") { cerrarFocoReunion(); }
    });
    reunionInput.addEventListener("blur", function () {
      if (!reunionInput.value.trim()) cerrarFocoReunion();
    });
  }
})();
