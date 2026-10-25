// Focus Flow - bitacora.js: detalle de atencion y redactor de entradas

function urlEtiqueta(urlEsc) {
  var urlReal = urlEsc
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  try {
    var u = new URL(urlReal);
    return u.pathname.length > 1 ? u.hostname + "/\u2026" : u.hostname;
  } catch (e) {
    return urlReal.length > 50 ? urlReal.slice(0, 47) + "\u2026" : urlReal;
  }
}

function mdInline(s) {
  s = esc(s);
  s = s.replace(/`([^`\n]+)`/g,         '<code class="md-c">$1</code>');
  s = s.replace(/\*\*([^*\n]+)\*\*/g,   "<strong>$1</strong>");
  s = s.replace(/\*([^*\n]+)\*/g,       "<em>$1</em>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(_, txt, url) {
    var href = /^https?:\/\//i.test(url) ? url
             : /^www\./i.test(url)       ? "https://" + url
             : null;
    return href ? '<a href="' + href + '" target="_blank" rel="noopener">' + txt + "</a>" : txt;
  });
  s = s.replace(/(?<![="'])(https?:\/\/[^\s<>"]+)/g, function(urlEsc) {
    urlEsc = urlEsc.replace(/[.,;:!?)\]]+$/, "");
    return '<a href="' + urlEsc + '" target="_blank" rel="noopener" title="' + urlEsc + '">' + urlEtiqueta(urlEsc) + "</a>";
  });
  return s;
}

function mdToHtml(texto) {
  if (!texto) return "";
  var out  = [];
  var bloq = null;   // null = fuera de un bloque de codigo; array = lineas del bloque
  var ul   = false;
  var ol   = false;

  function cerrar() {
    if (ul) { out.push("</ul>"); ul = false; }
    if (ol) { out.push("</ol>"); ol = false; }
  }

  function cerrarBloque() {
    // Conserva saltos de linea e indentacion tal cual; escapa sin modificar
    out.push('<pre class="md-pre"><code>' + bloq.join("\n") + "</code></pre>");
    bloq = null;
  }

  texto.split("\n").forEach(function (l) {
    if (/^```/.test(l.trimStart())) {
      if (bloq !== null) { cerrarBloque(); }    // cierra el bloque abierto
      else { cerrar(); bloq = []; }             // abre; ignora el lenguaje tras ```
      return;
    }
    if (bloq !== null) { bloq.push(esc(l)); return; }
    if (!l.trim())     { cerrar(); out.push('<div class="md-gap"></div>'); return; }

    if (l.startsWith("### ")) { cerrar(); out.push('<h3 class="md-h">' + mdInline(l.slice(4)) + "</h3>"); return; }
    if (l.startsWith("## "))  { cerrar(); out.push('<h2 class="md-h">' + mdInline(l.slice(3)) + "</h2>"); return; }
    if (l.startsWith("# "))   { cerrar(); out.push('<h2 class="md-h">' + mdInline(l.slice(2)) + "</h2>"); return; }

    var mUl = l.match(/^[-*] (.*)/);
    if (mUl) {
      if (ol) { out.push("</ol>"); ol = false; }
      if (!ul) { out.push('<ul class="md-ul">'); ul = true; }
      out.push("<li>" + mdInline(mUl[1]) + "</li>");
      return;
    }

    var mOl = l.match(/^\d+\. (.*)/);
    if (mOl) {
      if (ul) { out.push("</ul>"); ul = false; }
      if (!ol) { out.push('<ol class="md-ol">'); ol = true; }
      out.push("<li>" + mdInline(mOl[1]) + "</li>");
      return;
    }

    cerrar();
    out.push('<p class="md-p">' + mdInline(l) + "</p>");
  });

  if (bloq !== null) cerrarBloque();
  cerrar();
  return out.join("");
}

// -- Detalle de atencion
async function abrirAtencion(id) {
  try { detalle = await leer("/api/atencion?id=" + encodeURIComponent(id)); }
  catch (error) { mostrarError(error); return; }
  document.getElementById("vista-inicio").hidden   = true;
  document.getElementById("vista-atencion").hidden = false;
  limpiarRedactor();
  pintarDetalle();
  scrollUltimaEntrada();
  await focoAlAbrir(id);
  actualizarRedactor();
}

async function recargarDetalle() {
  detalle = await leer("/api/atencion?id=" + encodeURIComponent(detalle.id));
  pintarDetalle();
}

function volver() {
  if (hayBorrador()) { document.getElementById("d-aviso-salir").hidden = false; return; }
  salirDetalle();
}

function ocultarAvisoSalir() {
  document.getElementById("d-aviso-salir").hidden = true;
}

function hayBorrador() {
  var texto = document.getElementById("r-texto");
  return !!(nuevasCapturas.length || nuevosArchivos.length || (texto && texto.value.trim()));
}

async function salirDetalle() {
  var enDetalle = window.location.pathname !== "/" && window.location.pathname !== "/index.html";
  if (enDetalle) {
    window.location.href = "/";
    return;
  }
  detalle = null;
  limpiarRedactor();
  document.title = "Focus Flow";
  document.getElementById("vista-atencion").hidden = true;
  document.getElementById("vista-inicio").hidden   = false;
  await cargarAtenciones();
  await cargarFoco();
  await cargarIdeas();
}

function scrollUltimaEntrada() {
  var entradas = document.querySelectorAll("#d-entradas .entrada");
  if (entradas.length) entradas[entradas.length - 1].scrollIntoView({ block: "end", behavior: "smooth" });
}

function pintarDetalle() {
  var d = detalle.datos;
  document.title = (d.tracking_id && d.tracking_code)
    ? d.tracking_id + "-" + d.tracking_code
    : "Focus Flow";

  var esInterrupcion = d.tipo === "npl";

  // Cabecera en modo lectura (el formulario de edicion se abre con el lapiz)
  pidiendoProyecto = false;
  salirEdicionDetalle();
  pintarCabecera();

  // Pasos hacia Jira + barra de guia + enlaces de Jira
  var idx = (esInterrupcion || d.estado === "descartado") ? -1 : pasoIndice();
  pintarPasos(idx);
  pintarPropuestaJira(idx);

  document.getElementById("card-bitacora").hidden   = esInterrupcion;
  document.getElementById("npl-card").hidden        = !esInterrupcion;

  if (!esInterrupcion) {
    // La barra fija aparece mientras se trabaja; atendida muestra "Reabrir"
    var atendida   = d.estado === "atendido";
    var descartada = d.estado === "descartado";
    document.getElementById("r-barra").hidden   = atendida || descartada;
    document.getElementById("r-reabrir").hidden = !atendida;
    document.getElementById("d-aviso-salir").hidden = true;
  }

  if (esInterrupcion) pintarInterrupcion();
  else { pintarEntradas(); actualizarRedactor(); }
}

// -- Pasos hacia Jira
var pidiendoProyecto = false;

var SVG_CHECK_PASO   = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>';
var SVG_CHECK_CORREO = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>';

function pasoIndice() {
  var d = detalle.datos;
  if (d.estado !== "atendido") return 0;
  if (d.listo_para_jira) return detalle.pendientes > 0 ? 3 : 4;
  var hayCorregido = (detalle.entradas || []).some(function (e) { return e.texto_corregido && !e.correccion_vencida; });
  return hayCorregido ? 2 : 1;
}

