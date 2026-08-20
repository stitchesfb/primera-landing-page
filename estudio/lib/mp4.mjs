/**
 * Lectura de la estructura de un MP4, caja a caja.
 *
 * ffprobe cuenta lo que los flujos CONTIENEN; para saber por que un archivo no
 * arranca en un reproductor web hace falta ademas como esta ARMADO: si el
 * indice va delante o detras de los datos, si hay listas de edicion que
 * desplazan el arranque, si el primer fotograma es realmente una llave. Nada de
 * eso sale por ffprobe, asi que se lee del contenedor.
 *
 * Referencia: ISO/IEC 14496-12.
 */

import { openSync, readSync, closeSync, statSync } from 'node:fs';

/** Recorre las cajas de un buffer sin descender. */
function* cajas(buf, ini = 0, fin = buf.length) {
  let p = ini;
  while (p + 8 <= fin) {
    let tam = buf.readUInt32BE(p);
    const tipo = buf.toString('latin1', p + 4, p + 8);
    let cabecera = 8;
    if (tam === 1) {
      if (p + 16 > fin) break;
      tam = Number(buf.readBigUInt64BE(p + 8));
      cabecera = 16;
    } else if (tam === 0) {
      tam = fin - p;
    }
    if (tam < cabecera || p + tam > fin) break;
    yield { tipo, inicio: p, cuerpo: p + cabecera, fin: p + tam, tamano: tam };
    p += tam;
  }
}

const buscar = (buf, caja, tipo) => {
  for (const c of cajas(buf, caja.cuerpo, caja.fin)) if (c.tipo === tipo) return c;
  return null;
};
const buscarTodas = (buf, caja, tipo) => {
  const r = [];
  for (const c of cajas(buf, caja.cuerpo, caja.fin)) if (c.tipo === tipo) r.push(c);
  return r;
};

/**
 * Cajas de primer nivel, con su posicion en el archivo.
 *
 * Es lo que decide si el archivo puede empezar a reproducirse mientras se
 * descarga: si 'moov' va detras de 'mdat', el reproductor tiene que bajar los
 * 215 MB enteros antes de saber que hay dentro.
 */
export function cajasSuperiores(ruta) {
  const fd = openSync(ruta, 'r');
  try {
    const total = statSync(ruta).size;
    const lista = [];
    let p = 0;
    const cab = Buffer.alloc(16);
    while (p + 8 <= total) {
      const leidos = readSync(fd, cab, 0, 16, p);
      if (leidos < 8) break;
      let tam = cab.readUInt32BE(0);
      const tipo = cab.toString('latin1', 4, 8);
      let cabecera = 8;
      if (tam === 1) { tam = Number(cab.readBigUInt64BE(8)); cabecera = 16; }
      else if (tam === 0) tam = total - p;
      if (tam < cabecera) break;
      lista.push({ tipo, offset: p, tamano: tam });
      p += tam;
    }
    return { total, cajas: lista };
  } finally {
    closeSync(fd);
  }
}

/** Marcas de compatibilidad declaradas en ftyp. */
export function leerFtyp(ruta) {
  const { cajas: sup } = cajasSuperiores(ruta);
  const f = sup.find((c) => c.tipo === 'ftyp');
  if (!f) return null;
  const fd = openSync(ruta, 'r');
  try {
    const buf = Buffer.alloc(f.tamano);
    readSync(fd, buf, 0, f.tamano, f.offset);
    const marca = buf.toString('latin1', 8, 12);
    const compatibles = [];
    for (let p = 16; p + 4 <= f.tamano; p += 4) compatibles.push(buf.toString('latin1', p, p + 4));
    return { marca, version: buf.readUInt32BE(12), compatibles };
  } finally {
    closeSync(fd);
  }
}

/**
 * Todo lo que hace falta de moov: escalas de tiempo, duraciones declaradas,
 * listas de edicion y la tabla de fotogramas llave de cada pista.
 */
