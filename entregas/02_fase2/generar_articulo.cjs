// Genera Articulo_MotoCheck_Rendon_Ocampo.docx (borrador de artículo, Fase 2).
// Los resultados salen de analisis/resultados/resultados.json (node analisis/analizar.mjs).
// Lo que aún no tiene datos queda resaltado en amarillo como [[PENDIENTE]].
// Uso: NODE_PATH=<carpeta con node_modules/docx> node generar_articulo.cjs
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, ImageRun, PageBreak, Header, PageNumber, LevelFormat, Tab, TabStopType, BorderStyle,
} = require("docx");

const RAIZ = path.resolve(__dirname, "..", "..");
const rutaRes = path.join(RAIZ, "analisis", "resultados", "resultados.json");
// Sin resultados todavía: se corre el análisis (deja cada prueba como "sin datos")
if (!fs.existsSync(rutaRes)) {
  require("child_process").execFileSync(process.execPath, [path.join(RAIZ, "analisis", "analizar.mjs")], { stdio: "ignore" });
}
const datos = fs.existsSync(rutaRes) ? JSON.parse(fs.readFileSync(rutaRes, "utf8")) : null;
const R = datos?.resultados ?? {};
const SIMULADO = Boolean(datos?.meta?.advertencia_simulado);
const ok = (k) => Boolean(R[k]?.disponible);

const FONT = "Times New Roman";
const DOBLE = { line: 480, before: 0, after: 0 };
const SENCILLO = { line: 240, before: 30, after: 30 };

// ---------- formato de números y marcadores ----------
const n = (v, d = 1) => (Number.isFinite(v) ? v.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d }) : null);
const p = (v, d = 1) => (Number.isFinite(v) ? `${n(100 * v, d)} %` : null);
// v(valor, "texto si falta") -> valor o [[PENDIENTE: texto]]
const v = (valor, falta = "dato") => valor ?? `[[PENDIENTE: ${falta}]]`;
const cumple = (k) => (ok(k) ? (R[k].cumple ? "cumple" : "no cumple") : "[[PENDIENTE]]");

// Texto con *cursiva*, **negrita** y [[resaltado]]
function runs(texto, base = {}) {
  const out = [];
  const re = /(\[\[[^\]]+\]\]|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, m;
  while ((m = re.exec(texto))) {
    if (m.index > last) out.push(new TextRun({ text: texto.slice(last, m.index), ...base }));
    const t = m[0];
    if (t.startsWith("[[")) out.push(new TextRun({ text: t.slice(2, -2), highlight: "yellow", ...base }));
    else if (t.startsWith("**")) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }));
    else out.push(new TextRun({ text: t.slice(1, -1), italics: true, ...base }));
    last = m.index + t.length;
  }
  if (last < texto.length) out.push(new TextRun({ text: texto.slice(last), ...base }));
  return out;
}
const parrafo = (t) => new Paragraph({ children: runs(t), spacing: DOBLE, indent: { firstLine: 720 } });
const centrado = (t, run = {}) => new Paragraph({ children: runs(t, run), spacing: DOBLE, alignment: AlignmentType.CENTER });
const ecuacion = (t) => new Paragraph({ children: runs(t), spacing: DOBLE, alignment: AlignmentType.CENTER });
// Ecuación con subíndices: "_x_" se escribe como subíndice, "*x*" en cursiva; numerada a la derecha
let nEc = 0;
function formula(t) {
  nEc++;
  const hijos = [new TextRun({ children: [new Tab()] })];
  for (const parte of t.split(/(_[^_]+_|\*[^*]+\*)/).filter(Boolean)) {
    if (parte.startsWith("_")) hijos.push(new TextRun({ text: parte.slice(1, -1), subScript: true }));
    else if (parte.startsWith("*")) hijos.push(new TextRun({ text: parte.slice(1, -1), italics: true }));
    else hijos.push(new TextRun(parte));
  }
  hijos.push(new TextRun({ children: [new Tab(), `(${nEc})`] }));
  return new Paragraph({ children: hijos, spacing: DOBLE, tabStops: [{ type: TabStopType.CENTER, position: 4680 }, { type: TabStopType.RIGHT, position: 9360 }], indent: { left: 0 } });
}
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const salto = () => new Paragraph({ children: [new PageBreak()] });
const palabras = (t) => t.replace(/\[\[|\]\]|\*/g, "").split(/\s+/).filter(Boolean).length;

let nFig = 0, nTab = 0;
function figura(archivo, titulo, ancho, alto, nota) {
  nFig++;
  const ruta = path.join(RAIZ, archivo);
  const out = [
    new Paragraph({ children: [new TextRun({ text: `Figura ${nFig}`, bold: true })], spacing: { before: 240, after: 0, line: 480 }, keepNext: true }),
    new Paragraph({ children: [new TextRun({ text: titulo, italics: true })], spacing: DOBLE, keepNext: true }),
  ];
  if (fs.existsSync(ruta)) {
    out.push(new Paragraph({ children: [new ImageRun({ type: "png", data: fs.readFileSync(ruta), transformation: { width: ancho, height: alto } })], alignment: AlignmentType.CENTER, keepNext: true }));
  } else {
    out.push(new Paragraph({ children: runs(`[[PENDIENTE: insertar ${archivo}]]`), alignment: AlignmentType.CENTER, spacing: DOBLE }));
  }
  if (nota) out.push(new Paragraph({ children: runs(`*Nota.* ${nota}`), spacing: { line: 240, before: 60, after: 240 } }));
  return out;
}

