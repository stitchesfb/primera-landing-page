/**
 * Regresion de la anomalia que se vio en el minuto 1:12 de la segunda muestra:
 * un parpadeo visual y, a la vez, un barrido de grave a agudo en la musica.
 *
 * Eran dos fallos distintos que coincidian en el tiempo:
 *   - el bucle de particulas no cerraba (24 s x 3 = 72 s de la muestra),
 *   - el cruce de acordes interpolaba FRECUENCIA en vez de amplitud
 *     (el cruce hacia el cuarto acorde empieza en el segundo 406 = 1:12).
 */
import { readFileSync, unlinkSync } from 'node:fs';
import { crearMotas, fotogramaEn } from '../lib/particulas.mjs';
import { generarCama } from '../lib/musica.mjs';

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'ok   ' : 'FALLO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };

// --- el bucle de particulas tiene que cerrar --------------------------
const ancho = 480, alto = 270, periodo = 24;
const motas = crearMotas({ cuantas: 82, ancho, alto });
const f = (t) => fotogramaEn({ motas, ancho, alto, t, periodo });

const maxDif = (a, b) => { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m; };
const alfaMedio = (b) => { let s = 0; for (let i = 3; i < b.length; i += 4) s += b[i]; return s / (b.length / 4); };

check('el fotograma del periodo coincide con el del inicio', maxDif(f(0), f(periodo)) === 0);
check('y tambien a media vuelta', maxDif(f(periodo / 2), f(periodo * 1.5)) === 0);

// Que cierre por estar todo apagado no vale: seria un parpadeo global.
const cobertura = [0, periodo / 4, periodo / 2, (periodo * 3) / 4].map((t) => alfaMedio(f(t)));
check('hay motas visibles en la costura', cobertura[0] > 0.5, `alfa medio ${cobertura[0].toFixed(2)}`);
check('la densidad no se desploma en ningun momento',
  Math.min(...cobertura) > Math.max(...cobertura) * 0.45,
  cobertura.map((v) => v.toFixed(2)).join(' · '));

// Nadie nace ni muere de golpe: el relevo entre ciclos es invisible.
let saltoMax = 0;
for (let i = 0; i < 60; i++) {
  const t = (i * periodo) / 60;
  saltoMax = Math.max(saltoMax, Math.abs(alfaMedio(f(t)) - alfaMedio(f(t + 1 / 30))));
}
check('sin saltos de densidad entre fotogramas', saltoMax < 0.35, `maximo ${saltoMax.toFixed(3)}`);

// --- el cruce de acordes no puede barrer la frecuencia ----------------
//
// Frecuencia dominante estimada por cruces por cero. Con el fallo, en el
// cruce se disparaba a miles de hercios; el pad vive por debajo de 1,4 kHz.
function hzDominante(muestras, desde, largo) {
  let cruces = 0;
  for (let i = desde + 1; i < desde + largo; i++) {
    if ((muestras[i - 1] < 0) !== (muestras[i] < 0)) cruces++;
  }
  return (cruces / 2) * (44100 / largo);
}

const wav = '/tmp/test-cruce.wav';
// El cruce hacia el cuarto acorde va del segundo 406 al 432.
generarCama({ segundos: 40, offset: 396, envolvente: () => 0.3, apertura: () => 0, grupos: [], salidaWav: wav });
const crudo = readFileSync(wav);
const n = (crudo.length - 44) / 4;
const izq = new Float64Array(n);
for (let i = 0; i < n; i++) izq[i] = crudo.readInt16LE(44 + i * 4) / 32768;

const ventana = 44100;
const dominantes = [];
for (let s = 0; s + ventana < n; s += ventana) dominantes.push(hzDominante(izq, s, ventana));

const pico = Math.max(...dominantes);
check('la frecuencia dominante no se dispara en el cruce', pico < 2000, `pico ${pico.toFixed(0)} Hz`);
check('se mantiene estable de segundo a segundo',
  dominantes.every((v, i) => i === 0 || Math.abs(v - dominantes[i - 1]) < 400),
  `mayor salto ${Math.max(...dominantes.slice(1).map((v, i) => Math.abs(v - dominantes[i]))).toFixed(0)} Hz`);
check('el pad vive en la banda que sale por un altavoz de movil',
  dominantes.every((v) => v > 150 && v < 1500),
  `${Math.min(...dominantes).toFixed(0)}-${pico.toFixed(0)} Hz`);

unlinkSync(wav);
console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
