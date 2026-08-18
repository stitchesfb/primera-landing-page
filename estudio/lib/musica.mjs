/**
 * Cama instrumental original, sintetizada nota a nota.
 *
 * Se escribe en vez de usar una pista de archivo por dos razones: no hay
 * licencia que revisar ni reclamo de Content ID posible, y se ajusta al
 * segundo exacto de cada video.
 *
 * El detalle que decide si se oye o no: el cuerpo del sonido vive entre 220 Hz
 * y 1,3 kHz. Un altavoz de movil no reproduce casi nada por debajo de 300 Hz,
 * asi que una cama hecha solo de graves —por bonita que suene con cascos— es
 * silencio en la mayoria de las reproducciones.
 *
 * El ducking va aplicado ya en la sintesis, muestra a muestra, en vez de
 * dejarselo a un filtro de ffmpeg: las transiciones son exactas y no dependen
 * de que un detector de voz acierte.
 */

import { writeFileSync } from 'node:fs';

const SR = 44100;

// La minor con la tercera arriba: reposada, sin tension que resolver. Cada voz
// respira a un ritmo distinto y los periodos son coprimos, asi que la
// combinacion no se repite de forma audible en media hora.
const VOCES = [
  { hz: 220.00, amp: 0.34, lfo: 17.0, detune: 0.06 },
  { hz: 329.63, amp: 0.26, lfo: 23.0, detune: 0.09 },
  { hz: 440.00, amp: 0.20, lfo: 29.0, detune: 0.07 },
  { hz: 523.25, amp: 0.13, lfo: 31.0, detune: 0.11 },
  { hz: 659.26, amp: 0.07, lfo: 37.0, detune: 0.13 },
];

// Campanas sobre la pentatonica, en la banda que si sale por un altavoz chico.
const CAMPANAS = [880.00, 1046.50, 1318.51];
const CADA_CAMPANA = 13.7;
const DECAIMIENTO = 4.2;

const dbALineal = (db) => 10 ** (db / 20);

/** Rampa suave entre dos niveles: coseno alzado, sin esquinas audibles. */
const suave = (x) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2;

/**
 * Nivel de la musica en el segundo `t`.
 *
 * Debajo de la voz va muy baja; en los interludios sube, que es cuando tiene
 * que sostener el silencio ella sola. La rampa empieza ANTES del hueco y
 * termina despues, para que el oido no perciba un escalon.
 */
export function nivelEn(t, { huecos, finNarracion, cierre, bajoVoz, enInterludio, rampa }) {
  let db = bajoVoz;

  for (const h of huecos) {
    const a = h.inicio;
    const b = h.inicio + h.duracion;
    if (t >= a - rampa && t < a) db = Math.max(db, bajoVoz + (enInterludio - bajoVoz) * suave((t - (a - rampa)) / rampa));
    else if (t >= a && t <= b) db = Math.max(db, enInterludio);
    else if (t > b && t <= b + rampa) db = Math.max(db, bajoVoz + (enInterludio - bajoVoz) * suave(1 - (t - b) / rampa));
  }

  // Tras el "Amen" la musica se queda sola y sube al nivel de interludio.
  if (finNarracion != null && t >= finNarracion - rampa) {
    const s = suave((t - (finNarracion - rampa)) / rampa);
    db = Math.max(db, bajoVoz + (enInterludio - bajoVoz) * s);
  }

  let g = dbALineal(db);

  // Entrada y salida del video.
  if (t < cierre.fadeIn) g *= suave(t / cierre.fadeIn);
  const restante = cierre.duracionTotal - t;
  if (restante < cierre.fadeOut) g *= suave(restante / cierre.fadeOut);

  return Math.max(0, g);
}

/**
 * Sintetiza `segundos` de cama a partir del instante `offset` del video.
 *
 * El offset importa: una muestra recortada del minuto seis tiene que sonar
 * exactamente como sonara ahi en el render completo, con las mismas fases y
 * la misma campana, o la revision no sirve para nada.
 */
export function generarCama({ segundos, offset = 0, envolvente, salidaWav }) {
  const n = Math.round(segundos * SR);
  const buf = Buffer.alloc(n * 4); // 16 bits, estereo

  for (let i = 0; i < n; i++) {
    const t = offset + i / SR;
    let izq = 0;
    let der = 0;

    for (const v of VOCES) {
      // Respiracion lenta: nunca baja del 55%, para que la cama no desaparezca.
      const resp = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / v.lfo));
      const a = v.amp * resp;
      izq += a * Math.sin(2 * Math.PI * (v.hz - v.detune) * t);
      der += a * Math.sin(2 * Math.PI * (v.hz + v.detune) * t);
    }

    // Campana: una nota que cae y se apaga, sin percusion que sobresalte.
    const fase = t / CADA_CAMPANA;
    const desde = (fase - Math.floor(fase)) * CADA_CAMPANA;
    if (desde < DECAIMIENTO) {
      const hz = CAMPANAS[Math.floor(fase) % CAMPANAS.length];
      const env = Math.exp(-desde * (3 / DECAIMIENTO)) * 0.16;
      const campana = env * (Math.sin(2 * Math.PI * hz * desde) + 0.3 * Math.sin(4 * Math.PI * hz * desde));
      // Alterna de lado para abrir el estereo sin que se note el truco.
      if (Math.floor(fase) % 2 === 0) { izq += campana; der += campana * 0.55; }
      else { izq += campana * 0.55; der += campana; }
    }

    const g = envolvente(t) / 1.2;
    const li = Math.max(-1, Math.min(1, izq * g));
    const de = Math.max(-1, Math.min(1, der * g));
    buf.writeInt16LE(Math.round(li * 32767), i * 4);
    buf.writeInt16LE(Math.round(de * 32767), i * 4 + 2);
  }

  writeFileSync(salidaWav, Buffer.concat([cabeceraWav(n), buf]));
  return { segundos, muestras: n };
}

function cabeceraWav(muestras) {
  const datos = muestras * 4;
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + datos, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 4, 28);
  h.writeUInt16LE(4, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(datos, 40);
  return h;
}
