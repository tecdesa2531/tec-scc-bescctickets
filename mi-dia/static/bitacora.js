// Focus Flow - bitacora.js: detalle de atencion y redactor de entradas

function mdInline(s) {
  s = esc(s);
  s = s.replace(/`([^`\n]+)`/g,         '<code class="md-c">$1</code>');
  s = s.replace(/\*\*([^*\n]+)\*\*/g,   "<strong>$1</strong>");
  s = s.replace(/\*([^*\n]+)\*/g,       "<em>$1</em>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(_, txt, url) {
    return /^https?:\/\//i.test(url)
      ? '<a href="' + url + '" target="_blank" rel="noopener">' + txt + "</a>"
      : txt;
  });
  return s;
}

function mdToHtml(texto) {
  if (!texto) return "";
  var out  = [];
  var bloq = false;
  var ul   = false;
  var ol   = false;

  function cerrar() {
    if (ul) { out.push("</ul>"); ul = false; }
    if (ol) { out.push("</ol>"); ol = false; }
  }

  texto.split("\n").forEach(function (l) {
    if (/^```/.test(l.trimStart())) {
      cerrar();
      if (bloq) { out.push("</code></pre>"); bloq = false; }
      else      { out.push('<pre class="md-pre"><code>');  bloq = true; }
      return;
    }
    if (bloq)      { out.push(esc(l)); return; }
    if (!l.trim()) { cerrar(); out.push('<div class="md-gap"></div>'); return; }

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

  if (bloq) out.push("</code></pre>");
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
  window.scrollTo(0, 0);
}

async function recargarDetalle() {
  detalle = await leer("/api/atencion?id=" + encodeURIComponent(detalle.id));
  pintarDetalle();
}

