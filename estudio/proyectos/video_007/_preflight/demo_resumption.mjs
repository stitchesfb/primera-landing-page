// Version CORREGIDA: la unidad de persistencia y reanudacion es el BLOQUE
// TTS (varios parrafos concatenados), no el parrafo suelto. Los parrafos
// solo viven como metadato subordinado dentro de cada entrada de bloque,
// para poder reconstruir donde cae cada Short y cada pausa dentro del
// bloque ya generado -- pero nunca se piden a la API uno por uno.
//
// Sin llamar a ElevenLabs. Datos sinteticos.

import { createHash } from 'node:crypto';
import { existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

function necesitaGenerar(entradaManifiesto, { textoBloque, voiceId, modelId, ajustes, dirAudio }) {
  if (!entradaManifiesto) return { generar: true, motivo: 'sin entrada previa en el manifiesto para este bloque' };

  const textoHash = sha256(textoBloque);
  const ajustesHash = sha256(JSON.stringify(ajustes));

  if (entradaManifiesto.texto_sha256 !== textoHash) {
    return { generar: true, motivo: 'el texto del BLOQUE cambio (algun parrafo interno se edito)' };
  }
  if (entradaManifiesto.voice_id !== voiceId || entradaManifiesto.model_id !== modelId) {
    return { generar: true, motivo: 'la voz o el modelo cambiaron' };
  }
  if (entradaManifiesto.ajustes_sha256 !== ajustesHash) {
    return { generar: true, motivo: 'los ajustes de voz cambiaron' };
  }
  if (entradaManifiesto.estado === 'pendiente' || entradaManifiesto.estado === 'error') {
    return { generar: true, motivo: `estado previo del bloque es "${entradaManifiesto.estado}"` };
  }
  const rutaAudio = join(dirAudio, entradaManifiesto.archivo_audio || '');
  if (!existsSync(rutaAudio) || statSync(rutaAudio).size === 0) {
    return { generar: true, motivo: 'el audio del bloque no existe en disco o esta vacio' };
  }
  return { generar: false, motivo: 'texto del bloque, voz, modelo y ajustes identicos; audio del bloque ya presente' };
}

// --- demostracion con 4 bloques TTS sinteticos (simulan el caso real: uno
//     intacto, uno cuyo texto interno cambio, uno nunca generado, uno cuyo
//     audio se perdio) ---

const dirDemo = '/tmp/claude-0/-home-user-primera-landing-page/185143c2-ce29-5ac0-9161-728285d92b8c/scratchpad/video_007/demo_manifiesto_bloque';
mkdirSync(join(dirDemo, 'bloques'), { recursive: true });

const VOICE_ID = 'voz-demo-no-real';
const MODEL_ID = 'eleven_flash_v2_5';
const AJUSTES = { speed: 0.91, stability: 0.65, similarity_boost: 0.88, style: 0.0, use_speaker_boost: true };

// Cada "bloque" simulado ya es la concatenacion de varios parrafos, como
// seria un bloque TTS real (aqui abreviado para la demo).
const bloquesDemo = [
  { bloque_tts: '1', texto: 'Parrafo A del bloque 1.\n\nParrafo B del bloque 1.\n\nParrafo C del bloque 1.' },
  { bloque_tts: '2', texto: 'Parrafo A del bloque 2.\n\nParrafo B del bloque 2 (version editada despues de generar).' },
  { bloque_tts: '3', texto: 'Parrafo A del bloque 3.\n\nParrafo B del bloque 3.' },
  { bloque_tts: '23-24', texto: 'Parrafo A del bloque 23-24.\n\nParrafo B del bloque 23-24.' },
];

const manifiestoPrevio = {
  '1': {
    bloque_tts: '1',
    texto_sha256: sha256(bloquesDemo[0].texto),
    voice_id: VOICE_ID, model_id: MODEL_ID, ajustes_sha256: sha256(JSON.stringify(AJUSTES)),
    estado: 'generado', archivo_audio: '01.mp3', history_item_id: 'hist_demo_b1',
  },
  '2': {
    bloque_tts: '2',
    // hash de una version ANTERIOR del texto (antes de que se editara el parrafo B)
    texto_sha256: sha256('Parrafo A del bloque 2.\n\nParrafo B del bloque 2 (version original).'),
    voice_id: VOICE_ID, model_id: MODEL_ID, ajustes_sha256: sha256(JSON.stringify(AJUSTES)),
    estado: 'generado', archivo_audio: '02.mp3', history_item_id: 'hist_demo_b2',
  },
  '23-24': {
    bloque_tts: '23-24',
    texto_sha256: sha256(bloquesDemo[3].texto),
    voice_id: VOICE_ID, model_id: MODEL_ID, ajustes_sha256: sha256(JSON.stringify(AJUSTES)),
    estado: 'generado', archivo_audio: '23-24.mp3', history_item_id: 'hist_demo_b23_24',
  },
  // bloque '3': sin entrada -> nunca se genero
};

// Simular que el audio del bloque 1 y 2 SI existen en disco; el de 23-24 se perdio.
writeFileSync(join(dirDemo, 'bloques', '01.mp3'), Buffer.from('audio-simulado-bloque-1'));
writeFileSync(join(dirDemo, 'bloques', '02.mp3'), Buffer.from('audio-simulado-bloque-2'));
// 23-24.mp3 deliberadamente NO se escribe.

console.log('=== Demostracion de reanudacion POR BLOQUE TTS (sin llamar a ElevenLabs) ===\n');
for (const b of bloquesDemo) {
  const entrada = manifiestoPrevio[b.bloque_tts];
  const r = necesitaGenerar(entrada, {
    textoBloque: b.texto, voiceId: VOICE_ID, modelId: MODEL_ID, ajustes: AJUSTES,
    dirAudio: join(dirDemo, 'bloques'),
  });
  console.log(`bloque TTS ${b.bloque_tts.padEnd(6)}: ${r.generar ? 'GENERAR' : 'SALTAR (ya esta)'}  -- ${r.motivo}`);
}

console.log('\nResultado esperado:');
console.log('  bloque 1     : SALTAR  (texto, voz, modelo y ajustes identicos; audio presente)');
console.log('  bloque 2     : GENERAR (el texto del bloque cambio -- un parrafo interno se edito)');
console.log('  bloque 3     : GENERAR (sin entrada previa)');
console.log('  bloque 23-24 : GENERAR (el audio del bloque no existe en disco)');
console.log('\nNota: un solo parrafo editado dentro de un bloque de varios parrafos regenera');
console.log('TODO el bloque (no ese parrafo suelto), porque la unidad de persistencia es el bloque.');
