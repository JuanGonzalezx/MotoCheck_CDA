// Genera Fase1_MotoCheck_Rendon_Ocampo.docx (talleres 1, 2 y 3).
// Uso: NODE_PATH=<carpeta con node_modules/docx> node generar_docx.cjs
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, ImageRun, PageBreak, Header, PageNumber, TableOfContents, LevelFormat,
  Tab, TabStopType, BorderStyle,
} = require("docx");

const FIG = (f) => fs.readFileSync(path.join(__dirname, "figuras", f));
const FONT = "Times New Roman";
const DOBLE = { line: 480, before: 0, after: 0 };
const SENCILLO = { line: 240, before: 40, after: 40 };

// Texto con *cursiva* y **negrita**
function runs(texto, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, m;
  while ((m = re.exec(texto))) {
    if (m.index > last) out.push(new TextRun({ text: texto.slice(last, m.index), ...base }));
    const t = m[0];
    if (t.startsWith("**")) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }));
    else out.push(new TextRun({ text: t.slice(1, -1), italics: true, ...base }));
    last = m.index + t.length;
  }
  if (last < texto.length) out.push(new TextRun({ text: texto.slice(last), ...base }));
  return out;
}

const parrafo = (t) => new Paragraph({ children: runs(t), spacing: DOBLE, indent: { firstLine: 720 } });
const linea = (t, opts = {}) => new Paragraph({ children: runs(t, opts.run || {}), spacing: DOBLE, alignment: opts.align, indent: opts.indent });
const vacio = () => new Paragraph({ children: [], spacing: DOBLE });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const h3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
const vineta = (t) => new Paragraph({ children: runs(t), numbering: { reference: "vinetas", level: 0 }, spacing: DOBLE });
const numerada = (t, ref = "objetivos") => new Paragraph({ children: runs(t), numbering: { reference: ref, level: 0 }, spacing: DOBLE });
const salto = () => new Paragraph({ children: [new PageBreak()] });

function palabras(t) { return t.replace(/\*/g, "").split(/\s+/).filter(Boolean).length; }

let nFig = 0, nTab = 0;
function figura(archivo, titulo, ancho, alto, nota) {
  nFig++;
  const out = [
    new Paragraph({ children: [new TextRun({ text: `Figura ${nFig}`, bold: true })], spacing: { before: 240, after: 0, line: 480 }, keepNext: true }),
    new Paragraph({ children: [new TextRun({ text: titulo, italics: true })], spacing: DOBLE, keepNext: true }),
    new Paragraph({ children: [new ImageRun({ type: "png", data: FIG(archivo), transformation: { width: ancho, height: alto } })], alignment: AlignmentType.CENTER, keepNext: true }),
  ];
  if (nota) out.push(new Paragraph({ children: runs(`*Nota.* ${nota}`), spacing: { line: 240, before: 60, after: 240 } }));
  return out;
}

