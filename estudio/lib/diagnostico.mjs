/**
 * Por que un MP4 valido puede no arrancar en un reproductor web.
 *
 * Un archivo puede estar perfectamente bien formado, decodificar entero y aun
 * asi dejar al reproductor girando en 0:00. Las causas viven en el contenedor,
 * no en los flujos: el indice detras de los datos, una lista de edicion que
 * desplaza el arranque, un primer paquete que no es fotograma llave, marcas de
 * tiempo que empiezan en negativo o pistas que no arrancan a la vez.
 *
 * Esto reune esas medidas y senala las que se salen de lo esperado. No repara
 * nada: primero hay que saber que pasa.
 */

import { spawn } from 'node:child_process';
import { rutaFfmpeg, rutaFfprobe } from './audio.mjs';
import { cajasSuperiores, leerFtyp, analizarMoov } from './mp4.mjs';

function correr(bin, args) {
  return new Promise((resolve) => {
    const p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let salida = '';
    let error = '';
    p.stdout.on('data', (d) => (salida += d));
    p.stderr.on('data', (d) => (error += d));
    p.on('error', (e) => resolve({ codigo: -1, salida, error: String(e) }));
    p.on('close', (codigo) => resolve({ codigo, salida, error }));
  });
}

export async function sondearFlujos(ruta) {
  const ffprobe = await rutaFfprobe();
  const { salida } = await correr(ffprobe, [
    '-v', 'error', '-show_format', '-show_streams', '-of', 'json', ruta,
  ]);
  return JSON.parse(salida || '{}');
}

/** Primeros paquetes de un flujo: donde se ve si los tiempos arrancan bien. */
export async function primerosPaquetes(ruta, flujo, cuantos = 12) {
  const ffprobe = await rutaFfprobe();
  const { salida } = await correr(ffprobe, [
    '-v', 'error', '-select_streams', flujo,
    '-show_entries', 'packet=pts,pts_time,dts,dts_time,duration,flags,size',
    '-read_intervals', `%+#${cuantos}`, '-of', 'json', ruta,
  ]);
  return JSON.parse(salida || '{}').packets ?? [];
}

/**
 * Prueba de decodificacion en una ventana, como la haria un reproductor:
 * busqueda rapida y a decodificar. Devuelve cuantos fotogramas salieron.
 */
export async function pruebaDecodificacion(ruta, { desde = 0, segundos = 5 } = {}) {
  const ffmpeg = await rutaFfmpeg();
  const args = ['-v', 'error', '-stats'];
  if (desde > 0) args.push('-ss', String(desde));
  args.push('-i', ruta, '-t', String(segundos), '-f', 'null', '-');
  const t0 = Date.now();
  const { codigo, error } = await correr(ffmpeg, args);
  const fot = [...error.matchAll(/frame=\s*(\d+)/g)].pop();
  const problemas = error
    .split('\n')
    .filter((l) => l.trim() && !/^frame=|^\s*$|^video:|^size=/.test(l))
    .slice(0, 6);
  return {
    desde, segundos, ok: codigo === 0,
    fotogramas: fot ? Number(fot[1]) : 0,
    ms: Date.now() - t0,
    problemas,
  };
}

/** Decodifica el archivo entero buscando paquetes corruptos. */
export async function decodificarTodo(ruta) {
  const ffmpeg = await rutaFfmpeg();
  const t0 = Date.now();
  const { codigo, error } = await correr(ffmpeg, ['-v', 'error', '-stats', '-i', ruta, '-f', 'null', '-']);
  const fot = [...error.matchAll(/frame=\s*(\d+)/g)].pop();
  const errores = error.split('\n').filter((l) => l.trim() && !/^frame=|^video:|^size=/.test(l));
  return {
    ok: codigo === 0 && errores.length === 0,
    fotogramas: fot ? Number(fot[1]) : 0,
    segundos: (Date.now() - t0) / 1000,
    errores: errores.slice(0, 10),
  };
}

/**
 * Reune contenedor y flujos y devuelve las anomalias encontradas.
 *
 * Cada anomalia trae `grave: true` si por si sola puede impedir el arranque,
 * y `flags` con lo que haria falta anadir al remux para corregirla.
 */
