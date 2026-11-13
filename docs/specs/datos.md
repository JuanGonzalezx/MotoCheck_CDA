# Spec — Datos (MongoDB Atlas)

Base de datos: `motocheck` (se cambia con `MONGODB_DB`). La escribe el puente (`software/puente/src/almacen.js`).

## Colección `inspecciones`

Un documento por moto que entra a la línea, sin importar cómo termine.

```js
{
  id: "6f1c…",                 // UUID generado por el puente (índice único)
  placa: "ABC12D",
  resultado: "aprobada",       // aprobada | rechazada | error | detenida
  aprobada: true,
  inicio: ISODate, fin: ISODate,
  duracion_ms: 41230,          // la mide el ESP32 (en error o detenida, la mide el puente)
  linea_base: { luz_mv: 120, gas_mv: 410 },
  pruebas: [                   // en el orden de las estaciones; puede tener menos de 4 si hubo error
    { tipo: "luz",  valor: 1650, base: 120, unidad: "mV", min: 900, ok: true, n: 30, ts: ISODate },
    { tipo: "temp", valor: 41.25, unidad: "C", min: 30, max: 60, ok: true, ts: ISODate },
    { tipo: "gas",  valor: 1.12, base_mv: 410, unidad: "rel", max: 1.5, ok: true, n: 80, ts: ISODate },
    { tipo: "rpm",  valor: 182.4, cv: 3.1, inercia_ms: 1450, pulsos: 12, unidad: "rpm", min: 80, max: 400, ok: true, ts: ISODate }
  ],
  motivo: "la moto no llego a la estacion",   // solo en error o detenida
  estacion_error: 3,                          // solo en error
  origen: "esp32",             // esp32 | simulador. Los datos del artículo se filtran por origen = esp32
  firmware: "0.2",
  config: { luz_min: 900, … }  // umbrales vigentes en ese momento (trazabilidad)
}
```

Índices: `{ id: 1 }` único y `{ placa: 1, inicio: -1 }`.

## Colección `configuracion`

```js
{ _id: "umbrales", valores: { luz_min: 900, temp_min: 30, … }, actualizado: ISODate }
```

## Respaldo local y modo sin internet

- Toda inspección se escribe también en `software/puente/datos/inspecciones.jsonl` (una línea JSON por inspección).
- Si Atlas no responde, la inspección queda en `datos/pendientes.jsonl` y el puente reintenta cada 30 s. Al reconectar sube las pendientes sin duplicarlas (*upsert* por `id`).
- Sin `MONGODB_URI`, todo se guarda solo en archivos. Así la línea funciona en la feria aunque no haya internet.
- La carpeta `datos/` está en `.gitignore`.

## Cómo crear el clúster de Atlas (una sola vez)

1. Entrar a https://cloud.mongodb.com, crear un proyecto "MotoCheck" y un clúster **M0 (gratis)**.
2. *Database Access* → crear un usuario con contraseña, rol *Read and write to any database*.
3. *Network Access* → *Add IP Address*. Para la clase y la feria se puede usar `0.0.0.0/0`; quitarla al terminar el semestre.
4. *Connect → Drivers → Node.js* → copiar la cadena `mongodb+srv://…` y pegarla en `software/puente/.env` como `MONGODB_URI`.
