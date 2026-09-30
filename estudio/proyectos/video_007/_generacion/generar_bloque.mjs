// Generacion real, persistente y reanudable de UN bloque TTS del Video 7.
//
// Uso:
//   node generar_bloque.mjs <bloque_tts> --dry-run     -> solo verifica local, no llama a la API
//   node generar_bloque.mjs <bloque_tts> --generar --tope-creditos=350
//                                                       -> genera si pasa todos los checks
//
// Reglas de esta calibracion (bloque 1, tope 350 creditos):
//   - Nunca se llama a la API en modo --dry-run.
//   - En modo --generar, se hace exactamente UNA llamada de generacion
//     (vozConTiempos). Las lecturas de suscripcion() son de solo consulta
//     (no generan audio ni cuestan creditos) y sirven para medir el gasto
//     real antes/despues, igual que ya hace esperarConsumo() en cmdSonda.
//   - Si el costo estimado supera el tope, se aborta ANTES de llamar.
//   - Si la llamada falla o el audio llega vacio/danado, se detiene y no
//     reintenta.

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cargarBloquesTts } from './lib_local/extraerGuion.mjs';
import { cargarCanal, cargarEnv, cargarCalibracion, constantes } from '../../../lib/config.mjs';
import { ElevenLabs, esperarConsumo } from '../../../lib/elevenlabs.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const DIR_PROYECTO = join(AQUI, '..');
const RUTA_GUION = join(DIR_PROYECTO, 'VIDEO_007_GUION_APROBADO.md');
const RUTA_MANIFIESTO = join(AQUI, 'manifiesto.json');
const DIR_AUDIO = join(AQUI, 'audio', 'bloques');

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

/** Misma logica ya demostrada en _preflight/demo_resumption.mjs, sobre datos reales. */
function necesitaGenerar(entrada, { textoBloque, voiceId, modelId, ajustes }) {
  if (!entrada) return { generar: true, motivo: 'sin entrada en el manifiesto para este bloque' };

  const textoHash = sha256(textoBloque);
  const ajustesHash = sha256(JSON.stringify(ajustes));

  if (entrada.texto_sha256 !== textoHash) {
    return { generar: true, motivo: 'el texto del bloque no coincide con el hash guardado' };
  }
  if (entrada.estado === 'pendiente' || entrada.estado === 'error' || !entrada.estado) {
    return { generar: true, motivo: `estado previo del bloque es "${entrada.estado}"` };
  }
  if (entrada.voice_id !== voiceId || entrada.model_id !== modelId) {
    return { generar: true, motivo: 'la voz o el modelo no coinciden con lo ya generado' };
  }
  if (entrada.ajustes_sha256 !== ajustesHash) {
    return { generar: true, motivo: 'los ajustes de voz no coinciden con lo ya generado' };
  }
  const rutaAudio = entrada.archivo_audio ? join(DIR_AUDIO, entrada.archivo_audio) : null;
  if (!rutaAudio || !existsSync(rutaAudio) || statSync(rutaAudio).size === 0) {
    return { generar: true, motivo: 'el audio del bloque no existe en disco o esta vacio' };
  }
  return { generar: false, motivo: 'texto, voz, modelo y ajustes identicos; audio ya presente en disco' };
}

