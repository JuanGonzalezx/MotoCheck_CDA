# Lista de materiales (BOM) y compras

Estado al 13 de noviembre de 2026. Precios aproximados en Manizales y en tiendas en línea (COP).

## Ya comprado (lista de Juan Diego)

| Componente | Cant. | Uso |
|---|---|---|
| ESP32 DevKit | 1 | Controlador |
| Regulador de tensión (LM2596 o similar) | 1 | 5 V para servos y sensores |
| Servo SG90 | 3 | Brazos de fotocelda, gases y rodillo |
| Sensor IR de obstáculo (FC-51) | 2 | Posición en las estaciones |
| DS18B20 (sonda) | 1 | Temperatura |
| MQ-2 | 1 | Gases (respuesta relativa) |
| Fotocelda (LDR) | 1 | Faro |
| Buzzer | 1 | Aviso sonoro |
| Sensor Hall | 1 | RPM de la rueda |

## Falta comprar

| # | Componente | Cant. | Para qué | Aprox. |
|---|---|---|---|---|
| 1 | **Motorreductor TT 1:48, 3–6 V, doble eje** (el amarillo) | 2 | Uno mueve la banda y otro el rodillo de la rueda | 2 × 6–8k |
| 2 | **Driver L298N** | 1 | Controla los dos motores | 12–15k |
| 3 | **Adaptador 9 V 2 A** (plug 5,5 mm) + jack hembra | 1 | Potencia para motores y regulador | 15–20k |
| 4 | **Servo SG90** adicional | 1 | Brazo de la sonda DS18B20 (4.º servo) | 8k |
| 5 | **Sensor IR FC-51** adicional | 2 | Completar uno por estación (4 en total) | 2 × 4k |
| 6 | **LEDs de 5 mm** verdes y rojos + resistencias de **220 Ω** | 4 + 4 + 8 | Semáforo de las 4 estaciones | 3k |
| 7 | Resistencias **10 kΩ ×4, 20 kΩ ×1 (o 2×10k en serie), 4,7 kΩ ×1** | — | LDR, divisor del MQ-2, pull-up del Hall y del DS18B20 | 2k |
| 8 | **Imanes de neodimio** de 3–5 mm | 3 | En el rin de la rueda (uno por vuelta) | 3k |
| 9 | **Lámina de balso** de 3 mm y de 5 mm + **listones de balso** de 10×10 mm | 2 + 2 + 4 | Soportes, brazos, guías y cámara oscura | 15–20k |
| 10 | **Base rígida: MDF o triplex de 9 mm, 100 × 25 cm** | 1 | Chasis. El balso solo, a 1 m de largo, se flexiona y desalinea la banda | 10–15k |
| 11 | **Foami (goma EVA) de 2 mm**, 1 pliego, **o un neumático (tubo interior) de bicicleta usado** | 1 | Banda (ver `construccion_banda.md`) | 3–5k / gratis |
| 12 | **Tubo PVC de ½" (30 cm) + 4 tapones**, o rodillos de madera de 2–2,5 cm | — | Rodillos de la banda | 5k |
| 13 | **Varilla roscada de ¼"** o eje de acero de 4–5 mm + tuercas y arandelas | 1 m | Ejes de los rodillos | 5k |
| 14 | Rodillo de goma para impulsar la rueda: rueda pequeña de juguete o rueda del motor TT | 1 | Prueba de la rueda | 2k |
| 15 | Moto de juguete 1:12 a 1:18, con ruedas que giren libres | 1–2 | Vehículo de prueba | 15–25k |
| 16 | LED de 3 mm + porta pila CR2032 + interruptor (faro de la moto) | 1 | Faro (bueno o débil) | 4k |
| 17 | Bloque pequeño de aluminio (o tapa metálica) | 1 | "Motor simulado" que se calienta para la prueba térmica | 0–3k |
| 18 | Protoboard de 830 puntos + jumpers M-M, M-H y H-H + espadines | — | Montaje | 15k |
| 19 | Silicona caliente, pegante de madera, tornillos de 3 mm, abrazaderas plásticas (amarras) | — | Ensamble | 10k |

**Total que falta: COP 150.000 a 200.000.**

Opcionales que mejoran la nota:

- **MLX90614 (GY-906), unos 40k:** temperatura sin contacto, como en el diseño original. Si se compra, no hace falta el 4.º servo.
- **Tira WS2812 (8 LEDs), unos 10k:** reemplaza los 8 LEDs y libera 7 pines.
- **LCD 16×2 con I2C, unos 15k:** muestra la placa y el estado en la maqueta.

## Dónde buscar

- Tiendas de electrónica del centro de Manizales; preguntar por "motorreductor amarillo TT con llanta".
- En línea: Vistronica, Electronilab, Sigma Electrónica o MercadoLibre (tardan de 2 a 4 días).
- Papelería o tienda de manualidades: balso, foami, silicona.
- Ferretería: MDF o triplex cortado a medida, varilla roscada, PVC.
