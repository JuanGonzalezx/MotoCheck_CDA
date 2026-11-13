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
├── entregas/            Lo que se sube al aula virtual (borrador, fases 1–3, EAiFi)
├── simulacion/          Gemelo digital 3D en HTML (aprobado por la profe)
├── firmware/            ESP32: motocheck_esp32 (línea), motocheck_diagnostico (pruebas), compilar.sh
├── software/
│   ├── puente/          Node.js: puerto serial → MongoDB Atlas → Socket.IO (con simulador)
│   └── web/             Panel web: en vivo, historial, estadísticas, configuración, certificado
├── hardware/            Pines, lista de materiales, construcción de la banda
├── docs/specs/          Contratos: firmware, protocolo serial, puente/API, datos
├── docs/bitacora.md     Registro de pruebas en la maqueta (evidencia para la Fase 2)
└── referencias/         Bibliografía (.bib y APA)
```

## Cronograma

| Entrega | Cierre | Contenido |
|---|---|---|
| Borrador | sáb 7 nov ✅ | Problema, justificación, 3 títulos, marco teórico (≥15 artículos) |
| Fase 1 | vie 13 nov ✅ | Talleres 1, 2 y 3: objetivos, metodología, diagramas, lista de materiales, protocolo, simulación + firmware |
| Inscripción EAiFi | 1–20 nov | Resumen en https://eaifi.org (un solo autor). Borrador en `entregas/eaifi/` |
| **Fase 2** | **vie 20 nov** | Pruebas y datos, secciones de Métodos y Resultados, artículo en borrador + video demo |
| Fase 3 | vie 27 nov | Maqueta lista, exposición EAiFi, artículo final y repositorio |

## Cómo correr cada parte

**Firmware (Arduino IDE).** Instalar el núcleo **esp32 3.3.12** y las librerías **ESP32Servo 3.2.1**, **OneWire 2.3.8** y **DallasTemperature 4.0.6**. Elegir la placa *ESP32 Dev Module*. Todo el detalle y los errores comunes están en [`docs/specs/firmware.md`](docs/specs/firmware.md). Para verificar desde la terminal: `./firmware/compilar.sh`. GitHub Actions también compila el firmware en cada push.

**Panel web y puente.**

```bash
cd software/puente && npm install && npm run simular   # http://localhost:3000, sin hardware
```

Con el ESP32 conectado: [`software/puente/README.md`](software/puente/README.md).

Comandos y mensajes: [`docs/specs/protocolo_serial.md`](docs/specs/protocolo_serial.md). Conexiones: [`hardware/conexiones_esp32.md`](hardware/conexiones_esp32.md).
