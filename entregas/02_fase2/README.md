# Fase 2 — cierre viernes 20 de noviembre de 2026, 23:59

Pide: **(4)** datos y registros experimentales · **(5)** secciones de Métodos y Resultados · **(6)** artículo en borrador + video demo.

| Entregable | Archivo | Estado |
|---|---|---|
| Artículo en borrador | `Articulo_MotoCheck_Rendon_Ocampo.docx` | Introducción, Metodología, Discusión, Conclusiones y 36 referencias escritas. **Resultados en amarillo hasta tener los datos** |
| Datos y registros | `analisis/datos/` + `analisis/resultados/resultados.md` | Plantillas listas; faltan las mediciones |
| Bitácora | `docs/bitacora.md` | Anotar cada sesión |
| Video demo | ver `guion_video.md` | Por grabar |

## Plan con la maqueta (14 al 19 de noviembre)

1. **Armar y probar las piezas** con `firmware/motocheck_diagnostico` (comando `s`), y anotar en la bitácora.
2. **Calibrar** con el panel, en *Configuración → Leer sensores*: luz ambiente en la cámara oscura y línea base del MQ-2. Ajustar `luz_min`, `gas_max`, `rpm_min` y `rpm_max`.
3. **Mediciones manuales.** Copiar cada plantilla de `analisis/plantillas/` a `analisis/datos/` y llenarla (Excel o Google Sheets → Guardar como CSV):

| Archivo | Cómo medir | Filas mínimas |
|---|---|---|
| `p1_parada.csv` | Marcar con cinta el centro de cada estación; tras cada parada, medir con regla la distancia entre la rueda delantera y la marca (+ si se pasó, − si quedó antes) | 20 por estación |
| `p2_calibracion_ldr.csv` | App de luxómetro del celular (por ejemplo *Lux Light Meter*) junto a la LDR; 5 niveles de luz con una linterna a distintas distancias; anotar lux y `luz_mv` del comando `LEER` | 10 por nivel |
| `p4_temperatura.csv` | Bloque de aluminio a ~22, 40 y 55 °C (agua tibia o secador); termómetro de cocina digital como referencia | 10 por punto |
| `p4_respuesta.csv` | Pasar la sonda de aire ambiente al bloque caliente y anotar la temperatura cada segundo durante 60 s (monitor serie del sketch de diagnóstico) | 60 |
| `p5_gases.csv` | 30 lecturas en aire limpio (`condicion = aire`) y 30 con algodón con alcohol isopropílico a 5 cm (`condicion = alcohol`). **Sin llama y en un lugar ventilado** | 60 |
| `p6_rpm.csv` | Tacómetro óptico, o video en cámara lenta contando vueltas, con PWM de rodillo 130, 170 y 210 | 10 por PWM |
| `p9_fallas.csv` | Durante una inspección: desconectar un IR, tapar un IR o frenar la banda con la mano; anotar si la línea paró segura (`si` / `no`) | 5 |

4. **Clasificación y tiempo de ciclo (P3, P7, P8)**, desde el panel con el ESP32 real. La condición de cada moto va en el prefijo de la placa:

| Placa | Preparación | Cantidad |
|---|---|---|
| `BUE01`…`BUE10` | Moto en buen estado | 10 |
| `FAR01`…`FAR10` | Faro débil (LED con resistencia de 10 kΩ) | 10 |
| `TMP01`…`TMP10` | Bloque del motor caliente (más de 60 °C) | 10 |
| `GAS01`…`GAS10` | Algodón con alcohol en el escape | 10 |
| `RUE01`…`RUE10` | Rueda trasera con roce (cinta o goma) | 10 |

5. **Analizar y regenerar el artículo:**

```bash
cp software/puente/datos/inspecciones.jsonl analisis/datos/   # evidencia versionada
node analisis/analizar.mjs                                     # resultados.md con ✅ / ❌
cd entregas/02_fase2
npm install docx@9 --prefix /tmp/docx && NODE_PATH=/tmp/docx/node_modules node generar_articulo.cjs
```

Los números reales se insertan solos en el artículo; lo que siga en amarillo es lo que todavía falta medir. Si una prueba **no cumple**, no se esconde: se discute en el artículo, porque también es un resultado.

6. Antes de entregar: poner los correos institucionales, la foto de la maqueta (`figuras/fig6_maqueta.png`) y la captura del panel con el ESP32 real (`figuras/fig5_panel_vivo.png`); revisar que no quede nada en amarillo.

> ⚠️ El análisis usa **solo** inspecciones con `origen = esp32`. Los datos del simulador nunca deben usarse en el artículo; `--incluir-simulador` existe solo para probar el código.
