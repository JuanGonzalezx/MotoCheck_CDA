// Conexión con el ESP32 por USB serial, con reconexión automática.
// Emite: "linea" (texto recibido), "abierto", "cerrado", "aviso" (mensaje).
import { EventEmitter } from "node:events";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";

export async function listarPuertos() {
  const puertos = await SerialPort.list();
  return puertos.map((p) => ({ ruta: p.path, fabricante: p.manufacturer ?? "", serie: p.serialNumber ?? "" }));
}

export class ConexionSerial extends EventEmitter {
  constructor({ ruta, baudios = 115200, reintentoMs = 3000 }) {
    super();
    this.ruta = ruta;
    this.baudios = baudios;
    this.reintentoMs = reintentoMs;
    this.puerto = null;
    this.abierto = false;
    this.detenido = false;
  }

  get descripcion() { return `${this.ruta} @ ${this.baudios}`; }

  abrir() {
    if (this.detenido) return;
    const puerto = new SerialPort({ path: this.ruta, baudRate: this.baudios, autoOpen: false });
    const lector = puerto.pipe(new ReadlineParser({ delimiter: "\n" }));
    lector.on("data", (linea) => this.emit("linea", linea));
    puerto.on("close", () => {
      this.abierto = false;
      this.emit("cerrado");
      this.reintentar();
    });
    puerto.on("error", (e) => this.emit("aviso", `serial: ${e.message}`));
    puerto.open((err) => {
      if (err) {
        this.emit("aviso", `no se pudo abrir ${this.ruta}: ${err.message}`);
        this.reintentar();
        return;
      }
      this.puerto = puerto;
      this.abierto = true;
      this.emit("abierto");
    });
  }

  reintentar() {
    if (this.detenido) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.abrir(), this.reintentoMs);
  }

  escribir(linea) {
    if (!this.abierto || !this.puerto) return false;
    this.puerto.write(`${linea}\n`);
    return true;
  }

  cerrar() {
    this.detenido = true;
    clearTimeout(this.timer);
    if (this.puerto?.isOpen) this.puerto.close();
  }
}
