// API REST + Socket.IO + archivos del panel web (docs/specs/puente.md).
import http from "node:http";
import path from "node:path";
import express from "express";
import { Server } from "socket.io";
import { FASES_LIBRES, cmd, normalizarPlaca, validarCfg, CLAVES_CFG } from "./protocolo.js";
import { listarPuertos } from "./conexion.js";

export function crearServidor({ conexion, agregador, almacen, dirWeb, simulador }) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

  app.use(express.json());
  app.use(express.static(dirWeb));

  const enviar = (res, linea) => {
    if (!conexion.escribir(linea)) return res.status(503).json({ error: "El ESP32 no está conectado" });
    res.status(202).json({ enviado: linea });
  };

  const estado = () => ({
    conexion: { modo: simulador ? "simulado" : "serial", descripcion: conexion.descripcion, conectado: conexion.abierto },
    almacen: almacen.estado(),
    ...agregador.instantanea(),
    fallas: simulador?.fallas ?? null,
  });

  app.get("/api/estado", (_req, res) => res.json(estado()));

  app.post("/api/inspecciones", (req, res) => {
    const placa = normalizarPlaca(req.body?.placa);
    if (!placa) return res.status(400).json({ error: "Placa inválida: use de 1 a 10 letras, números o guiones" });
    const fase = agregador.linea.fase;
    if (fase && !FASES_LIBRES.includes(fase)) {
      return res.status(409).json({ error: `La línea está ocupada (${fase})` });
    }
    enviar(res, cmd.start(placa));
  });

  app.post("/api/stop", (_req, res) => enviar(res, cmd.stop()));
  app.post("/api/leer", (_req, res) => enviar(res, cmd.leer()));

  app.get("/api/config", async (_req, res) => {
    res.json({ guardada: await almacen.leerConfig(), dispositivo: agregador.config, claves: CLAVES_CFG });
  });

  app.post("/api/config", async (req, res) => {
    const { clave, valor } = req.body ?? {};
    const v = validarCfg(clave, valor);
    if (v.error) return res.status(400).json({ error: v.error });
    await almacen.guardarConfig({ [clave]: v.valor });
    enviar(res, cmd.cfg(clave, v.valor));
  });

  app.get("/api/inspecciones", async (req, res) => {
    res.json(await almacen.listar({ placa: req.query.placa, limite: req.query.limite }));
  });

  app.get("/api/inspecciones/:id", async (req, res) => {
    const doc = await almacen.obtener(req.params.id);
    if (!doc) return res.status(404).json({ error: "No existe esa inspección" });
    res.json(doc);
  });

  app.get("/api/estadisticas", async (_req, res) => res.json(await almacen.estadisticas()));

  app.get("/api/puertos", async (_req, res) => {
    try { res.json(await listarPuertos()); } catch (e) { res.status(500).json({ error: e.message }); }
  });

  if (simulador) {
    app.post("/api/simulador/fallas", (req, res) => {
      for (const k of Object.keys(simulador.fallas)) {
        if (typeof req.body?.[k] === "boolean") simulador.fallas[k] = req.body[k];
      }
      io.emit("estado", estado());
      res.json(simulador.fallas);
    });
  }

  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => res.sendFile(path.join(dirWeb, "index.html")));

  io.on("connection", (socket) => socket.emit("estado", estado()));

  return { app, server, io, estado };
}