function pintarPasos(idx) {
  var d = detalle.datos;
  var ol = document.getElementById("det-pasos");
  var guia = document.getElementById("det-guia");
  var linksBox = document.getElementById("det-jira-links");

  if (idx < 0) { ol.hidden = true; guia.hidden = true; linksBox.hidden = true; return; }
  ol.hidden = false; guia.hidden = false;

  var pasos = [
    ["Trabajo",  ["Bitacora abierta", "Terminada", "Terminada", "Terminada", "Terminada"]],
    ["Limpieza", ["Pendiente", "Pendiente", "Bitacora corregida", "Hecha", "Hecha"]],
    ["Conforme", ["Tu revision", "Tu revision", "Te toca revisar", "Dado", "Dado"]],
    ["Jira",     ["Pendiente", "Pendiente", "Pendiente", "Pendiente de subir", "Subido"]]
  ];
  ol.innerHTML = pasos.map(function (p, i) {
    var done = i < idx || idx === 4;
    var cur = i === idx && idx !== 4;
    var cls = "det-paso" + (cur ? " det-paso-cur" : (done ? " det-paso-done" : ""));
    var num = done ? SVG_CHECK_PASO : String(i + 1);
    return '<li class="' + cls + '"><span class="det-paso-num">' + num + "</span>" +
      '<span class="det-paso-txt"><span class="det-paso-tit">' + p[0] + "</span>" +
      '<span class="det-paso-sub">' + esc(p[1][idx]) + "</span></span></li>";
  }).join("");

  var guias = [
    "Registra lo que haces. Cuando termines, adjunta el correo de respuesta y pulsa Terminar.",
    "Terminada. La bitacora esta pendiente de limpieza; luego podras dar el conforme.",
    "La bitacora ya esta corregida. Revisa lo que ira a Jira y da el conforme.",
    "Conforme dado. Pendiente de subir a Jira.",
    "En Jira. Si surge algo nuevo, reabre la atencion y volvera a pasar por limpieza y conforme."
  ];
  document.getElementById("det-guia-texto").textContent = guias[idx];
  pintarGuiaAccion(idx);

  pintarJira();
  var jira = d.jira || {};
  var hayLinks = !!(jira.padre_key || (d.subtareas || []).some(function (s) { return s.key; }));
  linksBox.hidden = !hayLinks;
}

function pintarGuiaAccion(idx) {
  var d = detalle.datos;
  var accion = document.getElementById("det-guia-accion");
  var textoEl = document.getElementById("det-guia-texto");

  if (idx === 0 && pidiendoProyecto) {
    textoEl.textContent = "Antes de terminar, asigna el proyecto del equipo que te llamo.";
    accion.innerHTML =
      '<input id="det-term-proj" class="mono-input det-term-proj" list="det-term-lista" maxlength="6" placeholder="6 letras" oninput="onTerminarProjInput(this)">' +
      '<datalist id="det-term-lista">' +
        proyectos.map(function (p) { return '<option value="' + esc(p.codigo) + '">'; }).join("") +
      "</datalist>" +
      '<button onclick="cancelarTerminarProyecto()">Cancelar</button>' +
      '<button id="det-term-guardar" class="principal" onclick="guardarYTerminar()" disabled>Guardar y terminar</button>';
    return;
  }

  if (idx === 0) {
    var esTicket = d.tipo === "ticket";
    var tieneCorreo = tieneCorreoTipo("atendido");
    if (esTicket && !tieneCorreo) {
      accion.innerHTML = '<span class="det-impedimento">Adjunta el correo de respuesta para terminar</span>' +
        '<button class="principal" disabled>Terminar atencion</button>';
    } else {
      accion.innerHTML = (esTicket ? '<span class="det-check-correo">' + SVG_CHECK_CORREO + "Correo de respuesta adjunto</span>" : "") +
        '<button class="principal" onclick="terminarDetalle()">Terminar atencion</button>';
    }
    return;
  }

  if (idx === 1 || idx === 2) {
    var hayCorregido = (detalle.entradas || []).some(function (e) { return e.texto_corregido && !e.correccion_vencida; });
    accion.innerHTML = hayCorregido
      ? '<button class="principal" onclick="darConformeDetalle()">Dar conforme</button>'
      : '<button class="principal" disabled title="Disponible cuando la bitacora este corregida">Dar conforme</button>';
    return;
  }

  accion.innerHTML = "";
}

function pintarPropuestaJira(idx) {
  var el = document.getElementById("d-propuesta-jira");
  var d = detalle.datos;
  if (idx !== 2 || (!d.titulo_jira && !d.descripcion)) { el.hidden = true; el.innerHTML = ""; return; }
  el.hidden = false;
  el.innerHTML = '<div class="propuesta-jira-tit">Titulo y descripcion para Jira</div>' +
    (d.titulo_jira ? '<div class="propuesta-jira-titulo">' + esc(d.titulo_jira) + "</div>" : "") +
    (d.descripcion ? '<div class="propuesta-jira-desc">' + mdToHtml(d.descripcion) + "</div>" : "");
}

// -- Acciones de los pasos (sin confirm ni alert)
function onTerminarProjInput(input) {
  input.value = input.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);
  document.getElementById("det-term-guardar").disabled = !/^[A-Z]{6}$/.test(input.value);
}

function cancelarTerminarProyecto() { pidiendoProyecto = false; pintarPasos(pasoIndice()); }

async function terminarDetalle() {
  var d = detalle.datos;
  if (d.tipo === "con" && !d.tracking_code) {
    pidiendoProyecto = true;
    pintarGuiaAccion(0);
    return;
  }
  await ejecutarTerminar();
}

async function guardarYTerminar() {
  var v = (document.getElementById("det-term-proj").value || "").trim().toUpperCase();
  if (!/^[A-Z]{6}$/.test(v)) return;
  try {
    await enviar("/api/atencion/identidad", { id: detalle.id, tracking_code: v });
    proyectos = await leer("/api/proyectos");
    pidiendoProyecto = false;
    await ejecutarTerminar();
  } catch (error) { mostrarError(error); }
}

async function ejecutarTerminar() {
  try {
    await enviar("/api/atencion/terminar", { id: detalle.id });
    if (foco.actual && foco.actual.atencion_id === detalle.id) {
      await enviar("/api/foco/cambiar", { tipo: "pausa" });
    }
    await cargarAtenciones();
    await cargarFoco();
    await recargarDetalle();
  } catch (error) { mostrarError(error); }
}

async function darConformeDetalle() {
  try {
    await enviar("/api/atencion/conforme", { id: detalle.id });
    await cargarAtenciones();
    await recargarDetalle();
  } catch (error) { mostrarError(error); }
}

// -- Cabecera: modo lectura
function pintarCabecera() {
  var d = detalle.datos;
  var esNpl = d.tipo === "npl";

  document.getElementById("d-aviso-temporal").hidden = !detalle.temporal || esNpl;

  var tag = document.getElementById("det-tag");
  tag.className = "at-tag at-tag-" + d.tipo;
  tag.textContent = ETIQUETA_TIPO[d.tipo] || d.tipo;

  document.getElementById("det-id").textContent =
    d.tracking_id || (detalle.temporal ? "Sin Tracking ID" : "Sin ID");

  var proj = d.tracking_code || (detalle.temporal ? "Sin proyecto" : "");
  var env = "";
  if (d.tipo === "ticket" || d.tipo === "int") {
    env = (d.entornos || []).filter(function (x) { return x && x !== "SIN_ENTORNO"; }).join(", ");
  }
  document.getElementById("det-proj").textContent = (proj ? "- " + proj : "") + (env ? " - " + env : "");

  var huEl = document.getElementById("det-hu");
  if (!d.padre_id && d.hu_tipo) {
    huEl.hidden = false;
    huEl.textContent = "HU " + (d.hu_tipo === "semanal" ? "semanal" : "independiente");
  } else {
    huEl.hidden = true;
  }

  document.getElementById("det-titulo").textContent = d.titulo || "(sin titulo)";
  document.querySelector(".det-editar").hidden = esNpl;

  pintarAccesosDetalle();
  pintarEstadoDetalle();
  pintarAvisoProyecto();
}

