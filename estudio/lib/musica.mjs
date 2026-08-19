/**
 * Cama instrumental original, sintetizada nota a nota.
 *
 * Se escribe en vez de usar una pista de archivo por dos razones: no hay
 * licencia que revisar ni reclamo de Content ID posible, y se ajusta al
 * segundo exacto de cada video.
 *
 * Tres capas, ninguna con pulso:
 *   - un pad calido que sostiene la armonia,
 *   - una capa de aire, ruido filtrado muy por debajo del pad,
 *   - un piano ambiental que suelta grupos de dos o tres notas y calla.
 *
 * La armonia avanza por acordes de casi dos minutos que se cruzan entre si
 * durante medio minuto. A esa velocidad no se percibe una progresion, que es
 * lo que se busca: la sensacion de que algo cambia sin poder decir cuando.
 * Los acordes comparten notas, asi que ningun cambio se anuncia.
 *
 * Y lo que separa esto de un drone: en los interludios no sube el volumen, se
 * ABRE. Entra una voz alta, el aire respira mas y el piano habla mas seguido.
 * Cuando vuelve la voz, la cama se cierra otra vez.
 *
 * El cuerpo del sonido vive entre 220 Hz y 1,3 kHz. Un altavoz de movil no
 * reproduce casi nada por debajo de 300 Hz: una cama de graves, por bonita que
 * suene con cascos, es silencio en la mayoria de las reproducciones.
 */

import { writeFileSync } from 'node:fs';

const SR = 44100;

// Acordes con notas comunes entre si, para que el cambio no se anuncie.
const ACORDES = [
  { nombre: 'Am9',   voces: [220.00, 261.63, 329.63, 493.88] },
  { nombre: 'Fmaj7', voces: [261.63, 349.23, 440.00, 523.25] },
  { nombre: 'Cmaj9', voces: [196.00, 261.63, 329.63, 587.33] },
  { nombre: 'Dm7',   voces: [220.00, 293.66, 349.23, 440.00] },
];
const DURA_ACORDE = 108;
const CRUCE = 26;

const AMPS = [0.30, 0.24, 0.18, 0.11];
const LFOS = [17.3, 23.7, 29.1, 31.9];

const dbALineal = (db) => 10 ** (db / 20);
const suave = (x) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2;

/** Ruido determinista por indice de muestra: el mismo en cualquier offset. */
function ruidoBlanco(i) {
  let x = Math.imul(i ^ 0x9e3779b9, 2654435761) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0;
  x ^= x >>> 13; x = Math.imul(x, 3266489917) >>> 0;
  x ^= x >>> 16;
  return x / 2147483648 - 1;
}

