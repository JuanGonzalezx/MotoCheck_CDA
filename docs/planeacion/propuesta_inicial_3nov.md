# CDA automatizado para motocicletas (prototipo a escala)

Documento de trabajo del equipo. Fuente de los requisitos: `166947_Guía proyecto automatización.docx` y los talleres 1, 2 y 3 (`159933`, `159934`, `159935`).

---

## 0. Requisitos de la profe y cómo los cumplimos

La guía (sección REQUERIMIENTOS) pide:

| Requisito de la guía | Cómo lo cumplimos | ¿Cumple? |
|---|---|---|
| **Mínimo 4 entradas (sensores)** | 1) LDR (luz del faro) · 2) Sensor Hall A3144 (RPM de la rueda) · 3) Sensor de temperatura · 4) Sensores IR de posición (uno por estación) | ✅ 4 tipos distintos (6 sensores físicos) |
| **Procesamiento (control)** | Arduino con máquina de estados: mueve la banda, detiene en cada estación, ejecuta la prueba, compara con umbrales y decide pasa / no pasa | ✅ |
| **Mínimo 4 salidas (actuadores). "Luz o sonido cuentan por una"** | 1) Motorreductor de la banda · 2) Motor del rodillo de prueba (gira la rueda) · 3) Servo que acerca el rodillo a la rueda · 4) Servo de la barrera de salida · 5) Señalización: LEDs verde/rojo + buzzer (**todo esto cuenta como UNA sola salida**) | ✅ 5 salidas (4 sin contar las luces) |
| **Frontend (web, wiki o app)** | Aplicación web: registrar la placa, iniciar la inspección, ver en vivo, historial y certificado | ✅ |
| **Almacenamiento (base de datos)** | MongoDB Atlas (nube) | ✅ |

> ⚠️ **Lo más importante que hay que corregir de la idea original:** la guía dice que *luz o sonido cuentan por una*. Los 6 LEDs (verde/rojo × 3 estaciones) valen **una sola** salida. Si solo tuviéramos LEDs y la banda, no llegaríamos a 4. Por eso agregamos el rodillo de prueba, el servo que lo acerca y la barrera de salida.

---

## 1. Revisión técnica de la idea (lo que cambiaría)

| Idea original | Problema | Propuesta |
|---|---|---|
| "Varios servos para mover las bandas" | Un servo normal (SG90/MG90) gira solo 180°; no sirve para mover una banda continuamente. | **Un motorreductor TT (amarillo) o N20** con driver **L298N**. Una sola banda larga con 3 paradas: un motor, menos fallas. |
| Sensor Hall "o dínamo", y quitarlo si no se consigue | El Hall A3144 cuesta poco (unos COP 2.000) y un imán de neodimio se consigue fácil. Si lo quitamos, quedan 3 tipos de entrada y se arriesga el requisito. | **Mantener el Hall.** Imán pegado en el rin trasero; el Arduino cuenta pulsos por interrupción y calcula RPM y estabilidad (desviación estándar). Si falla, se cambia por un sensor IR ranurado (encoder de horquilla), que se lee igual. |
| ¿Cómo gira la llanta de una moto de juguete? | La moto de juguete no tiene motor. | **Banco de rodillos (como en un CDA real):** un servo baja un rodillo de caucho movido por un segundo motor TT hasta que toca la rueda trasera, y la hace girar. El Hall mide si la rueda gira de forma estable. Para simular una moto "mala", se frena la rueda con un roce. |
| Medir la temperatura de la moto | El juguete no se calienta solo. | Termómetro **infrarrojo sin contacto MLX90614** (I2C), que es lo más parecido a un CDA real. Opción barata: LM35 o DS18B20. Para la demo, la moto "caliente" se prepara con secador o con una resistencia de 10 Ω 2 W dentro del juguete. |
| Fotorresistencia midiendo el faro | El LDR se satura con la luz del salón y la medida no se puede repetir. | **Cámara oscura (túnel de balso pintado de negro)** en la estación 1, con el LDR a distancia fija. Se calibra contra una app de luxómetro del celular y la curva de calibración va al artículo. El faro de la moto es un LED con pila CR2032; el "faro defectuoso" es el mismo LED con una resistencia más grande. |
| La moto en una banda | Una moto de juguete se cae sola. | La moto va **atornillada o pegada a una base (pallet) de balso**, con la rueda trasera libre. La banda lleva guías laterales para que el pallet no se salga. |
| PC → nube | Bien planteado: Arduino ↔ USB (COM) ↔ PC ↔ Mongo. | Un programa puente en Node.js en el PC (lee el COM, guarda en Mongo Atlas y sirve la web). También se manda la orden PC → Arduino: iniciar la inspección y cambiar los umbrales desde la web. Esto le da comunicación **bidireccional** y aire de **SCADA**, que es tema del curso. |

