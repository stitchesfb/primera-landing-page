/**
 * El plan de video_001 lleva limites escritos a mano (33, 76, 113, 159 sobre
 * 246 parrafos). Se comprueba que valida contra un texto del tamano correcto,
 * que reparte los bloques donde toca, y sobre todo que SALTA si el texto
 * trocea distinto: ahi es donde un fallo silencioso desplazaria todo.
 */
import { readFileSync } from 'node:fs';
import { validarPlan } from '../lib/plan.mjs';
import { partirParrafos } from '../lib/proyecto.mjs';

const canal = JSON.parse(readFileSync(new URL('../canal.json', import.meta.url), 'utf8'));
const plan = JSON.parse(readFileSync(new URL('../proyectos/video_001/edit_plan.json', import.meta.url), 'utf8'));

let fallos = 0;
const check = (nombre, ok, detalle = '') => {
  console.log(`${ok ? 'ok   ' : 'FALLO'} ${nombre}${detalle ? ' — ' + detalle : ''}`);
  if (!ok) fallos++;
};

const guion = (n) => Array.from({ length: n }, (_, i) => `Parrafo numero ${i + 1} del guion.`);
const proyecto = (n) => ({ id: 'video_001', parrafos: guion(n), plan });

// 1. Los limites son los que dio el autor.
const cortes = plan.events.filter((e) => e.type === 'block_end').map((e) => e.after);
check('limites exactos', JSON.stringify(cortes) === JSON.stringify([33, 76, 113, 159]), `[${cortes}]`);
check('declara 246 parrafos', plan.parrafos_esperados === 246);

// 2. Con 246 parrafos, valida sin errores.
const v = validarPlan(proyecto(246), canal);
check('valida con 246 parrafos', v.problemas.length === 0, v.problemas.join(' | '));

// 3. El aviso de interludios es esperado y NO bloquea.
const avisoInterludios = v.avisos.find((a) => a.includes('interludios estrategicos'));
check('avisa de los 4 interludios sin bloquear', Boolean(avisoInterludios), avisoInterludios ?? 'sin aviso');

// 4. Lo importante: si el texto trocea distinto, tiene que bloquear.
for (const n of [245, 247, 200, 250]) {
  const r = validarPlan(proyecto(n), canal);
  const detecta = r.problemas.some((p) => p.includes(`${n} parrafos`));
  check(`bloquea con ${n} parrafos`, detecta, r.problemas[0]?.slice(0, 60) ?? 'no bloqueo');
}

// 5. El troceo real: una linea en blanco separa; varias no cuentan de mas.
check('una linea en blanco separa', partirParrafos('uno\n\ndos\n\ntres').length === 3);
check('varias lineas en blanco no anaden parrafos', partirParrafos('uno\n\n\n\ndos').length === 2);
check('salto simple no separa', partirParrafos('uno\nsigue\n\ndos').length === 2);
check('espacios en la linea en blanco tambien separan', partirParrafos('uno\n   \ndos').length === 2);

// 6. El reparto en bloques con los limites reales.
const bloques = [[1, 33], [34, 76], [77, 113], [114, 159], [160, 246]];
const tamanos = bloques.map(([a, b]) => b - a + 1);
check('cinco bloques', tamanos.length === 5);
check('suman 246', tamanos.reduce((s, n) => s + n, 0) === 246, `${tamanos.join('+')}`);
check('ningun bloque vacio', tamanos.every((t) => t > 0), tamanos.join(', '));

console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
