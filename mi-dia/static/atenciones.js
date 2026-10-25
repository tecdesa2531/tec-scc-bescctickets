// Focus Flow - atenciones.js: lista, nueva atencion, proyectos e ideas

// -- Etiquetas y check de la lista
var ETIQUETA_TIPO = { ticket: "TKT", int: "INT", doc: "DOC", con: "CON", npl: "NPL" };
var SVG_CHECK = '<svg class="at-check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

// -- Filtro de la lista
function setFiltro(filtro) {
  filtroAtenciones = filtro;
  pintarAtenciones();
}

function enfocarDesdeLista(evento, id) {
  evento.stopPropagation();
  focoAtencion(id);
}

// -- Colapso de ramas (sin flechas: toda la columna izquierda del padre)
function leerColapsado(id) {
  try { return localStorage.getItem("colapso-" + id) === "1"; } catch (e) { return false; }
}

function alternarColapso(evento, id) {
  evento.stopPropagation();
  try { localStorage.setItem("colapso-" + id, leerColapsado(id) ? "0" : "1"); } catch (e) {}
  pintarAtenciones();
}

function colapsoTeclado(evento, id) {
  if (evento.key === "Enter" || evento.key === " ") { evento.preventDefault(); alternarColapso(evento, id); }
}

function tieneDescendienteFoco(id, idFoco) {
  return atenciones.some(function (h) {
    return h.padre_id === id && (h.id === idFoco || tieneDescendienteFoco(h.id, idFoco));
  });
}

// -- Etiqueta de estado / paso hacia Jira
function badgePaso(paso) {
  var etiquetas = {
    en_curso: "En curso", en_espera: "En espera", reabierto: "Reabierto", descartado: "Descartado",
    limpia: "Por limpiar", revisar: "Por revisar", procede: "Por subir", jira: "En Jira"
  };
  var label = etiquetas[paso] || paso;
  if (paso === "en_curso" || paso === "en_espera" || paso === "reabierto" || paso === "descartado") {
    return '<span class="at-pill at-pill-estado at-mark-' + paso + '">' + esc(label) + "</span>";
  }
  if (paso === "revisar") return '<span class="at-pill at-pill-revisar">' + esc(label) + "</span>";
  if (paso === "procede") return '<span class="at-pill at-pill-subir">' + esc(label) + "</span>";
  if (paso === "jira")    return '<span class="at-pill at-pill-jira">' + SVG_CHECK + esc(label) + "</span>";
  return '<span class="at-pill at-pill-limpiar">' + esc(label) + "</span>";
}

