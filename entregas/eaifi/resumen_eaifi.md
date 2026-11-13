# Inscripción EAiFi 13.0 — texto listo para copiar y pegar

## Antes de empezar

- **Plazo:** la profe dijo **hasta el 20 de noviembre, sin excepciones**. El sitio muestra inscripción hasta el 24 y aceptación el 24. Hay que hacerlo **antes del 20**.
- **El evento** es del **30 de noviembre al 4 de diciembre de 2026**, presencial, en la Facultad de Inteligencia Artificial e Ingenierías.
- **Quién:** **un solo autor** (el corresponsal) crea la cuenta en https://eaifi.org → *Inscribir Ponencia*, con su **correo institucional**, e inscribe el trabajo con los datos de los dos.
- **Datos de cada autor** que pide el formulario: nombres, apellidos, correo, número de documento, ciudad de expedición e institución. **No se guardan en este repositorio**, porque es público.
- **Estado del proyecto:** está en curso, así que en Resultados va **"Resultados preliminares"**. Discusión y Conclusión no son obligatorias, pero abajo hay un texto corto por si el formulario las deja llenar.
- **Límite de palabras:** el formulario lo muestra en pantalla. La **versión A** tiene 326 palabras (introducción 97, objetivo 51, metodología 109, resultados 69) y la **versión B (corta)** tiene 179. Las palabras clave y las referencias no se cuentan aquí.

---

## 1. Información general

**Programa / actividad académica** (elegir en la lista la opción de 2026-2):
```
Automatización y Control de Procesos — Ingeniería de Sistemas y Computación
```

**Título del trabajo:**
```
MotoCheck Lab: línea automatizada de preinspección de motocicletas a escala con banda transportadora, ESP32 y supervisión web en la nube
```

**Institución de afiliación:**
```
Universidad de Caldas
```

---

## 2. Resumen — versión A (326 palabras)

**Introducción:**
```
En Colombia, la revisión técnico-mecánica de motocicletas solo la realizan Centros de Diagnóstico Automotor acreditados y reúne mediciones heterogéneas (faro, temperatura, gases y rodadura) que dependen en buena parte de pasos manuales. Esto alarga los tiempos de atención y expone el proceso a errores de clasificación. La inspección automatizada permite revisar el 100 % de las unidades con criterios uniformes y registro trazable, pero no se encontró un modelo a escala que integre transporte, varias pruebas secuenciales y almacenamiento en la nube para estudiarla de forma cuantitativa. ¿Es viable automatizar la preinspección con instrumentación de bajo costo?
```

**Objetivo:**
```
Desarrollar un prototipo a escala de una línea automatizada de preinspección de motocicletas que, mediante una banda transportadora, sensores de luz, temperatura, gases y velocidad, un controlador ESP32 y una aplicación web con almacenamiento en la nube, ejecute y registre pruebas indicativas, para evaluar su repetibilidad y su tiempo de ciclo.
```

**Metodología:**
```
Investigación aplicada, de enfoque cuantitativo, con desarrollo iterativo por sprints. Una banda con motorreductor detiene una motocicleta a escala 1:12 en cuatro estaciones detectadas por sensores infrarrojos. En cada una, un servomotor acerca el instrumento: fotocelda (faro), DS18B20 (temperatura), MQ-2 (gases) y sensor Hall con rodillo motorizado (RPM de la rueda). Un ESP32 ejecuta una máquina de estados con umbrales y tiempos máximos; un puente en Node.js registra cada inspección en MongoDB Atlas y la muestra en un panel web tipo SCADA. La evaluación incluye calibración frente a instrumentos de referencia, repeticiones por prueba, clasificación de motocicletas con condición conocida (errores tipo I y II) y tiempo de ciclo.
```

**Resultados preliminares:**
```
Se validó la secuencia de las cuatro estaciones en un gemelo digital 3D y en un simulador del controlador. El firmware del ESP32 compila con versiones fijadas y verificación automática en cada cambio; el panel web y el registro en la nube funcionan, incluido el modo sin conexión con sincronización posterior. La maqueta física está en construcción y las mediciones del protocolo experimental se ejecutarán antes de la socialización.
```

**Palabras clave** (separadas por punto y coma):
```
automatización; inspección vehicular; banda transportadora; ESP32; sistemas SCADA
```

---

## 2b. Resumen — versión B, corta (179 palabras)

Usarla si el límite de la pantalla es menor. Título, palabras clave y referencias quedan iguales.

**Introducción:**
```
La revisión técnico-mecánica de motocicletas en Colombia reúne mediciones heterogéneas que dependen de pasos manuales, lo que alarga los tiempos de atención y genera errores de clasificación. No se encontró un modelo a escala que integre transporte, pruebas secuenciales y registro en la nube para estudiar su automatización.
```

**Objetivo:**
```
Desarrollar un prototipo a escala de línea automatizada de preinspección de motocicletas con banda transportadora, sensores, ESP32 y supervisión web en la nube, y evaluar su repetibilidad y tiempo de ciclo.
```

