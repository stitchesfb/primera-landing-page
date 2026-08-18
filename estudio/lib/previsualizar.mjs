/**
 * MP4 de revision: fondo negro, subtitulos quemados y nada mas.
 *
 * No es el renderer. Existe solo para poder juzgar la sincronia sin montar un
 * reproductor con pistas externas: si el subtitulo cuadra sobre negro, cuadra
 * sobre cualquier escena que se ponga despues.
 *
 * Sin imagen, sin particulas, sin musica y sin efectos. Lo unico que se
 * superpone es una etiqueta durante los interludios, porque esos silencios son
 * precisamente lo que el pipeline fabrico y lo que hay que juzgar; sin marcarlos
 * no se distinguen de una pausa que ya venia en la grabacion.
 */

import { existsSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { rutaFfmpeg, ejecutar, duracionSegundos } from './audio.mjs';

const escapar = (s) => s.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");

const tiempoASS = (segundos) => {
  const cs = Math.max(0, Math.round(segundos * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const r = cs % 100;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(r).padStart(2, '0')}`;
};

/** Pista ASS con una etiqueta tenue durante cada silencio fabricado. */
function marcasDeInterludio(linea, ancho, alto) {
  const cabecera = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${ancho}`,
    `PlayResY: ${alto}`,
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour,' +
      ' Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline,' +
      ' Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    // &H60FFFFFF: blanco al 62% de opacidad. Debe leerse sin competir con el
    // subtitulo, que es lo que de verdad se esta revisando.
    'Style: marca,DejaVu Sans,22,&H60FFFFFF,&H60FFFFFF,&H00000000,&H00000000,' +
      '0,1,0,0,100,100,0,0,1,2,0,8,40,40,40,1',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];

  const eventos = (linea.huecos ?? []).map((h) => {
    const etiqueta = h.tipo === 'block_end'
      ? `interludio — fin del bloque tras el parrafo ${h.trasParrafo}`
      : `pausa de ${h.duracion}s tras el parrafo ${h.trasParrafo}`;
    return `Dialogue: 0,${tiempoASS(h.inicio)},${tiempoASS(h.inicio + h.duracion)},marca,,0,0,0,,${etiqueta}`;
  });

  const cierre = linea.cierre?.music_seconds > 0 ? linea.cierre.music_seconds : 0;
  if (cierre > 0) {
    eventos.push(
      `Dialogue: 0,${tiempoASS(linea.fin_narracion_s)},` +
        `${tiempoASS(linea.fin_narracion_s + cierre)},marca,,0,0,0,,cierre — ${cierre}s`
    );
  }

  return [...cabecera, ...eventos].join('\n') + '\n';
}

export async function generarRevision({
  audio, srt, timeline, salida, ancho = 1280, alto = 720, fps = 12,
}) {
  if (!existsSync(audio)) throw new Error(`No existe ${audio}`);
  if (!existsSync(srt)) throw new Error(`No existe ${srt}`);

  const ffmpeg = await rutaFfmpeg();
  const segundos = await duracionSegundos(audio);
  const dir = dirname(audio);

  // Subtitulos grandes y con borde grueso: esto se mira para juzgar CUANDO
  // aparece el texto, no para valorar la tipografia.
  const estilo = [
    'FontName=DejaVu Sans',
    'FontSize=26',
    'PrimaryColour=&H00FFFFFF',
    'OutlineColour=&H00000000',
    'BorderStyle=1',
    'Outline=3',
    'Shadow=0',
    'Alignment=2',
    'MarginV=70',
  ].join(',');

  const filtros = [`subtitles=${escapar(basename(srt))}:force_style='${estilo}'`];

  let marcas = 0;
  if (timeline?.huecos) {
    const ruta = join(dir, '.marcas.ass');
    writeFileSync(ruta, marcasDeInterludio(timeline, ancho, alto));
    marcas = (timeline.huecos.length ?? 0) + (timeline.cierre?.music_seconds > 0 ? 1 : 0);
    filtros.push(`ass=${escapar('.marcas.ass')}`);
  }

  await ejecutar(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-f', 'lavfi', '-i', `color=c=black:s=${ancho}x${alto}:r=${fps}`,
    '-i', basename(audio),
    '-vf', filtros.join(','),
    '-t', segundos.toFixed(3),
    // El fotograma es negro con texto encima: comprime a casi nada y no merece
    // la pena gastar CPU en afinarlo.
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    basename(salida),
  ], { cwd: dir });

  return { segundos, marcas };
}
