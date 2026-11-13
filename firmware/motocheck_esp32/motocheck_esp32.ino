// MotoCheck Lab — firmware ESP32 v0.2
// Línea de preinspección a escala: 4 estaciones sobre una banda.
//   E1 Faro: LDR (servo 1 acerca la fotocelda)
//   E2 Temperatura: DS18B20 (servo 2 apoya la sonda en el motor simulado)
//   E3 Gases: MQ-2 (servo 3 acerca el sensor al escape)
//   E4 Rueda: Hall (servo 4 acerca el rodillo con motor a la rueda trasera)
// Comunicación: USB serial, una línea JSON por mensaje (ver docs/specs/protocolo_serial.md).
// Librerías: ESP32Servo, OneWire, DallasTemperature.

#include <ESP32Servo.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#include "pines.h"

// ---------- Parámetros (se cambian por serial con CFG;clave=valor) ----------
struct Config {
  int pwmBanda = 150;        // 0-255; el L298N pierde ~2 V
  int pwmRodillo = 170;
  int servoReposo = 0;       // grados, brazo retirado
  int servoMedida = 90;      // grados, brazo desplegado
  float luzMinMv = 900;      // contraste mínimo faro - ambiente (mV)
  float tempMinC = 30;       // ventana de temperatura de operación
  float tempMaxC = 60;
  float gasMaxRel = 1.5;     // lectura / línea base
  float rpmMin = 80;
  float rpmMax = 400;
  float cvMaxPct = 10;       // estabilidad: coef. de variación del periodo
  unsigned long timeoutEstacionMs = 15000;
  unsigned long calentamientoMq2Ms = 60000;
} cfg;

// Tiempos fijos de la secuencia
const unsigned long T_SERVO_MS = 700;      // despliegue o retirada del brazo
const unsigned long T_LUZ_MS = 1500;
const unsigned long T_TEMP_MS = 6000;      // la sonda de acero responde lento
const unsigned long T_GAS_MS = 4000;
const unsigned long T_GIRO_MS = 3000;      // rodillo impulsando la rueda
const unsigned long T_INERCIA_MAX_MS = 4000;
const unsigned long T_SALIDA_MS = 3000;    // banda corriendo tras E4 para sacar la moto
const unsigned long T_MUESTREO_MS = 50;

enum Estado {
  CALENTANDO, ESPERA, AVANZANDO, DESPLEGANDO, MIDIENDO, RETIRANDO,
  SALIENDO, FIN, ERROR_LINEA
};
const char *NOMBRE_ESTADO[] = {
  "CALENTANDO", "ESPERA", "AVANZANDO", "DESPLEGANDO", "MIDIENDO",
  "RETIRANDO", "SALIENDO", "FIN", "ERROR"
};
const char *NOMBRE_PRUEBA[4] = {"luz", "temp", "gas", "rpm"};

Servo servos[4];
OneWire oneWire(PIN_DS18B20);
DallasTemperature ds18b20(&oneWire);

Estado estado = CALENTANDO;
unsigned long tEstado = 0;
int estacion = 0;
String placa = "";
bool resultado[4];
bool aprobada = true;
unsigned long tInicioInspeccion = 0;

// Línea base tomada al iniciar cada inspección
float baseLuzMv = 0;
float baseGasMv = 0;

// Acumuladores de la medida en curso
float suma = 0;
int muestras = 0;
unsigned long tUltimaMuestra = 0;

// Hall: periodos entre pulsos capturados por interrupción
const int MAX_PERIODOS = 64;
volatile unsigned long periodos[MAX_PERIODOS];
volatile int nPeriodos = 0;
volatile unsigned long ultimoPulsoUs = 0;
volatile unsigned long ultimoPulsoMs = 0;
volatile unsigned long pulsos = 0;
bool rodilloEncendido = false;
unsigned long tApagadoRodillo = 0;
float rpmMedidas = 0;
float cvMedido = 0;

