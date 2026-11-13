// MotoCheck Lab — sketch de diagnóstico.
// Sirve para probar cada sensor y actuador por separado mientras se arma la maqueta.
// Monitor serie a 115200 baudios, con "Nueva línea" como fin de línea.
//
// Comandos (una letra + Enter):
//   s  lecturas de todos los sensores cada 300 ms (otra vez 's' para parar)
//   1..4  mueve el servo N entre 0° y 90°
//   a  ángulo libre: "a2 45" pone el servo 2 en 45°
//   b  banda: "b 150" pone PWM 150 en el motor de la banda (b 0 = parar)
//   r  rodillo: "r 170" igual para el motor del rodillo
//   l  prueba de LEDs (recorre verde/rojo de las 4 estaciones)
//   z  buzzer (3 pitidos)
//   x  apaga todo

#include <ESP32Servo.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#include "pines.h"

Servo servos[4];
OneWire oneWire(PIN_DS18B20);
DallasTemperature ds18b20(&oneWire);

volatile unsigned long pulsosHall = 0;
volatile unsigned long ultimoPeriodoUs = 0;
volatile unsigned long ultimoPulsoUs = 0;
bool streaming = false;
bool servoArriba[4] = {false, false, false, false};
unsigned long tUltimaLectura = 0;

void IRAM_ATTR isrHall() {
  unsigned long ahora = micros();
  if (ahora - ultimoPulsoUs < 2000) return;
  ultimoPeriodoUs = ahora - ultimoPulsoUs;
  ultimoPulsoUs = ahora;
  pulsosHall = pulsosHall + 1;
}

void apagarTodo() {
  analogWrite(PIN_MOTOR_BANDA, 0);
  analogWrite(PIN_MOTOR_RODILLO, 0);
  for (int i = 0; i < 4; i++) {
    servos[i].write(0);
    servoArriba[i] = false;
    digitalWrite(PIN_LED_VERDE[i], LOW);
    digitalWrite(PIN_LED_ROJO[i], LOW);
  }
  digitalWrite(PIN_BUZZER, LOW);
  Serial.println("Todo apagado.");
}

void imprimirLecturas() {
  float temp = ds18b20.getTempCByIndex(0);
  ds18b20.requestTemperatures();
  float rpm = 0;
  if (ultimoPeriodoUs > 0 && micros() - ultimoPulsoUs < 2000000UL) {
    rpm = 60e6 / (float)ultimoPeriodoUs;
  }
  Serial.printf("LDR %4lu mV | MQ2 %4lu mV | IR %d%d%d%d | Hall %lu pulsos %.0f RPM | Temp %s\n",
                (unsigned long)analogReadMilliVolts(PIN_LDR),
                (unsigned long)analogReadMilliVolts(PIN_MQ2),
                digitalRead(PIN_IR[0]) == LOW, digitalRead(PIN_IR[1]) == LOW,
                digitalRead(PIN_IR[2]) == LOW, digitalRead(PIN_IR[3]) == LOW,
                pulsosHall, rpm,
                temp > -100 ? String(temp, 2).c_str() : "sin sensor");
}

void pruebaLeds() {
  for (int i = 0; i < 4; i++) {
    Serial.printf("Estación %d: verde\n", i + 1);
    digitalWrite(PIN_LED_VERDE[i], HIGH);
    delay(400);
    digitalWrite(PIN_LED_VERDE[i], LOW);
    Serial.printf("Estación %d: rojo\n", i + 1);
    digitalWrite(PIN_LED_ROJO[i], HIGH);
    delay(400);
    digitalWrite(PIN_LED_ROJO[i], LOW);
  }
}

void pitar() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(150);
    digitalWrite(PIN_BUZZER, LOW);
    delay(150);
  }
}

void atender(String linea) {
  linea.trim();
  if (linea.length() == 0) return;
  char c = linea.charAt(0);
  String resto = linea.substring(1);
  resto.trim();

  if (c == 's') {
    streaming = !streaming;
    Serial.println(streaming ? "Lecturas: ON" : "Lecturas: OFF");
  } else if (c >= '1' && c <= '4') {
    int i = c - '1';
    servoArriba[i] = !servoArriba[i];
    servos[i].write(servoArriba[i] ? 90 : 0);
    Serial.printf("Servo %d -> %d°\n", i + 1, servoArriba[i] ? 90 : 0);
  } else if (c == 'a') {
    // "a2 45"
    int n = resto.charAt(0) - '0';
    int angulo = resto.substring(1).toInt();
    if (n >= 1 && n <= 4 && angulo >= 0 && angulo <= 180) {
      servos[n - 1].write(angulo);
      Serial.printf("Servo %d -> %d°\n", n, angulo);
    } else {
      Serial.println("Uso: a<servo 1-4> <ángulo 0-180>, por ejemplo: a2 45");
    }
  } else if (c == 'b' || c == 'r') {
    int pwm = constrain(resto.toInt(), 0, 255);
    analogWrite(c == 'b' ? PIN_MOTOR_BANDA : PIN_MOTOR_RODILLO, pwm);
    Serial.printf("Motor %s -> PWM %d\n", c == 'b' ? "banda" : "rodillo", pwm);
  } else if (c == 'l') {
    pruebaLeds();
  } else if (c == 'z') {
    pitar();
  } else if (c == 'x') {
    apagarTodo();
  } else {
    Serial.println("Comandos: s, 1-4, a<n> <ángulo>, b <pwm>, r <pwm>, l, z, x");
  }
}

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);
  for (int i = 0; i < 4; i++) {
    pinMode(PIN_IR[i], INPUT);
    pinMode(PIN_LED_VERDE[i], OUTPUT);
    pinMode(PIN_LED_ROJO[i], OUTPUT);
    servos[i].setPeriodHertz(50);
    servos[i].attach(PIN_SERVO[i], 500, 2400);
  }
  pinMode(PIN_HALL, INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_LDR, ADC_11db);
  analogSetPinAttenuation(PIN_MQ2, ADC_11db);
  ds18b20.begin();
  ds18b20.setWaitForConversion(false);
  ds18b20.requestTemperatures();
  attachInterrupt(digitalPinToInterrupt(PIN_HALL), isrHall, FALLING);
  apagarTodo();
  Serial.printf("MotoCheck diagnóstico. DS18B20 encontrados: %d\n", ds18b20.getDeviceCount());
  Serial.println("Comandos: s, 1-4, a<n> <ángulo>, b <pwm>, r <pwm>, l, z, x");
}

void loop() {
  if (Serial.available()) atender(Serial.readStringUntil('\n'));
  if (streaming && millis() - tUltimaLectura >= 300) {
    tUltimaLectura = millis();
    imprimirLecturas();
  }
}