const BORDE = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
const BORDES = { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE };
function tabla(titulo, encabezados, filas, anchos, nota) {
  nTab++;
  const total = anchos.reduce((a, b) => a + b, 0);
  const celda = (t, i, cab, junta) => new TableCell({
    width: { size: anchos[i], type: WidthType.DXA },
    borders: BORDES,
    shading: cab ? { type: ShadingType.CLEAR, fill: "D9E2F3", color: "auto" } : undefined,
    margins: { top: 50, bottom: 50, left: 80, right: 80 },
    children: String(t ?? "—").split("\n").map((l) => new Paragraph({ children: runs(l, { size: 20, bold: cab || undefined }), spacing: SENCILLO, keepNext: junta })),
  });
  return [
    new Paragraph({ children: [new TextRun({ text: `Tabla ${nTab}`, bold: true })], spacing: { before: 240, after: 0, line: 480 }, keepNext: true }),
    new Paragraph({ children: [new TextRun({ text: titulo, italics: true })], spacing: DOBLE, keepNext: true }),
    new Table({
      width: { size: total, type: WidthType.DXA },
      columnWidths: anchos,
      rows: [
        new TableRow({ tableHeader: true, children: encabezados.map((t, i) => celda(t, i, true, true)) }),
        ...filas.map((f, k) => new TableRow({ cantSplit: true, children: f.map((t, i) => celda(t, i, false, k < filas.length - 1)) })),
      ],
    }),
    new Paragraph({ children: nota ? runs(`*Nota.* ${nota}`) : [], spacing: { line: 240, before: 60, after: 240 } }),
  ];
}

// ---------- frases de resultados ----------
const r1 = ok("p1") ? `El error absoluto medio de parada fue de ${n(R.p1.error_abs_medio, 2)} mm, por lo que el criterio de ±5 mm ${cumple("p1")}` : "[[PENDIENTE: resultado de P1 (error de parada por estación)]]";
const r2 = ok("p2") ? `La respuesta de la fotocelda frente al luxómetro se ajustó a la recta V = ${n(R.p2.intercepto, 1)} + ${n(R.p2.pendiente, 3)}·E (mV, con E en lux), con R² = ${n(R.p2.r2, 3)} (n = ${R.p2.n})` : "[[PENDIENTE: recta de calibración y R² de la LDR (P2)]]";
const r3 = ok("p3") ? `el contraste del faro en motos con faro en buen estado fue de ${n(R.p3.media, 0)} ± ${n(R.p3.desviacion, 0)} mV, con un coeficiente de variación de ${n(R.p3.cv_pct, 1)} % (n = ${R.p3.n})` : "[[PENDIENTE: media, DE y CV del contraste del faro (P3)]]";
const r4 = ok("p4") ? `el mayor error medio del DS18B20 frente al termómetro de referencia fue de ${n(R.p4.error_abs_peor, 2)} °C${Number.isFinite(R.p4.tau63_s) ? `, con una constante de tiempo τ63 de ${n(R.p4.tau63_s, 1)} s ante un escalón de ${n(R.p4.escalon.inicial, 1)} a ${n(R.p4.escalon.final, 1)} °C` : ""}` : "[[PENDIENTE: error del DS18B20 por punto y τ63 (P4)]]";
const r5 = ok("p5") ? `la relación lectura/línea base del MQ-2 fue de ${n(R.p5.relacion.media, 2)} ± ${n(R.p5.relacion.desviacion, 2)} en presencia de vapor de alcohol, con detección en el ${p(R.p5.deteccion, 0)} de los ensayos` : "[[PENDIENTE: relación media del MQ-2 y tasa de detección (P5)]]";
const r6 = ok("p6") ? `el error absoluto medio de la velocidad estimada con el sensor Hall fue de ${n(R.p6.error_pct_abs_medio, 2)} %, con un CV máximo de ${n(R.p6.cv_max, 1)} %` : "[[PENDIENTE: error % de RPM frente al tacómetro (P6)]]";
const r7 = ok("p7") ? `la línea clasificó correctamente ${R.p7.matriz.vp + R.p7.matriz.vn} de ${R.p7.n} motocicletas (exactitud de ${p(R.p7.exactitud)}), con una tasa de error tipo I de ${p(R.p7.error_tipo_I)} y de error tipo II de ${p(R.p7.error_tipo_II)}` : "[[PENDIENTE: exactitud y errores tipo I y II (P7)]]";
const r8 = ok("p8") ? `El tiempo de ciclo fue de ${n(R.p8.ciclo_s.media, 1)} ± ${n(R.p8.ciclo_s.desviacion, 1)} s (n = ${R.p8.completas}), equivalente a ${n(R.p8.motos_por_hora, 0)} motocicletas por hora, y el ${p(R.p8.disponibilidad)} de los ciclos terminó sin error` : "[[PENDIENTE: tiempo de ciclo, motos por hora y disponibilidad (P8)]]";
const r9 = ok("p9") ? `la línea alcanzó una parada segura en ${R.p9.seguras} de ${R.p9.n} fallas inducidas` : "[[PENDIENTE: fallas inducidas con parada segura (P9)]]";

// ---------- texto ----------
const TITULO = "MotoCheck Lab: línea automatizada de preinspección de motocicletas a escala con banda transportadora, ESP32 y supervisión web en la nube";

const RESUMEN = `La revisión técnico-mecánica de motocicletas en Colombia combina mediciones de naturaleza distinta y depende en buena parte de pasos manuales, lo que alarga los tiempos de atención y expone el proceso a errores de clasificación. Este trabajo presenta MotoCheck Lab, un prototipo a escala de línea automatizada de preinspección en el que una banda transportadora detiene una motocicleta de juguete en cuatro estaciones: faro (fotocelda), temperatura (DS18B20), gases (MQ-2) y rueda (sensor Hall con rodillo motorizado). Un ESP32 ejecuta una máquina de estados con umbrales y tiempos máximos, y un puente en Node.js registra cada inspección en MongoDB Atlas y la muestra en un panel web de supervisión. Se evaluaron la calibración y la repetibilidad de cada sensor, la exactitud de parada, el tiempo de ciclo y la clasificación de motocicletas con condición conocida. ${ok("p7") ? `La línea alcanzó una exactitud de ${p(R.p7.exactitud)}, con un error tipo II de ${p(R.p7.error_tipo_II)}` : "[[PENDIENTE: exactitud y error tipo II]]"}${ok("p8") ? ` y un tiempo de ciclo de ${n(R.p8.ciclo_s.media, 1)} s.` : " [[PENDIENTE: tiempo de ciclo]]."} ${ok("p7") && R.p7.cumple ? "Los resultados muestran que la automatización de verificaciones preliminares con instrumentación de bajo costo es viable a escala de laboratorio, siempre que sus lecturas se interpreten como indicativas." : "[[PENDIENTE: frase de conclusión según los resultados]]"}`;