const BORDE = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
const BORDES = { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE };
function tabla(titulo, encabezados, filas, anchos, nota) {
  nTab++;
  const total = anchos.reduce((a, b) => a + b, 0);
  // keepNext en todas las filas menos la última: Word mantiene la tabla en una sola página
  const celda = (t, i, cab, junta = true) => new TableCell({
    width: { size: anchos[i], type: WidthType.DXA },
    borders: BORDES,
    shading: cab ? { type: ShadingType.CLEAR, fill: "D9E2F3", color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: String(t).split("\n").map((l) => new Paragraph({ children: runs(l, { size: 20, bold: cab || undefined }), spacing: SENCILLO, keepNext: junta })),
  });
  const out = [
    new Paragraph({ children: [new TextRun({ text: `Tabla ${nTab}`, bold: true })], spacing: { before: 240, after: 0, line: 480 }, keepNext: true }),
    new Paragraph({ children: [new TextRun({ text: titulo, italics: true })], spacing: DOBLE, keepNext: true }),
    new Table({
      width: { size: total, type: WidthType.DXA },
      columnWidths: anchos,
      rows: [
        new TableRow({ tableHeader: true, children: encabezados.map((t, i) => celda(t, i, true)) }),
        ...filas.map((f, k) => new TableRow({ cantSplit: true, children: f.map((t, i) => celda(t, i, false, k < filas.length - 1)) })),
      ],
    }),
  ];
  out.push(new Paragraph({ children: nota ? runs(`*Nota.* ${nota}`) : [], spacing: { line: 240, before: 60, after: 240 } }));
  return out;
}

// ---------------- Contenido ----------------
const TITULO_FINAL = "MotoCheck Lab: línea automatizada de preinspección de motocicletas a escala con banda transportadora, ESP32 y monitoreo web en la nube";

const PROBLEMA = "En Colombia, la Revisión Técnico-Mecánica y de Emisiones Contaminantes (RTMyEC) es obligatoria para las motocicletas y solo pueden realizarla los Centros de Diagnóstico Automotor (CDA) acreditados (ONAC, s. f.). Los estudios sobre centros de inspección muestran que la variabilidad en los tiempos de atención, la capacidad limitada y la organización del flujo generan esperas prolongadas para los usuarios (Khir Johari et al., 2018; Navarro-Alcendra et al., 2024). Además, inspeccionar una motocicleta reúne mediciones de naturaleza distinta, como la iluminación del faro, las emisiones, la temperatura y la rodadura, que exigen condiciones controladas y equipos específicos (Ha & Hong, 2020; Szymlet et al., 2024; Vojtisek-Lom et al., 2020). Cuando estas verificaciones dependen de pasos manuales y de registros dispersos, aumentan el tiempo de ciclo, los errores de clasificación (aprobar un vehículo defectuoso o rechazar uno en buen estado) y la dificultad para auditar los resultados (Schulz & Franck, 2021). En el ámbito académico, además, no se dispone de un modelo a escala que permita estudiar cómo secuenciar, medir y registrar automáticamente estas pruebas. El problema consiste, entonces, en integrar transporte, posicionamiento, sensado y registro digital en una línea de preinspección reproducible y de bajo costo.";

const JUSTIFICACION = "Automatizar la inspección permite pasar de verificaciones manuales por muestreo a una inspección del 100 % de las unidades, con criterios uniformes y registro trazable. Trabajos recientes muestran que la adquisición de datos con tableros de supervisión mejora el monitoreo de las bandas transportadoras (Kalyan Chakravarthy et al., 2027; Singh et al., 2026) y que los sistemas automáticos de inspección deben diseñarse considerando su disponibilidad y un retorno seguro a la operación manual cuando fallan (González-Prida Díaz et al., 2027). Asimismo, el conteo de pulsos con sensores de efecto Hall (Kusalaphirom et al., 2022), la medición térmica (Alvarado-Hernández et al., 2022) y los sensores de gases de bajo costo (Afridon et al., 2025) son principios viables para pruebas indicativas, y los datos de inspección permiten decidir con base en umbrales (Melas et al., 2027). MotoCheck Lab aplica en un solo sistema los contenidos del curso (sensores, actuadores, control secuencial, supervisión tipo SCADA y metrología) y permite medir cuantitativamente el tiempo de ciclo, la repetibilidad y los errores tipo I y II. El prototipo no pretende certificar vehículos: busca generar evidencia sobre la viabilidad de automatizar las verificaciones preliminares.";

const OBJ_GENERAL = "Desarrollar un prototipo a escala de una línea automatizada de preinspección de motocicletas que, mediante una banda transportadora, sensores de luz, temperatura, gases y velocidad, un controlador ESP32 y una aplicación web con almacenamiento en la nube, ejecute y registre pruebas indicativas, con el fin de evaluar su repetibilidad y su tiempo de ciclo en condiciones de laboratorio.";

const OBJ_ESPECIFICOS = [
  "Diseñar la arquitectura de la línea de preinspección (estructura mecánica de cuatro estaciones, instrumentación, mapa de entradas y salidas y lógica de control secuencial) a partir de los requisitos de las pruebas de faro, temperatura, gases y rueda.",
  "Implementar el prototipo físico y su software (firmware de máquina de estados en ESP32, puente serial, base de datos MongoDB Atlas y panel web), integrando al menos cuatro sensores y cuatro actuadores.",
  "Evaluar el funcionamiento piloto del prototipo mediante ciclos completos de inspección con motocicletas de condición conocida, midiendo el tiempo de ciclo, la repetibilidad de las lecturas, la exactitud de parada y la tasa de errores tipo I y II.",
];

const MET_TIPO = "**Tipo y enfoque:** investigación aplicada, de enfoque cuantitativo, con un diseño experimental de laboratorio. El desarrollo es iterativo: se avanza en *sprints* semanales de construcción y prueba.";
const MET_OBJ1 = "**Objetivo 1 (diseño):** se definirán los requisitos de cada prueba y la secuencia avance, posicionamiento, despliegue, medición y retiro, siguiendo los principios de la inspección automatizada y del manejo de materiales (Groover, 2015). Los sensores y actuadores se seleccionarán a partir de sus hojas de datos (Creus Solé, 2010; Pallás Areny, 2003). Se elaborarán el plano con nomenclatura ISA-5.1 (International Society of Automation [ISA], 2009) y el diagrama de la máquina de estados, y se validarán primero en el gemelo digital HTML.";
const MET_OBJ2 = "**Objetivo 2 (implementación):** se construirá la banda en balso y MDF, con motorreductor y driver L298N. El ESP32 se programará con control secuencial y decisiones ON-OFF por umbral con tiempos máximos (Ogata, 2010). Se desarrollarán un puente en Node.js, que leerá el puerto serial y guardará cada inspección en MongoDB Atlas, y un panel web de supervisión tipo SCADA, siguiendo la arquitectura de monitoreo de transportadores de Singh et al. (2026).";
const MET_OBJ3 = "**Objetivo 3 (evaluación):** cada sensor se calibrará contra un instrumento de referencia (luxómetro, termómetro y tacómetro digitales). Se harán 30 repeticiones por prueba para estimar la media, la desviación estándar y la incertidumbre (Vrabel et al., 2023). Luego se ejecutarán ciclos con motocicletas de condición conocida para construir la matriz de confusión y calcular los errores tipo I y II, el tiempo de ciclo y la exactitud de parada.";

const conteo = {
  problema: palabras(PROBLEMA),
  justificacion: palabras(JUSTIFICACION),
  metodologia: [MET_TIPO, MET_OBJ1, MET_OBJ2, MET_OBJ3].map(palabras).reduce((a, b) => a + b),
  objetivo: palabras(OBJ_GENERAL),
};
console.log("Palabras:", conteo);

const REFERENCIAS = [
  "Afridon, M., Syah, K., Marzuarman, Susanto, H., Arifin, M., Abdillah, M. A. S., & Ramadhan, M. Z. N. (2025). Implementation of fuzzy logic on motorcycle emission testing device using multi-gas sensors. *INOVTEK Polbeng – Seri Informatika, 10*(3), 1772–1781. https://doi.org/10.35314/w1802r28",
  "Alvarado-Hernández, A. I., Zamudio-Ramírez, I., Jaen-Cuellar, A. Y., Osornio-Rios, R. A., Donderis-Quiles, V., & Antonino-Daviu, J. A. (2022). Infrared thermography smart sensor for the condition monitoring of gearbox and bearings faults in induction motors. *Sensors, 22*(16), 6075. https://doi.org/10.3390/s22166075",
  "Creus Solé, A. (2010). *Instrumentación industrial* (8.ª ed.). Marcombo.",
  "González-Prida Díaz, V., Crespo Márquez, A., Marcos Alberca-Carriazo, J. A., & de la Fuente Carmona, A. (2027). Reliability modelling and requirement derivation for automated railway inspection systems under operational fallback. *Reliability Engineering & System Safety, 277*, 112989. https://doi.org/10.1016/j.ress.2026.112989",
  "Groover, M. P. (2015). *Automation, production systems, and computer-integrated manufacturing* (4th ed.). Pearson.",
  "Ha, T. W., & Hong, S. J. (2020). A study on the inspection standards and methods of two-wheeled motorcycle headlight. *Journal of Auto-Vehicle Safety Association, 12*(3), 7–12. https://doi.org/10.22680/kasa2020.12.3.007",
  "International Society of Automation. (2009). *ANSI/ISA-5.1-2009: Instrumentation symbols and identification*. ISA.",
  "Kalyan Chakravarthy, P., Tamilkodi, R., Polamuri, S. R., Veera Bavitha, B., Hema Sai Subrahmanyam, S., & Vishnu Vardhan, B. (2027). Longitudinal tear detection of conveyor belt based on improved YOLOv9. En *Proceedings of International Conference on Computing Systems and Intelligent Applications* (Lecture Notes in Networks and Systems, Vol. 2055, pp. 290–302). Springer. https://doi.org/10.1007/978-3-032-30960-0_23",
  "Khir Johari, N. S., Ahmad, N., & Zainal Abidin, N. (2018). A simulation-based DEA framework to improve customer’s waiting time at vehicle inspection centre. *Journal of Technology Management and Business, 5*(2). https://journal.uthm.edu.my/index.php/jtmb/article/view/2262",
  "Kusalaphirom, T., Satiennam, T., Satiennam, W., & Seedam, A. (2022). Development of a real-world eco-driving cycle for motorcycles. *Sustainability, 14*(10), 6176. https://doi.org/10.3390/su14106176",
  "Melas, A., Franzetti, J., Buekenhoudt, P., Gavros, A., Checa, A., Suarez-Bertoa, R., & Giechaskiel, B. (2027). Identifying gross particle emitters: Insights from periodic technical inspections of diesel vehicles. *Transportation Research Part D: Transport and Environment, 162*, 105694. https://doi.org/10.1016/j.trd.2026.105694",
  "Navarro-Alcendra, D.-C., Regino-Mancera, K., Zota-Rada, J., & Troncoso-Palacio, A. (2024). Análisis para reducir los tiempos de espera en un centro de diagnóstico automotor. *Boletín de Innovación, Logística y Operaciones, 6*(1), 26–34. https://doi.org/10.17981/bilo.6.1.2024.04",
  "Ogata, K. (2010). *Ingeniería de control moderna* (5.ª ed.). Pearson Educación.",
  "Organismo Nacional de Acreditación de Colombia. (s. f.). *Centros de diagnóstico automotor*. https://onac.org.co/servicios/centros-de-diagnostico-automotor/",
  "Pallás Areny, R. (2003). *Sensores y acondicionadores de señal* (4.ª ed.). Marcombo.",
  "Schulz, W. H., & Franck, O. (2021). An empirical study to estimate the economic effects of the introduction of a periodical technical inspection (PTI) for motor vehicles in Punjab (Pakistan). *The Open Transportation Journal, 15*. https://doi.org/10.2174/1874447802115010182",
  "Singh, S. A., Jiang, X., Hartley, T., VanMastrigt, B., Miller, B., Alsada, W., Luther, J., Bostic, M., & Farahani, S. (2026). Modernization framework for real-time monitoring of legacy belt conveyor systems. *The International Journal of Advanced Manufacturing Technology, 146*, 2231–2245. https://doi.org/10.1007/s00170-026-18919-4",
  "Szymlet, N., Rymaniak, Ł., & Lijewski, P. (2024). Two-wheeled urban vehicles—A review of emissions test regulations and literature. *Energies, 17*(3), 586. https://doi.org/10.3390/en17030586",
  "Vojtisek-Lom, M., Zardini, A. A., Pechout, M., Dittrich, L., Forni, F., Montigny, F., Carriero, M., Giechaskiel, B., & Martini, G. (2020). A miniature portable emissions measurement system (PEMS) for real-driving monitoring of motorcycles. *Atmospheric Measurement Techniques, 13*, 5827–5843. https://doi.org/10.5194/amt-13-5827-2020",
  "Vrabel, J., Stopka, O., Palo, J., Stopkova, M., Droździel, P., & Michalsky, M. (2023). Research regarding different types of headlights on selected passenger vehicles when using sensor-related equipment. *Sensors, 23*(4), 1978. https://doi.org/10.3390/s23041978",
];

// ---------------- Documento ----------------
const portada = [
  vacio(), vacio(), vacio(),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: DOBLE, children: [new TextRun({ text: TITULO_FINAL, bold: true })] }),
  vacio(),
  linea("Juan Diego Rendón Tabares y Juan David Ocampo González", { align: AlignmentType.CENTER }),
  linea("Facultad de Inteligencia Artificial e Ingenierías, Universidad de Caldas", { align: AlignmentType.CENTER }),
  linea("Automatización y Control de Procesos (G8F0223)", { align: AlignmentType.CENTER }),
  linea("Docente: Mag. Diana Rocío Varón Serna", { align: AlignmentType.CENTER }),
  linea("Proyecto final — Fase 1: talleres 1, 2 y 3", { align: AlignmentType.CENTER }),
  linea("13 de noviembre de 2026", { align: AlignmentType.CENTER }),
  salto(),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: DOBLE, children: [new TextRun({ text: "Tabla de contenido", bold: true })] }),
  new TableOfContents("Tabla de contenido", { hyperlink: true, headingStyleRange: "1-2" }),
  salto(),
];

