# Conexiones — ESP32 DevKit (30 pines)

> Cambio frente al borrador del 7 de noviembre: el controlador pasa de **Arduino UNO** a **ESP32**, que es lo que se compró. El sensor de temperatura pasa de MLX90614 a **DS18B20**, que es el disponible. El simulador HTML conserva el mapa del UNO como concepto.

El ESP32 trabaja a **3,3 V**. Ningún pin de señal puede recibir 5 V.

## Alimentación

```
Adaptador 9 V 2 A (o 2×18650 = 7,4 V)
   ├──► L298N  +12V  (motores de banda y rodillo)
   └──► LM2596 (regulador) ──► 5,0 V ──► servos ×4, MQ-2 (calefactor), Hall A3144, IR ×4
ESP32 ◄── USB del portátil (alimentación + datos serial)
TODAS LAS TIERRAS (GND) UNIDAS: fuente, L298N, LM2596, ESP32
```

**Cómo ajustar el regulador LM2596 sin quemar nada:**

1. Conectar **solo** la entrada (9 V), sin nada en la salida.
2. Poner el multímetro en la salida, en modo VDC.
3. Girar el tornillo del potenciómetro azul. Normalmente se gira en sentido antihorario para bajar el voltaje; puede necesitar 10 a 20 vueltas. Parar cuando marque entre **5,0 y 5,1 V**.
4. Solo entonces conectar los servos. Verificar de nuevo con carga.
5. Revisar la polaridad dos veces: **IN+ / IN−** y **OUT+ / OUT−**. Si se invierte, se quema.

## Mapa de pines

| Elemento | Pin ESP32 | Nota |
|---|---|---|
| LDR (fotocelda) | **GPIO36 (VP)** | LDR entre 3V3 y el pin; resistencia de 10 kΩ entre el pin y GND. Más luz = más voltaje. |
| MQ-2 AO | **GPIO39 (VN)** | El AO llega hasta 5 V: **divisor obligatorio** (AO → 10 kΩ → pin → 20 kΩ → GND). |
| IR 1 faro | GPIO34 | Módulo FC-51 alimentado a 3,3 V. LOW = moto detectada. |
| IR 2 temperatura | GPIO35 | Igual. |
| IR 3 gases | GPIO32 | Igual. |
| IR 4 rueda | GPIO33 | Igual. |
| Hall A3144 | GPIO27 | El A3144 se alimenta a **5 V** (necesita mínimo 4,5 V). Su salida es de colector abierto: poner una pull-up de **10 kΩ a 3V3**, no a 5 V. Si es un módulo KY-003 con resistencia a VCC, agregar un divisor. |
| DS18B20 | GPIO4 | Alimentación a 3,3 V, pull-up de 4,7 kΩ entre DATA y 3V3. |
| Servo 1 (fotocelda) | GPIO18 | Señal directa; alimentación a 5 V del LM2596. |
| Servo 2 (sonda de temperatura) | GPIO19 | Igual. |
| Servo 3 (MQ-2) | GPIO21 | Igual. |
| Servo 4 (rodillo) | GPIO22 | Igual. |
| L298N ENA (banda) | GPIO25 | Quitar el jumper de ENA. IN1 → 5 V, IN2 → GND (un solo sentido de giro). |
| L298N ENB (rodillo) | GPIO26 | Quitar el jumper de ENB. IN3 → 5 V, IN4 → GND. |
| LED verde / rojo E1 | GPIO13 / GPIO14 | Cada LED con 220 Ω a GND. |
| LED verde / rojo E2 | GPIO16 / GPIO17 | |
| LED verde / rojo E3 | GPIO23 / GPIO2 | El GPIO2 también enciende el LED azul de la placa. |
| LED verde / rojo E4 | GPIO5 / GPIO12 | **GPIO12 debe estar en LOW al arrancar.** Con el LED y su resistencia a GND no hay problema; nunca conectar una pull-up ahí. |
| Buzzer activo | GPIO15 | Si suena fuerte o consume más de 12 mA, usar un transistor 2N2222. |

Con esto se usan todos los GPIO libres del DevKit de 30 pines.

**Alternativa que libera 7 pines:** cambiar los 8 LEDs por una tira de 4 a 8 LEDs WS2812 (NeoPixel) en un solo pin. Para la guía, "la luz cuenta por una" salida de todas maneras.

## Conteo para el requisito de la guía (≥4 entradas, ≥4 salidas)

- **Entradas (5 tipos, 8 señales):** LDR, DS18B20, MQ-2, Hall e IR ×4.
- **Salidas (5 tipos, sin contar la luz):** motor de la banda, motor del rodillo y servos ×4. Además: LEDs y buzzer, que juntos cuentan como una salida.

## Errores que queman cosas

- Servos o motores alimentados desde el pin 3V3 o 5V del ESP32. Siempre van con el LM2596 o el L298N.
- Tierras sin unir. Los servos tiemblan y las lecturas saltan.
- MQ-2 o Hall a 5 V conectados directo a un GPIO.
- Usar pines ADC2 (GPIO 0, 2, 4, 12–15, 25–27) como entradas analógicas. No funcionan cuando el WiFi está activo; por eso la LDR y el MQ-2 van en ADC1 (GPIO36 y 39).