export function analizarMoov(ruta) {
  const { cajas: sup } = cajasSuperiores(ruta);
  const m = sup.find((c) => c.tipo === 'moov');
  if (!m) throw new Error(`${ruta} no tiene caja moov.`);

  const fd = openSync(ruta, 'r');
  let buf;
  try {
    buf = Buffer.alloc(m.tamano);
    readSync(fd, buf, 0, m.tamano, m.offset);
  } finally {
    closeSync(fd);
  }

  const moov = { tipo: 'moov', cuerpo: 8, fin: m.tamano };
  const mvhdCaja = buscar(buf, moov, 'mvhd');
  const mvhd = mvhdCaja ? leerCabeceraTiempo(buf, mvhdCaja, 12, 20) : null;

  const pistas = [];
  for (const trak of buscarTodas(buf, moov, 'trak')) {
    const tkhd = buscar(buf, trak, 'tkhd');
    const mdia = buscar(buf, trak, 'mdia');
    const mdhd = mdia ? buscar(buf, mdia, 'mdhd') : null;
    const hdlr = mdia ? buscar(buf, mdia, 'hdlr') : null;
    const minf = mdia ? buscar(buf, mdia, 'minf') : null;
    const stbl = minf ? buscar(buf, minf, 'stbl') : null;
    const stss = stbl ? buscar(buf, stbl, 'stss') : null;
    const edts = buscar(buf, trak, 'edts');
    const elst = edts ? buscar(buf, edts, 'elst') : null;

    const escala = mdhd ? leerCabeceraTiempo(buf, mdhd, 12, 20).escala : null;
    const duracionMedia = mdhd ? leerCabeceraTiempo(buf, mdhd, 12, 20).duracion : null;

    pistas.push({
      id: tkhd ? leerIdPista(buf, tkhd) : null,
      tipo: hdlr ? buf.toString('latin1', hdlr.cuerpo + 8, hdlr.cuerpo + 12) : '????',
      escala,
      duracionMedia,
      segundos: escala ? duracionMedia / escala : null,
      edicion: elst ? leerElst(buf, elst) : null,
      // Sin stss, TODAS las muestras son llave. Con stss, la primera entrada
      // dice en que muestra esta la primera llave: si no es la 1, el archivo no
      // empieza en un punto desde el que se pueda decodificar.
      llaves: stss ? leerStss(buf, stss) : { todas: true, cuantas: null, primera: 1 },
    });
  }

  return { moovOffset: m.offset, moovTamano: m.tamano, mvhd, pistas, superiores: sup };
}

function leerCabeceraTiempo(buf, caja, offV0, offV1) {
  const version = buf.readUInt8(caja.cuerpo);
  if (version === 1) {
    return {
      escala: buf.readUInt32BE(caja.cuerpo + offV1),
      duracion: Number(buf.readBigUInt64BE(caja.cuerpo + offV1 + 4)),
    };
  }
  return {
    escala: buf.readUInt32BE(caja.cuerpo + offV0),
    duracion: buf.readUInt32BE(caja.cuerpo + offV0 + 4),
  };
}

function leerIdPista(buf, tkhd) {
  const version = buf.readUInt8(tkhd.cuerpo);
  return version === 1 ? buf.readUInt32BE(tkhd.cuerpo + 20) : buf.readUInt32BE(tkhd.cuerpo + 12);
}

/**
 * Lista de edicion: el mapa entre el tiempo del reproductor y el tiempo del
 * medio. Un media_time distinto de 0 o -1 desplaza el arranque, y no todos los
 * reproductores lo interpretan igual.
 */
function leerElst(buf, elst) {
  const version = buf.readUInt8(elst.cuerpo);
  const cuantas = buf.readUInt32BE(elst.cuerpo + 4);
  const entradas = [];
  let p = elst.cuerpo + 8;
  for (let i = 0; i < cuantas && p < elst.fin; i++) {
    if (version === 1) {
      entradas.push({
        duracion: Number(buf.readBigUInt64BE(p)),
        tiempoMedio: Number(buf.readBigInt64BE(p + 8)),
        ritmo: buf.readInt16BE(p + 16),
      });
      p += 20;
    } else {
      entradas.push({
        duracion: buf.readUInt32BE(p),
        tiempoMedio: buf.readInt32BE(p + 4),
        ritmo: buf.readInt16BE(p + 8),
      });
      p += 12;
    }
  }
  return entradas;
}

function leerStss(buf, stss) {
  const cuantas = buf.readUInt32BE(stss.cuerpo + 4);
  const primera = cuantas > 0 ? buf.readUInt32BE(stss.cuerpo + 8) : null;
  const primeras = [];
  for (let i = 0; i < Math.min(cuantas, 6); i++) {
    primeras.push(buf.readUInt32BE(stss.cuerpo + 8 + i * 4));
  }
  return { todas: false, cuantas, primera, primeras };
}
