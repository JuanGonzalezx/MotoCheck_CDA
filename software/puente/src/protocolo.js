// Contrato del protocolo serial: docs/specs/protocolo_serial.md

export const FASES = [
  "CALENTANDO", "ESPERA", "AVANZANDO", "DESPLEGANDO", "MIDIENDO",
  "RETIRANDO", "SALIENDO", "FIN", "ERROR",
];
export const FASES_LIBRES = ["ESPERA", "FIN", "ERROR"];
export const TIPOS_PRUEBA = ["luz", "temp", "gas", "rpm"];
export const NOMBRES_PRUEBA = { luz: "Faro", temp: "Temperatura", gas: "Gases", rpm: "Rueda" };

export const CLAVES_CFG = {
  pwm_banda: { min: 0, max: 255, defecto: 150, entero: true },
  pwm_rodillo: { min: 0, max: 255, defecto: 170, entero: true },
  servo_reposo: { min: 0, max: 180, defecto: 0, entero: true },
  servo_medida: { min: 0, max: 180, defecto: 90, entero: true },
  luz_min: { min: 0, max: 3300, defecto: 900 },
  temp_min: { min: -10, max: 125, defecto: 30 },
  temp_max: { min: -10, max: 125, defecto: 60 },
  gas_max: { min: 1, max: 10, defecto: 1.5 },
  rpm_min: { min: 0, max: 2000, defecto: 80 },
  rpm_max: { min: 0, max: 2000, defecto: 400 },
  cv_max: { min: 0, max: 100, defecto: 10 },
  timeout: { min: 3000, max: 60000, defecto: 15000, entero: true },
};

export function configPorDefecto() {
  return Object.fromEntries(Object.entries(CLAVES_CFG).map(([k, v]) => [k, v.defecto]));
}

// Devuelve { msg } si la línea es un evento JSON válido, o { texto } si no lo es.
export function parsearLinea(linea) {
  const texto = String(linea).trim();
  if (!texto.startsWith("{")) return { texto };
  try {
    const msg = JSON.parse(texto);
    if (typeof msg?.evt !== "string") return { texto };
    return { msg };
  } catch {
    return { texto };
  }
}

export function normalizarPlaca(placa) {
  const p = String(placa ?? "").trim().toUpperCase().replace(/\s+/g, "");
  return /^[A-Z0-9-]{1,10}$/.test(p) ? p : null;
}

export function validarCfg(clave, valor) {
  const def = CLAVES_CFG[clave];
  if (!def) return { error: `clave desconocida: ${clave}` };
  const n = Number(valor);
  if (!Number.isFinite(n)) return { error: `${clave} debe ser un número` };
  if (n < def.min || n > def.max) return { error: `${clave} debe estar entre ${def.min} y ${def.max}` };
  return { valor: def.entero ? Math.round(n) : n };
}

export const cmd = {
  start: (placa) => `START;${placa}`,
  stop: () => "STOP",
  cfg: (clave, valor) => `CFG;${clave}=${valor}`,
  config: () => "CONFIG",
  ping: () => "PING",
  leer: () => "LEER",
};
