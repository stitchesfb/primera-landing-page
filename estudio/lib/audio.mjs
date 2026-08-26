/**
 * Montaje de la pista de narracion con ffmpeg.
 *
 * Cada parrafo llega como mp3 independiente. Para unirlos se decodifican a
 * PCM y se concatenan con silencios generados a medida: en PCM la union es
 * exacta al milisegundo, mientras que concatenar mp3 arrastra el padding del
 * codificador y desplazaria los subtitulos poco a poco.
 */

import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';

let cacheFfmpeg = null;
let cacheFfprobe = null;

async function binario(paquete, nombre, cache) {
  if (cache.valor) return cache.valor;
  try {
    const mod = await import(paquete);
    const ruta = mod.default?.path ?? mod.default ?? mod.path;
    if (ruta && existsSync(ruta)) {
      cache.valor = ruta;
      return ruta;
    }
  } catch {
    // Sin el paquete estatico tiramos del binario del sistema.
  }
  cache.valor = nombre;
  return nombre;
}

export const rutaFfmpeg = () => binario('ffmpeg-static', 'ffmpeg', (cacheFfmpeg ??= {}));
export const rutaFfprobe = () => binario('ffprobe-static', 'ffprobe', (cacheFfprobe ??= {}));

export function ejecutar(bin, args, opciones = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opciones });
    let salida = '';
    let error = '';
    p.stdout.on('data', (d) => (salida += d));
    p.stderr.on('data', (d) => (error += d));
    p.on('error', reject);
    p.on('close', (codigo) => {
      if (codigo === 0) resolve(salida.trim());
      else reject(new Error(`${bin} salio con codigo ${codigo}:\n${error.slice(-2000)}`));
    });
  });
}

/**
 * Detecta tramos de silencio en un audio y los compara contra los huecos
 * DECLARADOS en la linea de tiempo (timeline.huecos). Un silencio real que no
 * lo explica ningun hueco declarado es sospechoso: la duracion de un tramo
 * puede seguir cuadrando en la linea de tiempo aunque el PCM que se monto ahi
 * este mudo — asi se descubrio la omision de los parrafos 150-170 en
 * video_005 (afade con el "st" mal referenciado silenciaba el tramo entero).
 *
 * Solo mira silencios de `umbralS` segundos o mas: las respiraciones y
 * pausas normales entre parrafos quedan muy por debajo y no interesan aqui.
 */
export async function auditarSilenciosNoDeclarados(ruta, huecos, { umbralS = 15, ruidoDb = -40, margenS = 3, colchonS = 5 } = {}) {
  const ffmpeg = await rutaFfmpeg();
  const salida = await new Promise((resolve, reject) => {
    const p = spawn(ffmpeg, ['-i', ruta, '-af', `silencedetect=noise=${ruidoDb}dB:d=0.3`, '-f', 'null', '-'], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let error = '';
    p.stderr.on('data', (d) => (error += d));
    p.on('error', reject);
    p.on('close', () => resolve(error));
  });

  const silencios = [];
  const inicios = [...salida.matchAll(/silence_start:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  const finales = [...salida.matchAll(/silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/g)]
    .map((m) => ({ fin: Number(m[1]), duracion: Number(m[2]) }));
  for (let i = 0; i < Math.min(inicios.length, finales.length); i++) {
    if (finales[i].duracion >= umbralS) {
      silencios.push({ inicio: inicios[i], fin: finales[i].fin, duracion: finales[i].duracion });
    }
  }

  const sinExplicar = silencios.filter((s) => !huecos.some((h) =>
    Math.abs(s.inicio - h.inicio) <= margenS && s.duracion <= h.duracion + colchonS
  ));

  return { silencios, sinExplicar, ok: sinExplicar.length === 0 };
}

export async function duracionSegundos(ruta) {
  const ffprobe = await rutaFfprobe();
  const salida = await ejecutar(ffprobe, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    ruta,
  ]);
  const n = Number.parseFloat(salida);
  if (!Number.isFinite(n)) throw new Error(`No se pudo leer la duracion de ${ruta}`);
  return n;
}

async function aPcm(entrada, salida) {
  const ffmpeg = await rutaFfmpeg();
  await ejecutar(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-i', entrada,
    '-ar', '44100', '-ac', '2', '-c:a', 'pcm_s16le',
    salida,
  ]);
  return salida;
}

async function silencioPcm(segundos, salida) {
  const ffmpeg = await rutaFfmpeg();
  await ejecutar(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
    '-t', segundos.toFixed(3),
    '-c:a', 'pcm_s16le',
    salida,
  ]);
  return salida;
}

