// Generacion final del bloque TTS 24 (muestra D), usando el estimado
// calibrado (no la lectura contaminada del bloque 11) para el chequeo de
// presupuesto, por decision explicita de Orlando el 2026-09-30.
//
// No hace una nueva lectura previa de creditos: reutiliza 12461 (el ultimo
// contador confirmado, de la lectura compartida bloque11/bloque24) como
// "antes" de este bloque, para no gastar otra consulta innecesaria.
// Hace como maximo UNA consulta de creditos despues de generar.

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cargarBloquesTts } from './lib_local/extraerGuion.mjs';
import { cargarCanal, cargarEnv, cargarCalibracion, constantes } from '../../../lib/config.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const DIR_PROYECTO = join(AQUI, '..');
const RUTA_GUION = join(DIR_PROYECTO, 'VIDEO_007_GUION_APROBADO.md');
const RUTA_MANIFIESTO = join(AQUI, 'manifiesto.json');
const DIR_AUDIO = join(AQUI, 'audio', 'bloques');

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const CREDITOS_ANTES_24 = 12461; // ultima lectura confirmada (cierre bloque 11 / apertura bloque 24)

function cargarManifiesto() { return JSON.parse(readFileSync(RUTA_MANIFIESTO, 'utf8')); }
function guardarManifiesto(m) { writeFileSync(RUTA_MANIFIESTO, JSON.stringify(m, null, 2) + '\n'); }
function entradaDe(m, id) { return m.bloques.find((b) => b.bloque_tts === id) || null; }

function necesitaGenerar(entrada, { textoBloque, voiceId, modelId, ajustes }) {
  if (!entrada) return { generar: true, motivo: 'sin entrada en el manifiesto' };
  const textoHash = sha256(textoBloque);
  const ajustesHash = sha256(JSON.stringify(ajustes));
  if (entrada.texto_sha256 !== textoHash) return { generar: true, motivo: 'texto no coincide con el hash guardado' };
  if (entrada.estado === 'pendiente' || entrada.estado === 'error' || !entrada.estado) return { generar: true, motivo: `estado previo "${entrada.estado}"` };
  if (entrada.voice_id !== voiceId || entrada.model_id !== modelId) return { generar: true, motivo: 'voz o modelo no coinciden' };
  if (entrada.ajustes_sha256 !== ajustesHash) return { generar: true, motivo: 'ajustes no coinciden' };
  const rutaAudio = entrada.archivo_audio ? join(DIR_AUDIO, entrada.archivo_audio) : null;
  if (!rutaAudio || !existsSync(rutaAudio) || statSync(rutaAudio).size === 0) return { generar: true, motivo: 'audio no existe o esta vacio' };
  return { generar: false, motivo: 'texto, voz, modelo y ajustes identicos; audio ya presente' };
}

async function suscripcionCruda({ base, apiKey }) {
  const res = await fetch(`${base.replace(/\/$/, '')}/v1/user/subscription`, { headers: { 'xi-api-key': apiKey } });
  if (!res.ok) { const e = new Error(`${res.status} ${res.statusText} consultando suscripcion`); e.estado = res.status; throw e; }
  const s = await res.json();
  return { usados: s.character_count, limite: s.character_limit };
}

async function llamarTtsConAlineacionCruda({ base, apiKey, voiceId, texto, modelo, ajustes, formatoSalida }) {
  const url = `${base.replace(/\/$/, '')}/v1/text-to-speech/${voiceId}/with-timestamps?output_format=${encodeURIComponent(formatoSalida)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: texto, model_id: modelo, voice_settings: ajustes }),
  });
  if (!res.ok) {
    const cuerpo = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} en text-to-speech/with-timestamps${cuerpo ? ' — ' + cuerpo.slice(0, 300) : ''}`);
  }
  const r = await res.json();
  if (!r.audio_base64) throw new Error('La respuesta no trae audio_base64.');
  return { audio: Buffer.from(r.audio_base64, 'base64'), alignment: r.alignment ?? null, normalized_alignment: r.normalized_alignment ?? null };
}