void IRAM_ATTR isrHall() {
  unsigned long ahora = micros();
  unsigned long dt = ahora - ultimoPulsoUs;
  if (dt < 2000) return;  // antirrebote: >30 000 RPM no es físico
  if (ultimoPulsoUs != 0 && nPeriodos < MAX_PERIODOS) {
    periodos[nPeriodos] = dt;
    nPeriodos = nPeriodos + 1;
  }
  ultimoPulsoUs = ahora;
  ultimoPulsoMs = millis();
  pulsos = pulsos + 1;
}

void cambiarEstado(Estado nuevo) {
  estado = nuevo;
  tEstado = millis();
  Serial.printf("{\"evt\":\"estado\",\"fase\":\"%s\",\"estacion\":%d}\n",
                NOMBRE_ESTADO[nuevo], estacion + 1);
}

unsigned long enEstado() { return millis() - tEstado; }

bool motoEnEstacion(int i) { return digitalRead(PIN_IR[i]) == LOW; }

void banda(bool on) { analogWrite(PIN_MOTOR_BANDA, on ? cfg.pwmBanda : 0); }

void rodillo(bool on) {
  analogWrite(PIN_MOTOR_RODILLO, on ? cfg.pwmRodillo : 0);
  rodilloEncendido = on;
}

void semaforo(int i, int verde, int rojo) {
  digitalWrite(PIN_LED_VERDE[i], verde);
  digitalWrite(PIN_LED_ROJO[i], rojo);
}

void apagarTodo() {
  banda(false);
  rodillo(false);
  for (int i = 0; i < 4; i++) servos[i].write(cfg.servoReposo);
}

void pitar(int veces) {
  for (int i = 0; i < veces; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(120);
    digitalWrite(PIN_BUZZER, LOW);
    delay(120);
  }
}

float leerMv(int pin) { return analogReadMilliVolts(pin); }

void reiniciarHall() {
  noInterrupts();
  nPeriodos = 0;
  ultimoPulsoUs = 0;
  ultimoPulsoMs = 0;
  pulsos = 0;
  interrupts();
}

// RPM y coeficiente de variación a partir de los periodos capturados.
// Un imán por vuelta: RPM = 60e6 / periodo_us.
void calcularRpm() {
  noInterrupts();
  int n = nPeriodos;
  unsigned long copia[MAX_PERIODOS];
  for (int i = 0; i < n; i++) copia[i] = periodos[i];
  interrupts();
  // Se descartan las 2 primeras vueltas (arranque del rodillo)
  int desde = n > 4 ? 2 : 0;
  int m = n - desde;
  if (m < 2) {
    rpmMedidas = 0;
    cvMedido = 100;
    return;
  }
  double media = 0;
  for (int i = desde; i < n; i++) media += copia[i];
  media /= m;
  double var = 0;
  for (int i = desde; i < n; i++) var += (copia[i] - media) * (copia[i] - media);
  var /= (m - 1);
  rpmMedidas = 60e6 / media;
  cvMedido = 100.0 * sqrt(var) / media;
}

void tomarLineasBase() {
  // Brazo de luz desplegado sin moto: luz ambiente dentro de la cámara oscura
  servos[0].write(cfg.servoMedida);
  delay(T_SERVO_MS);
  float s = 0;
  for (int i = 0; i < 20; i++) { s += leerMv(PIN_LDR); delay(10); }
  baseLuzMv = s / 20;
  servos[0].write(cfg.servoReposo);
  s = 0;
  for (int i = 0; i < 20; i++) { s += leerMv(PIN_MQ2); delay(10); }
  baseGasMv = max(s / 20, 1.0f);
  Serial.printf("{\"evt\":\"base\",\"luz_mv\":%.0f,\"gas_mv\":%.0f}\n", baseLuzMv, baseGasMv);
}

