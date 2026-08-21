/**
 * Cama musical a partir de una pista de archivo, con el ducking del canal.
 *
 * La cama sintetizada aplica el ducking dentro de la propia sintesis, muestra a
 * muestra, leyendo la linea de tiempo. Una pista de archivo tiene que recibir
 * exactamente el mismo trato o la comparacion no valdria: si una baja con un
 * detector de voz y la otra con la linea de tiempo, lo que se estaria juzgando
 * es el metodo, no la musica.
 *
 * Asi que se decodifica a PCM y se multiplica por la MISMA funcion nivelEn()
 * que gobierna la cama aprobada. Las transiciones caen en el instante exacto
 * del timeline y no dependen de que un detector acierte.
 *
 * Antes de eso se iguala la sonoridad de las pistas. Tres piezas distintas
 * vienen a volumenes distintos, y sin igualarlas la prueba mediria cual se
 * masterizo mas alto en vez de cual acompana mejor a la voz.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { rutaFfmpeg, ejecutar } from './audio.mjs';

const SR = 44100;

function ejecutarBinario(bin, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const trozos = [];
    let error = '';
    p.stdout.on('data', (d) => trozos.push(d));
    p.stderr.on('data', (d) => (error += d));
    p.on('error', reject);
    p.on('close', (codigo) => {
      if (codigo === 0) resolve({ datos: Buffer.concat(trozos), error });
      else reject(new Error(`${bin} salio con codigo ${codigo}:\n${error.slice(-1500)}`));
    });
  });
}

/**
 * Sonoridad integrada de una pista, en LUFS.
 *
 * Es la medida que usa la industria —y YouTube— para decidir si algo "suena
 * igual de alto", y no tiene nada que ver con el pico: una pieza con picos
 * altos y mucho silencio puede sonar mas baja que otra comprimida.
 */
export async function sonoridad(ruta) {
  const ffmpeg = await rutaFfmpeg();
  const { error } = await ejecutarBinario(ffmpeg, [
    '-v', 'info', '-i', ruta, '-af', 'ebur128=framelog=quiet:peak=true', '-f', 'null', '-',
  ]);
  const resumen = error.slice(error.lastIndexOf('Integrated loudness'));
  const lufs = resumen.match(/I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/);
  const rango = resumen.match(/LRA:\s*(-?\d+(?:\.\d+)?)\s*LU/);
  const pico = error.match(/Peak:\s*(-?\d+(?:\.\d+)?)\s*dBFS/);
  if (!lufs) throw new Error(`No se pudo medir la sonoridad de ${ruta}`);
  return {
    lufs: Number(lufs[1]),
    rango: rango ? Number(rango[1]) : null,
    pico: pico ? Number(pico[1]) : null,
  };
}

/** Trozo de la pista, en PCM 16 bits estereo, con la ganancia ya aplicada. */
async function trozoPcm({ ruta, desde, segundos, gananciaDb }) {
  const ffmpeg = await rutaFfmpeg();
  const { datos } = await ejecutarBinario(ffmpeg, [
    '-v', 'error',
    '-ss', desde.toFixed(3), '-t', segundos.toFixed(3), '-i', ruta,
    '-af', `volume=${gananciaDb.toFixed(2)}dB`,
    '-ar', String(SR), '-ac', '2', '-f', 's16le', '-',
  ]);
  return datos;
}

const suave = (x) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2;

/**
 * Cama de archivo para una ventana, con el ducking del timeline aplicado.
 *
 * `envolvente(t)` es la misma nivelEn() que usa la cama sintetizada, evaluada
 * en el tiempo de la MUESTRA, no del video largo: la ventana empieza en cero.
 */
export async function camaDesdeArchivo({
  pista, desdeEnPista = 0, segundos, envolvente, salidaWav,
  gananciaDb = 0, fadeIn = 2, fadeOut = 3,
}) {
  const crudo = await trozoPcm({ ruta: pista, desde: desdeEnPista, segundos, gananciaDb });
  const n = Math.round(segundos * SR);
  const buf = Buffer.alloc(n * 4);

  // Si la pista se acaba antes que la ventana, se repite desde el principio.
  // Un corte seco a silencio delataria el truco mucho mas que la vuelta.
  const disponibles = Math.floor(crudo.length / 4);
  if (disponibles === 0) throw new Error(`No se pudo leer audio de ${pista}`);

  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const g = envolvente(t);
    const j = i % disponibles;
    let izq = crudo.readInt16LE(j * 4) / 32768;
    let der = crudo.readInt16LE(j * 4 + 2) / 32768;

    let borde = 1;
    if (t < fadeIn) borde *= suave(t / fadeIn);
    const restante = segundos - t;
    if (restante < fadeOut) borde *= suave(restante / fadeOut);

    const k = g * borde;
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, izq * k)) * 32767), i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, der * k)) * 32767), i * 4 + 2);
  }

  writeFileSync(salidaWav, Buffer.concat([cabeceraWav(n), buf]));
  return { segundos, muestras: n, repetida: n > disponibles };
}

function cabeceraWav(muestras) {
  const datos = muestras * 4;
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + datos, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28);
  h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(datos, 40);
  return h;
}

/**
 * Mezcla voz y cama en un mp3.
 *
 * normalize=0 por lo mismo de siempre: sin el, amix reparte la ganancia entre
 * las entradas y baja la voz a la mitad. Los niveles ya vienen decididos.
 */
export async function mezclarMuestra({ voz, musica, salidaMp3, segundos, fadeIn, fadeOut }) {
  const ffmpeg = await rutaFfmpeg();
  await ejecutar(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-i', voz, '-i', musica,
    '-filter_complex',
      `[0:a][1:a]amix=inputs=2:duration=first:normalize=0[m];` +
      `[m]afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${(segundos - fadeOut).toFixed(3)}:d=${fadeOut}[a]`,
    '-map', '[a]', '-t', segundos.toFixed(3),
    '-c:a', 'libmp3lame', '-b:a', '192k', '-ar', String(SR),
    salidaMp3,
  ]);
  return salidaMp3;
}

/** Voz de la ventana, recortada del audio ya montado. Sin tocar el nivel. */
export async function vozDeLaVentana({ audio, desde, segundos, salidaWav }) {
  const ffmpeg = await rutaFfmpeg();
  await ejecutar(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-ss', desde.toFixed(3), '-t', segundos.toFixed(3), '-i', audio,
    '-ar', String(SR), '-ac', '2', '-c:a', 'pcm_s16le', salidaWav,
  ]);
  return salidaWav;
}