export async function diagnosticar(ruta) {
  const sup = cajasSuperiores(ruta);
  const ftyp = leerFtyp(ruta);
  const moov = analizarMoov(ruta);
  const probe = await sondearFlujos(ruta);

  const video = (probe.streams ?? []).find((s) => s.codec_type === 'video');
  const audio = (probe.streams ?? []).find((s) => s.codec_type === 'audio');
  const paqVideo = await primerosPaquetes(ruta, 'v:0');
  const paqAudio = await primerosPaquetes(ruta, 'a:0');

  const anomalias = [];
  const notas = [];
  const senal = (grave, texto, flags = []) => anomalias.push({ grave, texto, flags });

  // 1. Indice delante de los datos. Sin esto un reproductor web tiene que
  //    descargar el archivo entero antes de poder empezar.
  const iMoov = sup.cajas.findIndex((c) => c.tipo === 'moov');
  const iMdat = sup.cajas.findIndex((c) => c.tipo === 'mdat');
  if (iMoov === -1 || iMdat === -1) {
    senal(true, 'Falta moov o mdat en el primer nivel del contenedor');
  } else if (iMoov > iMdat) {
    senal(true, `moov va DESPUES de mdat (offset ${sup.cajas[iMoov].offset} contra ${sup.cajas[iMdat].offset}): ` +
      'el reproductor no puede empezar hasta bajar el archivo entero', ['-movflags +faststart']);
  }

  // 2. Listas de edicion.
  //
  //    CASI TODAS SON NORMALES, y confundirlas con un defecto es la forma mas
  //    facil de "arreglar" un archivo sano hasta romperlo. Los dos casos
  //    corrientes son compensaciones de retardo del codificador:
  //
  //      - video con fotogramas B: el primer DTS es negativo para que el primer
  //        PTS sea 0, y la lista de edicion recorta ese adelanto. Con 3
  //        fotogramas B y base 1/15360 a 30 fps son 1024 unidades: 67 ms.
  //      - audio AAC: ~1024 muestras de precarga, 23 ms a 44,1 kHz.
  //
  //    Lo que sí desplaza el arranque de verdad es un hueco vacio (media_time
  //    -1) o un recorte que no se explica por el retardo del codec.
  const RETARDO_MAXIMO_S = 0.5;
  for (const p of moov.pistas) {
    if (!p.edicion || p.edicion.length === 0) continue;
    for (const [i, e] of p.edicion.entries()) {
      if (e.tiempoMedio === -1) {
        const hueco = e.duracion / (moov.mvhd?.escala ?? 1000);
        senal(true, `pista ${p.id} (${p.tipo}): la lista de edicion abre con un hueco vacio ` +
          `de ${hueco.toFixed(3)}s, que retrasa la pista frente a la otra`, ['-ignore_editlist 1']);
      } else if (e.tiempoMedio > 0) {
        const segundos = e.tiempoMedio / p.escala;
        if (segundos > RETARDO_MAXIMO_S) {
          senal(true, `pista ${p.id} (${p.tipo}): la lista de edicion recorta ${segundos.toFixed(3)}s, ` +
            'muy por encima del retardo del codificador', ['-ignore_editlist 1']);
        } else {
          notas.push(`pista ${p.id} (${p.tipo}): entrada ${i} recorta ${e.tiempoMedio} unidades ` +
            `(${segundos.toFixed(3)}s) — retardo del codificador, es lo normal`);
        }
      }
    }
  }

  // 3. El primer fotograma tiene que ser llave, o no hay por donde empezar.
  const pistaVideo = moov.pistas.find((p) => p.tipo === 'vide');
  if (pistaVideo && !pistaVideo.llaves.todas && pistaVideo.llaves.primera !== 1) {
    senal(true, `el primer fotograma llave es la muestra ${pistaVideo.llaves.primera}, no la 1: ` +
      'no hay punto de arranque al principio del video');
  }
  if (paqVideo.length && !String(paqVideo[0].flags ?? '').includes('K')) {
    senal(true, 'el primer paquete de video no viene marcado como fotograma llave');
  }

  // 4. Tiempos: arranque, negativos y monotonia.
  //
  //    start_time ya viene con la lista de edicion aplicada, asi que es la hora
  //    a la que el reproductor vera el primer fotograma. Esa es la que importa.
  const inicioV = Number(video?.start_time ?? 0);
  const inicioA = Number(audio?.start_time ?? 0);
  if (Math.abs(inicioV) > 0.001) {
    senal(true, `el video no empieza en 0 sino en ${inicioV.toFixed(3)}s`,
      ['-avoid_negative_ts make_zero', '-muxdelay 0', '-muxpreload 0']);
  }
  if (Math.abs(inicioA) > 0.1) {
    senal(true, `el audio no empieza en 0 sino en ${inicioA.toFixed(3)}s`,
      ['-avoid_negative_ts make_zero', '-muxdelay 0', '-muxpreload 0']);
  }
  if (Math.abs(inicioV - inicioA) > 0.1) {
    senal(true, `video y audio no arrancan a la vez: ${inicioV.toFixed(3)}s contra ${inicioA.toFixed(3)}s`,
      ['-avoid_negative_ts make_zero']);
  }
  // Un DTS negativo al principio NO es un defecto: es como se declara el
  // retardo de reordenacion. Con fotogramas B el decodificador recibe las
  // imagenes en otro orden del que las muestra, asi que los primeros DTS van
  // por delante de cero para que el primer PTS caiga exactamente en cero. Lo
  // mismo con la trama de precarga del AAC. Lo que sí seria un defecto es que
  // el primer PTS —la hora a la que se VE— fuera negativo, o que el adelanto
  // fuera tan grande que no lo explique ningun codec.
  const ADELANTO_MAXIMO_S = 0.5;
  const pistaPorTipo = { video: 'vide', audio: 'soun' };
  for (const [nombre, paquetes] of [['video', paqVideo], ['audio', paqAudio]]) {
    if (!paquetes.length) continue;
    // Cuanto recorta la lista de edicion de esta pista: es exactamente lo que
    // puede haber por delante de cero sin que sea un defecto.
    const pista = moov.pistas.find((p) => p.tipo === pistaPorTipo[nombre]);
    const recorte = pista?.edicion?.find((e) => e.tiempoMedio > 0)
      ? pista.edicion.find((e) => e.tiempoMedio > 0).tiempoMedio / pista.escala
      : 0;
    const primerPts = Math.min(...paquetes.map((p) => Number(p.pts_time)));
    if (primerPts < -recorte - 0.001) {
      senal(true, `${nombre}: el primer PTS es ${primerPts.toFixed(3)}s y la lista de edicion solo ` +
        `recorta ${recorte.toFixed(3)}s: queda contenido antes del inicio`,
        ['-avoid_negative_ts make_zero']);
    }
    const masTemprano = Math.min(...paquetes.map((p) => Number(p.dts_time)));
    if (masTemprano < -ADELANTO_MAXIMO_S) {
      senal(true, `${nombre}: los DTS arrancan en ${masTemprano.toFixed(3)}s, ` +
        'demasiado adelantados para ser retardo de codec', ['-avoid_negative_ts make_zero']);
    } else if (masTemprano < 0) {
      notas.push(`${nombre}: los DTS arrancan en ${masTemprano.toFixed(3)}s con el primer PTS en ` +
        `${primerPts.toFixed(3)}s — retardo de reordenacion, es lo normal`);
    }
    for (let i = 1; i < paquetes.length; i++) {
      if (Number(paquetes[i].dts) < Number(paquetes[i - 1].dts)) {
        senal(true, `${nombre}: el DTS retrocede entre los paquetes ${i - 1} y ${i}`);
        break;
      }
    }
  }

  // 5. Duraciones que no cuadran entre pistas.
  const durV = Number(video?.duration ?? 0);
  const durA = Number(audio?.duration ?? 0);
  if (durV && durA && Math.abs(durV - durA) > 1.0) {
    senal(false, `las pistas duran distinto: video ${durV.toFixed(2)}s, audio ${durA.toFixed(2)}s ` +
      `(${Math.abs(durV - durA).toFixed(2)}s de diferencia)`);
  }

  // 6. Perfil y formato de pixel: lo que un navegador puede o no decodificar.
  if (video && video.pix_fmt !== 'yuv420p') {
    senal(true, `formato de pixel ${video.pix_fmt}: fuera de lo que decodifica un navegador`);
  }
  if (video && !['Baseline', 'Constrained Baseline', 'Main', 'High'].includes(video.profile)) {
    senal(true, `perfil H.264 "${video.profile}": fuera de lo habitual para web`);
  }

  // 7. Marcas de compatibilidad.
  if (ftyp && !ftyp.compatibles.some((c) => ['isom', 'mp41', 'mp42', 'avc1'].includes(c))) {
    senal(false, `ftyp declara marcas poco habituales: ${ftyp.compatibles.join(', ')}`);
  }

  return {
    superiores: sup, ftyp, moov, probe, video, audio,
    paqVideo, paqAudio, anomalias, notas,
    graves: anomalias.filter((a) => a.grave).length,
  };
}

