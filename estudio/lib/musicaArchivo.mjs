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

/**
 * Tramo aprovechable de una pista: sin su fundido de entrada ni el de salida.
 *
 * Casi toda pieza publicada entra desde el silencio y se apaga al final. Cruzar
 * la cola con la cabeza sin quitar esos fundidos es cruzar dos zonas mudas: por
 * mucho que se solapen, en la costura no hay musica y el bajon se oye igual.
 * Medido sobre One Step Closer, un cruce de cuatro segundos sobre la pista
 * entera todavia dejaba un bache de 32 dB.
 *
 * Se mide la energia en ventanas de 100 ms y se recorta a la parte que se
 * mantiene por encima del cuerpo de la pieza. Lo que queda es material con el
 * que sí se puede cruzar.
 */
export function regionUtil(pcm, { debajoDb = 18, ventanaS = 0.1, sostenidoS = 0.3 } = {}) {
  const total = pcm.length >> 2;
  const porVentana = Math.round(ventanaS * SR);
  const cuantas = Math.floor(total / porVentana);
  if (cuantas < 3) return { inicio: 0, fin: total, recortado: false };

  const niveles = new Float64Array(cuantas);
  for (let v = 0; v < cuantas; v++) {
    let suma = 0;
    for (let i = 0; i < porVentana; i++) {
      const x = pcm.readInt16LE(((v * porVentana) + i) * 4) / 32768;
      suma += x * x;
    }
    niveles[v] = Math.sqrt(suma / porVentana);
  }

  // El cuerpo de la pieza, no su pico: un golpe suelto no debe fijar el umbral.
  const ordenados = [...niveles].sort((a, b) => a - b);
  const cuerpo = ordenados[Math.floor(cuantas * 0.9)];
  const umbral = cuerpo * 10 ** (-debajoDb / 20);

  // No basta con la primera ventana que pase el umbral: el arranque de un
  // archivo suele traer un transitorio —el salto de silencio a la primera
  // muestra— que la supera durante una decima y vuelve a caer. Si el escaneo se
  // para ahi, da por bueno el fundido entero. Se exige que el nivel se
  // MANTENGA, que es lo que distingue musica de un chasquido.
  const sostenido = Math.max(1, Math.round(sostenidoS / ventanaS));
  const aguanta = (desde, paso) => {
    for (let k = 0; k < sostenido; k++) {
      const v = desde + k * paso;
      if (v < 0 || v >= cuantas || niveles[v] < umbral) return false;
    }
    return true;
  };

  let v0 = 0;
  while (v0 < cuantas && !aguanta(v0, 1)) v0++;
  let v1 = cuantas - 1;
  while (v1 > v0 && !aguanta(v1, -1)) v1--;
  if (v1 - v0 < 3) return { inicio: 0, fin: total, recortado: false };

  return {
    inicio: v0 * porVentana,
    fin: Math.min(total, (v1 + 1) * porVentana),
    recortado: v0 > 0 || v1 < cuantas - 1,
    entradaS: (v0 * porVentana) / SR,
    salidaS: (total - (v1 + 1) * porVentana) / SR,
  };
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
  gananciaDb = 0, fadeIn = 2, fadeOut = 3, cruceLoop = 4,
}) {
  // Cuando hay que repetir, se pide un poco mas de material del que ocupa la
  // ventana: el cruce necesita cola con la que solaparse.
  const crudo = await trozoPcm({
    ruta: pista, desde: desdeEnPista, segundos: segundos + cruceLoop + 1, gananciaDb,
  });
  const n = Math.round(segundos * SR);
  const buf = Buffer.alloc(n * 4);

  const total = Math.floor(crudo.length / 4);
  if (total === 0) throw new Error(`No se pudo leer audio de ${pista}`);

  // Solo cuando hay que dar la vuelta merece la pena recortar los fundidos
  // propios de la pista: si la ventana cabe entera, se usa tal cual empieza.
  const hayQueRepetir = Math.round(segundos * SR) > total;
  const region = hayQueRepetir ? regionUtil(crudo) : { inicio: 0, fin: total, recortado: false };
  const base = region.inicio;
  const disponibles = region.fin - region.inicio;

  // Una pieza de dos minutos y medio bajo un video de media hora da doce
  // vueltas. Empalmar el final con el principio a hueso deja un salto en la
  // forma de onda, y ese chasquido cae siempre en el mismo sitio: doce veces,
  // acompasadas, es un patron que el oido encuentra enseguida.
  //
  // Asi que la vuelta se cruza. La cola se apaga mientras la cabeza entra, con
  // ganancias de potencia constante —raiz cuadrada— porque los dos trozos son
  // material distinto y no se suman en fase. Lo que se pierde es que el bucle
  // avanza `cruce` segundos menos por vuelta; lo que se gana es que no hay
  // ningun instante en el que se pueda senalar la costura.
  const cruce = Math.min(Math.round(cruceLoop * SR), Math.floor(disponibles / 3));
  const periodo = Math.max(1, disponibles - cruce);
  const repetida = n > periodo;

  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const g = envolvente(t);

    const ciclo = Math.floor(i / periodo);
    const u = i - ciclo * periodo;
    let izq = crudo.readInt16LE((base + u) * 4) / 32768;
    let der = crudo.readInt16LE((base + u) * 4 + 2) / 32768;

    if (ciclo > 0 && u < cruce) {
      const x = u / cruce;
      const gCabeza = Math.sqrt(x);
      const gCola = Math.sqrt(1 - x);
      const v = base + u + periodo;
      izq = izq * gCabeza + (crudo.readInt16LE(v * 4) / 32768) * gCola;
      der = der * gCabeza + (crudo.readInt16LE(v * 4 + 2) / 32768) * gCola;
    }

    let borde = 1;
    if (t < fadeIn) borde *= suave(t / fadeIn);
    const restante = segundos - t;
    if (restante < fadeOut) borde *= suave(restante / fadeOut);

    const k = g * borde;
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, izq * k)) * 32767), i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, der * k)) * 32767), i * 4 + 2);
  }

  writeFileSync(salidaWav, Buffer.concat([cabeceraWav(n), buf]));
  return {
    segundos, muestras: n, repetida,
    vueltas: repetida ? Math.ceil(n / periodo) : 1,
    cruceSegundos: cruce / SR,
    recorte: region.recortado
      ? { entradaS: region.entradaS, salidaS: region.salidaS, utilS: disponibles / SR }
      : null,
    // Instantes de la ventana donde cae una costura, para poder medirla.
    costuras: repetida
      ? Array.from({ length: Math.floor(n / periodo) }, (_, k) => ((k + 1) * periodo) / SR)
      : [],
  };
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
