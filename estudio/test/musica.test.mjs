/**
 * Lo que hay que garantizar de la cama: que en los interludios se ABRA, no
 * solo suba, y que una ventana recortada suene igual que en el render
 * completo. Sin lo segundo, aprobar una muestra no significaria nada.
 */
import {
  aperturaEn, nivelEn, planearPiano, envolventePiano,
  TECHO_PIANO, AMP_PIANO_MAX,
} from '../lib/musica.mjs';

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


// --------------------------------------------------------------------------
// Que el piano no vuelva a sonar a timer.
//
// El fallo reportado fueron once momentos ("12:15, 17:50, 18:43...") que se
// oian como una alarma domestica. Diagnostico: cada uno de ellos contenia una
// nota por encima de 1 kHz, y el ataque era de 11 ms. Tono puro alto + golpe
// seco = pitido. Estas comprobaciones fijan las cuatro condiciones que lo
// evitan, medidas sobre un video de la duracion real (32:41), no sobre el
// escenario corto de arriba.

// Escenario con la forma real de video_001: 32:41, once interludios de 6 a 12
// segundos y el cierre musical tras el Amen. El de arriba abre la cama a los
// 900 s y la deja abierta, que sirve para probar rampas pero no densidad.
const huecosReales = [
  [497, 6], [640, 10], [738, 6], [908, 10], [1090, 10],
  [1180, 6], [1350, 10], [1420, 6], [1690, 10], [1830, 12],
];
const formaLarga = {
  huecos: huecosReales.map(([inicio, duracion]) => ({ inicio, duracion })),
  finNarracion: 1936,
  rampa: 1.5,
};
const apLarga = (t) => aperturaEn(t, formaLarga);
const largo = planearPiano({ duracionTotal: 1961, apertura: apLarga });
const notas = largo.flatMap((g) => g.notas);
const agudas = notas.filter((n) => n.hz > TECHO_PIANO);

check('ninguna nota por encima del techo del registro medio',
  agudas.length === 0,
  `max ${Math.max(...notas.map((n) => n.hz)).toFixed(0)} Hz de ${TECHO_PIANO}`);

const sobre700 = notas.filter((n) => n.hz > 700).length;
check('el registro medio manda sobre el agudo',
  sobre700 / notas.length < 0.25,
  `${((sobre700 / notas.length) * 100).toFixed(0)}% por encima de 700 Hz`);

check('ninguna nota pasa el techo de amplitud',
  notas.every((n) => n.amp <= AMP_PIANO_MAX + 1e-9),
  `max ${Math.max(...notas.map((n) => n.amp)).toFixed(3)} de ${AMP_PIANO_MAX}`);

// Un ataque corto es lo que convierte un tono en un aviso. Se mide sobre la
// envolvente real que usa el render, no sobre una copia.
let pico = 0;
for (let t = 0; t <= 7.5; t += 0.001) pico = Math.max(pico, envolventePiano(t));
let t90 = Infinity;
for (let t = 0; t <= 7.5; t += 0.001) {
  if (envolventePiano(t) >= 0.9 * pico) { t90 = t; break; }
}
check('la nota florece en vez de golpear', t90 >= 0.12,
  `90% del pico a los ${(t90 * 1000).toFixed(0)} ms`);
check('la nota tiene cola, no es un click', envolventePiano(3) > 0.15,
  envolventePiano(3).toFixed(2));

// Frecuencia: notas aisladas espaciadas, no un goteo constante.
const sepLargo = largo.slice(1).map((g, i) => g.t - largo[i].t);
check('nunca dos grupos a menos de nueve segundos', Math.min(...sepLargo) >= 9,
  `minima ${Math.min(...sepLargo).toFixed(1)}s`);
check('el piano no llega a tres grupos por minuto',
  (largo.length / 1961) * 60 < 3,
  `${((largo.length / 1961) * 60).toFixed(2)} grupos/min`);

// Grupos de tres: la excepcion, no la norma. Un grupo denso llama la atencion.
const tercias = largo.filter((g) => g.notas.length === 3).length;
check('los grupos de tres notas son minoria',
  tercias / largo.length < 0.35, `${tercias} de ${largo.length}`);

console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
