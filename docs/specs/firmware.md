# Spec — Firmware ESP32 y cómo compilarlo sin errores

## Cómo trabajamos (Claude escribe, el equipo compila y carga)

1. Claude escribe o modifica el código en `firmware/` y lo compila con **arduino-cli**, que es el mismo compilador que usa Arduino IDE 2 por dentro, con las **mismas versiones** de esta página.
2. Además, en cada `git push` que toque `firmware/`, **GitHub Actions** lo vuelve a compilar desde cero (pestaña *Actions* del repositorio). Si sale ✅, compila; si sale ❌, el log muestra la línea del error.
3. El equipo hace `git pull`, abre el `.ino` en Arduino IDE y lo **carga** al ESP32. Si las versiones de abajo coinciden, el resultado es idéntico al compilado aquí.
4. Lo que no se puede probar sin el hardware (que el servo llegue al ángulo, que el IR detecte) se prueba con el sketch de **diagnóstico**, y el resultado se anota en `docs/bitacora.md`.

> El lenguaje es **C++ de Arduino**, no C puro: se usan clases como `Servo`, `String` y `Serial`. Los archivos `.ino` se compilan como C++.

## Entorno fijado (debe coincidir en Arduino IDE)

| Elemento | Versión | Dónde se configura en Arduino IDE 2 |
|---|---|---|
| Arduino IDE | 2.3 o superior | — |
| URL de placas adicionales | `https://espressif.github.io/arduino-esp32/package_esp32_index.json` | *Archivo → Preferencias* |
| Núcleo **esp32 by Espressif Systems** | **3.3.12** | *Herramientas → Placa → Gestor de placas*. **No usar la 2.x**: su API de PWM es otra y ESP32Servo 3 no compila con ella |
| Placa | **ESP32 Dev Module** | *Herramientas → Placa → esp32* |
| Upload Speed | 921600 (si falla, 115200) | *Herramientas* |
| Librería **ESP32Servo** (Kevin Harrington, John K. Bennett) | **3.2.1** | *Gestor de librerías* |
| Librería **OneWire** (Paul Stoffregen) | **2.3.8** | *Gestor de librerías* |
| Librería **DallasTemperature** (Miles Burton) | **4.0.6** | *Gestor de librerías* |

**No instalar** la librería `Servo` de Arduino; en ESP32 choca con ESP32Servo.

Desde la terminal (Mac, Linux o Git Bash en Windows) se puede verificar todo de una vez:

```bash
./firmware/compilar.sh --instalar   # la primera vez
./firmware/compilar.sh              # las siguientes
```

## Sketches

| Carpeta | Para qué |
|---|---|
| `firmware/motocheck_esp32/` | Firmware de la línea: máquina de estados y protocolo serial ([protocolo_serial.md](protocolo_serial.md)) |
| `firmware/motocheck_diagnostico/` | Pruebas sueltas: lecturas en vivo, mover cada servo y motor, LEDs y buzzer |

Cada carpeta lleva una copia de `pines.h`. **La fuente es `motocheck_esp32/pines.h`**: si se cambia un pin, se copia el archivo a la otra carpeta. `compilar.sh` y la CI fallan si las dos copias difieren. Los pines se explican en `hardware/conexiones_esp32.md`.

## Reglas de código para que siempre compile (y no falle en la placa)

1. **Nombre de la carpeta = nombre del `.ino`.** Arduino IDE no abre el sketch si no coinciden.
2. **Tipos propios (`struct`, `enum`) arriba**, antes de cualquier función. El IDE genera los prototipos automáticamente y falla si una función usa un tipo declarado más abajo.
3. **`min()` y `max()` con el mismo tipo** en ambos argumentos. En el núcleo 3.x son `std::min` y `std::max` y no convierten: `max(variableVolatile, otra)` no compila, así que hay que hacer un cast: `max((unsigned long)a, b)`.
4. **Variables compartidas con una interrupción:** `volatile`, la función de la interrupción con `IRAM_ATTR`, y nada de `x++` sobre una `volatile` (se escribe `x = x + 1`). Para leerlas fuera, rodear con `noInterrupts()` / `interrupts()`.
5. **Prohibido `delay()` largo en `loop()`**: la máquina de estados usa `millis()`. Solo se permite `delay` corto en rutinas de arranque o en el buzzer.
6. **Analógicas solo en ADC1 (GPIO 32–39).** ADC2 no funciona con WiFi. Para leer se usa `analogReadMilliVolts()` (ya calibrado), no `analogRead()`.
7. **PWM de motores con `analogWrite()`** (núcleo 3.x) y servos con `ESP32Servo`. No usar `ledcSetup` / `ledcAttachPin`: son de la API 2.x y no compilan en 3.x.
8. **Serial a 115200** y mensajes con `Serial.printf` en **una sola línea JSON** (ver el protocolo). Las comillas dentro del texto se escapan con `\"`.
9. **Sin `String` dentro de interrupciones** y sin memoria dinámica en `loop()` más allá de leer comandos.
10. **Pines de arranque (strapping):** en GPIO 0, 2, 5, 12 y 15 solo van salidas con LED o buzzer a GND. Nunca resistencias pull-up externas.

## Errores comunes al cargar y su solución

| Mensaje | Solución |
|---|---|
| `Failed to connect to ESP32: Wrong boot mode detected` | Mantener presionado **BOOT** mientras dice "Connecting…" |
| El puerto no aparece (Mac o Windows) | Instalar el driver **CP210x** o **CH340**, según el chip USB de la placa; usar un cable USB **de datos** |
| `A fatal error occurred: … port is busy` | Cerrar el monitor serie y el puente Node.js: solo un programa puede usar el COM a la vez |
| `Brownout detector was triggered` en el monitor | Los servos o motores están tomando corriente del ESP32: alimentarlos con el LM2596 o el L298N y unir los GND |
| `'Servo' does not name a type` | Falta ESP32Servo 3.2.1, o se incluyó `<Servo.h>` en vez de `<ESP32Servo.h>` |
| `'ledcSetup' was not declared` | Ese código es para el núcleo 2.x; este proyecto usa el 3.3.12 |

## Comportamiento que debe cumplir el firmware (criterios de aceptación)

- **F1.** Al encender: envía `hola` y `config`, queda 60 s en `CALENTANDO` y luego pasa a `ESPERA`.
- **F2.** `START;<placa>` en `ESPERA` inicia el ciclo E1 → E4. En cualquier otro estado activo responde `rechazado`.
- **F3.** En cada estación: la banda se detiene cuando el IR detecta la moto; el servo despliega el brazo (700 ms), mide, evalúa y enciende el LED verde o rojo; el servo se retira (700 ms) y la banda arranca.
- **F4.** Si la moto no llega a una estación en `timeout` ms: apaga los motores, retira los servos, enciende todos los LEDs rojos, da 5 pitidos y envía `error`.
- **F5.** `STOP` detiene todo en menos de 100 ms desde cualquier estado (salvo durante la toma de líneas base, que dura cerca de 1 s).
- **F6.** Al final: envía `fin` con el resultado de las 4 pruebas y pita 1 vez si la moto aprobó o 3 si no.
- **F7.** `CFG` cambia el parámetro en caliente y responde `cfg`; el valor se pierde al reiniciar (el puente lo reenvía al conectarse).