async function main() {
  const TOPE = 1500;
  const ID = '24';

  const bloques = cargarBloquesTts(RUTA_GUION);
  const bloque24 = bloques.find((b) => b.bloqueTts === ID);
  const bloque11 = bloques.find((b) => b.bloqueTts === '11');
  const canal = cargarCanal();
  const env = cargarEnv();
  const cal = cargarCalibracion();
  const K = constantes(canal, cal);
  const voiceId = env.ELEVENLABS_VOICE_ID;
  const modelId = canal.voz.modelo;
  const ajustes = canal.voz.ajustes;
  const formatoSalida = canal.api.formato_salida;

  let manifiesto = cargarManifiesto();
  const chequeoInicial = necesitaGenerar(entradaDe(manifiesto, ID), { textoBloque: bloque24.texto, voiceId, modelId, ajustes });
  console.log(`Bloque 24 — estado: "${entradaDe(manifiesto, ID)?.estado}". Chequeo: ${chequeoInicial.generar ? 'GENERAR' : 'SALTAR'} — ${chequeoInicial.motivo}`);
  if (!chequeoInicial.generar) { console.log('Ya generado. No se llama a nada.'); return; }

  const estimado11 = bloque11.caracteres * K.creditosPorCaracter;
  const estimado24 = bloque24.caracteres * K.creditosPorCaracter;
  const totalProyectado = 256 + 372 + estimado11 + estimado24;
  console.log(`\nPresupuesto (por decision explicita: usando estimado calibrado para el bloque 11, no la lectura de 1895):`);
  console.log(`  bloque 7  (real):     256`);
  console.log(`  bloque 10 (real):     372`);
  console.log(`  bloque 11 (estimado): ${estimado11.toFixed(2)}`);
  console.log(`  bloque 24 (estimado): ${estimado24.toFixed(2)}`);
  console.log(`  TOTAL proyectado:     ${totalProyectado.toFixed(2)}  (tope ${TOPE})`);
  if (totalProyectado > TOPE) {
    console.log('ABORTADO: la proyeccion supera el tope. No se genera el bloque 24.');
    process.exit(1);
  }
  console.log('OK: proyeccion dentro del tope. Procediendo.');

  mkdirSync(DIR_AUDIO, { recursive: true });
  console.log('\nRealizando la UNICA llamada de generacion para el bloque 24...');
  let resultado;
  try {
    resultado = await llamarTtsConAlineacionCruda({
      base: canal.api.base, apiKey: env.ELEVENLABS_API_KEY, voiceId, texto: bloque24.texto, modelo: modelId, ajustes, formatoSalida,
    });
  } catch (e) {
    console.log(`\nFALLO la llamada de generacion del bloque 24: ${e.message}`);
    console.log('Deteniendose. No se reintenta sin autorizacion.');
    process.exit(1);
  }
  if (!resultado.audio || resultado.audio.length === 0) {
    console.log('\nFALLO: la respuesta no trae audio. Deteniendose sin guardar nada.');
    process.exit(1);
  }

  const nombreArchivo = '24.mp3';
  const rutaAudio = join(DIR_AUDIO, nombreArchivo);
  writeFileSync(rutaAudio, resultado.audio);
  const nombreAlineacion = '24.alignment.json';
  writeFileSync(join(DIR_AUDIO, nombreAlineacion), JSON.stringify({ alignment: resultado.alignment, normalized_alignment: resultado.normalized_alignment }, null, 2));
  console.log(`Audio guardado: ${rutaAudio} (${resultado.audio.length} bytes)`);
  console.log(`Alineacion guardada (alignment: ${!!resultado.alignment}, normalized_alignment: ${!!resultado.normalized_alignment})`);

  manifiesto = cargarManifiesto();
  const idx24 = manifiesto.bloques.findIndex((b) => b.bloque_tts === ID);
  manifiesto.bloques[idx24] = {
    ...manifiesto.bloques[idx24],
    caracteres: bloque24.caracteres,
    texto_sha256: bloque24.textoSha256,
    estado: 'generado',
    voice_id: voiceId,
    model_id: modelId,
    ajustes_sha256: sha256(JSON.stringify(ajustes)),
    history_item_id: null,
    archivo_audio: nombreArchivo,
    archivo_alineacion: nombreAlineacion,
    generado_en: new Date().toISOString(),
    creditos_estimados: Number(estimado24.toFixed(2)),
    creditos_reales: null,
    creditos_antes: CREDITOS_ANTES_24,
    creditos_despues: null,
  };
  guardarManifiesto(manifiesto);
  console.log('Manifiesto actualizado (creditos_reales pendiente de la consulta posterior).');

  console.log('\nRealizando, como maximo, UNA consulta adicional de creditos...');
  try {
    const sub = await suscripcionCruda({ base: canal.api.base, apiKey: env.ELEVENLABS_API_KEY });
    const creditosReales24 = sub.usados - CREDITOS_ANTES_24;
    manifiesto = cargarManifiesto();
    const idx = manifiesto.bloques.findIndex((b) => b.bloque_tts === ID);
    manifiesto.bloques[idx].creditos_reales = creditosReales24;
    manifiesto.bloques[idx].creditos_despues = sub.usados;
    guardarManifiesto(manifiesto);
    console.log(`Creditos usados DESPUES: ${sub.usados}. Creditos reales del bloque 24: ${creditosReales24}`);
  } catch (e) {
    console.log(`La consulta adicional fallo (${e.message}). El audio se conserva; creditos_reales queda null (pendiente de confirmar). No se reintenta.`);
  }

  const chequeoPost = necesitaGenerar(entradaDe(cargarManifiesto(), ID), { textoBloque: bloque24.texto, voiceId, modelId, ajustes });
  console.log(`\nVerificacion de idempotencia: ${chequeoPost.generar ? 'GENERAR (FALLO)' : 'SALTAR (correcto)'} — ${chequeoPost.motivo}`);
  console.log('\n=== Fin. Solo se genero el bloque 24. ===');
}

main().catch((e) => { console.error('\nError inesperado:', e.message); process.exit(1); });