function pintarAccesosDetalle() {
  var d = detalle.datos;
  var carpeta = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
  var html = "";
  if (d.tipo === "ticket" && d.url_servicenow) {
    html += '<a class="det-acceso" href="' + esc(d.url_servicenow) + '" target="_blank" rel="noopener">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>ServiceNow</a>';
  }
  if (d.tipo === "ticket" && d.workspace_edge) {
    html += '<button class="det-acceso" onclick="copiarAreaEdge()" title="' + esc(d.workspace_edge) + '">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>' +
      '<span id="det-edge-label">Area Edge</span></button>';
  }
  html += '<button class="det-acceso" onclick="abrirCarpeta(\'trabajo\')">' + carpeta + 'Trabajo</button>';
  html += '<button class="det-acceso" onclick="abrirCarpeta(\'proceso\')">' + carpeta + 'Proceso</button>';
  document.getElementById("det-accesos").innerHTML = html;
}

function copiarAreaEdge() {
  var texto = detalle.datos.workspace_edge || "";
  if (!texto) return;
  navigator.clipboard.writeText(texto).then(function () {
    var el = document.getElementById("det-edge-label");
    if (!el) return;
    el.textContent = "Copiado";
    setTimeout(function () { if (el) el.textContent = "Area Edge"; }, 1500);
  });
}

function pintarEstadoDetalle() {
  var d = detalle.datos;
  var zona = document.getElementById("det-estado-zona");
  if (d.tipo === "npl") {
    var npl = d.npl || {};
    var etiqueta, clase;
    if (d.estado === "descartado")       { etiqueta = "Cancelada";           clase = "npl-est-cancel"; }
    else if (d.estado === "atendido")    { etiqueta = "Atendida";            clase = "npl-est-cerr"; }
    else if (npl.pendiente_cierre)       { etiqueta = "Pendiente de cerrar";  clase = "npl-est-pend"; }
    else                                 { etiqueta = "En curso";             clase = "npl-est-curso"; }
    var enFoco  = foco.actual && foco.actual.atencion_id === detalle.id;
    var cerrada = d.estado === "atendido" || d.estado === "descartado";
    var sub = cerrada ? "duracion total" : (enFoco ? "en curso" : "en pausa");
    zona.innerHTML =
      '<div class="npl-cab-estado">' +
        '<span class="npl-est ' + clase + '">' + etiqueta + "</span>" +
        '<span id="npl-cronometro" class="npl-cronometro">' + fmtSegundos(segundosFocoNpl(detalle.id)) + "</span>" +
        '<span class="npl-cronometro-sub">' + sub + "</span>" +
      "</div>";
    return;
  }
  if (d.estado === "atendido") {
    zona.innerHTML = '<span class="det-estado-atendido"><span class="det-dot"></span>Atendido</span>' +
      '<button class="det-reabrir" onclick="reabrirDetalle()">Reabrir</button>';
    return;
  }
  var opciones = [["en_curso", "En curso"], ["en_espera", "En espera"], ["descartado", "Descartado"]];
  var html = '<label for="det-estado-sel" class="det-estado-lbl">Estado</label>' +
    '<select id="det-estado-sel" onchange="cambiarEstadoDetalle(this)">';
  if (d.estado === "reabierto") html += '<option value="reabierto" selected>Reabierto</option>';
  opciones.forEach(function (o) {
    html += '<option value="' + o[0] + '"' + (d.estado === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
  });
  html += "</select>";
  zona.innerHTML = html;
}

function cambiarEstadoDetalle(sel) {
  // En curso / En espera se guardan directo; Descartado pide confirmacion en linea.
  if (sel.value === "descartado") { confirmarDescartarDetalle(); return; }
  guardarEstadoDetalle(sel.value);
}

function confirmarDescartarDetalle() {
  document.getElementById("det-estado-zona").innerHTML =
    '<span class="det-confirm-txt">Descartar esta atencion?</span>' +
    '<button class="det-estado-cancelar" onclick="pintarEstadoDetalle()">Cancelar</button>' +
    '<button class="det-descartar-btn" onclick="guardarEstadoDetalle(\'descartado\')">Descartar</button>';
}

async function guardarEstadoDetalle(estado) {
  try {
    await enviar("/api/atencion/datos", { id: detalle.id, estado: estado });
    await cargarAtenciones();
    await cargarFoco();
    await recargarDetalle();
  } catch (error) { mostrarError(error); }
}

function reabrirDetalle() { guardarEstadoDetalle("reabierto"); }

function pintarAvisoProyecto() {
  var d = detalle.datos;
  var el = document.getElementById("det-aviso-proyecto");
  var falta = d.tipo === "con" && !d.tracking_code && d.estado !== "atendido" && d.estado !== "descartado";
  if (!falta) { el.hidden = true; el.innerHTML = ""; return; }
  el.hidden = false;
  el.innerHTML = '<label for="det-proj-input">Falta el proyecto del equipo que te llamo</label>' +
    '<input id="det-proj-input" class="mono-input" list="det-proj-lista" maxlength="6" placeholder="6 letras" oninput="onProyectoReunionInput(this)">' +
    '<datalist id="det-proj-lista">' +
      proyectos.map(function (p) { return '<option value="' + esc(p.codigo) + '">'; }).join("") +
    "</datalist>" +
    '<button id="det-proj-guardar" class="principal" onclick="guardarProyectoReunion()" disabled>Guardar</button>';
}

function onProyectoReunionInput(input) {
  input.value = input.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);
  document.getElementById("det-proj-guardar").disabled = !/^[A-Z]{6}$/.test(input.value);
}

async function guardarProyectoReunion() {
  var v = (document.getElementById("det-proj-input").value || "").trim().toUpperCase();
  if (!/^[A-Z]{6}$/.test(v)) return;
  try {
    await enviar("/api/atencion/identidad", { id: detalle.id, tracking_code: v });
    proyectos = await leer("/api/proyectos");
    await cargarAtenciones();
    await recargarDetalle();
  } catch (error) { mostrarError(error); }
}

