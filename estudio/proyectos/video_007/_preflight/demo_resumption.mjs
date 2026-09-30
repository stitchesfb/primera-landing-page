// Demostracion del metodo de persistencia y reanudacion propuesto para
// Video 7, SIN llamar a ElevenLabs. Usa datos sinteticos (hashes falsos,
// "audio" simulado como un archivo vacio) para probar que la logica de
// saltar bloques ya generados funciona antes de tocar la API real.
//
// Diseno:
//   - manifiesto_bloques.json vive junto al proyecto y se reescribe
//     DESPUES DE CADA parrafo (no al final), asi que un corte a mitad de
//     camino solo pierde, como mucho, el parrafo que estaba en vuelo.
//   - Cada entrada guarda: numero, bloque, texto_sha256, caracteres,
//     voice_id, model_id, ajustes (hash de los ajustes), estado,
//     history_item_id, archivo_audio, generado_en.
//   - Antes de pedir audio a la API se recalcula el hash del texto y de
//     los ajustes; si coincide con lo ya persistido, el estado es
//     "generado" o "aprobado", Y el archivo de audio existe con tamano >0,
//     se salta esa llamada. Cualquier diferencia (texto editado, voz
//     distinta, ajustes distintos) fuerza a regenerar solo ESE parrafo.

import { createHash } from 'node:crypto';
import { existsSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

function necesitaGenerar(entradaManifiesto, { texto, voiceId, modelId, ajustes, dirAudio }) {
  if (!entradaManifiesto) return { generar: true, motivo: 'sin entrada previa en el manifiesto' };

  const textoHash = sha256(texto);
  const ajustesHash = sha256(JSON.stringify(ajustes));

  if (entradaManifiesto.texto_sha256 !== textoHash) {
    return { generar: true, motivo: 'el texto del parrafo cambio desde la ultima generacion' };
  }
  if (entradaManifiesto.voice_id !== voiceId || entradaManifiesto.model_id !== modelId) {
    return { generar: true, motivo: 'la voz o el modelo cambiaron' };
  }
  if (entradaManifiesto.ajustes_sha256 !== ajustesHash) {
    return { generar: true, motivo: 'los ajustes de voz cambiaron' };
  }
  if (entradaManifiesto.estado === 'pendiente' || entradaManifiesto.estado === 'error') {
    return { generar: true, motivo: `estado previo es "${entradaManifiesto.estado}"` };
  }
  const rutaAudio = join(dirAudio, entradaManifiesto.archivo_audio || '');
  if (!existsSync(rutaAudio) || statSync(rutaAudio).size === 0) {
    return { generar: true, motivo: 'el audio persistido no existe o esta vacio' };
  }
  return { generar: false, motivo: 'texto, voz, modelo y ajustes identicos; audio ya presente' };
}

// --- demostracion con datos sinteticos --------------------------------

const dirDemo = '/tmp/claude-0/-home-user-primera-landing-page/185143c2-ce29-5ac0-9161-728285d92b8c/scratchpad/video_007/demo_manifiesto';
import { mkdirSync } from 'node:fs';
mkdirSync(dirDemo, { recursive: true });
mkdirSync(join(dirDemo, 'parrafos'), { recursive: true });

const VOICE_ID = 'voz-demo-no-real';
const MODEL_ID = 'eleven_flash_v2_5';
const AJUSTES = { speed: 0.91, stability: 0.65, similarity_boost: 0.88, style: 0.0, use_speaker_boost: true };

const parrafosDemo = [
  { numero: 1, texto: 'Primer parrafo de prueba, ya generado antes.' },
  { numero: 2, texto: 'Segundo parrafo de prueba, su texto cambio despues de generarlo.' },
  { numero: 3, texto: 'Tercer parrafo de prueba, nunca se genero.' },
  { numero: 4, texto: 'Cuarto parrafo, generado pero su archivo de audio se perdio.' },
];

// Manifiesto previo simulado (como si Video 7 se hubiera interrumpido a mitad de camino):
const manifiestoPrevio = {
  1: {
    numero: 1, bloque: 1,
    texto_sha256: sha256(parrafosDemo[0].texto),
    voice_id: VOICE_ID, model_id: MODEL_ID,
    ajustes_sha256: sha256(JSON.stringify(AJUSTES)),
    estado: 'generado', archivo_audio: '001.mp3', history_item_id: 'hist_demo_001',
  },
  2: {
    numero: 2, bloque: 1,
    // hash de una version ANTERIOR del texto del parrafo 2 (simula una edicion posterior del guion)
    texto_sha256: sha256('Segundo parrafo de prueba, version anterior.'),
    voice_id: VOICE_ID, model_id: MODEL_ID,
    ajustes_sha256: sha256(JSON.stringify(AJUSTES)),
    estado: 'generado', archivo_audio: '002.mp3', history_item_id: 'hist_demo_002',
  },
  4: {
    numero: 4, bloque: 2,
    texto_sha256: sha256(parrafosDemo[3].texto),
    voice_id: VOICE_ID, model_id: MODEL_ID,
    ajustes_sha256: sha256(JSON.stringify(AJUSTES)),
    estado: 'generado', archivo_audio: '004.mp3', history_item_id: 'hist_demo_004',
  },
};

// Simular que el audio del parrafo 1 SI existe en disco (generacion previa exitosa),
// pero el del parrafo 4 NO (se perdio o nunca se escribio del todo).
writeFileSync(join(dirDemo, 'parrafos', '001.mp3'), Buffer.from('audio-simulado-no-real'));
// 002.mp3 y 004.mp3 deliberadamente NO se escriben, para probar los otros motivos de regeneracion.

console.log('=== Demostracion de la logica de reanudacion (sin llamar a ElevenLabs) ===\n');
for (const p of parrafosDemo) {
  const entrada = manifiestoPrevio[p.numero];
  const r = necesitaGenerar(entrada, {
    texto: p.texto, voiceId: VOICE_ID, modelId: MODEL_ID, ajustes: AJUSTES,
    dirAudio: join(dirDemo, 'parrafos'),
  });
  console.log(`parrafo ${p.numero}: ${r.generar ? 'GENERAR' : 'SALTAR (ya esta)'}  -- ${r.motivo}`);
}

console.log('\nResultado esperado:');
console.log('  parrafo 1: SALTAR (texto, voz, modelo y ajustes identicos; audio presente)');
console.log('  parrafo 2: GENERAR (el texto del parrafo cambio desde la ultima generacion)');
console.log('  parrafo 3: GENERAR (sin entrada previa en el manifiesto)');
console.log('  parrafo 4: GENERAR (el audio persistido no existe o esta vacio)');
