// Focus Flow - foco.js: foco activo y resumen del dia

async function cargarFoco() {
  foco = await leer("/api/foco");
  pintarFoco();
}

function pintarFoco() {
  var cabecera = document.getElementById("foco-actual");
  if (foco.actual) {
    var idFoco = foco.actual.atencion_id;
    cabecera.innerHTML = "<b>" + esc(foco.actual.etiqueta) + "</b> (" + duracion(segundosDesde(foco.actual.inicio)) + ")";
    if (idFoco) {
      cabecera.className = "foco-label foco-clic";
      cabecera.onclick = function() { abrirAtencion(idFoco); };
    } else {
      cabecera.className = "foco-label";
      cabecera.onclick = null;
    }
  } else {
    cabecera.className = "foco-label";
    cabecera.onclick = null;
    cabecera.textContent = "Sin foco";
  }

  var aviso = document.getElementById("aviso-anterior");
  if (foco.anterior_abierto) {
    aviso.hidden = false;
    document.getElementById("anterior-etiqueta").textContent = foco.anterior_abierto.etiqueta;
    document.getElementById("anterior-inicio").textContent  = foco.anterior_abierto.inicio;
  } else {
    aviso.hidden = true;
  }

  var resumen = document.getElementById("resumen-dia");
  if (!foco.hoy.length) {
    resumen.innerHTML = '<p class="suave">Hoy aun no hay tramos de foco.</p>';
  } else {
    resumen.innerHTML =
      "<table><tr><th>En que</th><th>Tiempo</th></tr>" +
      foco.totales.map(function (t) {
        return "<tr><td>" + esc(t.etiqueta) + "</td><td>" + duracion(t.segundos) + "</td></tr>";
      }).join("") +
      "</table><br><table><tr><th>Inicio</th><th>Fin</th><th>En que</th><th>Tiempo</th></tr>" +
      foco.hoy.map(function (t) {
        return "<tr><td>" + esc(t.inicio.slice(11, 16)) + "</td><td>" +
          esc(t.fin ? t.fin.slice(11, 16) : "en curso") + "</td><td>" +
          esc(t.etiqueta) + "</td><td>" + duracion(t.segundos) + "</td></tr>";
      }).join("") +
      "</table>";
  }
  var btn = document.getElementById("btn-pausa");
  if (btn) {
    var enPausa = foco.actual && foco.actual.tipo === "pausa";
    var hayUltimaAtencion = foco.hoy.some(function (t) { return !!t.atencion_id; });
    btn.classList.toggle("activo", !!enPausa);
    if (enPausa && hayUltimaAtencion) {
      btn.title   = "Reanudar";
      btn.onclick = focoReanudar;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><polygon points="3,2 12,7 3,12"/></svg>';
    } else {
      btn.title   = "Pausa";
      btn.onclick = focoPausa;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="2" width="4" height="10" rx="1"/><rect x="8" y="2" width="4" height="10" rx="1"/></svg>';
    }
  }

  pintarChips();
  pintarAtenciones();
}

function pintarChips() {
  var contenedor = document.getElementById("foco-chips");
  var abiertas = atenciones.filter(function (a) { return a.estado === "en_curso" || a.estado === "en_espera" || a.estado === "reabierto"; });
  var idActual = foco.actual ? foco.actual.atencion_id : "";

  if (!abiertas.length) {
    contenedor.style.gridTemplateColumns = "";
    contenedor.innerHTML = '<span class="suave">No hay atenciones en curso.</span>';
    return;
  }

  abiertas.sort(function (a, b) { return (a.numero || "").localeCompare(b.numero || ""); });

  var tipos = ["ticket", "int", "doc", "con"].filter(function (tipo) {
    return abiertas.some(function (a) { return a.tipo === tipo; });
  });

  contenedor.style.gridTemplateColumns = "repeat(" + tipos.length + ", 1fr)";
  contenedor.innerHTML = tipos.map(function (tipo) {
    var items = abiertas.filter(function (a) { return a.tipo === tipo; });
    return '<div class="foco-col">' +
      '<span class="foco-col-tipo">' + esc(NOMBRES_TIPO[tipo]) + '</span>' +
      items.map(function (a) {
        return '<button class="chip' + (a.id === idActual ? " activo" : "") +
          '" title="' + esc(nombreAtencion(a)) +
          '" onclick="focoAtencion(\'' + a.id + '\')">' +
          esc(nombreAtencion(a)) + '</button>';
      }).join("") +
      '</div>';
  }).join("");
}

async function cambiarFoco(datos) {
  try {
    var resultado = await enviar("/api/foco/cambiar", datos);
    await cargarAtenciones();
    await cargarFoco();
    await cargarIdeas();
    return resultado;
  } catch (error) { mostrarError(error); return null; }
}

function focoAtencion(id)   { return cambiarFoco({ tipo: "atencion", atencion_id: id }); }
function focoPausa()        { return cambiarFoco({ tipo: "pausa" }); }

function focoReanudar() {
  var ultimo = null;
  for (var i = foco.hoy.length - 1; i >= 0; i--) {
    if (foco.hoy[i].atencion_id) { ultimo = foco.hoy[i].atencion_id; break; }
  }
  if (ultimo) focoAtencion(ultimo);
}

function focoIdea() {
  var texto = prompt("Que idea te vino a la mente?");
  if (texto && texto.trim()) cambiarFoco({ tipo: "idea", texto: texto });
}

async function focoReunion() {
  var titulo = prompt("Titulo de la reunion (el proyecto lo asignas al terminar)");
  if (!titulo || !titulo.trim()) return;
  var resultado = await cambiarFoco({ tipo: "reunion", texto: titulo });
  if (resultado && resultado.atencion_id) {
    if (resultado.numero && resultado.tipo) {
      abrirDetalleNueva(resultado.tipo, resultado.numero);
    } else if (resultado.atencion_id) {
      abrirAtencion(resultado.atencion_id);
    }
  }
}

async function terminarDia() {
  if (!confirm("Terminar el dia y cerrar el foco actual?")) return;
  try { await enviar("/api/foco/terminar_dia"); await cargarFoco(); }
  catch (error) { mostrarError(error); }
}

async function cerrarAnterior() {
  try {
    await enviar("/api/foco/cerrar_anterior", { hora: document.getElementById("anterior-hora").value });
    await cargarFoco();
  } catch (error) { mostrarError(error); }
}