**Extra opcional (si sobra tiempo):** sensor de gases MQ-135 o MQ-2 para una "prueba de emisiones" (el compañero mencionó un sensor de humo). Es una 5.ª entrada y una prueba que también existe en el CDA real. No es obligatoria.

---

## 2. Proceso: cómo funciona el CDA en miniatura

```
[Web: registrar placa + INICIAR] ──START──► Arduino
        │
  Banda avanza ──► IR1 detecta moto ──► PARA
        │   E1 LUCES: LDR mide el faro en cámara oscura (N muestras, promedio)
        │   → LED verde/rojo E1 + envía resultado por serial
  Banda avanza ──► IR2 detecta moto ──► PARA
        │   E2 RODILLO: servo baja el rodillo, motor gira la rueda 5 s
        │   Hall mide RPM: promedio y desviación → estable / inestable
        │   → servo sube el rodillo, LED E2
  Banda avanza ──► IR3 detecta moto ──► PARA
        │   E3 TEMPERATURA: MLX90614 mide, compara con [Tmin, Tmax]
        │   → LED E3
  Resultado global: buzzer (1 pitido = aprobada, 3 = rechazada)
  Barrera de salida (servo) abre ──► banda saca la moto ──► fin
        │
  PC guarda la inspección en MongoDB ──► Web muestra el reporte o certificado
```

Conceptos del curso que se aplican (sirven para el marco teórico):

- **Inspección automatizada en control de calidad:** inspección del 100 % de las unidades; errores tipo I (falsa alarma) y tipo II (falla). Ver `159942_Tecnologías Modernas de Inspección`, diapositivas 11–16.
- **Manejo automatizado de materiales:** banda transportadora con poleas y motor, y sensores de velocidad. Ver `159931_Sensores diapositivas`, diapositivas 95–96, y `159958_Actuadores`.
- **Sensores:** LDR, temperatura e inductivos/magnéticos. Ver `159926_Sensores lectura`.
- **Control ON-OFF con histéresis o banda muerta:** igual que en el Lab 04. Ver el glosario.
- **SCADA:** supervisión, reporte e historial en la web.
- **Metrología:** calibración, repetibilidad e incertidumbre de cada medida. Ver `159944_Calibración e interpretación de resultados`.

---

## 3. Lista de materiales (BOM)

| # | Componente | Cant. | Uso | Precio aprox. (COP) |
|---|---|---|---|---|
| 1 | Arduino UNO (o **Mega 2560**, recomendado por la cantidad de pines) | 1 | Control | 35–60k |
| 2 | Driver L298N | 1 | Motor de la banda + motor del rodillo | 12k |
| 3 | Motorreductor TT 3–6 V con rueda | 2 | Banda y rodillo de prueba | 2 × 6k |
| 4 | Servo SG90 o MG90S | 2 | Brazo del rodillo y barrera de salida | 2 × 8k |
| 5 | Fotorresistencia LDR 5 mm + resistencia de 10 kΩ | 1 | Prueba de luces | 1k |
| 6 | Sensor Hall A3144 (o módulo KY-003) + imanes de neodimio pequeños | 1 + 3 | RPM de la rueda | 3k |
| 7 | MLX90614 (o LM35 / DS18B20 como opción barata) | 1 | Temperatura | 30k (LM35: 4k) |
| 8 | Sensor IR de obstáculo FC-51 (o TCRT5000) | 3 | Posición en cada estación | 3 × 4k |
| 9 | LEDs verde y rojo + resistencias de 220 Ω | 6 | Semáforo por estación | 2k |
| 10 | Buzzer activo de 5 V | 1 | Resultado sonoro | 2k |
| 11 | (Opcional) LCD 16×2 con I2C | 1 | Mostrar la placa y el estado en la maqueta | 15k |
| 12 | Fuente de 9 V 2 A o 2 pilas 18650 con porta pilas; regulador o step-down a 5 V para los servos | 1 | Potencia | 15–25k |
| 13 | Balso, tubo PVC de ½" (rodillos), varilla roscada o palo de pincho (ejes), caucho de neumático o banda elástica, silicona, tornillos | — | Estructura y banda | 20k |
| 14 | Moto de juguete escala 1:18 o 1:12 (con la rueda trasera libre) + LED + pila CR2032 + interruptor | 1–2 | Vehículo a inspeccionar ("buena" y "mala") | 15–25k |
| 15 | Protoboard, cables dupont, espadines, estaño | — | Conexiones | 15k |