// -- Cabecera: modo edicion
function editarDetalle() {
  var d = detalle.datos;
  var bloqueado = !detalle.temporal;

  document.getElementById("e-titulo").value    = d.titulo || "";
  document.getElementById("e-url").value       = d.url_servicenow || "";
  document.getElementById("e-workspace").value = d.workspace_edge || "";
  marcarHu("e", d.hu_tipo || "semanal");
  document.getElementById("i-tracking-id").value = d.tracking_id || "";
  llenarProyectos("i", d.tracking_code);
  marcarEntornos("i-entorno", d.entornos || []);

  document.getElementById("e-label-id").textContent = d.tipo === "ticket" ? "Tracking ID (ServiceNow)" : "Tracking ID";
  document.getElementById("det-ed-lock").hidden = !bloqueado;
  document.getElementById("i-tracking-id").readOnly = bloqueado;
  document.getElementById("i-proyecto").disabled    = bloqueado;
  document.querySelectorAll('input[name="i-entorno"]').forEach(function (c) { c.disabled = bloqueado; });

  // URL y Area Edge solo en tickets
  document.getElementById("e-campo-url").hidden = d.tipo !== "ticket";

  // Padre: editable si es temporal o si aun no esta procesada, no tiene issue en
  // Jira y no tiene hijas. En una atencion ya ubicada, asignarlo o cambiarlo
  // mueve su carpeta dentro de la del padre.
  var conIssue  = tieneIssueJira(d);
  var conHijas  = !detalle.temporal && atenciones.some(function (a) { return a.padre_id === detalle.id; });
  var padreEditable = (detalle.temporal || !detalle.procesada) && !conIssue && !conHijas;
  document.getElementById("e-campo-padre").hidden = false;
  llenarPadres("e", [detalle.id].concat(descendientesDe(detalle.id)));
  var selPadre = document.getElementById("e-padre");
  selPadre.value    = d.padre_id || "";
  selPadre.disabled = !padreEditable;
  // Una atencion ubicada con padre no puede volver a "Sin padre"
  selPadre.querySelector('option[value=""]').disabled = !!d.padre_id && !detalle.temporal;
  var notaPadre = document.getElementById("e-padre-nota");
  if (conIssue) {
    notaPadre.textContent = "Esta atencion tiene su issue en Jira.";
    notaPadre.hidden = false;
  } else if (conHijas) {
    notaPadre.textContent = "Esta atencion tiene atenciones hijas; por ahora no se puede cambiar su padre.";
    notaPadre.hidden = false;
  } else if (!padreEditable) {
    notaPadre.textContent = "Esta atencion ya fue procesada; el padre quedo fijo.";
    notaPadre.hidden = false;
  } else if (!detalle.temporal) {
    notaPadre.textContent = "Al asignar o cambiar el padre, la atencion se mueve dentro de la carpeta del padre y hereda su proyecto, entornos y HU.";
    notaPadre.hidden = false;
  } else {
    notaPadre.hidden = true;
  }

  // HU, proyecto y entornos se ocultan si hereda de un padre
  document.getElementById("e-campo-hu").hidden       = !!d.padre_id;
  document.getElementById("i-campo-proyecto").hidden = !!d.padre_id;
  document.getElementById("i-campo-entornos").hidden = !!d.padre_id;

  var nota = document.getElementById("i-nota");
  if (detalle.temporal) {
    nota.hidden = false;
    nota.textContent = "Al completar Tracking ID y proyecto se crean las carpetas definitivas. Sin entorno, la atencion va a la carpeta Sin entorno del proyecto.";
  } else {
    nota.hidden = true;
  }

  document.getElementById("det-lectura").hidden    = true;
  document.getElementById("det-pasos").hidden      = true;
  document.getElementById("det-guia").hidden       = true;
  document.getElementById("det-jira-links").hidden = true;
  document.getElementById("det-edicion").hidden    = false;
}

// Misma regla que tiene_issue_jira del servidor: padre creado en Jira o subtarea con key
function tieneIssueJira(datos) {
  if ((datos.jira || {}).padre_key) return true;
  return (datos.subtareas || []).some(function (s) { return s.key; });
}

function salirEdicionDetalle() {
  document.getElementById("det-edicion").hidden = true;
  document.getElementById("det-lectura").hidden = false;
}

function cancelarEdicionDetalle() { pintarDetalle(); }

// -- Interrupcion (tipo npl)
function pintarAdjuntosInterrupcion(entrada) {
  var cont = document.getElementById("npl-adjuntos");
  var caps = (entrada.capturas || []).map(function (c, i) {
    return '<button type="button" class="npl-adj" onclick="abrirVisor(\'' + entrada.id + '\',' + i + ',this)">' +
      '<img src="' + urlArchivo(c.raiz, c.ruta) + '" alt=""></button>';
  });
  var arch = (entrada.archivos || []).map(function (a) {
    return '<a class="npl-adj npl-adj-arch" href="' + urlArchivo(a.raiz, a.ruta) + '" target="_blank" rel="noopener">' +
      esc(a.ruta.split("/").pop()) + "</a>";
  });
  var items = caps.concat(arch);
  cont.innerHTML = items.length ? items.join("") : '<p class="suave" style="margin:0">Sin adjuntos aun.</p>';
}

function pintarInterrupcion() {
  var d = detalle.datos;
  var npl = d.npl || {};
  var entrada = (detalle.entradas && detalle.entradas[0]) || { texto: "", capturas: [], archivos: [] };
  var procesada = detalle.procesada;
  var cancelada = d.estado === "descartado";
  var cerrada   = d.estado === "atendido" && !npl.pendiente_cierre;   // atendida completa
  var pendiente = !!npl.pendiente_cierre;
  var conPadre  = !!d.padre_id;

  // Banners
  document.getElementById("npl-lock").hidden = !procesada;
  var aviso = document.getElementById("npl-aviso");
  aviso.hidden = !pendiente;
  if (pendiente) {
    var faltan = [];
    if (!npl.tipo_contacto) faltan.push("tipo de contacto");
    if (!npl.quien)   faltan.push("quien contacto");
    if (!npl.resumen) faltan.push("resumen");
    aviso.textContent = "Pendiente de cerrar: falta " + (faltan.join(" y ") || "datos") +
      ". Completalo abajo y guarda de nuevo.";
  }

  // Notas
  document.getElementById("npl-notas").value    = entrada.texto || "";
  document.getElementById("npl-notas").disabled = procesada;
  document.getElementById("npl-guardado").textContent = "";

  // Padre + proyecto (heredado si hay padre)
  llenarPadres("npl", [detalle.id].concat(descendientesDe(detalle.id)));
  document.getElementById("npl-padre").value    = d.padre_id || "";
  document.getElementById("npl-padre").disabled = (!detalle.temporal && procesada) || cancelada;
  document.querySelector('#npl-padre option[value=""]').disabled = conPadre && !detalle.temporal;
  llenarProyectos("npl", d.tracking_code);
  document.getElementById("npl-campo-proyecto").hidden    = conPadre;
  document.getElementById("npl-proyecto-heredado").hidden = !conPadre;
  if (conPadre) document.getElementById("npl-proyecto-hered-val").textContent = d.tracking_code || "";
  document.getElementById("npl-proyecto").disabled = procesada;

  // Adjuntos
  pintarAdjuntosInterrupcion(entrada);
  document.getElementById("npl-zona").hidden = procesada || cerrada || cancelada;

  // Resumen de cierre (solo lectura) + enlace Editar cierre
  var resumenCerrada = document.getElementById("npl-resumen-cerrada");
  var editarZona     = document.getElementById("npl-editar-cierre-zona");
  if (cerrada) {
    resumenCerrada.hidden = false;
    resumenCerrada.innerHTML =
      '<div class="npl-cerrada-grid">' +
        '<span class="npl-cerrada-k">Tipo de contacto</span><span>' +
          (npl.tipo_contacto === "llamada" ? "Llamada Teams" : "Chat Teams") + "</span>" +
        '<span class="npl-cerrada-k">Quien</span><span>' + esc(npl.quien || "") + "</span>" +
        (npl.ticket_relacionado && !conPadre
          ? '<span class="npl-cerrada-k">Ticket</span><span>' + esc(npl.ticket_relacionado) + "</span>" : "") +
        '<span class="npl-cerrada-k">Resumen</span><span class="texto">' +
          (npl.resumen ? mdToHtml(npl.resumen) : "") + "</span>" +
      "</div>";
    editarZona.hidden = procesada;   // editable hasta que se procese
  } else {
    resumenCerrada.hidden = true;
    editarZona.hidden = true;
  }

  // Bloque de cierre: visible solo si esta pendiente (Cerrar/Editar lo abren aparte)
  document.getElementById("npl-form-cierre").hidden  = !pendiente;
  document.getElementById("npl-campo-ticket").hidden = conPadre;
  rellenarCierreNpl(npl);

  // Confirmacion de cancelar oculta
  document.getElementById("npl-cancel-confirm").hidden = true;

  // Pie de acciones: solo en curso o pendiente
  document.getElementById("npl-acciones").hidden = procesada || cancelada || cerrada;
  document.getElementById("npl-btn-cierre").textContent = pendiente ? "Guardar cierre" : "Cerrar interrupcion";

  validarCierreNpl();
}

