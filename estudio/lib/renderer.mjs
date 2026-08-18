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

  // Tiempo absoluto del fotograma `on` de esta salida.
  const tAbs = `(${desde}+on/${fps})`;
  // A velocidad real, 80 segundos mueven el encuadre unos 3 pixeles: no hay
  // forma de juzgar si el recorrido total es el adecuado mirando eso. El modo
  // recorrido comprime todo el viaje en la ventana para poder valorarlo.
  const z = recorridoCompleto
    ? `1+${zoomTotal}*on/${Math.max(1, Math.round(duracion * fps) - 1)}`
    : `1+${zoomTotal}*${tAbs}/${duracionTotal}`;

  const filtros = [
    `[0:v]scale=${anchoGrande}:-2:flags=lanczos,setsar=1[grande]`,
    `[grande]zoompan=z='${z}':x='(iw-iw/zoom)*${foco.x}':y='(ih-ih/zoom)*${foco.y}':` +
      `d=1:s=${ancho}x${alto}:fps=${fps}[escena]`,
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
    '-loop', '1', '-framerate', String(fps), '-i', imagen,
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
  return { desde, duracion };
}
