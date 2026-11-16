/**
 * Configuracion del estudio: canal.json, .env y calibracion.json.
 *
 * calibracion.json guarda lo que hemos MEDIDO contra la API (creditos por
 * caracter, caracteres por minuto reales de esta voz). Arranca vacio y se
 * rellena solo. Mientras este vacio, las estimaciones salen de
 * `constantes` de canal.json, que ya vienen medidas contra la API.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));

export function cargarCanal() {
  return JSON.parse(readFileSync(join(RAIZ, 'canal.json'), 'utf8'));
}

/** Lee .env sin dependencias externas. Formato CLAVE=valor, # para comentarios. */
export function cargarEnv() {
  const ruta = join(RAIZ, '.env');
  const env = { ...process.env };
  if (!existsSync(ruta)) return env;
  for (const linea of readFileSync(ruta, 'utf8').split('\n')) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const i = limpia.indexOf('=');
    if (i < 0) continue;
    const clave = limpia.slice(0, i).trim();
    let valor = limpia.slice(i + 1).trim();
    if (/^(".*"|'.*')$/s.test(valor)) valor = valor.slice(1, -1);
    if (valor) env[clave] = valor;
  }
  return env;
}

const CALIBRACION_VACIA = {
  creditos_por_caracter: null,
  caracteres_por_minuto: null,
  medidas: [],
};

export function cargarCalibracion() {
  const ruta = join(RAIZ, 'calibracion.json');
  if (!existsSync(ruta)) return { ...CALIBRACION_VACIA };
  try {
    return { ...CALIBRACION_VACIA, ...JSON.parse(readFileSync(ruta, 'utf8')) };
  } catch {
    return { ...CALIBRACION_VACIA };
  }
}

export function guardarCalibracion(cal) {
  writeFileSync(join(RAIZ, 'calibracion.json'), JSON.stringify(cal, null, 2) + '\n');
}

/**
 * Registra una medida real y recalcula los promedios.
 *
 * `creditos_por_caracter` se queda con el ultimo valor medido: es una tarifa,
 * no un promedio, y si ElevenLabs la cambia queremos el dato nuevo, no una
 * media contaminada por el anterior.
 *
 * `caracteres_por_minuto` si es un promedio ponderado por caracteres: depende
 * del ritmo del guion y conviene que se estabilice con varias muestras.
 */
export function registrarMedida(cal, medida) {
  cal.medidas.push({ fecha: new Date().toISOString(), ...medida });
  Object.assign(cal, resumirMedidas(cal, medida.modelo));
  return cal;
}

function resumirMedidas(cal, modelo) {
  const medidas = cal.medidas.filter((m) => m.modelo === modelo);
  const ultimaTarifa = medidas.findLast(
    (m) => Number.isFinite(m.creditos_por_caracter) && m.creditos_por_caracter > 0
  );
  const conRitmo = medidas.filter(
    (m) => Number.isFinite(m.caracteres) && Number.isFinite(m.segundos) && m.segundos > 0
  );
  const caracteres = conRitmo.reduce((s, m) => s + m.caracteres, 0);
  const segundos = conRitmo.reduce((s, m) => s + m.segundos, 0);
  return {
    creditos_por_caracter: ultimaTarifa?.creditos_por_caracter ?? null,
    caracteres_por_minuto: segundos > 0 ? Math.round((caracteres / segundos) * 60) : null,
  };
}

/** Prioriza mediciones del modelo activo sobre las constantes del canal. */
export function constantes(canal, cal) {
  const base = canal.constantes;
  const medida = base.modelo ? resumirMedidas(cal, canal.voz.modelo) : cal;
  return {
    creditosPorCaracter: medida.creditos_por_caracter ?? base.creditos_por_caracter,
    caracteresPorMinuto: medida.caracteres_por_minuto ?? base.caracteres_por_minuto,
    calibradoCreditos: medida.creditos_por_caracter != null || base.medido === true,
    calibradoRitmo: medida.caracteres_por_minuto != null || base.medido === true,
  };
}