function rellenarCierreNpl(npl) {
  marcarContacto(npl.tipo_contacto || "");
  document.getElementById("npl-quien").value   = npl.quien || "";
  document.getElementById("npl-resumen").value = npl.resumen || "";
  document.getElementById("npl-ticket").value  = npl.ticket_relacionado || "";
}

function marcarContacto(valor) {
  document.getElementById("npl-tipo-contacto").value = valor || "";
  document.querySelectorAll("#npl-form-cierre .hu-btn").forEach(function (b) {
    b.classList.toggle("activo", b.getAttribute("data-contacto") === valor);
  });
}

function elegirContacto(valor) { marcarContacto(valor); validarCierreNpl(); }

function validarCierreNpl() {
  var pend = !!((detalle && detalle.datos.npl) || {}).pendiente_cierre;
  var q = document.getElementById("npl-quien");
  var r = document.getElementById("npl-resumen");
  if (q) q.classList.toggle("falta", pend && !q.value.trim());
  if (r) r.classList.toggle("falta", pend && !r.value.trim());
}

function accionCierreNpl() {
  if (document.getElementById("npl-form-cierre").hidden) mostrarCierreInterrupcion();
  else cerrarInterrupcion();
}

function editarCierreInterrupcion() {
  rellenarCierreNpl(detalle.datos.npl || {});
  document.getElementById("npl-campo-ticket").hidden = !!detalle.datos.padre_id;
  document.getElementById("npl-form-cierre").hidden = false;
  document.getElementById("npl-resumen-cerrada").hidden = true;
  document.getElementById("npl-editar-cierre-zona").hidden = true;
  document.getElementById("npl-btn-cierre").textContent = "Guardar cierre";
  document.getElementById("npl-acciones").hidden = false;
  document.getElementById("npl-form-cierre").scrollIntoView({ block: "nearest" });
}

function pedirCancelarNpl() {
  document.getElementById("npl-cancel-confirm").hidden = false;
  document.getElementById("npl-acciones").hidden = true;
}

function ocultarCancelarNpl() {
  document.getElementById("npl-cancel-confirm").hidden = true;
  document.getElementById("npl-acciones").hidden = false;
}

var temporizadorNotasNpl = null;
function guardarNotasInterrupcionDebounced() {
  var ind = document.getElementById("npl-guardado");
  if (ind) ind.textContent = "Guardando...";
  clearTimeout(temporizadorNotasNpl);
  temporizadorNotasNpl = setTimeout(guardarNotasInterrupcion, 800);
}

async function guardarNotasInterrupcion() {
  if (!detalle) return;
  try {
    await enviar("/api/interrupcion/notas", { id: detalle.id, texto: document.getElementById("npl-notas").value });
    var ind = document.getElementById("npl-guardado");
    if (ind) ind.textContent = "Guardado";
  } catch (error) { mostrarError(error); }
}

async function guardarPadreInterrupcion() {
  var valorPadre  = document.getElementById("npl-padre").value;
  var padreActual = detalle.datos.padre_id || "";
  if (valorPadre === padreActual) return;
  try {
    if (detalle.temporal) {
      await enviar("/api/atencion/datos", { id: detalle.id, padre_id: valorPadre });
      if (valorPadre) {
        var padre = atenciones.find(function (a) { return a.id === valorPadre; });
        await enviar("/api/atencion/identidad", {
          id: detalle.id,
          tracking_code: padre ? padre.tracking_code : "",
          tracking_id: detalle.datos.tracking_id,
          entornos: detalle.datos.entornos
        });
      }
    } else if (padreActual && !valorPadre) {
      throw new Error("Quitar el padre no esta disponible; elige otra atencion padre");
    } else {
      await enviar("/api/atencion/padre", { id: detalle.id, padre_id: valorPadre });
    }
    if (valorPadre) await enviar("/api/atencion/datos", { id: detalle.id, limpiar_ticket_npl: true });
    proyectos = await leer("/api/proyectos");
    await recargarDetalle();
  } catch (error) { mostrarError(error); }
}

async function guardarProyectoInterrupcion() {
  var codigo = leerProyecto("npl");
  if (codigo === (detalle.datos.tracking_code || "")) return;
  try {
    await enviar("/api/interrupcion/proyecto", { id: detalle.id, tracking_code: codigo });
    proyectos = await leer("/api/proyectos");
    await recargarDetalle();
  } catch (error) {
    mostrarError(error);
    pintarInterrupcion();
  }
}

async function agregarAdjuntoInterrupcion(archivo) {
  var datosUrl = await leerComoDataUrl(archivo);
  var payload = { id: detalle.id };
  if (archivo.type && archivo.type.startsWith("image/")) payload.capturas = [{ datos: datosUrl }];
  else payload.archivos = [{ nombre: archivo.name, datos: datosUrl }];
  try {
    await enviar("/api/interrupcion/adjunto", payload);
    await recargarDetalle();
  } catch (error) { mostrarError(error); }
}

async function agregarAdjuntosInterrupcionSeleccionados(selector) {
  for (var i = 0; i < selector.files.length; i++) await agregarAdjuntoInterrupcion(selector.files[i]);
  selector.value = "";
}

async function mostrarCierreInterrupcion() {
  rellenarCierreNpl(detalle.datos.npl || {});
  document.getElementById("npl-campo-ticket").hidden = !!detalle.datos.padre_id;
  document.getElementById("npl-form-cierre").hidden = false;
  document.getElementById("npl-btn-cierre").textContent = "Guardar cierre";
  document.getElementById("npl-acciones").hidden = false;
  document.getElementById("npl-form-cierre").scrollIntoView({ block: "nearest" });
  // Al abrir el cierre se pausa el foco: el cronometro se congela
  if (foco.actual && foco.actual.atencion_id === detalle.id) {
    await enviar("/api/foco/cambiar", { tipo: "pausa" });
    await cargarAtenciones();   // el total de la lista ya incluye el tramo recien cerrado
    await cargarFoco();
    pintarEstadoDetalle();
  }
  document.getElementById("npl-quien").focus();
}

async function cerrarInterrupcion() {
  try {
    var tienePadre = !!detalle.datos.padre_id;
    await enviar("/api/interrupcion/cerrar", {
      id: detalle.id,
      tipo_contacto: document.getElementById("npl-tipo-contacto").value,
      quien: document.getElementById("npl-quien").value,
      resumen: document.getElementById("npl-resumen").value,
      ticket_relacionado: tienePadre ? "" : document.getElementById("npl-ticket").value
    });
    await cargarAtenciones();
    await cargarFoco();
    await recargarDetalle();   // si queda incompleto, pintarInterrupcion muestra el aviso ambar
  } catch (error) { mostrarError(error); }
}

function enlaceJira(key, url) {
  if (url && /^https?:\/\//i.test(url)) {
    return '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(key) + "</a>";
  }
  return esc(key);
}

function pintarJira() {
  var d = detalle.datos;
  var jira = d.jira || {};
  var cont = document.getElementById("d-jira-contenido");
  var filas = [];
  if (d.titulo_jira) filas.push("<div><b>Titulo Jira:</b> " + esc(d.titulo_jira) + "</div>");
  if (jira.padre_key) {
    var etiqueta = jira.tipo_padre === "hu" ? "Historia de usuario" : "Subtarea";
    filas.push("<div>" + etiqueta + ": " + enlaceJira(jira.padre_key, jira.padre_url) + "</div>");
  }
  var subs = (d.subtareas || []).filter(function (s) { return s.key; });
  if (subs.length) {
    filas.push('<div style="margin-top:6px"><b>Subtareas:</b></div>');
    filas.push('<ul class="md-ul">' + subs.map(function (s) {
      return "<li>" + esc(s.fase || s.entorno || s.key) + ": " + enlaceJira(s.key, s.url) + "</li>";
    }).join("") + "</ul>");
  }
  cont.innerHTML = filas.length
    ? filas.join("")
    : '<span class="suave">Aun no se ha creado el issue en Jira.</span>';
}