async function volver() {
  if ((nuevasCapturas.length || nuevosArchivos.length || document.getElementById("r-texto").value.trim()) &&
      !confirm("Hay una entrada sin guardar. Salir de todos modos?")) return;
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

function pintarDetalle() {
  var d = detalle.datos;
  document.title = (d.tracking_id && d.tracking_code)
    ? d.tracking_id + "-" + d.tracking_code
    : "Focus Flow";
  document.getElementById("d-titulo").textContent =
    (NOMBRES_TIPO[d.tipo] || d.tipo) + " " + (d.tracking_id || "Sin ID") + " - " + d.titulo;
  document.getElementById("d-aviso-temporal").hidden = !detalle.temporal;

  var enlace  = document.getElementById("d-url");
  enlace.hidden = !d.url_servicenow;
  enlace.href   = d.url_servicenow || "#";

  var entornosTxt = (d.entornos || []).map(function(e) { return e === "SIN_ENTORNO" ? "sin entorno" : e; }).join(", ") || "sin entorno";
  var chips = [
    d.tracking_code || "sin proyecto",
    entornosTxt,
    NOMBRES_ESTADO[d.estado] || d.estado,
    duracion(detalle.segundos),
    detalle.pendientes + " Jira pend."
  ];
  if (!d.padre_id) chips.splice(3, 0, "hu: " + d.hu_tipo);
  if (d.workspace_edge)  chips.push(d.workspace_edge);
  if (d.listo_para_limpieza) chips.push("atendida " + d.listo_para_limpieza);
  if (d.listo_para_jira) chips.push("conforme " + d.listo_para_jira);
  if (d.padre_id) {
    var padre = atenciones.find(function (a) { return a.id === d.padre_id; });
    if (padre) chips.push("hijo de: " + nombreAtencion(padre));
  }
  document.getElementById("d-info").innerHTML =
    '<div class="meta-chips">' +
    chips.map(function(txt) { return '<span class="meta-chip">' + esc(txt) + "</span>"; }).join("") +
    '</div><div class="meta-ruta">' + esc(detalle.carpeta_trabajo) + "</div>";

  document.getElementById("e-titulo").value    = d.titulo || "";
  document.getElementById("e-url").value       = d.url_servicenow || "";
  document.getElementById("e-workspace").value = d.workspace_edge || "";
  document.getElementById("e-hu").value        = d.hu_tipo || "semanal";
  document.getElementById("e-estado").value    = d.estado || "en_curso";
  var padreEditable = detalle.temporal || !detalle.procesada;
  llenarPadres("e", [detalle.id].concat(descendientesDe(detalle.id)));
  document.getElementById("e-padre").value    = d.padre_id || "";
  document.getElementById("e-padre").disabled = !padreEditable;
  var notaPadre = document.getElementById("e-padre-nota");
  if (!padreEditable) {
    notaPadre.textContent = "El agente ya proceso esta atencion; el padre quedo fijo.";
    notaPadre.hidden = false;
  } else if (!detalle.temporal) {
    notaPadre.textContent = "Al asignar o cambiar el padre, la atencion se mueve dentro de la carpeta del padre.";
    notaPadre.hidden = false;
  } else {
    notaPadre.hidden = true;
  }
  document.getElementById("e-campo-hu").hidden       = !!d.padre_id;
  document.getElementById("i-campo-proyecto").hidden = !!d.padre_id;

  llenarProyectos("i", d.tracking_code);
  document.getElementById("i-proyecto").disabled          = !detalle.temporal;
  document.getElementById("i-campo-ticket").hidden        = !(d.tipo === "ticket" && detalle.temporal);
  document.getElementById("i-tracking-id").value         = d.tracking_id || "";
  document.getElementById("i-campo-entornos").hidden     = !!d.padre_id;
  marcarEntornos("i-entorno", d.entornos || []);
  document.getElementById("i-nota").textContent = detalle.temporal
    ? "Al completar los datos se crean las carpetas definitivas en ambas raices y se mueve todo."
    : "Si cambias los entornos, la atencion se mueve a la carpeta de entorno nueva en ambas raices.";
  document.getElementById("d-identidad").open = detalle.temporal;

  var desc = document.getElementById("d-descripcion-contenido");
  if (d.descripcion) {
    desc.innerHTML = mdToHtml(d.descripcion);
    desc.className = "";
  } else {
    desc.textContent = "Sin descripcion aun.";
    desc.className = "suave";
  }

  pintarJira();

  var estadoCerrado = d.estado === "atendido" || d.estado === "descartado";
  document.querySelector("button[onclick='ponerFocoActual()']").hidden = estadoCerrado;
  document.getElementById("d-btn-terminar").hidden = estadoCerrado;
  document.getElementById("d-btn-conforme").hidden = !(d.estado === "atendido" && !d.listo_para_jira);
  document.getElementById("r-titulo").hidden    = estadoCerrado;
  document.getElementById("r-redactor").hidden  = estadoCerrado;

  pintarEntradas();
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
    : '<span class="suave">El agente aun no ha creado el issue en Jira.</span>';
}

function verTextoBitacora(modo) {
  vistaBitacora = modo;
  try { localStorage.setItem("focus-flow-vista-bitacora", modo); } catch (e) {}
  pintarEntradas();
}

function toggleCorreccion() {
  verTextoBitacora(vistaBitacora === "corregido" ? "original" : "corregido");
}

function pintarEntradas() {
  var contenedor = document.getElementById("d-entradas");
  var hayCorreccion = detalle.entradas.some(function (e) { return e.texto_corregido; });
  var btn = document.getElementById("d-btn-toggle-corregido");
  btn.hidden = !hayCorreccion;
  if (hayCorreccion) {
    btn.style.opacity = vistaBitacora === "corregido" ? "0.85" : "0.4";
    btn.title = vistaBitacora === "corregido" ? "Ver texto original" : "Ver texto corregido por el agente";
  }
  if (!detalle.entradas.length) {
    contenedor.innerHTML = '<p class="suave">Aun no hay entradas.</p>';
    return;
  }
  contenedor.innerHTML = detalle.entradas.map(function (e) {
    var usarCorregido = vistaBitacora === "corregido" && e.texto_corregido;
    var textoMostrar  = usarCorregido ? e.texto_corregido : e.texto;
    var html = '<div class="entrada"><div class="cabecera"><b>#' + e.n + " " +
      esc(NOMBRES_ENTRADA[e.tipo] || e.tipo) + "</b><span>" + esc(e.fecha) + "</span>";
    if (!e.para_jira)      html += '<span class="etiqueta">Privada</span>';
    if (e.enviada)         html += '<span class="etiqueta">Enviada a Jira</span>';
    if (e.texto_corregido) html += '<span class="etiqueta">' + (usarCorregido ? "Corregido" : "Con correccion") + "</span>";
    if (e.editado)         html += '<span class="etiqueta">Editada ' + esc(e.editado) + "</span>";
    if (!e.enviada)        html += '<button class="derecha" onclick="editarEntrada(\'' + e.id + '\')">Editar</button>';
    html += "</div>";
    if (textoMostrar) html += '<div class="texto">' + mdToHtml(textoMostrar) + "</div>";
    (e.correos || []).forEach(function (c) {
      html += '<div style="font-size:13px;margin:4px 0">Correo ' + esc(c.tipo) + ': <a href="' +
        urlArchivo("trabajo", c.archivo) + '">' + esc(c.asunto || c.archivo) +
        '</a> <span class="suave">' + esc(c.fecha) + " - " + esc(c.de) + "</span>";
      if (c.adjuntos && c.adjuntos.length) {
        html += "<div>Adjuntos: " + c.adjuntos.map(function (a) {
          return '<a href="' + urlArchivo("trabajo", a) + '" target="_blank">' + esc(a.split("/").pop()) + "</a>";
        }).join(", ") + "</div>";
      }
      html += "</div>";
    });
    if (e.archivos && e.archivos.length) {
      html += '<div style="font-size:13px;margin:4px 0">Archivos: ' + e.archivos.map(function (a) {
        return '<a href="' + urlArchivo(a.raiz, a.ruta) + '" target="_blank">' + esc(a.ruta.split("/").pop()) + "</a>";
      }).join(", ") + "</div>";
    }
    if (e.capturas && e.capturas.length) {
      html += '<div class="capturas">' + e.capturas.map(function (c) {
        return '<figure><a href="' + urlArchivo(c.raiz, c.ruta) + '" target="_blank">' +
          '<img src="' + urlArchivo(c.raiz, c.ruta) + '" alt=""></a>' +
          '<figcaption>' + esc(c.descripcion) + "</figcaption></figure>";
      }).join("") + "</div>";
    }
    return html + "</div>";
  }).join("");
}

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
      workspace_edge: document.getElementById("e-workspace").value,
      estado:         document.getElementById("e-estado").value
    };
    var valorPadre  = document.getElementById("e-padre").value;
    var padreActual = detalle.datos.padre_id || "";
    var padreEditable = detalle.temporal || !detalle.procesada;

    if (detalle.temporal) {
      // Atencion aun sin ubicar: el padre y la identidad se guardan juntos.
      datosGen.padre_id = valorPadre;
      if (!valorPadre) datosGen.hu_tipo = document.getElementById("e-hu").value;
      await enviar("/api/atencion/datos", datosGen);
      await enviar("/api/atencion/identidad", {
        id:            detalle.id,
        tracking_code: leerProyecto("i"),
        tracking_id:   document.getElementById("i-tracking-id").value,
        entornos:      leerEntornos("i-entorno")
      });
    } else if (padreActual && !valorPadre) {
      throw new Error("Quitar el padre no esta disponible; elige otra atencion padre");
    } else if (padreEditable && valorPadre && valorPadre !== padreActual) {
      // Reparentar una atencion ya ubicada: mueve la carpeta dentro del padre.
      await enviar("/api/atencion/datos", datosGen);
      await enviar("/api/atencion/padre", { id: detalle.id, padre_id: valorPadre });
    } else {
      if (!valorPadre) datosGen.hu_tipo = document.getElementById("e-hu").value;
      await enviar("/api/atencion/datos", datosGen);
      await enviar("/api/atencion/identidad", {
        id:            detalle.id,
        tracking_code: leerProyecto("i"),
        tracking_id:   document.getElementById("i-tracking-id").value,
        entornos:      leerEntornos("i-entorno")
      });
    }
    proyectos = await leer("/api/proyectos");
    await recargarDetalle();
  } catch (error) { mostrarError(error); }
}