**Total estimado: COP 220.000 a 300.000.**

**Errores típicos que hay que evitar:**

- **No** alimentar los servos ni los motores desde el pin de 5 V del Arduino: usar una fuente aparte y **unir las tierras (GND común)**.
- En el UNO, la librería `Servo` **deja sin PWM los pines 9 y 10**. El PWM de los motores debe ir en los pines 3, 5, 6 u 11.
- El L298N pierde unos 2 V. Con 9 V de entrada, los motores TT reciben unos 7 V: hay que limitar el PWM (más o menos 150 de 255).

---

## 4. Asignación de pines (Arduino UNO, ajustada a los pines que hay)

Los motores giran en un solo sentido, así que las entradas IN1/IN3 del L298N van a 5 V y las IN2/IN4 a GND. Solo se controla el pin EN con PWM.

| Pin | Elemento | Tipo |
|---|---|---|
| D0/D1 | USB Serial con el PC | Comunicación |
| D2 | Hall A3144 (interrupción INT0) | Entrada |
| D3 | L298N ENB: motor del rodillo (PWM, Timer2) | Salida |
| D4 | IR1: estación de luces | Entrada |
| D5 | L298N ENA: motor de la banda (PWM, Timer0) | Salida |
| D6 | Buzzer | Salida |
| D7 | IR2: estación del rodillo | Entrada |
| D8 | IR3: estación de temperatura | Entrada |
| D9 | Servo del brazo del rodillo | Salida |
| D10 | Servo de la barrera de salida | Salida |
| D11, D12 | LED verde y rojo E1 | Salida |
| D13, A1 | LED verde y rojo E2 | Salida |
| A2, A3 | LED verde y rojo E3 | Salida |
| A0 | LDR (divisor de voltaje con 10 kΩ) | Entrada analógica |
| A4/A5 | I2C: MLX90614 (+ LCD opcional, en el mismo bus) | Entrada |

Esto ocupa **todos** los pines del UNO. Con un **Mega** sobra espacio para el sensor de gases, un IR de salida y el LCD.

---

## 5. Arquitectura de software

```
Arduino (C++)  ──USB/COM6──►  PC: puente Node.js  ──►  MongoDB Atlas (nube)
  máquina de estados          serialport + express          ▲
  ◄── START / CFG ──          + socket.io (tiempo real)     │
                                    │                       │
                                    └──► Web (React/Vite) ◄─┘
                                         registrar placa, iniciar,
                                         vista en vivo, historial, certificado
```

**Protocolo serial (una línea JSON por mensaje, 9600 o 115200 baud):**

```
PC → Arduino:   START;ABC12D          CFG;luz_min=450          STOP
Arduino → PC:   {"evt":"estado","fase":"E1_LUCES"}
                {"evt":"prueba","tipo":"luz","valor":612,"unidad":"adc","min":450,"ok":true}
                {"evt":"prueba","tipo":"rpm","valor":118.4,"desv":3.1,"ok":true}
                {"evt":"prueba","tipo":"temp","valor":41.2,"unidad":"C","min":30,"max":90,"ok":true}
                {"evt":"fin","ok":false,"duracion_ms":38120}
```

**Colecciones en Mongo:**

- `inspecciones`: `{ placa, fecha, pruebas: [{tipo, valor, unidad, umbral_min, umbral_max, ok, muestras: []}], aprobada, duracion_s }`
- `configuracion`: los umbrales vigentes, que se cambian desde la web y se envían al Arduino.
- `eventos`: bitácora de estados y errores (por ejemplo, "moto no detectada en E2 después de 10 s" = tiempo de espera agotado).

