/**
 * Render del video nocturno con ffmpeg, en una sola pasada.
 *
 * No se captura fotograma a fotograma: la escena es una imagen fija con un
 * empuje lentisimo, particulas en bucle y dos pistas de audio. Todo eso lo
 * resuelve un grafo de filtros, y la diferencia no es de estilo: media hora a
 * 30 fps son 58.000 capturas, varias horas de trabajo, frente a los minutos
 * que tarda una pasada de codificacion.
 *
 * El zoom se calcula sobre el TIEMPO ABSOLUTO del video, no sobre el
 * fotograma de esta salida, para que una muestra recortada del minuto seis
 * ensene exactamente el encuadre que tendra ahi el render completo.
 */

import { rutaFfmpeg, ejecutar } from './audio.mjs';
import { join, dirname } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

/**
 * La imagen se amplia muy por encima de la resolucion de salida antes de
 * mover el encuadre. Con un zoom de 4% repartido en media hora, el recorte
 * avanza menos de un pixel cada varios segundos: sin ese sobremuestreo, el
 * redondeo a pixel entero convierte el movimiento continuo en saltitos.
 */
const SOBREMUESTREO = 3;

export async function renderizar({
  imagen,
  particulas,
  voz,
  musica,
  salida,
  desde = 0,
  duracion,
  duracionTotal,
  ancho = 1920,
  alto = 1080,
  fps = 30,
  zoomTotal = 0.04,
  foco = { x: 0.58, y: 0.42 },
  crf = 20,
  preset = 'medium',
  srt = null,
  recorridoCompleto = false,
}) {
  const ffmpeg = await rutaFfmpeg();
  const anchoGrande = ancho * SOBREMUESTREO;

  // La ampliacion se hace UNA vez, a un archivo. Dentro del grafo, con la
  // imagen en bucle, ffmpeg repetiria el escalado a 18,7 megapixeles en cada
  // uno de los casi 59.000 fotogramas: medido, eso multiplicaba por tres el
  // tiempo de render de media hora de video.
  const grande = join(dirname(salida), '.escena-grande.png');
  await ejecutar(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-i', imagen,
    '-vf', `scale=${anchoGrande}:-2:flags=lanczos,setsar=1`,
    grande,
  ]);

  // Tiempo absoluto del fotograma `on` de esta salida.
  const tAbs = `(${desde}+on/${fps})`;
  // A velocidad real, 80 segundos mueven el encuadre unos 3 pixeles: no hay
  // forma de juzgar si el recorrido total es el adecuado mirando eso. El modo
  // recorrido comprime todo el viaje en la ventana para poder valorarlo.
  const z = recorridoCompleto
    ? `1+${zoomTotal}*on/${Math.max(1, Math.round(duracion * fps) - 1)}`
    : `1+${zoomTotal}*${tAbs}/${duracionTotal}`;

  // La imagen entra UNA sola vez y zoompan genera desde ella los fotogramas
  // que hagan falta. Repetirla con -loop obligaba a ffmpeg a decodificar y
  // reescalar 18,7 megapixeles en cada uno de los casi 59.000 fotogramas.
  const totalFotogramas = Math.max(1, Math.round(duracion * fps));
  const filtros = [
    `[0:v]zoompan=z='${z}':x='(iw-iw/zoom)*${foco.x}':y='(ih-ih/zoom)*${foco.y}':` +
      `d=${totalFotogramas}:s=${ancho}x${alto}:fps=${fps}[escena]`,
    `[1:v]scale=${ancho}:${alto},format=rgba[motas]`,
    // El cielo nocturno es un degradado amplio en 8 bits, justo el material que
    // produce anillos de banding al codificar. gradfun los deshace con un grano
    // finisimo antes de que x264 los fije en el video.
    `[escena][motas]overlay=0:0:format=auto,gradfun=strength=1.2:radius=16,format=yuv420p[vid]`,
  ];

  let vSalida = '[vid]';
  if (srt) {
    filtros.push(
      `[vid]subtitles=${srt.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'")}` +
        `:force_style='FontName=DejaVu Sans,FontSize=24,PrimaryColour=&H00FFFFFF,` +
        `OutlineColour=&HA0000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=64'[vsub]`
    );
    vSalida = '[vsub]';
  }

  // normalize=0: sin el, amix reparte la ganancia entre las entradas y baja la
  // voz a la mitad. Los niveles ya vienen decididos en la sintesis de la cama.
  filtros.push(`[2:a][3:a]amix=inputs=2:duration=first:normalize=0[aud]`);

  const args = [
    '-y', '-loglevel', 'error', '-stats',
    '-i', grande,
    '-stream_loop', '-1', '-i', particulas,
    '-ss', desde.toFixed(3), '-t', duracion.toFixed(3), '-i', voz,
    '-i', musica,
    '-filter_complex', filtros.join(';'),
    '-map', vSalida, '-map', '[aud]',
    '-t', duracion.toFixed(3),
    '-c:v', 'libx264', '-preset', preset, '-crf', String(crf),
    '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '192k', '-ar', '44100',
    '-movflags', '+faststart',
    salida,
  ];

  await ejecutar(ffmpeg, args);
  try { (await import('node:fs')).rmSync(grande, { force: true }); } catch {}
  return { desde, duracion };
}

