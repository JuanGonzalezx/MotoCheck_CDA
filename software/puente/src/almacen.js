// Almacenamiento de inspecciones y configuración (docs/specs/datos.md).
// - AlmacenArchivo: JSON Lines en datos/ (sin internet, o cuando no hay MONGODB_URI).
// - AlmacenMongo: MongoDB Atlas. Si Atlas no responde, guarda en archivo como
//   "pendiente" y sincroniza cuando vuelve la conexión.
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";

const revivir = (doc) => ({ ...doc, inicio: new Date(doc.inicio), fin: new Date(doc.fin) });

function filtrar(docs, { placa, limite = 50 } = {}) {
  const p = placa ? String(placa).toUpperCase() : null;
  return docs
    .filter((d) => !p || d.placa.includes(p))
    .sort((a, b) => b.inicio - a.inicio)
    .slice(0, Math.min(Number(limite) || 50, 1000));
}

export function calcularEstadisticas(docs) {
  const completas = docs.filter((d) => d.resultado === "aprobada" || d.resultado === "rechazada");
  const aprobadas = completas.filter((d) => d.aprobada).length;
  const porPrueba = {};
  for (const d of completas) {
    for (const p of d.pruebas) {
      porPrueba[p.tipo] ??= { total: 0, fallas: 0, valores: [] };
      porPrueba[p.tipo].total++;
      if (!p.ok) porPrueba[p.tipo].fallas++;
      // Para el faro se analiza el contraste (valor − luz ambiente), que es lo que se evalúa
      const v = p.tipo === "luz" && Number.isFinite(p.base) ? p.valor - p.base : p.valor;
      if (Number.isFinite(v) && v > -999) porPrueba[p.tipo].valores.push(v);
    }
  }
  for (const v of Object.values(porPrueba)) {
    const n = v.valores.length;
    const media = n ? v.valores.reduce((a, b) => a + b, 0) / n : null;
    const desv = n > 1 ? Math.sqrt(v.valores.reduce((a, b) => a + (b - media) ** 2, 0) / (n - 1)) : null;
    v.media = media;
    v.desviacion = desv;
    v.cv_pct = media && desv != null ? (100 * desv) / Math.abs(media) : null;
    delete v.valores;
  }
  const duraciones = completas.map((d) => d.duracion_ms).filter(Number.isFinite);
  return {
    total: docs.length,
    completas: completas.length,
    aprobadas,
    rechazadas: completas.length - aprobadas,
    errores: docs.filter((d) => d.resultado === "error").length,
    detenidas: docs.filter((d) => d.resultado === "detenida").length,
    tasa_aprobacion: completas.length ? aprobadas / completas.length : null,
    duracion_media_ms: duraciones.length ? duraciones.reduce((a, b) => a + b, 0) / duraciones.length : null,
    por_prueba: porPrueba,
  };
}

export class AlmacenArchivo {
  constructor(dir) {
    this.tipo = "archivo";
    this.dir = dir;
    fs.mkdirSync(dir, { recursive: true });
    this.rutaInsp = path.join(dir, "inspecciones.jsonl");
    this.rutaConfig = path.join(dir, "config.json");
    this.docs = fs.existsSync(this.rutaInsp)
      ? fs.readFileSync(this.rutaInsp, "utf8").split("\n").filter(Boolean).map((l) => revivir(JSON.parse(l)))
      : [];
  }

  async conectar() {}
  estado() { return { tipo: this.tipo, conectado: true, ruta: this.dir, pendientes: 0 }; }

  async guardarInspeccion(doc) {
    fs.appendFileSync(this.rutaInsp, JSON.stringify(doc) + "\n");
    this.docs.push(doc);
    return doc;
  }

  async listar(opciones) { return filtrar(this.docs, opciones); }
  async obtener(id) { return this.docs.find((d) => d.id === id) ?? null; }
  async estadisticas() { return calcularEstadisticas(this.docs); }

  async leerConfig() {
    return fs.existsSync(this.rutaConfig) ? JSON.parse(fs.readFileSync(this.rutaConfig, "utf8")) : {};
  }

