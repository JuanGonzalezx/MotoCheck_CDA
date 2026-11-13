// Panel web de MotoCheck Lab. Habla con el puente por REST (/api) y Socket.IO.
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const num = (v, d = 0) => (Number.isFinite(v) ? v.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d }) : "—");
const fecha = (f) => new Date(f).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
const hoyISO = () => new Date().toISOString().slice(0, 10);

const ICONOS = {
  luz: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  temp: '<svg viewBox="0 0 24 24"><path d="M14 14.8V5a2 2 0 10-4 0v9.8a4 4 0 104 0z"/><path d="M12 9v7"/></svg>',
  gas: '<svg viewBox="0 0 24 24"><path d="M3 8h11a3 3 0 10-3-3M3 12h15a3 3 0 11-3 3M3 16h7"/></svg>',
  rpm: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 3v7M12 14v7M3 12h7M14 12h7"/></svg>',
};
const ESTACIONES = [
  { tipo: "luz", nombre: "Faro", sensor: "Fotocelda LDR" },
  { tipo: "temp", nombre: "Temperatura", sensor: "DS18B20" },
  { tipo: "gas", nombre: "Gases", sensor: "MQ-2" },
  { tipo: "rpm", nombre: "Rueda", sensor: "Hall + rodillo" },
];
const FASES = {
  CALENTANDO: "Calentando sensor de gases", ESPERA: "Lista para inspeccionar", AVANZANDO: "Banda avanzando",
  DESPLEGANDO: "Desplegando brazo", MIDIENDO: "Midiendo", RETIRANDO: "Retirando brazo",
  SALIENDO: "Moto saliendo", FIN: "Inspección terminada", ERROR: "Error en la línea",
};
const EN_PROCESO = ["AVANZANDO", "DESPLEGANDO", "MIDIENDO", "RETIRANDO", "SALIENDO"];
const VISTAS = {
  vivo: { grupo: "Operación", titulo: "Inspección en vivo", descripcion: "Registra la placa, inicia la línea y sigue cada estación en tiempo real." },
  historial: { grupo: "Operación", titulo: "Historial", descripcion: "Consulta las inspecciones guardadas, abre su reporte y descarga los datos para el artículo." },
  estadisticas: { grupo: "Análisis", titulo: "Estadísticas", descripcion: "Tasa de aprobación, tiempo de ciclo y repetibilidad de cada prueba (media, desviación y CV)." },
  config: { grupo: "Configuración", titulo: "Umbrales y sensores", descripcion: "Ajusta los criterios de cada prueba, los ángulos de los servos y la velocidad de los motores." },
};
const ETIQUETAS_CFG = {
  luz_min: "Faro: contraste mínimo (mV)", temp_min: "Temperatura mínima (°C)", temp_max: "Temperatura máxima (°C)",
  gas_max: "Gases: relación máxima (× base)", rpm_min: "Rueda: RPM mínimas", rpm_max: "Rueda: RPM máximas",
  cv_max: "Rueda: CV máximo (%)", pwm_banda: "PWM de la banda (0–255)", pwm_rodillo: "PWM del rodillo (0–255)",
  servo_reposo: "Servo: ángulo de reposo (°)", servo_medida: "Servo: ángulo de medida (°)", timeout: "Tiempo máximo por estación (ms)",
};
const FALLAS = { faro: "Faro débil", temp: "Motor recalentado", gas: "Gases altos", rueda: "Rueda frenada", atasco: "Atasco en la banda (E3)" };

let estado = null;
let estaciones = [];

// ---------- utilidades ----------
function describirPrueba(p, cfg = {}) {
  switch (p.tipo) {
    case "luz": return { valor: `${num(p.valor - p.base)} mV`, criterio: `Contraste ≥ ${num(p.min)} mV · ambiente ${num(p.base)} mV` };
    case "temp": return { valor: p.valor <= -999 ? "Sin sensor" : `${num(p.valor, 1)} °C`, criterio: `Entre ${num(p.min)} y ${num(p.max)} °C` };
    case "gas": return { valor: `×${num(p.valor, 2)}`, criterio: `≤ ×${num(p.max, 2)} de la línea base (${num(p.base_mv)} mV)` };
    case "rpm": return { valor: `${num(p.valor)} RPM`, criterio: `${num(p.min)}–${num(p.max)} RPM · CV ${num(p.cv, 1)} % (≤ ${num(cfg.cv_max ?? 10)} %) · inercia ${num(p.inercia_ms)} ms` };
    default: return { valor: String(p.valor), criterio: "" };
  }
}

