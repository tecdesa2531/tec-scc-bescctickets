// Focus Flow - buscar.js: buscador global en el header

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
    return "<a class=\"dd-item\" href=\"" + destino + "\" data-titulo=\"" + esc(r.titulo) + "\" onclick=\"cerrarDropdown()\">" +
      "<span class=\"dd-id\">"   + esc(r.tracking_id || "Sin Tracking ID")      + "</span>" +
      "<span class=\"dd-titulo\">" + esc(r.titulo) + "</span>" +
      "<span class=\"dd-tc\">"   + esc(r.tracking_code)                + "</span>" +
      "</a>";
  }).join("");
  dd.hidden = false;
}

function cerrarDropdown() {
  var dd = document.getElementById("buscar-dropdown");
  if (dd) dd.hidden = true;
  ocultarTooltipBuscar();
}

// -- Tooltip propio con el titulo completo (estilo de la app)
function tooltipBuscar() {
  var t = document.getElementById("dd-tooltip");
  if (!t) {
    t = document.createElement("div");
    t.id = "dd-tooltip";
    t.className = "dd-tooltip";
    t.hidden = true;
    document.body.appendChild(t);
  }
  return t;
}

function ocultarTooltipBuscar() {
  var t = document.getElementById("dd-tooltip");
  if (t) t.hidden = true;
}

function mostrarTooltipBuscar(item) {
  var texto = item.getAttribute("data-titulo") || "";
  if (!texto) { ocultarTooltipBuscar(); return; }
  var t = tooltipBuscar();
  t.textContent = texto;
  t.hidden = false;
  var r = item.getBoundingClientRect();
  var top = r.top - t.offsetHeight - 8;
  if (top < 8) top = r.bottom + 8;
  var left = Math.min(r.left, window.innerWidth - t.offsetWidth - 8);
  t.style.left = Math.max(8, left) + "px";
  t.style.top  = top + "px";
}

document.addEventListener("click", function (e) {
  var zona = document.getElementById("buscar-zona");
  if (zona && !zona.contains(e.target)) cerrarDropdown();
});

(function () {
  var dd = document.getElementById("buscar-dropdown");
  if (!dd) return;
  dd.addEventListener("mouseover", function (e) {
    var item = e.target.closest(".dd-item");
    if (item) mostrarTooltipBuscar(item);
  });
  dd.addEventListener("mouseout", function (e) {
    var item = e.target.closest(".dd-item");
    if (item && (!e.relatedTarget || !item.contains(e.relatedTarget))) ocultarTooltipBuscar();
  });
})();

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    cerrarDropdown();
    document.getElementById("buscador-global").blur();
  }
});