var SVG_LOCK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

function chipArchivo(raiz, ruta) {
  return '<a class="entrada-chip" href="' + urlArchivo(raiz, ruta) + '" target="_blank" rel="noopener">' +
    esc(ruta.split("/").pop()) + "</a>";
}

function toggleVistaBitacora() {
  vistaBitacora = vistaBitacora === "corregido" ? "original" : "corregido";
  try { localStorage.setItem("focus-flow-vista-bitacora", vistaBitacora); } catch (e) {}
  pintarEntradas();
}

function pintarEntradas() {
  var contenedor = document.getElementById("d-entradas");
  var revisar = pasoIndice() === 2;

  // Boton para alternar original/corregido (no en "Por revisar", que ya va lado a lado)
  var hayCorreccion = detalle.entradas.some(function (e) { return e.texto_corregido && !e.correccion_vencida; });
  var btnVista = document.getElementById("d-btn-vista");
  if (btnVista) {
    var mostrarBtn = hayCorreccion && !revisar;
    btnVista.hidden = !mostrarBtn;
    if (mostrarBtn) btnVista.textContent = vistaBitacora === "corregido" ? "Ver original" : "Ver corregido";
  }

  if (!detalle.entradas.length) {
    contenedor.innerHTML = '<p class="suave">Aun no hay entradas.</p>';
    return;
  }

  contenedor.innerHTML = detalle.entradas.map(function (e) {
    var html = '<article class="entrada"><div class="entrada-cab">' +
      '<span class="entrada-n">#' + e.n + " " + esc(NOMBRES_ENTRADA[e.tipo] || e.tipo) + "</span>" +
      '<span class="entrada-fecha">' + esc(e.fecha) + "</span>" +
      (e.para_jira
        ? '<span class="entrada-dest entrada-dest-jira">Para Jira</span>'
        : '<span class="entrada-dest entrada-dest-priv">Privada</span>');
    if (e.editado) html += '<span class="entrada-nota">Editada ' + esc(e.editado) + "</span>";
    html += '<span class="entrada-sep"></span>';
    if (e.enviada) {
      html += '<span class="entrada-lock">' + SVG_LOCK + "Subida a Jira</span>";
    } else {
      html += '<button class="entrada-editar" onclick="editarEntrada(\'' + e.id + '\')">Editar</button>';
    }
    html += "</div>";

    // En "Por revisar", las entradas Para Jira muestran original y corregido lado a lado
    var comparar = revisar && e.para_jira && e.texto_corregido && !e.correccion_vencida;
    if (comparar) {
      html += '<div class="entrada-comparar">' +
        '<div class="entrada-col entrada-col-orig">' + mdToHtml(e.texto || "") + "</div>" +
        '<div class="entrada-col entrada-col-corr">' + mdToHtml(e.texto_corregido) + "</div>" +
      "</div>";
    } else {
      var usarCorr = e.texto_corregido && !e.correccion_vencida && vistaBitacora === "corregido";
      var textoMostrar = usarCorr ? e.texto_corregido : e.texto;
      if (textoMostrar) html += '<div class="texto">' + mdToHtml(textoMostrar) + "</div>";
      if (e.correccion_vencida) html += '<div class="entrada-nota entrada-nota-bloque">Correccion pendiente</div>';
    }

    // Correos y archivos como etiquetas pequenas
    var chips = [];
    (e.correos || []).forEach(function (c) {
      chips.push('<a class="entrada-chip" href="' + urlArchivo("trabajo", c.archivo) + '" target="_blank" rel="noopener">' +
        "Correo " + esc(c.tipo) + ": " + esc(c.asunto || c.archivo.split("/").pop()) + "</a>");
      (c.adjuntos || []).forEach(function (a) { chips.push(chipArchivo("trabajo", a)); });
    });
    (e.archivos || []).forEach(function (a) { chips.push(chipArchivo(a.raiz, a.ruta)); });
    if (chips.length) html += '<div class="entrada-adjuntos">' + chips.join("") + "</div>";

    // Capturas: imagen (abre el visor) con la descripcion debajo
    if (e.capturas && e.capturas.length) {
      html += '<div class="entrada-capturas">' + e.capturas.map(function (c, i) {
        return '<figure class="captura">' +
          '<button type="button" class="captura-btn" onclick="abrirVisor(\'' + e.id + '\',' + i + ',this)">' +
          '<img src="' + urlArchivo(c.raiz, c.ruta) + '" alt=""></button>' +
          '<figcaption>' + esc(c.descripcion) + "</figcaption></figure>";
      }).join("") + "</div>";
    }

    return html + "</article>";
  }).join("");
}

// -- Visor de capturas
var visorCapturas = [];
var visorIndice = 0;
var visorOrigen = null;

function abrirVisor(entradaId, idx, origenEl) {
  var e = (detalle.entradas || []).find(function (x) { return x.id === entradaId; });
  if (!e || !e.capturas || !e.capturas.length) return;
  visorCapturas = e.capturas.map(function (c) {
    return { url: urlArchivo(c.raiz, c.ruta), descripcion: c.descripcion || "" };
  });
  visorIndice = idx || 0;
  visorOrigen = origenEl || document.activeElement;
  pintarVisor();
  document.getElementById("visor").hidden = false;
  document.getElementById("visor-cerrar").focus();
}

function pintarVisor() {
  var c = visorCapturas[visorIndice];
  if (!c) return;
  document.getElementById("visor-img").src = c.url;
  document.getElementById("visor-desc").textContent = c.descripcion;
  document.getElementById("visor-abrir").href = c.url;
  document.getElementById("visor-contador").textContent = (visorIndice + 1) + " / " + visorCapturas.length;
  var multi = visorCapturas.length > 1;
  document.getElementById("visor-prev").hidden = !multi;
  document.getElementById("visor-next").hidden = !multi;
}

function visorMover(d) {
  if (visorCapturas.length < 2) return;
  visorIndice = (visorIndice + d + visorCapturas.length) % visorCapturas.length;
  pintarVisor();
}

function cerrarVisor() {
  document.getElementById("visor").hidden = true;
  if (visorOrigen && visorOrigen.focus) visorOrigen.focus();
  visorOrigen = null;
}

function clicFueraVisor(evento) {
  if (evento.target === document.getElementById("visor")) cerrarVisor();
}

document.addEventListener("keydown", function (e) {
  if (document.getElementById("visor").hidden) return;
  if (e.key === "Escape") { e.preventDefault(); cerrarVisor(); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); visorMover(-1); }
  else if (e.key === "ArrowRight") { e.preventDefault(); visorMover(1); }
});

function ajustarDetalle() {
  var tienePadre = document.getElementById("e-padre").value !== "";
  document.getElementById("e-campo-hu").hidden       = tienePadre;
  document.getElementById("i-campo-proyecto").hidden = tienePadre;
  document.getElementById("i-campo-entornos").hidden = tienePadre;
}

