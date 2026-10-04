// Regeneracion correctiva de exactamente 4 bloques TTS del Video 7
// (1, 18, 20, 23), por defectos de pronunciacion de ElevenLabs
// confirmados por Orlando tras escuchar narracion_revision_02.
// Tope conservador: 1800 creditos. Presupuesto controlado SOLO por
// caracteres (0.276 cred/car) -- sin consultar el contador de creditos
// en ningun momento, sin polling.

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import { cargarBloquesTts } from './lib_local/extraerGuion.mjs';
import { cargarCanal, cargarEnv, cargarCalibracion, constantes } from '../../../lib/config.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const DIR_PROYECTO = join(AQUI, '..');
const RUTA_GUION = join(DIR_PROYECTO, 'VIDEO_007_GUION_APROBADO.md');
const RUTA_MANIFIESTO = join(AQUI, 'manifiesto.json');
const DIR_AUDIO = join(AQUI, 'audio', 'bloques');

const BLOQUES_AUTORIZADOS = ['1', '18', '20', '23'];
const TOPE_CONSERVADOR = 1800;

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

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

function ffprobeJson(rutaAudio) {
  const salida = execFileSync('ffprobe', [
    '-v', 'error', '-print_format', 'json',
    '-show_entries', 'format=duration,bit_rate:stream=sample_rate,channels,codec_name',
    rutaAudio,
  ]).toString('utf8');
  return JSON.parse(salida);
}