const taller1 = [
  h1("Taller 1. Planteamiento del problema y título"),
  h2("Planteamiento del problema"),
  parrafo(PROBLEMA),
  linea(`*(${conteo.problema} palabras; 7 referencias)*`, { align: AlignmentType.RIGHT }),
  h2("Justificación"),
  parrafo(JUSTIFICACION),
  linea(`*(${conteo.justificacion} palabras; 7 referencias)*`, { align: AlignmentType.RIGHT }),
  h2("Títulos candidatos"),
  ...tabla("Títulos candidatos del proyecto", ["#", "Título", "Elementos que contiene"], [
    ["1", "Diseño de un prototipo automatizado de preinspección de motocicletas a escala con banda transportadora y monitoreo web", "Producto (prototipo), objeto (motocicletas a escala), solución (banda + monitoreo web)"],
    ["2", "MotoCheck Lab: línea didáctica de verificación secuencial de iluminación, temperatura, gases y rotación de rueda", "Nombre del sistema, variables medidas, carácter secuencial"],
    ["3", "Integración de sensores y servomecanismos en una estación de prediagnóstico para motocicletas a escala basada en ESP32", "Tecnología (sensores, servos, ESP32), propósito (prediagnóstico)"],
  ], [500, 5160, 3700], "Se selecciona una versión ampliada del título 1 (ver Taller 2), porque nombra el sistema, el objeto, la solución tecnológica y su alcance sin prometer certificación vehicular."),
];