**Pantallas de la web:** 1) Nueva inspección (placa → Iniciar) · 2) En vivo (estación actual, semáforo de cada prueba) · 3) Historial con filtros · 4) Detalle o certificado imprimible · 5) Configuración de umbrales · 6) Estadísticas (% de aprobación, tiempo promedio por moto, fallas por prueba).

---

## 6. Metodología experimental (lo que hace fuerte al artículo)

1. **Calibración** de cada sensor contra una referencia: LDR vs app de luxómetro; Hall vs tacómetro óptico o app de estroboscopio; MLX90614 vs termómetro de cocina. Se obtiene la curva y el error.
2. **Repetibilidad:** 30 medidas por sensor con la misma moto, para calcular el promedio, la desviación estándar y el coeficiente de variación.
3. **Clasificación:** se preparan motos o configuraciones *conocidas*: buena, faro débil, rueda frenada, fría o caliente. Se hacen N ciclos de cada una y se arma la **matriz de confusión**, con los **errores tipo I (falsa alarma) y tipo II (falla)**, tal como en las diapositivas 15–16 de *Tecnologías Modernas de Inspección*.
4. **Desempeño del proceso:** tiempo de ciclo por moto, motos por hora y disponibilidad (cuántos ciclos terminan sin atascarse).
5. **Prueba piloto (objetivo 3 del Taller 2):** una sesión de inspecciones seguidas operando solo desde la web, con todo guardado en la nube.

---

## 7. Cronograma (hoy: martes 3 de noviembre de 2026)

> Supuesto que hay que confirmar con la profe: Fase 1 = Taller 1 (problema + justificación + 3 títulos), Fase 2 = Taller 2 (objetivos + metodología + recursos), Fase 3 = Taller 3 (diseño, materiales, protocolo, primer prototipo y avance del artículo). Las 3 fases abrieron el 30 de octubre.

| Fecha | Hardware (Juan Diego) | Software / documento (Juan) | Entrega |
|---|---|---|---|
| **Mar 3 nov** | Pedir materiales | Enviar la propuesta a la profe | **Propuesta** |
| 4–9 nov | Estructura de balso + banda con motor girando; probar cada sensor por separado | Esqueleto del puente Node.js (lee el COM); Mongo Atlas creado; buscar las referencias | — |
| 10–13 nov | Paradas de la banda con IR1–IR3 | Redactar problema + justificación (150–200 palabras cada uno, mínimo 5 referencias APA cada uno) + 3 títulos | **Fase 1: vie 13 nov** |
| 14–20 nov | Estaciones E1, E2 y E3 funcionando una por una; servos | Máquina de estados en el Arduino + protocolo serial; web v1 (iniciar, en vivo); objetivo general + 3 específicos + metodología (200–300 palabras) | **Fase 2: vie 20 nov** |
| 21–27 nov | Integración completa; cableado limpio y soldado | Historial, certificado, umbrales desde la web; diagrama (P&ID / bloques), lista de materiales, protocolo de pruebas; avance del artículo | **Fase 3: vie 27 nov** |
| 28 nov – 4 dic | Ajustes | Pruebas de la sección 6 (calibración, 30 repeticiones, matriz de confusión); resultados | — |
| Semana siguiente | Video demo | Artículo completo (resumen, introducción, metodología, resultados, discusión, conclusiones, **mínimo 30 referencias**), repositorio | Artículo + EAiFi (exposición: 10 min + 5 de preguntas) |

---

## 8. Riesgos y planes B

| Riesgo | Plan B |
|---|---|
| La banda patina o se tuerce | Tensor regulable (eje montado en una ranura), caucho más ancho, rodillos de PVC con cinta antideslizante. |
| La moto no frena a tiempo en la estación | Bajar el PWM antes de llegar; o poner un tope con servo en la estación. |
| El LDR varía mucho | Cámara oscura + promedio de 20 muestras + calibración. |
| No llega el MLX90614 | LM35 en A1 (se mueven los LEDs de E2) o DS18B20. |
| Falta de pines en el UNO | Arduino Mega, o un registro de desplazamiento 74HC595 para los LEDs. |
| El puerto COM cambia (COM6/COM7) | El puerto se configura en un `.env` y el puente lista los puertos disponibles al arrancar. |
| Sin internet en la sustentación | El puente guarda en una cola local y sincroniza con Atlas cuando vuelve la conexión. |

