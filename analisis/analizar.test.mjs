// node --test analisis/analizar.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { analizar, regresion, resumen, condicionDe } from "./analizar.mjs";

const vacio = { p1: [], p2: [], p4: [], p4r: [], p5: [], p6: [], p9: [] };
const insp = (placa, aprobada, pruebas, extra = {}) => ({
  placa, resultado: aprobada ? "aprobada" : "rechazada", aprobada, duracion_ms: 40000, origen: "esp32",
  pruebas: ["luz", "temp", "gas", "rpm"].map((tipo) => ({ tipo, ok: !pruebas.includes(tipo), valor: 1600, base: 100 })), ...extra,
});

test("estadística básica", () => {
  const s = resumen([2, 4, 4, 4, 5, 5, 7, 9]);
  assert.equal(s.media, 5);
  assert.ok(Math.abs(s.desviacion - 2.138) < 0.001);
  const r = regresion([0, 1, 2, 3], [1, 3, 5, 7]);
  assert.equal(r.pendiente, 2);
  assert.equal(r.intercepto, 1);
  assert.equal(r.r2, 1);
  assert.equal(condicionDe("far03"), "FAR");
  assert.equal(condicionDe("ABC12D"), null);
});

test("sin datos todo queda no disponible", () => {
  const r = analizar({ docs: [], hojas: vacio });
  for (const v of Object.values(r)) assert.equal(v.disponible, false);
});

test("matriz de confusión y errores tipo I y II", () => {
  const docs = [
    insp("BUE01", true, []), insp("BUE02", true, []), insp("BUE03", false, ["temp"]),   // 1 falsa alarma
    insp("FAR01", false, ["luz"]), insp("RUE01", false, ["rpm"]), insp("GAS01", true, []), // 1 falla (tipo II)
    insp("ABC12D", true, []),                                                             // sin condición: fuera de P7
  ];
  const r = analizar({ docs, hojas: vacio }).p7;
  assert.deepEqual(r.matriz, { vp: 2, fn: 1, fp: 1, vn: 2 });
  assert.equal(r.exactitud, 4 / 6);
  assert.equal(r.error_tipo_I, 1 / 3);
  assert.equal(r.error_tipo_II, 1 / 3);
  assert.equal(r.cumple, false);
});

test("hojas manuales: P1, P2, P4 con τ63, P5, P6, P9", () => {
  const hojas = {
    p1: [{ estacion: 1, repeticion: 1, desplazamiento_mm: 2 }, { estacion: 1, repeticion: 2, desplazamiento_mm: -4 }],
    p2: [{ lux_referencia: 0, lectura_mv: 100 }, { lux_referencia: 100, lectura_mv: 600 }, { lux_referencia: 200, lectura_mv: 1100 }],
    p4: [{ punto: "40", referencia_c: 40, ds18b20_c: 40.5 }, { punto: "40", referencia_c: 40, ds18b20_c: 40.3 }],
    p4r: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => ({ tiempo_s: t, temperatura_c: t < 1 ? 20 : t < 2 ? 30 : 40 })),
    p5: [{ condicion: "aire", lectura_mv: 400 }, { condicion: "alcohol", lectura_mv: 800 }],
    p6: [{ pwm: 150, rpm_referencia: 100, rpm_hall: 102 }, { pwm: 150, rpm_referencia: 100, rpm_hall: 98 }],
    p9: [{ falla_inducida: "IR desconectado", repeticion: 1, parada_segura: "si" }],
  };
  const r = analizar({ docs: [], hojas });
  assert.equal(r.p1.error_abs_medio, 3);
  assert.equal(r.p1.cumple, true);
  assert.equal(r.p2.r2, 1);
  assert.ok(Math.abs(r.p4.error_abs_peor - 0.4) < 1e-9);
  assert.ok(Math.abs(r.p4.tau63_s - 1.264) < 1e-9);   // 20→40 °C: 63,2 % = 32,64 °C
  assert.equal(r.p5.deteccion, 1);
  assert.equal(r.p6.error_pct_abs_medio, 2);
  assert.equal(r.p9.cumple, true);
});
