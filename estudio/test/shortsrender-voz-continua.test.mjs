/**
 * construirVoz() tenia un bug de diseño, no de codigo roto: cortaba parrafo
 * a parrafo y rellenaba CADA hueco entre parrafos con anullsrc (silencio
 * digital, -91 dB), aunque la pausa real del video largo tuviera ambiencia
 * o respiracion de verdad (medido en video_005: -32.6 dB). El resultado
 * sonaba a cinta detenida y vuelta a arrancar en cada union de parrafo.
 *
 * La correccion: agrupar en PIEZAS CONTINUAS. Un rango sin pausas insertadas
 * ni interludios acortados es una sola extraccion del audio fuente, con todo
 * su contenido real por dentro (incluidas las pausas). Solo se abre un corte
 * de verdad — y ahi si se rellena con silencio — donde hay una
 * discontinuidad real: pausa insertada, interludio acortado, o cierre.
 *
 * Esta prueba construye una fuente sintetica con tono en las voces y RUIDO
 * DE VERDAD (no silencio) en las pausas, y comprueba: que un rango continuo
 * sale como una unica pieza de audio (no una por parrafo), que el ruido de
 * las pausas internas sobrevive en la salida, y que el Short multi-tramo
 * sigue usando silencio de verdad solo en su empalme especial, con el
 * microfundido en los bordes correctos y en ningun otro sitio.
 */
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { construirVoz } from '../lib/shortsRender.mjs';
import { ejecutar, rutaFfmpeg, duracionSegundos } from '../lib/audio.mjs';

const TMP = mkdtempSync(join(tmpdir(), 'voz-continua-'));
let fallos = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'ok   ' : 'FALLO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };
const cerca = (a, b, e = 0.05) => Math.abs(a - b) < e;

const ffmpeg = await rutaFfmpeg();

// Fuente sintetica de 30s: tono en [0,10) y [12,30) (las "voces"), y ruido
// de verdad (no silencio) en [10,12) (la "pausa"), mezclado con el mismo
// tono a volumen bajo para simular ambiencia real de grabacion.
const fuente = join(TMP, 'fuente.wav');
await ejecutar(ffmpeg, [
  '-y', '-loglevel', 'error',
  '-f', 'lavfi', '-i', 'sine=frequency=440:r=44100',
  '-f', 'lavfi', '-i', 'anoisesrc=color=pink:r=44100:a=0.05',
  '-filter_complex',
    "[0:a]atrim=0:10,asetpts=PTS-STARTPTS[v1];" +
    "[1:a]atrim=0:2,asetpts=PTS-STARTPTS[pausa];" +
    "[0:a]atrim=0:18,asetpts=PTS-STARTPTS[v2];" +
    "[v1][pausa][v2]concat=n=3:v=0:a=1[fuera]",
  '-map', '[fuera]', '-t', '30', '-ac', '2', '-c:a', 'pcm_s16le', fuente,
]);

// --- 1. un rango continuo es UNA sola pieza, no una por parrafo -----------
// 3 "parrafos" de voz con pausas normales (sin acortar, sin insertar) entre
// ellos: en el audio fuente son continuos de punta a punta.
const planSimple = {
  duracion: 26.0, // 0.5 + 8.5 + 1 + 2 + 1 + 8 + 0.5 + 4.5
  tramos: [
    { tipo: 'entrada', origen: 0, duracionOrigen: 0.5, duracionDestino: 0.5, destino: 0 },
    { tipo: 'voz', parrafo: 1, origen: 0.5, duracionOrigen: 8.5, duracionDestino: 8.5, destino: 0.5 },
    { tipo: 'silencio', trasParrafo: 1, origen: 9, duracionOrigen: 1, duracionDestino: 1, esInterludio: false, destino: 9 },
    { tipo: 'voz', parrafo: 2, origen: 10, duracionOrigen: 2, duracionDestino: 2, destino: 10 },
    { tipo: 'silencio', trasParrafo: 2, origen: 12, duracionOrigen: 1, duracionDestino: 1, esInterludio: false, destino: 12 },
    { tipo: 'voz', parrafo: 3, origen: 13, duracionOrigen: 8, duracionDestino: 8, destino: 13 },
    { tipo: 'salida', origen: 21, duracionOrigen: 0.5, duracionDestino: 0.5, destino: 21 },
    { tipo: 'cta', origen: 21.5, duracionOrigen: 4.5, duracionDestino: 4.5, destino: 21.5 },
  ],
};

const tmpSimple = join(TMP, 'simple');
const salidaSimple = join(TMP, 'simple.wav');
const rSimple = await construirVoz({ audio: fuente, plan: planSimple, salidaWav: salidaSimple, tmp: tmpSimple });

