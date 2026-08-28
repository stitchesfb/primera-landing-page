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
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { rutaFfmpeg, ejecutar, duracionSegundos } from './audio.mjs';

/** Sobremuestreo antes del zoom, igual que en el renderer horizontal. */
const SOBREMUESTREO = 2;

/**
 * Pista de voz del Short: los tramos hablados recortados del audio original,
 * con silencio real donde el Short no lleva voz.
 *
 * Corta por PIEZAS CONTINUAS, no parrafo a parrafo. Un tramo de voz y las
 * pausas normales entre parrafos (sin acortar, sin insertar) son, en el
 * audio fuente, un unico trozo ininterrumpido: cortarlos por separado y
 * rellenar cada hueco con anullsrc tira la ambiencia/respiracion real de esa
 * pausa (medida en video_005: -32.6 dB, nada que ver con los -91 dB de un
 * silencio digital) y la sustituye por silencio absoluto — eso es lo que
 * suena a cinta detenida y vuelta a arrancar en cada union de parrafo. Aqui
 * solo se abre un corte de verdad donde hay una discontinuidad real: una
 * pausa insertada a proposito (Short multi-tramo), un interludio real
 * acortado, o el cierre. Dentro de cada pieza no hay fundidos ni reinicios;
 * el PTS solo se reinicia al empezar cada pieza.
 */
