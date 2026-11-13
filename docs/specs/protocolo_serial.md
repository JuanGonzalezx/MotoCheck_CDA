# Spec — Protocolo serial ESP32 ↔ PC (v0.2)

> **Contrato.** Este documento define cómo se hablan el firmware (`firmware/motocheck_esp32`) y el puente (`software/puente`), que lo sigue en `src/protocolo.js`. Si se cambia un mensaje, primero se cambia aquí y luego en los dos lados. El simulador del puente produce exactamente estos mismos mensajes.

## Transporte

- USB serial (CP2102 o CH340 del ESP32 DevKit), **115200 baudios, 8N1**.
- Una línea por mensaje, terminada en `\n`. El ESP32 puede enviar también `\r\n`; el puente recorta los espacios.
- **ESP32 → PC:** JSON de una sola línea, con el campo obligatorio `evt`.
- **PC → ESP32:** texto plano, con un comando por línea.
- Las líneas que no son JSON (por ejemplo, el log de arranque del ESP32) se ignoran y solo se registran.

## Comandos PC → ESP32

| Comando | Cuándo se acepta | Respuesta |
|---|---|---|
| `START;<placa>` | En `ESPERA`, `FIN` o `ERROR` | `base`, `inicio`, `estado`… En otro estado: `rechazado` |
| `STOP` | Siempre | `detenido` y `estado` (`ESPERA`) |
| `CFG;<clave>=<valor>` | Siempre | `cfg` con `ok` en true o false |
| `CONFIG` | Siempre | `config` |
| `PING` | Siempre | `pong` |
| `LEER` | Siempre | `lecturas` |

**Placa:** de 1 a 10 caracteres `[A-Z0-9-]`. El puente la valida y la convierte a mayúsculas antes de enviarla.

**Claves de `CFG`:**

| Clave | Tipo | Defecto | Rango sugerido | Significado |
|---|---|---|---|---|
| `pwm_banda` | int | 150 | 0–255 | Velocidad de la banda |
| `pwm_rodillo` | int | 170 | 0–255 | Velocidad del rodillo de la rueda |
| `servo_reposo` | int | 0 | 0–180 | Ángulo del brazo retirado |
| `servo_medida` | int | 90 | 0–180 | Ángulo del brazo desplegado |
| `luz_min` | float mV | 900 | 0–3300 | Contraste mínimo entre el faro y el ambiente |
| `temp_min` / `temp_max` | float °C | 30 / 60 | −10–125 | Ventana de temperatura aceptada |
| `gas_max` | float | 1.5 | 1.0–10 | Relación máxima lectura / línea base |
| `rpm_min` / `rpm_max` | float | 80 / 400 | 0–2000 | Ventana de RPM |
| `cv_max` | float % | 10 | 0–100 | Coeficiente de variación máximo (estabilidad) |
| `timeout` | ms | 15000 | 3000–60000 | Tiempo máximo para que la moto llegue a una estación |

## Eventos ESP32 → PC

| `evt` | Campos | Cuándo |
|---|---|---|
| `hola` | `equipo`, `version` | Al arrancar |
| `config` | todas las claves de `CFG` | Al arrancar y con `CONFIG` |
| `estado` | `fase`, `estacion` (1–4) | En cada cambio de estado |
| `base` | `luz_mv`, `gas_mv` | Al iniciar una inspección |
| `inicio` | `placa` | Al iniciar una inspección |
| `prueba` | `tipo`, `valor`, `unidad`, `ok` y extras por tipo | Al terminar cada estación |
| `fin` | `placa`, `aprobada`, `pruebas[4]`, `duracion_ms` | Al salir la moto |
| `error` | `estacion`, `motivo` | Tiempo agotado u otra falla; la línea queda en `ERROR` |
| `detenido` | — | Después de `STOP` |
| `rechazado` | `motivo` | `START` con la línea ocupada o comando desconocido |
| `cfg` | `ok`, `clave`, `valor` | Respuesta a `CFG` |
| `pong` | `estado` | Respuesta a `PING` |
| `lecturas` | `luz_mv`, `gas_mv`, `ir[4]` (1 = moto presente), `pulsos` | Respuesta a `LEER` |

**Valores de `fase`:** `CALENTANDO`, `ESPERA`, `AVANZANDO`, `DESPLEGANDO`, `MIDIENDO`, `RETIRANDO`, `SALIENDO`, `FIN`, `ERROR`.

**Campos de `prueba` según su `tipo`** (las estaciones van en este orden: luz, temp, gas, rpm):

| `tipo` | `unidad` | Extras | Criterio de `ok` |
|---|---|---|---|
| `luz` | `mV` | `base`, `min`, `n` | `valor − base ≥ min` |
| `temp` | `C` | `min`, `max` | `min ≤ valor ≤ max`. `valor = −999` significa que no hay sensor |
| `gas` | `rel` | `base_mv`, `max`, `n` | `valor ≤ max` |
| `rpm` | `rpm` | `cv`, `inercia_ms`, `pulsos`, `min`, `max` | `min ≤ valor ≤ max` y `cv ≤ cv_max` |

## Ejemplo de una inspección completa

```
→ START;ABC12D
← {"evt":"base","luz_mv":120,"gas_mv":410}
← {"evt":"inicio","placa":"ABC12D"}
← {"evt":"estado","fase":"AVANZANDO","estacion":1}
← {"evt":"estado","fase":"DESPLEGANDO","estacion":1}
← {"evt":"estado","fase":"MIDIENDO","estacion":1}
← {"evt":"prueba","tipo":"luz","valor":1650,"base":120,"unidad":"mV","min":900,"ok":true,"n":30}
← {"evt":"estado","fase":"RETIRANDO","estacion":1}
   … estaciones 2, 3 y 4 …
← {"evt":"prueba","tipo":"rpm","valor":182.4,"cv":3.1,"inercia_ms":1450,"pulsos":12,"unidad":"rpm","min":80,"max":400,"ok":true}
← {"evt":"estado","fase":"SALIENDO","estacion":4}
← {"evt":"fin","placa":"ABC12D","aprobada":true,"pruebas":[true,true,true,true],"duracion_ms":41230}
← {"evt":"estado","fase":"FIN","estacion":4}
```
