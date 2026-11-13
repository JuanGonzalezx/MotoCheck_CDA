# Puente MotoCheck (PC ↔ ESP32 ↔ MongoDB ↔ web)

Requisito: **Node.js 20 o superior** (https://nodejs.org, versión LTS).

```bash
cd software/puente
npm install
cp .env.example .env      # en Windows: copy .env.example .env
```

## Sin hardware (simulador)

```bash
npm run simular
```

Abrir http://localhost:3000. Un ESP32 virtual responde igual que el real. En "En vivo" se pueden activar fallas (faro débil, rueda frenada, atasco…) para probar los rechazos.

## Con el ESP32

1. Cargar `firmware/motocheck_esp32` desde Arduino IDE (ver `docs/specs/firmware.md`) y **cerrar el monitor serie**, porque solo un programa puede usar el puerto a la vez.
2. Ver qué puerto es el ESP32: `npm run puertos`.
3. En `.env`, poner `SERIAL_PORT=COM6` (o el que aparezca) y, si se quiere guardar en la nube, `MONGODB_URI=…` (ver `docs/specs/datos.md`).
4. `npm start` y abrir http://localhost:3000.

## Pruebas

```bash
npm test
```

API, eventos y comportamiento: `docs/specs/puente.md`.