// -- Una fila de la lista
function htmlFila(a, nivel, mapa, idFoco) {
  var tipo      = a.tipo;
  var enFoco    = a.id === idFoco;
  var esCerrada = a.estado === "atendido" || a.estado === "descartado";
  var atenuada  = a.paso === "jira" || a.estado === "descartado";

  var totalHijos = atenciones.filter(function (h) { return h.padre_id === a.id; }).length;
  var tieneHijos = totalHijos > 0;
  var colapsado  = tieneHijos && leerColapsado(a.id);
  var hijoEnFoco = tieneHijos && tieneDescendienteFoco(a.id, idFoco);

  var idTexto = a.tracking_id || (a.temporal ? "Sin Tracking ID" : (a.numero || "Sin ID"));
  var codigo  = a.tracking_code ||
    (nivel > 0 && a.padre_id && mapa[a.padre_id] ? mapa[a.padre_id].tracking_code : "");
  var proj = codigo || (a.temporal ? "Sin proyecto" : "");
  var env = "";
  if ((tipo === "ticket" || tipo === "int") && a.entornos) {
    env = a.entornos.filter(function (x) { return x && x !== "SIN_ENTORNO"; }).join(", ");
  }

  var abrir = a.numero
    ? "abrirDetalleNueva('" + a.tipo + "','" + esc(a.numero) + "')"
    : "abrirAtencion('" + a.id + "')";

  // Circulo con el numero de hijas en la esquina de la etiqueta de tipo
  var badgeHijos = "";
  if (tieneHijos) {
    var clsHijos = "at-hijos";
    if (colapsado && hijoEnFoco) clsHijos += " at-hijos-foco";
    else if (colapsado)          clsHijos += " at-hijos-llena";
    badgeHijos = '<span class="' + clsHijos + '">' + totalHijos + "</span>";
  }
  var tag = '<span class="at-tag at-tag-' + tipo + '">' + esc(ETIQUETA_TIPO[tipo] || tipo) + badgeHijos + "</span>";

  // Columna izquierda: etiqueta de tipo + tiempo. En padres, boton de colapso.
  var toggleAttrs = "";
  if (tieneHijos) {
    var txt = (colapsado ? "Expandir " : "Contraer ") + totalHijos + (totalHijos === 1 ? " hija" : " hijas");
    toggleAttrs = ' role="button" tabindex="0" aria-expanded="' + (!colapsado) +
      '" aria-label="' + esc(txt) +
      '" onclick="alternarColapso(event,\'' + a.id + '\')" onkeydown="colapsoTeclado(event,\'' + a.id + '\')"';
  }
  var toggle = '<div class="at-toggle' + (tieneHijos ? " at-toggle-clic" : "") + '"' + toggleAttrs + ">" +
    tag +
    '<span class="at-tiempo">' + esc(duracion(a.segundos || 0)) + "</span>" +
  "</div>";

  var linea1 = '<span class="at-id">' + esc(idTexto) + "</span>" +
    (proj ? '<span class="at-proj">- ' + esc(proj) + "</span>" : "") +
    (env ? '<span class="at-proj">- ' + esc(env) + "</span>" : "") +
    (a.temporal ? '<span class="at-temporal">Temporal</span>' : "");

  var tituloCls = a.estado === "descartado" ? "at-titulo at-tachado ell" : "at-titulo ell";
  var linea2 = '<span class="' + tituloCls + '" title="' + esc(a.titulo) + '">' + esc(a.titulo) +
    (a.npl_pendiente_cierre ? ' <span class="at-badge-cierre">Pendiente de cerrar</span>' : "") + "</span>";

  var accion = enFoco
    ? '<span class="at-enfoco"><span class="at-enfoco-dot"></span>En foco</span>'
    : (!esCerrada ? '<button class="at-enfocar" onclick="enfocarDesdeLista(event,\'' + a.id + '\')">Enfocar</button>' : "");

  var cls = "at-fila" + (nivel > 0 ? " at-hija" : "") + (enFoco ? " at-en-foco" : "") + (atenuada ? " at-atenuada" : "");
  return '<div class="' + cls + '" onclick="' + abrir + '">' +
    '<div class="at-izq">' +
      toggle +
      '<div class="at-linea1">' + linea1 + "</div>" +
      '<div class="at-linea2">' + linea2 + "</div>" +
    "</div>" +
    '<div class="at-estado">' + badgePaso(a.paso) + "</div>" +
    '<div class="at-accion">' + accion + "</div>" +
  "</div>";
}

// -- Lista de atenciones (con arbol padre-hijo)
function pintarAtenciones() {
  var mapa = {};
  atenciones.forEach(function (a) { mapa[a.id] = a; });
  var idFoco = foco && foco.actual ? foco.actual.atencion_id : "";

  // Contador de "Por revisar"
  var nRev = atenciones.filter(function (a) { return a.paso === "revisar"; }).length;
  var countEl = document.getElementById("filtro-revisar-count");
  if (countEl) {
    countEl.hidden = nRev === 0;
    countEl.textContent = nRev;
  }

  // Estado activo de los botones de filtro
  ["abiertas", "revisar", "todas"].forEach(function (f) {
    var b = document.getElementById("filtro-" + f);
    if (b) b.classList.toggle("activo", filtroAtenciones === f);
  });

  function pasaDirecto(a) {
    if (filtroAtenciones === "todas") return true;
    if (filtroAtenciones === "revisar") return a.paso === "revisar";
    var abierta = a.estado === "en_curso" || a.estado === "en_espera" || a.estado === "reabierto";
    return abierta || a.temporal || (a.estado === "atendido" && a.paso !== "jira");
  }

  function tieneHijoPasando(id) {
    return atenciones.some(function (h) {
      return h.padre_id === id && (pasaDirecto(h) || tieneHijoPasando(h.id));
    });
  }

  function pasa(a) { return pasaDirecto(a) || tieneHijoPasando(a.id); }

  var entradas = [];
  function renderRama(a, nivel) {
    if (!pasa(a)) return;
    entradas.push({ a: a, nivel: nivel });
    if (leerColapsado(a.id)) return;
    atenciones
      .filter(function (h) { return h.padre_id === a.id; })
      .forEach(function (h) { renderRama(h, nivel + 1); });
  }

  var raices = atenciones.filter(function (a) { return !a.padre_id || !mapa[a.padre_id]; });
  raices.forEach(function (a) { renderRama(a, 0); });

  var cont = document.getElementById("lista-atenciones");
  cont.innerHTML = entradas.length
    ? entradas.map(function (e) { return htmlFila(e.a, e.nivel, mapa, idFoco); }).join("")
    : '<p class="suave" style="padding:12px 2px">No hay atenciones para mostrar.</p>';
}

