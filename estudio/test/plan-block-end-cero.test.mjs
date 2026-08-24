/**
 * block_end admite "seconds": 0 para marcar la frontera estructural entre
 * dos bloques de audio sin insertar ningun silencio ahi. pause e interlude
 * siguen exigiendo una duracion mayor que cero: una pausa de 0s no tiene
 * sentido editorial, asi que solo block_end tiene la excepcion.
 */
import { validarPlan, construirLinea } from '../lib/plan.mjs';

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'ok   ' : 'FALLO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };

const canal = {
  formatos: { noche: { duracion_objetivo_min: 1, duracion_objetivo_max: 999, bloques_esperados: 3, interludios_estrategicos_min: 0, interludios_estrategicos_max: 99 } },
  reglas_edicion: {
    pausa_parrafo_min: 2, pausa_parrafo_max: 4,
    interludio_bloque_min: 8, interludio_bloque_max: 12,
    interludio_versiculo_min: 5, interludio_versiculo_max: 7,
    cierre_musica_min: 20, cierre_musica_max: 30,
  },
};

// 9 parrafos, tres bloques: los dos block_end (tras 3 y tras 6) caen en
// medio del guion, no en el ultimo parrafo — ahi construirLinea nunca anade
// hueco por diseño (ese hueco es el outro, no un evento mas).
const guion = (n) => Array.from({ length: n }, (_, i) => `Parrafo ${i + 1}.`);
const proyecto = (events) => ({
  id: 'x',
  parrafos: guion(9),
  plan: {
    pilar: 'noche',
    parrafos_esperados: 9,
    defaults: { pause_after_paragraph: 3.0 },
    events,
  },
});

// --- block_end con seconds:0 pasa la validacion ------------------------
const planCero = proyecto([
  { after: 3, type: 'block_end', seconds: 0, block: 1 },
  { after: 6, type: 'block_end', seconds: 10, block: 2 },
  { at: 'end', type: 'outro', music_seconds: 25 },
]);
const vCero = validarPlan(planCero, canal);
check('block_end con seconds:0 no es un problema bloqueante',
  !vCero.problemas.some((p) => p.includes('after": 3') || p.includes('parrafo 3')),
  vCero.problemas.join(' | ') || 'ninguno');
check('valida sin errores', vCero.problemas.length === 0, vCero.problemas.join(' | '));

// El aviso de rango (fuera de 8-12s) SI debe seguir apareciendo: seconds:0
// sigue siendo un valor fuera de la norma de interludio de bloque, y eso hay
// que reportarlo, no ocultarlo.
check('sigue avisando que 0s esta fuera del rango de bloque (no oculta el dato)',
  vCero.avisos.some((a) => a.includes('parrafo 3') && a.includes('0s')),
  vCero.avisos.join(' | '));

// --- pause/interlude con seconds:0 SIGUEN bloqueando --------------------
const planPausaCero = proyecto([
  { after: 3, type: 'pause', seconds: 0 },
  { after: 6, type: 'block_end', seconds: 10, block: 1 },
  { at: 'end', type: 'outro', music_seconds: 25 },
]);
const vPausaCero = validarPlan(planPausaCero, canal);
check('pause con seconds:0 SI bloquea',
  vPausaCero.problemas.some((p) => p.includes('pause necesita')),
  vPausaCero.problemas.join(' | '));

const planInterludeCero = proyecto([
  { after: 3, type: 'interlude', seconds: 0 },
  { after: 6, type: 'block_end', seconds: 10, block: 1 },
  { at: 'end', type: 'outro', music_seconds: 25 },
]);
const vInterludeCero = validarPlan(planInterludeCero, canal);
check('interlude con seconds:0 SI bloquea',
  vInterludeCero.problemas.some((p) => p.includes('interlude necesita')),
  vInterludeCero.problemas.join(' | '));

// seconds negativo o ausente en block_end sigue bloqueando: el permiso es
// solo para el valor exacto 0, no para "cualquier cosa que no sea positiva".
const planNegativo = proyecto([
  { after: 3, type: 'block_end', seconds: -1, block: 1 },
  { after: 6, type: 'block_end', seconds: 10, block: 2 },
  { at: 'end', type: 'outro', music_seconds: 25 },
]);
check('block_end con seconds negativo sigue bloqueando',
  validarPlan(planNegativo, canal).problemas.some((p) => p.includes('block_end necesita')));

const planSinSeconds = proyecto([
  { after: 3, type: 'block_end', block: 1 },
  { after: 6, type: 'block_end', seconds: 10, block: 2 },
  { at: 'end', type: 'outro', music_seconds: 25 },
]);
check('block_end sin "seconds" sigue bloqueando',
  validarPlan(planSinSeconds, canal).problemas.some((p) => p.includes('block_end necesita')));

// --- construirLinea: seconds:0 no genera ningun hueco -------------------
const duraciones = guion(9).map(() => 2);
const linea = construirLinea(planCero, canal, duraciones);
check('ningun hueco tras el parrafo con seconds:0',
  !linea.huecos.some((h) => h.trasParrafo === 3),
  JSON.stringify(linea.huecos.map((h) => h.trasParrafo)));
check('el hueco tras el parrafo 6 (10s) si esta',
  linea.huecos.some((h) => h.trasParrafo === 6 && h.duracion === 10));
// Con un evento explicito de 0s, el parrafo 4 arranca EXACTAMENTE donde
// termina el 3: el evento en 0 sustituye a la pausa por defecto, no se le
// suma nada. Es la frontera declarada mas cero, no un olvido.
const seg3 = linea.segmentos.find((s) => s.numero === 3);
const seg4 = linea.segmentos.find((s) => s.numero === 4);
check('el parrafo 4 arranca justo donde termina el 3, sin ningun hueco',
  Math.abs(seg4.inicio - seg3.fin) < 1e-9,
  `${seg4.inicio} vs ${seg3.fin}`);
// Donde SI hay pausa por defecto (parrafos sin evento explicito, p.ej. 1→2),
// el default del canal sigue aplicando normalmente: seconds:0 en block_end
// no apaga el default en el resto del guion, solo en su propia frontera.
const seg1 = linea.segmentos.find((s) => s.numero === 1);
const seg2 = linea.segmentos.find((s) => s.numero === 2);
check('el default sigue aplicando donde no hay evento explicito',
  Math.abs(seg2.inicio - (seg1.fin + planCero.plan.defaults.pause_after_paragraph)) < 1e-9,
  `${seg2.inicio} vs ${seg1.fin}+${planCero.plan.defaults.pause_after_paragraph}`);

console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