async function guardarDatos() {
  try {
    var datosGen = {
      id:             detalle.id,
      titulo:         document.getElementById("e-titulo").value,
      url_servicenow: document.getElementById("e-url").value,
      workspace_edge: document.getElementById("e-workspace").value
    };

    if (detalle.temporal) {
      // Atencion aun sin ubicar: el padre y la identidad se guardan juntos.
      var valorPadre = document.getElementById("e-padre").value;
      datosGen.padre_id = valorPadre;
      if (!valorPadre) datosGen.hu_tipo = document.getElementById("e-hu").value;
      await enviar("/api/atencion/datos", datosGen);
      await enviar("/api/atencion/identidad", {
        id:            detalle.id,
        tracking_code: leerProyecto("i"),
        tracking_id:   document.getElementById("i-tracking-id").value,
        entornos:      leerEntornos("i-entorno")
      });
    } else {
      // Carpetas definitivas: Tracking ID, proyecto y entornos estan fijos.
      // Se guardan titulo, URL, Area Edge, la HU si aplica y, si cambio, el padre.
      var nuevoPadre  = document.getElementById("e-padre").value;
      var cambiaPadre = !document.getElementById("e-padre").disabled && nuevoPadre &&
                        nuevoPadre !== (detalle.datos.padre_id || "");
      if (!document.getElementById("e-campo-hu").hidden) {
        datosGen.hu_tipo = document.getElementById("e-hu").value;
      }
      await enviar("/api/atencion/datos", datosGen);
      // Asignar o cambiar el padre mueve la carpeta dentro de la del padre
      if (cambiaPadre) await enviar("/api/atencion/padre", { id: detalle.id, padre_id: nuevoPadre });
    }
    proyectos = await leer("/api/proyectos");
    await cargarAtenciones();
    await recargarDetalle();
  } catch (error) { mostrarError(error); }
}

function tieneCorreoTipo(tipo) {
  return detalle.entradas.some(function (e) {
    return (e.correos || []).some(function (c) { return c.tipo === tipo; });
  });
}

async function cancelarInterrupcion() {
  // La confirmacion se hace en linea (pedirCancelarNpl); aqui ya esta confirmada
  try {
    await enviar("/api/interrupcion/cancelar", { id: detalle.id });
    // La atencion se borro; volver a la principal (el foco queda sin foco)
    detalle = null;
    window.location.href = "/";
  }
  catch (error) { mostrarError(error); }
}

async function abrirCarpeta(raiz) {
  try { await enviar("/api/atencion/abrir_carpeta", { id: detalle.id, raiz: raiz }); }
  catch (error) { mostrarError(error); }
}

// -- Redactor de entradas (barra fija)
var redactorTipo = "avance";

var PLACEHOLDER_TIPO = {
  avance:     "Que hiciste, que paso, que falta. Pega capturas con Ctrl+V.",
  solicitud:  "Adjunta o arrastra el correo del solicitante.",
  asignacion: "Adjunta o arrastra el correo de asignacion.",
  cierre:     "Resumen del cierre. Adjunta el correo de respuesta."
};

function abrirRedactor() {
  document.getElementById("r-abrir").hidden = true;
  document.getElementById("r-form").hidden  = false;
  var texto = document.getElementById("r-texto");
  if (texto) {
    autosizeTexto(texto);   // ajusta el alto al contenido (visible ya el form)
    if (document.activeElement !== texto) texto.focus();
  }
  actualizarRedactor();
}

// Crece con el contenido hasta la mitad de la ventana; luego scroll interno
function autosizeTexto(ta) {
  if (!ta || ta.offsetParent === null) return;   // oculto: scrollHeight no es fiable
  var max = Math.floor(window.innerHeight * 0.5);
  ta.style.height = "auto";
  var alto = Math.min(ta.scrollHeight, max);
  ta.style.height = alto + "px";
  ta.style.overflowY = ta.scrollHeight > max ? "auto" : "hidden";
}

// Tab inserta 2 espacios; Shift+Tab quita indentacion; Esc sale del campo
function teclaTexto(evento) {
  var ta = evento.target;
  if (evento.key === "Escape") {
    ta.blur();
    if (!hayBorrador()) minimizarRedactor();   // vacia: se cierra a una linea
    return;
  }
  if (evento.key !== "Tab") return;
  evento.preventDefault();
  var val = ta.value, ini = ta.selectionStart, fin = ta.selectionEnd;
  var inicioLinea = val.lastIndexOf("\n", ini - 1) + 1;

  if (evento.shiftKey) {
    var seg = val.slice(inicioLinea, fin);
    var quitadoPrimera = 0, quitadoTotal = 0;
    var lineas = seg.split("\n").map(function (ln, i) {
      var m = ln.match(/^ {1,2}/);
      var q = m ? m[0].length : 0;
      if (i === 0) quitadoPrimera = q;
      quitadoTotal += q;
      return ln.slice(q);
    });
    ta.value = val.slice(0, inicioLinea) + lineas.join("\n") + val.slice(fin);
    ta.selectionStart = Math.max(inicioLinea, ini - quitadoPrimera);
    ta.selectionEnd   = fin - quitadoTotal;
  } else if (ini === fin) {
    ta.value = val.slice(0, ini) + "  " + val.slice(fin);
    ta.selectionStart = ta.selectionEnd = ini + 2;
  } else {
    var segSel = val.slice(inicioLinea, fin);
    var sangrado = segSel.replace(/^/gm, "  ");
    var agregado = sangrado.length - segSel.length;
    ta.value = val.slice(0, inicioLinea) + sangrado + val.slice(fin);
    ta.selectionStart = ini + 2;
    ta.selectionEnd   = fin + agregado;
  }
  autosizeTexto(ta);
  actualizarRedactor();
}

function minimizarRedactor() {
  document.getElementById("r-form").hidden  = true;
  document.getElementById("r-abrir").hidden = false;
  pintarBarraCerrada();
}

// La barra cerrada avisa si hay un borrador sin guardar
function pintarBarraCerrada() {
  var btn = document.getElementById("r-abrir");
  if (hayBorrador()) {
    btn.classList.add("con-borrador");
    btn.innerHTML = '<span class="redactor-punto"></span>Borrador sin guardar';
  } else {
    btn.classList.remove("con-borrador");
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Escribe una entrada...';
  }
}

function elegirTipo(tipo) {
  if (edicion) return;                 // el tipo no cambia al editar una entrada
  redactorTipo = tipo;
  // Las capturas de los tipos de correo se marcan "del correo" por defecto
  var esCorreo = tipo !== "avance";
  nuevasCapturas.forEach(function (c) { c.de_correo = esCorreo; });
  document.getElementById("r-texto").placeholder = PLACEHOLDER_TIPO[tipo] || "";
  pintarTipos();
  pintarPendientes();
  actualizarRedactor();
}

function pintarTipos() {
  document.getElementById("r-tipos").classList.toggle("bloqueada", !!edicion);
  document.querySelectorAll("#r-tipos .r-tipo-btn").forEach(function (b) {
    b.classList.toggle("activo", b.getAttribute("data-tipo") === redactorTipo);
  });
}

function faltaCorreoTicket() {
  return !!detalle && detalle.datos.tipo === "ticket" && !edicion &&
    (redactorTipo === "avance" || redactorTipo === "cierre") && !tieneCorreoTipo("asignado");
}

function actualizarRedactor() {
  if (!detalle) return;
  // Aviso de foco distinto (sin confirm: el boton Enfocar cambia el foco)
  var idActual = foco.actual ? foco.actual.atencion_id : "";
  document.getElementById("r-foco-aviso").hidden = idActual === detalle.id;

  // Avisos de correo recibido y de cierre
  document.getElementById("r-aviso-correo").hidden = !faltaCorreoTicket();
  document.getElementById("r-aviso-cierre").hidden = !(redactorTipo === "cierre" && !edicion);

  // Estado del boton "Agregar entrada"
  var texto       = document.getElementById("r-texto").value.trim();
  var vacia       = !texto && !nuevasCapturas.length && !nuevosArchivos.length && !edicion;
  var faltaDesc   = nuevasCapturas.some(function (c) { return !c.de_correo && !c.descripcion.trim(); });
  var faltaCorreo = faltaCorreoTicket();

  var btn = document.getElementById("r-guardar");
  btn.disabled = vacia || faltaDesc || faltaCorreo;
  btn.title = vacia ? "Escribe algo o adjunta una captura o archivo"
    : (faltaDesc ? "Falta la descripcion de una captura"
    : (faltaCorreo ? "Primero registra el correo de solicitud o asignacion"
    : "Guardar la entrada"));
}