function tieneCorreoTipo(tipo) {
  return detalle.entradas.some(function (e) {
    return (e.correos || []).some(function (c) { return c.tipo === tipo; });
  });
}

async function terminarAtencion() {
  if (detalle.datos.tipo === "ticket" && !tieneCorreoTipo("atendido")) {
    // Primera vez: bloqueo duro (el ticket no esta cerrado sin correo enviado).
    // Si ya se reabrio: solo aviso, porque el cierre ya se registro antes.
    if (detalle.datos.estado === "reabierto") {
      if (!confirm("No registraste un correo de cierre para esta reapertura. Terminar igual?")) return;
    } else {
      alert("Para terminar un ticket necesitas tener registrado al menos un correo enviado.");
      return;
    }
  }
  if (!confirm("Marcar como atendida? El agente podra limpiar el texto de la bitacora para que lo revises.")) return;
  try {
    await enviar("/api/atencion/terminar", { id: detalle.id });
    if (foco.actual && foco.actual.atencion_id === detalle.id) {
      await enviar("/api/foco/cambiar", { tipo: "pausa" });
      await cargarFoco();
    }
    await recargarDetalle();
  }
  catch (error) { mostrarError(error); }
}

async function darConforme() {
  if (!confirm("Dar conforme y marcar lista para enviar a Jira? Revisa antes el texto corregido.")) return;
  try {
    await enviar("/api/atencion/conforme", { id: detalle.id });
    await recargarDetalle();
  }
  catch (error) { mostrarError(error); }
}

