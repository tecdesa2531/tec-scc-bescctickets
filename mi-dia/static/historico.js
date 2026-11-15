// Focus Flow - historico.js: vista de historial de atenciones

var histDatos       = [];   // lista original cargada del servidor
var histFiltrados   = [];   // resultado del filtro de busqueda
var histOrdenCol    = "";   // columna activa de orden
var histOrdenDir    = "";   // "asc" | "desc"
var histGrupoCol    = "";   // columna activa de agrupacion
var histGruposOpen  = {};   // { valorGrupo: true/false }
var histMenuCol     = "";   // columna sobre la que esta abierto el menu flotante

var HIST_ETIQUETAS = {
  tracking_id:   "Tracking ID",
  tracking_code: "Tracking Code",
  titulo:        "Titulo",
  estado:        "Estado",
  entornos:      "Entornos",
  creado:        "Creado",
  creado_mes:    "Mes/Ano",
};
var HIST_SIN_GRUPO   = { tracking_id: true, titulo: true, creado: true };
var HIST_CON_MES     = { creado: true };

// ---------------------------------------------------------------------------
// Apertura y cierre de la vista
// ---------------------------------------------------------------------------

async function abrirHistorico() {
  document.getElementById("vista-inicio").hidden    = true;
  document.getElementById("vista-atencion").hidden  = true;
  document.getElementById("vista-historico").hidden = false;
  document.getElementById("buscar-zona").classList.add("buscar-zona-invisible");
  document.getElementById("hist-buscador").value = "";
  try {
    histDatos = await leer("/api/atenciones");
  } catch (error) {
    mostrarError(error);
    return;
  }
  histFiltrados  = histDatos.slice();
  histOrdenCol   = "creado";
  histOrdenDir   = "desc";
  histGrupoCol   = "";
  histGruposOpen = {};
  histMenuCol    = "";
  _histActualizarGrupoActivo();
  histRenderizar();
}

function cerrarHistorico() {
  document.getElementById("vista-historico").hidden = true;
  document.getElementById("vista-inicio").hidden    = false;
  document.getElementById("buscar-zona").classList.remove("buscar-zona-invisible");
  _histCerrarMenu();
}

// ---------------------------------------------------------------------------
// Filtro de busqueda
// ---------------------------------------------------------------------------

function histFiltrar() {
  var q = (document.getElementById("hist-buscador").value || "").trim().toLowerCase();
  if (!q) {
    histFiltrados = histDatos.slice();
  } else {
    histFiltrados = histDatos.filter(function (a) {
      return (a.tracking_code || "").toLowerCase().indexOf(q) >= 0 ||
             (a.titulo        || "").toLowerCase().indexOf(q) >= 0;
    });
  }
  histRenderizar();
}

// ---------------------------------------------------------------------------
// Ordenamiento
// ---------------------------------------------------------------------------

function histOrdenar(dir) {
  histOrdenCol = histMenuCol;
  histOrdenDir = dir;
  _histCerrarMenu();
  histRenderizar();
}

function _histComparar(a, b, col, dir) {
  var va = _histValor(a, col);
  var vb = _histValor(b, col);
  var r = va < vb ? -1 : va > vb ? 1 : 0;
  return dir === "desc" ? -r : r;
}

function _histValor(item, col) {
  if (col === "entornos")   return (item.entornos || []).join(",");
  if (col === "numero")     return parseInt(item.numero, 10) || 0;
  if (col === "creado")     return (item.creado || item.actualizado || "").toLowerCase();
  if (col === "creado_mes") {
    var m = ((item.creado || item.actualizado || "")).match(/^(\d{4})-(\d{2})/);
    return m ? m[1] + "-" + m[2] : "";  // "2024-11" (ordena bien)
  }
  return (item[col] || "").toString().toLowerCase();
}

// ---------------------------------------------------------------------------
// Agrupacion
// ---------------------------------------------------------------------------

