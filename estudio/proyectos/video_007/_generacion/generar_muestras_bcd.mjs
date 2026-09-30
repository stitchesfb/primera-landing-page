// Generacion de las muestras B, C y D del Video 7 (bloques TTS 7, 10, 11, 24).
// Autorizacion: maximo 4 llamadas nuevas a ElevenLabs (una por bloque), tope
// conjunto de creditos para B+C+D, sin regeneraciones automaticas.
//
// A diferencia de generar_bloque.mjs, esta version:
//   - verifica el costo estimado CONJUNTO de los 4 bloques antes de llamar a
//     nada: si supera el tope, aborta sin generar ninguno;
//   - guarda `alignment` y `normalized_alignment` tal como los devuelve el
//     endpoint `with-timestamps`, sin llamadas adicionales (por eso hace el
//     fetch directamente en vez de pasar por ElevenLabs.vozConTiempos, que
//     solo expone una alineacion ya normalizada y una sola de las dos);
//   - no reintenta automaticamente ninguna llamada: un fallo detiene el
//     script de inmediato, sin tocar los bloques restantes.
//
// Uso:
//   node generar_muestras_bcd.mjs --dry-run
//   node generar_muestras_bcd.mjs --generar --tope-creditos=1500

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

const BLOQUES_AUTORIZADOS = ['7', '10', '11', '24'];

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

function cargarManifiesto() {
  return JSON.parse(readFileSync(RUTA_MANIFIESTO, 'utf8'));
}
function guardarManifiesto(m) {
  writeFileSync(RUTA_MANIFIESTO, JSON.stringify(m, null, 2) + '\n');
}
function entradaDe(manifiesto, bloqueTts) {
  return manifiesto.bloques.find((b) => b.bloque_tts === bloqueTts) || null;
}

function necesitaGenerar(entrada, { textoBloque, voiceId, modelId, ajustes }) {
  if (!entrada) return { generar: true, motivo: 'sin entrada en el manifiesto para este bloque' };
  const textoHash = sha256(textoBloque);
  const ajustesHash = sha256(JSON.stringify(ajustes));
  if (entrada.texto_sha256 !== textoHash) return { generar: true, motivo: 'el texto del bloque no coincide con el hash guardado' };
  if (entrada.estado === 'pendiente' || entrada.estado === 'error' || !entrada.estado) {
    return { generar: true, motivo: `estado previo del bloque es "${entrada.estado}"` };
  }
  if (entrada.voice_id !== voiceId || entrada.model_id !== modelId) return { generar: true, motivo: 'la voz o el modelo no coinciden' };
  if (entrada.ajustes_sha256 !== ajustesHash) return { generar: true, motivo: 'los ajustes no coinciden' };
  const rutaAudio = entrada.archivo_audio ? join(DIR_AUDIO, entrada.archivo_audio) : null;
  if (!rutaAudio || !existsSync(rutaAudio) || statSync(rutaAudio).size === 0) {
    return { generar: true, motivo: 'el audio del bloque no existe en disco o esta vacio' };
  }
  return { generar: false, motivo: 'texto, voz, modelo y ajustes identicos; audio ya presente en disco' };
}

/** Llamada directa (sin pasar por lib/elevenlabs.mjs) para poder guardar alignment y normalized_alignment crudos. Sin reintentos automaticos. */
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
  return {
    audio: Buffer.from(r.audio_base64, 'base64'),
    alignment: r.alignment ?? null,
    normalized_alignment: r.normalized_alignment ?? null,
  };
}