// -- Descendientes de una atencion (para no ofrecerlos como padre y evitar ciclos)
function descendientesDe(id) {
  var res = [];
  atenciones.forEach(function (a) {
    if (a.padre_id === id) {
      res.push(a.id);
      res = res.concat(descendientesDe(a.id));
    }
  });
  return res;
}

// -- Dropdown de padre
function llenarPadres(prefijo, excluir) {
  var sel = document.getElementById(prefijo + "-padre");
  if (!sel) return;
  var fuera = excluir || [];
  if (typeof fuera === "string") fuera = fuera ? [fuera] : [];
  sel.innerHTML = '<option value="">Sin padre</option>' +
    atenciones
      .filter(function (a) { return fuera.indexOf(a.id) === -1; })
      .map(function (a) {
        var label = (a.tracking_id || a.numero || "Sin ID") +
          (a.tracking_code ? " - " + a.tracking_code : "") +
          " - " + a.titulo + " [" + (NOMBRES_ESTADO[a.estado] || a.estado) + "]";
        return '<option value="' + esc(a.id) + '">' + esc(label) + "</option>";
      }).join("");
}

// -- Proyectos
function llenarProyectos(prefijo, valor) {
  var lista = document.getElementById(prefijo + "-proyecto-lista");
  if (lista) {
    lista.innerHTML = proyectos.map(function (p) {
      return '<option value="' + esc(p.codigo) + '">';
    }).join("");
  }
  var input = document.getElementById(prefijo + "-proyecto");
  if (input) input.value = valor || "";
}

function mostrarNuevoCodigo() {}

function leerProyecto(prefijo) {
  return (document.getElementById(prefijo + "-proyecto").value || "").trim().toUpperCase();
}

function leerEntornos(nombre) {
  return Array.from(document.querySelectorAll('input[name="' + nombre + '"]:checked')).map(function (c) { return c.value; });
}

function marcarEntornos(nombre, valores) {
  document.querySelectorAll('input[name="' + nombre + '"]').forEach(function (c) { c.checked = valores.includes(c.value); });
}

function sugerirWorkspace() {
  var tipo = document.getElementById("n-tipo").value;
  if (tipo !== "ticket") return;
  var tid  = (document.getElementById("n-tracking-id").value || "").trim().toUpperCase();
  var proy = leerProyecto("n");
  if (tid && proy) document.getElementById("n-workspace").value = tid + "-" + proy;
}

// -- HU como segmento (compartido alta y edicion)
function marcarHu(prefijo, valor) {
  var hu = valor || "semanal";
  var oculto = document.getElementById(prefijo + "-hu");
  if (oculto) oculto.value = hu;
  document.querySelectorAll("#" + prefijo + "-campo-hu .hu-btn").forEach(function (b) {
    b.classList.toggle("activo", b.getAttribute("data-hu") === hu);
  });
}

function elegirHu(prefijo, valor) { marcarHu(prefijo, valor); }

// -- Nueva atencion (dialogo)
var _nuevaOrigen = null;

function mostrarNueva(titulo, padreId) {
  _nuevaOrigen = document.activeElement;
  document.getElementById("dlg-nueva").hidden = false;
  document.getElementById("n-aviso-idea").hidden   = !ideaEnConversion;
  document.getElementById("n-titulo").value        = titulo || "";
  document.getElementById("n-tracking-id").value   = "";
  document.getElementById("n-url").value           = "";
  document.getElementById("n-workspace").value     = "";
  marcarEntornos("n-entorno", []);
  marcarHu("n", "semanal");
  llenarPadres("n", "");
  document.getElementById("n-padre").value = padreId || "";
  elegirTipoNueva("ticket");   // marca activo + ajusta (sin mover el foco)
  enfocarNueva();
}

function ocultarNueva() {
  document.getElementById("dlg-nueva").hidden = true;
  ideaEnConversion = null;
  if (_nuevaOrigen && _nuevaOrigen.focus) _nuevaOrigen.focus();
  _nuevaOrigen = null;
}

function enfocarNueva() {
  var tipo = document.getElementById("n-tipo").value;
  var id = tipo === "ticket" ? "n-tracking-id" : "n-titulo";
  document.getElementById(id).focus();
}

function elegirTipoNueva(tipo) {
  document.getElementById("n-tipo").value = tipo;
  document.querySelectorAll("#dlg-nueva .tipo-btn").forEach(function (b) {
    b.classList.toggle("activo", b.getAttribute("data-tipo") === tipo);
  });
  ajustarNueva();   // no mueve el foco
}

