/**
 * Sustituir la pista de audio de un video ya renderizado, sin tocar la imagen.
 *
 * Los 32:41 del render nocturno cuestan hora y media de CPU, y casi toda se va
 * en zoompan: ampliar la escena y mover el encuadre menos de un pixel por
 * segundo, 58.830 veces. Cuando lo unico que cambia es la mezcla de audio,
 * repetir ese trabajo no aporta nada — y ademas reabriria una pregunta que ya
 * estaba cerrada, porque un render nuevo produce fotogramas nuevos.
 *
 * Copiando el flujo de video tal cual, los fotogramas aprobados siguen siendo
 * exactamente los mismos bits. Eso no hay que creerselo: se comprueba con el
 * MD5 del flujo de video antes y despues.
 */

import { rutaFfmpeg, rutaFfprobe, ejecutar } from './audio.mjs';

/** Datos del flujo de video: lo que hay que comparar antes de remuxar. */
export async function inspeccionarVideo(ruta) {
  const ffprobe = await rutaFfprobe();
  const salida = await ejecutar(ffprobe, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=codec_name,width,height,r_frame_rate,nb_frames,duration',
    '-show_entries', 'format=duration',
    '-of', 'json',
    ruta,
  ]);
  const d = JSON.parse(salida);
  const v = d.streams?.[0];
  if (!v) throw new Error(`${ruta} no tiene flujo de video.`);
  const [num, den] = String(v.r_frame_rate ?? '0/1').split('/').map(Number);
  return {
    codec: v.codec_name,
    ancho: Number(v.width),
    alto: Number(v.height),
    fps: den ? num / den : 0,
    fotogramas: v.nb_frames != null ? Number(v.nb_frames) : null,
    duracionVideo: Number(v.duration ?? d.format?.duration),
    duracionContenedor: Number(d.format?.duration),
  };
}

/**
 * MD5 del flujo de video, sin decodificarlo.
 *
 * Es la prueba de que la imagen no se ha tocado: si el hash coincide con el
 * del video de origen, los fotogramas no son "equivalentes" ni "muy
 * parecidos", son los mismos bytes.
 */
export async function huellaVideo(ruta) {
  const ffmpeg = await rutaFfmpeg();
  const salida = await ejecutar(ffmpeg, [
    '-v', 'error', '-i', ruta, '-map', '0:v:0', '-c', 'copy', '-f', 'md5', '-',
  ]);
  return salida.replace(/^MD5=/, '').trim();
}

/**
 * Mezcla voz y cama y las pega al video de origen copiando la imagen.
 *
 * El grafo de mezcla es el mismo que usa el render completo, incluido
 * normalize=0: sin el, amix reparte la ganancia entre las entradas y baja la
 * voz a la mitad. Los niveles ya vienen decididos en la sintesis de la cama.
 */
export async function remuxarAudio({ video, voz, musica, salida }) {
  const ffmpeg = await rutaFfmpeg();
  await ejecutar(ffmpeg, [
    '-y', '-loglevel', 'error', '-stats',
    '-i', video,
    '-i', voz,
    '-i', musica,
    '-filter_complex', '[1:a][2:a]amix=inputs=2:duration=first:normalize=0[aud]',
    '-map', '0:v:0', '-map', '[aud]',
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '44100',
    '-movflags', '+faststart',
    salida,
  ]);
  return salida;
}

/**
 * Desfase entre las pistas de audio de dos videos, en segundos.
 *
 * Compara la envolvente de energia de las dos mezclas y busca el retardo que
 * mejor las hace coincidir. La voz es lo que domina la envolvente, asi que un
 * desfase de cero significa que la narracion cae en el mismo sitio en los dos
 * archivos, que es lo que sostiene la sincronia de los subtitulos.
 *
 * No sirve para juzgar la musica —es justo lo que ha cambiado—, solo para
 * confirmar que la voz no se ha movido.
 */
export async function desfaseAudio(a, b, { maximo = 2.0 } = {}) {
  const envA = await envolvente(a);
  const envB = await envolvente(b);
  const HZ = 100;
  const margen = Math.round(maximo * HZ);
  const n = Math.min(envA.length, envB.length);
  if (n < HZ * 10) throw new Error('Pistas demasiado cortas para medir el desfase.');

  let mejor = 0;
  let mejorPuntuacion = -Infinity;
  for (let lag = -margen; lag <= margen; lag++) {
    let suma = 0;
    let cuantos = 0;
    for (let i = Math.max(0, -lag); i < Math.min(n, n - lag); i++) {
      suma += envA[i] * envB[i + lag];
      cuantos++;
    }
    const p = cuantos ? suma / cuantos : -Infinity;
    if (p > mejorPuntuacion) { mejorPuntuacion = p; mejor = lag; }
  }
  return mejor / HZ;
}

/** Energia media en ventanas de 10 ms, centrada para que la correlacion sea limpia. */
async function envolvente(ruta) {
  const ffmpeg = await rutaFfmpeg();
  const p = await ejecutarBinario(ffmpeg, [
    '-v', 'error', '-i', ruta,
    '-map', '0:a:0', '-ac', '1', '-ar', '8000', '-f', 's16le', '-',
  ]);
  const muestras = p.length >> 1;
  const porVentana = 80; // 8000 Hz / 100 Hz
  const env = new Float64Array(Math.floor(muestras / porVentana));
  for (let v = 0; v < env.length; v++) {
    let suma = 0;
    for (let i = 0; i < porVentana; i++) {
      const s = p.readInt16LE(((v * porVentana) + i) * 2) / 32768;
      suma += s * s;
    }
    env[v] = Math.sqrt(suma / porVentana);
  }
  let media = 0;
  for (const x of env) media += x;
  media /= env.length || 1;
  for (let i = 0; i < env.length; i++) env[i] -= media;
  return env;
}

/** Como ejecutar(), pero devuelve la salida binaria en vez de texto. */
function ejecutarBinario(bin, args) {
  return new Promise((resolve, reject) => {
    import('node:child_process').then(({ spawn }) => {
      const p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      const trozos = [];
      let error = '';
      p.stdout.on('data', (d) => trozos.push(d));
      p.stderr.on('data', (d) => (error += d));
      p.on('error', reject);
      p.on('close', (codigo) => {
        if (codigo === 0) resolve(Buffer.concat(trozos));
        else reject(new Error(`${bin} salio con codigo ${codigo}:\n${error.slice(-2000)}`));
      });
    });
  });
}