void iniciarInspeccion(const String &p) {
  placa = p;
  aprobada = true;
  estacion = 0;
  for (int i = 0; i < 4; i++) semaforo(i, LOW, LOW);
  tomarLineasBase();
  tInicioInspeccion = millis();
  Serial.printf("{\"evt\":\"inicio\",\"placa\":\"%s\"}\n", placa.c_str());
  banda(true);
  cambiarEstado(AVANZANDO);
}

void iniciarMedida() {
  suma = 0;
  muestras = 0;
  tUltimaMuestra = 0;
  if (estacion == 1) ds18b20.requestTemperatures();
  if (estacion == 3) {
    tApagadoRodillo = 0;
    reiniciarHall();
    rodillo(true);
  }
}

// Devuelve true cuando la medida de la estación terminó.
bool medir() {
  unsigned long t = enEstado();
  switch (estacion) {
    case 0:  // Faro
    case 2:  // Gases
      if (millis() - tUltimaMuestra >= T_MUESTREO_MS) {
        suma += leerMv(estacion == 0 ? PIN_LDR : PIN_MQ2);
        muestras++;
        tUltimaMuestra = millis();
      }
      return t >= (estacion == 0 ? T_LUZ_MS : T_GAS_MS);
    case 1:  // Temperatura: lecturas no bloqueantes cada ~800 ms
      if (ds18b20.isConversionComplete()) {
        float c = ds18b20.getTempCByIndex(0);
        if (c > -100) { suma = c; muestras = 1; }  // queda la última lectura (sonda estabilizada)
        ds18b20.requestTemperatures();
      }
      return t >= T_TEMP_MS;
    case 3:  // Rueda: giro impulsado y luego inercia libre
      if (rodilloEncendido && t >= T_GIRO_MS) {
        calcularRpm();
        rodillo(false);
        tApagadoRodillo = millis();
      }
      if (!rodilloEncendido) {
        unsigned long sinPulso = millis() - max((unsigned long)ultimoPulsoMs, tApagadoRodillo);
        return sinPulso > 1000 || millis() - tApagadoRodillo > T_INERCIA_MAX_MS;
      }
      return false;
  }
  return true;
}

void evaluar() {
  bool ok = false;
  float valor = 0;
  switch (estacion) {
    case 0:
      valor = muestras ? suma / muestras : 0;
      ok = (valor - baseLuzMv) >= cfg.luzMinMv;
      Serial.printf("{\"evt\":\"prueba\",\"tipo\":\"luz\",\"valor\":%.0f,\"base\":%.0f,\"unidad\":\"mV\",\"min\":%.0f,\"ok\":%s,\"n\":%d}\n",
                    valor, baseLuzMv, cfg.luzMinMv, ok ? "true" : "false", muestras);
      break;
    case 1:
      valor = muestras ? suma : NAN;
      ok = muestras && valor >= cfg.tempMinC && valor <= cfg.tempMaxC;
      Serial.printf("{\"evt\":\"prueba\",\"tipo\":\"temp\",\"valor\":%.2f,\"unidad\":\"C\",\"min\":%.1f,\"max\":%.1f,\"ok\":%s}\n",
                    muestras ? valor : -999.0, cfg.tempMinC, cfg.tempMaxC, ok ? "true" : "false");
      break;
    case 2:
      valor = muestras ? (suma / muestras) / baseGasMv : 0;
      ok = valor <= cfg.gasMaxRel;
      Serial.printf("{\"evt\":\"prueba\",\"tipo\":\"gas\",\"valor\":%.2f,\"base_mv\":%.0f,\"unidad\":\"rel\",\"max\":%.2f,\"ok\":%s,\"n\":%d}\n",
                    valor, baseGasMv, cfg.gasMaxRel, ok ? "true" : "false", muestras);
      break;
    case 3: {
      // Tiempo que la rueda siguió girando sola tras apagar el rodillo (indicador de fricción)
      unsigned long inercia = ultimoPulsoMs > tApagadoRodillo ? ultimoPulsoMs - tApagadoRodillo : 0;
      ok = rpmMedidas >= cfg.rpmMin && rpmMedidas <= cfg.rpmMax && cvMedido <= cfg.cvMaxPct;
      Serial.printf("{\"evt\":\"prueba\",\"tipo\":\"rpm\",\"valor\":%.1f,\"cv\":%.1f,\"inercia_ms\":%lu,\"pulsos\":%lu,\"unidad\":\"rpm\",\"min\":%.0f,\"max\":%.0f,\"ok\":%s}\n",
                    rpmMedidas, cvMedido, inercia, pulsos, cfg.rpmMin, cfg.rpmMax, ok ? "true" : "false");
      break;
    }
  }
  resultado[estacion] = ok;
  aprobada = aprobada && ok;
  semaforo(estacion, ok ? HIGH : LOW, ok ? LOW : HIGH);
}