const taller2 = [
  h1("Taller 2. Objetivos y metodología"),
  h2("Título final"),
  parrafo(TITULO_FINAL + "."),
  h2("Objetivo general"),
  parrafo(OBJ_GENERAL),
  h2("Objetivos específicos"),
  ...OBJ_ESPECIFICOS.map((o) => numerada(o)),
  linea("El objetivo 1 provee la solución, el 2 su implementación en hardware y software, y el 3 la evaluación del funcionamiento piloto, como recomienda la guía del Taller 2.", { indent: { firstLine: 720 } }),
  h2("Metodología preliminar"),
  parrafo(MET_TIPO),
  parrafo(MET_OBJ1),
  parrafo(MET_OBJ2),
  parrafo(MET_OBJ3),
  linea(`*(${conteo.metodologia} palabras; 7 referencias)*`, { align: AlignmentType.RIGHT }),
  h2("Recursos requeridos"),
  ...tabla("Recursos de software y hardware", ["Tipo", "Recurso", "Uso en el proyecto"], [
    ["SW", "Arduino IDE 2 / arduino-cli, núcleo ESP32 3.x; librerías ESP32Servo, OneWire y DallasTemperature", "Firmware del controlador (máquina de estados)"],
    ["SW", "Node.js 20+: serialport, Express, Socket.IO, driver de MongoDB", "Puente PC: lee el COM, publica en tiempo real y guarda en la nube"],
    ["SW", "MongoDB Atlas (nivel gratuito M0)", "Base de datos en la nube: inspecciones, configuración y eventos"],
    ["SW", "React + Vite (panel web), GitHub (repositorio), navegador web", "Supervisión tipo SCADA, historial y reportes; control de versiones"],
    ["SW", "Gemelo digital HTML/JavaScript (simulador 3D)", "Validar la secuencia antes de construir"],
    ["SW", "Apps de luxómetro y tacómetro (celular), hoja de cálculo, Zotero", "Calibración, análisis estadístico y referencias APA"],
    ["HW", "ESP32 DevKit, regulador LM2596, driver L298N, fuente de 9 V 2 A", "Control y potencia"],
    ["HW", "LDR, DS18B20, MQ-2, sensor Hall A3144 + imanes, 4 sensores IR FC-51", "Entradas (sensores)"],
    ["HW", "2 motorreductores TT, 4 servos SG90, 8 LEDs, buzzer", "Salidas (actuadores)"],
    ["HW", "Base MDF, balso, foami o neumático, rodillos PVC, moto de juguete 1:12", "Estructura, banda y objeto inspeccionado"],
    ["HW", "Multímetro, cautín, termómetro digital de referencia", "Montaje, verificación y calibración"],
  ], [800, 4560, 4000]),
];

