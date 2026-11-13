import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parsearLinea, normalizarPlaca, validarCfg } from "../src/protocolo.js";
import { Agregador } from "../src/agregador.js";
import { Simulador } from "../src/simulador.js";
import { AlmacenArchivo } from "../src/almacen.js";

// Conecta simulador -> agregador y devuelve la próxima inspección cerrada
function montar(velocidad = 400) {
  const sim = new Simulador({ velocidad });
  const ag = new Agregador({ origen: "simulador" });
  sim.on("linea", (l) => { const { msg } = parsearLinea(l); if (msg) ag.procesar(msg); });
  const proxima = () => new Promise((ok) => ag.once("inspeccion", ok));
  const listo = new Promise((ok) => {
    const ver = () => (ag.linea.fase === "ESPERA" ? ok() : setTimeout(ver, 5));
    ver();
  });
  sim.abrir();
  return { sim, ag, proxima, listo };
}

test("parsearLinea separa JSON de texto", () => {
  assert.deepEqual(parsearLinea('{"evt":"pong","estado":"ESPERA"}').msg, { evt: "pong", estado: "ESPERA" });
  assert.equal(parsearLinea("ets Jun  8 2016 00:22:57").texto, "ets Jun  8 2016 00:22:57");
  assert.ok(parsearLinea('{"sin":"evt"}').texto);
  assert.ok(parsearLinea("{roto").texto);
});

test("normalizarPlaca y validarCfg", () => {
  assert.equal(normalizarPlaca(" abc 12d "), "ABC12D");
  assert.equal(normalizarPlaca("ABC;12D"), null);
  assert.equal(normalizarPlaca(""), null);
  assert.deepEqual(validarCfg("pwm_banda", "120.6"), { valor: 121 });
  assert.ok(validarCfg("pwm_banda", 300).error);
  assert.ok(validarCfg("inventada", 1).error);
});

test("inspección completa aprobada con el simulador", async () => {
  const { sim, proxima, listo } = montar();
  await listo;
  const p = proxima();
  sim.escribir("START;ABC12D");
  const doc = await p;
  assert.equal(doc.placa, "ABC12D");
  assert.equal(doc.resultado, "aprobada");
  assert.deepEqual(doc.pruebas.map((x) => x.tipo), ["luz", "temp", "gas", "rpm"]);
  assert.ok(doc.linea_base.luz_mv > 0);
  sim.cerrar();
});

test("fallas activadas producen rechazo en la prueba correspondiente", async () => {
  const { sim, proxima, listo } = montar();
  await listo;
  sim.fallas.rueda = true;
  const p = proxima();
  sim.escribir("START;XYZ99");
  const doc = await p;
  assert.equal(doc.resultado, "rechazada");
  assert.equal(doc.pruebas.find((x) => x.tipo === "rpm").ok, false);
  assert.equal(doc.pruebas.find((x) => x.tipo === "luz").ok, true);
  sim.cerrar();
});

test("atasco termina en error con la estación", async () => {
  const { sim, proxima, listo } = montar(2000);
  await listo;
  sim.fallas.atasco = true;
  const p = proxima();
  sim.escribir("START;ERR1");
  const doc = await p;
  assert.equal(doc.resultado, "error");
  assert.equal(doc.estacion_error, 3);
  sim.cerrar();
});

test("STOP durante la inspección la cierra como detenida", async () => {
  const { sim, proxima, listo } = montar(20);
  await listo;
  const p = proxima();
  sim.escribir("START;STOP1");
  await new Promise((ok) => setTimeout(ok, 120));
  sim.escribir("STOP");
  const doc = await p;
  assert.equal(doc.resultado, "detenida");
  sim.cerrar();
});

test("START con la línea ocupada se rechaza", async () => {
  const { sim, listo } = montar(20);
  await listo;
  const rechazos = [];
  sim.on("linea", (l) => { const { msg } = parsearLinea(l); if (msg?.evt === "rechazado") rechazos.push(msg); });
  sim.escribir("START;A1");
  await new Promise((ok) => setTimeout(ok, 100));
  sim.escribir("START;A2");
  assert.equal(rechazos.length, 1);
  sim.escribir("STOP");
  sim.cerrar();
});

test("AlmacenArchivo guarda, lista, persiste y calcula estadísticas", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "motocheck-"));
  const a = new AlmacenArchivo(dir);
  const base = { linea_base: null, origen: "test", firmware: "t", config: null };
  const mk = (id, placa, aprobada, t) => ({
    ...base, id, placa, resultado: aprobada ? "aprobada" : "rechazada", aprobada,
    inicio: new Date(t), fin: new Date(t + 30000), duracion_ms: 30000,
    pruebas: [{ tipo: "luz", valor: aprobada ? 1600 : 400, ok: aprobada }],
  });
  await a.guardarInspeccion(mk("1", "AAA11", true, 1000));
  await a.guardarInspeccion(mk("2", "BBB22", false, 2000));
  const otra = new AlmacenArchivo(dir);  // relee desde disco
  const lista = await otra.listar({});
  assert.deepEqual(lista.map((d) => d.id), ["2", "1"]);
  assert.equal((await otra.listar({ placa: "aaa" })).length, 1);
  const e = await otra.estadisticas();
  assert.equal(e.tasa_aprobacion, 0.5);
  assert.equal(e.por_prueba.luz.fallas, 1);
  await otra.guardarConfig({ luz_min: 800 });
  assert.deepEqual(await new AlmacenArchivo(dir).leerConfig(), { luz_min: 800 });
});