const INTRO = [
  "La revisión técnico-mecánica y de emisiones contaminantes es obligatoria para los vehículos que circulan en Colombia, incluidas las motocicletas (Congreso de la República de Colombia, 2002), y solo pueden realizarla los Centros de Diagnóstico Automotor (CDA) habilitados por el Ministerio de Transporte y acreditados por el Organismo Nacional de Acreditación (Ministerio de Transporte, 2013; ONAC, s. f.). En otros países, las inspecciones técnicas periódicas se han estudiado como herramientas de seguridad vial y de control ambiental, con efectos económicos medibles (Schulz & Franck, 2021) y con la capacidad de identificar a los grandes emisores mediante umbrales de ensayo bien definidos (Melas et al., 2027; Zhao et al., 2027).",
  "En la práctica, la inspección de una motocicleta reúne mediciones heterogéneas. La iluminación del faro requiere condiciones controladas de distancia, ángulo y luz ambiente (Ha & Hong, 2020; Vrabel et al., 2023); las emisiones de los vehículos de dos ruedas exigen instrumentos selectivos y procedimientos normalizados (Szymlet et al., 2024; Vojtisek-Lom et al., 2020), y el estado de la rodadura y la temperatura de operación se infieren de magnitudes indirectas, como la velocidad de giro o la distribución térmica (Kusalaphirom et al., 2022; Luo et al., 2027). A esta heterogeneidad se suman los tiempos de espera de los usuarios: el flujo de un CDA presenta cuellos de botella que pueden modelarse y reducirse (Khir Johari et al., 2018; Navarro-Alcendra et al., 2024).",
  "La inspección automatizada es una respuesta conocida a estos problemas en la manufactura: permite revisar el 100 % de las unidades con criterios uniformes, registrar los resultados de forma trazable y cuantificar los errores de clasificación tipo I (falsa alarma) y tipo II (falla no detectada) (Groover, 2015). Trabajos recientes la aplican a la alineación de componentes de baterías (Ji et al., 2027), a la detección de anomalías superficiales (Li et al., 2027), a la clasificación de productos sobre bandas transportadoras (Flores et al., 2027) y al monitoreo de las propias bandas (Kalyan Chakravarthy et al., 2027; Santos et al., 2020; Singh et al., 2026). En la inspección de infraestructura se han integrado la termografía (Alvarado-Hernández et al., 2022; Araujo et al., 2027), la visión artificial en el borde (Huang et al., 2027; Vikash et al., 2027) y la colaboración entre personas y robots (Mao et al., 2027). Además, la confiabilidad de estos sistemas depende de prever un retorno seguro a la operación manual cuando fallan (González-Prida Díaz et al., 2027).",
  "En el caso de las motocicletas, los antecedentes de bajo costo se concentran en pruebas aisladas: el control del faro (Calma, 2023), la evaluación de emisiones con sensores de gases y lógica difusa (Afridon et al., 2025) y el registro de velocidad con sensores de efecto Hall (Kusalaphirom et al., 2022, 2023). No se encontró, en la literatura revisada, un modelo a escala que integre transporte, posicionamiento, varias pruebas secuenciales y registro en la nube para estudiar de forma cuantitativa la automatización de la preinspección. Por ello, el objetivo de este trabajo fue desarrollar un prototipo a escala de una línea automatizada de preinspección de motocicletas que, mediante una banda transportadora, sensores de luz, temperatura, gases y velocidad, un controlador ESP32 y una aplicación web con almacenamiento en la nube, ejecute y registre pruebas indicativas, con el fin de evaluar su repetibilidad y su tiempo de ciclo en condiciones de laboratorio.",
];

