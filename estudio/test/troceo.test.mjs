/**
 * Cortar un bloque por dentro exige acertar el segundo exacto. Aqui se
 * construye una alineacion con tiempos conocidos y se comprueba que el corte
 * cae en el silencio entre parrafos, nunca dentro de una palabra.
 */
import { tiemposPorParrafo, puntosDeCorte, tramosDelBloque, palabrasDelTramo } from '../lib/troceo.mjs';

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'ok   ' : 'FALLO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };
const cerca = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

// Tres parrafos. Cada palabra dura 0,4 s; entre parrafos hay 1 s de silencio.
const textos = ['Señor mi Dios escucha', 'Yo me acoste y dormi', 'Amen'];
const palabras = [];
let t = 0;
textos.forEach((texto, i) => {
  for (const w of texto.split(' ')) { palabras.push({ texto: w, inicio: t, fin: t + 0.4 }); t += 0.4; }
  if (i < textos.length - 1) t += 1.0;
});
const DURACION = t + 0.5;

const tiempos = tiemposPorParrafo(palabras, textos);
check('un tramo de tiempos por parrafo', tiempos.length === 3);
check('parrafo 1 empieza en 0', cerca(tiempos[0].inicio, 0));
check('parrafo 1 termina en 1.6', cerca(tiempos[0].fin, 1.6), `${tiempos[0].fin}`);
check('parrafo 2 empieza en 2.6', cerca(tiempos[1].inicio, 2.6), `${tiempos[1].inicio}`);

// El corte va al medio del silencio: 1.6 + 1.0/2 = 2.1
const cortes = puntosDeCorte(tiempos, [0], DURACION);
check('un corte', cortes.length === 1);
check('corta en el medio del silencio', cerca(cortes[0].en, 2.1), `${cortes[0].en}`);
check('reporta el silencio natural', cerca(cortes[0].silencioNatural, 1.0));

// Nunca dentro de una palabra.
const dentroDePalabra = palabras.some((w) => cortes[0].en > w.inicio + 1e-6 && cortes[0].en < w.fin - 1e-6);
check('el corte no cae dentro de ninguna palabra', !dentroDePalabra);

// Sin silencio apreciable, el corte va justo al final de la ultima palabra.
const pegado = [
  { texto: 'uno', inicio: 0, fin: 1 },
  { texto: 'dos', inicio: 1.01, fin: 2 },
];
const tPegado = tiemposPorParrafo(pegado, ['uno', 'dos']);
const cPegado = puntosDeCorte(tPegado, [0], 2);
check('sin silencio, corta al final de la palabra', cerca(cPegado[0].en, 1.0), `${cPegado[0].en}`);

// Un corte tras el ultimo parrafo se descarta: ese hueco va entre bloques.
check('descarta el corte tras el ultimo parrafo', puntosDeCorte(tiempos, [2], DURACION).length === 0);

// --- cut_offset_ms: desplazar el corte respecto al punto base -----------
//
// Mismos tiempos que arriba: parrafo 1 termina en 1.6, hay 1s de silencio
// natural, parrafo 2 empieza en 2.6. El corte por defecto (sin offset) cae
// en 2.1 (el medio del silencio).

// Sin el parametro, el comportamiento es identico al de siempre.
const corteSinOffset = puntosDeCorte(tiempos, [0], DURACION);
check('sin cut_offset_ms, el corte cae en el punto medio de siempre',
  cerca(corteSinOffset[0].en, 2.1), `${corteSinOffset[0].en}`);
check('sin cut_offset_ms, el offset reportado es 0',
  corteSinOffset[0].offsetMs === 0);

// { indice, offsetMs: undefined } tambien se comporta como si no hubiera offset.
const corteObjetoSinOffset = puntosDeCorte(tiempos, [{ indice: 0 }], DURACION);
check('un objeto sin offsetMs no desplaza el corte',
  cerca(corteObjetoSinOffset[0].en, 2.1));

// Un offset negativo adelanta el corte, en milisegundos exactos.
const corteDesplazado = puntosDeCorte(tiempos, [{ indice: 0, offsetMs: -500 }], DURACION);
check('offsetMs negativo adelanta el corte la cantidad exacta',
  cerca(corteDesplazado[0].en, 1.6), `${corteDesplazado[0].en}`);
