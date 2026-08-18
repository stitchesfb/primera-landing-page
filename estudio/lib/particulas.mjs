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
  return Array.from({ length: cuantas }, () => ({
    x: r() * ancho,
    y: r() * alto,
    radio: 0.9 + r() * 1.8,
    // Deriva lenta y hacia arriba: el polvo en suspension sube con el aire
    // tibio de la habitacion, no cae.
    vx: (r() - 0.5) * 14,
    vy: -(4 + r() * 12),
    fase: r(),
    // Ciclos distintos por mota para que no aparezcan y desaparezcan a la vez.
    ciclos: 1 + Math.floor(r() * 3),
    brillo: 0.05 + r() * 0.13,
    // Un leve balanceo lateral, como si el aire no fuera del todo quieto.
    vaiven: 6 + r() * 14,
    periodoVaiven: 7 + r() * 11,
  }));
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

    const r = m.radio;
    const desdeX = Math.max(0, Math.floor(x - r * 2));
    const hastaX = Math.min(ancho - 1, Math.ceil(x + r * 2));
    const desdeY = Math.max(0, Math.floor(y - r * 2));
    const hastaY = Math.min(alto - 1, Math.ceil(y + r * 2));

    for (let py = desdeY; py <= hastaY; py++) {
      for (let px = desdeX; px <= hastaX; px++) {
        const d = Math.hypot(px - x, py - y);
        if (d > r * 2) continue;
        // Caida gaussiana: borde difuso, sin el aliasing de un circulo duro.
        const caida = Math.exp(-((d / r) ** 2));
        const a = Math.round(op * caida * 255);
        if (a <= 0) continue;
        const i = (py * ancho + px) * 4;
        if (a > datos[i + 3]) {
          // Blanco calido, del color de la luz de los faroles.
          datos[i] = 255; datos[i + 1] = 248; datos[i + 2] = 232; datos[i + 3] = a;
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
  salida, ancho = 1920, alto = 1080, fps = 30, periodo = 20, cuantas = 46, semilla,
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