async function main() {
  const argv = process.argv.slice(2);
  const bloqueTts = argv.find((a) => !a.startsWith('--')) || '1';
  const modoDryRun = argv.includes('--dry-run') || !argv.includes('--generar');
  const topeArg = argv.find((a) => a.startsWith('--tope-creditos='));
  const topeCreditos = topeArg ? Number(topeArg.split('=')[1]) : 350;

  console.log(`=== Generacion de bloque TTS "${bloqueTts}" — Video 7 ===`);
  console.log(`Modo: ${modoDryRun ? 'DRY-RUN (local, sin llamar a la API)' : 'GENERAR (llamada real autorizada)'}`);
  console.log(`Tope de creditos para esta ejecucion: ${topeCreditos}\n`);

  // 1) Extraer el bloque directamente del guion aprobado (fuente unica).
  const bloques = cargarBloquesTts(RUTA_GUION);
  const bloque = bloques.find((b) => b.bloqueTts === bloqueTts);
  if (!bloque) throw new Error(`No existe el bloque TTS "${bloqueTts}" en el guion.`);

  const canal = cargarCanal();
  const env = cargarEnv();
  const cal = cargarCalibracion();
  const K = constantes(canal, cal);

  const voiceId = env.ELEVENLABS_VOICE_ID;
  const modelId = canal.voz.modelo;
  const ajustes = canal.voz.ajustes;
  const formatoSalida = canal.api.formato_salida;

  if (!voiceId) throw new Error('Falta ELEVENLABS_VOICE_ID en el entorno.');

  // 2) Cargar manifiesto en vivo y confirmar estado actual del bloque.
  const manifiesto = cargarManifiesto();
  const entrada = entradaDe(manifiesto, bloqueTts);
  console.log(`Estado actual en el manifiesto: "${entrada?.estado ?? '(sin entrada)'}"`);

  // 3) Chequeo de reanudacion (siempre local, nunca llama a la API).
  const chequeo = necesitaGenerar(entrada, { textoBloque: bloque.texto, voiceId, modelId, ajustes });
  console.log(`Chequeo de reanudacion: ${chequeo.generar ? 'GENERAR' : 'SALTAR (ya esta)'} — ${chequeo.motivo}\n`);

  // 4) Caracteres facturables reales = el texto literal que se enviaria a la API.
  const caracteresFacturables = bloque.texto.length;
  const costoEstimado = caracteresFacturables * K.creditosPorCaracter;

  console.log('--- Extraccion del bloque (solo texto narrado) ---');
  console.log(`Parrafos incluidos: p${bloque.parrafoInicio}-p${bloque.parrafoFin}`);
  console.log(`Marcadores excluidos de la narracion: ${JSON.stringify(bloque.marcadores)}`);
  console.log(`Caracteres facturables (texto real a enviar): ${caracteresFacturables}`);
  console.log(`Palabras: ${bloque.palabras}`);
  console.log(`texto_sha256: ${bloque.textoSha256}`);
  console.log(`Coincide con hash del preflight (${entrada?.texto_sha256}): ${bloque.textoSha256 === entrada?.texto_sha256}`);
  console.log(`Tarifa vigente: ${K.creditosPorCaracter} creditos/caracter (calibrado: ${K.calibradoCreditos})`);
  console.log(`Costo estimado: ${costoEstimado.toFixed(2)} creditos\n`);

  if (costoEstimado > topeCreditos) {
    console.log(`ABORTADO: el costo estimado (${costoEstimado.toFixed(2)}) supera el tope autorizado (${topeCreditos}). No se llama a la API.`);
    process.exit(1);
  }
  console.log(`OK: costo estimado dentro del tope autorizado (${topeCreditos} creditos).\n`);

  if (modoDryRun) {
    console.log('Fin del dry-run. No se realizo ninguna llamada a ElevenLabs.');
    return;
  }

  if (!chequeo.generar) {
    console.log('El bloque ya esta generado y el chequeo de reanudacion dice SALTAR. No se llama a la API.');
    return;
  }

  // --- A partir de aqui: la UNICA llamada de generacion autorizada. ---
  mkdirSync(DIR_AUDIO, { recursive: true });
  const el = new ElevenLabs({ apiKey: env.ELEVENLABS_API_KEY, base: canal.api.base, reintentos: canal.api.reintentos });

  let subAntes = null;
  try {
    subAntes = await el.suscripcion();
    console.log(`Creditos usados ANTES (consulta de solo lectura): ${subAntes.usados} / ${subAntes.limite}`);
  } catch (e) {
    console.log(`Aviso: no se pudo consultar la suscripcion antes de generar (${e.message}). Se continua sin ese dato.`);
  }

  console.log(`\nRealizando la UNICA llamada de generacion autorizada para el bloque "${bloqueTts}"...`);
  let resultado;
  const inicioLlamada = Date.now();
  try {
    resultado = await el.vozConTiempos({ voiceId, texto: bloque.texto, modelo: modelId, ajustes, formatoSalida });
  } catch (e) {
    console.log(`\nFALLO la llamada a ElevenLabs: ${e.message}`);
    console.log('Deteniendose. No se reintenta sin autorizacion explicita.');
    process.exit(1);
  }
  const duracionLlamadaMs = Date.now() - inicioLlamada;

  if (!resultado?.audio || resultado.audio.length === 0) {
    console.log('\nFALLO: la respuesta no trajo audio (buffer vacio). Deteniendose sin guardar nada.');
    process.exit(1);
  }
  if (!resultado.alineacion || !Array.isArray(resultado.alineacion.caracteres) || resultado.alineacion.caracteres.length === 0) {
    console.log('\nAVISO: la respuesta no trajo alineacion por caracter valida. El audio si llego; se reporta pero no se descarta.');
  }

  console.log(`Respuesta recibida en ${(duracionLlamadaMs / 1000).toFixed(1)}s. Audio: ${resultado.audio.length} bytes.`);

  // Persistir el audio ORIGINAL sin modificar.
  const nombreArchivo = `${bloqueTts}.mp3`;
  const rutaAudio = join(DIR_AUDIO, nombreArchivo);
  writeFileSync(rutaAudio, resultado.audio);
  console.log(`Audio guardado sin modificar en: ${rutaAudio}`);

  // Medir consumo real esperando a que el contador se estabilice (solo lectura, no genera nada nuevo).
  let creditosRealesConsumidos = null;
  let subDespues = null;
  if (subAntes) {
    console.log('\nEsperando a que el contador de creditos se estabilice (solo consultas de lectura)...');
    const espera = await esperarConsumo(el, subAntes.usados);
    subDespues = espera.sub;
    if (espera.estable) {
      creditosRealesConsumidos = subDespues.usados - subAntes.usados;
      console.log(`Creditos usados DESPUES: ${subDespues.usados} / ${subDespues.limite} (estable tras ${espera.segundos}s)`);
      console.log(`Creditos realmente consumidos por esta llamada: ${creditosRealesConsumidos}`);
    } else {
      console.log(`El contador seguia moviendose tras ${espera.segundos}s; no se toma como definitivo. Ultimo valor visto: ${subDespues?.usados}`);
    }
  }

  // Actualizar el manifiesto -- unidad de persistencia es el BLOQUE, no el parrafo.
  const nuevaEntrada = {
    ...entrada,
    bloque_tts: bloqueTts,
    caracteres: caracteresFacturables,
    texto_sha256: bloque.textoSha256,
    estado: 'generado',
    voice_id: voiceId,
    model_id: modelId,
    ajustes_sha256: sha256(JSON.stringify(ajustes)),
    history_item_id: null, // el endpoint with-timestamps no lo devuelve; no se hizo una llamada extra a /v1/history para no exceder "una sola llamada".
    archivo_audio: nombreArchivo,
    generado_en: new Date().toISOString(),
    creditos_estimados: Number(costoEstimado.toFixed(2)),
    creditos_reales: creditosRealesConsumidos,
    creditos_antes: subAntes?.usados ?? null,
    creditos_despues: subDespues?.usados ?? null,
  };
  const idx = manifiesto.bloques.findIndex((b) => b.bloque_tts === bloqueTts);
  manifiesto.bloques[idx] = nuevaEntrada;
  guardarManifiesto(manifiesto);
  console.log(`\nManifiesto actualizado: ${RUTA_MANIFIESTO}`);

  // Verificacion final: una segunda pasada del chequeo debe decir SALTAR.
  const manifiestoRelido = cargarManifiesto();
  const entradaRelida = entradaDe(manifiestoRelido, bloqueTts);
  const chequeoFinal = necesitaGenerar(entradaRelida, { textoBloque: bloque.texto, voiceId, modelId, ajustes });
  console.log(`\nVerificacion de idempotencia (segunda ejecucion simulada): ${chequeoFinal.generar ? 'GENERAR (FALLO, deberia SALTAR)' : 'SALTAR (correcto)'} — ${chequeoFinal.motivo}`);

  console.log('\n=== Fin. Se genero exactamente un bloque. No hubo musica, visuales ni render. ===');
}

main().catch((e) => {
  console.error('\nError inesperado:', e.message);
  process.exit(1);
});