async function main() {
  const argv = process.argv.slice(2);
  const modoDryRun = argv.includes('--dry-run') || !argv.includes('--generar');

  const bloquesGuion = cargarBloquesTts(RUTA_GUION);
  const canal = cargarCanal();
  const env = cargarEnv();
  const cal = cargarCalibracion();
  const K = constantes(canal, cal);
  const voiceId = env.ELEVENLABS_VOICE_ID;
  const modelId = canal.voz.modelo;
  const ajustes = canal.voz.ajustes;
  const formatoSalida = canal.api.formato_salida;
  const ajustesHash = sha256(JSON.stringify(ajustes));

  console.log('=== Regeneracion correctiva: bloques 1, 18, 20, 23 — Video 7 ===');
  console.log(`Modo: ${modoDryRun ? 'DRY-RUN' : 'GENERAR (llamadas reales autorizadas)'}\n`);

  const manifiesto = cargarManifiesto();
  let totalCar = 0;
  const plan = [];
  for (const id of BLOQUES_AUTORIZADOS) {
    const bloque = bloquesGuion.find((b) => b.bloqueTts === id);
    const entrada = entradaDe(manifiesto, id);
    const chequeo = necesitaGenerar(entrada, { textoBloque: bloque.texto, voiceId, modelId, ajustes });
    console.log(`bloque ${id.padEnd(3)}: estado=${entrada?.estado} -> ${chequeo.generar ? 'GENERAR' : 'SALTAR'} (${chequeo.motivo}) — ${bloque.caracteres} car`);
    if (!chequeo.generar) throw new Error(`El bloque ${id} esta autorizado pero ya aparece generado/valido. Revisar.`);
    totalCar += bloque.caracteres;
    plan.push({ id, bloque });
  }

  const costoConservador = totalCar * K.creditosPorCaracter;
  console.log(`\nCaracteres totales: ${totalCar}`);
  console.log(`Costo conservador (0,276 cred/car): ${costoConservador.toFixed(2)} creditos (tope ${TOPE_CONSERVADOR})`);
  if (costoConservador > TOPE_CONSERVADOR) {
    console.log('ABORTADO: supera el tope. No se llama a la API.');
    process.exit(1);
  }
  console.log('OK: dentro del tope.' + (modoDryRun ? ' (dry-run, no se llama a nada)' : ''));

  if (modoDryRun) { console.log('\nFin del dry-run.'); return; }

  mkdirSync(DIR_AUDIO, { recursive: true });
  const resumen = [];

  for (const { id, bloque } of plan) {
    console.log(`\n--- Bloque ${id} ---`);
    let resultado;
    try {
      resultado = await llamarTtsConAlineacionCruda({
        base: canal.api.base, apiKey: env.ELEVENLABS_API_KEY, voiceId, texto: bloque.texto, modelo: modelId, ajustes, formatoSalida,
      });
    } catch (e) {
      console.log(`\nFALLO la llamada del bloque ${id}: ${e.message}`);
      console.log('Deteniendose. No se reintenta ni se continua.');
      console.log(`Bloques completados antes del fallo: ${resumen.map((r) => r.id).join(', ') || '(ninguno)'}`);
      process.exit(1);
    }
    if (!resultado.audio || resultado.audio.length === 0) {
      console.log(`\nFALLO: respuesta sin audio para el bloque ${id}. Deteniendose sin guardar nada de este bloque.`);
      process.exit(1);
    }
    if (!resultado.alignment || !resultado.normalized_alignment) {
      console.log(`\nFALLO: respuesta sin alignment/normalized_alignment valido para el bloque ${id}. Se conserva lo generado hasta ahora; deteniendose sin marcar este bloque como generado.`);
      process.exit(1);
    }

    const nombreArchivo = `${id}.mp3`;
    const rutaAudio = join(DIR_AUDIO, nombreArchivo);
    writeFileSync(rutaAudio, resultado.audio);
    const nombreAlineacion = `${id}.alignment.json`;
    writeFileSync(join(DIR_AUDIO, nombreAlineacion), JSON.stringify({ alignment: resultado.alignment, normalized_alignment: resultado.normalized_alignment }, null, 2));

    let probe, duracion, muestreo, canales, bitrate;
    try {
      probe = ffprobeJson(rutaAudio);
      duracion = Number(probe.format.duration);
      bitrate = Number(probe.format.bit_rate) / 1000;
      muestreo = Number(probe.streams[0].sample_rate);
      canales = Number(probe.streams[0].channels);
    } catch (e) {
      console.log(`\nSOSPECHOSO: ffprobe no pudo leer el bloque ${id} (${e.message}). Conservando archivo, marcando para revision, deteniendose.`);
      const m = cargarManifiesto();
      const idx = m.bloques.findIndex((b) => b.bloque_tts === id);
      m.bloques[idx] = { ...m.bloques[idx], estado: 'revision_requerida', archivo_audio: nombreArchivo, archivo_alineacion: nombreAlineacion };
      guardarManifiesto(m);
      process.exit(1);
    }

    const carPorMin = bloque.caracteres / (duracion / 60);
    const palPorMin = bloque.palabras / (duracion / 60);
    const problemas = [];
    if (canales !== 1) problemas.push(`canales=${canales}`);
    if (Math.abs(muestreo - 44100) > 1) problemas.push(`sample_rate=${muestreo}`);
    if (bitrate && Math.abs(bitrate - 128) > 20) problemas.push(`bitrate~${bitrate.toFixed(0)}kbps`);

    console.log(`  Audio: ${resultado.audio.length} bytes, ${duracion.toFixed(2)}s, ${canales}ch, ${muestreo}Hz, ~${bitrate.toFixed(0)}kbps`);
    console.log(`  Ritmo: ${carPorMin.toFixed(1)} car/min, ${palPorMin.toFixed(1)} pal/min`);
    console.log(`  alignment: true  normalized_alignment: true`);

    if (problemas.length) {
      console.log(`\nSOSPECHOSO en bloque ${id}: ${problemas.join('; ')}. Conservando, marcando para revision, deteniendose.`);
      const m = cargarManifiesto();
      const idx = m.bloques.findIndex((b) => b.bloque_tts === id);
      m.bloques[idx] = { ...m.bloques[idx], estado: 'revision_requerida', archivo_audio: nombreArchivo, archivo_alineacion: nombreAlineacion, anomalias: problemas };
      guardarManifiesto(m);
      process.exit(1);
    }

    const m = cargarManifiesto();
    const idx = m.bloques.findIndex((b) => b.bloque_tts === id);
    m.bloques[idx] = {
      ...m.bloques[idx],
      caracteres: bloque.caracteres,
      texto_sha256: bloque.textoSha256,
      estado: 'generado',
      voice_id: voiceId,
      model_id: modelId,
      ajustes_sha256: ajustesHash,
      history_item_id: null,
      archivo_audio: nombreArchivo,
      archivo_alineacion: nombreAlineacion,
      generado_en: new Date().toISOString(),
      tamano_bytes: resultado.audio.length,
      duracion_segundos: Number(duracion.toFixed(3)),
      car_por_min: Number(carPorMin.toFixed(1)),
      pal_por_min: Number(palPorMin.toFixed(1)),
      creditos_estimados_conservador: Number((bloque.caracteres * K.creditosPorCaracter).toFixed(2)),
      creditos_reales: null,
      nota_creditos: 'No se consulto el contador de creditos (presupuesto controlado por caracteres, segun instruccion explicita de no hacer polling).',
      relacion_version_rechazada: `Reemplaza la version marcada como rechazada en revisiones_rechazadas (ver manifiesto para el motivo exacto).`,
      pendiente_aprobacion_auditiva: true,
    };
    guardarManifiesto(m);

    const chequeoPost = necesitaGenerar(entradaDe(cargarManifiesto(), id), { textoBloque: bloque.texto, voiceId, modelId, ajustes });
    console.log(`  Idempotencia: ${chequeoPost.generar ? 'GENERAR (FALLO)' : 'SALTAR (correcto)'}`);

    resumen.push({ id, caracteres: bloque.caracteres, palabras: bloque.palabras, duracion, carPorMin, palPorMin, tamanoBytes: resultado.audio.length });
  }

  console.log('\n=== Los 4 bloques se regeneraron correctamente. Pendientes de aprobacion auditiva. ===');
  console.log(JSON.stringify(resumen, null, 2));
}

main().catch((e) => { console.error('\nError inesperado:', e.message); process.exit(1); });