async function suscripcionCruda({ base, apiKey }) {
  const res = await fetch(`${base.replace(/\/$/, '')}/v1/user/subscription`, { headers: { 'xi-api-key': apiKey } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} consultando suscripcion`);
  const s = await res.json();
  return { usados: s.character_count, limite: s.character_limit };
}

async function esperarEstable({ base, apiKey }, usadosAntes, { intentos = 40, esperaMs = 3000, estables = 4 } = {}) {
  let anterior = usadosAntes, quietos = 0, movio = false, ultima = null;
  for (let i = 1; i <= intentos; i++) {
    await new Promise((r) => setTimeout(r, esperaMs));
    ultima = await suscripcionCruda({ base, apiKey });
    if (ultima.usados !== anterior) { movio = true; quietos = 0; anterior = ultima.usados; continue; }
    if (!movio) continue;
    if (++quietos >= estables) return { sub: ultima, estable: true };
  }
  return { sub: ultima, estable: false };
}

async function main() {
  const argv = process.argv.slice(2);
  const modoDryRun = argv.includes('--dry-run') || !argv.includes('--generar');
  const topeArg = argv.find((a) => a.startsWith('--tope-creditos='));
  const topeCreditos = topeArg ? Number(topeArg.split('=')[1]) : 1500;

  console.log('=== Muestras B (7), C (10+11), D (24) — Video 7 ===');
  console.log(`Modo: ${modoDryRun ? 'DRY-RUN (local, sin llamar a la API)' : 'GENERAR (llamadas reales autorizadas)'}`);
  console.log(`Tope de creditos conjunto para B+C+D: ${topeCreditos}\n`);

  const bloquesGuion = cargarBloquesTts(RUTA_GUION);
  const canal = cargarCanal();
  const env = cargarEnv();
  const cal = cargarCalibracion();
  const K = constantes(canal, cal);
  const voiceId = env.ELEVENLABS_VOICE_ID;
  const modelId = canal.voz.modelo;
  const ajustes = canal.voz.ajustes;
  const formatoSalida = canal.api.formato_salida;
  if (!voiceId) throw new Error('Falta ELEVENLABS_VOICE_ID en el entorno.');

  let manifiesto = cargarManifiesto();

  // --- Paso 1: chequeo local + costo estimado conjunto, ANTES de llamar a nada ---
  let costoTotal = 0;
  const previas = [];
  for (const id of BLOQUES_AUTORIZADOS) {
    const bloque = bloquesGuion.find((b) => b.bloqueTts === id);
    if (!bloque) throw new Error(`No existe el bloque TTS "${id}" en el guion.`);
    const entrada = entradaDe(manifiesto, id);
    const chequeo = necesitaGenerar(entrada, { textoBloque: bloque.texto, voiceId, modelId, ajustes });
    const costo = bloque.caracteres * K.creditosPorCaracter;
    costoTotal += costo;
    previas.push({ id, bloque, entrada, chequeo, costo });
    console.log(`Bloque ${id}: ${bloque.caracteres} car, ${bloque.palabras} pal — ${chequeo.generar ? 'GENERAR' : 'SALTAR'} (${chequeo.motivo}) — costo estimado ${costo.toFixed(2)} creditos`);
  }
  console.log(`\nCosto estimado conjunto B+C+D: ${costoTotal.toFixed(2)} creditos (tarifa ${K.creditosPorCaracter}/car, calibrado: ${K.calibradoCreditos})`);

  if (costoTotal > topeCreditos) {
    console.log(`\nABORTADO: el costo estimado conjunto (${costoTotal.toFixed(2)}) supera el tope autorizado (${topeCreditos}). No se llama a la API.`);
    process.exit(1);
  }
  console.log(`OK: costo estimado conjunto dentro del tope autorizado (${topeCreditos} creditos).`);

  if (modoDryRun) {
    console.log('\nFin del dry-run. No se realizo ninguna llamada a ElevenLabs.');
    return;
  }

  mkdirSync(DIR_AUDIO, { recursive: true });
  const resumen = [];

  for (const { id, bloque, chequeo } of previas) {
    console.log(`\n--- Bloque ${id} ---`);
    if (!chequeo.generar) {
      console.log('Ya generado y valido segun el manifiesto. No se llama a la API para este bloque.');
      resumen.push({ id, salteado: true });
      continue;
    }

    let usadosAntes = null;
    try {
      const s = await suscripcionCruda({ base: canal.api.base, apiKey: env.ELEVENLABS_API_KEY });
      usadosAntes = s.usados;
      console.log(`Creditos usados ANTES: ${s.usados} / ${s.limite}`);
    } catch (e) {
      console.log(`Aviso: no se pudo consultar la suscripcion antes de generar (${e.message}).`);
    }

    console.log(`Realizando la llamada de generacion para el bloque ${id}...`);
    let resultado;
    try {
      resultado = await llamarTtsConAlineacionCruda({
        base: canal.api.base, apiKey: env.ELEVENLABS_API_KEY, voiceId, texto: bloque.texto, modelo: modelId, ajustes, formatoSalida,
      });
    } catch (e) {
      console.log(`\nFALLO la llamada a ElevenLabs para el bloque ${id}: ${e.message}`);
      console.log('Deteniendose de inmediato. No se reintenta ni se continua con los bloques restantes sin autorizacion.');
      guardarManifiesto(manifiesto);
      process.exit(1);
    }

    if (!resultado.audio || resultado.audio.length === 0) {
      console.log(`\nFALLO: la respuesta del bloque ${id} no trae audio (buffer vacio). Deteniendose sin guardar nada de este bloque.`);
      guardarManifiesto(manifiesto);
      process.exit(1);
    }
    if (!resultado.alignment && !resultado.normalized_alignment) {
      console.log(`\nAVISO: la respuesta del bloque ${id} no trae alignment ni normalized_alignment. El audio si llego; se guarda, pero se reporta la ausencia.`);
    }

    const nombreArchivo = `${id}.mp3`;
    const rutaAudio = join(DIR_AUDIO, nombreArchivo);
    writeFileSync(rutaAudio, resultado.audio);
    const nombreAlineacion = `${id}.alignment.json`;
    writeFileSync(join(DIR_AUDIO, nombreAlineacion), JSON.stringify({ alignment: resultado.alignment, normalized_alignment: resultado.normalized_alignment }, null, 2));
    console.log(`Audio guardado: ${rutaAudio} (${resultado.audio.length} bytes)`);
    console.log(`Alineacion guardada: ${join(DIR_AUDIO, nombreAlineacion)}`);

    let creditosReales = null, usadosDespues = null;
    if (usadosAntes != null) {
      console.log('Esperando a que el contador de creditos se estabilice (solo consultas de lectura)...');
      const espera = await esperarEstable({ base: canal.api.base, apiKey: env.ELEVENLABS_API_KEY }, usadosAntes);
      usadosDespues = espera.sub.usados;
      if (espera.estable) {
        creditosReales = usadosDespues - usadosAntes;
        console.log(`Creditos usados DESPUES: ${usadosDespues} (estable). Consumidos: ${creditosReales}`);
      } else {
        console.log(`El contador seguia moviendose; ultimo valor visto: ${usadosDespues} (no se toma como definitivo).`);
      }
    }

    const idx = manifiesto.bloques.findIndex((b) => b.bloque_tts === id);
    const costoEstimado = bloque.caracteres * K.creditosPorCaracter;
    manifiesto.bloques[idx] = {
      ...manifiesto.bloques[idx],
      caracteres: bloque.caracteres,
      texto_sha256: bloque.textoSha256,
      estado: 'generado',
      voice_id: voiceId,
      model_id: modelId,
      ajustes_sha256: sha256(JSON.stringify(ajustes)),
      history_item_id: null,
      archivo_audio: nombreArchivo,
      archivo_alineacion: nombreAlineacion,
      generado_en: new Date().toISOString(),
      creditos_estimados: Number(costoEstimado.toFixed(2)),
      creditos_reales: creditosReales,
      creditos_antes: usadosAntes,
      creditos_despues: usadosDespues,
    };
    guardarManifiesto(manifiesto); // persistencia inmediata, antes de continuar al siguiente bloque

    // Verificacion de idempotencia para este bloque.
    const manifiestoRelido = cargarManifiesto();
    const chequeoFinal = necesitaGenerar(entradaDe(manifiestoRelido, id), { textoBloque: bloque.texto, voiceId, modelId, ajustes });
    console.log(`Verificacion de idempotencia: ${chequeoFinal.generar ? 'GENERAR (FALLO)' : 'SALTAR (correcto)'} — ${chequeoFinal.motivo}`);

    resumen.push({
      id, salteado: false, caracteres: bloque.caracteres, palabras: bloque.palabras,
      creditosEstimados: costoEstimado, creditosReales, usadosAntes, usadosDespues,
      rutaAudio, alignmentPresente: !!resultado.alignment, normalizedAlignmentPresente: !!resultado.normalized_alignment,
    });
  }

  console.log('\n=== Resumen de llamadas ===');
  console.log(JSON.stringify(resumen, null, 2));
  console.log('\nFin. No se generaron bloques fuera de 7, 10, 11 y 24. No hubo musica, visuales ni render.');
}

main().catch((e) => {
  console.error('\nError inesperado:', e.message);
  process.exit(1);
});
