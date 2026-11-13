# Specs de MotoCheck Lab

Las specs son el **contrato** entre las partes del sistema. Si algo cambia, se actualiza primero la spec y después el código.

| Spec | Qué define |
|---|---|
| [firmware.md](firmware.md) | Entorno exacto de Arduino IDE, reglas para que compile, errores de carga comunes y criterios de aceptación del ESP32 |
| [protocolo_serial.md](protocolo_serial.md) | Comandos y eventos entre el ESP32 y el PC |
| [puente.md](puente.md) | API REST, Socket.IO y comportamiento del puente y del panel |
| [datos.md](datos.md) | Documentos de MongoDB, respaldo local y cómo crear Atlas |

Documentos relacionados: `hardware/conexiones_esp32.md` (pines y alimentación) y `hardware/construccion_banda.md`.

## Flujo de trabajo con Claude

1. Se pide el cambio, por ejemplo: "que la estación 2 mida 10 s en vez de 6".
2. Claude actualiza la spec, el código, el simulador y las pruebas; compila el firmware con `firmware/compilar.sh` y corre `npm test`.
3. `git push`: GitHub Actions vuelve a compilar el firmware.
4. El equipo hace `git pull`, carga el firmware desde Arduino IDE y prueba en la maqueta. Lo que se observa se anota en `docs/bitacora.md`; esa bitácora es la evidencia para el artículo y la base de los siguientes ajustes.