async function enfocarDesdeRedactor() {
  try {
    await enviar("/api/foco/cambiar", { tipo: "atencion", atencion_id: detalle.id });
    await cargarFoco();
    actualizarRedactor();
  } catch (error) { mostrarError(error); }
}

function limpiarRedactor() {
  edicion = null;
  nuevasCapturas = [];
  nuevosArchivos = [];
  redactorTipo = "avance";
  document.getElementById("r-titulo").textContent   = "Nueva entrada";
  document.getElementById("r-btn-limpiar").hidden    = true;
  document.getElementById("r-texto").value           = "";
  document.getElementById("r-texto").placeholder     = PLACEHOLDER_TIPO.avance;
  document.getElementById("r-jira").checked          = true;
  document.getElementById("r-existentes").innerHTML  = "";
  document.getElementById("r-selector").value        = "";
  pintarTipos();
  pintarPendientes();
  minimizarRedactor();
  actualizarRedactor();
}

function editarEntrada(id) {
  var entrada = detalle.entradas.find(function (e) { return e.id === id; });
  limpiarRedactor();
  edicion = entrada;
  redactorTipo = entrada.tipo;
  document.getElementById("r-titulo").textContent = "Editando entrada #" + entrada.n;
  document.getElementById("r-btn-limpiar").hidden = false;
  document.getElementById("r-texto").value        = entrada.texto || "";
  document.getElementById("r-jira").checked       = !!entrada.para_jira;
  document.getElementById("r-existentes").innerHTML = (entrada.capturas || []).map(function (c, i) {
    return '<div class="cap-vert">' +
      '<div class="cap-vert-img"><img src="' + urlArchivo(c.raiz, c.ruta) + '" alt="" onclick="abrirVisor(\'' + entrada.id + '\',' + i + ',this)"></div>' +
      '<div class="cap-vert-datos">' +
        '<label><input type="checkbox" id="r-existente-quitar-' + i + '">Quitar esta captura</label>' +
        '<textarea id="r-existente-desc-' + i + '">' + esc(c.descripcion) + '</textarea>' +
      '</div></div>';
  }).join("");
  pintarTipos();
  pintarPendientes();
  abrirRedactor();
}

function pintarPendientes() {
  var contenedor = document.getElementById("r-pendientes");
  var html = nuevasCapturas.map(function (c, i) {
    var falta = !c.de_correo && !c.descripcion.trim();
    return '<div class="cap-vert">' +
      '<div class="cap-vert-img">' +
        '<img src="' + c.datos + '" alt="" onclick="verCapturaPendiente(' + i + ')">' +
        '<button type="button" class="cap-vert-quitar" aria-label="Quitar captura" onclick="quitarCaptura(' + i + ')">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="cap-vert-datos">' +
        (redactorTipo !== "avance"
          ? '<label><input type="checkbox"' + (c.de_correo ? " checked" : "") +
            ' onchange="toggleDeCorreo(' + i + ', this.checked)">Captura del correo</label>'
          : "") +
        '<textarea class="' + (falta ? "falta" : "") + '" placeholder="' +
          (c.de_correo ? "Descripcion (opcional en capturas del correo)" : "Describe que muestra la captura (obligatoria)") +
          '" oninput="descCaptura(' + i + ', this.value)">' + esc(c.descripcion) + '</textarea>' +
      '</div></div>';
  }).join("");
  html += nuevosArchivos.map(function (a, i) {
    return '<div class="cap-archivo"><span>' +
      (a.nombre.toLowerCase().endsWith(".eml") ? "Correo: " : "Archivo: ") + esc(a.nombre) + "</span>" +
      '<button type="button" onclick="quitarArchivo(' + i + ')">Quitar</button></div>';
  }).join("");
  contenedor.innerHTML = html;
}

function descCaptura(i, valor) {
  nuevasCapturas[i].descripcion = valor;
  var tas = document.querySelectorAll("#r-pendientes .cap-vert .cap-vert-datos textarea");
  if (tas[i]) tas[i].classList.toggle("falta", !nuevasCapturas[i].de_correo && !valor.trim());
  actualizarRedactor();
}

function quitarCaptura(i) { nuevasCapturas.splice(i, 1); pintarPendientes(); actualizarRedactor(); }
function quitarArchivo(i) { nuevosArchivos.splice(i, 1); pintarPendientes(); actualizarRedactor(); }

function verCapturaPendiente(i) {
  visorCapturas = nuevasCapturas.map(function (c) { return { url: c.datos, descripcion: c.descripcion || "" }; });
  visorIndice = i;
  visorOrigen = document.activeElement;
  pintarVisor();
  document.getElementById("visor").hidden = false;
  document.getElementById("visor-cerrar").focus();
}

function toggleDeCorreo(i, checked) {
  var c = nuevasCapturas[i];
  c.de_correo = checked;
  if (checked && !c.descripcion.trim())            c.descripcion = "Captura del correo";
  if (!checked && c.descripcion === "Captura del correo") c.descripcion = "";
  pintarPendientes();
  actualizarRedactor();
}

async function agregarCaptura(archivo) {
  abrirRedactor();
  var esCorreo = redactorTipo !== "avance";
  nuevasCapturas.push({ datos: await leerComoDataUrl(archivo), descripcion: esCorreo ? "Captura del correo" : "", de_correo: esCorreo });
  pintarPendientes();
  actualizarRedactor();
}

async function agregarArchivo(archivo) {
  abrirRedactor();
  nuevosArchivos.push({ nombre: archivo.name, datos: await leerComoDataUrl(archivo) });
  pintarPendientes();
  actualizarRedactor();
}

async function agregarArchivosSeleccionados(selector) {
  for (var i = 0; i < selector.files.length; i++) await agregarArchivo(selector.files[i]);
  selector.value = "";
}

async function guardarEntrada() {
  // El boton esta deshabilitado si falta algo, asi que aqui solo se guarda.
  nuevasCapturas.forEach(function (c) {
    if (c.de_correo && !c.descripcion.trim()) c.descripcion = "Captura del correo";
  });
  var capturas = nuevasCapturas.map(function (c) {
    return { datos: c.datos, descripcion: c.descripcion, de_correo: c.de_correo };
  });
  try {
    if (edicion) {
      var descripciones = {};
      var quitar = [];
      (edicion.capturas || []).forEach(function (c, i) {
        descripciones[c.ruta] = document.getElementById("r-existente-desc-" + i).value;
        if (document.getElementById("r-existente-quitar-" + i).checked) quitar.push(c.ruta);
      });
      await enviar("/api/entrada/editar", {
        id: detalle.id, entrada_id: edicion.id,
        texto: document.getElementById("r-texto").value,
        para_jira: document.getElementById("r-jira").checked,
        descripciones: descripciones, quitar_capturas: quitar,
        capturas: capturas, archivos: nuevosArchivos
      });
    } else {
      await enviar("/api/entrada/crear", {
        id: detalle.id, tipo: redactorTipo,
        texto: document.getElementById("r-texto").value,
        para_jira: document.getElementById("r-jira").checked,
        capturas: capturas, archivos: nuevosArchivos
      });
    }
    limpiarRedactor();
    await recargarDetalle();
    scrollUltimaEntrada();
  } catch (error) { mostrarError(error); }
}
