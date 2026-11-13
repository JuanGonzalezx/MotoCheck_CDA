// Análisis de resultados del protocolo P1–P9 (entregas/01_fase1, Tabla 6).
// Lee las inspecciones guardadas por el puente y las hojas manuales de analisis/datos/,
// y escribe analisis/resultados/resultados.json y resultados.md.
//
//   node analisis/analizar.mjs                       solo datos reales (origen esp32)
//   node analisis/analizar.mjs --incluir-simulador   prueba el análisis con datos simulados
//   node analisis/analizar.mjs --inspecciones ruta.jsonl
//
// Condición conocida de cada moto (P7): se codifica en el prefijo de la placa.
//   BUE = buena · FAR = faro débil · TMP = motor caliente · GAS = gases · RUE = rueda frenada
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(DIR, "..");
const args = process.argv.slice(2);
const opcion = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const incluirSimulador = args.includes("--incluir-simulador");

export const CONDICIONES = {
  BUE: { nombre: "Buena", falla: null },
  FAR: { nombre: "Faro débil", falla: "luz" },
  TMP: { nombre: "Motor caliente", falla: "temp" },
  GAS: { nombre: "Gases altos", falla: "gas" },
  RUE: { nombre: "Rueda frenada", falla: "rpm" },
};
const CRITERIOS = {
  p1: "Error medio absoluto ≤ 5 mm", p2: "R² ≥ 0,90", p3: "CV ≤ 5 %", p4: "Error absoluto ≤ 1 °C",
  p5: "Detección (relación ≥ 1,5) en el 100 % de los casos", p6: "Error medio absoluto ≤ 3 %; CV ≤ 10 %",
  p7: "Exactitud ≥ 90 %; error tipo II ≤ 5 %", p8: "≥ 95 % de ciclos sin error", p9: "Parada segura en el 100 % de las fallas",
};

