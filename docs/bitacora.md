# Bitácora de pruebas en la maqueta

Se anota cada sesión de trabajo con el hardware: lo que se probó, lo que pasó y lo que hay que cambiar. Sirve como evidencia para la Fase 2 (datos y registros experimentales) y le da contexto a Claude para los ajustes.

Formato:

```
## AAAA-MM-DD — quién
- Firmware: vX.Y (commit abc123) · sketch usado
- Qué se probó:
- Resultado (números, fotos en docs/fotos/):
- Problemas:
- Ajustes pendientes:
```

---

## 2026-11-13 — Claude
- Firmware v0.2 y sketch de diagnóstico: compilan con el núcleo esp32 3.3.12 (arduino-cli 1.6). **Aún no se han probado en la placa.**
- El puente y el panel web se probaron en modo simulado: inspección aprobada (35,6 s), rechazada por falla en la rueda, certificado, historial, estadísticas y CSV.
- MongoDB: se probó contra un servidor de pruebas, incluido el caso sin internet (guarda pendientes y sincroniza al reconectar).
- **Primera prueba que debe hacer el equipo:** cargar `motocheck_diagnostico`, abrir el monitor serie a 115200 y escribir `s`. Anotar aquí las lecturas de la LDR, el MQ-2, los IR, el Hall y el DS18B20.
