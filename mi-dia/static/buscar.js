// Mi dia - buscar.js: buscador global en el header

var _buscarTimer = null;

function onBuscarInput() {
  var q = document.getElementById("buscador-global").value.trim();
  clearTimeout(_buscarTimer);
  if (!q) { cerrarDropdown(); return; }
  _buscarTimer = setTimeout(function () { ejecutarBusqueda(q); }, 300);
}

async function ejecutarBusqueda(q) {
  try {
    var resultados = await leer("/api/buscar?q=" + encodeURIComponent(q));
    pintarDropdown(resultados);
  } catch (_) {
    cerrarDropdown();
  }
}

function pintarDropdown(resultados) {
  var dd = document.getElementById("buscar-dropdown");
  if (!resultados.length) { cerrarDropdown(); return; }
  dd.innerHTML = resultados.map(function (r) {
    var destino = "/" + r.tipo + "/" + encodeURIComponent(r.numero);
    return "<a class=\"dd-item\" href=\"" + destino + "\" onclick=\"cerrarDropdown()\">" +
      "<span class=\"dd-tipo\">" + esc(NOMBRES_TIPO[r.tipo] || r.tipo) + "</span>" +
      "<span class=\"dd-id\">"   + esc(r.tracking_id || r.numero)      + "</span>" +
      "<span class=\"dd-titulo\">" + esc(r.titulo)                     + "</span>" +
      "<span class=\"dd-tc\">"   + esc(r.tracking_code)                + "</span>" +
      "</a>";
  }).join("");
  dd.hidden = false;
}

function cerrarDropdown() {
  var dd = document.getElementById("buscar-dropdown");
  if (dd) dd.hidden = true;
}

document.addEventListener("click", function (e) {
  var zona = document.getElementById("buscar-zona");
  if (zona && !zona.contains(e.target)) cerrarDropdown();
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    cerrarDropdown();
    document.getElementById("buscador-global").blur();
  }
});