function api(ruta, opciones = {}) {
  return fetch(ruta, {
    headers: { "Content-Type": "application/json" },
    ...opciones,
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
  }).then(async (r) => {
    const datos = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(datos.error || `Error ${r.status}`);
    return datos;
  });
}

function aviso(texto, error = false) {
  const m = $("#mensaje");
  m.textContent = texto;
  m.classList.toggle("error", error);
}

const esqueleto = (columnas, filas = 5) =>
  Array.from({ length: filas }, () => `<tr class="esqueleto">${"<td><span></span></td>".repeat(columnas)}</tr>`).join("");

// ---------- navegación ----------
function irA(vista) {
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("activa", b.dataset.vista === vista));
  document.querySelectorAll(".vista").forEach((v) => v.classList.toggle("activa", v.id === `vista-${vista}`));
  const v = VISTAS[vista];
  $("#miga").innerHTML = `${esc(v.grupo)} / <b>${esc(v.titulo)}</b>`;
  $("#titulo").textContent = v.titulo;
  $("#descripcion").textContent = v.descripcion;
  const acciones = $("#acciones-encabezado");
  acciones.innerHTML = "";
  if (vista === "historial") {
    acciones.innerHTML = `<button class="boton" id="btn-csv"><svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>Descargar CSV</button>`;
    $("#btn-csv").addEventListener("click", descargarCsv);
    cargarHistorial();
  }
  if (vista === "estadisticas") {
    acciones.innerHTML = `<button class="boton" id="btn-actualizar"><svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 11-2.3-5.7M20 4v5h-5"/></svg>Actualizar</button>`;
    $("#btn-actualizar").addEventListener("click", cargarEstadisticas);
    cargarEstadisticas();
  }
  if (vista === "config") cargarConfig();
}
document.querySelectorAll(".nav-item").forEach((b) => b.addEventListener("click", () => irA(b.dataset.vista)));

// ---------- en vivo ----------
function reiniciarEstaciones() {
  estaciones = ESTACIONES.map(() => ({ clase: "", chip: "Pendiente", valor: "—", criterio: "Esperando la moto" }));
}

function pintarEstaciones() {
  $("#progreso").innerHTML = estaciones.map((s) => `<div class="paso ${s.clase}"></div>`).join("");
  $("#estaciones").innerHTML = ESTACIONES.map((e, i) => {
    const s = estaciones[i];
    return `<article class="estacion ${s.clase}">
      <div class="estacion-cabeza">
        <span class="icono">${ICONOS[e.tipo]}</span>
        <div><span class="num">Estación ${i + 1} · ${esc(e.sensor)}</span><div class="nombre">${esc(e.nombre)}</div></div>
      </div>
      <span class="chip">${esc(s.chip)}</span>
      <span class="valor">${esc(s.valor)}</span>
      <span class="criterio">${esc(s.criterio)}</span>
    </article>`;
  }).join("");
}

function aplicarPrueba(p) {
  const i = ESTACIONES.findIndex((e) => e.tipo === p.tipo);
  if (i < 0) return;
  estaciones[i] = { clase: p.ok ? "ok" : "falla", chip: p.ok ? "Pasa" : "No pasa", ...describirPrueba(p, estado?.config ?? {}) };
}

function aplicarFase(fase, estacion) {
  const texto = FASES[fase] ?? fase ?? "—";
  $("#fase").textContent = texto;
  $("#fase-detalle").textContent = estacion && EN_PROCESO.includes(fase) ? `· estación ${estacion}` : "";
  const chip = $("#chip-fase");
  chip.textContent = texto;
  chip.className = `chip-fase ${EN_PROCESO.includes(fase) ? "proceso" : fase === "ERROR" ? "falla" : fase === "ESPERA" || fase === "FIN" ? "ok" : ""}`;
  if (["AVANZANDO", "DESPLEGANDO", "MIDIENDO", "RETIRANDO"].includes(fase) && estacion) {
    const s = estaciones[estacion - 1];
    if (!["ok", "falla"].includes(s.clase)) estaciones[estacion - 1] = { ...s, clase: "proceso", chip: FASES[fase] };
  }
  const libre = ["ESPERA", "FIN", "ERROR"].includes(fase);
  $("#btn-iniciar").disabled = !libre || !estado?.conexion?.conectado;
}

