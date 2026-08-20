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

  // 2. Listas de edicion. Un desplazamiento distinto del recorte estandar del
  //    AAC hace que cada reproductor arranque en un sitio distinto.
  for (const p of moov.pistas) {
    if (!p.edicion || p.edicion.length === 0) continue;
    if (p.edicion.length > 1) {
      senal(true, `pista ${p.id} (${p.tipo}): lista de edicion con ${p.edicion.length} entradas`,
        ['-ignore_editlist 1']);
    }
    for (const e of p.edicion) {
      if (e.tiempoMedio === -1) {
        senal(true, `pista ${p.id} (${p.tipo}): la lista de edicion empieza con un hueco vacio ` +
          `de ${(e.duracion / (moov.mvhd?.escala ?? 1000)).toFixed(3)}s`, ['-ignore_editlist 1']);
      } else if (p.tipo === 'vide' && e.tiempoMedio !== 0) {
        senal(true, `pista ${p.id} (video): la lista de edicion desplaza el arranque ` +
          `${e.tiempoMedio} unidades (${(e.tiempoMedio / p.escala).toFixed(3)}s)`, ['-ignore_editlist 1']);
      } else if (p.tipo === 'soun' && e.tiempoMedio !== 0) {
        // En audio AAC lo normal es un recorte de ~1024 muestras: el retardo
        // del codificador. Solo llama la atencion si es mucho mayor.
        const muestras = e.tiempoMedio;
        if (muestras > 4096) {
          senal(true, `pista ${p.id} (audio): la lista de edicion recorta ${muestras} muestras ` +
            `(${(muestras / p.escala).toFixed(3)}s), muy por encima del retardo normal del AAC`,
            ['-ignore_editlist 1']);
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
  // Un AAC siempre trae delante una trama de precarga con DTS negativo —el
  // retardo del codificador, ~1024 muestras— que la lista de edicion recorta.
  // Eso es lo normal en cualquier MP4; marcarlo daria la alarma en un archivo
  // sano. Solo cuenta lo que va mas alla de esa trama.
  const TOLERANCIA_DTS = { video: 0, audio: -0.05 };
  for (const [nombre, paquetes] of [['video', paqVideo], ['audio', paqAudio]]) {
    const negativos = paquetes.filter((p) => Number(p.dts_time) < TOLERANCIA_DTS[nombre]);
    if (negativos.length) {
      senal(true, `${nombre}: ${negativos.length} de los primeros paquetes empiezan antes de cero ` +
        `(el mas temprano en ${Math.min(...negativos.map((p) => Number(p.dts_time))).toFixed(3)}s)`,
        ['-avoid_negative_ts make_zero']);
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
    paqVideo, paqAudio, anomalias,
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
