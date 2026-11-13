#!/usr/bin/env bash
# Compila todos los sketches con las mismas versiones que usa Arduino IDE
# (ver docs/specs/firmware.md). Lo usan el equipo y la CI de GitHub.
#   ./firmware/compilar.sh            compila
#   ./firmware/compilar.sh --instalar  instala núcleo y librerías fijadas y compila
set -euo pipefail

FQBN="esp32:esp32:esp32"
NUCLEO="esp32:esp32@3.3.12"
INDICE="https://espressif.github.io/arduino-esp32/package_esp32_index.json"
LIBRERIAS=("ESP32Servo@3.2.1" "OneWire@2.3.8" "DallasTemperature@4.0.6")

DIR="$(cd "$(dirname "$0")" && pwd)"
SKETCHES=("$DIR/motocheck_esp32" "$DIR/motocheck_diagnostico")

if [[ "${1:-}" == "--instalar" ]]; then
  arduino-cli config init --overwrite >/dev/null
  arduino-cli config add board_manager.additional_urls "$INDICE"
  arduino-cli core update-index
  arduino-cli core install "$NUCLEO"
  arduino-cli lib install "${LIBRERIAS[@]}"
fi

# El mapa de pines debe ser idéntico en todos los sketches
for s in "${SKETCHES[@]:1}"; do
  if ! cmp -s "$DIR/motocheck_esp32/pines.h" "$s/pines.h"; then
    echo "ERROR: $s/pines.h difiere de motocheck_esp32/pines.h. Cópielo de nuevo." >&2
    exit 1
  fi
done

for s in "${SKETCHES[@]}"; do
  echo "== Compilando $(basename "$s")"
  arduino-cli compile --fqbn "$FQBN" --warnings all "$s"
done
echo "OK: todos los sketches compilan."
