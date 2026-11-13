// Convierte el flujo de eventos del ESP32 en el estado de la línea
// y en un documento por inspección (docs/specs/datos.md).
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";

export class Agregador extends EventEmitter {
  constructor({ origen = "esp32" } = {}) {
    super();
    this.origen = origen;
    this.linea = { fase: null, estacion: null, firmware: null, actualizado: null };
    this.config = null;       // última config reportada por el ESP32
    this.lecturas = null;     // última respuesta a LEER
    this.actual = null;       // inspección en curso
    this.basePendiente = null;
  }

  procesar(msg, ts = new Date()) {
    switch (msg.evt) {
      case "hola":
        this.linea.firmware = msg.version ?? null;
        this.descartarActual("reinicio del controlador", ts);
        this.emit("hola", msg);
        break;
      case "estado":
        this.linea.fase = msg.fase;
        this.linea.estacion = msg.estacion ?? null;
        this.linea.actualizado = ts;
        break;
      case "config": {
        const { evt, ...valores } = msg;
        this.config = valores;
        break;
      }
      case "base":
        this.basePendiente = { luz_mv: msg.luz_mv, gas_mv: msg.gas_mv };
        break;
      case "inicio":
        this.actual = {
          id: randomUUID(),
          placa: msg.placa,
          inicio: ts,
          linea_base: this.basePendiente,
          pruebas: [],
        };
        this.basePendiente = null;
        break;
      case "prueba":
        if (this.actual) {
          const { evt, ...prueba } = msg;
          this.actual.pruebas.push({ ...prueba, ts });
        }
        break;
      case "fin":
        if (this.actual) {
          this.cerrar(msg.aprobada ? "aprobada" : "rechazada", ts, { duracion_ms: msg.duracion_ms });
        }
        break;
      case "error":
        if (this.actual) {
          this.cerrar("error", ts, { motivo: msg.motivo, estacion_error: msg.estacion });
        }
        break;
      case "detenido":
        this.descartarActual("detenida por el operador", ts);
        break;
      case "lecturas": {
        const { evt, ...valores } = msg;
        this.lecturas = { ...valores, ts };
        break;
      }
    }
  }

  descartarActual(motivo, ts) {
    if (this.actual) this.cerrar("detenida", ts, { motivo });
  }

  cerrar(resultado, ts, extra) {
    const a = this.actual;
    this.actual = null;
    const doc = {
      id: a.id,
      placa: a.placa,
      resultado,
      aprobada: resultado === "aprobada",
      inicio: a.inicio,
      fin: ts,
      duracion_ms: extra.duracion_ms ?? ts - a.inicio,
      linea_base: a.linea_base,
      pruebas: a.pruebas,
      origen: this.origen,
      firmware: this.linea.firmware,
      config: this.config,
      ...(extra.motivo ? { motivo: extra.motivo } : {}),
      ...(extra.estacion_error ? { estacion_error: extra.estacion_error } : {}),
    };
    this.emit("inspeccion", doc);
  }

  instantanea() {
    return { linea: this.linea, config: this.config, lecturas: this.lecturas, actual: this.actual };
  }
}