---

## 9. Texto de la propuesta para enviar a la profe

> **Asunto:** Propuesta proyecto final – Automatización y Control de Procesos
>
> Buenas tardes, profesora Diana.
>
> Le enviamos nuestra propuesta de proyecto final:
>
> **Título tentativo:** Prototipo de Centro de Diagnóstico Automotriz (CDA) automatizado para la inspección técnica de motocicletas a escala, con banda transportadora y monitoreo web en la nube.
>
> **Problema:** En Colombia la motocicleta es el vehículo más común del parque automotor, y la revisión técnico-mecánica en los CDA depende en buena parte de pasos manuales. Eso alarga los tiempos de atención y deja espacio para errores de inspección y para que los resultados se manipulen.
>
> **Propuesta:** Una maqueta de CDA en la que una banda transportadora lleva una moto a escala por tres estaciones de inspección automática:
> 1. **Luces:** una fotorresistencia en una cámara oscura mide la intensidad del faro.
> 2. **Rodillo:** un motor hace girar la rueda trasera y un sensor Hall mide las RPM y su estabilidad.
> 3. **Temperatura de operación del motor:** la mide un sensor de temperatura.
>
> En cada estación el sistema compara la medida con umbrales y señaliza *pasa / no pasa*. Al final da un resultado global y abre la barrera de salida.
>
> **Requerimientos del proyecto:**
> - **Entradas (4):** fotorresistencia (LDR), sensor Hall, sensor de temperatura y sensores infrarrojos de posición en cada estación.
> - **Procesamiento:** Arduino con una máquina de estados (control secuencial y decisiones por umbral con histéresis).
> - **Salidas (4 o más):** motorreductor de la banda, motor del rodillo de prueba, servo que acerca el rodillo a la rueda, servo de la barrera de salida, y señalización con LEDs verde/rojo y buzzer.
> - **Frontend:** aplicación web para registrar la placa, iniciar la inspección, ver el proceso en tiempo real, consultar el historial y generar el certificado. La comunicación Arduino ↔ PC es por puerto serial USB y va en los dos sentidos.
> - **Almacenamiento:** base de datos en la nube (MongoDB Atlas).
>
> **Evaluación:** calibración de los sensores contra instrumentos de referencia, repetibilidad de las medidas, matriz de confusión con motos "aprobadas" y "defectuosas" conocidas (errores tipo I y II) y tiempo de ciclo por vehículo.
>
> Integrantes: Juan David Ocampo González y Juan Diego Rendón.
>
> Quedamos atentos a sus comentarios.

**Títulos candidatos (Taller 1):**

1. Prototipo de Centro de Diagnóstico Automotriz automatizado para la inspección técnica de motocicletas a escala, con banda transportadora y monitoreo web en la nube.
2. Sistema automatizado de inspección de luces, rodadura y temperatura en motocicletas a escala, basado en Arduino y MongoDB, para apoyar la revisión técnico-mecánica.
3. Automatización de una línea de inspección vehicular a escala con sensores LDR, Hall e infrarrojos, y supervisión tipo SCADA web, para reducir errores de inspección en CDA.

**Referencias base (para empezar; hay que verificarlas y completarlas con artículos de Scopus, IEEE o Google Scholar):**

- Groover, M. P. *Automation, Production Systems, and Computer-Integrated Manufacturing* (Pearson): capítulos de inspección automatizada y manejo de materiales.
- Creus Solé, A. *Instrumentación industrial* (Marcombo).
- Pallás Areny, R. *Sensores y acondicionadores de señal* (Marcombo).
- Ogata, K. *Ingeniería de control moderna* (Pearson).
- Ministerio de Transporte de Colombia. Resolución 3768 de 2013 (condiciones de los CDA): verificar la vigencia.
- ICONTEC. NTC 5375 (revisión técnico-mecánica y de emisiones contaminantes): verificar la versión.
- Para buscar: "automated vehicle inspection", "IoT vehicle inspection station", "conveyor belt Arduino quality inspection", "headlight intensity measurement LDR", "Hall effect sensor RPM measurement".
