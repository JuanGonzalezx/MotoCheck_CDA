# Fase 1 — cierre viernes 13 de noviembre de 2026, 23:59

**Archivo para subir al aula virtual:** `Fase1_MotoCheck_Rendon_Ocampo.docx`

Al abrirlo en Word, aceptar "actualizar campos" para que se llene la tabla de contenido. Luego guardar o exportar a PDF, si la profe lo pide en PDF.

| Lo que pide la profe | Dónde está en el documento |
|---|---|
| Taller 1: párrafo de problema + justificación + 3 títulos | Taller 1: problema (194 palabras), justificación (188), Tabla 1 |
| Taller 2: objetivo general + 3 específicos + plan metodológico + recursos HW/SW | Taller 2: título final, objetivos, metodología (249 palabras), Tabla 2 |
| Taller 3: diagrama, lista de materiales, protocolo de pruebas, primer prototipo o simulación | Taller 3: Figuras 1–3, Tablas 3–6, protocolo P1–P9, Figura 4 (simulación) + firmware v0.1 |

Para regenerar el documento después de editar el texto en `generar_docx.cjs`:

```bash
npm install docx@9          # una sola vez, en cualquier carpeta
NODE_PATH=<esa carpeta>/node_modules node generar_docx.cjs
```

Las figuras fuente (SVG editables) están en `figuras/`.