export async function construirVoz({ audio, plan, salidaWav, tmp, microfundeMs = 8 }) {
  mkdirSync(tmp, { recursive: true });
  const ffmpeg = await rutaFfmpeg();

  // El audio completo a PCM una sola vez: de ahi se recorta cada pieza.
  const completo = join(tmp, 'completo.wav');
  await ejecutar(ffmpeg, [
    '-y', '-loglevel', 'error', '-i', audio,
    '-ar', '44100', '-ac', '2', '-c:a', 'pcm_s16le', completo,
  ]);

  // Agrupa los tramos en bloques: 'audio' para cada tramo de voz/entrada/
  // salida y cada silencio real sin acortar que en el audio fuente es
  // continuo con el anterior (mismo origen+duracion enlazando exacto);
  // 'silencio' para lo que de verdad es una discontinuidad (pausa
  // insertada, interludio acortado, cierre).
  const bloques = [];
  for (const t of plan.tramos) {
    if (t.duracionDestino <= 0) continue;
    const esContinuo = t.tipo === 'entrada' || t.tipo === 'voz' || t.tipo === 'salida' ||
      (t.tipo === 'silencio' && !t.insertado && !t.esInterludio);
    const ultimo = bloques.at(-1);
    if (esContinuo) {
      if (ultimo?.tipo === 'audio' && Math.abs(ultimo.origen + ultimo.duracion - t.origen) < 1e-6) {
        ultimo.duracion += t.duracionDestino;
      } else {
        bloques.push({ tipo: 'audio', origen: t.origen, duracion: t.duracionDestino });
      }
    } else {
      const insertado = t.tipo === 'silencio' && t.insertado === true;
      if (ultimo?.tipo === 'silencio') {
        ultimo.duracion += t.duracionDestino;
        ultimo.insertado = ultimo.insertado || insertado;
      } else {
        bloques.push({ tipo: 'silencio', duracion: t.duracionDestino, insertado });
      }
    }
  }

  const piezas = [];
  for (const [i, b] of bloques.entries()) {
    const trozo = join(tmp, `b${String(i).padStart(3, '0')}.wav`);

    if (b.tipo === 'silencio') {
      await ejecutar(ffmpeg, [
        '-y', '-loglevel', 'error',
        '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
        '-t', b.duracion.toFixed(4), '-c:a', 'pcm_s16le', trozo,
      ]);
      piezas.push(trozo);
      continue;
    }

    // Extraccion continua unica de la pieza completa: PTS a cero al
    // empezar, nada por dentro.
    await ejecutar(ffmpeg, [
      '-y', '-loglevel', 'error', '-i', completo,
      '-ss', b.origen.toFixed(4), '-t', b.duracion.toFixed(4),
      '-c:a', 'pcm_s16le', trozo,
    ]);

    // Microfundido SOLO en los bordes que tocan una pausa insertada a
    // proposito (el empalme especial de un Short multi-tramo, p.ej. el
    // hueco entre los dos tramos del short_01): protege de un clic sin
    // tocar nada entre parrafos internos, que ya viven dentro de la misma
    // pieza y no se cortan por separado.
    const antes = bloques[i - 1];
    const despues = bloques[i + 1];
    const fadeInMs = antes?.tipo === 'silencio' && antes.insertado ? microfundeMs : 0;
    const fadeOutMs = despues?.tipo === 'silencio' && despues.insertado ? microfundeMs : 0;

    if (fadeInMs > 0 || fadeOutMs > 0) {
      // Dos pases, no uno: combinar -ss/-t de entrada grande con -af en el
      // mismo comando corrompe "st" de afade cuando la pieza arranca lejos
      // del principio del archivo (ver test/montaje-tramos.test.mjs). El
      // fundido va sobre el archivo YA extraido (PTS en 0), con la duracion
      // medida de verdad.
      const durReal = await duracionSegundos(trozo);
      const filtros = [];
      if (fadeInMs > 0) filtros.push(`afade=t=in:st=0:d=${(fadeInMs / 1000).toFixed(4)}`);
      if (fadeOutMs > 0) {
        const inicio = Math.max(0, durReal - fadeOutMs / 1000);
        filtros.push(`afade=t=out:st=${inicio.toFixed(4)}:d=${(fadeOutMs / 1000).toFixed(4)}`);
      }
      const conFundido = join(tmp, `b${String(i).padStart(3, '0')}-fundido.wav`);
      await ejecutar(ffmpeg, [
        '-y', '-loglevel', 'error', '-i', trozo,
        '-af', filtros.join(','), '-c:a', 'pcm_s16le', conFundido,
      ]);
      piezas.push(conFundido);
    } else {
      piezas.push(trozo);
    }
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


// --- medida real del texto -------------------------------------------------
//
// Repartir las lineas contando CARACTERES es una aproximacion que falla: una
// "i" y una "m" ocupan lo mismo en la cuenta y no en pantalla. Con 24
// caracteres por linea, "sino" se salia por el borde derecho en el segundo 20
// del primer Short — la mitad de la "o" quedaba fuera del cuadro.
//
// Aqui el ancho no se estima: se dibuja la linea con el mismo libass que hara
// el render y se mide la tinta. Lo que se mide es exactamente lo que se ve,
// contorno incluido.

const ALTO_MEDIDA = 240;

/** Como ejecutar(), pero devuelve los bytes de salida en vez de texto. */
function ejecutarBinario(bin, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const trozos = [];
    let error = '';
    p.stdout.on('data', (d) => trozos.push(d));
    p.stderr.on('data', (d) => (error += d));
    p.on('error', reject);
    p.on('close', (codigo) => {
      if (codigo === 0) resolve(Buffer.concat(trozos));
      else reject(new Error(`${bin} salio con codigo ${codigo}:\n${error.slice(-1500)}`));
    });
  });
}

/** Recuadro con tinta en un fotograma en escala de grises, y que filas la tienen. */
function extremosConTinta(gris, ancho, alto, umbral = 24) {
  let izq = -1;
  let der = -1;
  let arriba = -1;
  let abajo = -1;
  const filasConTinta = new Uint8Array(alto);
  for (let y = 0; y < alto; y++) {
    const fila = y * ancho;
    for (let x = 0; x < ancho; x++) {
      if (gris[fila + x] <= umbral) continue;
      filasConTinta[y] = 1;
      if (izq === -1 || x < izq) izq = x;
      if (x > der) der = x;
      if (arriba === -1) arriba = y;
      abajo = y;
    }
  }
  return izq === -1
    ? null
    : { izq, der, ancho: der - izq + 1, arriba, abajo, filasConTinta };
}

/**
 * Medidor de anchos con cache.
 *
 * Cada medida es un fotograma de 1080x240 dibujado por libass y leido en crudo:
 * sin descodificar PNG, sin dependencias, y con la misma fuente, cuerpo,
 * negrita y contorno que llevara el subtitulo final.
 */