function histAgrupar() {
  histGrupoCol   = histMenuCol;
  histGruposOpen = {};
  _histCerrarMenu();
  _histActualizarGrupoActivo();
  histRenderizar();
}

function histAgruparMes() {
  histGrupoCol   = "creado_mes";
  histGruposOpen = {};
  _histCerrarMenu();
  _histActualizarGrupoActivo();
  histRenderizar();
}

function histQuitarGrupo() {
  histGrupoCol   = "";
  histGruposOpen = {};
  _histActualizarGrupoActivo();
  histRenderizar();
}

function histToggleGrupo(valor) {
  histGruposOpen[valor] = !histGruposOpen[valor];
  histRenderizar();
}

function _histActualizarGrupoActivo() {
  var el    = document.getElementById("hist-grupo-activo");
  var label = document.getElementById("hist-grupo-label");
  if (histGrupoCol) {
    label.textContent = HIST_ETIQUETAS[histGrupoCol] || histGrupoCol;
    el.hidden = false;
  } else {
    el.hidden = true;
  }
}

// ---------------------------------------------------------------------------
// Renderizado
// ---------------------------------------------------------------------------

function histRenderizar() {
  var tbody  = document.getElementById("hist-tbody");
  var vacio  = document.getElementById("hist-vacio");
  var filas  = histFiltrados.slice();

  // Ordenar
  if (histOrdenCol) {
    filas.sort(function (a, b) { return _histComparar(a, b, histOrdenCol, histOrdenDir); });
  }

  // Marcar cabecera activa
  document.querySelectorAll(".hist-th").forEach(function (th) {
    th.classList.toggle("hist-th-activa", th.getAttribute("data-col") === histOrdenCol);
  });

  if (!filas.length) {
    tbody.innerHTML = "";
    vacio.hidden = false;
    return;
  }
  vacio.hidden = true;

  var html = "";

  if (histGrupoCol) {
    // Construir grupos en orden de aparicion segun el sort actual
    var grupos = [];
    var visto  = {};
    filas.forEach(function (a) {
      var k = _histValor(a, histGrupoCol);
      if (!visto[k]) { visto[k] = true; grupos.push(k); }
    });

    grupos.forEach(function (k) {
      var items = filas.filter(function (a) { return _histValor(a, histGrupoCol) === k; });
      var abierto = histGruposOpen[k] === true;  // por defecto colapsado
      var cls = abierto ? "" : " hist-grupo-colapsado";
      var etiqueta = histGrupoCol === "creado_mes" ? _histEtiquetaMes(k) : (k || "(sin valor)");
      html += "<tr class=\"hist-grupo-fila" + cls + "\" data-k=\"" + _histEscape(k) + "\" onclick=\"histToggleGrupo(this.getAttribute('data-k'))\">";
      html += "<td colspan=\"6\">";
      html += "<i class=\"hist-grupo-flecha\">&#9660;</i>";
      html += _histEscape(etiqueta);
      html += "<span class=\"hist-grupo-count\">(" + items.length + ")</span>";
      html += "</td></tr>";
      if (abierto) {
        _histOrdenarArbol(items).forEach(function (e) { html += _histFila(e.item, e.nivel); });
      }
    });
  } else {
    _histOrdenarArbol(filas).forEach(function (e) { html += _histFila(e.item, e.nivel); });
  }

  tbody.innerHTML = html;
}

function _histOrdenarArbol(filas) {
  var mapa    = {};
  var vistas  = {};
  var result  = [];
  filas.forEach(function (a) { mapa[a.id] = a; });
  filas.forEach(function (a) {
    if (vistas[a.id]) return;
    if (a.padre_id && mapa[a.padre_id]) return;  // hija: se agrega con su padre
    vistas[a.id] = true;
    result.push({ item: a, nivel: 0 });
    filas.forEach(function (h) {
      if (h.padre_id === a.id) {
        vistas[h.id] = true;
        result.push({ item: h, nivel: 1 });
      }
    });
  });
  return result;
}