function pintarIndicadores() {
  const c = estado?.conexion, a = estado?.almacen;
  $("#ind-esp32").textContent = c?.modo === "simulado" ? "ESP32 simulado" : c?.conectado ? `ESP32 · ${c.descripcion}` : "ESP32 desconectado";
  $("#punto-esp32").className = `punto ${c?.conectado ? (c.modo === "simulado" ? "aviso" : "ok") : "falla"}`;
  if (a?.tipo === "mongodb") {
    $("#ind-nube").textContent = a.conectado ? `MongoDB Atlas${a.pendientes ? ` · ${a.pendientes} pendientes` : ""}` : "Atlas sin conexión (guardando local)";
    $("#punto-nube").className = `punto ${a.conectado ? "ok" : "falla"}`;
  } else {
    $("#ind-nube").textContent = "Datos en archivo local";
    $("#punto-nube").className = "punto aviso";
  }
}

function pintarFallas() {
  const panel = $("#panel-fallas");
  panel.hidden = !estado?.fallas;
  if (!estado?.fallas) return;
  $("#fallas").innerHTML = Object.entries(FALLAS).map(([k, t]) =>
    `<label class="interruptor">${esc(t)}<input type="checkbox" data-falla="${k}" ${estado.fallas[k] ? "checked" : ""}></label>`).join("");
}
$("#fallas").addEventListener("change", (ev) => {
  const k = ev.target.dataset.falla;
  if (k) api("/api/simulador/fallas", { method: "POST", body: { [k]: ev.target.checked } });
});

function mostrarResultado(doc) {
  const r = $("#resultado");
  const textos = { aprobada: "Aprobada", rechazada: "Rechazada", error: "Error en la línea", detenida: "Detenida" };
  r.className = `resultado ${doc.resultado}`;
  r.innerHTML = `<span>${esc(doc.placa)} · ${textos[doc.resultado]}${doc.motivo ? ` — ${esc(doc.motivo)}` : ""} · ${num(doc.duracion_ms / 1000, 1)} s</span>
    <button class="boton">Ver reporte</button>`;
  r.querySelector("button").addEventListener("click", () => abrirCertificado(doc.id));
}

function registrarEvento(ev) {
  const li = document.createElement("li");
  const { evt, ts, ...resto } = ev;
  li.innerHTML = `<time>${new Date(ts).toLocaleTimeString("es-CO", { hour12: false })}</time><span><b>${esc(evt)}</b> ${esc(JSON.stringify(resto))}</span>`;
  const lista = $("#eventos");
  lista.prepend(li);
  while (lista.children.length > 60) lista.lastChild.remove();
}

$("#form-inicio").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  try {
    await api("/api/inspecciones", { method: "POST", body: { placa: $("#placa").value } });
    aviso(`Inspección de ${$("#placa").value.toUpperCase()} enviada a la línea.`);
  } catch (e) { aviso(e.message, true); }
});
$("#btn-detener").addEventListener("click", async () => {
  try { await api("/api/stop", { method: "POST" }); aviso("Línea detenida."); } catch (e) { aviso(e.message, true); }
});

// ---------- historial ----------
let historial = [];
async function cargarHistorial() {
  $("#tabla-historial").innerHTML = esqueleto(8);
  historial = await api(`/api/inspecciones?limite=1000&placa=${encodeURIComponent($("#buscar").value)}`);
  pintarHistorial();
}

function filtrarHistorial() {
  const res = $("#filtro-resultado").value, desde = $("#desde").value, hasta = $("#hasta").value;
  return historial.filter((d) => {
    const dia = new Date(d.inicio).toLocaleDateString("en-CA");  // AAAA-MM-DD en hora local
    return (!res || d.resultado === res) && (!desde || dia >= desde) && (!hasta || dia <= hasta);
  });
}

function pintarHistorial() {
  const celda = (d, tipo) => {
    const p = d.pruebas.find((x) => x.tipo === tipo);
    if (!p) return "<td>—</td>";
    return `<td class="${p.ok ? "marca-ok" : "marca-falla"}">${esc(describirPrueba(p, d.config ?? {}).valor)}</td>`;
  };
  const filas = filtrarHistorial();
  $("#tabla-historial").innerHTML = filas.map((d) => `<tr data-id="${esc(d.id)}">
    <td>${fecha(d.inicio)}</td><td class="placa">${esc(d.placa)}</td>
    <td><span class="insignia ${d.resultado}">${esc(d.resultado)}</span></td>
    ${celda(d, "luz")}${celda(d, "temp")}${celda(d, "gas")}${celda(d, "rpm")}
    <td>${num(d.duracion_ms / 1000, 1)} s</td></tr>`).join("")
    || `<tr><td colspan="8" class="vacio">No hay inspecciones con estos filtros.</td></tr>`;
}