export function crearMedidor({ ancho = 1080, tmp, fuente = 'DejaVu Sans', contorno = 5 }) {
  mkdirSync(tmp, { recursive: true });
  const cache = new Map();
  let medidas = 0;

  const medir = async (texto, tamano) => {
    const clave = `${tamano}|${texto}`;
    if (cache.has(clave)) return cache.get(clave);

    const ffmpeg = await rutaFfmpeg();
    const ass = join(tmp, 'medida.ass');
    writeFileSync(ass, [
      '[Script Info]', 'ScriptType: v4.00+', `PlayResX: ${ancho}`, `PlayResY: ${ALTO_MEDIDA}`,
      'WrapStyle: 2', 'ScaledBorderAndShadow: yes', '',
      '[V4+ Styles]',
      'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, ' +
        'Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, ' +
        'Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
      `Style: M,${fuente},${tamano},&H00FFFFFF,&H00FFFFFF,&HC8000000,&H00000000,` +
        `-1,0,0,0,100,100,0,0,1,${contorno},0,5,0,0,0,1`,
      '', '[Events]',
      'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
      // Sin margenes y centrado en un lienzo ancho: si la linea se pasara del
      // lienzo la medida mentiria, asi que el lienzo es el ancho real de salida
      // y lo que se comprueba es si la tinta cabe dentro del area segura.
      `Dialogue: 0,0:00:00.00,0:00:05.00,M,,0,0,0,,{\\an5\\pos(${ancho / 2},${ALTO_MEDIDA / 2})}` +
        escaparAss(texto),
    ].join('\n') + '\n');

    const crudo = await ejecutarBinario(ffmpeg, [
      '-v', 'error',
      '-f', 'lavfi', '-i', `color=c=black:s=${ancho}x${ALTO_MEDIDA}:d=1`,
      '-vf', `subtitles=${ass.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'")}`,
      '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-',
    ]);

    const ext = extremosConTinta(crudo, ancho, ALTO_MEDIDA);
    const w = ext ? ext.ancho : 0;
    // Si la tinta toca los bordes del lienzo, la linea es MAS ancha que el
    // lienzo y la medida se queda corta. Se devuelve infinito para que quien
    // reparta las lineas la rechace en vez de darla por buena.
    const valor = ext && (ext.izq <= 0 || ext.der >= ancho - 1) ? Infinity : w;
    cache.set(clave, valor);
    medidas++;
    return valor;
  };

  medir.estadisticas = () => ({ medidas, distintas: cache.size });
  return medir;
}

/**
 * Reparte un texto en lineas que caben de verdad en el ancho seguro.
 *
 * Si con el cuerpo pedido no hay forma de que quepa en `maxLineas`, se baja el
 * cuerpo por pasos antes que dejar que algo se salga. Reducir el tamano tiene
 * limite: por debajo de `tamanoMin` se prefiere una linea de mas a un texto
 * que no se lee en un movil.
 */
export async function disponerTexto({
  texto, medir, anchoSeguro, tamano, tamanoMin = tamano - 16, maxLineas = 3,
}) {
  for (let t = tamano; t >= tamanoMin; t -= 4) {
    const lineas = await envolver(texto, anchoSeguro, medir, t);
    if (lineas && lineas.length <= maxLineas) return { lineas, tamano: t, reducido: t < tamano };
  }
  const lineas = (await envolver(texto, anchoSeguro, medir, tamanoMin)) ?? [texto];
  return { lineas, tamano: tamanoMin, reducido: true, desbordado: lineas.length > maxLineas };
}

// Dos pixeles que no se reparten.
//
// La medida centra la linea en el lienzo y lee la tinta; el render la centra
// dentro del area segura. Los dos centran igual, pero el centrado va por el
// ANCHO DE AVANCE de los glifos y la tinta no es simetrica respecto a el: los
// laterales de la primera y la ultima letra no valen lo mismo. Una linea que
// mide justo el ancho seguro puede caer un pixel a la izquierda al dibujarse.
//
// Paso con «todo terminará mal, ayúdame» a cuerpo 64: 920px clavados, o sea
// exactamente el ancho seguro, y en pantalla la tinta iba de 79 a 998 con el
// area en 80-1000. El repartidor la daba por buena —920 no es mayor que 920— y
// la cazaba despues el validador, ya con el Short maquetado.
//
// La reserva se pone aqui, en quien decide, y no en quien comprueba: el
// validador tiene que seguir midiendo contra el area de verdad, porque es la
// unica red que queda si esta cuenta se vuelve a quedar corta.
const GUARDA_CENTRADO = 2;

