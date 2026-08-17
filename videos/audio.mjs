/* Música de fondo sintetizada.
 *
 * Genera un WAV estéreo del largo exacto del video: un acorde sostenido
 * (La mayor) con campanas que caen encima cada pocos segundos.
 *
 * Está escrito a mano, nota a nota, en vez de tirar de una pista de archivo:
 * así no hay licencias que revisar ni reclamos de Content ID en YouTube.
 *
 * Lo importante para que se oiga: el cuerpo del sonido vive entre 220 Hz y
 * 1,3 kHz. Un altavoz de móvil no reproduce casi nada por debajo de 300 Hz,
 * así que una capa de graves sola —por muy bonita que suene con cascos— es
 * silencio en el 90 % de las reproducciones de un Short.
 */

import { writeFileSync } from 'node:fs';

const TASA = 44100;

// La mayor. El acorde de base y las notas que van cayendo encima.
const ACORDE = [220.0, 277.18, 329.63, 440.0];       // A3 C#4 E4 A4
const CAMPANAS = [440.0, 554.37, 659.25, 880.0, 659.25, 554.37];

const tau = Math.PI * 2;

/** Timbre del acorde: la fundamental con dos armónicos suaves encima. */
function voz(f, t, fase) {
  const vibrato = 1 + 0.0016 * Math.sin(tau * 0.13 * t + fase);
  const w = tau * f * vibrato * t + fase;
  return Math.sin(w) + 0.30 * Math.sin(2 * w) + 0.10 * Math.sin(3 * w);
}

/** Timbre de campana: armónicos algo desafinados, que es lo que da el brillo. */
function campana(f, t) {
  const w = tau * f * t;
  return (
    Math.sin(w) +
    0.50 * Math.sin(2.01 * w) +
    0.26 * Math.sin(3.02 * w) +
    0.13 * Math.sin(4.21 * w)
  );
}

const subeBaja = (x) => Math.min(1, Math.max(0, x));

/**
 * @param {string} ruta   Dónde escribir el .wav
 * @param {number} duracion  Segundos
 */
export function generarMusica(ruta, duracion) {
  const n = Math.floor(duracion * TASA);
  const izq = new Float64Array(n);
  const der = new Float64Array(n);

  // --- acorde sostenido -------------------------------------------------
  // Cada voz se desafina unas décimas entre canales: eso abre el estéreo sin
  // tener que recurrir a ningún efecto.
  ACORDE.forEach((f, i) => {
    const fase = i * 1.7;
    const peso = [0.55, 0.42, 0.38, 0.30][i];
    const desafine = 0.5 + i * 0.12;
    for (let s = 0; s < n; s++) {
      const t = s / TASA;
      // Respiración lenta del acorde, para que no quede plano.
      const respira = 0.82 + 0.18 * Math.sin(tau * 0.055 * t + i * 0.9);
      const a = peso * respira;
      izq[s] += a * voz(f - desafine, t, fase);
      der[s] += a * voz(f + desafine, t, fase + 0.6);
    }
  });

  // --- campanas ---------------------------------------------------------
  const primera = 2.2;
  const cada = 6.4;
  for (let k = 0; primera + k * cada < duracion - 2.5; k++) {
    const inicio = primera + k * cada;
    const f = CAMPANAS[k % CAMPANAS.length];
    const s0 = Math.floor(inicio * TASA);
    const largo = Math.min(n - s0, Math.floor(5.2 * TASA));
    // Van alternando de lado, muy poco, para que respire el estéreo.
    const lado = k % 2 === 0 ? 0.58 : 0.42;
    for (let s = 0; s < largo; s++) {
      const t = s / TASA;
      const ataque = subeBaja(t / 0.008);
      const caida = Math.exp(-t / 1.7);
      const a = 0.30 * ataque * caida;
      const v = a * campana(f, t);
      izq[s0 + s] += v * lado;
      der[s0 + s] += v * (1 - lado);
    }
  }

  // --- eco corto --------------------------------------------------------
  // Cruzado: lo que suena a la izquierda vuelve por la derecha. Da sensación
  // de sala sin necesidad de una reverb de verdad.
  const retardo = Math.floor(0.38 * TASA);
  const realim = 0.32;
  for (let s = retardo; s < n; s++) {
    izq[s] += realim * der[s - retardo];
    der[s] += realim * izq[s - retardo];
  }

  // --- filtro y envolvente general -------------------------------------
  // Paso bajo de un polo: le quita el filo digital a los armónicos altos.
  const corte = 3200;
  const k = Math.exp((-tau * corte) / TASA);
  let pi = 0, pd = 0;
  let pico = 0;

  const subida = 3.0;
  const bajada = 5.0;

  for (let s = 0; s < n; s++) {
    pi = izq[s] * (1 - k) + pi * k;
    pd = der[s] * (1 - k) + pd * k;

    const t = s / TASA;
    const env = subeBaja(t / subida) * subeBaja((duracion - t) / bajada);

    // tanh redondea los picos en vez de recortarlos en seco.
    const vi = Math.tanh(pi * env * 0.42);
    const vd = Math.tanh(pd * env * 0.42);
    izq[s] = vi;
    der[s] = vd;
    pico = Math.max(pico, Math.abs(vi), Math.abs(vd));
  }

  // Pico en -7,5 dBFS, que deja la pista en torno a -16 LUFS: se oye sin
  // esfuerzo, queda algo por debajo de lo que YouTube normaliza (-14 LUFS)
  // —que es lo que se quiere en algo para rezar— y sobra sitio para una voz.
  const objetivo = Math.pow(10, -7.5 / 20);
  const ganancia = pico > 0 ? objetivo / pico : 1;

  // --- WAV de 16 bits ---------------------------------------------------
  const datos = Buffer.alloc(n * 4);
  for (let s = 0; s < n; s++) {
    datos.writeInt16LE(Math.round(izq[s] * ganancia * 32767), s * 4);
    datos.writeInt16LE(Math.round(der[s] * ganancia * 32767), s * 4 + 2);
  }

  const cabecera = Buffer.alloc(44);
  cabecera.write('RIFF', 0);
  cabecera.writeUInt32LE(36 + datos.length, 4);
  cabecera.write('WAVE', 8);
  cabecera.write('fmt ', 12);
  cabecera.writeUInt32LE(16, 16);
  cabecera.writeUInt16LE(1, 20);          // PCM
  cabecera.writeUInt16LE(2, 22);          // estéreo
  cabecera.writeUInt32LE(TASA, 24);
  cabecera.writeUInt32LE(TASA * 4, 28);   // bytes por segundo
  cabecera.writeUInt16LE(4, 32);          // bytes por bloque
  cabecera.writeUInt16LE(16, 34);         // bits por muestra
  cabecera.write('data', 36);
  cabecera.writeUInt32LE(datos.length, 40);

  writeFileSync(ruta, Buffer.concat([cabecera, datos]));
  return ruta;
}