**Metodología:**
```
Investigación aplicada cuantitativa. Una banda detiene una motocicleta 1:12 en cuatro estaciones: faro (fotocelda), temperatura (DS18B20), gases (MQ-2) y rueda (sensor Hall con rodillo). Un ESP32 ejecuta una máquina de estados con umbrales; un puente en Node.js guarda cada inspección en MongoDB Atlas y la muestra en un panel web. Se evalúan calibración, repetibilidad, errores tipo I y II y tiempo de ciclo.
```

**Resultados preliminares:**
```
La secuencia se validó en un gemelo digital y un simulador; el firmware, el panel web y el registro en la nube funcionan. La maqueta está en construcción y las mediciones se realizarán antes de la socialización.
```

---

## Si ya hay datos reales antes de inscribirse

Reemplazar **Resultados preliminares** por este texto, con los números de `analisis/resultados/resultados.md`:

```
En [N] inspecciones con motocicletas de condición conocida, la línea alcanzó una exactitud de [__] %, con error tipo I de [__] % y error tipo II de [__] %. El tiempo de ciclo fue de [__] ± [__] s ([__] motocicletas por hora) y el [__] % de los ciclos terminó sin error. La fotocelda presentó un R² de [__] frente al luxómetro y el sensor Hall un error medio de [__] % frente al tacómetro.
```

## Opcionales (si el formulario los deja llenar)

**Discusión:**
```
La uniformidad del criterio automatizado y la trazabilidad en la nube son las principales contribuciones; las lecturas de sensores de bajo costo se interpretan como indicativas y no sustituyen la revisión oficial.
```

**Conclusión:**
```
Una línea a escala con instrumentación de bajo costo permite estudiar de forma cuantitativa la automatización de la preinspección de motocicletas y sienta las bases para modelar su efecto en los tiempos de atención de un CDA.
```

---

## 3. Referencias (APA 7, orden alfabético; el formulario pide entre 5 y 10)

Pegar una por una o todas juntas, según lo permita el formulario:

```
González-Prida Díaz, V., Crespo Márquez, A., Marcos Alberca-Carriazo, J. A., & de la Fuente Carmona, A. (2027). Reliability modelling and requirement derivation for automated railway inspection systems under operational fallback. Reliability Engineering & System Safety, 277, 112989. https://doi.org/10.1016/j.ress.2026.112989

Groover, M. P. (2015). Automation, production systems, and computer-integrated manufacturing (4th ed.). Pearson.

Ha, T. W., & Hong, S. J. (2020). A study on the inspection standards and methods of two-wheeled motorcycle headlight. Journal of Auto-Vehicle Safety Association, 12(3), 7–12. https://doi.org/10.22680/kasa2020.12.3.007

Kusalaphirom, T., Satiennam, T., Satiennam, W., & Seedam, A. (2022). Development of a real-world eco-driving cycle for motorcycles. Sustainability, 14(10), 6176. https://doi.org/10.3390/su14106176

Melas, A., Franzetti, J., Buekenhoudt, P., Gavros, A., Checa, A., Suarez-Bertoa, R., & Giechaskiel, B. (2027). Identifying gross particle emitters: Insights from periodic technical inspections of diesel vehicles. Transportation Research Part D: Transport and Environment, 162, 105694. https://doi.org/10.1016/j.trd.2026.105694

Navarro-Alcendra, D.-C., Regino-Mancera, K., Zota-Rada, J., & Troncoso-Palacio, A. (2024). Análisis para reducir los tiempos de espera en un centro de diagnóstico automotor. Boletín de Innovación, Logística y Operaciones, 6(1), 26–34. https://doi.org/10.17981/bilo.6.1.2024.04

Singh, S. A., Jiang, X., Hartley, T., VanMastrigt, B., Miller, B., Alsada, W., Luther, J., Bostic, M., & Farahani, S. (2026). Modernization framework for real-time monitoring of legacy belt conveyor systems. The International Journal of Advanced Manufacturing Technology, 146, 2231–2245. https://doi.org/10.1007/s00170-026-18919-4

Szymlet, N., Rymaniak, Ł., & Lijewski, P. (2024). Two-wheeled urban vehicles—A review of emissions test regulations and literature. Energies, 17(3), 586. https://doi.org/10.3390/en17030586
```

---

## 4. Autores (llenar en el formulario, no aquí)

| Campo | Autor 1 | Autor 2 |
|---|---|---|
| Nombres | Juan Diego | Juan David |
| Apellidos | Rendón Tabares | Ocampo González |
| Correo | (institucional) | (institucional) |
| Documento / ciudad de expedición | (en el formulario) | (en el formulario) |
| Institución | Universidad de Caldas | Universidad de Caldas |

**Consentimiento:** marcar las dos casillas (tratamiento de datos según la Ley 1581 de 2012 y confirmación de que los datos de todos los autores están bien diligenciados).

**Después de enviar:** tomar captura de la confirmación y guardarla en `entregas/eaifi/`.