/** Devuelve null si alguna linea sigue sin caber ni partiendo por palabras. */
async function envolver(texto, anchoSeguro, medir, tamano) {
  const limite = anchoSeguro - GUARDA_CENTRADO;
  const palabras = texto.split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = '';

  for (const palabra of palabras) {
    const tentativo = actual ? `${actual} ${palabra}` : palabra;
    if (actual && (await medir(tentativo, tamano)) > limite) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = tentativo;
    }
  }
  if (actual) lineas.push(actual);

  for (const linea of lineas) {
    if ((await medir(linea, tamano)) > limite) return null;
  }
  return lineas;
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
  cues, cta, gancho, ancho, alto, fuente = 'DejaVu Sans', contorno = 5, margen = 80,
  bandaVoz = 0.16, bandaCta = 0.19, bandaGancho = 0.07,
}) {
  const estilo = (nombre, tamano, alineacion, margenV) =>
    `Style: ${nombre},${fuente},${tamano},&H00FFFFFF,&H00FFFFFF,&HC8000000,&H00000000,` +
    `-1,0,0,0,100,100,0,0,1,${contorno},0,${alineacion},${margen},${margen},${margenV},1`;

  const cabecera = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${ancho}`,
    `PlayResY: ${alto}`,
    // WrapStyle 2 = sin reparto automatico. Las lineas ya vienen repartidas
    // por ancho medido; dejar que libass parta por su cuenta desharia justo el
    // trabajo que garantiza que nada se salga.
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, ' +
      'Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, ' +
      'Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    // Blanco con contorno negro grueso: el fondo es una escena nocturna con
    // zonas claras, y sin contorno el texto se pierde justo donde cae una.
    estilo('Voz', 76, 2, Math.round(alto * bandaVoz)),
    // El cierre tambien va anclado abajo, no centrado. Centrado cae sobre las
    // caras de la escena; abajo se apoya en la manta, que es la zona vacia, y
    // ademas repite el sitio donde el espectador ya venia leyendo.
    estilo('Cta', 62, 2, Math.round(alto * bandaCta)),
    // El gancho va anclado ARRIBA (alineacion 8), en la franja de cielo y
    // cortina. Es la unica zona ancha de esta escena sin una cara debajo, y
    // ademas deja el tercio inferior libre para los subtitulos, que empiezan
    // casi a la vez.
    estilo('Gancho', 96, 8, Math.round(alto * bandaGancho)),
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];

  // Cada linea se escapa POR SEPARADO y solo despues se unen con \\N. Al reves,
  // el escapado convertiria el propio separador en una barra literal y el
  // subtitulo saldria con un "\\" impreso al final de cada linea.
  const componer = (lineas) => lineas.map(escaparAss).join('\\N');

  const eventos = cues.map((c) =>
    `Dialogue: 0,${centesimas(c.inicio)},${centesimas(c.fin)},Voz,,0,0,0,,` +
    `{\\fs${c.tamano}}${componer(c.lineas)}`
  );

  if (gancho?.lineas?.length) {
    // Aparece en el fotograma cero, sin fundido de entrada: si tarda medio
    // segundo en verse, ya no es un gancho. Se va con un fundido corto para no
    // desaparecer de golpe mientras el espectador todavia lo esta leyendo.
    eventos.push(
      `Dialogue: 0,${centesimas(gancho.inicio)},${centesimas(gancho.fin)},Gancho,,0,0,0,,` +
      `{\\fad(0,350)\\fs${gancho.tamano}}${componer(gancho.lineas)}`
    );
  }

  if (cta?.lineas?.length) {
    // Aparece con un fundido corto: un rotulo que entra de golpe rompe la
    // calma de todo lo anterior.
    eventos.push(
      `Dialogue: 0,${centesimas(cta.inicio)},${centesimas(cta.fin)},Cta,,0,0,0,,` +
      `{\\fad(500,300)\\fs${cta.tamano}}${componer(cta.lineas)}`
    );
  }

  return [...cabecera, ...eventos].join('\n') + '\n';
}

/**
 * Comprueba que el gancho y los subtitulos no se pisen en pantalla.
 *
 * En un Short el gancho tiene que entrar en el fotograma cero, y ahi la voz ya
 * esta hablando: los dos rotulos conviven durante un par de segundos. Que no
 * "interfieran" no es que no coincidan en el tiempo —no pueden—, es que ocupen
 * franjas distintas del cuadro con aire de sobra entre ellas.
 *
 * Se dibuja el fotograma y se miran las filas con tinta: tiene que haber un
 * corredor vacio entre el bloque de arriba y el de abajo.
 */
export async function validarSeparacion({ ass, ancho, alto, momento, huecoMinimo = 120 }) {
  const ffmpeg = await rutaFfmpeg();
  const crudo = await ejecutarBinario(ffmpeg, [
    '-v', 'error',
    '-f', 'lavfi', '-i', `color=c=black:s=${ancho}x${alto}:d=${(momento + 2).toFixed(2)}`,
    '-vf', `subtitles=${escaparRuta(ass)}`,
    '-ss', momento.toFixed(3), '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-',
  ]);
  const ext = extremosConTinta(crudo, ancho, alto);
  if (!ext) return { ok: false, hueco: 0, motivo: `no se dibuja nada en ${momento.toFixed(2)}s` };

  // El corredor vacio mas ancho entre la primera y la ultima fila con tinta.
  let mejor = 0;
  let corriendo = 0;
  let finMejor = -1;
  for (let y = ext.arriba; y <= ext.abajo; y++) {
    if (ext.filasConTinta[y]) {
      if (corriendo > mejor) { mejor = corriendo; finMejor = y; }
      corriendo = 0;
    } else {
      corriendo++;
    }
  }
  if (mejor === 0) {
    return {
      ok: false, hueco: 0,
      motivo: `en ${momento.toFixed(2)}s solo hay un bloque de texto, de la fila ${ext.arriba} a la ${ext.abajo}`,
    };
  }
  return {
    ok: mejor >= huecoMinimo,
    hueco: mejor,
    arriba: ext.arriba,
    abajo: ext.abajo,
    corte: finMejor - mejor,
    motivo: mejor >= huecoMinimo
      ? null
      : `en ${momento.toFixed(2)}s solo quedan ${mejor}px entre el gancho y el subtitulo, hacen falta ${huecoMinimo}`,
  };
}


/**
 * Comprueba sobre el ARCHIVO ASS ya escrito que nada se sale del area segura.
 *
 * Medir al repartir las lineas y validar al final no es lo mismo: entre una
 * cosa y otra estan el escapado, la union con \\N, los estilos y las anulaciones
 * en linea. Esto dibuja cada rotulo tal y como quedara en el video y mira donde
 * cae la tinta de verdad.
 */
export async function validarOverflow({ ass, cues, cta, gancho, ancho, alto, margen }) {
  const ffmpeg = await rutaFfmpeg();
  const rotulos = [...cues.map((c, i) => ({ etiqueta: `subtitulo ${i + 1}`, ...c }))];
  if (cta?.lineas?.length) rotulos.push({ etiqueta: 'cierre', ...cta });
  if (gancho?.lineas?.length) rotulos.push({ etiqueta: 'gancho', ...gancho });

  const problemas = [];
  for (const r of rotulos) {
    // A mitad del rotulo: fuera de cualquier fundido de entrada o salida.
    const t = (r.inicio + r.fin) / 2;
    const crudo = await ejecutarBinario(ffmpeg, [
      '-v', 'error',
      '-f', 'lavfi', '-i', `color=c=black:s=${ancho}x${alto}:d=${(r.fin + 1).toFixed(2)}`,
      '-vf', `subtitles=${ass.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'")}`,
      '-ss', t.toFixed(3), '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-',
    ]);
    const ext = extremosConTinta(crudo, ancho, alto);
    if (!ext) {
      problemas.push(`${r.etiqueta}: no se dibuja nada en ${t.toFixed(2)}s`);
      continue;
    }
    if (ext.izq < margen || ext.der > ancho - margen) {
      problemas.push(
        `${r.etiqueta} (${t.toFixed(2)}s): la tinta va de ${ext.izq} a ${ext.der}, ` +
        `fuera del area segura ${margen}-${ancho - margen} — «${r.lineas.join(' / ')}»`
      );
    }
  }
  return problemas;
}