/**
 * Cuantas vueltas de un segmento de `periodo` segundos hacen falta para
 * cubrir (o pasarse de) `duracionTotal`. Pura, sin ffmpeg: la ultima vuelta
 * sobra y se recorta despues, nunca se genera de menos.
 */
export function vueltasNecesarias(duracionTotal, periodo) {
  if (!(periodo > 0)) throw new Error('periodo tiene que ser mayor que cero');
  return Math.max(1, Math.ceil(duracionTotal / periodo));
}

/**
 * Preset "imagen_fija_particulas": renderiza UN SOLO segmento de `periodo`
 * segundos (imagen fija, sin zoom, particulas, sin audio) para repetirlo
 * despues por fuera con -c copy, en vez de renderizar el video entero.
 *
 * Es el mismo grafo de filtros que renderizar() con zoomTotal=0 congelado
 * (z='1', por eso x/y quedan fijos en 0: con zoom=1, (iw-iw/zoom) siempre da
 * cero, el foco deja de importar). Se mantiene aparte de renderizar() en vez
 * de meterle una rama, para no arriesgar el camino que SI sigue usando
 * zoompan de verdad (video de manana).
 *
 * Las particulas ya duran exactamente `periodo` (generarLoop se construye
 * para cerrar en ese punto): aqui se usan una sola vuelta, sin -stream_loop.
 */
export async function renderizarLoopVisual({
  imagen, particulas, salida, periodo = 24,
  ancho = 1920, alto = 1080, fps = 30, crf = 20, preset = 'medium',
}) {
  const ffmpeg = await rutaFfmpeg();
  const anchoGrande = ancho * SOBREMUESTREO;

  const grande = join(dirname(salida), '.escena-grande-loop.png');
  await ejecutar(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-i', imagen,
    '-vf', `scale=${anchoGrande}:-2:flags=lanczos,setsar=1`,
    grande,
  ]);

  const totalFotogramas = Math.max(1, Math.round(periodo * fps));
  const filtros = [
    `[0:v]zoompan=z='1':x='0':y='0':d=${totalFotogramas}:s=${ancho}x${alto}:fps=${fps}[escena]`,
    `[1:v]scale=${ancho}:${alto},format=rgba[motas]`,
    `[escena][motas]overlay=0:0:format=auto,gradfun=strength=1.2:radius=16,format=yuv420p[vid]`,
  ];

  await ejecutar(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-i', grande,
    '-i', particulas,
    '-filter_complex', filtros.join(';'),
    '-map', '[vid]',
    '-t', periodo.toFixed(3),
    '-an',
    '-c:v', 'libx264', '-preset', preset, '-crf', String(crf),
    '-pix_fmt', 'yuv420p', '-r', String(fps),
    salida,
  ]);

  try { rmSync(grande, { force: true }); } catch {}
  return { periodo, fotogramas: totalFotogramas };
}

/**
 * Repite un segmento silencioso ya renderizado hasta cubrir `duracionTotal`,
 * uniendolo por el contenedor (concat demuxer) y copiando el flujo de video
 * tal cual: no hay una sola muestra que volver a codificar. La ultima vuelta
 * sobrante se recorta con el mismo -c copy, en el mismo paso.
 */
export async function loopVisualHastaDuracion({ segmento, duracionTotal, periodo, salida, tmp }) {
  const ffmpeg = await rutaFfmpeg();
  mkdirSync(tmp, { recursive: true });

  const vueltas = vueltasNecesarias(duracionTotal, periodo);
  const lista = join(tmp, 'lista-loop-visual.txt');
  writeFileSync(
    lista,
    Array.from({ length: vueltas }, () => `file '${segmento.replace(/'/g, "'\\''")}'`).join('\n') + '\n'
  );

  await ejecutar(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-f', 'concat', '-safe', '0', '-i', lista,
    '-t', duracionTotal.toFixed(3),
    '-c', 'copy',
    salida,
  ]);

  return { vueltas };
}
