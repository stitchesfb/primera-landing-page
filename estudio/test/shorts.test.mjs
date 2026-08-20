/**
 * Un Short mal cortado se nota en el primer segundo: la voz entra a media
 * palabra o el clip se corta antes de que termine la frase. Lo que evita las
 * dos cosas es de donde se toman los cortes y como se recolocan los tiempos
 * cuando se acorta un interludio por el medio.
 */
import { planearShort, trasladar, palabrasDelShort } from '../lib/shorts.mjs';

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'ok   ' : 'FALLO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };
const cerca = (a, b, e = 0.001) => Math.abs(a - b) < e;

// Cuatro parrafos con una pausa corta, un interludio largo y otra pausa.
const timeline = {
  duracion_total_s: 100,
  fin_narracion_s: 90,
  segmentos: [
    { numero: 1, texto: 'Uno.',    inicio: 0,    fin: 10,   duracion: 10 },
    { numero: 2, texto: 'Dos.',    inicio: 13,   fin: 23,   duracion: 10 },
    { numero: 3, texto: 'Tres.',   inicio: 33,   fin: 41,   duracion: 8 },
    { numero: 4, texto: 'Cuatro.', inicio: 44,   fin: 50,   duracion: 6 },
  ],
  huecos: [
    { trasParrafo: 1, inicio: 10, duracion: 3,  tipo: 'pause' },
    { trasParrafo: 2, inicio: 23, duracion: 10, tipo: 'block_end' },
    { trasParrafo: 3, inicio: 41, duracion: 3,  tipo: 'pause' },
  ],
};

const plan = planearShort({ timeline, desde: 2, hasta: 4, interludioInterno: 2.5, ctaSegundos: 4 });

// --- de donde salen los cortes ---------------------------------------------
check('la entrada sale del silencio anterior, sin invadir el parrafo previo',
  cerca(plan.entrada, 0.6) && plan.inicioEnVideo > 10,
  `entrada ${plan.entrada}s, corte en ${plan.inicioEnVideo}s`);
check('la salida sale del silencio posterior',
  cerca(plan.salida, 0.9) && plan.finEnVideo < 53,
  `salida ${plan.salida}s, corte en ${plan.finEnVideo}s`);

// Con un silencio corto no se puede tomar el respiro entero: como mucho la
// mitad, o el corte se comeria la ultima palabra del parrafo vecino.
const apretado = planearShort({
  timeline, desde: 4, hasta: 4, entradaMax: 5, salidaMax: 5, ctaSegundos: 0,
});
check('nunca se toma mas de la mitad del silencio disponible',
  apretado.entrada <= 3 / 2 + 0.001, `${apretado.entrada}s de los 3s disponibles`);

// --- el interludio se acorta y todo lo posterior se desplaza ---------------
check('el interludio largo se acorta', plan.recortes.length === 1 &&
  plan.recortes[0].recortadoDe === 10 && plan.recortes[0].duracionDestino === 2.5,
  `${plan.recortes[0]?.recortadoDe}s → ${plan.recortes[0]?.duracionDestino}s`);

// 0.6 entrada + 10 (p2) + 2.5 (interludio recortado) + 8 (p3) + 3 (pausa)
// + 6 (p4) + 0.9 salida + 4 cierre
check('la duracion sale de los tramos, no de la resta de extremos',
  cerca(plan.duracion, 0.6 + 10 + 2.5 + 8 + 3 + 6 + 0.9 + 4),
  `${plan.duracion.toFixed(2)}s`);
check('el silencio contado es el recortado, no el original',
  cerca(plan.segundosSilencio, 2.5 + 3), `${plan.segundosSilencio}s`);

// --- los tiempos se recolocan bien ----------------------------------------
check('el primer parrafo empieza justo tras el respiro de entrada',
  cerca(trasladar(plan, 13), 0.6), `${trasladar(plan, 13)}`);
check('el final del primer parrafo cuadra', cerca(trasladar(plan, 23), 10.6));
// El parrafo 3 empieza en 33 en el original. En el Short: 0.6 + 10 + 2.5.
check('lo que va tras el interludio se adelanta lo que se recorto',
  cerca(trasladar(plan, 33), 13.1), `${trasladar(plan, 33)}`);
check('un instante anterior al Short no se traslada', trasladar(plan, 5) === null);
check('un instante posterior al Short no se traslada', trasladar(plan, 80) === null);

// Lo que se recorto del interludio no puede seguir apareciendo: un instante
// que caia en el trozo eliminado no tiene sitio en el Short.
check('lo eliminado del interludio no se traslada', trasladar(plan, 31) === null,
  `${trasladar(plan, 31)}`);

// --- las palabras viajan con sus tiempos ----------------------------------
const palabras = [
  { texto: 'antes', inicio: 5,    fin: 6 },
  { texto: 'Dos',   inicio: 13.2, fin: 13.8 },
  { texto: 'Tres',  inicio: 33.5, fin: 34.1 },
  { texto: 'lejos', inicio: 80,   fin: 81 },
];
const dentro = palabrasDelShort(plan, palabras);
check('solo viajan las palabras del Short', dentro.length === 2,
  dentro.map((p) => p.texto).join(', '));
check('las palabras llegan con el tiempo del Short',
  cerca(dentro[0].inicio, 0.8) && cerca(dentro[1].inicio, 13.6),
  dentro.map((p) => `${p.texto}@${p.inicio.toFixed(2)}`).join(' '));
check('ninguna palabra se sale del Short',
  dentro.every((p) => p.fin <= plan.duracion));

// --- sin interludio largo por el medio no se recorta nada -----------------
const simple = planearShort({ timeline, desde: 3, hasta: 4, ctaSegundos: 0 });
check('sin interludio largo no hay recortes', simple.recortes.length === 0);
check('un Short contiguo dura lo que va de corte a corte',
  cerca(simple.duracion, simple.finEnVideo - simple.inicioEnVideo),
  `${simple.duracion.toFixed(2)}s`);

console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