// Bloques de verdad extraidos: los b*.wav que no son fundido ni el completo.
const bloquesEnDisco = readdirSync(tmpSimple).filter((f) => /^b\d+\.wav$/.test(f));
check('un rango continuo (3 parrafos + 2 pausas normales) sale como UNA sola pieza de audio, no 3 por parrafo',
  bloquesEnDisco.length === 2, `${bloquesEnDisco.length} bloques en disco: ${bloquesEnDisco.join(', ')}`);
check('la duracion de la voz cuadra con el plan', cerca(rSimple.duracion, planSimple.duracion, 0.1),
  `${rSimple.duracion.toFixed(2)}s`);

// El ruido de la pausa real [9,11) del video largo cae en [9,11) del Short
// (nada se acorto): tiene que seguir sonando, NO ser silencio digital.
async function nivelEn(ruta, desde, duracion) {
  const salida = await new Promise((resolve) => {
    const p = spawn(ffmpeg, ['-ss', String(desde), '-t', String(duracion), '-i', ruta, '-af', 'volumedetect', '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', () => resolve(err));
  });
  const m = salida.match(/mean_volume:\s*(-?[\d.]+)/);
  return m ? Number(m[1]) : null;
}
const nivelPausa = await nivelEn(salidaSimple, 9.3, 1.2);
check('la pausa interna (real, sin acortar) suena con ambiencia de verdad, no silencio digital',
  nivelPausa !== null && nivelPausa > -60, `${nivelPausa} dB (silencio digital seria ≈ -91 dB)`);

// --- 2. Short multi-tramo: silencio de verdad SOLO en el empalme especial -
const planMulti = {
  duracion: 21.35, // 0.5 + 8.5 + 1 + 2 + 0.85 + 8 + 0.5
  tramos: [
    { tipo: 'entrada', origen: 0, duracionOrigen: 0.5, duracionDestino: 0.5, destino: 0 },
    { tipo: 'voz', parrafo: 1, origen: 0.5, duracionOrigen: 8.5, duracionDestino: 8.5, destino: 0.5 },
    { tipo: 'silencio', trasParrafo: 1, origen: 9, duracionOrigen: 1, duracionDestino: 1, esInterludio: false, destino: 9 },
    { tipo: 'voz', parrafo: 2, origen: 10, duracionOrigen: 2, duracionDestino: 2, destino: 10 },
    // pausa insertada a proposito: 850ms, sin origen real en la fuente.
    { tipo: 'silencio', trasParrafo: null, origen: 12, duracionOrigen: 0, duracionDestino: 0.85, insertado: true, esInterludio: false, destino: 12 },
    { tipo: 'voz', parrafo: 3, origen: 13, duracionOrigen: 8, duracionDestino: 8, destino: 12.85 },
    { tipo: 'salida', origen: 21, duracionOrigen: 0.5, duracionDestino: 0.5, destino: 20.85 },
  ],
};
const tmpMulti = join(TMP, 'multi');
const salidaMulti = join(TMP, 'multi.wav');
const rMulti = await construirVoz({ audio: fuente, plan: planMulti, salidaWav: salidaMulti, tmp: tmpMulti });

const bloquesMulti = readdirSync(tmpMulti).filter((f) => /^b\d+(-fundido)?\.wav$/.test(f));
const soloBloques = readdirSync(tmpMulti).filter((f) => /^b\d+\.wav$/.test(f));
check('el Short multi-tramo produce exactamente 2 piezas de audio + 1 silencio insertado (3 bloques)',
  soloBloques.length === 3, `${soloBloques.length}: ${soloBloques.join(', ')}`);
check('se generaron microfundidos (los bordes que tocan la pausa insertada)',
  bloquesMulti.some((f) => f.includes('fundido')), bloquesMulti.join(', '));
check('duracion total del Short multi-tramo cuadra (incluye la pausa de 850ms)',
  cerca(rMulti.duracion, planMulti.duracion, 0.1), `${rMulti.duracion.toFixed(2)}s`);

// El silencio insertado (850ms en destino 12) tiene que ser silencio real.
const nivelInsertado = await nivelEn(salidaMulti, 12.1, 0.6);
check('la pausa INSERTADA (el empalme especial) si es silencio real, a proposito',
  nivelInsertado !== null && nivelInsertado < -60, `${nivelInsertado} dB`);

// Y la pausa NORMAL entre parrafo 1 y 2 (sin acortar, sin insertar) sigue
// sonando con ambiencia real, igual que en el caso simple.
const nivelPausaNormalMulti = await nivelEn(salidaMulti, 9.3, 1.2);
check('la pausa normal interna del Short multi-tramo tambien conserva su ambiencia real',
  nivelPausaNormalMulti !== null && nivelPausaNormalMulti > -60, `${nivelPausaNormalMulti} dB`);

console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
rmSync(TMP, { recursive: true, force: true });
process.exit(fallos ? 1 : 0);