// ---------- estadística ----------
export const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export function desv(xs) {
  if (xs.length < 2) return null;
  const m = media(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}
export const resumen = (xs) => {
  const m = media(xs), s = desv(xs);
  return { n: xs.length, media: m, desviacion: s, cv_pct: m && s != null ? (100 * s) / Math.abs(m) : null,
    min: xs.length ? Math.min(...xs) : null, max: xs.length ? Math.max(...xs) : null };
};
export function regresion(xs, ys) {
  const mx = media(xs), my = media(ys);
  let sxy = 0, sxx = 0, syy = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
  const pendiente = sxy / sxx, intercepto = my - pendiente * mx;
  return { n: xs.length, pendiente, intercepto, r2: syy ? (sxy * sxy) / (sxx * syy) : null };
}

// ---------- lectura de datos ----------
export function leerCsv(ruta) {
  if (!fs.existsSync(ruta)) return [];
  const lineas = fs.readFileSync(ruta, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"));
  if (lineas.length < 2) return [];
  const sep = lineas[0].includes(";") ? ";" : ",";
  const cab = lineas[0].split(sep).map((c) => c.trim().toLowerCase());
  return lineas.slice(1).map((l) => {
    const celdas = l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(cab.map((c, i) => {
      const crudo = celdas[i] ?? "";
      const n = Number(sep === ";" ? crudo.replace(",", ".") : crudo);
      return [c, crudo !== "" && Number.isFinite(n) ? n : crudo];
    }));
  });
}

function leerInspecciones() {
  const candidatos = [opcion("--inspecciones"), path.join(DIR, "datos", "inspecciones.jsonl"),
    path.join(RAIZ, "software", "puente", "datos", "inspecciones.jsonl")].filter(Boolean);
  const ruta = candidatos.find((r) => fs.existsSync(r));
  if (!ruta) return { ruta: null, docs: [] };
  const docs = fs.readFileSync(ruta, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  return { ruta, docs };
}

export const condicionDe = (placa) => CONDICIONES[String(placa).slice(0, 3).toUpperCase()] ? String(placa).slice(0, 3).toUpperCase() : null;
const prueba = (d, tipo) => d.pruebas.find((p) => p.tipo === tipo);

// ---------- pruebas ----------
export function analizar({ docs, hojas }) {
  const r = {};

  // P1 parada en estación
  const p1 = hojas.p1.filter((f) => Number.isFinite(f.desplazamiento_mm));
  if (p1.length) {
    const porEstacion = {};
    for (const f of p1) (porEstacion[f.estacion] ??= []).push(f.desplazamiento_mm);
    const filas = Object.entries(porEstacion).map(([e, xs]) => ({ estacion: Number(e), ...resumen(xs), error_abs_medio: media(xs.map(Math.abs)) }));
    const global = media(p1.map((f) => Math.abs(f.desplazamiento_mm)));
    r.p1 = { disponible: true, filas, error_abs_medio: global, cumple: global <= 5 };
  }

  // P2 calibración de la LDR
  const p2 = hojas.p2.filter((f) => Number.isFinite(f.lux_referencia) && Number.isFinite(f.lectura_mv));
  if (p2.length >= 3) {
    const reg = regresion(p2.map((f) => f.lux_referencia), p2.map((f) => f.lectura_mv));
    r.p2 = { disponible: true, ...reg, cumple: reg.r2 >= 0.9 };
  }

  // P3 repetibilidad de la luz (motos con faro bueno: todas menos FAR)
  const luces = docs.filter((d) => condicionDe(d.placa) && condicionDe(d.placa) !== "FAR")
    .map((d) => prueba(d, "luz")).filter(Boolean).map((p) => p.valor - p.base);
  if (luces.length >= 2) {
    const s = resumen(luces);
    r.p3 = { disponible: true, ...s, cumple: s.cv_pct <= 5 };
  }

  // P4 temperatura y tiempo de respuesta
  const p4 = hojas.p4.filter((f) => Number.isFinite(f.referencia_c) && Number.isFinite(f.ds18b20_c));
  if (p4.length) {
    const porPunto = {};
    for (const f of p4) (porPunto[f.punto] ??= []).push(f);
    const filas = Object.entries(porPunto).map(([punto, fs_]) => {
      const errores = fs_.map((f) => f.ds18b20_c - f.referencia_c);
      return { punto, referencia_media: media(fs_.map((f) => f.referencia_c)), ...resumen(fs_.map((f) => f.ds18b20_c)),
        error_medio: media(errores), error_abs_max: Math.max(...errores.map(Math.abs)) };
    });
    const peor = Math.max(...filas.map((f) => Math.abs(f.error_medio)));
    r.p4 = { disponible: true, filas, error_abs_peor: peor, cumple: peor <= 1 };
  }
  const resp = hojas.p4r.filter((f) => Number.isFinite(f.tiempo_s) && Number.isFinite(f.temperatura_c));
  if (resp.length >= 6) {
    const t0 = resp[0].temperatura_c, tf = media(resp.slice(-5).map((f) => f.temperatura_c));
    const meta = t0 + 0.632 * (tf - t0);
    const sube = tf > t0;
    let tau = null;
    for (let i = 1; i < resp.length; i++) {
      const a = resp[i - 1], b = resp[i];
      if (sube ? b.temperatura_c >= meta : b.temperatura_c <= meta) {
        tau = a.tiempo_s + ((meta - a.temperatura_c) * (b.tiempo_s - a.tiempo_s)) / (b.temperatura_c - a.temperatura_c);
        break;
      }
    }
    r.p4 = { ...(r.p4 ?? { disponible: true, filas: [] }), tau63_s: tau == null ? null : tau - resp[0].tiempo_s, escalon: { inicial: t0, final: tf } };
  }

  // P5 gases
  const aire = hojas.p5.filter((f) => /aire/i.test(f.condicion)).map((f) => f.lectura_mv).filter(Number.isFinite);
  const alcohol = hojas.p5.filter((f) => /alcohol/i.test(f.condicion)).map((f) => f.lectura_mv).filter(Number.isFinite);
  if (aire.length && alcohol.length) {
    const base = media(aire);
    const relaciones = alcohol.map((x) => x / base);
    const deteccion = relaciones.filter((x) => x >= 1.5).length / relaciones.length;
    r.p5 = { disponible: true, aire: resumen(aire), alcohol: resumen(alcohol), relacion: resumen(relaciones), deteccion, cumple: deteccion === 1 };
  }

  // P6 RPM Hall vs referencia
  const p6 = hojas.p6.filter((f) => Number.isFinite(f.rpm_referencia) && Number.isFinite(f.rpm_hall));
  if (p6.length) {
    const porPwm = {};
    for (const f of p6) (porPwm[f.pwm] ??= []).push(f);
    const filas = Object.entries(porPwm).map(([pwm, fs_]) => {
      const err = fs_.map((f) => (100 * (f.rpm_hall - f.rpm_referencia)) / f.rpm_referencia);
      return { pwm: Number(pwm), referencia: media(fs_.map((f) => f.rpm_referencia)), ...resumen(fs_.map((f) => f.rpm_hall)),
        error_pct_medio: media(err), error_pct_abs_medio: media(err.map(Math.abs)) };
    });
    const mape = media(p6.map((f) => Math.abs((100 * (f.rpm_hall - f.rpm_referencia)) / f.rpm_referencia)));
    const cvMax = Math.max(...filas.map((f) => f.cv_pct ?? 0));
    r.p6 = { disponible: true, filas, error_pct_abs_medio: mape, cv_max: cvMax, cumple: mape <= 3 && cvMax <= 10 };
  }

  // P7 clasificación con condiciones conocidas
  const etiquetadas = docs.filter((d) => condicionDe(d.placa) && (d.resultado === "aprobada" || d.resultado === "rechazada"));
  if (etiquetadas.length) {
    const buenas = etiquetadas.filter((d) => condicionDe(d.placa) === "BUE");
    const malas = etiquetadas.filter((d) => condicionDe(d.placa) !== "BUE");
    const vp = malas.filter((d) => !d.aprobada).length;      // defectuosa rechazada
    const fn = malas.length - vp;                            // tipo II: defectuosa aprobada
    const vn = buenas.filter((d) => d.aprobada).length;      // buena aprobada
    const fp = buenas.length - vn;                           // tipo I: buena rechazada
    const porCondicion = Object.entries(CONDICIONES).map(([pref, c]) => {
      const ds = etiquetadas.filter((d) => condicionDe(d.placa) === pref);
      const correctas = ds.filter((d) => (c.falla === null ? d.aprobada : !d.aprobada && prueba(d, c.falla)?.ok === false)).length;
      return { prefijo: pref, condicion: c.nombre, n: ds.length, correctas, exactitud: ds.length ? correctas / ds.length : null };
    }).filter((f) => f.n);
    const exactitud = (vp + vn) / etiquetadas.length;
    const tipoII = malas.length ? fn / malas.length : null;
    r.p7 = {
      disponible: true, n: etiquetadas.length, matriz: { vp, fn, fp, vn },
      exactitud, error_tipo_I: buenas.length ? fp / buenas.length : null, error_tipo_II: tipoII, por_condicion: porCondicion,
      cumple: exactitud >= 0.9 && (tipoII ?? 0) <= 0.05,
    };
  }

  // P8 tiempo de ciclo y disponibilidad
  const completas = docs.filter((d) => d.resultado === "aprobada" || d.resultado === "rechazada");
  const sinDetenidas = docs.filter((d) => d.resultado !== "detenida");
  if (completas.length) {
    const s = resumen(completas.map((d) => d.duracion_ms / 1000));
    const disponibilidad = completas.length / sinDetenidas.length;
    r.p8 = { disponible: true, ciclo_s: s, motos_por_hora: 3600 / s.media, total: docs.length, completas: completas.length,
      errores: docs.filter((d) => d.resultado === "error").length, detenidas: docs.length - sinDetenidas.length,
      disponibilidad, cumple: disponibilidad >= 0.95 };
  }

  // P9 fallas inducidas
  const p9 = hojas.p9.filter((f) => f.falla_inducida);
  if (p9.length) {
    const seguras = p9.filter((f) => /^s/i.test(String(f.parada_segura))).length;
    const porFalla = {};
    for (const f of p9) { porFalla[f.falla_inducida] ??= { n: 0, seguras: 0 }; porFalla[f.falla_inducida].n++; if (/^s/i.test(String(f.parada_segura))) porFalla[f.falla_inducida].seguras++; }
    r.p9 = { disponible: true, n: p9.length, seguras, tasa: seguras / p9.length, por_falla: porFalla, cumple: seguras === p9.length };
  }

  // Mismo orden P1…P9 siempre, con el criterio de aceptación de la Tabla 6
  return Object.fromEntries(Object.keys(CRITERIOS).map((k) => [k, { criterio: CRITERIOS[k], disponible: false, ...r[k] }]));
}

// ---------- informe ----------
const f = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace(".", ",") : "—");
const pct = (v, d = 1) => (Number.isFinite(v) ? `${f(100 * v, d)} %` : "—");
const marca = (x) => (x.disponible ? (x.cumple ? "✅ cumple" : "❌ no cumple") : "⏳ sin datos");

function informe(res, meta) {
  const L = [`# Resultados experimentales MotoCheck Lab`, "", `Generado: ${meta.generado} · inspecciones: ${meta.n_inspecciones} (${meta.ruta ?? "sin archivo"}) · origen: ${meta.origenes.join(", ") || "—"}`, ""];
  if (meta.advertencia_simulado) L.push("> ⚠️ **INCLUYE DATOS SIMULADOS. NO USAR EN EL ARTÍCULO.**", "");
  L.push("| Prueba | Criterio | Estado |", "|---|---|---|");
  for (const [k, v] of Object.entries(res)) L.push(`| ${k.toUpperCase()} | ${v.criterio} | ${marca(v)} |`);
  L.push("");
  if (res.p1.disponible) L.push(`**P1** error absoluto medio de parada: ${f(res.p1.error_abs_medio)} mm`, "");
  if (res.p2.disponible) L.push(`**P2** LDR: mV = ${f(res.p2.intercepto)} + ${f(res.p2.pendiente, 3)}·lux · R² = ${f(res.p2.r2, 3)} (n = ${res.p2.n})`, "");
  if (res.p3.disponible) L.push(`**P3** contraste del faro: ${f(res.p3.media, 0)} ± ${f(res.p3.desviacion, 0)} mV · CV = ${f(res.p3.cv_pct, 1)} % (n = ${res.p3.n})`, "");
  if (res.p4.disponible) L.push(`**P4** peor error medio: ${f(res.p4.error_abs_peor)} °C${res.p4.tau63_s != null ? ` · τ63 = ${f(res.p4.tau63_s, 1)} s` : ""}`, "");
  if (res.p5.disponible) L.push(`**P5** relación con alcohol: ${f(res.p5.relacion.media)} ± ${f(res.p5.relacion.desviacion)} · detección ${pct(res.p5.deteccion)}`, "");
  if (res.p6.disponible) L.push(`**P6** error absoluto medio de RPM: ${f(res.p6.error_pct_abs_medio)} % · CV máx. ${f(res.p6.cv_max, 1)} %`, "");
  if (res.p7.disponible) {
    const m = res.p7.matriz;
    L.push(`**P7** n = ${res.p7.n} · exactitud ${pct(res.p7.exactitud)} · tipo I ${pct(res.p7.error_tipo_I)} · tipo II ${pct(res.p7.error_tipo_II)}`, "",
      "| | Rechazada | Aprobada |", "|---|---|---|", `| Defectuosa | ${m.vp} | ${m.fn} (tipo II) |`, `| Buena | ${m.fp} (tipo I) | ${m.vn} |`, "");
  }
  if (res.p8.disponible) L.push(`**P8** ciclo ${f(res.p8.ciclo_s.media, 1)} ± ${f(res.p8.ciclo_s.desviacion, 1)} s · ${f(res.p8.motos_por_hora, 0)} motos/h · disponibilidad ${pct(res.p8.disponibilidad)}`, "");
  if (res.p9.disponible) L.push(`**P9** parada segura en ${res.p9.seguras}/${res.p9.n} fallas inducidas`, "");
  return L.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { ruta, docs: todas } = leerInspecciones();
  const docs = todas.filter((d) => incluirSimulador || d.origen === "esp32");
  const hoja = (n) => leerCsv(path.join(DIR, "datos", n));
  const hojas = { p1: hoja("p1_parada.csv"), p2: hoja("p2_calibracion_ldr.csv"), p4: hoja("p4_temperatura.csv"),
    p4r: hoja("p4_respuesta.csv"), p5: hoja("p5_gases.csv"), p6: hoja("p6_rpm.csv"), p9: hoja("p9_fallas.csv") };
  const resultados = analizar({ docs, hojas });
  const meta = { generado: new Date().toISOString(), ruta: ruta && path.relative(RAIZ, ruta), n_inspecciones: docs.length,
    origenes: [...new Set(docs.map((d) => d.origen))], advertencia_simulado: docs.some((d) => d.origen !== "esp32") };
  const salida = path.join(DIR, "resultados");
  fs.mkdirSync(salida, { recursive: true });
  fs.writeFileSync(path.join(salida, "resultados.json"), JSON.stringify({ meta, resultados }, null, 2));
  fs.writeFileSync(path.join(salida, "resultados.md"), informe(resultados, meta));
  console.log(informe(resultados, meta));
}
