#!/usr/bin/env node
/**
 * Generador de audio — Finanzas, video 1 (patrimonio neto).
 *
 * Canal de FINANZAS: usa ELEVENLABS_API_KEY pero NO ELEVENLABS_VOICE_ID
 * (esa variable pertenece al canal de oraciones). El voice_id de esta voz
 * va fijo en CONFIG, abajo.
 *
 * Endpoint estandar (no streaming, sin timestamps), una peticion por bloque:
 *   POST /v1/text-to-speech/{voice_id}
 *
 * Uso:
 *   node generar_audio.mjs            # genera los dos bloques
 *   node generar_audio.mjs --bloque 1 # genera solo un bloque
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  voz: 'Carlos Aguilar - Resonate and Powerful',
  voiceId: '8MeTTgXVwMEhRVfblXOj',
  modelId: 'eleven_flash_v2_5',
  languageCode: 'es',
  outputFormat: 'mp3_44100_128',
  ajustes: {
    speed: 1.05,
    stability: 0.40,
    similarity_boost: 0.80,
    style: 0,
    use_speaker_boost: true,
  },
  seed: 1847,
};

const BLOQUES = [
  {
    n: 1,
    entrada: join(AQUI, 'guiones', 'bloque_1.txt'),
    salida: join(AQUI, 'out', 'finanzas_video_01_bloque_01.mp3'),
  },
  {
    n: 2,
    entrada: join(AQUI, 'guiones', 'bloque_2.txt'),
    salida: join(AQUI, 'out', 'finanzas_video_01_bloque_02.mp3'),
  },
];

function cargarTexto(ruta) {
  // Solo se recortan espacios externos; el guion no se toca por dentro.
  return readFileSync(ruta, 'utf-8').trim();
}

async function generarBloque(el, bloque, { previousText, nextText } = {}) {
  const texto = cargarTexto(bloque.entrada);

  const cuerpo = {
    text: texto,
    model_id: CONFIG.modelId,
    language_code: CONFIG.languageCode,
    voice_settings: CONFIG.ajustes,
    seed: CONFIG.seed,
  };
  if (previousText) cuerpo.previous_text = previousText;
  if (nextText) cuerpo.next_text = nextText;

  const url =
    `https://api.elevenlabs.io/v1/text-to-speech/${CONFIG.voiceId}` +
    `?output_format=${encodeURIComponent(CONFIG.outputFormat)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': el.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cuerpo),
  });

  if (!res.ok) {
    const cuerpoError = await res.text().catch(() => '');
    throw new Error(`Bloque ${bloque.n}: ${res.status} ${res.statusText}\n${cuerpoError}`);
  }

  const audio = Buffer.from(await res.arrayBuffer());
  writeFileSync(bloque.salida, audio);
  return { bloque: bloque.n, bytes: audio.length, salida: bloque.salida };
}

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('Falta ELEVENLABS_API_KEY en el entorno.');

  const soloBloque = (() => {
    const i = process.argv.indexOf('--bloque');
    return i === -1 ? null : Number(process.argv[i + 1]);
  })();

  const texto1 = cargarTexto(BLOQUES[0].entrada);
  const texto2 = cargarTexto(BLOQUES[1].entrada);

  const el = { apiKey };
  const resultados = [];

  for (const bloque of BLOQUES) {
    if (soloBloque && bloque.n !== soloBloque) continue;

    // Contexto cruzado: bloque 1 recibe next_text del bloque 2;
    // bloque 2 recibe previous_text del bloque 1. El contexto no se narra.
    const contexto =
      bloque.n === 1 ? { nextText: texto2 } : { previousText: texto1 };

    const r = await generarBloque(el, bloque, contexto);
    resultados.push(r);
    console.log(`Bloque ${r.bloque} -> ${r.salida} (${r.bytes} bytes)`);
  }

  return resultados;
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