const MET = {
  enfoque: "Se realizó una investigación aplicada, de enfoque cuantitativo, con un diseño experimental de laboratorio. El desarrollo fue iterativo, en *sprints* semanales: primero se validó la secuencia en un gemelo digital 3D y en un simulador del controlador, y luego se construyó y midió la maqueta física. Los instrumentos y actuadores se seleccionaron a partir de sus hojas de datos y de los principios de instrumentación industrial (Creus Solé, 2010; Pallás Areny, 2003), y se identificaron con la nomenclatura ANSI/ISA-5.1 (International Society of Automation [ISA], 2009).",
  arquitectura: "El sistema se organizó en tres capas (Figura 1). La capa de campo reúne los sensores y actuadores de la línea. La capa de control es un microcontrolador ESP32 de doble núcleo, con un ADC de 12 bits y salidas PWM (Espressif Systems, s. f.). La capa de supervisión corre en un computador: un puente en Node.js lee el puerto serial USB a 115 200 baudios, guarda cada inspección en MongoDB Atlas y publica los eventos en tiempo real a un panel web, al estilo de un sistema SCADA. La comunicación es bidireccional: el panel envía la placa, las órdenes de inicio y parada y los umbrales, y el ESP32 responde con mensajes JSON de estado, prueba y fin.",
  linea: "La línea es una banda recta de unos 105 cm entre ejes, con rodillos de PVC, una cama de deslizamiento de balso y un motorreductor TT gobernado por un puente H L298N (Figura 2). La motocicleta de juguete, a escala 1:12, avanza por cuatro estaciones separadas 20 cm. En cada una hay un sensor infrarrojo que detecta su llegada y un servomotor SG90 que acerca el instrumento y lo retira antes del siguiente avance. La Tabla 1 resume la instrumentación. La fotocelda trabaja en un divisor de tensión dentro de un tubo negro (cámara oscura). El DS18B20 es un termómetro digital de contacto con bus 1-Wire y una resolución de hasta 0,0625 °C (Maxim Integrated, s. f.). El MQ-2 es un sensor de gases de respuesta cruzada, por lo que solo se usa como indicador relativo. En la estación de rueda, un segundo motorreductor con un rodillo de goma hace girar la rueda trasera, y un imán en el rin pasa frente a un sensor Hall una vez por vuelta.",
  control: "El ESP32 ejecuta una máquina de estados no bloqueante (Figura 3): ESPERA, AVANZANDO, DESPLEGANDO, MIDIENDO, RETIRANDO y, al final, SALIENDO y FIN. Si la motocicleta no llega a una estación en 15 s, la línea pasa a ERROR, apaga los motores y retira los brazos, siguiendo el principio de retorno seguro (González-Prida Díaz et al., 2027). Cada prueba es una decisión ON-OFF frente a un umbral configurable (Ogata, 2010):",
  control2: "donde las *V* son promedios de tensión en mV: el faro se compara con la luz ambiente medida al inicio de cada inspección, y los gases, con su línea base en aire limpio. Para la rueda, *T*medio es el periodo medio entre pulsos en µs y CV su coeficiente de variación. La rueda aprueba si la velocidad está entre 80 y 400 RPM y el CV es como máximo de 10 %. Al apagar el rodillo se registra el tiempo de inercia como indicador complementario de fricción.",
  supervision: "El puente valida la placa, impide iniciar una inspección con la línea ocupada y reenvía los umbrales guardados cada vez que el ESP32 se reinicia. Cada inspección se guarda como un documento con la placa, el resultado, las pruebas, la línea base, la duración, el origen (controlador real o simulador) y los umbrales vigentes, lo que da trazabilidad. Si no hay conexión con Atlas, el documento se guarda en un archivo local y se sincroniza al volver la conexión. El panel (Figura 4) muestra el estado de cada estación, el historial, las estadísticas por prueba y un reporte imprimible.",
  diseno: "La Tabla 2 resume el protocolo experimental. Para la clasificación (P7) se prepararon cinco condiciones conocidas, y la condición de cada moto se codificó en el prefijo de su placa: BUE (buena), FAR (faro débil, LED con mayor resistencia), TMP (motor caliente, bloque de aluminio precalentado), GAS (vapor de alcohol isopropílico en el escape, sin llama y en un lugar ventilado) y RUE (rueda con roce mecánico). Una motocicleta defectuosa rechazada es un verdadero positivo (VP) y una aprobada es un falso negativo (FN, error tipo II); una buena rechazada es un falso positivo (FP, error tipo I) y una aprobada es un verdadero negativo (VN). Con esto se calcularon la exactitud, el error tipo I y el error tipo II:",
  analisis: "Los datos de la línea se exportaron desde el puente y las mediciones manuales (P1, P2, P4, P5, P6 y P9) se registraron en hojas CSV. Un script reproducible (analisis/analizar.mjs, en el repositorio del proyecto) calculó la media, la desviación estándar muestral y el coeficiente de variación; la recta de calibración por mínimos cuadrados y su R²; y la constante de tiempo τ63, que es el tiempo que tarda el sensor en alcanzar el 63,2 % de un escalón de temperatura. Para el análisis solo se usaron inspecciones con origen en el controlador real.",
};

const DISCUSION = [
  `Los resultados de clasificación (${ok("p7") ? `exactitud de ${p(R.p7.exactitud)}` : "[[PENDIENTE]]"}) indican que una secuencia simple de umbrales sobre sensores de bajo costo puede separar las condiciones preparadas cuando las variables de influencia se controlan: la luz ambiente con la cámara oscura, la posición con la parada por infrarrojo y la deriva del MQ-2 con su línea base por inspección. Este resultado coincide con la literatura de inspección automatizada, que asocia la uniformidad del criterio con una menor variabilidad de las decisiones (Groover, 2015; Ji et al., 2027). Sin embargo, la exactitud de una maqueta no se traslada a un CDA: allí las magnitudes se miden con equipos certificados y bajo procedimientos normalizados (Ha & Hong, 2020; Szymlet et al., 2024).`,
  `El error tipo II merece atención especial, porque aprobar una motocicleta defectuosa es la falla más grave en una inspección (Groover, 2015). ${ok("p7") ? (R.p7.error_tipo_II > 0 ? "Los casos de error tipo II observados deben revisarse por condición (Tabla 5) para ajustar el umbral de la prueba correspondiente, aceptando un posible aumento del error tipo I, en la misma línea del equilibrio entre beneficio y carga regulatoria que describen Zhao et al. (2027)." : "En los ensayos no se observaron errores tipo II; aun así, el tamaño de la muestra limita la generalización y conviene ampliarla.") : "[[PENDIENTE: interpretar el error tipo II por condición]]"}`,
  `En cuanto a la instrumentación, el DS18B20 de contacto responde de forma lenta (${ok("p4") && Number.isFinite(R.p4.tau63_s) ? `τ63 = ${n(R.p4.tau63_s, 1)} s` : "[[PENDIENTE: τ63]]"}), lo que obliga a sostener la sonda varios segundos y alarga el ciclo. Un termómetro infrarrojo como el MLX90614 eliminaría el contacto, aunque introduciría la dependencia de la emisividad que discuten Alvarado-Hernández et al. (2022) y Araujo et al. (2027). El MQ-2 no distingue entre gases (Afridon et al., 2025; Vojtisek-Lom et al., 2020), y por eso su resultado se reporta como relativo. El conteo de pulsos con efecto Hall, en cambio, es un principio robusto y de bajo costo para estimar la velocidad de giro (Kusalaphirom et al., 2022, 2023), y su exactitud en la maqueta se cuantificó en P6.`,
  `Finalmente, ${r8.charAt(0).toLowerCase() + r8.slice(1)}. Este valor caracteriza una línea a escala y no un CDA real, pero ofrece una base para modelar el flujo y estudiar dónde se concentran las esperas, como proponen Navarro-Alcendra et al. (2024) y Khir Johari et al. (2018). La arquitectura de supervisión, que separa la máquina física, los datos y la pantalla, coincide con los trabajos de modernización de transportadores (Kalyan Chakravarthy et al., 2027; Singh et al., 2026) y facilita incorporar en el futuro visión artificial en el borde (Huang et al., 2027; Vikash et al., 2027).`,
];

