# Resumen de trabajo — EAiFi 13.0

> Texto listo para copiar en https://eaifi.org (*Inscribir Ponencia*). La inscripción la hace **un solo autor**, con su correo institucional. Los números de documento se escriben **directamente en el formulario**: no se guardan en este repositorio porque es público.

## 1. Información general

**Programa/Actividad académica:** (Ing. Sistemas y Computación) G8F0223 Automatización y Control de Procesos. *Elegir en la lista la opción que tenga el código de grupo de 2026-2.*

**Título:** MotoCheck Lab: línea automatizada de preinspección de motocicletas a escala con banda transportadora, ESP32 y supervisión web en la nube.

**Institución de afiliación:** Universidad de Caldas.

## 2. Contenido del resumen

**Introducción.** La inspección automatizada permite revisar el 100 % de las unidades con criterios uniformes y registro trazable. En Colombia, la revisión técnico-mecánica de motocicletas reúne mediciones heterogéneas (faro, temperatura, emisiones y rodadura) que dependen de pasos manuales, lo que alarga los tiempos de atención y genera errores de clasificación. Integrar pruebas de bajo costo en una sola línea sigue siendo un desafío: si el vehículo no se detiene en el punto exacto o el instrumento obstruye su paso, la medida pierde validez. Mediante un desarrollo incremental en tres fases, este trabajo busca responder: ¿es viable automatizar la preinspección de motocicletas a escala con instrumentación de bajo costo, de forma repetible y trazable?

**Objetivo.** Desarrollar y validar una línea automatizada a escala para la preinspección de motocicletas con registro de resultados en la nube.

**Metodología.** En la primera fase, el reto fue coordinar transporte, posicionamiento y medición sin conflictos. Para ello se diseñó una máquina de estados finitos con tiempos máximos y parada segura, validada en un gemelo digital 3D y un simulador. Luego surgió el reto de medir sobre una motocicleta de juguete, sin motor ni tracción, sin obstruir su paso: se construyó una banda con motorreductor y cuatro estaciones detectadas por infrarrojo, donde un servomotor acerca y retira cada instrumento: una fotocelda en cámara oscura (faro), una sonda DS18B20 (temperatura), un MQ-2 con línea base (gases) y un rodillo motorizado con sensor Hall (RPM), evaluadas por un ESP32 con umbrales configurables. Finalmente, para garantizar la trazabilidad aun sin internet, un puente en Node.js guarda cada inspección en MongoDB Atlas, con respaldo local, y la publica en un panel web tipo SCADA. Se evalúan calibración, repetibilidad, tiempo de ciclo y errores tipo I y II con motocicletas de falla conocida.

**Resultados.** *(Resultados preliminares)* Se integró la arquitectura completa del sistema. El firmware del ESP32 compila sin errores. En simulación, la línea completa un ciclo de cuatro estaciones en aproximadamente 35 s, rechaza las fallas inducidas (faro débil, rueda frenada) y pasa a parada segura ante un atasco. El panel web permite iniciar inspecciones, seguirlas en tiempo real y exportar el historial, y las pruebas automáticas verificaron la sincronización de los registros guardados sin conexión. La maqueta física está en construcción y sus mediciones se presentarán en la socialización.

**Discusión.** El diseño evidenció que la dificultad principal no es la capacidad de cada sensor, sino la coordinación entre transporte, posicionamiento y medición; los brazos retráctiles resuelven ese conflicto a costa de tiempo de ciclo. Además, los sensores de bajo costo deben interpretarse como indicativos: el MQ-2 responde a varios gases y la sonda DS18B20 es lenta. El simulador agilizó la depuración, pero no reemplaza las pruebas físicas.

**Conclusión.** El sistema integra transporte, posicionamiento, cuatro pruebas indicativas, control en un ESP32 y supervisión en la nube. Los resultados preliminares indican que automatizar la preinspección a escala es viable si las paradas son repetibles y las lecturas se tratan como indicativas. Como trabajo futuro quedan medir en la maqueta la exactitud y los errores tipo I y II.

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