/**
 * Une los mp3 de cada parrafo intercalando los huecos de la linea de tiempo.
 *
 * Devuelve las duraciones REALES medidas de cada parrafo, que son las que
 * alimentan la linea de tiempo definitiva: las estimadas solo sirven para
 * decidir si merece la pena gastar creditos, nunca para colocar subtitulos.
 */
export async function montarNarracion({ segmentos, huecos, outro, salidaMp3, tmp }) {
  mkdirSync(tmp, { recursive: true });
  const ffmpeg = await rutaFfmpeg();

  const piezas = [];
  const duraciones = [];

  for (const [i, seg] of segmentos.entries()) {
    const pcm = join(tmp, `p${String(i + 1).padStart(3, '0')}.wav`);
    await aPcm(seg.mp3, pcm);
    duraciones.push(await duracionSegundos(pcm));
    piezas.push(pcm);

    const hueco = huecos.find((h) => h.trasParrafo === i + 1);
    if (hueco?.duracion > 0) {
      piezas.push(await silencioPcm(hueco.duracion, join(tmp, `s${String(i + 1).padStart(3, '0')}.wav`)));
    }
  }

  if (outro?.music_seconds > 0) {
    piezas.push(await silencioPcm(outro.music_seconds, join(tmp, 'outro.wav')));
  }

  const lista = join(tmp, 'lista.txt');
  writeFileSync(lista, piezas.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n') + '\n');

  await ejecutar(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-f', 'concat', '-safe', '0', '-i', lista,
    '-c:a', 'libmp3lame', '-b:a', '192k',
    salidaMp3,
  ]);

  const total = await duracionSegundos(salidaMp3);
  rmSync(tmp, { recursive: true, force: true });
  return { duraciones, duracionTotal: total };
}

/**
 * Monta la pista a partir de TRAMOS, que pueden ser un bloque entero o un
 * trozo suyo delimitado por [desde, hasta].
 *
 * Cada bloque se decodifica a PCM una sola vez y de ahi se recortan sus
 * tramos: sobre PCM el corte es exacto a la muestra, mientras que buscar una
 * posicion dentro de un mp3 cae al fotograma mas cercano y correria los
 * subtitulos unos milisegundos en cada corte.
 *
 * Un hueco con fadeOutMs/fadeInMs (ver construirLinea en plan.mjs) lleva
 * ademas un fundido tecnico de esa duracion a cada lado del corte, para no
 * dejar un clic de discontinuidad de muestra.
 */