  async guardarConfig(valores) {
    const actual = { ...(await this.leerConfig()), ...valores };
    fs.writeFileSync(this.rutaConfig, JSON.stringify(actual, null, 2));
    return actual;
  }
}

export class AlmacenMongo {
  constructor({ uri, db, dirLocal }) {
    this.tipo = "mongodb";
    this.uri = uri;
    this.nombreDb = db;
    this.local = new AlmacenArchivo(dirLocal);
    this.rutaPendientes = path.join(dirLocal, "pendientes.jsonl");
    this.conectado = false;
    this.ultimoError = null;
  }

  async conectar() {
    try {
      this.cliente = new MongoClient(this.uri, { serverSelectionTimeoutMS: 5000 });
      await this.cliente.connect();
      this.db = this.cliente.db(this.nombreDb);
      this.insp = this.db.collection("inspecciones");
      this.conf = this.db.collection("configuracion");
      await this.insp.createIndex({ id: 1 }, { unique: true });
      await this.insp.createIndex({ placa: 1, inicio: -1 });
      this.conectado = true;
      this.ultimoError = null;
      await this.sincronizar();
    } catch (e) {
      this.conectado = false;
      this.ultimoError = e.message;
    }
    clearInterval(this.timer);
    this.timer = setInterval(() => this.reintentar(), 30000);
    this.timer.unref();
  }

  async reintentar() {
    if (!this.conectado) return this.conectar();
    return this.sincronizar();
  }

  pendientes() {
    return fs.existsSync(this.rutaPendientes)
      ? fs.readFileSync(this.rutaPendientes, "utf8").split("\n").filter(Boolean).map((l) => revivir(JSON.parse(l)))
      : [];
  }

  async sincronizar() {
    const lista = this.pendientes();
    if (!lista.length || !this.conectado) return 0;
    for (const doc of lista) {
      await this.insp.updateOne({ id: doc.id }, { $setOnInsert: doc }, { upsert: true });
    }
    fs.unlinkSync(this.rutaPendientes);
    return lista.length;
  }

  estado() {
    return { tipo: this.tipo, conectado: this.conectado, base: this.nombreDb, pendientes: this.pendientes().length, error: this.ultimoError };
  }

  async guardarInspeccion(doc) {
    await this.local.guardarInspeccion(doc);  // copia local siempre (respaldo)
    try {
      if (!this.conectado) throw new Error("sin conexión a MongoDB");
      await this.insp.insertOne({ ...doc });
    } catch (e) {
      this.conectado = false;
      this.ultimoError = e.message;
      fs.appendFileSync(this.rutaPendientes, JSON.stringify(doc) + "\n");
    }
    return doc;
  }

  async listar(opciones = {}) {
    if (!this.conectado) return this.local.listar(opciones);
    const q = opciones.placa ? { placa: { $regex: String(opciones.placa).toUpperCase().replace(/[^A-Z0-9-]/g, "") } } : {};
    const limite = Math.min(Number(opciones.limite) || 50, 1000);
    return this.insp.find(q, { projection: { _id: 0 } }).sort({ inicio: -1 }).limit(limite).toArray();
  }

  async obtener(id) {
    if (!this.conectado) return this.local.obtener(id);
    return this.insp.findOne({ id }, { projection: { _id: 0 } });
  }

  async estadisticas() {
    if (!this.conectado) return this.local.estadisticas();
    const docs = await this.insp.find({}, { projection: { _id: 0 } }).sort({ inicio: -1 }).limit(5000).toArray();
    return calcularEstadisticas(docs);
  }

  async leerConfig() {
    if (!this.conectado) return this.local.leerConfig();
    const d = await this.conf.findOne({ _id: "umbrales" });
    return d?.valores ?? (await this.local.leerConfig());
  }

  async guardarConfig(valores) {
    const actual = await this.local.guardarConfig(valores);
    if (this.conectado) {
      await this.conf.updateOne({ _id: "umbrales" }, { $set: { valores: actual, actualizado: new Date() } }, { upsert: true });
    }
    return actual;
  }
}
