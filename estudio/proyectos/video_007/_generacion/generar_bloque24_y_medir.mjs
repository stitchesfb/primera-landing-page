// Cierre de la muestra D (bloque TTS 24) + medicion de creditos del bloque 11
// (pendiente por un 429 anterior), con control estricto de llamadas:
//
//   1 sola consulta de suscripcion ANTES de generar el bloque 24. Esa misma
//     lectura sirve de "despues" para el bloque 11 (diferencia desde 10566)
//     y de "antes" para el bloque 24. Si devuelve 429, se detiene sin
//     generar nada.
//   1 sola llamada de generacion para el bloque 24.
//   como maximo 1 consulta de suscripcion DESPUES de generar. Si falla, el
//     audio se conserva igual y los creditos quedan "pendientes de
//     confirmar" en el manifiesto.
//
// Sin polling, sin reintentos automaticos, sin tocar los bloques 1, 7, 10 u 11.

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
const CREDITOS_ANTES_11 = 10566; // ultimo valor confirmado, registrado en el manifiesto del bloque 11

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
  const canal = cargarCanal();
  const env = cargarEnv();
  const cal = cargarCalibracion();
  const K = constantes(canal, cal);
  const voiceId = env.ELEVENLABS_VOICE_ID;
  const modelId = canal.voz.modelo;
  const ajustes = canal.voz.ajustes;
  const formatoSalida = canal.api.formato_salida;

  let manifiesto = cargarManifiesto();

  // Confirmar en seco que el bloque 24 sigue pendiente (sin llamar a nada).
  const chequeoInicial = necesitaGenerar(entradaDe(manifiesto, ID), { textoBloque: bloque24.texto, voiceId, modelId, ajustes });
  console.log(`Bloque 24 — estado en manifiesto: "${entradaDe(manifiesto, ID)?.estado}". Chequeo: ${chequeoInicial.generar ? 'GENERAR' : 'SALTAR'} — ${chequeoInicial.motivo}`);
  if (!chequeoInicial.generar) {
    console.log('El bloque 24 ya esta generado. No se hace ninguna llamada.');
    return;
  }

  // --- Unica consulta previa: sirve de "despues" del bloque 11 y "antes" del bloque 24. ---
  console.log('\nRealizando la UNICA consulta de creditos previa (sirve de cierre del bloque 11 y apertura del bloque 24)...');
  let sub;
  try {
    sub = await suscripcionCruda({ base: canal.api.base, apiKey: env.ELEVENLABS_API_KEY });
  } catch (e) {
    console.log(`\nLa consulta de creditos devolvio error (${e.message}).`);
    if (e.estado === 429) {
      console.log('429 Too Many Requests: por instruccion explicita, me detengo sin generar el bloque 24 y sin reintentar la consulta.');
    } else {
      console.log('Error no-429 en la consulta: me detengo igualmente, sin generar el bloque 24.');
    }
    process.exit(1);
  }
  console.log(`Creditos usados (lectura unica): ${sub.usados} / ${sub.limite}`);

  const creditosReales11 = sub.usados - CREDITOS_ANTES_11;
  console.log(`Creditos reales del bloque 11 (por diferencia desde ${CREDITOS_ANTES_11}): ${creditosReales11}`);

  // Registrar el credito real del bloque 11 ahora que se pudo medir.
  const idx11 = manifiesto.bloques.findIndex((b) => b.bloque_tts === '11');
  manifiesto.bloques[idx11] = {
    ...manifiesto.bloques[idx11],
    creditos_reales: creditosReales11,
    creditos_despues: sub.usados,
    nota_creditos: `Medido en una lectura posterior compartida con la apertura del bloque 24 (${new Date().toISOString()}). El 429 anterior no se reintento; esta fue la siguiente consulta de creditos hecha, sin polling adicional.`,
  };
  guardarManifiesto(manifiesto);
  console.log('Manifiesto del bloque 11 actualizado con creditos reales.');

  // --- Confirmar costo total proyectado antes de generar. ---
  const costoEstimado24 = bloque24.caracteres * K.creditosPorCaracter;
  const totalConocido = 256 /* bloque 7 */ + 372 /* bloque 10 */ + creditosReales11 /* bloque 11 */;
  const proyeccionTotal = totalConocido + costoEstimado24;
  console.log(`\nCosto real conocido hasta ahora (7+10+11): ${totalConocido}`);
  console.log(`Costo estimado del bloque 24: ${costoEstimado24.toFixed(2)}`);
  console.log(`Proyeccion total B+C+D: ${proyeccionTotal.toFixed(2)} (tope ${TOPE})`);
  if (proyeccionTotal > TOPE) {
    console.log('ABORTADO: la proyeccion total supera el tope. No se genera el bloque 24.');
    process.exit(1);
  }
  console.log('OK: proyeccion dentro del tope. Procediendo a generar el bloque 24.');

  // Re-confirmar que sigue pendiente (no cambio nada desde el chequeo inicial, pero se re-verifica por disciplina).
  const chequeoFinal = necesitaGenerar(entradaDe(cargarManifiesto(), ID), { textoBloque: bloque24.texto, voiceId, modelId, ajustes });
  if (!chequeoFinal.generar) {
    console.log('El bloque 24 aparece generado justo antes de llamar (cambio inesperado). No se genera de nuevo.');
    return;
  }

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
  console.log(`Alineacion guardada (alignment presente: ${!!resultado.alignment}, normalized_alignment presente: ${!!resultado.normalized_alignment})`);

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
    creditos_estimados: Number(costoEstimado24.toFixed(2)),
    creditos_reales: null,
    creditos_antes: sub.usados,
    creditos_despues: null,
  };
  guardarManifiesto(manifiesto);
  console.log('Manifiesto del bloque 24 actualizado (creditos_reales pendiente de confirmar).');

  // --- Como maximo UNA consulta adicional, para cerrar el credito real del bloque 24. ---
  console.log('\nRealizando, como maximo, UNA consulta adicional de creditos para cerrar el bloque 24...');
  try {
    const subDespues = await suscripcionCruda({ base: canal.api.base, apiKey: env.ELEVENLABS_API_KEY });
    const creditosReales24 = subDespues.usados - sub.usados;
    manifiesto = cargarManifiesto();
    const idx24b = manifiesto.bloques.findIndex((b) => b.bloque_tts === ID);
    manifiesto.bloques[idx24b].creditos_reales = creditosReales24;
    manifiesto.bloques[idx24b].creditos_despues = subDespues.usados;
    guardarManifiesto(manifiesto);
    console.log(`Creditos usados DESPUES: ${subDespues.usados}. Creditos reales del bloque 24: ${creditosReales24}`);
  } catch (e) {
    console.log(`La consulta adicional fallo (${e.message}). El audio se conserva; creditos_reales del bloque 24 queda null (pendiente de confirmar). No se reintenta.`);
  }

  // Verificacion de idempotencia.
  const chequeoPost = necesitaGenerar(entradaDe(cargarManifiesto(), ID), { textoBloque: bloque24.texto, voiceId, modelId, ajustes });
  console.log(`\nVerificacion de idempotencia (bloque 24): ${chequeoPost.generar ? 'GENERAR (FALLO)' : 'SALTAR (correcto)'} — ${chequeoPost.motivo}`);

  console.log('\n=== Fin. Solo se genero el bloque 24. No se tocaron los bloques 1, 7, 10 u 11. ===');
}

main().catch((e) => {
  console.error('\nError inesperado:', e.message);
  process.exit(1);
});