const CONCLUSIONES = [
  "Se desarrolló MotoCheck Lab, una línea automatizada a escala que integra transporte por banda, posicionamiento por infrarrojo, cuatro pruebas indicativas con brazos servoaccionados, control secuencial en un ESP32 y supervisión web con almacenamiento en la nube. El sistema cumple los requerimientos del proyecto (más de cuatro entradas y cuatro salidas, procesamiento, frontend y base de datos) y deja trazabilidad completa de cada inspección.",
  `La evaluación experimental mostró que ${r7}, y que ${r3}. ${ok("p7") && R.p7.cumple ? "Estos resultados confirman la viabilidad de automatizar verificaciones preliminares con instrumentación de bajo costo, siempre que sus resultados se interpreten como indicativos y no como una revisión técnico-mecánica oficial." : "[[PENDIENTE: valorar si se cumplieron los criterios y qué ajustes hacen falta]]"}`,
  "Como trabajo futuro se propone: reemplazar la sonda de contacto por un termómetro infrarrojo; agregar un sensor de gases selectivo y calibrado; usar una cámara para verificar la alineación del haz del faro; enviar los datos directamente por WiFi desde el ESP32, y modelar con simulación de eventos discretos el impacto de una etapa de preinspección automatizada en los tiempos de espera de un CDA.",
];

