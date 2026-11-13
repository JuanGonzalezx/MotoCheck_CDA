// Panel web de MotoCheck Lab. Habla con el puente por REST (/api) y Socket.IO.
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const num = (v, d = 0) => (Number.isFinite(v) ? v.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d }) : "—");
const fecha = (f) => new Date(f).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "medium" });

const ESTACIONES = [
  { tipo: "luz", nombre: "Faro", sensor: "Fotocelda LDR" },
  { tipo: "temp", nombre: "Temperatura", sensor: "DS18B20" },
  { tipo: "gas", nombre: "Gases", sensor: "MQ-2" },
  { tipo: "rpm", nombre: "Rueda", sensor: "Hall + rodillo" },
];
const FASES = {
  CALENTANDO: "Calentando el sensor de gases", ESPERA: "Lista para inspeccionar", AVANZANDO: "Banda avanzando",
  DESPLEGANDO: "Desplegando brazo", MIDIENDO: "Midiendo", RETIRANDO: "Retirando brazo",
  SALIENDO: "Moto saliendo", FIN: "Inspección terminada", ERROR: "Error en la línea",
};
const ETIQUETAS_CFG = {
  luz_min: "Faro: contraste mínimo (mV)", temp_min: "Temperatura mínima (°C)", temp_max: "Temperatura máxima (°C)",
  gas_max: "Gases: relación máxima (× base)", rpm_min: "Rueda: RPM mínimas", rpm_max: "Rueda: RPM máximas",
  cv_max: "Rueda: CV máximo (%)", pwm_banda: "PWM de la banda (0–255)", pwm_rodillo: "PWM del rodillo (0–255)",
  servo_reposo: "Servo: ángulo de reposo (°)", servo_medida: "Servo: ángulo de medida (°)", timeout: "Tiempo máximo por estación (ms)",
};
const FALLAS = { faro: "Faro débil", temp: "Motor recalentado", gas: "Gases altos", rueda: "Rueda frenada", atasco: "Atasco en la banda (E3)" };

let estado = null;
let estaciones = ESTACIONES.map(() => ({ clase: "", chip: "Pendiente", valor: "—", criterio: "" }));

// ---------- utilidades de pruebas ----------
function describirPrueba(p, cfg = {}) {
  switch (p.tipo) {
    case "luz": return { valor: `${num(p.valor - p.base)} mV`, criterio: `contraste ≥ ${num(p.min)} mV (base ${num(p.base)})` };
    case "temp": return { valor: p.valor <= -999 ? "sin sensor" : `${num(p.valor, 1)} °C`, criterio: `entre ${num(p.min)} y ${num(p.max)} °C` };
    case "gas": return { valor: `×${num(p.valor, 2)}`, criterio: `≤ ×${num(p.max, 2)} la línea base (${num(p.base_mv)} mV)` };
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

// ---------- pestañas ----------
document.querySelectorAll(".pestanas button").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".pestanas button").forEach((x) => x.classList.toggle("activa", x === b));
  document.querySelectorAll(".vista").forEach((v) => v.classList.toggle("activa", v.id === `vista-${b.dataset.vista}`));
  if (b.dataset.vista === "historial") cargarHistorial();
  if (b.dataset.vista === "estadisticas") cargarEstadisticas();
  if (b.dataset.vista === "config") cargarConfig();
}));

// ---------- en vivo ----------
function pintarEstaciones() {
  $("#estaciones").innerHTML = ESTACIONES.map((e, i) => {
    const s = estaciones[i];
    return `<article class="estacion ${s.clase}">
      <span class="num">ESTACIÓN ${i + 1} · ${esc(e.sensor)}</span>
      <span class="nombre">${esc(e.nombre)}</span>
      <span class="chip">${esc(s.chip)}</span>
      <span class="valor">${esc(s.valor)}</span>
      <span class="criterio">${esc(s.criterio)}</span>
    </article>`;
  }).join("");
}

function reiniciarEstaciones() {
  estaciones = ESTACIONES.map(() => ({ clase: "", chip: "Pendiente", valor: "—", criterio: "" }));
}

function aplicarPrueba(p) {
  const i = ESTACIONES.findIndex((e) => e.tipo === p.tipo);
  if (i < 0) return;
  const d = describirPrueba(p, estado?.config ?? {});
  estaciones[i] = { clase: p.ok ? "ok" : "falla", chip: p.ok ? "Pasa" : "No pasa", ...d };
}

