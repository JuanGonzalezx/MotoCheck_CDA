# Spec — Puente PC y panel web

`software/puente` (Node.js) conecta el ESP32 con la nube y con el panel web (`software/web`). Es la capa de supervisión, al estilo de un SCADA.

```
ESP32 ──USB──► ConexionSerial ─┐
   (o Simulador)               ├─► parsearLinea ─► Agregador ─► AlmacenMongo / AlmacenArchivo
                               │                       │
                               └──────── Socket.IO ◄───┴──► panel web (HTTP :3000)
```

## Configuración (`software/puente/.env`)

| Variable | Defecto | Uso |
|---|---|---|
| `SERIAL_PORT` | `simulado` | `COM6`, `/dev/cu.usbserial-…` o `simulado` |
| `SERIAL_BAUD` | `115200` | Debe coincidir con el firmware |
| `MONGODB_URI` | vacío | Cadena de Atlas. Si está vacía, se guarda solo en archivos |
| `MONGODB_DB` | `motocheck` | Nombre de la base |
| `PORT` | `3000` | Puerto del panel web |
| `SIM_VELOCIDAD` | `1` | Solo en modo simulado: multiplica la velocidad |

## API REST

| Método y ruta | Cuerpo | Respuesta |
|---|---|---|
| `GET /api/estado` | — | conexión, almacén, línea (fase, estación), config, lecturas, inspección en curso, fallas del simulador |
| `POST /api/inspecciones` | `{ placa }` | `202` (envía `START;PLACA`) · `400` placa inválida · `409` línea ocupada · `503` ESP32 desconectado |
| `POST /api/stop` | — | `202` (envía `STOP`) |
| `POST /api/leer` | — | `202` (envía `LEER`; la respuesta llega por Socket.IO) |
| `GET /api/config` | — | `{ guardada, dispositivo, claves }` |
| `POST /api/config` | `{ clave, valor }` | `202` (guarda y envía `CFG`) · `400` fuera de rango |
| `GET /api/inspecciones?placa=&limite=` | — | lista, de la más reciente a la más antigua (máximo 1000) |
| `GET /api/inspecciones/:id` | — | documento · `404` |
| `GET /api/estadisticas` | — | totales, tasa de aprobación, tiempo de ciclo medio y por prueba (n, fallas, media, DE, CV) |
| `GET /api/puertos` | — | puertos serie disponibles |
| `POST /api/simulador/fallas` | `{ faro?, temp?, gas?, rueda?, atasco? }` | solo en modo simulado |

## Eventos de Socket.IO (servidor → panel)

| Evento | Contenido |
|---|---|
| `estado` | Lo mismo que `GET /api/estado`; se envía al conectarse y en cada cambio |
| `evento` | Cada mensaje JSON del ESP32, con `ts` |
| `inspeccion` | El documento guardado al cerrar una inspección |
| `log` | Líneas del ESP32 que no son JSON |

## Comportamiento (criterios de aceptación)

- **P1.** Si el ESP32 se desconecta, el puente reintenta cada 3 s sin caerse; el panel muestra "ESP32 desconectado".
- **P2.** Cuando el ESP32 envía `hola` (reinicio), el puente le reenvía los umbrales guardados.
- **P3.** Toda inspección iniciada termina en un documento (aprobada, rechazada, error o detenida), incluso si el ESP32 se reinicia a mitad del ciclo.
- **P4.** Sin internet, la operación sigue y los datos se sincronizan después (ver [datos.md](datos.md)).
- **P5.** El panel permite descargar un CSV (separado por `;` y con coma decimal, para Excel en español) con todas las inspecciones, para la sección de Resultados.

## Pruebas automáticas

```bash
cd software/puente && npm test
```

Cubren el protocolo, el flujo completo con el simulador (aprobada, rechazada, error por atasco, STOP, START ocupado) y el almacenamiento en archivo.