const REFERENCIAS = [
  "Afridon, M., Syah, K., Marzuarman, Susanto, H., Arifin, M., Abdillah, M. A. S., & Ramadhan, M. Z. N. (2025). Implementation of fuzzy logic on motorcycle emission testing device using multi-gas sensors. *INOVTEK Polbeng – Seri Informatika, 10*(3), 1772–1781. https://doi.org/10.35314/w1802r28",
  "Alvarado-Hernández, A. I., Zamudio-Ramírez, I., Jaen-Cuellar, A. Y., Osornio-Rios, R. A., Donderis-Quiles, V., & Antonino-Daviu, J. A. (2022). Infrared thermography smart sensor for the condition monitoring of gearbox and bearings faults in induction motors. *Sensors, 22*(16), 6075. https://doi.org/10.3390/s22166075",
  "Araujo, B. V. S., Rodrigues, G. A., de Oliveira, J. H. P., Xavier, G. V. R., Lebre, U. D. E. de S., Araujo, C. A. C., Ferreira, T. V., & Serres, A. J. R. (2027). Multispectral correlation of infrared, ultraviolet, and leakage current attributes in a 500 kV substation under coastal environmental stress. *Electric Power Systems Research, 265*, 113973. https://doi.org/10.1016/j.epsr.2026.113973",
  "Calma, B. O. (2023). Automatic headlight intensity controller for motorcycle. *Advances in Research, 24*(6), 282–295. https://doi.org/10.9734/air/2023/v24i61010",
  "Congreso de la República de Colombia. (2002). *Ley 769 de 2002, por la cual se expide el Código Nacional de Tránsito Terrestre*. Diario Oficial.",
  "Creus Solé, A. (2010). *Instrumentación industrial* (8.ª ed.). Marcombo.",
  "Espressif Systems. (s. f.). *ESP32 series datasheet*. https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf",
  "Flores, H. H., González Meneses, Y. N., Pedroza Méndez, B. E., Bonilla Huerta, E., Medina Barrera, M. G., & Islas Cerón, A. (2027). Automatic real-time classification of peach quality using a convolutional neural network. *Communications in Computer and Information Science, 3096*, 521–533. https://doi.org/10.1007/978-3-032-37444-8_39",
  "González-Prida Díaz, V., Crespo Márquez, A., Marcos Alberca-Carriazo, J. A., & de la Fuente Carmona, A. (2027). Reliability modelling and requirement derivation for automated railway inspection systems under operational fallback. *Reliability Engineering & System Safety, 277*, 112989. https://doi.org/10.1016/j.ress.2026.112989",
  "Groover, M. P. (2015). *Automation, production systems, and computer-integrated manufacturing* (4th ed.). Pearson.",
  "Ha, T. W., & Hong, S. J. (2020). A study on the inspection standards and methods of two-wheeled motorcycle headlight. *Journal of Auto-Vehicle Safety Association, 12*(3), 7–12. https://doi.org/10.22680/kasa2020.12.3.007",
  "Huang, M., Wang, R., Lan, Z., Yu, S., & Xie, C. (2027). Vision-based defect detection of transmission line insulators in rainy and foggy weather. *Electric Power Systems Research, 262*, 113474. https://doi.org/10.1016/j.epsr.2026.113474",
  "International Society of Automation. (2009). *ANSI/ISA-5.1-2009: Instrumentation symbols and identification*. ISA.",
  "Ji, Y.-J., Kim, Y.-H., Lee, J., Lee, Y.-H., & Park, J.-I. (2027). Development of an automated inspection system for busbar and silicone pad alignment in secondary batteries. *Communications in Computer and Information Science, 2973*. https://doi.org/10.1007/978-3-032-28472-3_32",
  "Kalyan Chakravarthy, P., Tamilkodi, R., Polamuri, S. R., Veera Bavitha, B., Hema Sai Subrahmanyam, S., & Vishnu Vardhan, B. (2027). Longitudinal tear detection of conveyor belt based on improved YOLOv9. *Lecture Notes in Networks and Systems, 2055*, 290–302. https://doi.org/10.1007/978-3-032-30960-0_23",
  "Khir Johari, N. S., Ahmad, N., & Zainal Abidin, N. (2018). A simulation-based DEA framework to improve customer’s waiting time at vehicle inspection centre. *Journal of Technology Management and Business, 5*(2). https://journal.uthm.edu.my/index.php/jtmb/article/view/2262",
  "Kusalaphirom, T., Satiennam, T., Satiennam, W., & Seedam, A. (2022). Development of a real-world eco-driving cycle for motorcycles. *Sustainability, 14*(10), 6176. https://doi.org/10.3390/su14106176",
  "Kusalaphirom, T., Satiennam, T., & Satiennam, W. (2023). Factors influencing the real-world electricity consumption of electric motorcycles. *Energies, 16*(17), 6369. https://doi.org/10.3390/en16176369",
  "Li, L., Hao, T., Li, X., Liu, H., Zhai, L., Li, Z., Wu, Y., Cui, L., & Tong, Q. (2027). MPFA-Net: Multi-perspective feature aggregation and saliency reweighting for image anomaly detection. *Lecture Notes in Computer Science, 16660*. https://doi.org/10.1007/978-981-92-3507-0_14",
  "Luo, Y., Liu, C., Zhou, Z., Tao, G., Wen, Z., Yang, X., & Wang, W. (2027). A numerical framework for hot spot formation on railway wheels during tread braking. *Tribology International, 227*, 112786. https://doi.org/10.1016/j.triboint.2026.112786",
  "Mao, R., Jiang, B., He, P., Chen, C., Chen, W., & Lai, X. (2027). Optimizing cobots inspection routing in chemical plants. *Expert Systems with Applications, 333*, 133794. https://doi.org/10.1016/j.eswa.2026.133794",
  "Maxim Integrated. (s. f.). *DS18B20 programmable resolution 1-Wire digital thermometer* [Hoja de datos]. https://www.analog.com/media/en/technical-documentation/data-sheets/ds18b20.pdf",
  "Melas, A., Franzetti, J., Buekenhoudt, P., Gavros, A., Checa, A., Suarez-Bertoa, R., & Giechaskiel, B. (2027). Identifying gross particle emitters: Insights from periodic technical inspections of diesel vehicles. *Transportation Research Part D: Transport and Environment, 162*, 105694. https://doi.org/10.1016/j.trd.2026.105694",
  "Ministerio de Transporte de Colombia. (2013). *Resolución 3768 de 2013, por la cual se establecen las condiciones que deben cumplir los Centros de Diagnóstico Automotor para su habilitación y funcionamiento*.",
  "Navarro-Alcendra, D.-C., Regino-Mancera, K., Zota-Rada, J., & Troncoso-Palacio, A. (2024). Análisis para reducir los tiempos de espera en un centro de diagnóstico automotor. *Boletín de Innovación, Logística y Operaciones, 6*(1), 26–34. https://doi.org/10.17981/bilo.6.1.2024.04",
  "Ogata, K. (2010). *Ingeniería de control moderna* (5.ª ed.). Pearson Educación.",
  "Organismo Nacional de Acreditación de Colombia. (s. f.). *Centros de diagnóstico automotor*. https://onac.org.co/servicios/centros-de-diagnostico-automotor/",
  "Pallás Areny, R. (2003). *Sensores y acondicionadores de señal* (4.ª ed.). Marcombo.",
  "Santos, A. A., Rocha, F. A. S., Reis, A. J. da R., & Guimarães, F. G. (2020). Automatic system for visual detection of dirt buildup on conveyor belts using convolutional neural networks. *Sensors, 20*(20), 5762. https://doi.org/10.3390/s20205762",
  "Schulz, W. H., & Franck, O. (2021). An empirical study to estimate the economic effects of the introduction of a periodical technical inspection (PTI) for motor vehicles in Punjab (Pakistan). *The Open Transportation Journal, 15*. https://doi.org/10.2174/1874447802115010182",
  "Singh, S. A., Jiang, X., Hartley, T., VanMastrigt, B., Miller, B., Alsada, W., Luther, J., Bostic, M., & Farahani, S. (2026). Modernization framework for real-time monitoring of legacy belt conveyor systems. *The International Journal of Advanced Manufacturing Technology, 146*, 2231–2245. https://doi.org/10.1007/s00170-026-18919-4",
  "Szymlet, N., Rymaniak, Ł., & Lijewski, P. (2024). Two-wheeled urban vehicles—A review of emissions test regulations and literature. *Energies, 17*(3), 586. https://doi.org/10.3390/en17030586",
  "Vikash, M. S., Yogesh, P. P., Amar Raj, R. D., & Manimaran, S. (2027). A parameter-efficient entropy-guided feature suppression framework for accurate insulator fault detection in edge-compatible drone inspection. *Electric Power Systems Research, 265*, 114117. https://doi.org/10.1016/j.epsr.2026.114117",
  "Vojtisek-Lom, M., Zardini, A. A., Pechout, M., Dittrich, L., Forni, F., Montigny, F., Carriero, M., Giechaskiel, B., & Martini, G. (2020). A miniature portable emissions measurement system (PEMS) for real-driving monitoring of motorcycles. *Atmospheric Measurement Techniques, 13*, 5827–5843. https://doi.org/10.5194/amt-13-5827-2020",
  "Vrabel, J., Stopka, O., Palo, J., Stopkova, M., Droździel, P., & Michalsky, M. (2023). Research regarding different types of headlights on selected passenger vehicles when using sensor-related equipment. *Sensors, 23*(4), 1978. https://doi.org/10.3390/s23041978",
  "Zhao, J., Lu, J., Zhang, T., Wang, Y., Luo, Z., Cai, X., Yang, X., Zhang, L., Wang, Y., Wang, H., Chen, W., Yin, H., Liu, H., & Ding, Y. (2027). Balancing emission reduction and regulatory burden under inspection limits for diesel fleets. *Transportation Research Part D: Transport and Environment, 162*, 105665. https://doi.org/10.1016/j.trd.2026.105665",
];

