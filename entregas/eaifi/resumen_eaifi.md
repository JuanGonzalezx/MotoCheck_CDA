# Inscripción EAiFi 13.0 — borrador del resumen

- **Plazo:** 1 al 20 de noviembre de 2026, sin excepciones.
- **Dónde:** https://eaifi.org
- **Quién:** **un solo autor** del equipo (el corresponsal) hace la inscripción.
- **Límite de palabras:** lo muestra el formulario en pantalla. Si es menor, recortar la Introducción primero.
- **Estado del proyecto:** está en curso, así que se usa **"Resultados preliminares"** o "esperados". Discusión y Conclusión no son obligatorias.

## 1. Información general

- **Programa / actividad académica:** Automatización y Control de Procesos (Ingeniería de Sistemas y Computación). Elegir la opción 2026-2 que aparezca en la lista.
- **Título del trabajo:** MotoCheck Lab: línea automatizada de preinspección de motocicletas a escala con banda transportadora, ESP32 y monitoreo web en la nube
- **Institución de afiliación:** Universidad de Caldas

## 2. Resumen

**Introducción.** En Colombia, la Revisión Técnico-Mecánica y de Emisiones Contaminantes de las motocicletas solo la realizan los Centros de Diagnóstico Automotor acreditados. La variabilidad en los tiempos de atención y las verificaciones manuales provocan esperas y errores de clasificación. No existe un modelo didáctico a escala que permita estudiar cómo automatizar la secuencia de pruebas preliminares y su registro digital. La pregunta de investigación es: ¿cómo integrar transporte, posicionamiento, sensado y registro en la nube en una línea de preinspección reproducible y de bajo costo?

**Objetivo.** Desarrollar un prototipo a escala de una línea automatizada de preinspección de motocicletas que, mediante una banda transportadora, sensores de luz, temperatura, gases y velocidad, un controlador ESP32 y una aplicación web con almacenamiento en la nube, ejecute y registre pruebas indicativas, con el fin de evaluar su repetibilidad y su tiempo de ciclo.

**Metodología.** Investigación aplicada, de enfoque cuantitativo y desarrollo iterativo por sprints. Una banda con motorreductor detiene una motocicleta 1:12 en cuatro estaciones, cada una detectada con un sensor infrarrojo. En cada estación, un servomotor acerca el instrumento: fotocelda (faro), DS18B20 (temperatura), MQ-2 (gases) y un sensor Hall con un rodillo motorizado (RPM de la rueda). El ESP32 ejecuta una máquina de estados con umbrales y tiempos máximos, y envía los resultados por serial a un puente en Node.js que los guarda en MongoDB Atlas y los muestra en un panel web tipo SCADA. La evaluación incluye la calibración contra instrumentos de referencia, 30 repeticiones por prueba y ciclos con motocicletas de condición conocida.

**Resultados preliminares.** Se validó la secuencia en un gemelo digital 3D y se implementó el firmware v0.1 con protocolo serial en JSON. *(Actualizar antes de enviar con los datos reales: error de parada, CV de cada sensor, tiempo de ciclo, exactitud y errores tipo I y II.)*

**Palabras clave:** automatización; inspección vehicular; banda transportadora; ESP32; sistemas SCADA

## 3. Referencias (APA 7, orden alfabético, entre 5 y 10)

1. González-Prida Díaz, V., Crespo Márquez, A., Marcos Alberca-Carriazo, J. A., & de la Fuente Carmona, A. (2027). Reliability modelling and requirement derivation for automated railway inspection systems under operational fallback. *Reliability Engineering & System Safety, 277*, 112989. https://doi.org/10.1016/j.ress.2026.112989
2. Groover, M. P. (2015). *Automation, production systems, and computer-integrated manufacturing* (4th ed.). Pearson.
3. Ha, T. W., & Hong, S. J. (2020). A study on the inspection standards and methods of two-wheeled motorcycle headlight. *Journal of Auto-Vehicle Safety Association, 12*(3), 7–12. https://doi.org/10.22680/kasa2020.12.3.007
4. Kusalaphirom, T., Satiennam, T., Satiennam, W., & Seedam, A. (2022). Development of a real-world eco-driving cycle for motorcycles. *Sustainability, 14*(10), 6176. https://doi.org/10.3390/su14106176
5. Navarro-Alcendra, D.-C., Regino-Mancera, K., Zota-Rada, J., & Troncoso-Palacio, A. (2024). Análisis para reducir los tiempos de espera en un centro de diagnóstico automotor. *Boletín de Innovación, Logística y Operaciones, 6*(1), 26–34. https://doi.org/10.17981/bilo.6.1.2024.04
6. Singh, S. A., Jiang, X., Hartley, T., VanMastrigt, B., Miller, B., Alsada, W., Luther, J., Bostic, M., & Farahani, S. (2026). Modernization framework for real-time monitoring of legacy belt conveyor systems. *The International Journal of Advanced Manufacturing Technology, 146*, 2231–2245. https://doi.org/10.1007/s00170-026-18919-4
7. Szymlet, N., Rymaniak, Ł., & Lijewski, P. (2024). Two-wheeled urban vehicles—A review of emissions test regulations and literature. *Energies, 17*(3), 586. https://doi.org/10.3390/en17030586

## 4. Datos de los autores (llenarlos en el formulario, no en este repositorio)

Para cada uno de los dos autores: nombres, apellidos, correo electrónico, número de documento, ciudad de expedición del documento e institución de afiliación (Universidad de Caldas).

> Los números de documento **no** se suben al repositorio: es público.
