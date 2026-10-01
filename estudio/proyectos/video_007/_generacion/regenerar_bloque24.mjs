// Regeneracion del bloque TTS 24 tras rechazo por error de pronunciacion
// (version 1 archivada en revisiones_rechazadas/). Mismo texto (sin
// cambios, fuente ya correcta), misma voz/modelo/ajustes/formato.
//
// Sin lectura previa de creditos (instruccion explicita: "no hagas
// polling de creditos"). Una unica llamada de generacion. Como maximo
// UNA consulta posterior; si falla o la lectura es anomala, se deja el
// costo como pendiente/no confiable, sin reintentar.

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
// Ultimo contador de creditos confirmado por lectura real (cierre de la version 1 del bloque 24).
const CREDITOS_ANTES_REF = 14075;

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

  const manifiesto = cargarManifiesto();
  const chequeo = necesitaGenerar(entradaDe(manifiesto, ID), { textoBloque: bloque24.texto, voiceId, modelId, ajustes });
  console.log(`Bloque 24 — estado: "${entradaDe(manifiesto, ID)?.estado}". Chequeo: ${chequeo.generar ? 'GENERAR' : 'SALTAR'} — ${chequeo.motivo}`);
  if (!chequeo.generar) { console.log('Ya generado y valido. No se llama a nada.'); return; }

  const estimado = bloque24.caracteres * K.creditosPorCaracter;
  console.log(`Texto sin cambios (fuente ya correcta): ${bloque24.caracteres} car, ${bloque24.palabras} pal. Costo estimado: ${estimado.toFixed(2)} creditos.`);

  mkdirSync(DIR_AUDIO, { recursive: true });
  console.log('\nRealizando la UNICA llamada de generacion (regeneracion) para el bloque 24...');
  let resultado;
  try {
    resultado = await llamarTtsConAlineacionCruda({
      base: canal.api.base, apiKey: env.ELEVENLABS_API_KEY, voiceId, texto: bloque24.texto, modelo: modelId, ajustes, formatoSalida,
    });
  } catch (e) {
    console.log(`\nFALLO la llamada de generacion: ${e.message}`);
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

  const m2 = cargarManifiesto();
  const idx = m2.bloques.findIndex((b) => b.bloque_tts === ID);
  m2.bloques[idx] = {
    ...m2.bloques[idx],
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
    creditos_estimados: Number(estimado.toFixed(2)),
    creditos_reales: null,
    creditos_antes: CREDITOS_ANTES_REF,
    creditos_despues: null,
    nota_creditos: 'Version 2 (regenerada tras rechazo de la version 1 por error de pronunciacion). Sin lectura previa (instruccion explicita de no hacer polling); "antes" reutiliza el ultimo contador real confirmado.',
  };
  guardarManifiesto(m2);
  console.log('Manifiesto actualizado (version 2, generado; creditos_reales pendiente de la consulta posterior).');

  console.log('\nRealizando, como maximo, UNA consulta posterior de creditos...');
  try {
    const sub = await suscripcionCruda({ base: canal.api.base, apiKey: env.ELEVENLABS_API_KEY });
    const creditosReales = sub.usados - CREDITOS_ANTES_REF;
    const esperado = estimado;
    const anomalo = Math.abs(creditosReales - esperado) > esperado * 1.5; // desviacion grande respecto al estimado calibrado
    const m3 = cargarManifiesto();
    const idx3 = m3.bloques.findIndex((b) => b.bloque_tts === ID);
    if (anomalo) {
      m3.bloques[idx3].creditos_reales = null;
      m3.bloques[idx3].creditos_despues = sub.usados;
      m3.bloques[idx3].nota_creditos += ` Lectura posterior: ${sub.usados} (diferencia ${creditosReales}), muy alejada del estimado (${esperado.toFixed(2)}) — tratada como no confiable, mismo patron que las mediciones anteriores. Valor bruto conservado solo como referencia.`;
      console.log(`Creditos usados DESPUES: ${sub.usados}. Diferencia ${creditosReales} — ANOMALA frente al estimado (${esperado.toFixed(2)}). Se registra como no confiable (null).`);
    } else {
      m3.bloques[idx3].creditos_reales = creditosReales;
      m3.bloques[idx3].creditos_despues = sub.usados;
      console.log(`Creditos usados DESPUES: ${sub.usados}. Creditos reales: ${creditosReales} (consistente con el estimado).`);
    }
    guardarManifiesto(m3);
  } catch (e) {
    console.log(`La consulta posterior fallo (${e.message}). El audio se conserva; creditos_reales queda null (pendiente). No se reintenta.`);
  }

  const chequeoPost = necesitaGenerar(entradaDe(cargarManifiesto(), ID), { textoBloque: bloque24.texto, voiceId, modelId, ajustes });
  console.log(`\nVerificacion de idempotencia: ${chequeoPost.generar ? 'GENERAR (FALLO)' : 'SALTAR (correcto)'} — ${chequeoPost.motivo}`);
  console.log('\n=== Fin. Solo se regenero el bloque 24. ===');
}

main().catch((e) => { console.error('\nError inesperado:', e.message); process.exit(1); });