function _histFila(a, nivel) {
  var estadoCls = "hist-estado hist-estado-" + (a.estado || "");
  var estadoTxt = _histEtiquetaEstado(a.estado);
  var entornos  = (a.entornos || []).join(", ");
  var fecha     = _histFecha(a.creado || a.actualizado);
  var tid       = a.tracking_id || "";
  var tcode     = a.tracking_code || "";
  var titulo    = a.titulo || "";

  var clsFila = nivel > 0 ? " class=\"hist-fila-hija\"" : "";
  var href = (a.numero && a.tipo) ? "/" + a.tipo + "/" + _histEscape(a.numero) : "#";
  var html = "<tr" + clsFila + ">";
  html += "<td class=\"hist-td\">";
  if (tid) {
    html += "<a class=\"hist-link\" href=\"" + href + "\" data-id=\"" + _histEscape(a.id) + "\" onclick=\"if(!event.ctrlKey){event.preventDefault();_histAbrirAtencion(this.getAttribute('data-id'))}\">" + _histEscape(tid) + "</a>";
  }
  html += "</td>";
  html += "<td class=\"hist-td\"><span class=\"hist-mono\">" + _histEscape(tcode) + "</span></td>";
  html += "<td class=\"hist-td hist-td-titulo\">" + _histEscape(titulo) + "</td>";
  html += "<td class=\"hist-td\"><span class=\"" + estadoCls + "\">" + _histEscape(estadoTxt) + "</span></td>";
  html += "<td class=\"hist-td\">" + _histEscape(entornos) + "</td>";
  html += "<td class=\"hist-td\">" + _histEscape(fecha) + "</td>";
  html += "</tr>";
  return html;
}

async function _histAbrirAtencion(id) {
  cerrarHistorico();
  await abrirAtencion(id);
}

function _histEtiquetaEstado(e) {
  var map = {
    en_curso:   "En curso",
    en_espera:  "En espera",
    atendido:   "Atendido",
    reabierto:  "Reabierto",
    descartado: "Descartado",
  };
  return map[e] || (e || "");
}

function _histFecha(iso) {
  if (!iso) return "";
  var m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return m[3] + "/" + m[2] + "/" + m[1];
}

function _histEtiquetaMes(k) {
  if (!k) return "(sin fecha)";
  var m = k.match(/^(\d{4})-(\d{2})$/);
  if (!m) return k;
  var MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
               "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  var nombre = MESES[parseInt(m[2], 10) - 1] || m[2];
  return nombre + " " + m[1];
}

function _histEscape(txt) {
  return String(txt)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Menu flotante de columna
// ---------------------------------------------------------------------------

function histMenuAbrir(evento, col) {
  evento.stopPropagation();
  var menu = document.getElementById("hist-menu");
  if (!menu.hidden && histMenuCol === col) {
    _histCerrarMenu();
    return;
  }
  histMenuCol = col;
  var btn  = evento.currentTarget;
  var rect = btn.getBoundingClientRect();
  menu.style.top  = (rect.bottom + 4 + window.scrollY) + "px";
  menu.style.left = Math.min(rect.left, window.innerWidth - 210) + "px";
  var puedeAgrupar    = !HIST_SIN_GRUPO[col];
  var puedeAgruparMes = !!HIST_CON_MES[col];
  document.getElementById("hist-menu-sep").hidden          = !puedeAgrupar && !puedeAgruparMes;
  document.getElementById("hist-menu-agrupar").hidden      = !puedeAgrupar;
  document.getElementById("hist-menu-agrupar-mes").hidden  = !puedeAgruparMes;
  menu.hidden = false;
}

function _histCerrarMenu() {
  document.getElementById("hist-menu").hidden = true;
  histMenuCol = "";
}

document.addEventListener("click", function (e) {
  var menu = document.getElementById("hist-menu");
  if (!menu.hidden && !menu.contains(e.target)) {
    _histCerrarMenu();
  }
});