async function abrirCarpeta(raiz) {
  try { await enviar("/api/atencion/abrir_carpeta", { id: detalle.id, raiz: raiz }); }
  catch (error) { mostrarError(error); }
}

function ponerFocoActual() { focoAtencion(detalle.id); }

// -- Redactor de entradas
function limpiarRedactor() {
  edicion = null;
  nuevasCapturas = [];
  nuevosArchivos = [];
  document.getElementById("r-titulo").textContent    = "Nueva entrada";
  document.getElementById("r-btn-limpiar").textContent = "Limpiar";
  document.getElementById("r-tipo").disabled         = false;
  document.getElementById("r-tipo").value            = "avance";
  document.getElementById("r-texto").value           = "";
  document.getElementById("r-jira").checked          = true;
  document.getElementById("r-existentes").innerHTML  = "";
  document.getElementById("r-selector").value        = "";
  pintarPendientes();
}

function editarEntrada(id) {
  var entrada = detalle.entradas.find(function (e) { return e.id === id; });
  limpiarRedactor();
  edicion = entrada;
  document.getElementById("r-titulo").textContent      = "Editando entrada #" + entrada.n;
  document.getElementById("r-btn-limpiar").textContent = "Cancelar";
  document.getElementById("r-tipo").value         = entrada.tipo;
  document.getElementById("r-tipo").disabled      = true;
  document.getElementById("r-texto").value        = entrada.texto || "";
  document.getElementById("r-jira").checked       = !!entrada.para_jira;
  document.getElementById("r-existentes").innerHTML = (entrada.capturas || []).map(function (c, i) {
    return '<div class="pendiente"><img src="' + urlArchivo(c.raiz, c.ruta) + '" alt="">' +
      '<input type="text" id="r-existente-desc-' + i + '" value="' + esc(c.descripcion) + '">' +
      '<label><input type="checkbox" id="r-existente-quitar-' + i + '">Quitar</label></div>';
  }).join("");
  pintarPendientes();
  document.getElementById("r-titulo").scrollIntoView();
}

