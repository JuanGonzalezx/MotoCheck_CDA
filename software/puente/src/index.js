// MotoCheck Lab — puente PC.
//   npm start            usa SERIAL_PORT del archivo .env
//   npm run simular      ESP32 virtual, sin hardware
//   npm run puertos      lista los puertos serie disponibles
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { parsearLinea, cmd, CLAVES_CFG } from "./protocolo.js";
import { Agregador } from "./agregador.js";
import { ConexionSerial, listarPuertos } from "./conexion.js";
import { Simulador } from "./simulador.js";
import { AlmacenArchivo, AlmacenMongo } from "./almacen.js";
import { crearServidor } from "./servidor.js";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(RAIZ, ".env") });

const args = process.argv.slice(2);
const hora = () => new Date().toLocaleTimeString("es-CO", { hour12: false });
const log = (...m) => console.log(`[${hora()}]`, ...m);

if (args.includes("--puertos")) {
  const puertos = await listarPuertos();
  if (!puertos.length) console.log("No se encontró ningún puerto serie. ¿Está conectado el ESP32 con un cable de datos?");
  for (const p of puertos) console.log(`${p.ruta}\t${p.fabricante}`);
  process.exit(0);
}

const modoSimulado = args.includes("--simular") || (process.env.SERIAL_PORT ?? "simulado") === "simulado";
const simulador = modoSimulado ? new Simulador({ velocidad: process.env.SIM_VELOCIDAD }) : null;
const conexion = simulador ?? new ConexionSerial({ ruta: process.env.SERIAL_PORT, baudios: Number(process.env.SERIAL_BAUD) || 115200 });

const dirDatos = path.join(RAIZ, "datos");
const almacen = process.env.MONGODB_URI
  ? new AlmacenMongo({ uri: process.env.MONGODB_URI, db: process.env.MONGODB_DB || "motocheck", dirLocal: dirDatos })
  : new AlmacenArchivo(dirDatos);
await almacen.conectar();
const ea = almacen.estado();
log(`Almacenamiento: ${ea.tipo}${ea.tipo === "mongodb" ? (ea.conectado ? " (conectado)" : ` (SIN CONEXIÓN: ${ea.error}; se guarda local y se sincroniza después)`) : ` en ${dirDatos}`}`);

const agregador = new Agregador({ origen: simulador ? "simulador" : "esp32" });
const dirWeb = path.resolve(RAIZ, "..", "web");
const { server, io, estado } = crearServidor({ conexion, agregador, almacen, dirWeb, simulador });

conexion.on("abierto", () => { log(`Conectado a ${conexion.descripcion}`); io.emit("estado", estado()); });
conexion.on("cerrado", () => { log("Conexión con el ESP32 cerrada; reintentando…"); io.emit("estado", estado()); });
conexion.on("aviso", (m) => log(m));

conexion.on("linea", (linea) => {
  const ts = new Date();
  const { msg, texto } = parsearLinea(linea);
  if (!msg) {
    if (texto) io.emit("log", { ts, texto });
    return;
  }
  agregador.procesar(msg, ts);
  io.emit("evento", { ...msg, ts });
  if (["estado", "inicio", "prueba", "config", "hola", "lecturas", "detenido", "error", "fin"].includes(msg.evt)) {
    io.emit("estado", estado());
  }
  if (msg.evt === "error" || msg.evt === "rechazado") log(`ESP32: ${msg.evt} — ${msg.motivo}`);
});

// Al reiniciar el ESP32 se pierden los umbrales: se reenvían los guardados.
agregador.on("hola", async (msg) => {
  log(`ESP32 listo (firmware ${msg.version})`);
  const guardada = await almacen.leerConfig();
  let retraso = 200;
  for (const [clave, valor] of Object.entries(guardada)) {
    if (!(clave in CLAVES_CFG)) continue;
    setTimeout(() => conexion.escribir(cmd.cfg(clave, valor)), retraso);
    retraso += 60;
  }
});

agregador.on("inspeccion", async (doc) => {
  await almacen.guardarInspeccion(doc);
  log(`Inspección ${doc.placa}: ${doc.resultado.toUpperCase()} (${(doc.duracion_ms / 1000).toFixed(1)} s)`);
  io.emit("inspeccion", doc);
  io.emit("estado", estado());
});

const PUERTO_WEB = Number(process.env.PORT) || 3000;
server.listen(PUERTO_WEB, () => {
  log(`Panel web: http://localhost:${PUERTO_WEB}`);
  log(simulador ? `Modo SIMULADO (velocidad ×${simulador.velocidad})` : `Abriendo ${conexion.descripcion}…`);
  conexion.abrir();
});

const salir = () => { conexion.cerrar(); server.close(); process.exit(0); };
process.on("SIGINT", salir);
process.on("SIGTERM", salir);
