// ESP32 virtual: responde a los mismos comandos y emite los mismos eventos que
// firmware/motocheck_esp32 (docs/specs/protocolo_serial.md), con tiempos reales
// divididos por `velocidad`. Sirve para desarrollar el panel sin hardware.
import { EventEmitter } from "node:events";
import { configPorDefecto, validarCfg } from "./protocolo.js";

const T = { servo: 700, avance: 2500, luz: 1500, temp: 6000, gas: 4000, giro: 3000, salida: 3000, calentamiento: 3000 };

const azar = (media, desv) => {
  // Box-Muller
  const u = 1 - Math.random(), v = Math.random();
  return media + desv * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const r = (x, d = 0) => Number(x.toFixed(d));

export class Simulador extends EventEmitter {
  constructor({ velocidad = 1 } = {}) {
    super();
    this.velocidad = Math.max(0.1, Number(velocidad) || 1);
    this.cfg = configPorDefecto();
    this.fallas = { faro: false, temp: false, gas: false, rueda: false, atasco: false };
    this.fase = "CALENTANDO";
    this.estacion = 1;
    this.ciclo = 0;          // cambia con cada START/STOP para cancelar el ciclo anterior
    this.abierto = false;
  }

  get descripcion() { return "simulado"; }

  abrir() {
    this.abierto = true;
    setTimeout(() => {
      this.enviar({ evt: "hola", equipo: "MotoCheck Lab", version: "0.2-sim" });
      this.enviarConfig();
      this.estado("CALENTANDO", 1);
      setTimeout(() => this.fase === "CALENTANDO" && this.estado("ESPERA", 1), T.calentamiento / this.velocidad);
    }, 50);
    this.emit("abierto");
  }

  cerrar() { this.abierto = false; this.ciclo++; }

  enviar(obj) { if (this.abierto) this.emit("linea", JSON.stringify(obj)); }

  estado(fase, estacion) {
    this.fase = fase;
    this.estacion = estacion;
    this.enviar({ evt: "estado", fase, estacion });
  }

  enviarConfig() { this.enviar({ evt: "config", ...this.cfg }); }

  escribir(linea) {
    const c = String(linea).trim();
    if (c.startsWith("START;")) {
      if (["ESPERA", "FIN", "ERROR"].includes(this.fase)) this.inspeccionar(c.slice(6));
      else this.enviar({ evt: "rechazado", motivo: `linea ocupada (${this.fase})` });
    } else if (c === "STOP") {
      this.ciclo++;
      this.enviar({ evt: "detenido" });
      this.estado("ESPERA", this.estacion);
    } else if (c.startsWith("CFG;")) {
      const [clave, valor] = c.slice(4).split("=");
      const v = validarCfg(clave, valor);
      if (v.error) this.enviar({ evt: "cfg", ok: false, clave });
      else {
        this.cfg[clave] = v.valor;
        this.enviar({ evt: "cfg", ok: true, clave, valor: v.valor });
      }
    } else if (c === "CONFIG") {
      this.enviarConfig();
    } else if (c === "PING") {
      this.enviar({ evt: "pong", estado: this.fase });
    } else if (c === "LEER") {
      this.enviar({ evt: "lecturas", luz_mv: r(azar(130, 15)), gas_mv: r(azar(410, 10)), ir: [0, 0, 0, 0], pulsos: 0 });
    } else if (c) {
      this.enviar({ evt: "rechazado", motivo: "comando desconocido" });
    }
    return this.abierto;
  }

  async inspeccionar(placa) {
    const ciclo = ++this.ciclo;
    const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms / this.velocidad));
    const vivo = () => ciclo === this.ciclo && this.abierto;
    const t0 = Date.now();
    const base = { luz_mv: r(azar(120, 10)), gas_mv: r(azar(410, 12)) };
    const resultados = [];

    await esperar(1100);
    if (!vivo()) return;
    this.enviar({ evt: "base", ...base });
    this.enviar({ evt: "inicio", placa });

    for (let e = 1; e <= 4; e++) {
      this.estado("AVANZANDO", e);
      if (this.fallas.atasco && e === 3) {
        await esperar(this.cfg.timeout);
        if (!vivo()) return;
        this.enviar({ evt: "error", estacion: e, motivo: "la moto no llego a la estacion" });
        this.estado("ERROR", e);
        return;
      }
      await esperar(T.avance);
      if (!vivo()) return;
      this.estado("DESPLEGANDO", e);
      await esperar(T.servo);
      if (!vivo()) return;
      this.estado("MIDIENDO", e);
      const prueba = this.medir(e, base);
      await esperar(prueba.duracion);
      if (!vivo()) return;
      this.enviar({ evt: "prueba", ...prueba.msg });
      resultados.push(prueba.msg.ok);
      this.estado("RETIRANDO", e);
      await esperar(T.servo);
      if (!vivo()) return;
    }
    this.estado("SALIENDO", 4);
    await esperar(T.salida);
    if (!vivo()) return;
    this.enviar({
      evt: "fin", placa, aprobada: resultados.every(Boolean), pruebas: resultados,
      duracion_ms: Math.round((Date.now() - t0) * this.velocidad),
    });
    this.estado("FIN", 4);
  }

  medir(e, base) {
    const c = this.cfg, f = this.fallas;
    if (e === 1) {
      const valor = r(base.luz_mv + (f.faro ? azar(300, 60) : azar(1500, 80)));
      return { duracion: T.luz, msg: { tipo: "luz", valor, base: base.luz_mv, unidad: "mV", min: c.luz_min, ok: valor - base.luz_mv >= c.luz_min, n: 30 } };
    }
    if (e === 2) {
      const valor = r(f.temp ? azar(75, 4) : azar(42, 3), 2);
      return { duracion: T.temp, msg: { tipo: "temp", valor, unidad: "C", min: c.temp_min, max: c.temp_max, ok: valor >= c.temp_min && valor <= c.temp_max } };
    }
    if (e === 3) {
      const valor = r(f.gas ? azar(2.4, 0.3) : azar(1.1, 0.08), 2);
      return { duracion: T.gas, msg: { tipo: "gas", valor, base_mv: base.gas_mv, unidad: "rel", max: c.gas_max, ok: valor <= c.gas_max, n: 80 } };
    }
    const valor = r(f.rueda ? azar(70, 10) : azar(180, 6), 1);
    const cv = r(Math.abs(f.rueda ? azar(18, 4) : azar(3, 1)), 1);
    const inercia = Math.round(f.rueda ? azar(400, 80) : azar(1400, 150));
    return {
      duracion: T.giro + inercia,
      msg: { tipo: "rpm", valor, cv, inercia_ms: inercia, pulsos: Math.round((valor / 60) * 3), unidad: "rpm", min: c.rpm_min, max: c.rpm_max, ok: valor >= c.rpm_min && valor <= c.rpm_max && cv <= c.cv_max },
    };
  }
}