console.log(`Resumen: ${palabras(RESUMEN)} palabras · referencias: ${REFERENCIAS.length} · resultados: ${SIMULADO ? "SIMULADOS" : Object.values(R).some((x) => x.disponible) ? "reales" : "sin datos aún"}`);

// ---------- tablas de resultados ----------
const filaCumple = (k, nombre, medida) => [k.toUpperCase(), nombre, R[k].criterio, medida ?? "[[PENDIENTE]]", cumple(k)];
const tablaResumen = [
  filaCumple("p1", "Parada en estación", ok("p1") ? `${n(R.p1.error_abs_medio, 2)} mm` : null),
  filaCumple("p2", "Calibración LDR", ok("p2") ? `R² = ${n(R.p2.r2, 3)}` : null),
  filaCumple("p3", "Repetibilidad del faro", ok("p3") ? `CV = ${n(R.p3.cv_pct, 1)} %` : null),
  filaCumple("p4", "Temperatura", ok("p4") ? `${n(R.p4.error_abs_peor, 2)} °C` : null),
  filaCumple("p5", "Gases (relativo)", ok("p5") ? `${p(R.p5.deteccion, 0)} detección` : null),
  filaCumple("p6", "RPM con Hall", ok("p6") ? `${n(R.p6.error_pct_abs_medio, 2)} %; CV ${n(R.p6.cv_max, 1)} %` : null),
  filaCumple("p7", "Clasificación", ok("p7") ? `exactitud ${p(R.p7.exactitud)}; tipo II ${p(R.p7.error_tipo_II)}` : null),
  filaCumple("p8", "Ciclo y disponibilidad", ok("p8") ? `${n(R.p8.ciclo_s.media, 1)} s; ${p(R.p8.disponibilidad)}` : null),
  filaCumple("p9", "Fallas inducidas", ok("p9") ? `${R.p9.seguras}/${R.p9.n}` : null),
];
const m = R.p7?.matriz;
const tablaMatriz = [
  ["Defectuosa (FAR, TMP, GAS, RUE)", ok("p7") ? `${m.vp} (VP)` : "[[VP]]", ok("p7") ? `${m.fn} (FN, tipo II)` : "[[FN]]"],
  ["Buena (BUE)", ok("p7") ? `${m.fp} (FP, tipo I)` : "[[FP]]", ok("p7") ? `${m.vn} (VN)` : "[[VN]]"],
];
const tablaCondicion = ok("p7")
  ? R.p7.por_condicion.map((c) => [`${c.prefijo} · ${c.condicion}`, String(c.n), String(c.correctas), p(c.exactitud)])
  : [["[[PENDIENTE]]", "", "", ""]];

const autores = [
  centrado(`**${TITULO}**`),
  centrado("Juan Diego Rendón Tabares¹ · Juan David Ocampo González¹"),
  centrado("¹ Programa de Ingeniería de Sistemas y Computación, Facultad de Inteligencia Artificial e Ingenierías, Universidad de Caldas, Manizales, Colombia"),
  centrado("[[PENDIENTE: correos institucionales de los autores]]"),
];