async function ajustarNueva() {
  var tipo     = document.getElementById("n-tipo").value;
  var esTicket = tipo === "ticket";
  var defecto  = { ticket: "", int: "INFRAS", doc: "DOCINF", con: "" }[tipo];
  llenarProyectos("n", defecto);

  document.getElementById("n-label-id").textContent = esTicket ? "Tracking ID (ServiceNow)" : "Tracking ID";
  document.getElementById("n-tracking-id").hidden   = !esTicket;
  document.getElementById("n-tracking-auto").hidden = esTicket;

  var tienePadre = document.getElementById("n-padre").value !== "";
  document.getElementById("n-bloque").hidden    = tienePadre;
  document.getElementById("n-campo-url").hidden = !esTicket;

  var avisoPadre = document.getElementById("n-aviso-padre");
  avisoPadre.hidden = !tienePadre;
  if (tienePadre) {
    var padre = atenciones.find(function (a) { return a.id === document.getElementById("n-padre").value; });
    var etiqueta = padre ? (padre.tracking_id || padre.numero || "la atencion padre") : "la atencion padre";
    avisoPadre.innerHTML = "Hereda proyecto, entornos y HU de <b>" + esc(etiqueta) + "</b>.";
  }

  var notas = {
    ticket: "Si ya tienes el numero de ServiceNow, ingresalo ahora; si no, lo completas despues.",
    int:    "El Tracking ID de la Iniciativa interna se asigna automaticamente.",
    doc:    "El Tracking ID de la Documentacion se asigna automaticamente. Si la documentacion es de un ticket, registrala en su bitacora.",
    con:    "El Tracking ID de la Consulta o Reunion se asigna automaticamente. El proyecto puedes asignarlo despues."
  };
  document.getElementById("n-nota").textContent = notas[tipo];

  if (!esTicket) {
    try {
      var sig = await leer("/api/atencion/siguiente_numero?tipo=" + encodeURIComponent(tipo));
      document.getElementById("n-tracking-auto").value = sig.tracking_id || "...";
    } catch (e) {
      document.getElementById("n-tracking-auto").value = "...";
    }
  }
  validarNueva();
}

function validarNueva() {
  var tipo      = document.getElementById("n-tipo").value;
  var esTicket  = tipo === "ticket";
  var conPadre  = document.getElementById("n-padre").value !== "";
  var titulo    = document.getElementById("n-titulo").value.trim();
  var proyecto  = leerProyecto("n");
  var tid       = (document.getElementById("n-tracking-id").value || "").trim();
  var entornos  = leerEntornos("n-entorno");

  var tidOk   = esTicket ? tid !== "" : true;
  var projOk  = conPadre || /^[A-Z]{6}$/.test(proyecto);
  var necesitaEnv = (tipo === "ticket" || tipo === "int") && !conPadre;
  var envOk   = !necesitaEnv || entornos.length > 0;
  var envInvalido = !conPadre && entornos.indexOf("DEV") !== -1 && entornos.indexOf("PRO") !== -1 && entornos.indexOf("PRE") === -1;

  var falta = [];
  if (!tidOk)  falta.push("Tracking ID");
  if (!projOk) falta.push("proyecto");
  if (!envOk)  falta.push("entorno");
  var temporal  = falta.length > 0;
  var tituloOk  = titulo !== "";
  var puedeCrear = tituloOk && !envInvalido;

  document.getElementById("n-env-error").hidden = !envInvalido;

  var destino = document.getElementById("n-destino");
  if (temporal) {
    destino.className = "dlg-destino temporal";
    destino.textContent = "Se creara como temporal: falta " + falta.join(", ") + ". Lo completas despues en el detalle.";
  } else {
    destino.className = "dlg-destino ok";
    destino.textContent = "Se creara con sus carpetas definitivas.";
  }

  var btn = document.getElementById("n-crear");
  btn.disabled = !puedeCrear;
  btn.title = !tituloOk ? "Falta el titulo" : (envInvalido ? "Corrige los entornos" : "Crear la atencion");
}