let temporizadorBusqueda;
$("#buscar").addEventListener("input", () => { clearTimeout(temporizadorBusqueda); temporizadorBusqueda = setTimeout(cargarHistorial, 250); });
["#filtro-resultado", "#desde", "#hasta"].forEach((s) => $(s).addEventListener("change", pintarHistorial));
$("#btn-todas").addEventListener("click", () => { $("#desde").value = ""; $("#hasta").value = ""; pintarHistorial(); });
$("#tabla-historial").addEventListener("click", (ev) => {
  const tr = ev.target.closest("tr[data-id]");
  if (tr) abrirCertificado(tr.dataset.id);
});

async function descargarCsv() {
  const docs = await api("/api/inspecciones?limite=1000");
  const n = (v) => (Number.isFinite(v) ? String(v).replace(".", ",") : "");
  const cab = ["id", "placa", "resultado", "inicio", "duracion_s", "luz_mv", "luz_base_mv", "luz_ok", "temp_c", "temp_ok",
    "gas_rel", "gas_ok", "rpm", "rpm_cv_pct", "rpm_inercia_ms", "rpm_ok", "motivo", "origen", "firmware"];
  const filas = docs.map((d) => {
    const p = Object.fromEntries(d.pruebas.map((x) => [x.tipo, x]));
    return [d.id, d.placa, d.resultado, new Date(d.inicio).toISOString(), n(d.duracion_ms / 1000),
      n(p.luz?.valor), n(p.luz?.base), p.luz?.ok ?? "", n(p.temp?.valor), p.temp?.ok ?? "",
      n(p.gas?.valor), p.gas?.ok ?? "", n(p.rpm?.valor), n(p.rpm?.cv), n(p.rpm?.inercia_ms), p.rpm?.ok ?? "",
      d.motivo ?? "", d.origen, d.firmware ?? ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";");
  });
  const blob = new Blob(["﻿" + [cab.join(";"), ...filas].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `motocheck_inspecciones_${hoyISO()}.csv` });
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- reporte ----------
async function abrirCertificado(id) {
  const d = await api(`/api/inspecciones/${encodeURIComponent(id)}`);
  const titulo = { aprobada: "Aprobada", rechazada: "Rechazada", error: "No concluida (error)", detenida: "No concluida (detenida)" }[d.resultado];
  $("#certificado").innerHTML = `
    <div class="cert-cabeza">
      <div><h2>Reporte de preinspección</h2><p class="sutil">MotoCheck Lab · Universidad de Caldas</p>
        <p class="sutil">${fecha(d.inicio)} · ${num(d.duracion_ms / 1000, 1)} s · origen ${esc(d.origen)} · firmware ${esc(d.firmware ?? "—")}</p></div>
      <span class="cert-placa">${esc(d.placa)}</span>
    </div>
    <div class="resultado ${d.resultado}">Resultado: ${titulo}${d.motivo ? ` — ${esc(d.motivo)}` : ""}</div>
    <div class="tabla-tarjeta"><table class="tabla"><thead><tr><th>Estación</th><th>Medida</th><th>Criterio</th><th>Resultado</th></tr></thead><tbody>
    ${ESTACIONES.map((e) => {
      const p = d.pruebas.find((x) => x.tipo === e.tipo);
      if (!p) return `<tr><td>${esc(e.nombre)}</td><td>—</td><td>—</td><td>No evaluada</td></tr>`;
      const t = describirPrueba(p, d.config ?? {});
      return `<tr><td>${esc(e.nombre)}</td><td>${esc(t.valor)}</td><td style="white-space:normal">${esc(t.criterio)}</td><td class="${p.ok ? "marca-ok" : "marca-falla"}">${p.ok ? "Pasa" : "No pasa"}</td></tr>`;
    }).join("")}</tbody></table></div>
    <p class="cert-aviso">Prototipo académico. Resultado indicativo con umbrales experimentales; no reemplaza la Revisión Técnico-Mecánica y de Emisiones Contaminantes, que solo realizan los CDA acreditados por ONAC.</p>`;
  $("#dialogo-certificado").showModal();
}

// ---------- estadísticas ----------
async function cargarEstadisticas() {
  $("#tabla-pruebas").innerHTML = esqueleto(7, 4);
  const e = await api("/api/estadisticas");
  const kpi = (t, v, destacado = false) => `<div class="kpi ${destacado ? "destacado" : ""}"><span>${t}</span><strong>${v}</strong></div>`;
  $("#kpis").innerHTML = [
    kpi("Inspecciones", num(e.total)),
    kpi("Tasa de aprobación", e.tasa_aprobacion == null ? "—" : `${num(e.tasa_aprobacion * 100, 1)} %`, true),
    kpi("Tiempo de ciclo medio", e.duracion_media_ms == null ? "—" : `${num(e.duracion_media_ms / 1000, 1)} s`),
    kpi("Rechazadas", num(e.rechazadas)),
    kpi("Errores / detenidas", `${num(e.errores)} / ${num(e.detenidas)}`),
  ].join("");
  const dec = { luz: 0, temp: 2, gas: 2, rpm: 1 };
  const unidad = { luz: " mV", temp: " °C", gas: "", rpm: " RPM" };
  $("#tabla-pruebas").innerHTML = ESTACIONES.map(({ tipo, nombre }) => {
    const p = e.por_prueba[tipo];
    if (!p) return `<tr><td>${nombre}</td><td colspan="6" class="sutil">Sin datos</td></tr>`;
    return `<tr><td><b>${nombre}</b></td><td>${num(p.total)}</td><td>${num(p.fallas)}</td><td>${num((100 * p.fallas) / p.total, 1)} %</td>
      <td>${num(p.media, dec[tipo])}${unidad[tipo]}</td><td>${num(p.desviacion, dec[tipo])}</td><td>${num(p.cv_pct, 1)} %</td></tr>`;
  }).join("");
}

// ---------- configuración ----------
async function cargarConfig() {
  const c = await api("/api/config");
  $("#form-config").innerHTML = Object.entries(c.claves).map(([k, def]) => {
    const v = c.guardada[k] ?? c.dispositivo?.[k] ?? def.defecto;
    return `<div class="campo"><label for="cfg-${k}">${esc(ETIQUETAS_CFG[k] ?? k)}</label>
      <div class="fila-input"><input id="cfg-${k}" type="number" step="any" min="${def.min}" max="${def.max}" value="${esc(v)}">
      <button type="button" class="boton" data-guardar="${k}">Guardar</button></div></div>`;
  }).join("");
  api("/api/puertos").then((p) => { $("#puertos").textContent = p.map((x) => `${x.ruta}  ${x.fabricante}`).join("\n") || "Ninguno"; })
    .catch((e) => { $("#puertos").textContent = e.message; });
}
$("#form-config").addEventListener("click", async (ev) => {
  const boton = ev.target.closest("[data-guardar]");
  if (!boton) return;
  const k = boton.dataset.guardar;
  try {
    await api("/api/config", { method: "POST", body: { clave: k, valor: $(`#cfg-${k}`).value } });
    boton.textContent = "✓ Guardado";
    setTimeout(() => { boton.textContent = "Guardar"; }, 1400);
  } catch (e) { alert(e.message); }
});
$("#btn-leer").addEventListener("click", () => api("/api/leer", { method: "POST" }).catch((e) => { $("#lecturas").textContent = e.message; }));

// ---------- tiempo real ----------
// Si la página se abrió como archivo (sin el puente), no hay Socket.IO ni API.
if (typeof io === "undefined") {
  $("#ind-esp32").textContent = "Sin puente: ejecute npm run simular";
  $("#punto-esp32").className = "punto falla";
  aviso("El panel debe abrirse desde el puente: cd software/puente && npm run simular → http://localhost:3000", true);
}
const socket = typeof io === "undefined" ? { on() {} } : io();
socket.on("estado", (s) => {
  const primera = !estado;
  estado = s;
  pintarIndicadores();
  pintarFallas();
  if (primera && s.actual) {
    reiniciarEstaciones();
    s.actual.pruebas.forEach(aplicarPrueba);
    $("#placa").value = s.actual.placa;
  }
  aplicarFase(s.linea?.fase, s.linea?.estacion);
  if (s.lecturas) $("#lecturas").textContent = JSON.stringify(s.lecturas, null, 2);
  pintarEstaciones();
});
socket.on("evento", (ev) => {
  registrarEvento(ev);
  if (ev.evt === "inicio") {
    reiniciarEstaciones();
    $("#resultado").className = "resultado oculto";
  }
  if (ev.evt === "prueba") aplicarPrueba(ev);
  if (ev.evt === "estado") aplicarFase(ev.fase, ev.estacion);
  if (ev.evt === "rechazado") aviso(`El ESP32 rechazó el comando: ${ev.motivo}`, true);
  pintarEstaciones();
});
socket.on("inspeccion", (doc) => {
  mostrarResultado(doc);
  if ($("#vista-historial").classList.contains("activa")) cargarHistorial();
});
socket.on("disconnect", () => {
  $("#ind-esp32").textContent = "Puente desconectado";
  $("#punto-esp32").className = "punto falla";
});

reiniciarEstaciones();
pintarEstaciones();
irA("vivo");
