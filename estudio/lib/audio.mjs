/**
 * Montaje de la pista de narracion con ffmpeg.
 *
 * Cada parrafo llega como mp3 independiente. Para unirlos se decodifican a
 * PCM y se concatenan con silencios generados a medida: en PCM la union es
 * exacta al milisegundo, mientras que concatenar mp3 arrastra el padding del
 * codificador y desplazaria los subtitulos poco a poco.
 */

import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
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