void fallar(const char *motivo) {
  apagarTodo();
  Serial.printf("{\"evt\":\"error\",\"estacion\":%d,\"motivo\":\"%s\"}\n", estacion + 1, motivo);
  for (int i = 0; i < 4; i++) semaforo(i, LOW, HIGH);
  pitar(5);
  cambiarEstado(ERROR_LINEA);
}

void aplicarConfig(const String &par) {
  int igual = par.indexOf('=');
  if (igual < 0) return;
  String k = par.substring(0, igual);
  float v = par.substring(igual + 1).toFloat();
  if (k == "pwm_banda") cfg.pwmBanda = v;
  else if (k == "pwm_rodillo") cfg.pwmRodillo = v;
  else if (k == "servo_reposo") cfg.servoReposo = v;
  else if (k == "servo_medida") cfg.servoMedida = v;
  else if (k == "luz_min") cfg.luzMinMv = v;
  else if (k == "temp_min") cfg.tempMinC = v;
  else if (k == "temp_max") cfg.tempMaxC = v;
  else if (k == "gas_max") cfg.gasMaxRel = v;
  else if (k == "rpm_min") cfg.rpmMin = v;
  else if (k == "rpm_max") cfg.rpmMax = v;
  else if (k == "cv_max") cfg.cvMaxPct = v;
  else if (k == "timeout") cfg.timeoutEstacionMs = v;
  else {
    Serial.printf("{\"evt\":\"cfg\",\"ok\":false,\"clave\":\"%s\"}\n", k.c_str());
    return;
  }
  Serial.printf("{\"evt\":\"cfg\",\"ok\":true,\"clave\":\"%s\",\"valor\":%.2f}\n", k.c_str(), v);
}

void enviarConfig() {
  Serial.printf("{\"evt\":\"config\",\"pwm_banda\":%d,\"pwm_rodillo\":%d,\"servo_reposo\":%d,\"servo_medida\":%d,"
                "\"luz_min\":%.0f,\"temp_min\":%.1f,\"temp_max\":%.1f,\"gas_max\":%.2f,"
                "\"rpm_min\":%.0f,\"rpm_max\":%.0f,\"cv_max\":%.1f,\"timeout\":%lu}\n",
                cfg.pwmBanda, cfg.pwmRodillo, cfg.servoReposo, cfg.servoMedida,
                cfg.luzMinMv, cfg.tempMinC, cfg.tempMaxC, cfg.gasMaxRel,
                cfg.rpmMin, cfg.rpmMax, cfg.cvMaxPct, cfg.timeoutEstacionMs);
}

void enviarLecturas() {
  Serial.printf("{\"evt\":\"lecturas\",\"luz_mv\":%.0f,\"gas_mv\":%.0f,\"ir\":[%d,%d,%d,%d],\"pulsos\":%lu}\n",
                leerMv(PIN_LDR), leerMv(PIN_MQ2),
                motoEnEstacion(0), motoEnEstacion(1), motoEnEstacion(2), motoEnEstacion(3), pulsos);
}

