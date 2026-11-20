# Resumen de trabajo — EAiFi 13.0

> Texto listo para copiar en https://eaifi.org (*Inscribir Ponencia*). La inscripción la hace **un solo autor**, con su correo institucional. Los números de documento se escriben **directamente en el formulario**: no se guardan en este repositorio porque es público.

## 1. Información general

**Programa/Actividad académica:** (Ing. Sistemas y Computación) G8F0223 Automatización y Control de Procesos. *Elegir en la lista la opción que tenga el código de grupo de 2026-2.*

**Título:** MotoCheck Lab: línea automatizada de preinspección de motocicletas a escala con banda transportadora, ESP32 y supervisión web en la nube.

**Institución de afiliación:** Universidad de Caldas.

## 2. Contenido del resumen

**Introducción.** La inspección automatizada permite revisar el 100 % de las unidades de un proceso con criterios uniformes y registro trazable, por lo que es un pilar del control de calidad en la industria. En Colombia, la revisión técnico-mecánica de motocicletas solo la realizan Centros de Diagnóstico Automotor acreditados y reúne mediciones de naturaleza distinta (iluminación del faro, temperatura de operación, emisiones y estado de la rodadura) que dependen en buena parte de pasos manuales, lo que alarga los tiempos de atención y expone el proceso a errores de clasificación. Si bien existen soluciones de bajo costo para pruebas aisladas, integrarlas en una sola línea que transporte el vehículo, lo detenga en el punto exacto, acerque cada instrumento sin obstruir el paso y registre los resultados sigue siendo un desafío: un error de posicionamiento o de sincronización invalida la medida aunque el sensor funcione bien.

Este trabajo aborda dicha problemática mediante un desarrollo incremental en tres fases: el diseño y la validación de la secuencia en simulación, la construcción de la línea física con cuatro estaciones de prueba y la integración de la supervisión web con almacenamiento en la nube. De este modo, la investigación busca responder a la siguiente pregunta: ¿es viable automatizar la preinspección de motocicletas a escala con instrumentación de bajo costo, de manera repetible y trazable? El alcance del estudio abarca desde el diseño de la arquitectura y la lógica de control hasta su validación en un gemelo digital y en una maqueta física, sin pretender sustituir la revisión oficial.

**Objetivo.** Desarrollar y validar una línea automatizada a escala para la preinspección de motocicletas con registro de resultados en la nube.

**Metodología.** En la primera fase, el desafío fue definir una secuencia de inspección que coordinara transporte, posicionamiento y medición sin conflictos entre los mecanismos. Para resolverlo, se modeló la línea en un gemelo digital 3D y se diseñó una máquina de estados finitos (avance, despliegue, medición, retiro y liberación) con tiempos máximos por estación y retorno seguro ante fallas, que se depuró en un simulador del controlador antes de construir el hardware.

Posteriormente, surgió el reto de medir sobre una motocicleta de juguete que no tiene motor, ni calor propio, ni tracción, sin que los sensores obstruyeran su paso. Para ello, se construyó una banda transportadora con motorreductor y cuatro estaciones detectadas por sensores infrarrojos, en las que un servomotor acerca el instrumento y lo retira antes de cada avance: una fotocelda dentro de una cámara oscura (faro), una sonda DS18B20 sobre un motor simulado (temperatura), un sensor MQ-2 con línea base en aire limpio (gases) y un rodillo motorizado que hace girar la rueda trasera mientras un sensor Hall cuenta sus vueltas (RPM y estabilidad). Un ESP32 ejecuta la lógica de control y evalúa cada prueba frente a umbrales configurables.

Finalmente, el obstáculo fue garantizar la trazabilidad de cada inspección y la operación aun sin conexión a internet. Esto se resolvió con un puente en Node.js que lee el puerto serial, guarda cada inspección en MongoDB Atlas, con respaldo local y sincronización posterior, y la publica en tiempo real en un panel web tipo SCADA. La evaluación sigue un protocolo de nueve pruebas: calibración de cada sensor frente a un instrumento de referencia, repetibilidad, exactitud de parada, tiempo de ciclo y clasificación de motocicletas preparadas con fallas conocidas, para cuantificar los errores tipo I (falsa alarma) y tipo II (falla no detectada).

**Resultados.** *(Resultados preliminares)* Se desarrolló e integró la arquitectura completa del sistema en sus tres capas. En la capa de control, el firmware del ESP32 implementa la máquina de estados de las cuatro estaciones y un protocolo serial bidireccional en JSON, y compila sin errores con versiones fijadas, con verificación automática en cada cambio. En simulación, la línea completa un ciclo de inspección de cuatro estaciones en aproximadamente 35 s, según los tiempos programados, y responde de forma correcta ante fallas inducidas como el faro débil, la rueda frenada o el atasco de la banda, pasando a un estado de parada segura cuando la motocicleta no llega a una estación.

En la capa de supervisión, el panel web permite registrar la placa, iniciar la línea, seguir cada estación en tiempo real, consultar el historial, generar un reporte por vehículo y exportar los datos. Las pruebas automáticas del software verificaron el flujo completo de inspección, el rechazo de órdenes con la línea ocupada y la sincronización de los registros guardados sin conexión al recuperarse el acceso a la nube. La maqueta física se encuentra en construcción y las mediciones del protocolo experimental se presentarán en la socialización.