function pintarPendientes() {
  var tipo      = document.getElementById("r-tipo").value;
  var contenedor = document.getElementById("r-pendientes");
  var html = nuevasCapturas.map(function (c, i) {
    return '<div class="pendiente"><img src="' + c.datos + '" alt="">' +
      '<input type="text" id="r-cap-desc-' + i + '" placeholder="Que muestra esta captura' + (c.de_correo ? '' : ' (obligatorio)') + '" value="' + esc(c.descripcion) +
      '" oninput="nuevasCapturas[' + i + '].descripcion = this.value">' +
      (tipo !== "avance"
        ? '<label><input type="checkbox"' + (c.de_correo ? " checked" : "") +
          ' onchange="toggleDeCorreo(' + i + ', this.checked)">Captura del correo</label>'
        : "") +
      '<button onclick="nuevasCapturas.splice(' + i + ', 1); pintarPendientes()">Quitar</button></div>';
  }).join("");
  html += nuevosArchivos.map(function (a, i) {
    return '<div class="pendiente"><span>' +
      (a.nombre.toLowerCase().endsWith(".eml") ? "Correo: " : "Archivo: ") + esc(a.nombre) + "</span>" +
      '<button onclick="nuevosArchivos.splice(' + i + ', 1); pintarPendientes()">Quitar</button></div>';
  }).join("");
  contenedor.innerHTML = html;
}

async function agregarCaptura(archivo) {
  var tipo = document.getElementById("r-tipo").value;
  var esTipoCorreo = tipo !== "avance";
  nuevasCapturas.push({ datos: await leerComoDataUrl(archivo), descripcion: esTipoCorreo ? "Captura del correo" : "", de_correo: esTipoCorreo });
  pintarPendientes();
}

function toggleDeCorreo(i, checked) {
  nuevasCapturas[i].de_correo = checked;
  var campo = document.getElementById("r-cap-desc-" + i);
  if (!campo) return;
  if (checked && !campo.value.trim()) {
    campo.value = "Captura del correo";
    nuevasCapturas[i].descripcion = "Captura del correo";
  }
  if (!checked && campo.value === "Captura del correo") {
    campo.value = "";
    nuevasCapturas[i].descripcion = "";
  }
}

async function agregarArchivo(archivo) {
  nuevosArchivos.push({ nombre: archivo.name, datos: await leerComoDataUrl(archivo) });
  pintarPendientes();
}

async function agregarArchivosSeleccionados(selector) {
  for (var i = 0; i < selector.files.length; i++) await agregarArchivo(selector.files[i]);
  selector.value = "";
}

async function guardarEntrada() {
  if (detalle.datos.estado === "atendido") {
    alert("Esta atencion esta atendida. Cambia el estado a Reabierto para poder agregar mas entradas.");
    return;
  }
  var tipoEntrada = document.getElementById("r-tipo").value;
  if (detalle.datos.tipo === "ticket" && tipoEntrada !== "solicitud" && tipoEntrada !== "asignacion" && !tieneCorreoTipo("asignado")) {
    alert("Para agregar entradas a un ticket necesitas tener registrado al menos un correo recibido (del solicitante o de asignacion).");
    return;
  }
  nuevasCapturas.forEach(function (c) {
    if (c.de_correo && !c.descripcion.trim()) c.descripcion = "Captura del correo";
  });
  if (nuevasCapturas.some(function (c) { return !c.de_correo && !c.descripcion.trim(); })) {
    alert("Cada captura necesita una descripcion: Copilot solo lee texto.");
    return;
  }
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
      var idActual = foco.actual ? foco.actual.atencion_id : "";
      if (idActual !== detalle.id && confirm("Esta atencion no es tu foco actual. Cambiar el foco a esta?")) {
        await enviar("/api/foco/cambiar", { tipo: "atencion", atencion_id: detalle.id });
        await cargarFoco();
      }
      await enviar("/api/entrada/crear", {
        id: detalle.id, tipo: document.getElementById("r-tipo").value,
        texto: document.getElementById("r-texto").value,
        para_jira: document.getElementById("r-jira").checked,
        capturas: capturas, archivos: nuevosArchivos
      });
    }
    limpiarRedactor();
    await recargarDetalle();
  } catch (error) { mostrarError(error); }
}
