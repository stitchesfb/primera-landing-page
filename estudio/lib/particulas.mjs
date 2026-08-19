/**
 * Loop de particulas con canal alfa, dibujado pixel a pixel y canalizado a
 * ffmpeg. Sin navegador: son motas de polvo, no hace falta un motor de render.
 *
 * El loop cierra por construccion, con una cinta transportadora: cada mota
 * vive un numero ENTERO de ciclos dentro del periodo, y en cada ciclo nace en
 * una posicion que depende solo de (mota, numero de ciclo). Su opacidad vale
 * cero justo al nacer y al morir, asi que el relevo no se ve.
 *
 * Al completarse el periodo, el contador de ciclo vuelve a cero: misma
 * posicion de nacimiento, misma opacidad nula. El fotograma que cierra el
 * bucle y el que lo abre coinciden.
 *
 * La version anterior daba por hecho que bastaba con la opacidad, pero cada
 * mota arrancaba con fase aleatoria: en la costura estaban a media vida y en
 * posiciones distintas, y el salto se veia. Medido, el ultimo fotograma
 * difería del primero en 219 sobre 255.
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

  return Array.from({ length: cuantas }, (_, id) => {
    // Profundidad: las cercanas son mayores, mas nitidas y se mueven algo mas;
    // las lejanas quedan pequenas, difusas y casi quietas. Es lo que separa
    // una capa de puntos de un volumen con aire dentro.
    const cerca = r();
    const radio = 1.4 + cerca * 2.6;

    return {
      id,
      radio,
      // Difuminado independiente del tamano: algunas motas quedan fuera de
      // foco aunque sean grandes, como pasa con la profundidad de campo real.
      difuso: 1.5 + (1 - cerca) * 1.9 + r() * 0.7,
      // Deriva sobre todo lateral. La vertical es una decima parte: flotan,
      // no caen. Si cayeran pareceria nieve, y eso es lo que hay que evitar.
      vx: (r() < 0.5 ? -1 : 1) * (5 + cerca * 9 + r() * 4),
      vy: (r() - 0.5) * 2.4,
      // Ciclos enteros dentro del periodo: sin eso el bucle no puede cerrar.
      ciclos: 1 + Math.floor(r() * 2),
      // Desfase propio dentro del ciclo. Sin el, todas nacerian y moririan a
      // la vez y el campo entero parpadearia en cada relevo. Con el, el bucle
      // sigue cerrando: al completarse el periodo, cada mota vuelve a su mismo
      // punto del ciclo y al mismo numero de ciclo.
      desfase: r(),
      // Opacidades muy repartidas: unas pocas se ven claras y el resto solo
      // se insinua. Un brillo uniforme se lee como una reticula de puntos.
      brillo: 0.16 + cerca * 0.34 + r() * 0.16,
      vaiven: 4 + r() * 10,
      // Vueltas enteras de vaiven por ciclo, para que empiece y acabe en cero.
      vueltas: 1 + Math.floor(r() * 2),
    };
  });
}

/**
 * Posicion de nacimiento de una mota en un ciclo dado.
 *
 * Depende solo de (mota, ciclo), nunca del tiempo: por eso al volver el
 * contador a cero la mota reaparece exactamente donde estaba al principio.
 */
function nacimiento(mota, ciclo, ancho, alto) {
  let h = Math.imul(mota.id * 73856093 ^ ciclo * 19349663, 2654435761) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 1274126177) >>> 0;
  const a = (h >>> 8) / 16777216;
  h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0;
  const b = (h >>> 8) / 16777216;
  return { x: a * ancho, y: b * alto };
}

export function fotogramaEn({ motas, ancho, alto, t, periodo }) {
  const datos = Buffer.alloc(ancho * alto * 4);
  dibujar(datos, ancho, alto, motas, t, periodo);
  return datos;
}

function dibujar(datos, ancho, alto, motas, t, periodo) {
  datos.fill(0);

  for (const m of motas) {
    const largoCiclo = periodo / m.ciclos;
    const avance = t / largoCiclo + m.desfase;
    const ciclo = Math.floor(avance) % m.ciclos;
    const u = avance - Math.floor(avance);

    // Nace y muere invisible, asi que el relevo entre ciclos no se percibe.
    const op = Math.sin(Math.PI * u) ** 2 * m.brillo;
    if (op < 0.004) continue;

    const cuna = nacimiento(m, ciclo, ancho, alto);
    const transcurrido = u * largoCiclo;
    const sway = Math.sin(2 * Math.PI * m.vueltas * u) * m.vaiven;

    const x = ((cuna.x + m.vx * transcurrido + sway) % ancho + ancho) % ancho;
    const y = ((cuna.y + m.vy * transcurrido) % alto + alto) % alto;

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
        const caida = Math.exp(-((d / (m.radio * m.difuso * 0.45)) ** 2));
        const a = Math.round(op * caida * 255);
        if (a <= 0) continue;
        const i = (py * ancho + px) * 4;
        // Blanco, no gris: son motas luminosas suspendidas en el aire.
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
