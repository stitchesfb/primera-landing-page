/**
 * El reparto por duracion tiene que reconstruir los limites reales de bloque.
 *
 * Se construye un guion con limites conocidos, se calculan las duraciones que
 * tendria cada bloque al ritmo medido, y se comprueba que el algoritmo los
 * recupera. Incluye ruido: bloques desiguales y una duracion con silencio de
 * cola, que es lo que pasa en un mp3 real.
 */
import { repartirPorDuracion, construirPlan, citaBiblica } from '../lib/autoplan.mjs';
import { readFileSync } from 'node:fs';

const canal = JSON.parse(readFileSync(new URL('../canal.json', import.meta.url), 'utf8'));
const RITMO = canal.constantes.caracteres_por_minuto;

let fallos = 0;
const check = (nombre, ok, detalle = '') => {
  console.log(`${ok ? 'ok   ' : 'FALLO'} ${nombre}${detalle ? ' — ' + detalle : ''}`);
  if (!ok) fallos++;
};

// Parrafos de longitud variable, como en un guion real.
const frase = (n) => 'palabra '.repeat(n).trim() + '.';
const hacerGuion = (tamanos) => tamanos.map((t) => frase(t));

// Limites reales: bloques de 4, 3, 5, 3 y 4 parrafos.
const TAMANOS = [12,18,9,15, 20,11,14, 8,16,13,19,10, 17,9,12, 14,11,16,13];
const LIMITES = [4, 7, 12, 15];
const parrafos = hacerGuion(TAMANOS);

const bloquesReales = [];
let desde = 0;
for (const corte of [...LIMITES, parrafos.length]) {
  bloquesReales.push(Array.from({length: corte - desde}, (_, i) => desde + i));
  desde = corte;
}

// Duraciones derivadas del ritmo, con medio segundo de cola por bloque.
const duraciones = bloquesReales.map((b) => {
  const chars = b.reduce((s, i) => s + parrafos[i].length, 0);
  return (chars / RITMO) * 60 + 0.5;
});

const { bloques, cortes, diagnostico } = repartirPorDuracion(parrafos, duraciones);
check('recupera los cuatro limites', JSON.stringify(cortes) === JSON.stringify(LIMITES),
  `dedujo [${cortes}] esperado [${LIMITES}]`);
check('cinco bloques', bloques.length === 5);
check('ningun parrafo perdido',
  bloques.flat().length === parrafos.length && new Set(bloques.flat()).size === parrafos.length);
check('desvios pequenos', diagnostico.every((d) => Math.abs(d.desvioPct) < 12),
  diagnostico.map((d) => d.desvioPct.toFixed(1) + '%').join(' '));

// Bloques muy desiguales: uno corto y uno largo.
const p2 = hacerGuion([10,10, 40,40,40,40,40, 10]);
const lim2 = [2, 7];
const b2 = [[0,1],[2,3,4,5,6],[7]];
const d2 = b2.map((b) => (b.reduce((s,i)=>s+p2[i].length,0) / RITMO) * 60 + 0.4);
const r2 = repartirPorDuracion(p2, d2);
check('bloques desiguales', JSON.stringify(r2.cortes) === JSON.stringify(lim2),
  `dedujo [${r2.cortes}]`);

// Nunca deja un bloque vacio, aunque las duraciones enganen.
const r3 = repartirPorDuracion(hacerGuion([5,5,5,5,5]), [0.1, 0.1, 100, 0.1, 0.1]);
check('ningun bloque vacio', r3.bloques.every((b) => b.length >= 1),
  r3.bloques.map((b) => b.length).join(','));

// Deteccion de citas biblicas, con y sin acentos.
check('detecta cita con acento', citaBiblica('Como dice Isaías 41, no temas.'));
check('detecta cita sin acento', citaBiblica('En el Salmo 91 leemos.'));
check('no marca prosa normal', !citaBiblica('Padre, gracias por este dia nuevo.'));

// El plan resultante.
const plan = construirPlan({ id: 'x', pilar: 'noche', parrafos, bloques, canal });
const blockEnds = plan.events.filter((e) => e.type === 'block_end');
check('cuatro block_end', blockEnds.length === 4, `${blockEnds.length}`);
check('block_end en los limites reales',
  JSON.stringify(blockEnds.map((e) => e.after)) === JSON.stringify(LIMITES),
  `[${blockEnds.map((e) => e.after)}]`);
check('lleva cierre', plan.events.some((e) => e.at === 'end' && e.type === 'outro'));
check('pausa por defecto dentro de norma',
  plan.defaults.pause_after_paragraph >= canal.reglas_edicion.pausa_parrafo_min &&
  plan.defaults.pause_after_paragraph <= canal.reglas_edicion.pausa_parrafo_max);

console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