function generador(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Mezcla de acordes vigente en el segundo `t`, ya con el cruce aplicado. */
function acordeEn(t) {
  const idx = Math.floor(t / DURA_ACORDE);
  const dentro = t - idx * DURA_ACORDE;
  const a = ACORDES[((idx % ACORDES.length) + ACORDES.length) % ACORDES.length];
  const b = ACORDES[((idx + 1) % ACORDES.length + ACORDES.length) % ACORDES.length];
  const mezcla = dentro > DURA_ACORDE - CRUCE ? suave((dentro - (DURA_ACORDE - CRUCE)) / CRUCE) : 0;
  return { a, b, mezcla };
}

/**
 * Apertura: 0 mientras habla la voz, 1 en pleno interludio.
 *
 * Gobierna cuanto se abre el arreglo, no solo el volumen. Es la misma forma
 * de rampa que el ducking, asi que el nivel y la textura se mueven juntos.
 */
export function aperturaEn(t, { huecos, finNarracion, rampa }) {
  let a = 0;
  for (const h of huecos) {
    const ini = h.inicio;
    const fin = h.inicio + h.duracion;
    if (t >= ini - rampa && t < ini) a = Math.max(a, suave((t - (ini - rampa)) / rampa));
    else if (t >= ini && t <= fin) a = 1;
    else if (t > fin && t <= fin + rampa) a = Math.max(a, suave(1 - (t - fin) / rampa));
  }
  if (finNarracion != null && t >= finNarracion - rampa) {
    a = Math.max(a, suave((t - (finNarracion - rampa)) / rampa));
  }
  return a;
}

export function nivelEn(t, { huecos, finNarracion, cierre, bajoVoz, enInterludio, rampa }) {
  const a = aperturaEn(t, { huecos, finNarracion, rampa });
  let g = dbALineal(bajoVoz + (enInterludio - bajoVoz) * a);
  if (t < cierre.fadeIn) g *= suave(t / cierre.fadeIn);
  const restante = cierre.duracionTotal - t;
  if (restante < cierre.fadeOut) g *= suave(restante / cierre.fadeOut);
  return Math.max(0, g);
}

/**
 * Grupos de dos o tres notas de piano, con silencio largo entre grupos.
 *
 * Se generan para el video entero antes de sintetizar nada, con semilla fija:
 * asi una muestra recortada del minuto seis trae exactamente las notas que
 * sonaran ahi en el render completo.
 *
 * Las notas salen del acorde vigente y se eligen al azar sin repetir la
 * anterior. No hay motivo que memorizar, que es justo lo que se pide: piano
 * ambiental, no una melodia.
 */
export function planearPiano({ duracionTotal, apertura, semilla = 20260818 }) {
  const r = generador(semilla);
  const grupos = [];
  let t = 6 + r() * 8;

  while (t < duracionTotal) {
    const abierto = apertura(t);
    const { a, b, mezcla } = acordeEn(t);
    const tonos = (mezcla > 0.5 ? b : a).voces;

    // Dos notas casi siempre; la tercera aparece mas cuando la cama esta
    // abierta, que es cuando hay sitio para que se oiga.
    const cuantas = r() < 0.30 + 0.35 * abierto ? 3 : 2;
    const notas = [];
    let anterior = -1;
    for (let i = 0; i < cuantas; i++) {
      let k = Math.floor(r() * tonos.length);
      if (k === anterior) k = (k + 1 + Math.floor(r() * (tonos.length - 1))) % tonos.length;
      anterior = k;
      notas.push({
        hz: tonos[k] * (r() < 0.55 ? 2 : 4),
        retardo: i === 0 ? 0 : 0.18 + r() * 0.5,
        amp: 0.16 + r() * 0.14,
        pan: r(),
      });
    }
    // Acumula los retardos para que las notas caigan una tras otra.
    for (let i = 1; i < notas.length; i++) notas[i].retardo += notas[i - 1].retardo;

    grupos.push({ t, notas });

    // Con la cama abierta el piano habla mas seguido: de un grupo cada ~17 s a
    // uno cada ~7 s. Es la evolucion que se pide notar en los interludios.
    const espera = (17 - 10 * abierto) * (0.75 + r() * 0.5);
    t += Math.max(4, espera);
  }
  return grupos;
}

const DECAE_PIANO = 5.5;

export function generarCama({
  segundos, offset = 0, envolvente, apertura, grupos = [], salidaWav,
}) {
  const n = Math.round(segundos * SR);
  const buf = Buffer.alloc(n * 4);

  // Estado de los filtros de la capa de aire. Se estabilizan en milisegundos,
  // asi que arrancar a mitad del video no deja artefacto audible.
  let lp1 = 0, lp2 = 0, hp = 0, hpAnt = 0;

  // Solo los grupos que caen en la ventana, con margen para las colas.
  const cerca = grupos.filter(
    (g) => g.t + 8 >= offset && g.t <= offset + segundos
  );

  for (let i = 0; i < n; i++) {
    const t = offset + i / SR;
    const abierto = apertura(t);
    const { a, b, mezcla } = acordeEn(t);

    let izq = 0;
    let der = 0;

    // --- pad calido -----------------------------------------------------
    for (let v = 0; v < 4; v++) {
      const hz = a.voces[v] * (1 - mezcla) + b.voces[v] * mezcla;
      const resp = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / LFOS[v]));
      const amp = AMPS[v] * resp;
      const d = 0.055 + v * 0.02;
      // Un armonico impar suave da cuerpo sin volverlo metalico.
      const w = (f) => Math.sin(2 * Math.PI * f * t) + 0.14 * Math.sin(6 * Math.PI * f * t);
      izq += amp * w(hz - d);
      der += amp * w(hz + d);
    }

    // Voz alta que solo entra cuando la cama se abre: cambia el color, no el
    // volumen, que es la diferencia entre respirar y subir el fader.
    if (abierto > 0.01) {
      const hzAlto = (a.voces[1] * (1 - mezcla) + b.voces[1] * mezcla) * 4;
      const brillo = 0.05 * abierto * (0.6 + 0.4 * Math.sin((2 * Math.PI * t) / 13.1));
      izq += brillo * Math.sin(2 * Math.PI * (hzAlto - 0.3) * t);
      der += brillo * Math.sin(2 * Math.PI * (hzAlto + 0.3) * t);
    }

    // --- capa de aire ---------------------------------------------------
    const nz = ruidoBlanco(Math.round(offset * SR) + i);
    lp1 += (nz - lp1) * 0.16;
    lp2 += (lp1 - lp2) * 0.16;
    const paso = lp2 - hpAnt + 0.995 * hp;
    hp = paso;
    hpAnt = lp2;
    const aire = paso * (0.030 + 0.028 * abierto) *
      (0.65 + 0.35 * Math.sin((2 * Math.PI * t) / 19.7));
    izq += aire;
    der += aire * 0.82;

    // --- piano ambiental ------------------------------------------------
    for (const g of cerca) {
      for (const nota of g.notas) {
        const desde = t - (g.t + nota.retardo);
        if (desde < 0 || desde > DECAE_PIANO) continue;
        // Ataque corto y caida larga: sin percusion, pero con el pellizco que
        // distingue una cuerda pulsada de otro pad.
        const env = (1 - Math.exp(-desde * 90)) * Math.exp(-desde * (4.2 / DECAE_PIANO));
        const f = nota.hz;
        const s = env * nota.amp * (
          Math.sin(2 * Math.PI * f * desde) +
          0.30 * Math.sin(4 * Math.PI * f * desde) +
          0.11 * Math.sin(6 * Math.PI * f * desde)
        );
        izq += s * (1 - nota.pan * 0.55);
        der += s * (1 - (1 - nota.pan) * 0.55);
      }
    }

    const g = envolvente(t) / 1.35;
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, izq * g)) * 32767), i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, der * g)) * 32767), i * 4 + 2);
  }

  writeFileSync(salidaWav, Buffer.concat([cabeceraWav(n), buf]));
  return { segundos, muestras: n, gruposEnVentana: cerca.length };
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