**Discusión.** El hallazgo más relevante del diseño es que, en una línea de inspección a escala, la dificultad principal no reside en la capacidad de cada sensor, sino en la coordinación entre el transporte, el posicionamiento y la medición: si el instrumento queda atravesado en la trayectoria, la motocicleta lo golpea, y si queda lejos del punto de interés, su lectura deja de ser representativa. Los brazos retráctiles y la detención por infrarrojo resuelven este conflicto, aunque añaden tiempo a cada estación. Por otro lado, los sensores de bajo costo exigen interpretar sus lecturas como indicativas: el MQ-2 responde a varios gases a la vez, por lo que se compara con su propia línea base, y la sonda de contacto DS18B20 responde lentamente, lo que alarga el ciclo. Finalmente, separar el control (ESP32) de la supervisión (puente y nube) permitió validar la lógica en simulación y mantener la operación sin internet, aunque el simulador no reemplaza las pruebas físicas.

**Conclusión.** El sistema integra transporte por banda, posicionamiento por infrarrojo, cuatro pruebas indicativas con brazos servoaccionados, control secuencial en un ESP32 y supervisión web con almacenamiento en la nube, y cumple los requisitos de un sistema automatizado con entradas, salidas, procesamiento, interfaz y base de datos. La validación en simulación indica que es viable automatizar la preinspección a escala con instrumentación de bajo costo, siempre que el diseño mecánico garantice paradas repetibles y que las lecturas se traten como indicativas. Como trabajo futuro quedan medir en la maqueta física la exactitud y los errores tipo I y II, reemplazar la sonda de contacto por un termómetro infrarrojo y modelar el efecto de esta etapa en los tiempos de atención de un CDA.

**Palabras clave.** automatización; inspección vehicular; banda transportadora; sistemas embebidos; supervisión SCADA

**Referencias**

González-Prida Díaz, V., Crespo Márquez, A., Marcos Alberca-Carriazo, J. A., & de la Fuente Carmona, A. (2027). Reliability modelling and requirement derivation for automated railway inspection systems under operational fallback. *Reliability Engineering & System Safety, 277*, 112989. https://doi.org/10.1016/j.ress.2026.112989

Groover, M. P. (2015). *Automation, production systems, and computer-integrated manufacturing* (4th ed.). Pearson.

Ha, T. W., & Hong, S. J. (2020). A study on the inspection standards and methods of two-wheeled motorcycle headlight. *Journal of Auto-Vehicle Safety Association, 12*(3), 7–12. https://doi.org/10.22680/kasa2020.12.3.007

Kusalaphirom, T., Satiennam, T., Satiennam, W., & Seedam, A. (2022). Development of a real-world eco-driving cycle for motorcycles. *Sustainability, 14*(10), 6176. https://doi.org/10.3390/su14106176

Melas, A., Franzetti, J., Buekenhoudt, P., Gavros, A., Checa, A., Suarez-Bertoa, R., & Giechaskiel, B. (2027). Identifying gross particle emitters: Insights from periodic technical inspections of diesel vehicles. *Transportation Research Part D: Transport and Environment, 162*, 105694. https://doi.org/10.1016/j.trd.2026.105694

Navarro-Alcendra, D.-C., Regino-Mancera, K., Zota-Rada, J., & Troncoso-Palacio, A. (2024). Análisis para reducir los tiempos de espera en un centro de diagnóstico automotor. *Boletín de Innovación, Logística y Operaciones, 6*(1), 26–34. https://doi.org/10.17981/bilo.6.1.2024.04

Ogata, K. (2010). *Ingeniería de control moderna* (5.ª ed.). Pearson Educación.

Singh, S. A., Jiang, X., Hartley, T., VanMastrigt, B., Miller, B., Alsada, W., Luther, J., Bostic, M., & Farahani, S. (2026). Modernization framework for real-time monitoring of legacy belt conveyor systems. *The International Journal of Advanced Manufacturing Technology, 146*, 2231–2245. https://doi.org/10.1007/s00170-026-18919-4

Szymlet, N., Rymaniak, Ł., & Lijewski, P. (2024). Two-wheeled urban vehicles—A review of emissions test regulations and literature. *Energies, 17*(3), 586. https://doi.org/10.3390/en17030586

## 3. Autores del proyecto

| | Autor 1 | Autor 2 |
|---|---|---|
| Nombres | Juan Diego | Juan David |
| Apellidos | Rendón Tabares | Ocampo González |
| Correo electrónico | (institucional) | (institucional) |
| N.º de documento | (en el formulario) | (en el formulario) |
| Ciudad de expedición | (en el formulario) | (en el formulario) |
| Afiliación | Universidad de Caldas | Universidad de Caldas |

**Consentimiento:** marcar las dos casillas. **Después de enviar:** guardar una captura de la confirmación en esta carpeta.

> **Si hay mediciones reales antes de enviar:** cambiar el último párrafo de Resultados por los números de `analisis/resultados/resultados.md` (exactitud, error tipo I y II, tiempo de ciclo) y quitar "(Resultados preliminares)".