async function crearAtencion() {
  var tipo    = document.getElementById("n-tipo").value;
  var padreId = document.getElementById("n-padre").value;
  var datos = {
    tipo:           tipo,
    titulo:         document.getElementById("n-titulo").value,
    tracking_code:  leerProyecto("n"),
    tracking_id:    tipo === "ticket" ? document.getElementById("n-tracking-id").value : "",
    entornos:       leerEntornos("n-entorno"),
    padre_id:       padreId,
    url_servicenow: document.getElementById("n-url").value,
    workspace_edge: document.getElementById("n-workspace").value
  };
  if (!padreId) datos.hu_tipo = document.getElementById("n-hu").value;
  try {
    var resultado = await enviar("/api/atencion/crear", datos);
    if (ideaEnConversion) {
      await enviar("/api/ideas/estado", { id: ideaEnConversion, estado: "convertida", atencion_id: resultado.id });
    }
    ocultarNueva();
    proyectos = await leer("/api/proyectos");
    await cargarAtenciones();
    await cargarIdeas();
    if (resultado.numero && resultado.tipo) {
      abrirDetalleNueva(resultado.tipo, resultado.numero);
    } else if (resultado.id) {
      abrirAtencion(resultado.id);
    }
  } catch (error) { mostrarError(error); }
}

// -- Ideas
async function cargarIdeas() {
  var datos = await leer("/api/ideas");
  ideas = (datos.ideas || []).filter(function (i) { return i.estado === "pendiente"; });
  pintarIdeas();
}

function pintarIdeas() {
  var contenedor = document.getElementById("ideas");
  if (!ideas.length) {
    ideaBitAbierta = null;
    contenedor.innerHTML = '<span class="suave">No hay ideas pendientes.</span>';
    return;
  }
  var abiertas = atenciones.filter(function (a) {
    return a.estado === "en_curso" || a.estado === "en_espera" || a.estado === "reabierto";
  });
  var idFoco = foco && foco.actual ? foco.actual.atencion_id : "";

  contenedor.innerHTML = ideas.map(function (i) {
    var cuerpo;
    if (ideaBitAbierta === i.id) {
      var opciones = abiertas.map(function (a) {
        var sel = a.id === idFoco ? " selected" : "";
        return '<option value="' + a.id + '"' + sel + ">" +
          esc(nombreAtencion(a)) + (a.id === idFoco ? " (en foco)" : "") + "</option>";
      }).join("");
      var hay = abiertas.length > 0;
      cuerpo = '<div class="idea-bit">' +
          '<label for="idea-destino-' + i.id + '">Agregar a la bitacora de</label>' +
          '<select id="idea-destino-' + i.id + '"' + (hay ? "" : " disabled") + ">" +
            (hay ? opciones : '<option>No hay atenciones abiertas</option>') + "</select>" +
          '<div class="idea-bit-botones">' +
            '<button class="idea-link" onclick="cerrarIdeaBit()">Cancelar</button>' +
            '<button class="idea-agregar"' + (hay ? "" : " disabled") +
              ' onclick="confirmarIdeaBitacora(\'' + i.id + '\')">Agregar</button>' +
          "</div>" +
        "</div>";
    } else {
      cuerpo = '<div class="idea-acciones">' +
          '<button class="idea-btn" onclick="abrirIdeaBit(\'' + i.id + '\')">A bitacora</button>' +
          '<button class="idea-btn" onclick="ideaAAtencion(\'' + i.id + '\')">Nueva atencion</button>' +
          '<button class="idea-link" onclick="descartarIdea(\'' + i.id + '\')">Descartar</button>' +
        "</div>";
    }
    return '<div class="idea-card">' +
        '<span class="idea-texto">' + esc(i.texto) + "</span>" +
        cuerpo +
      "</div>";
  }).join("");
}

function abrirIdeaBit(id) { ideaBitAbierta = id; pintarIdeas(); }
function cerrarIdeaBit() { ideaBitAbierta = null; pintarIdeas(); }

async function confirmarIdeaBitacora(id) {
  var idea = ideas.find(function (i) { return i.id === id; });
  var sel  = document.getElementById("idea-destino-" + id);
  var destino = sel ? sel.value : "";
  if (!destino || !idea) return;
  try {
    await enviar("/api/entrada/crear", { id: destino, tipo: "avance", texto: idea.texto, para_jira: false });
    await enviar("/api/ideas/estado", { id: id, estado: "convertida", atencion_id: destino });
    ideaBitAbierta = null;
    await cargarAtenciones();
    await cargarIdeas();
  } catch (error) { mostrarError(error); }
}

function ideaAAtencion(id) {
  var idea = ideas.find(function (i) { return i.id === id; });
  ideaEnConversion = id;          // antes de abrir, para que se vea el aviso de idea
  mostrarNueva(idea.texto);
}

async function descartarIdea(id) {
  try {
    await enviar("/api/ideas/estado", { id: id, estado: "descartada" });
    await cargarIdeas();
  } catch (error) { mostrarError(error); }
}