/** Opciones que van ANTES de -i (afectan a como se lee el archivo). */
const DE_ENTRADA = new Set(['-ignore_editlist']);

/**
 * Reescribe el contenedor sin tocar el H.264.
 *
 * Los fotogramas se copian tal cual: lo unico que cambia es como estan
 * empaquetados y como se declaran sus tiempos.
 */
export async function repararContenedor({ entrada, salida, flags = [] }) {
  const ffmpeg = await rutaFfmpeg();
  const sueltos = flags.flatMap((f) => f.split(' '));

  const antes = [];
  const despues = [];
  for (let i = 0; i < sueltos.length; i++) {
    const f = sueltos[i];
    if (!f.startsWith('-')) continue;
    const valor = sueltos[i + 1] && !sueltos[i + 1].startsWith('-') ? sueltos[++i] : null;
    // -movflags se anade siempre al final; aceptarlo aqui lo duplicaria.
    if (f === '-movflags') continue;
    const destino = DE_ENTRADA.has(f) ? antes : despues;
    if (destino.includes(f)) continue;
    destino.push(f);
    if (valor != null) destino.push(valor);
  }

  const args = [
    '-y', '-v', 'error', '-stats',
    ...antes,
    '-i', entrada,
    '-map', '0:v:0', '-map', '0:a:0',
    '-c', 'copy',
    ...despues,
    '-movflags', '+faststart',
    salida,
  ];
  const { codigo, error } = await correr(ffmpeg, args);
  if (codigo !== 0) throw new Error(`ffmpeg fallo al reparar:\n${error.slice(-2000)}`);
  return { args };
}