export async function fotogramasShort({
  imagen, particulas, ass, salidaPatron, momentos,
  ancho = 1080, alto = 1920, fps = 30,
  zoomTotal = 0.05, foco = { x: 0.58, y: 0.42 }, duracion, recortar = true,
}) {
  const ffmpeg = await rutaFfmpeg();
  const grande = await prepararEscena({ imagen, ffmpeg, ancho, alto, foco, recortar, salidaPatron });

  const totalFotogramas = Math.max(1, Math.round(duracion * fps));
  const z = `1+${zoomTotal}*on/${Math.max(1, totalFotogramas - 1)}`;
  const numeros = momentos.map((t) => Math.min(totalFotogramas - 1, Math.round(t * fps)));
  const seleccion = numeros.map((n) => `eq(n\\,${n})`).join('+');

  await ejecutar(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-i', grande,
    '-stream_loop', '-1', '-i', particulas,
    '-filter_complex',
      `[0:v]zoompan=z='${z}':x='(iw-iw/zoom)*0.5':y='(ih-ih/zoom)*${foco.y}':` +
        `d=${totalFotogramas}:s=${ancho}x${alto}:fps=${fps}[escena];` +
      `[1:v]scale=${ancho}:${alto},format=rgba[motas];` +
      `[escena][motas]overlay=0:0:format=auto,gradfun=strength=1.2:radius=16,format=yuv420p[vid];` +
      `[vid]subtitles=${escaparRuta(ass)}[vsub];` +
      `[vsub]select='${seleccion}'[sel]`,
    '-map', '[sel]', '-vsync', '0', '-frames:v', String(numeros.length),
    salidaPatron,
  ]);

  rmSync(grande, { force: true });
  return { momentos, numeros };
}