const cuerpo = [
  ...(SIMULADO ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "BORRADOR CON DATOS SIMULADOS — NO ENTREGAR", bold: true, color: "C00000", size: 28 })] })] : []),
  ...autores,
  h1("Resumen"),
  parrafo(RESUMEN),
  new Paragraph({ children: runs("**Palabras clave:** automatización; inspección vehicular; banda transportadora; ESP32; sistemas SCADA"), spacing: DOBLE, indent: { firstLine: 720 } }),
  h1("Introducción"),
  ...INTRO.map(parrafo),
  h1("Metodología"),
  h2("Enfoque y diseño de la investigación"),
  parrafo(MET.enfoque),
  h2("Arquitectura del sistema"),
  parrafo(MET.arquitectura),
  ...figura("entregas/01_fase1/figuras/fig1_arquitectura.png", "Arquitectura de MotoCheck Lab por capas", 600, 326, "Elaboración propia."),
  h2("Línea física e instrumentación"),
  parrafo(MET.linea),
  ...figura("entregas/01_fase1/figuras/fig2_planta.png", "Plano de la línea con nomenclatura ISA-5.1", 600, 296, "Elaboración propia."),
  ...tabla("Instrumentación de la línea", ["Tag", "Instrumento", "Variable o función", "Señal"], [
    ["XT-101", "LDR + 10 kΩ", "Luminosidad del faro", "Analógica 0–3,3 V"],
    ["TT-201", "DS18B20", "Temperatura del motor simulado", "Digital 1-Wire"],
    ["AT-301", "MQ-2 (divisor 10k/20k)", "Gases, respuesta relativa", "Analógica"],
    ["ST-401", "A3144 + imán", "Velocidad de la rueda", "Pulsos (interrupción)"],
    ["ZS-101…401", "FC-51 ×4", "Posición de la moto", "Digital"],
    ["ZY-101…401", "Servo SG90 ×4", "Desplegar o retirar los brazos", "PWM 50 Hz"],
    ["M-001 / M-401", "Motorreductor TT + L298N", "Banda y rodillo de la rueda", "PWM"],
  ], [1500, 2500, 3200, 2160]),
  h2("Lógica de control"),
  parrafo(MET.control),
  formula("*ΔV* = *V*_faro_ − *V*_ambiente_ ≥ *V*_mín_"),
  formula("*R* = *V*_gas_ / *V*_base_ ≤ *R*_máx_"),
  formula("*RPM* = 60 × 10⁶ / *T*_medio_"),
  formula("*CV* = 100 · *s* / *x*_medio_"),
  parrafo(MET.control2),
  ...figura("entregas/01_fase1/figuras/fig3_estados.png", "Máquina de estados del controlador", 600, 351, "Elaboración propia."),
  h2("Supervisión y almacenamiento"),
  parrafo(MET.supervision),
  ...figura("entregas/02_fase2/figuras/fig5_panel_vivo.png", "Panel web durante una inspección", 600, 358, "Captura del panel durante la inspección de una moto en la estación 4. [[Reemplazar por una captura con el ESP32 real]]"),
  h2("Diseño experimental"),
  parrafo(MET.diseno),
  formula("Exactitud = (VP + VN) / N"),
  formula("Error tipo I = FP / (FP + VN)"),
  formula("Error tipo II = FN / (FN + VP)"),
  ...tabla("Protocolo experimental", ["ID", "Prueba", "Procedimiento", "n", "Criterio"], [
    ["P1", "Parada en estación", "Distancia entre la moto y la marca de la estación, medida con regla", "20 por estación", "≤ ±5 mm"],
    ["P2", "Calibración LDR", "5 niveles de luz frente a un luxómetro de referencia", "10 por nivel", "R² ≥ 0,90"],
    ["P3", "Repetibilidad del faro", "Faro bueno en la misma posición", "≥ 30", "CV ≤ 5 %"],
    ["P4", "Temperatura", "DS18B20 frente a un termómetro de referencia a ~22, 40 y 55 °C; escalón para τ63", "10 por punto", "Error ≤ ±1 °C"],
    ["P5", "Gases", "Aire limpio frente a vapor de alcohol a 5 cm", "30 + 30", "Detección del 100 %"],
    ["P6", "RPM con Hall", "Frente a un tacómetro óptico, con 3 valores de PWM", "10 por PWM", "Error ≤ 3 %; CV ≤ 10 %"],
    ["P7", "Clasificación", "Condiciones BUE, FAR, TMP, GAS y RUE", "10 por condición", "Exactitud ≥ 90 %; tipo II ≤ 5 %"],
    ["P8", "Tiempo de ciclo", "Ciclos completos", "≥ 30", "≥ 95 % sin error"],
    ["P9", "Fallas inducidas", "Desconectar un IR o bloquear la banda", "5", "Parada segura en el 100 %"],
  ], [600, 1700, 3700, 1300, 2060]),
  h2("Análisis de datos"),
  parrafo(MET.analisis),

  h1("Resultados y análisis"),
  parrafo(`La Tabla 3 resume el cumplimiento de los criterios de aceptación. ${datos?.meta?.n_inspecciones ? `El análisis incluyó ${datos.meta.n_inspecciones} inspecciones registradas por la línea.` : "[[PENDIENTE: número de inspecciones analizadas]]"}`),
  ...tabla("Resultados frente a los criterios de aceptación", ["ID", "Prueba", "Criterio", "Resultado", "Estado"], tablaResumen, [600, 2000, 2900, 2360, 1500]),
  h2("Posicionamiento y sensores"),
  parrafo(`${r1}. ${r2}. En la repetibilidad, ${r3}. En la prueba de temperatura, ${r4}. Para los gases, ${r5}. Por último, ${r6}.`),
  h2("Clasificación de motocicletas con condición conocida"),
  parrafo(`En el ensayo de clasificación (P7), ${r7} (Tablas 4 y 5).`),
  ...tabla("Matriz de confusión de la línea (P7)", ["Condición real", "Rechazada", "Aprobada"], tablaMatriz, [3600, 2880, 2880]),
  ...tabla("Exactitud por condición preparada (P7)", ["Condición", "n", "Correctas", "Exactitud"], tablaCondicion, [3800, 1500, 2000, 2060], "Una moto defectuosa cuenta como correcta solo si se rechaza en la prueba que corresponde a su falla."),
  h2("Tiempo de ciclo, disponibilidad y fallas"),
  parrafo(`${r8}. En las pruebas de robustez, ${r9}.`),
  ...figura("entregas/02_fase2/figuras/fig6_maqueta.png", "Maqueta física de MotoCheck Lab", 600, 340, "[[PENDIENTE: fotografía de la maqueta terminada (guardarla como entregas/02_fase2/figuras/fig6_maqueta.png)]]"),

  h1("Discusión"),
  ...DISCUSION.map(parrafo),
  h1("Conclusiones y trabajos futuros"),
  ...CONCLUSIONES.map(parrafo),
  h1("Referencias"),
  ...REFERENCIAS.map((r) => new Paragraph({ children: runs(r), spacing: DOBLE, indent: { left: 720, hanging: 720 } })),
];

const doc = new Document({
  creator: "Juan Diego Rendón Tabares; Juan David Ocampo González",
  title: TITULO,
  styles: {
    default: { document: { run: { font: FONT, size: 24 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 24, bold: true }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 240, after: 0, line: 480 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 24, bold: true }, paragraph: { spacing: { before: 120, after: 0, line: 480 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: "vinetas", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: {
      default: new Header({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: 9360 }], children: [
        new TextRun({ text: "MOTOCHECK LAB: PREINSPECCIÓN AUTOMATIZADA DE MOTOCICLETAS", size: 20 }),
        new TextRun({ children: [new Tab(), PageNumber.CURRENT], size: 20 }),
      ] })] }),
    },
    children: cuerpo,
  }],
});

const salida = path.join(__dirname, SIMULADO ? "Articulo_MotoCheck_SIMULADO_NO_ENTREGAR.docx" : "Articulo_MotoCheck_Rendon_Ocampo.docx");
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(salida, b); console.log("OK", salida); });
