/**
 * Monta un Short vertical a partir del video largo, sin generar voz nueva.
 *
 * Tres piezas que tienen que cuadrar al milisegundo entre si:
 *
 *   - la VOZ se recorta del audio ya montado, tramo a tramo, sobre PCM. Sobre
 *     mp3 cada corte caeria al fotograma mas cercano del codificador y correria
 *     los subtitulos unos milisegundos en cada empalme.
 *   - la MUSICA se sintetiza de nuevo con el mismo generador aprobado. No se
 *     recorta del video largo: el Short quita tiempo por dentro al acortar los
 *     interludios, y empalmar dos trozos de una cama continua meteria un clic
 *     justo donde no hay voz que lo tape.
 *   - los SUBTITULOS salen de alignment.json ya trasladado al tiempo del
 *     Short, asi que siguen la misma fuente de sincronia que el video largo.
 *
 * La escena se adapta a 9:16 recortando, nunca deformando: se amplia hasta
 * cubrir el alto y se recorta el ancho alrededor del punto de interes.
 */

import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { rutaFfmpeg, ejecutar, duracionSegundos } from './audio.mjs';

/** Sobremuestreo antes del zoom, igual que en el renderer horizontal. */
const SOBREMUESTREO = 2;

/**
 * Pista de voz del Short: los tramos hablados recortados del audio original,
 * con silencio real donde el Short no lleva voz.
 */
export async function construirVoz({ audio, plan, salidaWav, tmp }) {
  mkdirSync(tmp, { recursive: true });
  const ffmpeg = await rutaFfmpeg();

  // El audio completo a PCM una sola vez: de ahi se recortan todos los tramos.
  const completo = join(tmp, 'completo.wav');
  await ejecutar(ffmpeg, [
    '-y', '-loglevel', 'error', '-i', audio,
    '-ar', '44100', '-ac', '2', '-c:a', 'pcm_s16le', completo,
  ]);

  const piezas = [];
  for (const [i, t] of plan.tramos.entries()) {
    if (t.duracionDestino <= 0) continue;
    const trozo = join(tmp, `v${String(i).padStart(3, '0')}.wav`);

    if (t.tipo === 'voz' || t.tipo === 'entrada' || t.tipo === 'salida') {
      await ejecutar(ffmpeg, [
        '-y', '-loglevel', 'error', '-i', completo,
        '-ss', t.origen.toFixed(4),
        '-t', t.duracionDestino.toFixed(4),
        '-c:a', 'pcm_s16le', trozo,
      ]);
    } else {
      // Silencio de verdad, no el trozo del original: ahi el video largo puede
      // llevar cola de reverberacion o el arranque del parrafo siguiente.
      await ejecutar(ffmpeg, [
        '-y', '-loglevel', 'error',
        '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
        '-t', t.duracionDestino.toFixed(4), '-c:a', 'pcm_s16le', trozo,
      ]);
    }
    piezas.push(trozo);
  }

  const lista = join(tmp, 'voz.txt');
  writeFileSync(lista, piezas.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  await ejecutar(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-f', 'concat', '-safe', '0', '-i', lista,
    '-c:a', 'pcm_s16le', salidaWav,
  ]);
  return { duracion: await duracionSegundos(salidaWav), piezas: piezas.length };
}

/**
 * Forma de la cama musical en el tiempo del Short.
 *
 * Los tramos sin voz —silencios internos y el cierre— se declaran como huecos,
 * asi que la cama se ABRE ahi igual que hace en los interludios del video
 * largo. Es el mismo comportamiento aprobado, aplicado a la nueva duracion.
 */
export function formaDelShort(plan, rampa) {
  const huecos = plan.tramos
    .filter((t) => (t.tipo === 'silencio' || t.tipo === 'cta') && t.duracionDestino > 0)
    .map((t) => ({ inicio: t.destino, duracion: t.duracionDestino }));

  const ultimaVoz = [...plan.tramos].reverse().find((t) => t.tipo === 'voz');
  return {
    huecos,
    finNarracion: ultimaVoz ? ultimaVoz.destino + ultimaVoz.duracionDestino : plan.duracion,
    rampa,
  };
}