check('el offset aplicado queda anotado en el corte',
  corteDesplazado[0].offsetMs === -500);
check('el silencio natural reportado no cambia con el offset',
  cerca(corteDesplazado[0].silencioNatural, 1.0));

// Un offset positivo atrasa el corte igual de exacto.
const corteAdelante = puntosDeCorte(tiempos, [{ indice: 0, offsetMs: 300 }], DURACION);
check('offsetMs positivo atrasa el corte la cantidad exacta',
  cerca(corteAdelante[0].en, 2.4), `${corteAdelante[0].en}`);

// No puede salirse de los limites del audio del bloque: un offset enorme se
// recorta a 0 o a la duracion total, nunca produce un valor invalido.
const corteFueraPorAbajo = puntosDeCorte(tiempos, [{ indice: 0, offsetMs: -999999 }], DURACION);
check('un offset que se iria antes de 0 se recorta a 0',
  cerca(corteFueraPorAbajo[0].en, 0), `${corteFueraPorAbajo[0].en}`);
const corteFueraPorArriba = puntosDeCorte(tiempos, [{ indice: 0, offsetMs: 999999 }], DURACION);
check('un offset que se iria mas alla de la duracion se recorta a esta',
  cerca(corteFueraPorArriba[0].en, DURACION), `${corteFueraPorArriba[0].en}`);

// Aplicar el offset no cambia la duracion de la pausa declarada: eso lo fija
// el evento (seconds), puntosDeCorte solo mueve DONDE cae el corte interno.
// Se comprueba indirectamente: el corte desplazado sigue siendo un solo
// punto (no genera ni fusiona huecos), y el bloque se sigue partiendo en
// exactamente dos tramos contiguos, sin solapes ni hueco de mas (drift).
const tramosDesplazados = tramosDelBloque({
  bloque: 1, archivo: 'b1.mp3', parrafos: [10, 11, 12], tiempos, cortes: corteDesplazado, duracion: DURACION,
});
check('con el corte desplazado, siguen siendo dos tramos', tramosDesplazados.length === 2);
check('los tramos siguen contiguos sin solape ni hueco (sin drift)',
  cerca(tramosDesplazados[0].hasta, tramosDesplazados[1].desde),
  `${tramosDesplazados[0].hasta} vs ${tramosDesplazados[1].desde}`);
check('los tramos siguen cubriendo el bloque completo, principio a fin',
  cerca(tramosDesplazados[0].desde, 0) && cerca(tramosDesplazados[1].hasta, DURACION));

// Tramos.
const tramos = tramosDelBloque({
  bloque: 1, archivo: 'b1.mp3', parrafos: [10, 11, 12], tiempos, cortes, duracion: DURACION,
});
check('dos tramos', tramos.length === 2, `${tramos.length}`);
check('el primero lleva el parrafo global 10', JSON.stringify(tramos[0].parrafos) === '[10]');
check('el segundo lleva los globales 11 y 12', JSON.stringify(tramos[1].parrafos) === '[11,12]');
check('el primero termina donde el segundo empieza', cerca(tramos[0].hasta, tramos[1].desde));
check('cubren todo el bloque', cerca(tramos[0].desde, 0) && cerca(tramos[1].hasta, DURACION));
check('trasParrafoGlobal correcto', tramos[0].trasParrafoGlobal === 10 && tramos[1].trasParrafoGlobal === 12);

// Las palabras se reubican en tiempo absoluto sin perder ninguna.
const p1 = palabrasDelTramo(palabras, tramos[0], 100);
const p2 = palabrasDelTramo(palabras, tramos[1], 200);
check('ninguna palabra se pierde', p1.length + p2.length === palabras.length, `${p1.length}+${p2.length}`);
check('el tramo 1 arranca en su offset', cerca(p1[0].inicio, 100));
check('el tramo 2 arranca tras su offset', p2[0].inicio >= 200 && p2[0].inicio < 200.6, `${p2[0].inicio.toFixed(3)}`);
check('las palabras van en orden', [...p1, ...p2].every((w, i, a) => i === 0 || w.inicio >= a[i - 1].inicio));

// Desajuste entre texto y alineacion: tiene que saltar, no adivinar.
let salto = false;
try { tiemposPorParrafo(palabras, ['uno dos', 'tres']); } catch { salto = true; }
check('salta si el texto no cuadra con la alineacion', salto);

console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
