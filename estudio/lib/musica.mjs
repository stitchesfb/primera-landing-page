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

// Por encima de este techo una nota pulsada deja de sonar a instrumento en un
// video para dormir y empieza a sonar a alarma.
export const TECHO_PIANO = 1000;
// Cola de la nota de piano, en segundos.
export const DECAE_PIANO = 7.5;
// Techo de amplitud de una nota suelta, antes de la envolvente de la cama.
export const AMP_PIANO_MAX = 0.085;
// Constante del ataque: 1 - exp(-t*ATAQUE_PIANO). Cuanto mas baja, mas florece.
const ATAQUE_PIANO = 14;

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

    // Registro medio. El multiplicador x4 llevaba notas hasta 2349 Hz, y ahi
    // un tono pulsado deja de leerse como instrumento y se lee como aviso: los
    // once momentos que se reportaron como timer contenian todos una nota por
    // encima de 1 kHz. Se queda en x1 y x2, con tope en TECHO_PIANO.
    const candidatas = [];
    for (const base of tonos) {
      for (const oct of [1, 2]) {
        const hz = base * oct;
        if (hz <= TECHO_PIANO) candidatas.push(hz);
      }
    }

    // Dos notas casi siempre. La tercera es rara incluso con la cama abierta:
    // un grupo denso llama mas la atencion que uno escueto.
    const cuantas = r() < 0.12 + 0.16 * abierto ? 3 : 2;
    const notas = [];
    let anterior = -1;
    for (let i = 0; i < cuantas; i++) {
      let k = Math.floor(r() * candidatas.length);
      if (k === anterior) k = (k + 1 + Math.floor(r() * (candidatas.length - 1))) % candidatas.length;
      anterior = k;
      notas.push({
        hz: candidatas[k],
        retardo: i === 0 ? 0 : 0.35 + r() * 0.7,
        // Muy por debajo del pad: el piano tiene que asomar, no anunciarse.
        amp: AMP_PIANO_MAX - 0.04 + r() * 0.04,
        pan: r(),
      });
    }
    // Acumula los retardos para que las notas caigan una tras otra.
    for (let i = 1; i < notas.length; i++) notas[i].retardo += notas[i - 1].retardo;

    grupos.push({ t, notas });

    // Con la cama abierta el piano habla algo mas seguido, pero mucho menos que
    // antes: en los interludios no hay voz que lo tape y cualquier exceso se
    // convierte en el elemento que mas se oye del video.
    const espera = (26 - 11 * abierto) * (0.8 + r() * 0.4);
    t += Math.max(9, espera);
  }
  return grupos;
}

/**
 * Una nota de piano en el instante `desde` de su vida, amplitud 1.
 *
 * Vive aparte para que la muestra, el render completo y el test midan la misma
 * curva: si el ataque vuelve a endurecerse, el test lo ve.
 *
 * Ataque que florece, no que golpea: unos 200 ms hasta el cuerpo de la nota.
 * Con los 11 ms de antes el transitorio era lo unico que se oia, y un
 * transitorio duro sobre un tono puro es un pitido.
 *
 * Los armonicos se apagan antes que el fundamental, como en una cuerda de
 * verdad: la nota entra con algo de brillo y se redondea sola.
 */
export function muestraPiano(f, desde) {
  if (desde < 0 || desde > DECAE_PIANO) return 0;
  const ataque = 1 - Math.exp(-desde * ATAQUE_PIANO);
  const cuerpo = Math.exp(-desde * (2.6 / DECAE_PIANO));
  const arm2 = Math.exp(-desde * (7.0 / DECAE_PIANO));
  const arm3 = Math.exp(-desde * (11.0 / DECAE_PIANO));
  return ataque * (
    cuerpo * Math.sin(2 * Math.PI * f * desde) +
    0.10 * arm2 * Math.sin(4 * Math.PI * f * desde) +
    0.028 * arm3 * Math.sin(6 * Math.PI * f * desde)
  );
}

/** Envolvente de la nota (sin la portadora): el contorno que se oye. */
export function envolventePiano(desde) {
  if (desde < 0 || desde > DECAE_PIANO) return 0;
  return (1 - Math.exp(-desde * ATAQUE_PIANO)) * Math.exp(-desde * (2.6 / DECAE_PIANO));
}

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
    //
    // Los dos acordes suenan a la vez durante el cruce, cada uno a su altura
    // fija, y lo que se cruza son sus VOLUMENES.
    //
    // Interpolar la frecuencia dentro de sin(2*pi*f*t) parece equivalente y no
    // lo es: la frecuencia instantanea pasa a ser f + t*f', y ese segundo
    // termino crece con el tiempo transcurrido. En el minuto siete, un cambio
    // de 150 Hz repartido en medio minuto se convierte en un barrido de miles
    // de hercios. Era el chirrido de grave a agudo que aparecia en cada cruce.
    //
    // Cruce de potencia constante: dos acordes distintos no se suman en fase,
    // asi que la raiz mantiene el volumen percibido estable.
    const gA = Math.sqrt(1 - mezcla);
    const gB = Math.sqrt(mezcla);

    for (let v = 0; v < 4; v++) {
      const resp = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / LFOS[v]));
      const amp = AMPS[v] * resp;
      const d = 0.055 + v * 0.02;
      // Un armonico impar suave da cuerpo sin volverlo metalico.
      const w = (f) => Math.sin(2 * Math.PI * f * t) + 0.14 * Math.sin(6 * Math.PI * f * t);

      if (gA > 0) {
        izq += amp * gA * w(a.voces[v] - d);
        der += amp * gA * w(a.voces[v] + d);
      }
      if (gB > 0) {
        izq += amp * gB * w(b.voces[v] - d);
        der += amp * gB * w(b.voces[v] + d);
      }
    }

    // Voz alta que solo entra cuando la cama se abre: cambia el color, no el
    // volumen, que es la diferencia entre respirar y subir el fader.
    if (abierto > 0.01) {
      const brillo = 0.05 * abierto * (0.6 + 0.4 * Math.sin((2 * Math.PI * t) / 13.1));
      const alto = (f, g) => {
        if (g <= 0) return;
        izq += brillo * g * Math.sin(2 * Math.PI * (f - 0.3) * t);
        der += brillo * g * Math.sin(2 * Math.PI * (f + 0.3) * t);
      };
      alto(a.voces[1] * 4, gA);
      alto(b.voces[1] * 4, gB);
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
        const s = nota.amp * muestraPiano(nota.hz, desde);
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
