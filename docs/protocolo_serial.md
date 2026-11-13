# Protocolo serial ESP32 ↔ PC

USB serial a **115200 baudios**, una línea por mensaje (`\n`). Implementado en `firmware/motocheck_esp32/motocheck_esp32.ino`.

## PC → ESP32 (texto)

| Comando | Efecto |
|---|---|
| `START;ABC12D` | Inicia la inspección de la placa `ABC12D`. Solo se acepta en ESPERA, FIN o ERROR. |
| `STOP` | Parada de emergencia: apaga los motores y retira los brazos. |
| `CFG;clave=valor` | Cambia un parámetro: `pwm_banda`, `pwm_rodillo`, `servo_reposo`, `servo_medida`, `luz_min`, `temp_min`, `temp_max`, `gas_max`, `rpm_min`, `rpm_max`, `cv_max`, `timeout`. |
| `PING` | Responde con el estado actual. |
| `LEER` | Lecturas instantáneas de los sensores (para calibrar). |

## ESP32 → PC (JSON)

```json
{"evt":"hola","equipo":"MotoCheck Lab","version":"0.1"}
{"evt":"estado","fase":"AVANZANDO","estacion":1}
{"evt":"base","luz_mv":120,"gas_mv":410}
{"evt":"inicio","placa":"ABC12D"}
{"evt":"prueba","tipo":"luz","valor":1650,"base":120,"unidad":"mV","min":900,"ok":true,"n":30}
{"evt":"prueba","tipo":"temp","valor":41.25,"unidad":"C","min":30.0,"max":60.0,"ok":true}
{"evt":"prueba","tipo":"gas","valor":1.12,"base_mv":410,"unidad":"rel","max":1.50,"ok":true,"n":80}
{"evt":"prueba","tipo":"rpm","valor":182.4,"cv":3.1,"inercia_ms":1450,"pulsos":12,"unidad":"rpm","min":80,"max":400,"ok":true}
{"evt":"fin","placa":"ABC12D","aprobada":true,"pruebas":[true,true,true,true],"duracion_ms":41230}
{"evt":"error","estacion":2,"motivo":"la moto no llego a la estacion"}
```

Estados: `CALENTANDO` (60 s de precalentamiento del MQ-2) → `ESPERA` → por cada estación: `AVANZANDO` → `DESPLEGANDO` → `MIDIENDO` → `RETIRANDO`. Al final: `SALIENDO` → `FIN`. Ante una falla: `ERROR`.

El puente en el PC (`software/puente`, Fase 2) guarda cada `fin` junto con sus `prueba` como un documento de la colección `inspecciones` en MongoDB Atlas.
