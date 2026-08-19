/**
 * Loop de particulas con canal alfa, dibujado pixel a pixel y canalizado a
 * ffmpeg. Sin navegador: son motas de polvo, no hace falta un motor de render.
 *
 * El loop es perfecto por construccion. Cada mota vive un ciclo completo
 * dentro del periodo y su opacidad vale cero al principio y al final del
 * ciclo, asi que el fotograma que cierra el bucle y el que lo abre son
 * identicos: da igual donde se corte. No hay que cuadrar posiciones.
 *
 * Se genera una vez y se repite durante todo el video, que es lo unico que
 * hace viable poner particulas sobre media hora sin renderizar 58.000
 * fotogramas con transparencia.
 */

import { spawn } from 'node:child_process';
import { rutaFfmpeg } from './audio.mjs';

/** Aleatoriedad con semilla: dos ejecuciones dan el mismo loop. */
function generador(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function crearMotas({ cuantas, ancho, alto, semilla = 20260818 }) {
  const r = generador(semilla);

  return Array.from({ length: cuantas }, () => {
    // Profundidad: las cercanas son mayores, mas nitidas y se mueven algo mas;
    // las lejanas quedan pequenas, difusas y casi quietas. Es lo que separa
    // una capa de puntos de un volumen con aire dentro.
    const cerca = r();
    const radio = 1.4 + cerca * 2.6;

    return {
      x: r() * ancho,
      y: r() * alto,
      radio,
      // Difuminado independiente del tamano: algunas motas quedan fuera de
      // foco aunque sean grandes, como pasa con la profundidad de campo real.
      difuso: 1.5 + (1 - cerca) * 1.9 + r() * 0.7,
      // Deriva sobre todo lateral. La vertical es una decima parte: flotan,
      // no caen. Si cayeran pareceria nieve, y eso es lo que hay que evitar.
      vx: (r() < 0.5 ? -1 : 1) * (5 + cerca * 9 + r() * 4),
      vy: (r() - 0.5) * 2.4,
      fase: r(),
      ciclos: 1 + Math.floor(r() * 2),
      // Opacidades muy repartidas: unas pocas se ven claras y el resto solo
      // se insinua. Un brillo uniforme se lee como una retícula de puntos.
      brillo: 0.16 + cerca * 0.34 + r() * 0.16,
      vaiven: 4 + r() * 10,
      periodoVaiven: 9 + r() * 13,
    };
  });
}

function dibujar(datos, ancho, alto, motas, t, periodo) {
  datos.fill(0);

  for (const m of motas) {
    const fase = (m.fase + (t / periodo) * m.ciclos) % 1;
    // Opacidad en seno al cuadrado: vale 0 en los extremos del ciclo, asi que
    // la mota nace y muere invisible y el bucle no tiene costura.
    const op = Math.sin(Math.PI * fase) ** 2 * m.brillo;
    if (op < 0.004) continue;

    const x = ((m.x + m.vx * t + Math.sin((2 * Math.PI * t) / m.periodoVaiven) * m.vaiven) % ancho + ancho) % ancho;
    const y = ((m.y + m.vy * t) % alto + alto) % alto;

    const alcance = m.radio * m.difuso;
    const desdeX = Math.max(0, Math.floor(x - alcance));
    const hastaX = Math.min(ancho - 1, Math.ceil(x + alcance));
    const desdeY = Math.max(0, Math.floor(y - alcance));
    const hastaY = Math.min(alto - 1, Math.ceil(y + alcance));

    for (let py = desdeY; py <= hastaY; py++) {
      for (let px = desdeX; px <= hastaX; px++) {
        const d = Math.hypot(px - x, py - y);
        if (d > alcance) continue;
        // Caida gaussiana: borde difuso, sin el aliasing de un circulo duro.
        // El divisor lleva el difuminado, asi que dos motas del mismo tamano
        // pueden estar una enfocada y otra no.
        const caida = Math.exp(-((d / (m.radio * m.difuso * 0.45)) ** 2));
        const a = Math.round(op * caida * 255);
        if (a <= 0) continue;
        const i = (py * ancho + px) * 4;
        // Blanco, no gris: son motas luminosas suspendidas en el aire, no
        // polvo. El difuminado ya se encarga de que no parezcan puntos duros.
        if (a > datos[i + 3]) {
          datos[i] = 255; datos[i + 1] = 255; datos[i + 2] = 255; datos[i + 3] = a;
        }
      }
    }
  }
}

/**
 * Escribe el loop como MOV con alfa (qtrle, sin perdida). Con fotogramas casi
 * transparentes el RLE los comprime a casi nada, y al ser sin perdida las
 * motas no arrastran los halos que dejaria un codec con perdida sobre alfa.
 */
export async function generarLoop({
  salida, ancho = 1920, alto = 1080, fps = 30, periodo = 24, cuantas = 82, semilla,
}) {
  const ffmpeg = await rutaFfmpeg();
  const motas = crearMotas({ cuantas, ancho, alto, semilla });
  const total = Math.round(periodo * fps);
  const datos = Buffer.alloc(ancho * alto * 4);

  const p = spawn(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${ancho}x${alto}`, '-r', String(fps),
    '-i', 'pipe:0',
    '-c:v', 'qtrle', '-pix_fmt', 'argb',
    salida,
  ], { stdio: ['pipe', 'ignore', 'pipe'] });

  let error = '';
  p.stderr.on('data', (d) => (error += d));

  for (let f = 0; f < total; f++) {
    dibujar(datos, ancho, alto, motas, f / fps, periodo);
    if (!p.stdin.write(Buffer.from(datos))) {
      await new Promise((r) => p.stdin.once('drain', r));
    }
  }
  p.stdin.end();

  await new Promise((resolve, reject) => {
    p.on('error', reject);
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`qtrle salio con ${c}:\n${error.slice(-800)}`))));
  });

  return { fotogramas: total, periodo, motas: motas.length };
}