const taller3 = [
  h1("Taller 3. Diseño del prototipo y protocolo experimental"),
  h2("Descripción del proceso"),
  parrafo("MotoCheck Lab es una línea recta con una sola banda transportadora. Una motocicleta de juguete a escala 1:12 se detiene en cuatro estaciones. Un sensor infrarrojo detecta la llegada de la moto a cada estación y el controlador detiene la banda. Luego un servomotor acerca el instrumento, se toma la medida, se enciende un LED verde o rojo según el umbral y el brazo se retira antes del siguiente avance. **E1 Faro:** la fotocelda, dentro de una cámara oscura, mide el contraste entre el faro y la luz ambiente. **E2 Temperatura:** la sonda DS18B20 se apoya en el motor simulado. **E3 Gases:** el MQ-2 se acerca al escape y compara la lectura con su línea base. **E4 Rueda:** un rodillo con motor hace girar la rueda trasera y el sensor Hall calcula las RPM, su estabilidad (coeficiente de variación) y el tiempo de inercia."),
  parrafo("Frente al borrador del 7 de noviembre hay dos cambios, ambos por los materiales disponibles: el controlador pasa de Arduino UNO a **ESP32** (más memoria, ADC de 12 bits y WiFi para trabajos futuros) y la temperatura se mide con un **DS18B20** de contacto en lugar del MLX90614. El simulador conserva el concepto original."),
  ...tabla("Cumplimiento de los requerimientos de la guía del proyecto", ["Requerimiento", "Mínimo", "Solución en MotoCheck Lab"], [
    ["Entradas (sensores)", "4", "5 tipos y 8 señales: LDR, DS18B20, MQ-2, Hall e IR ×4"],
    ["Procesamiento (control)", "Sí", "ESP32: máquina de estados, promedios, umbrales, tiempos máximos y parada segura"],
    ["Salidas (actuadores)", "4 (luz o sonido cuentan por una)", "Motor de banda, motor del rodillo y 4 servos (6 actuadores), más LEDs + buzzer (1)"],
    ["Frontend", "Sí", "Panel web: registro de placa, inicio, vista en vivo, historial y umbrales"],
    ["Almacenamiento", "Sí", "MongoDB Atlas (nube), alimentado por el puente serial en Node.js"],
  ], [2400, 2000, 4960]),
  h2("Diagramas"),
  ...figura("fig1_arquitectura.png", "Arquitectura del sistema por capas", 620, 337, "Elaboración propia. Las etiquetas siguen la norma ANSI/ISA-5.1 (ISA, 2009)."),
  ...figura("fig2_planta.png", "Plano de la línea con nomenclatura de instrumentos", 620, 306, "Elaboración propia. Primera letra: variable medida; letras siguientes: función (ISA, 2009)."),
  ...tabla("Lista de instrumentos y conexiones al ESP32", ["Tag", "Instrumento", "Función", "Señal", "Pin"], [
    ["XT-101", "LDR + 10 kΩ", "Luminosidad del faro", "Analógica 0–3,3 V", "GPIO36"],
    ["TT-201", "DS18B20", "Temperatura del motor simulado", "Digital OneWire", "GPIO4"],
    ["AT-301", "MQ-2 (divisor 10k/20k)", "Gases, respuesta relativa", "Analógica", "GPIO39"],
    ["ST-401", "A3144 + imán", "Velocidad de la rueda (RPM)", "Pulsos (interrupción)", "GPIO27"],
    ["ZS-101…401", "FC-51 ×4", "Posición de la moto en cada estación", "Digital (LOW = presente)", "34, 35, 32, 33"],
    ["ZY-101…401", "Servo SG90 ×4", "Desplegar o retirar los brazos de medida", "PWM 50 Hz", "18, 19, 21, 22"],
    ["SY/M-001", "L298N + motorreductor TT", "Movimiento de la banda", "PWM", "GPIO25"],
    ["SY/M-401", "L298N + motorreductor TT", "Giro de la rueda trasera", "PWM", "GPIO26"],
    ["XL-101…401", "LED verde/rojo ×4", "Resultado por estación", "Digital", "13/14, 16/17, 23/2, 5/12"],
    ["XA-001", "Buzzer activo", "Resultado global (1 o 3 pitidos)", "Digital", "GPIO15"],
  ], [1250, 1900, 2700, 1900, 1610]),
  ...figura("fig3_estados.png", "Máquina de estados del controlador", 620, 363, "Elaboración propia. Si la moto no llega a una estación en 15 s, la línea pasa a ERROR: apaga los motores, retira los brazos y enciende los LEDs rojos."),
  h2("Lista de materiales"),
  ...tabla("Lista de materiales y estado de adquisición", ["Componente", "Cant.", "Función", "Estado", "Costo aprox. (COP)"], [
    ["ESP32 DevKit", "1", "Controlador", "Disponible", "35.000"],
    ["Regulador LM2596", "1", "5 V para servos y sensores", "Disponible", "8.000"],
    ["Servo SG90", "4", "Brazos de medida", "3 disponibles, 1 por comprar", "32.000"],
    ["Sensor IR FC-51", "4", "Posición", "2 disponibles, 2 por comprar", "16.000"],
    ["DS18B20, MQ-2, LDR, A3144, buzzer", "1 c/u", "Sensores y aviso", "Disponibles", "30.000"],
    ["Motorreductor TT 1:48", "2", "Banda y rodillo", "Por comprar", "14.000"],
    ["Driver L298N", "1", "Potencia de los motores", "Por comprar", "14.000"],
    ["Adaptador 9 V 2 A", "1", "Alimentación", "Por comprar", "18.000"],
    ["LEDs, resistencias, imanes", "—", "Señalización y acondicionamiento", "Por comprar", "8.000"],
    ["MDF, balso, foami o neumático, PVC, varilla", "—", "Estructura y banda", "Por comprar", "45.000"],
    ["Moto de juguete 1:12 + LED de faro", "1", "Objeto inspeccionado", "Por comprar", "25.000"],
    ["Protoboard, jumpers, silicona, tornillos", "—", "Montaje", "Por comprar", "25.000"],
    ["**Total estimado**", "", "", "", "**≈ 270.000**"],
  ], [3000, 700, 2460, 1900, 1300]),
  h2("Protocolo de pruebas"),
  parrafo("Las pruebas se harán en el laboratorio a una temperatura ambiente registrada, con la banda a su velocidad nominal y con el MQ-2 precalentado. Cada lectura queda guardada en MongoDB con su marca de tiempo. Para los errores de clasificación se adoptan las definiciones de la inspección automatizada: **error tipo I** (falsa alarma: se rechaza una moto en buen estado) y **error tipo II** (falla: se aprueba una moto defectuosa)."),
  ...tabla("Protocolo de pruebas experimentales", ["ID", "Prueba", "Procedimiento", "n", "Métrica y criterio de aceptación"], [
    ["P1", "Parada en estación", "Medir con regla la distancia entre la moto y la marca de cada estación", "20 por estación", "Error medio ≤ ±5 mm"],
    ["P2", "Calibración de la LDR", "Comparar 5 niveles de luz contra un luxómetro de referencia", "10 por nivel", "Curva mV–lux, R² ≥ 0,90"],
    ["P3", "Repetibilidad de la luz", "Faro bueno, misma posición", "30", "CV ≤ 5 %"],
    ["P4", "Temperatura", "DS18B20 contra termómetro de referencia a ~22, 40 y 55 °C; medir el tiempo de respuesta τ63", "10 por punto", "Error ≤ ±1 °C; reportar τ63"],
    ["P5", "Gases (relativo)", "Línea base en aire limpio; luego algodón con alcohol isopropílico a 5 cm (sin llama, lugar ventilado)", "30 + 30", "Relación lectura/base ≥ 1,5 detectada en todos los casos"],
    ["P6", "RPM con Hall", "Comparar con tacómetro óptico o video en cámara lenta a 3 valores de PWM", "10 por PWM", "Error ≤ 3 %; CV ≤ 10 %"],
    ["P7", "Clasificación", "5 condiciones conocidas: buena, faro débil, motor caliente, gases, rueda frenada", "10 por condición", "Exactitud ≥ 90 %; error tipo II ≤ 5 %"],
    ["P8", "Tiempo de ciclo", "Ciclos completos de inspección", "30", "Media ± DE; ≥ 95 % de ciclos sin error"],
    ["P9", "Comunicación y fallas", "Medir la latencia ESP32 → panel; desconectar un IR a propósito", "30 + 5", "0 mensajes perdidos; parada segura en el 100 % de las fallas"],
  ], [600, 1500, 3560, 1100, 2600]),
  h2("Primer prototipo (Sprint 1)"),
  parrafo("El primer prototipo combina una simulación y el firmware. La simulación es un **gemelo digital 3D en HTML** (Figura 4), revisado por la docente, que reproduce la secuencia de las cuatro estaciones, los brazos servo, el rodillo y las fallas configurables (faro apagado, motor recalentado, gases, fricción en la rueda e imán ausente). El firmware **v0.1 del ESP32** implementa la máquina de estados de la Figura 3, el protocolo serial en JSON y los comandos de inicio, parada y configuración de umbrales. Este firmware compila sin errores con el núcleo ESP32 3.3 y ocupa el 24 % de la memoria de programa. El código, los diagramas y la guía de construcción están en el repositorio https://github.com/JuanGonzalezx/MotoCheck_CDA."),
  ...figura("fig4_simulacion.png", "Gemelo digital 3D de MotoCheck Lab durante una inspección", 620, 308, "Captura del simulador incluido en el repositorio (carpeta simulacion/). Los valores mostrados son simulados."),
  ...tabla("Ejemplo de mensajes del protocolo serial (firmware v0.1)", ["Dirección", "Mensaje"], [
    ["PC → ESP32", "START;ABC12D"],
    ["ESP32 → PC", "{\"evt\":\"prueba\",\"tipo\":\"luz\",\"valor\":1650,\"base\":120,\"unidad\":\"mV\",\"min\":900,\"ok\":true}"],
    ["ESP32 → PC", "{\"evt\":\"prueba\",\"tipo\":\"rpm\",\"valor\":182.4,\"cv\":3.1,\"inercia_ms\":1450,\"ok\":true}"],
    ["ESP32 → PC", "{\"evt\":\"fin\",\"placa\":\"ABC12D\",\"aprobada\":true,\"pruebas\":[true,true,true,true],\"duracion_ms\":41230}"],
  ], [1600, 7760]),
  parrafo("**Siguiente sprint (14 al 20 de noviembre):** construir la banda y las estaciones, cargar el firmware en el hardware real, desarrollar el puente serial con MongoDB Atlas y el panel web, y ejecutar las pruebas P1 a P9 para la Fase 2."),
  h1("Cronograma"),
  ...tabla("Cronograma del proyecto", ["Fecha", "Actividad", "Entregable"], [
    ["7 nov", "Problema, justificación y marco teórico (≥ 15 artículos)", "Borrador ✓"],
    ["13 nov", "Objetivos, metodología, diagramas, lista de materiales, protocolo y simulación + firmware v0.1", "Fase 1"],
    ["14–16 nov", "Compras, estructura, banda y prueba de cada sensor", "Banda funcionando"],
    ["17–19 nov", "Firmware en hardware, puente serial, MongoDB Atlas, panel web; pruebas P1–P9", "Datos experimentales"],
    ["≤ 20 nov", "Inscripción en EAiFi (resumen con resultados preliminares)", "Inscripción"],
    ["20 nov", "Secciones de Métodos y Resultados, artículo en borrador, video demo", "Fase 2"],
    ["21–27 nov", "Ajustes, artículo final (≥ 30 referencias), repositorio y exposición", "Fase 3 + EAiFi"],
  ], [1500, 5660, 2200]),
];

const referencias = [
  h1("Referencias"),
  ...REFERENCIAS.map((r) => new Paragraph({ children: runs(r), spacing: DOBLE, indent: { left: 720, hanging: 720 } })),
];

const doc = new Document({
  creator: "Juan Diego Rendón Tabares; Juan David Ocampo González",
  title: TITULO_FINAL,
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 24 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 24, bold: true }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 240, after: 0, line: 480 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 24, bold: true }, paragraph: { spacing: { before: 120, after: 0, line: 480 }, keepNext: true, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 24, bold: true, italics: true }, paragraph: { spacing: { before: 0, after: 0, line: 480 }, keepNext: true, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "vinetas", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "objetivos", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: {
      default: new Header({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: 9360 }], children: [
        new TextRun({ text: "MOTOCHECK LAB: PREINSPECCIÓN DE MOTOCICLETAS", size: 20 }),
        new TextRun({ children: [new Tab(), PageNumber.CURRENT], size: 20 }),
      ] })] }),
    },
    children: [...portada, ...taller1, salto(), ...taller2, salto(), ...taller3, salto(), ...referencias],
  }],
});

const salida = path.join(__dirname, "Fase1_MotoCheck_Rendon_Ocampo.docx");
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(salida, b); console.log("OK", salida); });