const escaparRuta = (r) => r.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");

/**
 * Deja la escena lista para el zoom, a la proporcion de salida.
 *
 * Una imagen compuesta ya en 9:16 se usa entera: ampliar y recortar no le
 * quitaria nada, pero conviene decirlo en vez de que el recorte de cero salga
 * por casualidad. Una horizontal sí se amplia hasta cubrir el alto y se recorta
 * el ancho alrededor del punto de interes: se pierde encuadre a los lados, que
 * es lo que toca, pero ni un pixel se estira.
 */
async function prepararEscena({ imagen, ffmpeg, ancho, alto, foco, recortar, salidaPatron }) {
  const grande = join(dirname(salidaPatron), '.escena-vertical.png');
  const altoGrande = alto * SOBREMUESTREO;
  const anchoRecorte = Math.round((altoGrande * ancho) / alto / 2) * 2;

  await ejecutar(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-i', imagen,
    '-vf',
      `scale=-2:${altoGrande}:flags=lanczos,` +
      `crop=${anchoRecorte}:${altoGrande}:(iw-${anchoRecorte})*${recortar ? foco.x : 0.5}:0,setsar=1`,
    grande,
  ]);
  return grande;
}

export async function renderizarShort({
  imagen, particulas, voz, musica, ass, salida,
  ancho = 1080, alto = 1920, fps = 30,
  zoomTotal = 0.05, foco = { x: 0.58, y: 0.42 },
  crf = 20, preset = 'medium', duracion, recortar = true,
}) {
  const ffmpeg = await rutaFfmpeg();
  const grande = await prepararEscena({
    imagen, ffmpeg, ancho, alto, foco, recortar, salidaPatron: salida,
  });

  const totalFotogramas = Math.max(1, Math.round(duracion * fps));
  const z = `1+${zoomTotal}*on/${Math.max(1, totalFotogramas - 1)}`;

  const filtros = [
    `[0:v]zoompan=z='${z}':x='(iw-iw/zoom)*0.5':y='(ih-ih/zoom)*${foco.y}':` +
      `d=${totalFotogramas}:s=${ancho}x${alto}:fps=${fps}[escena]`,
    `[1:v]scale=${ancho}:${alto},format=rgba[motas]`,
    `[escena][motas]overlay=0:0:format=auto,gradfun=strength=1.2:radius=16,format=yuv420p[vid]`,
    `[vid]subtitles=${escaparRuta(ass)}[vsub]`,
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
