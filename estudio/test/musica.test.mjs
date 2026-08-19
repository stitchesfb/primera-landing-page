/**
 * Lo que hay que garantizar de la cama: que en los interludios se ABRA, no
 * solo suba, y que una ventana recortada suene igual que en el render
 * completo. Sin lo segundo, aprobar una muestra no significaria nada.
 */
import { aperturaEn, nivelEn, planearPiano } from '../lib/musica.mjs';

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'ok   ' : 'FALLO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };

const huecos = [
  { trasParrafo: 1, inicio: 100, duracion: 10 },
  { trasParrafo: 2, inicio: 300, duracion: 12 },
];
const forma = { huecos, finNarracion: 900, rampa: 1.5 };
const ap = (t) => aperturaEn(t, forma);

// Apertura: cerrada bajo la voz, abierta en el hueco, con rampa a los lados.
check('cerrada mientras habla la voz', ap(50) === 0);
check('abierta en pleno interludio', ap(105) === 1);
check('rampa de entrada', ap(99.25) > 0 && ap(99.25) < 1, ap(99.25).toFixed(2));
check('rampa de salida', ap(110.75) > 0 && ap(110.75) < 1, ap(110.75).toFixed(2));
check('cerrada otra vez despues', ap(120) === 0);
check('abierta tras el Amen', ap(920) === 1);

// Nivel: sube en el interludio, y nunca al reves.
const nivel = (t) => nivelEn(t, {
  ...forma, cierre: { fadeIn: 4, fadeOut: 8, duracionTotal: 960 },
  bajoVoz: -23, enInterludio: -15.5,
});
const dB = (g) => 20 * Math.log10(g);
check('bajo la voz esta en su nivel', Math.abs(dB(nivel(50)) - (-23)) < 0.1, dB(nivel(50)).toFixed(2));
check('en interludio sube ~7.5 dB', Math.abs(dB(nivel(105)) - (-15.5)) < 0.1, dB(nivel(105)).toFixed(2));
check('entra con fundido', nivel(0.5) < nivel(50));
check('sale con fundido', nivel(958) < nivel(905));

// Piano: determinista y mas denso cuando la cama esta abierta.
const a1 = planearPiano({ duracionTotal: 960, apertura: ap });
const a2 = planearPiano({ duracionTotal: 960, apertura: ap });
check('el plan de piano es determinista',
  JSON.stringify(a1) === JSON.stringify(a2), `${a1.length} grupos`);
check('grupos de 2 o 3 notas', a1.every((g) => g.notas.length >= 2 && g.notas.length <= 3));
check('sin percusion: notas separadas dentro del grupo',
  a1.every((g) => g.notas.every((n, i) => i === 0 || n.retardo > g.notas[i - 1].retardo)));

const separaciones = a1.slice(1).map((g, i) => g.t - a1[i].t);
check('varios segundos entre grupos', Math.min(...separaciones) >= 4,
  `minima ${Math.min(...separaciones).toFixed(1)}s`);
check('nunca dos grupos pegados', separaciones.every((s) => s > 3));

// La densidad tiene que subir dentro de los huecos.
const dentro = a1.filter((g) => huecos.some((h) => g.t >= h.inicio && g.t <= h.inicio + h.duracion));
const segsHueco = huecos.reduce((s, h) => s + h.duracion, 0);
const densidadHueco = dentro.length / segsHueco;
const densidadResto = (a1.length - dentro.length) / (960 - segsHueco);
check('el piano habla mas seguido en los interludios',
  densidadHueco > densidadResto,
  `${(densidadHueco * 60).toFixed(1)} vs ${(densidadResto * 60).toFixed(1)} grupos/min`);

// Sin melodia reconocible: no debe repetirse la misma secuencia de notas.
const firmas = a1.map((g) => g.notas.map((n) => n.hz.toFixed(1)).join('-'));
const repetidasSeguidas = firmas.filter((f, i) => i > 0 && f === firmas[i - 1]).length;
check('sin motivo que se repita de un grupo al siguiente', repetidasSeguidas === 0, `${repetidasSeguidas}`);

console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
