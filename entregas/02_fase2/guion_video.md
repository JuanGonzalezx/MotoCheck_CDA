# Guion del video demo (máximo 3 minutos)

La guía de presentaciones de la profe pide videos de **3 minutos como máximo**. Se graba con el celular en horizontal y la pantalla del PC con OBS o con QuickTime (Archivo → Nueva grabación de pantalla). Se edita en CapCut o en DaVinci Resolve.

| Tiempo | Imagen | Narración (aproximada) |
|---|---|---|
| 0:00–0:15 | Toma general de la maqueta. Título "MotoCheck Lab — Universidad de Caldas" | "En Colombia, cada moto debe pasar la revisión técnico-mecánica. Construimos una línea a escala que automatiza la preinspección." |
| 0:15–0:35 | Recorrido lento de la cámara por las 4 estaciones, con letreros: Faro · Temperatura · Gases · Rueda | "Una banda lleva la moto por cuatro estaciones. En cada una, un sensor infrarrojo la detiene y un servo acerca el instrumento." |
| 0:35–0:50 | Pantalla del panel: se escribe la placa **BUE01** y se pulsa *Iniciar* | "El operador registra la placa en el panel web y arranca la línea." |
| 0:50–1:40 | Pantalla dividida: maqueta + panel. Se ve cada estación: faro en la cámara oscura, sonda de temperatura, MQ-2 y rodillo girando la rueda | "Faro: la fotocelda mide el contraste. Temperatura: el DS18B20 toca el motor. Gases: el MQ-2 compara con su línea base. Rueda: el rodillo la hace girar y el sensor Hall calcula las RPM." |
| 1:40–1:55 | La moto saliendo, el LED verde, el pitido y el banner **APROBADA** en el panel | "La moto sale aprobada y el resultado queda guardado en MongoDB Atlas." |
| 1:55–2:25 | Segunda moto, **RUE01** (rueda con roce): LED rojo en la estación 4 y banner RECHAZADA; se abre el reporte | "Con la rueda frenada, la velocidad baja y la línea la rechaza. El reporte muestra cada medida y su criterio." |
| 2:25–2:45 | Panel: Estadísticas e Historial; el CSV abierto en Excel | "Con 50 inspecciones medimos una exactitud de ___ % y un tiempo de ciclo de ___ s." (datos reales de `analisis/resultados/resultados.md`) |
| 2:45–3:00 | Ambos autores frente a la maqueta | "MotoCheck Lab: automatización, instrumentación y datos en la nube. Gracias." |

**Consejos**

- Buena luz en la maqueta, pero **la cámara oscura del faro debe quedar a la sombra**: si no, falla la prueba del faro.
- Grabar varias tomas de cada estación y elegir la mejor.
- Activar el audio del buzzer: el pitido de aprobado o rechazado da ritmo al video.
- No mostrar el simulador. En la esquina del panel debe verse **"ESP32 · COM…"**, no "ESP32 simulado".