const centesimas = (s) => {
  const t = Math.max(0, s);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const seg = Math.floor(t % 60);
  const cs = Math.round((t - Math.floor(t)) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(seg).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
};

const escaparAss = (t) => t.replace(/\\/g, '\\\\').replace(/\{/g, '(').replace(/\}/g, ')');

/**
 * Subtitulos quemados y rotulo de cierre, como pista ASS.
 *
 * Se usa ASS y no drawtext porque el build de ffmpeg-static no trae drawtext;
 * libass sí va, y ademas respeta los acentos sin pelearse con el escapado.
 *
 * El texto se reparte en lineas cortas y se limita a `maxLineas`: en vertical
 * el ancho util es poco mas de la mitad que en horizontal, y una linea larga
 * se lee peor que dos cortas.
 */
export function construirAss({
  cues, cta, ancho, alto, tamano = 76, maxCaracteresLinea = 24, maxLineas = 3,
  tamanoCta = 62, maxCaracteresCta = 22,
}) {
  const cabecera = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${ancho}`,
    `PlayResY: ${alto}`,
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, ' +
      'Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, ' +
      'Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    // Blanco con contorno negro grueso: el fondo es un cielo nocturno con
    // motas claras, y sin contorno el texto se pierde justo donde pasa una.
    `Style: Voz,DejaVu Sans,${tamano},&H00FFFFFF,&H00FFFFFF,&HC8000000,&H00000000,` +
      `-1,0,0,0,100,100,0,0,1,5,0,2,60,60,${Math.round(alto * 0.16)},1`,
    `Style: Cta,DejaVu Sans,${tamanoCta},&H00FFFFFF,&H00FFFFFF,&HC8000000,&H00000000,` +
      `-1,0,0,0,100,100,2,0,1,5,0,5,60,60,0,1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];

  // Cada linea se escapa POR SEPARADO y solo despues se unen con \\N. Al reves,
  // el escapado convertiria el propio separador en una barra literal y el
  // subtitulo saldria con un "\\" impreso al final de cada linea.
  const eventos = cues.map((c) => {
    const texto = repartirLineas(c.texto, maxCaracteresLinea, maxLineas)
      .map(escaparAss).join('\\N');
    return `Dialogue: 0,${centesimas(c.inicio)},${centesimas(c.fin)},Voz,,0,0,0,,${texto}`;
  });

  if (cta && cta.lineas?.length) {
    // El rotulo tambien se reparte: en vertical el ancho util son unos 960 px
    // y una linea de treinta y cuatro caracteres a este cuerpo se sale del
    // cuadro por los dos lados sin avisar de nada.
    const texto = cta.lineas
      .flatMap((l) => repartirLineas(l, maxCaracteresCta, 2))
      .map(escaparAss)
      .join('\\N');
    // Aparece con un fundido corto: un rotulo que entra de golpe rompe la
    // calma de todo lo anterior.
    eventos.push(
      `Dialogue: 0,${centesimas(cta.inicio)},${centesimas(cta.fin)},Cta,,0,0,0,` +
        `,{\\fad(500,300)}${texto}`
    );
  }

  return [...cabecera, ...eventos].join('\n') + '\n';
}

/** Reparte un texto en lineas cortas sin partir palabras. */
export function repartirLineas(texto, maxLinea, maxLineas) {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = '';
  for (const p of palabras) {
    const tentativo = actual ? `${actual} ${p}` : p;
    if (actual && tentativo.length > maxLinea) {
      lineas.push(actual);
      actual = p;
    } else {
      actual = tentativo;
    }
  }
  if (actual) lineas.push(actual);

  // Si se pasa de lineas, se reparte a partes iguales en las que caben: es
  // preferible una linea algo mas larga que perder texto por el camino.
  if (lineas.length > maxLineas) {
    const porLinea = Math.ceil(palabras.length / maxLineas);
    const rehecho = [];
    for (let i = 0; i < palabras.length; i += porLinea) {
      rehecho.push(palabras.slice(i, i + porLinea).join(' '));
    }
    return rehecho.slice(0, maxLineas);
  }
  return lineas;
}

/**
 * Render final del Short.
 *
 * La escena se amplia hasta cubrir el alto de salida y se recorta el ancho
 * alrededor del punto de interes: se pierde encuadre a los lados, que es lo
 * que toca, pero ni un pixel se estira. El recorte se hace ANTES del zoom para
 * que zoompan trabaje ya con la proporcion final; si no, escalaria una region
 * 16:9 a un lienzo 9:16 y deformaria la imagen.
 */
export async function renderizarShort({
  imagen, particulas, voz, musica, ass, salida,
  ancho = 1080, alto = 1920, fps = 30,
  zoomTotal = 0.05, foco = { x: 0.58, y: 0.42 },
  crf = 20, preset = 'medium', duracion,
}) {
  const ffmpeg = await rutaFfmpeg();
  const grande = join(salida, '..', '.escena-vertical.png');

  const altoGrande = alto * SOBREMUESTREO;
  const anchoRecorte = Math.round((altoGrande * ancho) / alto / 2) * 2;

  await ejecutar(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-i', imagen,
    '-vf',
      `scale=-2:${altoGrande}:flags=lanczos,` +
      `crop=${anchoRecorte}:${altoGrande}:(iw-${anchoRecorte})*${foco.x}:0,setsar=1`,
    grande,
  ]);

  const totalFotogramas = Math.max(1, Math.round(duracion * fps));
  const z = `1+${zoomTotal}*on/${Math.max(1, totalFotogramas - 1)}`;

  const filtros = [
    `[0:v]zoompan=z='${z}':x='(iw-iw/zoom)*0.5':y='(ih-ih/zoom)*${foco.y}':` +
      `d=${totalFotogramas}:s=${ancho}x${alto}:fps=${fps}[escena]`,
    `[1:v]scale=${ancho}:${alto},format=rgba[motas]`,
    `[escena][motas]overlay=0:0:format=auto,gradfun=strength=1.2:radius=16,format=yuv420p[vid]`,
    `[vid]subtitles=${ass.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'")}[vsub]`,
    `[2:a][3:a]amix=inputs=2:duration=first:normalize=0[aud]`,
  ];

  await ejecutar(ffmpeg, [
    '-y', '-loglevel', 'error', '-stats',
    '-i', grande,
    '-stream_loop', '-1', '-i', particulas,
    '-i', voz,
    '-i', musica,
    '-filter_complex', filtros.join(';'),
    '-map', '[vsub]', '-map', '[aud]',
    '-t', duracion.toFixed(3),
    '-c:v', 'libx264', '-preset', preset, '-crf', String(crf),
    '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '192k', '-ar', '44100',
    '-movflags', '+faststart',
    salida,
  ]);

  rmSync(grande, { force: true });
  return { duracion };
}