function aplicarFase(fase, estacion) {
  $("#fase").textContent = FASES[fase] ?? fase ?? "—";
  $("#fase-detalle").textContent = estacion && !["ESPERA", "CALENTANDO"].includes(fase) ? `Estación ${estacion}` : "";
  if (["AVANZANDO", "DESPLEGANDO", "MIDIENDO", "RETIRANDO"].includes(fase) && estacion) {
    const s = estaciones[estacion - 1];
    if (!["ok", "falla"].includes(s.clase)) {
      estaciones[estacion - 1] = { ...s, clase: "activa", chip: FASES[fase] };
    }
  }
  const libre = ["ESPERA", "FIN", "ERROR"].includes(fase);
  $("#btn-iniciar").disabled = !libre || !estado?.conexion?.conectado;
}

function pintarIndicadores() {
  const c = estado?.conexion, a = estado?.almacen;
  const e32 = $("#ind-esp32");
  e32.textContent = c?.modo === "simulado" ? "ESP32 simulado" : c?.conectado ? `ESP32 ${c.descripcion}` : "ESP32 desconectado";
  e32.className = `pastilla ${c?.conectado ? (c.modo === "simulado" ? "aviso" : "ok") : "falla"}`;
  const nube = $("#ind-nube");
  if (a?.tipo === "mongodb") {
    nube.textContent = a.conectado ? `MongoDB Atlas${a.pendientes ? ` · ${a.pendientes} pendientes` : ""}` : "Atlas sin conexión (guardando local)";
    nube.className = `pastilla ${a.conectado ? "ok" : "falla"}`;
  } else {
    nube.textContent = "Datos en archivo local";
    nube.className = "pastilla aviso";
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
  const textos = { aprobada: "APROBADA", rechazada: "RECHAZADA", error: "ERROR EN LA LÍNEA", detenida: "DETENIDA" };
  r.className = `resultado ${doc.resultado}`;
  r.innerHTML = `<span>${esc(doc.placa)} · ${textos[doc.resultado]}${doc.motivo ? ` — ${esc(doc.motivo)}` : ""} · ${num(doc.duracion_ms / 1000, 1)} s</span>
    <button data-id="${esc(doc.id)}">Ver certificado</button>`;
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
  historial = await api(`/api/inspecciones?limite=500&placa=${encodeURIComponent($("#buscar").value)}`);
  const celda = (d, tipo) => {
    const p = d.pruebas.find((x) => x.tipo === tipo);
    if (!p) return "<td>—</td>";
    return `<td class="${p.ok ? "marca-ok" : "marca-falla"}">${esc(describirPrueba(p, d.config ?? {}).valor)}</td>`;
  };
  $("#tabla-historial").innerHTML = historial.map((d) => `<tr data-id="${esc(d.id)}">
    <td>${fecha(d.inicio)}</td><td><b>${esc(d.placa)}</b></td>
    <td><span class="insignia ${d.resultado}">${esc(d.resultado)}</span></td>
    ${celda(d, "luz")}${celda(d, "temp")}${celda(d, "gas")}${celda(d, "rpm")}
    <td>${num(d.duracion_ms / 1000, 1)} s</td></tr>`).join("") || `<tr><td colspan="8" class="sutil">Aún no hay inspecciones.</td></tr>`;
}
$("#buscar").addEventListener("input", () => cargarHistorial());
$("#tabla-historial").addEventListener("click", (ev) => {
  const tr = ev.target.closest("tr[data-id]");
  if (tr) abrirCertificado(tr.dataset.id);
});

$("#btn-csv").addEventListener("click", async () => {
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
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `motocheck_inspecciones_${new Date().toISOString().slice(0, 10)}.csv` });
  a.click();
  URL.revokeObjectURL(a.href);
});

