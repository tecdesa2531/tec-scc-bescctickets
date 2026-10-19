// Mi dia - accesos.js: tarjetas de accesos rapidos

function toggleAccesos() {
  var card = document.getElementById("card-accesos");
  card.classList.toggle("card-colapsada");
  try { localStorage.setItem("accesos-colapsado", card.classList.contains("card-colapsada") ? "1" : "0"); } catch (e) {}
}

function pintarAccesos(datos) {
  var contenedor = document.getElementById("accesos");
  var grupos = datos.grupos || [];
  if (!grupos.length) {
    contenedor.innerHTML = '<span class="suave">Sin accesos. Edita accesos.json en la raiz de proceso.</span>';
    return;
  }
  try { if (localStorage.getItem("accesos-colapsado") === "1") document.getElementById("card-accesos").classList.add("card-colapsada"); } catch (e) {}
  contenedor.innerHTML = '<div class="grupos-accesos">' + grupos.map(function (g) {
    var enlaces = (g.enlaces || []).map(function (e) {
      return '<a href="' + esc(e.url) + '" target="_blank" rel="noopener" class="enlace-card">' +
        '<div class="enlace-info">' +
          '<span class="enlace-nombre">' + esc(e.nombre) + '</span>' +
          (e.descripcion ? '<span class="enlace-desc">' + esc(e.descripcion) + '</span>' : '') +
        '</div>' +
      '</a>';
    }).join('');
    return '<div class="grupo-accesos">' +
      '<div class="grupo-encabezado">' + esc(g.nombre) + '</div>' +
      '<div class="enlaces-grupo">' + enlaces + '</div>' +
    '</div>';
  }).join('') + '</div>';
}
