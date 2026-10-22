// Focus Flow - atenciones.js: lista, nueva atencion, proyectos e ideas

// -- Copia de ID-proyecto al portapapeles
function copiarIdProyecto(evento, texto) {
  evento.stopPropagation();
  navigator.clipboard.writeText(texto).then(function () {
    var tip = document.createElement("div");
    tip.textContent = "Copiado";
    tip.className = "tip-copiado";
    tip.style.left = (evento.clientX + 12) + "px";
    tip.style.top  = (evento.clientY - 10) + "px";
    document.body.appendChild(tip);
    setTimeout(function () { tip.classList.add("tip-copiado-salir"); }, 600);
    setTimeout(function () { tip.remove(); }, 900);
  });
}

// -- Colapso de ramas en la lista
function leerColapsado(id) {
  try { return localStorage.getItem("colapso-" + id) === "1"; } catch (e) { return false; }
}

function toggleColapso(evento, id) {
  evento.stopPropagation();
  try { localStorage.setItem("colapso-" + id, leerColapsado(id) ? "0" : "1"); } catch (e) {}
  var sy = window.scrollY;
  pintarAtenciones();
  window.scrollTo(0, sy);
}

// -- Lista de atenciones (con arbol padre-hijo)
function pintarAtenciones() {
  var texto  = document.getElementById("buscar").value.trim().toLowerCase();
  var filtro = document.getElementById("filtro").value;
  var mapa   = {};
  atenciones.forEach(function (a) { mapa[a.id] = a; });

  function pasaDirecto(a) {
    if (filtro === "abiertas" && !(a.estado === "en_curso" || a.estado === "en_espera" || a.estado === "reabierto" || a.temporal || a.pendientes > 0)) return false;
    if (!texto) return true;
    return (a.numero + " " + a.tracking_id + " " + a.tracking_code + " " + a.titulo).toLowerCase().includes(texto);
  }

  function tieneHijoPasando(id) {
    return atenciones.some(function (h) {
      return h.padre_id === id && (pasaDirecto(h) || tieneHijoPasando(h.id));
    });
  }

  function pasa(a) { return pasaDirecto(a) || tieneHijoPasando(a.id); }

  var idFoco = foco && foco.actual ? foco.actual.atencion_id : "";
  var filas  = [];

  function tieneDescendienteFoco(id) {
    return atenciones.some(function (h) {
      return h.padre_id === id && (h.id === idFoco || tieneDescendienteFoco(h.id));
    });
  }

  function htmlFila(a, nivel, mostrarBorde) {
    var accion = a.numero
      ? 'onclick="abrirDetalleNueva(\'' + a.tipo + '\',\'' + esc(a.numero) + '\')"'
      : 'onclick="abrirAtencion(\'' + a.id + '\')"';
    var esCerrada = a.estado === "atendido" || a.estado === "descartado";
    var clases = "clic" + (a.id === idFoco ? " en-foco" : "") + (esCerrada ? " atendida" : "") + (mostrarBorde ? "" : " sin-borde");
    var idTexto = esc(a.tracking_id || a.numero || "Sin ID");
    var totalHijos = atenciones.filter(function (h) { return h.padre_id === a.id; }).length;
    var hijoEnFoco = totalHijos > 0 && tieneDescendienteFoco(a.id);
    var dotHijos = totalHijos > 0
      ? '<span class="dot-hijos' + (hijoEnFoco ? " dot-hijos-foco" : "") + '" title="' + totalHijos + (totalHijos === 1 ? " hijo" : " hijos") + '">' + totalHijos + "</span>"
      : "";
    var idCeldaAttr, proyCeldaAttr;
    if (nivel > 0) {
      var idTextoRaw = a.tracking_id || a.numero || "";
      var codigoHijo = a.tracking_code || (a.padre_id && mapa[a.padre_id] ? mapa[a.padre_id].tracking_code : "") || "";
      var combinado = idTextoRaw && codigoHijo ? idTextoRaw + "-" + codigoHijo : idTextoRaw || codigoHijo || "";
      idCeldaAttr = combinado
        ? ' onclick="copiarIdProyecto(event,\'' + esc(combinado) + '\')" style="text-align:right;cursor:pointer"'
        : ' style="text-align:right"';
      proyCeldaAttr = combinado
        ? ' onclick="copiarIdProyecto(event,\'' + esc(combinado) + '\')" style="cursor:pointer"'
        : "";
    } else {
      var idCeldaClick = totalHijos > 0 ? ' onclick="toggleColapso(event,\'' + a.id + '\')"' : "";
      var idCeldaCursor = totalHijos > 0 ? "cursor:pointer" : "";
      idCeldaAttr = ' style="' + idCeldaCursor + '"' + idCeldaClick;
      var combinadoPadre = (a.tracking_id || a.numero) && a.tracking_code
        ? (a.tracking_id || a.numero) + "-" + a.tracking_code
        : a.tracking_code || "";
      proyCeldaAttr = combinadoPadre
        ? ' onclick="copiarIdProyecto(event,\'' + esc(combinadoPadre) + '\')" style="cursor:pointer"'
        : "";
    }
    var codigoMostrar = nivel > 0
      ? (a.tracking_code || (a.padre_id && mapa[a.padre_id] ? mapa[a.padre_id].tracking_code : "") || "")
      : (a.tracking_code || "");
    return '<tr class="' + clases + '" ' + accion + '>' +
      "<td" + idCeldaAttr + ">" + dotHijos + (dotHijos ? " " : "") + idTexto + "</td>" +
      "<td" + proyCeldaAttr + ">" + esc(codigoMostrar) + "</td>" +
      '<td title="' + esc(a.titulo) + '">' + esc(a.titulo) + "</td>" +
      "<td>" + (a.segundos ? duracion(a.segundos) : "") + "</td>" +
      "<td>" + (a.pendientes || "") + "</td>" +
      "<td>" + esc(a.actualizado) + "</td></tr>";
  }

  var entradas = [];

  function renderRama(a, nivel) {
    if (!pasa(a)) return;
    entradas.push({ a: a, nivel: nivel });
    if (!leerColapsado(a.id)) {
      atenciones
        .filter(function (h) { return h.padre_id === a.id; })
        .forEach(function (h) { renderRama(h, nivel + 1); });
    }
  }

  var raices = atenciones.filter(function (a) { return !a.padre_id || !mapa[a.padre_id]; });
  raices.forEach(function (a) { renderRama(a, 0); });

  var filas = entradas.map(function (e, i) {
    var siguiente = entradas[i + 1];
    var mostrarBorde = !siguiente || siguiente.nivel === 0;
    return htmlFila(e.a, e.nivel, mostrarBorde);
  });

  var cuerpo = document.getElementById("lista-atenciones");
  cuerpo.innerHTML = filas.length
    ? filas.join("")
    : '<tr><td colspan="6" class="suave">No hay atenciones para mostrar.</td></tr>';
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

// -- Nueva atencion
function mostrarNueva(titulo, padreId) {
  document.getElementById("form-nueva").hidden = false;
  document.getElementById("n-titulo").value        = titulo || "";
  document.getElementById("n-tracking-id").value   = "";
  document.getElementById("n-url").value           = "";
  document.getElementById("n-workspace").value     = "";
  document.getElementById("n-numero-preview").value = "...";
  marcarEntornos("n-entorno", []);
  llenarPadres("n", "");
  document.getElementById("n-padre").value = padreId || "";
  ajustarNueva();
  document.getElementById("n-titulo").focus();
}

function ocultarNueva() {
  document.getElementById("form-nueva").hidden = true;
  ideaEnConversion = null;
}

async function ajustarNueva() {
  var tipo    = document.getElementById("n-tipo").value;
  var defecto = { ticket: "", int: "INFRAS", doc: "DOCINF", con: "" }[tipo];
  llenarProyectos("n", defecto);
  var esTicket = tipo === "ticket";
  document.getElementById("n-label-numero").textContent = esTicket ? "Numero ServiceNow" : "Numero interno";
  document.getElementById("n-numero-preview").hidden    = esTicket;
  document.getElementById("n-tracking-id").hidden       = !esTicket;
  var tienePadre = document.getElementById("n-padre").value !== "";
  document.getElementById("n-campo-hu").hidden       = tienePadre;
  document.getElementById("n-campo-proyecto").hidden = tienePadre;
  document.getElementById("n-campo-entornos").hidden = tienePadre;
  document.getElementById("n-campo-url").hidden      = tipo !== "ticket";
  var notas = {
    ticket: "El numero interno se asigna al crear. Si ya tienes el numero de ServiceNow puedes ingresarlo ahora; si no, lo completas despues.",
    int:    "El numero de Iniciativa interna se asigna automaticamente.",
    doc:    "El numero de Documentacion se asigna automaticamente. Si la documentacion es de un ticket, registrala en su bitacora.",
    con:    "El numero de Consulta o Reunion se asigna automaticamente. El proyecto puedes asignarlo despues."
  };
  document.getElementById("n-nota").textContent = notas[tipo];
  try {
    var sig = await leer("/api/atencion/siguiente_numero?tipo=" + encodeURIComponent(tipo));
    document.getElementById("n-numero-preview").value = sig.numero;
  } catch (e) {
    document.getElementById("n-numero-preview").value = "...";
  }
}

async function crearAtencion() {
  var tipo    = document.getElementById("n-tipo").value;
  var padreId = document.getElementById("n-padre").value;
  var datos = {
    tipo:           tipo,
    titulo:         document.getElementById("n-titulo").value,
    tracking_code:  leerProyecto("n"),
    tracking_id:    document.getElementById("n-tracking-id").value,
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
  var contenedor = document.getElementById("ideas");
  if (!ideas.length) {
    contenedor.innerHTML = '<span class="suave">No hay ideas pendientes.</span>';
    return;
  }
  var opciones = atenciones
    .filter(function (a) { return a.estado === "en_curso" || a.estado === "en_espera" || a.estado === "reabierto"; })
    .map(function (a) { return '<option value="' + a.id + '">' + esc(nombreAtencion(a)) + "</option>"; })
    .join("");
  contenedor.innerHTML = '<table><tr><th>Fecha</th><th>Idea</th><th>Que hacer</th></tr>' +
    ideas.map(function (i) {
      return "<tr><td>" + esc(i.fecha) + "</td><td>" + esc(i.texto) + "</td><td>" +
        '<select id="idea-destino-' + i.id + '">' + opciones + "</select> " +
        '<button onclick="ideaABitacora(\'' + i.id + '\')">Agregar a bitacora</button> ' +
        '<button onclick="ideaAAtencion(\'' + i.id + '\')">Crear atencion</button> ' +
        '<button onclick="ideaDescartar(\'' + i.id + '\')">Descartar</button></td></tr>';
    }).join("") + "</table>";
}

async function ideaABitacora(id) {
  var idea    = ideas.find(function (i) { return i.id === id; });
  var destino = document.getElementById("idea-destino-" + id).value;
  if (!destino) { alert("No hay atenciones en curso para elegir."); return; }
  var mapa = {};
  atenciones.forEach(function (a) { mapa[a.id] = a; });
  var atencionDestino = mapa[destino];
  if (atencionDestino && atencionDestino.estado === "atendido") {
    alert("Esta atencion esta atendida. Cambia el estado a Reabierto para poder agregar mas entradas.");
    return;
  }
  try {
    await enviar("/api/entrada/crear", { id: destino, tipo: "avance", texto: idea.texto, para_jira: false });
    await enviar("/api/ideas/estado", { id: id, estado: "convertida", atencion_id: destino });
    await cargarAtenciones();
    await cargarIdeas();
  } catch (error) { mostrarError(error); }
}

function ideaAAtencion(id) {
  var idea = ideas.find(function (i) { return i.id === id; });
  mostrarNueva(idea.texto);
  ideaEnConversion = id;
  document.getElementById("form-nueva").scrollIntoView();
}

async function ideaDescartar(id) {
  if (!confirm("Descartar esta idea?")) return;
  try { await enviar("/api/ideas/estado", { id: id, estado: "descartada" }); await cargarIdeas(); }
  catch (error) { mostrarError(error); }
}