// Comandos: START;PLACA · STOP · CFG;clave=valor · CONFIG · PING · LEER
void atenderSerial() {
  if (!Serial.available()) return;
  String linea = Serial.readStringUntil('\n');
  linea.trim();
  if (linea.startsWith("START;")) {
    if (estado == ESPERA || estado == FIN || estado == ERROR_LINEA) {
      iniciarInspeccion(linea.substring(6));
    } else {
      Serial.printf("{\"evt\":\"rechazado\",\"motivo\":\"linea ocupada (%s)\"}\n", NOMBRE_ESTADO[estado]);
    }
  } else if (linea == "STOP") {
    apagarTodo();
    Serial.println("{\"evt\":\"detenido\"}");
    cambiarEstado(ESPERA);
  } else if (linea.startsWith("CFG;")) {
    aplicarConfig(linea.substring(4));
  } else if (linea == "PING") {
    Serial.printf("{\"evt\":\"pong\",\"estado\":\"%s\"}\n", NOMBRE_ESTADO[estado]);
  } else if (linea == "LEER") {
    enviarLecturas();
  } else if (linea == "CONFIG") {
    enviarConfig();
  } else if (linea.length() > 0) {
    Serial.printf("{\"evt\":\"rechazado\",\"motivo\":\"comando desconocido\"}\n");
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
  pinMode(PIN_HALL, INPUT);  // pull-up externo; 34-39 no tienen pull-up interno, el 27 sí, pero se deja externo
  pinMode(PIN_BUZZER, OUTPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_LDR, ADC_11db);
  analogSetPinAttenuation(PIN_MQ2, ADC_11db);
  ds18b20.begin();
  ds18b20.setWaitForConversion(false);
  attachInterrupt(digitalPinToInterrupt(PIN_HALL), isrHall, FALLING);
  apagarTodo();
  Serial.println("{\"evt\":\"hola\",\"equipo\":\"MotoCheck Lab\",\"version\":\"0.2\"}");
  enviarConfig();
  cambiarEstado(CALENTANDO);
}

void loop() {
  atenderSerial();

  switch (estado) {
    case CALENTANDO:  // el MQ-2 necesita calentar su resistencia interna
      if (enEstado() >= cfg.calentamientoMq2Ms) cambiarEstado(ESPERA);
      break;

    case ESPERA:
    case FIN:
    case ERROR_LINEA:
      break;

    case AVANZANDO:
      if (motoEnEstacion(estacion)) {
        banda(false);
        servos[estacion].write(cfg.servoMedida);
        cambiarEstado(DESPLEGANDO);
      } else if (enEstado() > cfg.timeoutEstacionMs) {
        fallar("la moto no llego a la estacion");
      }
      break;

    case DESPLEGANDO:
      if (enEstado() >= T_SERVO_MS) {
        iniciarMedida();
        cambiarEstado(MIDIENDO);
      }
      break;

    case MIDIENDO:
      if (medir()) {
        evaluar();
        servos[estacion].write(cfg.servoReposo);
        cambiarEstado(RETIRANDO);
      }
      break;

    case RETIRANDO:
      if (enEstado() >= T_SERVO_MS) {
        banda(true);
        if (estacion < 3) {
          estacion++;
          cambiarEstado(AVANZANDO);
        } else {
          cambiarEstado(SALIENDO);
        }
      }
      break;

    case SALIENDO:
      if (enEstado() >= T_SALIDA_MS) {
        banda(false);
        unsigned long duracion = millis() - tInicioInspeccion;
        Serial.printf("{\"evt\":\"fin\",\"placa\":\"%s\",\"aprobada\":%s,\"pruebas\":[%s,%s,%s,%s],\"duracion_ms\":%lu}\n",
                      placa.c_str(), aprobada ? "true" : "false",
                      resultado[0] ? "true" : "false", resultado[1] ? "true" : "false",
                      resultado[2] ? "true" : "false", resultado[3] ? "true" : "false", duracion);
        pitar(aprobada ? 1 : 3);
        cambiarEstado(FIN);
      }
      break;
  }
}
