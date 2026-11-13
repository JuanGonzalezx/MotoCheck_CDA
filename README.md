# MotoCheck Lab — CDA automatizado a escala

Línea automatizada de **preinspección de motocicletas a escala**. Una banda transportadora lleva una moto de juguete por cuatro estaciones:

| Estación | Sensor (entrada) | Actuador | Resultado |
|---|---|---|---|
| 1. Faro | Fotocelda (LDR) | Servo 1 acerca la fotocelda | Contraste de luz (mV) |
| 2. Temperatura | DS18B20 | Servo 2 apoya la sonda | °C dentro de la ventana |
| 3. Gases | MQ-2 | Servo 3 acerca el sensor | Lectura / línea base |
| 4. Rueda | Sensor Hall + imán | Servo 4 + motor del rodillo | RPM, estabilidad e inercia |

Cada estación tiene un sensor IR que detiene la banda. En cada una se enciende un LED verde o rojo, y al final suena el buzzer. Los datos pasan por **USB serial → PC → MongoDB Atlas → panel web**.

Curso **Automatización y Control de Procesos** — Universidad de Caldas, 2026-2. Profesora: Diana Rocío Varón Serna.
Autores: Juan Diego Rendón Tabares · Juan David Ocampo González.

> Prototipo didáctico. No reemplaza la Revisión Técnico-Mecánica y de Emisiones Contaminantes, que solo realizan los CDA acreditados por ONAC.

## Estructura

```
MotoCheck_CDA/
├── entregas/            Lo que se sube al aula virtual
│   ├── 00_borrador/     Borrador (7 nov): problema, justificación, marco teórico
│   ├── 01_fase1/        Fase 1 (13 nov): talleres 1, 2 y 3
│   ├── 02_fase2/        Fase 2 (20 nov): datos, métodos y resultados, artículo + video
│   ├── 03_fase3/        Fase 3 (27 nov): artículo final y exposición
│   └── eaifi/           Resumen e inscripción EAiFi (1–20 nov)
├── simulacion/          Gemelo digital 3D en HTML (aprobado por la profe)
├── firmware/            Código del ESP32 (máquina de estados)
├── software/
│   ├── puente/          PC: lee el COM y guarda en MongoDB (Fase 2)
│   └── web/             Panel web (Fase 2)
├── hardware/            Pines, lista de materiales, construcción de la banda
├── referencias/         Bibliografía (.bib y APA)
└── docs/                Protocolo serial y planeación
```

## Cronograma

| Entrega | Cierre | Contenido |
|---|---|---|
| Borrador | sáb 7 nov ✅ | Problema, justificación, 3 títulos, marco teórico (≥15 artículos) |
| **Fase 1** | **vie 13 nov** | Talleres 1, 2 y 3: objetivos, metodología, recursos, diagramas, lista de materiales, protocolo de pruebas, primer prototipo o simulación |
| Inscripción EAiFi | 1–20 nov | Resumen (introducción, objetivo, metodología, resultados esperados, 3–5 palabras clave, 5–10 referencias APA) en https://eaifi.org. La hace un solo autor. |
| Fase 2 | vie 20 nov | Pruebas y datos, secciones de Métodos y Resultados, artículo en borrador + video demo |
| Fase 3 | vie 27 nov | Maqueta lista, exposición EAiFi, artículo final y repositorio |

## Uso rápido del firmware

1. Arduino IDE → instalar el soporte para placas **esp32** (Espressif) y las librerías **ESP32Servo**, **OneWire** y **DallasTemperature**.
2. Abrir `firmware/motocheck_esp32/motocheck_esp32.ino`, elegir la placa *ESP32 Dev Module* y cargar.
3. Abrir el monitor serial a 115200 baudios. Esperar 60 s (precalentamiento del MQ-2) y escribir `START;ABC12D`.

Comandos y mensajes: [`docs/protocolo_serial.md`](docs/protocolo_serial.md). Conexiones: [`hardware/conexiones_esp32.md`](hardware/conexiones_esp32.md).
