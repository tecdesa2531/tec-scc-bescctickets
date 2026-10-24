// Focus Flow - accesos.js: tarjetas de accesos rapidos

// Color del icono por grupo, segun el orden en accesos.json
var PALETA_GRUPOS = ["#2F62D6", "#6127C9", "#B45309", "#0B6B62", "#A3154C", "#4B4760"];

var SVG_CHEVRON = '<svg class="acceso-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
var SVG_FLECHA  = '<svg class="acceso-flecha" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M8 7h9v9"/></svg>';

var _accesosDatos = { grupos: [] };

function colapsadoGrupo(nombre) {
  try { return localStorage.getItem("acceso-grupo-" + nombre) === "1"; } catch (e) { return false; }
}

function alternarGrupo(nombre) {
  try { localStorage.setItem("acceso-grupo-" + nombre, colapsadoGrupo(nombre) ? "0" : "1"); } catch (e) {}
  pintarAccesos(_accesosDatos);
}

function pintarAccesos(datos) {
  _accesosDatos = datos || _accesosDatos;
  var grupos = _accesosDatos.grupos || [];
  var contenedor = document.getElementById("accesos");
  if (!grupos.length) {
    contenedor.innerHTML = '<span class="suave">Sin accesos. Edita accesos.json en la raiz de proceso.</span>';
    return;
  }
  contenedor.innerHTML = grupos.map(function (g, gi) {
    var color   = PALETA_GRUPOS[gi % PALETA_GRUPOS.length];
    var abierto = !colapsadoGrupo(g.nombre);
    var enlaces = (g.enlaces || []).map(function (e) {
      var inicial = esc((e.nombre || "?").slice(0, 1).toUpperCase());
      return '<a class="acceso-card" href="' + esc(e.url) + '" target="_blank" rel="noopener">' +
          '<span class="acceso-icono" style="background:' + color + '">' + inicial + "</span>" +
          '<span class="acceso-texto">' +
            '<span class="acceso-nombre">' + esc(e.nombre) + "</span>" +
            (e.descripcion ? '<span class="acceso-desc">' + esc(e.descripcion) + "</span>" : "") +
          "</span>" +
          SVG_FLECHA +
        "</a>";
    }).join("");
    return '<div class="acceso-grupo">' +
        '<button type="button" class="acceso-encabezado' + (abierto ? " abierto" : "") +
          '" aria-expanded="' + abierto + '" onclick="alternarGrupo(\'' + esc(g.nombre) + '\')">' +
          SVG_CHEVRON + esc(g.nombre) +
        "</button>" +
        (abierto ? '<div class="acceso-enlaces">' + enlaces + "</div>" : "") +
      "</div>";
  }).join("");
}