// ---------- certificado ----------
async function abrirCertificado(id) {
  const d = await api(`/api/inspecciones/${encodeURIComponent(id)}`);
  const titulo = { aprobada: "APROBADA", rechazada: "RECHAZADA", error: "NO CONCLUIDA (error)", detenida: "NO CONCLUIDA (detenida)" }[d.resultado];
  $("#certificado").innerHTML = `
    <div class="cert-cabeza">
      <div><h2>Reporte de preinspección</h2><p class="sutil">MotoCheck Lab · Universidad de Caldas</p>
        <p class="sutil">${fecha(d.inicio)} · ${num(d.duracion_ms / 1000, 1)} s · origen ${esc(d.origen)} · firmware ${esc(d.firmware ?? "—")}</p></div>
      <span class="cert-placa">${esc(d.placa)}</span>
    </div>
    <p class="resultado ${d.resultado}">Resultado: ${titulo}${d.motivo ? ` — ${esc(d.motivo)}` : ""}</p>
    <table class="tabla"><thead><tr><th>Estación</th><th>Medida</th><th>Criterio</th><th>Resultado</th></tr></thead><tbody>
    ${ESTACIONES.map((e) => {
      const p = d.pruebas.find((x) => x.tipo === e.tipo);
      if (!p) return `<tr><td>${esc(e.nombre)}</td><td>—</td><td>—</td><td>No evaluada</td></tr>`;
      const t = describirPrueba(p, d.config ?? {});
      return `<tr><td>${esc(e.nombre)}</td><td>${esc(t.valor)}</td><td>${esc(t.criterio)}</td><td class="${p.ok ? "marca-ok" : "marca-falla"}">${p.ok ? "Pasa" : "No pasa"}</td></tr>`;
    }).join("")}</tbody></table>
    <p class="cert-aviso">Prototipo académico. Resultado indicativo con umbrales experimentales; no reemplaza la Revisión Técnico-Mecánica y de Emisiones Contaminantes, que solo realizan los CDA acreditados por ONAC.</p>`;
  $("#dialogo-certificado").showModal();
}

// ---------- estadísticas ----------
async function cargarEstadisticas() {
  const e = await api("/api/estadisticas");
  const kpi = (t, v) => `<div class="kpi"><span>${t}</span><strong>${v}</strong></div>`;
  $("#kpis").innerHTML = [
    kpi("Inspecciones", num(e.total)),
    kpi("Tasa de aprobación", e.tasa_aprobacion == null ? "—" : `${num(e.tasa_aprobacion * 100, 1)} %`),
    kpi("Tiempo de ciclo medio", e.duracion_media_ms == null ? "—" : `${num(e.duracion_media_ms / 1000, 1)} s`),
    kpi("Rechazadas", num(e.rechazadas)),
    kpi("Errores / detenidas", `${num(e.errores)} / ${num(e.detenidas)}`),
  ].join("");
  const dec = { luz: 0, temp: 2, gas: 2, rpm: 1 };
  $("#tabla-pruebas").innerHTML = ESTACIONES.map(({ tipo, nombre }) => {
    const p = e.por_prueba[tipo];
    if (!p) return `<tr><td>${nombre}</td><td colspan="6" class="sutil">Sin datos</td></tr>`;
    return `<tr><td>${nombre}</td><td>${num(p.total)}</td><td>${num(p.fallas)}</td><td>${num((100 * p.fallas) / p.total, 1)} %</td>
      <td>${num(p.media, dec[tipo])}</td><td>${num(p.desviacion, dec[tipo])}</td><td>${num(p.cv_pct, 1)} %</td></tr>`;
  }).join("");
}

// ---------- configuración ----------
async function cargarConfig() {
  const c = await api("/api/config");
  $("#form-config").innerHTML = Object.entries(c.claves).map(([k, def]) => {
    const v = c.guardada[k] ?? c.dispositivo?.[k] ?? def.defecto;
    return `<div class="campo"><label for="cfg-${k}">${esc(ETIQUETAS_CFG[k] ?? k)}</label>
      <div class="en-linea"><input id="cfg-${k}" type="number" step="any" min="${def.min}" max="${def.max}" value="${esc(v)}" data-clave="${k}" data-original="${esc(v)}">
      <button type="button" data-guardar="${k}">Guardar</button></div></div>`;
  }).join("");
  api("/api/puertos").then((p) => { $("#puertos").textContent = p.map((x) => `${x.ruta}  ${x.fabricante}`).join("\n") || "Ninguno"; })
    .catch((e) => { $("#puertos").textContent = e.message; });
}
$("#form-config").addEventListener("click", async (ev) => {
  const k = ev.target.dataset.guardar;
  if (!k) return;
  const input = $(`#cfg-${k}`);
  try {
    await api("/api/config", { method: "POST", body: { clave: k, valor: input.value } });
    ev.target.textContent = "✓";
    setTimeout(() => { ev.target.textContent = "Guardar"; }, 1200);
  } catch (e) { alert(e.message); }
});
$("#btn-leer").addEventListener("click", () => api("/api/leer", { method: "POST" }).catch((e) => { $("#lecturas").textContent = e.message; }));

// ---------- tiempo real ----------
const socket = io();
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
  $("#ind-esp32").className = "pastilla falla";
});

pintarEstaciones();
