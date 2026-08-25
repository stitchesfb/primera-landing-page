/**
 * Preset "imagen_fija_particulas": un segmento corto se renderiza UNA vez y
 * se repite por fuera con -c copy. Aqui se prueba en miniatura: resolucion y
 * periodo chicos para que corra en segundos, no en minutos.
 */
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { rutaFfmpeg, rutaFfprobe, ejecutar, duracionSegundos } from '../lib/audio.mjs';
import { generarLoop } from '../lib/particulas.mjs';
import { renderizarLoopVisual, loopVisualHastaDuracion, vueltasNecesarias } from '../lib/renderer.mjs';
import { pruebaDecodificacion } from '../lib/diagnostico.mjs';

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'ok   ' : 'FALLO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };

// --- vueltasNecesarias: pura, sin ffmpeg -------------------------------
check('multiplo exacto', vueltasNecesarias(48, 24) === 2);
check('no exacto redondea hacia arriba', vueltasNecesarias(50, 24) === 3);
check('duracion menor que el periodo: una vuelta basta', vueltasNecesarias(10, 24) === 1);
check('duracion igual al periodo: una vuelta', vueltasNecesarias(24, 24) === 1);
let saltoPeriodoInvalido = false;
try { vueltasNecesarias(10, 0); } catch { saltoPeriodoInvalido = true; }
check('periodo cero salta en vez de dividir por cero', saltoPeriodoInvalido);

// --- integracion: segmento real chico, repetido y recortado -----------
const tmp = join('/tmp', `loop-visual-test-${Date.now()}`);
mkdirSync(tmp, { recursive: true });

const ANCHO = 160, ALTO = 90, FPS = 10, PERIODO = 2, CUANTAS = 6;

const imagen = join(tmp, 'escena.png');
const particulas = join(tmp, 'motas.mov');
const segmento = join(tmp, 'segmento.mp4');

const ffmpeg = await rutaFfmpeg();
const ffprobe = await rutaFfprobe();

// Imagen de prueba: un color plano, no hace falta una foto real para probar
// que el mecanismo de bucle+recorte funciona.
await ejecutar(ffmpeg, [
  '-y', '-loglevel', 'error',
  '-f', 'lavfi', '-i', `color=c=navy:s=${ANCHO}x${ALTO}`,
  '-frames:v', '1', imagen,
]);

await generarLoop({ salida: particulas, ancho: ANCHO, alto: ALTO, fps: FPS, periodo: PERIODO, cuantas: CUANTAS });

const infoSegmento = await renderizarLoopVisual({
  imagen, particulas, salida: segmento, periodo: PERIODO,
  ancho: ANCHO, alto: ALTO, fps: FPS, crf: 28, preset: 'ultrafast',
});
const durSegmento = await duracionSegundos(segmento);
check('el segmento dura lo declarado', Math.abs(durSegmento - PERIODO) < 0.15, `${durSegmento}`);
check('el segmento trae los fotogramas esperados', infoSegmento.fotogramas === PERIODO * FPS);

// Duracion NO multiplo del periodo: 3 vueltas (6s) recortadas a 5s.
const OBJETIVO = 5;
const repetido = join(tmp, 'repetido.mp4');
const infoRepeticion = await loopVisualHastaDuracion({
  segmento, duracionTotal: OBJETIVO, periodo: PERIODO, salida: repetido, tmp: join(tmp, '.tmp-loop'),
});
check('hacen falta 3 vueltas para pasarse de 5s con periodo 2s', infoRepeticion.vueltas === 3);

const durRepetido = await duracionSegundos(repetido);
check('el video repetido queda recortado a la duracion pedida',
  Math.abs(durRepetido - OBJETIVO) < 1 / FPS + 0.05, `${durRepetido} vs ${OBJETIVO}`);

const salida = await ejecutar(ffprobe, [
  '-v', 'error', '-select_streams', 'v:0',
  '-show_entries', 'stream=codec_name,width,height,nb_frames',
  '-of', 'json', repetido,
]);
const v = JSON.parse(salida).streams[0];
check('el video repetido sigue siendo h264 (copia, sin recodificar)', v.codec_name === 'h264');
check('el video repetido conserva la resolucion', Number(v.width) === ANCHO && Number(v.height) === ALTO);

// Decodifica el archivo completo: si el copy+trim hubiera dejado algo roto,
// esto lo saca a la luz igual que con cualquier otro contenedor del proyecto.
const dec = await pruebaDecodificacion(repetido, { desde: 0, segundos: OBJETIVO + 1 });
check('el video repetido decodifica sin fallo', dec.ok === true, JSON.stringify(dec.problemas));

// Sin recorte: dos vueltas exactas tienen que dar el doble de duracion.
const dobleVuelta = join(tmp, 'doble.mp4');
const infoDoble = await loopVisualHastaDuracion({
  segmento, duracionTotal: PERIODO * 2, periodo: PERIODO, salida: dobleVuelta, tmp: join(tmp, '.tmp-loop2'),
});
check('dos vueltas exactas: 2 repeticiones, sin recorte de mas', infoDoble.vueltas === 2);
const durDoble = await duracionSegundos(dobleVuelta);
check('la duracion sin recorte es el doble del segmento', Math.abs(durDoble - PERIODO * 2) < 1 / FPS + 0.05, `${durDoble}`);

rmSync(tmp, { recursive: true, force: true });

console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