export async function montarTramos({ tramos, huecos, outro, salidaMp3, tmp }) {
  mkdirSync(tmp, { recursive: true });
  const ffmpeg = await rutaFfmpeg();

  // Un WAV por bloque, reutilizado por todos sus tramos.
  const wavDeBloque = new Map();
  for (const t of tramos) {
    if (wavDeBloque.has(t.archivo)) continue;
    const wav = join(tmp, `b${wavDeBloque.size + 1}.wav`);
    await aPcm(t.archivo, wav);
    wavDeBloque.set(t.archivo, wav);
  }

  const piezas = [];
  const duraciones = [];

  // Un hueco con fadeOutMs/fadeInMs > 0 lleva un fundido tecnico corto a ese
  // lado del corte, para no dejar un clic de discontinuidad de muestra sin
  // tocar ninguna palabra. Cada lado se declara por separado: la cola del
  // tramo anterior al hueco (fadeOutMs) y la cabeza del tramo siguiente
  // (fadeInMs) pueden llevar duraciones distintas.
  let fadeInPendienteMs = 0;

  for (const [i, t] of tramos.entries()) {
    const trozo = join(tmp, `t${String(i + 1).padStart(3, '0')}.wav`);
    const hueco = huecos.find((h) => h.trasParrafo === i + 1);
    const fadeOutMs = hueco?.duracion > 0 ? (hueco.fadeOutMs ?? 0) : 0;
    const fadeInMs = fadeInPendienteMs;
    fadeInPendienteMs = hueco?.duracion > 0 ? (hueco.fadeInMs ?? 0) : 0;

    // Extraccion SIEMPRE sin filtro: -ss/-to aqui son opciones de SALIDA (van
    // detras de -i), y combinarlas con -af en el mismo comando deja el PTS
    // del segmento arrancando donde arrancaba en el bloque entero (p.ej.
    // ~157s), no en 0 — el "st" de afade se mide contra ese PTS, no contra el
    // principio del segmento, y si "st" queda muy por detras de esos PTS el
    // filtro apaga el tramo entero en vez de no hacer nada. Medido: silencio
    // total del tramo. Por eso el fundido va SIEMPRE en un segundo paso,
    // sobre un archivo ya recortado que arranca en PTS 0 de verdad — el mismo
    // patron que ya usan los scripts de diagnostico de este proyecto.
    await ejecutar(ffmpeg, [
      '-y', '-loglevel', 'error',
      '-i', wavDeBloque.get(t.archivo),
      '-ss', t.desde.toFixed(4),
      '-to', t.hasta.toFixed(4),
      '-c:a', 'pcm_s16le', trozo,
    ]);

    if (fadeInMs > 0 || fadeOutMs > 0) {
      // La duracion real del recorte puede quedar unos milisegundos por debajo
      // de (hasta - desde) por redondeo de muestra: el "st" del fundido de
      // salida se calcula sobre la duracion YA MEDIDA, nunca sobre la teorica,
      // o podria caer mas alla del final real del audio.
      const duracionReal = await duracionSegundos(trozo);
      const filtros = [];
      if (fadeInMs > 0) filtros.push(`afade=t=in:st=0:d=${(fadeInMs / 1000).toFixed(4)}`);
      if (fadeOutMs > 0) {
        const fadeOutS = fadeOutMs / 1000;
        filtros.push(`afade=t=out:st=${Math.max(0, duracionReal - fadeOutS).toFixed(4)}:d=${fadeOutS.toFixed(4)}`);
      }
      const conFundido = join(tmp, `t${String(i + 1).padStart(3, '0')}-fundido.wav`);
      await ejecutar(ffmpeg, [
        '-y', '-loglevel', 'error',
        '-i', trozo,
        '-af', filtros.join(','),
        '-c:a', 'pcm_s16le', conFundido,
      ]);
      renameSync(conFundido, trozo);
    }

    duraciones.push(await duracionSegundos(trozo));
    piezas.push(trozo);

    if (hueco?.duracion > 0) {
      piezas.push(await silencioPcm(hueco.duracion, join(tmp, `s${String(i + 1).padStart(3, '0')}.wav`)));
    }
  }

  if (outro?.music_seconds > 0) {
    piezas.push(await silencioPcm(outro.music_seconds, join(tmp, 'outro.wav')));
  }

  const lista = join(tmp, 'lista.txt');
  writeFileSync(lista, piezas.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n') + '\n');

  await ejecutar(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-f', 'concat', '-safe', '0', '-i', lista,
    '-c:a', 'libmp3lame', '-b:a', '192k',
    salidaMp3,
  ]);

  const total = await duracionSegundos(salidaMp3);
  rmSync(tmp, { recursive: true, force: true });
  return { duraciones, duracionTotal: total };
}
