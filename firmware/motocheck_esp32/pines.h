// pines.h — mapa de pines de MotoCheck Lab (ESP32 DevKit 30 pines).
// Fuente única: firmware/motocheck_esp32/pines.h. El sketch de diagnóstico
// tiene una copia idéntica; compilar.sh falla si las dos difieren.
// Detalle eléctrico: hardware/conexiones_esp32.md
#pragma once

// Entradas
const int PIN_LDR = 36;      // VP, ADC1. Divisor: LDR a 3V3, 10k a GND
const int PIN_MQ2 = 39;      // VN, ADC1. AO del MQ-2 por divisor 10k/20k
const int PIN_IR[4] = {34, 35, 32, 33};  // FC-51: LOW = moto detectada
const int PIN_HALL = 27;     // A3144, pull-up 10k a 3V3
const int PIN_DS18B20 = 4;   // OneWire, pull-up 4k7 a 3V3

// Salidas
const int PIN_SERVO[4] = {18, 19, 21, 22};
const int PIN_MOTOR_BANDA = 25;    // L298N ENA (IN1=5V, IN2=GND)
const int PIN_MOTOR_RODILLO = 26;  // L298N ENB (IN3=5V, IN4=GND)
const int PIN_LED_VERDE[4] = {13, 16, 23, 5};
const int PIN_LED_ROJO[4] = {14, 17, 2, 12};
const int PIN_BUZZER = 15;
