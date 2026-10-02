// Generacion de los 19 bloques TTS pendientes del Video 7 (2-6, 8-9,
// 12-23), autorizados con tope conservador de 8.100 creditos.
//
// Reglas de esta ronda:
//   - Presupuesto controlado SOLO por caracteres (0,276 cred/car), no por
//     lecturas de suscripcion -- las lecturas de creditos ya mostraron
//     estar contaminadas por actividad externa a esta sesion.
//   - Una sola llamada TTS por bloque. Sin reintentos automaticos.
//   - Persistencia inmediata tras cada bloque (manifiesto + audio +
//     alineacion) para poder reanudar sin repetir gasto.
//   - Validacion con ffprobe tras cada bloque (formato, canal, sample
//     rate, bitrate aproximado) y verificacion de alignment/normalized_
//     alignment presentes. Cualquier anomalia detiene el proceso.
//   - No se tocan los bloques 1, 7, 10, 11 ni 24.

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

const BLOQUES_AUTORIZADOS = ['2','3','4','5','6','8','9','12','13','14','15','16','17','18','19','20','21','22','23'];
const BLOQUES_INTOCABLES = ['1','7','10','11','24'];
const TOPE_CONSERVADOR = 8100;
const TARIFA_CALIBRADA_OBSERVADA = 0.220; // promedio real observado en bloques 1, 7, 10 (254/1153, 256/1162, 372/1690)

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

  console.log('=== Generacion de los 19 bloques pendientes — Video 7 ===');
  console.log(`Modo: ${modoDryRun ? 'DRY-RUN (local, sin llamar a la API)' : 'GENERAR (llamadas reales autorizadas)'}\n`);

  const manifiesto = cargarManifiesto();

  // --- Verificacion de los bloques intocables ---
  console.log('--- Bloques que NO se tocan (deben estar generado, hash y audio presentes) ---');
  for (const id of BLOQUES_INTOCABLES) {
    const bloque = bloquesGuion.find((b) => b.bloqueTts === id);
    const entrada = entradaDe(manifiesto, id);
    const hashOk = entrada && entrada.texto_sha256 === bloque.textoSha256;
    const audioOk = entrada?.archivo_audio && existsSync(join(DIR_AUDIO, entrada.archivo_audio));
    const ok = entrada?.estado === 'generado' && hashOk && audioOk;
    console.log(`  bloque ${id.padEnd(3)}: estado=${entrada?.estado} hash_ok=${hashOk} audio_ok=${audioOk} -> ${ok ? 'OK' : 'PROBLEMA'}`);
    if (!ok) throw new Error(`El bloque intocable ${id} no esta en el estado esperado. Deteniendose sin generar nada.`);
  }

  // --- Chequeo de los 19 bloques autorizados ---
  console.log('\n--- Bloques autorizados a generar (deben estar pendiente) ---');
  let totalCar = 0, totalPal = 0;
  const plan = [];
  for (const id of BLOQUES_AUTORIZADOS) {
    const bloque = bloquesGuion.find((b) => b.bloqueTts === id);
    if (!bloque) throw new Error(`No existe el bloque TTS "${id}" en el guion.`);
    const entrada = entradaDe(manifiesto, id);
    const chequeo = necesitaGenerar(entrada, { textoBloque: bloque.texto, voiceId, modelId, ajustes });
    console.log(`  bloque ${id.padEnd(3)}: estado=${entrada?.estado} -> ${chequeo.generar ? 'GENERAR' : 'SALTAR'} (${chequeo.motivo}) — ${bloque.caracteres} car, ${bloque.palabras} pal`);
    if (!chequeo.generar) throw new Error(`El bloque ${id} esta autorizado pero ya aparece generado/valido. Revisar antes de continuar (no deberia estar asi).`);
    totalCar += bloque.caracteres;
    totalPal += bloque.palabras;
    plan.push({ id, bloque });
  }

  const costoCalibrado = totalCar * TARIFA_CALIBRADA_OBSERVADA;
  const costoConservador = totalCar * K.creditosPorCaracter; // 0.276 segun canal.json
  console.log(`\nCaracteres totales pendientes: ${totalCar}`);
  console.log(`Palabras totales pendientes: ${totalPal}`);
  console.log(`Costo estimado calibrado (tarifa observada ~0,220 cred/car): ${costoCalibrado.toFixed(2)} creditos`);
  console.log(`Costo conservador (0,276 cred/car, canal.json): ${costoConservador.toFixed(2)} creditos`);
  console.log(`Tope autorizado: ${TOPE_CONSERVADOR} creditos`);

  if (costoConservador > TOPE_CONSERVADOR) {
    console.log('\nABORTADO: el costo conservador supera el tope autorizado. No se llama a la API.');
    process.exit(1);
  }
  console.log('OK: costo conservador dentro del tope. Procediendo.' + (modoDryRun ? ' (dry-run: no se llama a nada)' : ''));

  if (modoDryRun) {
    console.log('\nFin del dry-run. No se realizo ninguna llamada a ElevenLabs.');
    return;
  }

  mkdirSync(DIR_AUDIO, { recursive: true });
  const ajustesHash = sha256(JSON.stringify(ajustes));
  const resumen = [];

  for (const { id, bloque } of plan) {
    console.log(`\n--- Bloque ${id} ---`);
    console.log(`Generando (${bloque.caracteres} car, ${bloque.palabras} pal)...`);
    let resultado;
    try {
      resultado = await llamarTtsConAlineacionCruda({
        base: canal.api.base, apiKey: env.ELEVENLABS_API_KEY, voiceId, texto: bloque.texto, modelo: modelId, ajustes, formatoSalida,
      });
    } catch (e) {
      console.log(`\nFALLO la llamada de generacion del bloque ${id}: ${e.message}`);
      console.log('Deteniendose de inmediato. No se reintenta ni se continua con los bloques siguientes.');
      console.log(`Bloques completados antes del fallo: ${resumen.map((r) => r.id).join(', ') || '(ninguno)'}`);
      process.exit(1);
    }

    if (!resultado.audio || resultado.audio.length === 0) {
      console.log(`\nFALLO: la respuesta del bloque ${id} no trae audio. Deteniendose sin guardar nada de este bloque.`);
      console.log(`Bloques completados antes del fallo: ${resumen.map((r) => r.id).join(', ') || '(ninguno)'}`);
      process.exit(1);
    }

    const nombreArchivo = `${id}.mp3`;
    const rutaAudio = join(DIR_AUDIO, nombreArchivo);
    writeFileSync(rutaAudio, resultado.audio);
    const nombreAlineacion = `${id}.alignment.json`;
    writeFileSync(join(DIR_AUDIO, nombreAlineacion), JSON.stringify({ alignment: resultado.alignment, normalized_alignment: resultado.normalized_alignment }, null, 2));

    // --- Validacion con ffprobe + alignment, ANTES de marcar como generado ---
    let probe, duracion, muestreo, canales, codec, bitrate;
    try {
      probe = ffprobeJson(rutaAudio);
      duracion = Number(probe.format.duration);
      bitrate = Number(probe.format.bit_rate) / 1000;
      const stream = probe.streams[0];
      muestreo = Number(stream.sample_rate);
      canales = Number(stream.channels);
      codec = stream.codec_name;
    } catch (e) {
      console.log(`\nSOSPECHOSO: ffprobe no pudo leer el audio del bloque ${id} (${e.message}). Marcado para revision. Deteniendose sin regenerar.`);
      const m = cargarManifiesto();
      const idx = m.bloques.findIndex((b) => b.bloque_tts === id);
      m.bloques[idx] = { ...m.bloques[idx], estado: 'revision_requerida', archivo_audio: nombreArchivo, archivo_alineacion: nombreAlineacion };
      guardarManifiesto(m);
      process.exit(1);
    }

    const carPorMin = bloque.caracteres / (duracion / 60);
    const palPorMin = bloque.palabras / (duracion / 60);
    const alignOk = !!resultado.alignment;
    const normAlignOk = !!resultado.normalized_alignment;

    const problemas = [];
    if (canales !== 1) problemas.push(`canales=${canales} (se esperaba mono=1)`);
    if (Math.abs(muestreo - 44100) > 1) problemas.push(`sample_rate=${muestreo} (se esperaba 44100)`);
    if (bitrate && Math.abs(bitrate - 128) > 20) problemas.push(`bitrate~${bitrate.toFixed(0)}kbps (se esperaba ~128)`);
    if (!alignOk || !normAlignOk) problemas.push('falta alignment o normalized_alignment');
    if (duracion < 5 || duracion > 400) problemas.push(`duracion sospechosa: ${duracion.toFixed(1)}s`);
    if (carPorMin < 400 || carPorMin > 1100) problemas.push(`ritmo sospechoso: ${carPorMin.toFixed(1)} car/min`);

    console.log(`  Audio: ${resultado.audio.length} bytes, ${duracion.toFixed(2)}s, ${canales}ch, ${muestreo}Hz, ~${bitrate.toFixed(0)}kbps, codec=${codec}`);
    console.log(`  Ritmo: ${carPorMin.toFixed(1)} car/min, ${palPorMin.toFixed(1)} pal/min`);
    console.log(`  alignment: ${alignOk}  normalized_alignment: ${normAlignOk}`);

    if (problemas.length) {
      console.log(`\nSOSPECHOSO en el bloque ${id}: ${problemas.join('; ')}.`);
      console.log('Se conserva el audio generado, se marca para revision, y el proceso SE DETIENE (no se regenera automaticamente).');
      const m = cargarManifiesto();
      const idx = m.bloques.findIndex((b) => b.bloque_tts === id);
      m.bloques[idx] = {
        ...m.bloques[idx],
        caracteres: bloque.caracteres, texto_sha256: bloque.textoSha256,
        estado: 'revision_requerida',
        voice_id: voiceId, model_id: modelId, ajustes_sha256: ajustesHash,
        archivo_audio: nombreArchivo, archivo_alineacion: nombreAlineacion,
        generado_en: new Date().toISOString(),
        duracion_segundos: duracion, car_por_min: Number(carPorMin.toFixed(1)), pal_por_min: Number(palPorMin.toFixed(1)),
        anomalias: problemas,
      };
      guardarManifiesto(m);
      console.log(`Bloques completados correctamente antes de esta anomalia: ${resumen.map((r) => r.id).join(', ') || '(ninguno)'}`);
      process.exit(1);
    }

    // --- Persistencia inmediata (todo OK) ---
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
      creditos_estimados_calibrado: Number((bloque.caracteres * TARIFA_CALIBRADA_OBSERVADA).toFixed(2)),
      creditos_estimados_conservador: Number((bloque.caracteres * K.creditosPorCaracter).toFixed(2)),
      creditos_reales: null,
      nota_creditos: 'No se consulto el contador de creditos para este bloque (presupuesto controlado por caracteres, por las lecturas contaminadas observadas anteriormente).',
    };
    guardarManifiesto(m);

    // Verificacion de idempotencia inmediata.
    const chequeoPost = necesitaGenerar(entradaDe(cargarManifiesto(), id), { textoBloque: bloque.texto, voiceId, modelId, ajustes });
    console.log(`  Guardado y manifiesto actualizado. Idempotencia: ${chequeoPost.generar ? 'GENERAR (FALLO)' : 'SALTAR (correcto)'}`);

    resumen.push({ id, caracteres: bloque.caracteres, palabras: bloque.palabras, duracion, carPorMin, palPorMin, tamanoBytes: resultado.audio.length });
  }

  console.log('\n=== Los 19 bloques se generaron correctamente. ===');
  console.log(JSON.stringify(resumen, null, 2));
}

main().catch((e) => { console.error('\nError inesperado:', e.message); process.exit(1); });
