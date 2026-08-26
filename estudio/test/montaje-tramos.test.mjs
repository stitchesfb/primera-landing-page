/**
 * Regresion del bug real de video_005: un hueco con fadeOutMs/fadeInMs entre
 * dos tramos del MISMO bloque dejaba el segundo tramo entero en silencio.
 *
 * Causa: montarTramos aplicaba -ss/-to (opciones de SALIDA, van detras de
 * -i) y -af en el mismo comando de ffmpeg. Con opciones de salida el PTS del
 * recorte sigue arrancando donde arrancaba en el archivo entero (no en 0), y
 * "st" de afade se mide contra ese PTS. Hacia falta la combinacion exacta: un
 * tramo que EL MISMO arranca lejos del principio del bloque (aqui, a los
 * ~150s) y que ADEMAS lleva un fundido de SALIDA cerca de su propio final —
 * ahi "st" (pensado como "segundos desde el principio del tramo") cae muy
 * por detras del PTS real y apaga el tramo entero, no solo la cola. Un
 * fundido de entrada solo, o un fundido de salida sobre un tramo que arranca
 * en 0, no lo disparaban — verificado a mano antes de fijar esta prueba.
 *
 * Reproduce la forma exacta del bug: tres tramos del MISMO archivo, el
 * segundo arrancando bien entrado el bloque (no en el segundo 0) y con un
 * fundido de salida cerca de su propio final — y comprueba que suena entero.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { montarTramos, ejecutar, rutaFfmpeg, duracionSegundos } from '../lib/audio.mjs';

const TMP = mkdtempSync(join(tmpdir(), 'estudio-tramos-'));
let fallos = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'ok   ' : 'FALLO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };

// Un "bloque" de 200s con tono real en toda su duracion (no silencio de
// origen): igual que un audio_fuente/N.mp3 real. El desfase del bug crece con
// lo lejos que arranca el segundo tramo dentro del bloque — con un offset
// chico (segundos) el ffmpeg real de este proyecto solo corrompe una parte;
// con uno del orden del caso real (video_005: tramo de 150-170 arrancaba a
// los ~157s de un bloque de ~218s) lo apaga entero. Se reproduce a esa
// escala para que la prueba sea una regresion de verdad, no un caso suave
// que la corrupcion pueda esquivar.
const ffmpeg = await rutaFfmpeg();
const bloque = join(TMP, 'bloque.mp3');
await ejecutar(ffmpeg, [
  '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:r=44100',
  '-t', '200', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '192k', bloque,
]);

// Tramo 1: [0, 150] sin fundidos. Tramo 2: [150, 190] — arranca bien entrado
// el bloque Y lleva un fundido de salida cerca de su propio final, la misma
// forma que el tramo de los parrafos 150-170 en video_005 (arrancaba a los
// ~157s de un bloque de ~218s y llevaba fade_out_ms por el block_end tras
// el 170). Tramo 3: [190, 200] recibe el fundido de entrada del mismo hueco.
const tramos = [
  { bloque: 1, archivo: bloque, desde: 0, hasta: 150 },
  { bloque: 1, archivo: bloque, desde: 150, hasta: 190 },
  { bloque: 1, archivo: bloque, desde: 190, hasta: 200 },
];

// El hueco entre el tramo 2 y el 3 lleva fundido: es la condicion exacta que
// disparaba el bug (cut_offset_ms distinto de cero, o fade_out_ms/fade_in_ms
// a mano) sobre un tramo que arranca lejos del principio de su bloque.
const huecos = [
  { trasParrafo: 2, duracion: 3, fadeOutMs: 30, fadeInMs: 30 },
];

const salidaMp3 = join(TMP, 'salida.mp3');
await montarTramos({ tramos, huecos, outro: null, salidaMp3, tmp: join(TMP, '.tmp') });

const dur = await duracionSegundos(salidaMp3);
check('la pista monta la duracion esperada (150 + 40 + 3 + 10 = 203s)', Math.abs(dur - 203) < 0.3, `${dur}`);

// Comprobar que hay señal real (no silencio) en CADA mitad, con silencedetect
// sobre la pista ya montada.
async function silencioTotalEn(ruta, desde, duracion) {
  const salida = await new Promise((resolve, reject) => {
    const p = spawn(ffmpeg, ['-ss', String(desde), '-t', String(duracion), '-i', ruta, '-af', 'silencedetect=noise=-40dB:d=0.3', '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', () => resolve(err));
  });
  // ffmpeg siempre cierra el silencio en curso al terminar la ventana
  // analizada (con su propio silence_end), asi que "sin silence_end" no sirve
  // para detectar silencio total: incluso una ventana enteramente muda trae
  // el par completo. Lo que importa es CUANTO cubre ese silencio: si un solo
  // tramo de silencio arranca casi en 0 y su duracion cubre casi toda la
  // ventana pedida, la ventana es muda de punta a punta.
  const inicio = salida.match(/silence_start:\s*([\d.]+)/);
  const dur = salida.match(/silence_duration:\s*([\d.]+)/);
  return !!(inicio && dur && Number(inicio[1]) < 0.05 && Number(dur[1]) > duracion - 0.1);
}

const mudoTramo1 = await silencioTotalEn(salidaMp3, 1, 5);
check('el tramo 1 (0-150s del bloque) suena', !mudoTramo1);

// El tramo 2 empieza justo donde acaba el tramo 1: en 150s de la pista
// montada. Es el que se apagaba entero con el bug (arranca a los 150s de su
// bloque y lleva el fundido de salida cerca de su propio final).
const mudoInicioTramo2 = await silencioTotalEn(salidaMp3, 155, 5);
check('el arranque del tramo 2 suena — aqui fallaba', !mudoInicioTramo2);

const mudoFinalTramo2 = await silencioTotalEn(salidaMp3, 184, 5);
check('el final del tramo 2 (junto a su propio fundido de salida) tambien suena', !mudoFinalTramo2);

// Tramo 3 queda tras 150 (t1) + 40 (t2) + 3 (hueco) = 193.
const mudoTramo3 = await silencioTotalEn(salidaMp3, 195, 5);
check('el tramo 3 (con el fundido de entrada) suena', !mudoTramo3);

console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
rmSync(TMP, { recursive: true, force: true });
process.exit(fallos ? 1 : 0);
