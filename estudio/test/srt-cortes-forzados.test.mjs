/**
 * forzarCortes() es la capacidad opcional para el puñado de frases donde el
 * reparto automatico de agruparEnSubtitulos() no basta: una frase sin coma
 * interna que no cabe ni al cuerpo minimo en 3 lineas. Caso real: el parrafo
 * 161 del video_005 en el short_02 («Tú no necesitas que permanezca
 * despierto preocupándome para poder obrar.»).
 *
 * Dos cosas que garantizar: que el corte cae exactamente donde se pide (sin
 * tocar ningun otro rotulo), y que los dos rotulos resultantes de verdad
 * caben —medido con el mismo libass del render, no contando caracteres— en 3
 * lineas a cuerpo 60 o mas.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { agruparEnSubtitulos, forzarCortes } from '../lib/srt.mjs';
import { crearMedidor, disponerTexto } from '../lib/shortsRender.mjs';

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'ok   ' : 'FALLO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };
const cerca = (a, b, e = 0.005) => Math.abs(a - b) < e;

// Palabras del parrafo 161 con la forma real del alignment: sin coma interna,
// una sola frase, ya en tiempo del Short (parrafo 160 justo antes, 162 justo
// despues, para comprobar que el corte NO se lleva por delante a los vecinos).
const palabras = [
  { texto: 'Mientras', parrafo: 160, inicio: 41.9, fin: 42.3 },
  { texto: 'descanso.', parrafo: 160, inicio: 42.3, fin: 42.8 },
  { texto: 'Tú',            parrafo: 161, inicio: 43.10, fin: 43.28 },
  { texto: 'no',            parrafo: 161, inicio: 43.28, fin: 43.42 },
  { texto: 'necesitas',     parrafo: 161, inicio: 43.42, fin: 43.85 },
  { texto: 'que',           parrafo: 161, inicio: 43.85, fin: 44.00 },
  { texto: 'permanezca',    parrafo: 161, inicio: 44.00, fin: 44.55 },
  { texto: 'despierto',     parrafo: 161, inicio: 44.55, fin: 45.10 },
  { texto: 'preocupándome', parrafo: 161, inicio: 45.10, fin: 45.85 },
  { texto: 'para',          parrafo: 161, inicio: 45.85, fin: 46.05 },
  { texto: 'poder',         parrafo: 161, inicio: 46.05, fin: 46.30 },
  { texto: 'obrar.',        parrafo: 161, inicio: 46.30, fin: 47.30 },
  { texto: 'Por',           parrafo: 162, inicio: 47.60, fin: 47.80 },
];

// El mismo agrupador y las mismas opciones que usa el render de Shorts: 26
// caracteres por linea, 3 lineas, tal cual cli.mjs. Con esta frase (74
// caracteres, sin coma) el agrupador la deja entera en un solo rotulo —el
// mismo comportamiento que disparo el error real contra video_005.
const OPCIONES = { max_caracteres_linea: 26, max_lineas: 3, duracion_max_s: 6, duracion_min_s: 1, hueco_min_s: 0.08 };
const crudos = agruparEnSubtitulos(palabras, OPCIONES, 50);

const cue161 = crudos.find((c) => c.texto.startsWith('Tú no necesitas'));
check('sin corte forzado, el parrafo 161 llega como un solo rotulo de una frase entera',
  cue161 && cue161.texto === 'Tú no necesitas que permanezca despierto preocupándome para poder obrar.',
  cue161?.texto);

// --- el corte cae exactamente donde se pide ---------------------------------
const cortados = forzarCortes(crudos, palabras, [{ parrafo: 161, trasPalabra: 'despierto' }]);

check('el parrafo 161 se convierte en exactamente dos rotulos (uno mas que antes)',
  cortados.length === crudos.length + 1, `${crudos.length} → ${cortados.length}`);

const i = cortados.findIndex((c) => c.texto.startsWith('Tú no necesitas'));
const rotulo1 = cortados[i];
const rotulo2 = cortados[i + 1];

check('rotulo 1 es exactamente "Tú no necesitas que permanezca despierto"',
  rotulo1.texto === 'Tú no necesitas que permanezca despierto', rotulo1.texto);
check('rotulo 2 es exactamente "preocupándome para poder obrar."',
  rotulo2.texto === 'preocupándome para poder obrar.', rotulo2.texto);
check('rotulo 1 termina exactamente al terminar "despierto" (fin de esa palabra)',
  cerca(rotulo1.fin, 45.10), `${rotulo1.fin}`);
check('rotulo 2 empieza exactamente donde empieza "preocupándome"',
  cerca(rotulo2.inicio, 45.10), `${rotulo2.inicio}`);
check('no hay solapamiento ni corte de voz entre los dos rotulos',
  cerca(rotulo1.fin, rotulo2.inicio));

// --- los vecinos (parrafo 160 y 162) no se tocan ----------------------------
check('el rotulo del parrafo 160 sigue igual, sin fusionarse con el corte',
  cortados.some((c) => c.texto === 'Mientras descanso.'));
check('el rotulo del parrafo 162 sigue igual',
  cortados.some((c) => c.texto === 'Por'));
check('el total de rotulos fuera del parrafo 161 no cambia',
  cortados.filter((c) => !c.texto.startsWith('Tú no necesitas') && c.texto !== 'preocupándome para poder obrar.').length
    === crudos.filter((c) => !c.texto.startsWith('Tú no necesitas')).length);

// --- ambos rotulos caben de verdad: medido con el mismo libass del render --
const dir = mkdtempSync(join(tmpdir(), 'cortes-forzados-'));
const ANCHO = 1080;
const MARGEN = 80;
const SEGURO = ANCHO - 2 * MARGEN;
const medir = crearMedidor({ ancho: ANCHO, tmp: join(dir, 'medidas') });

for (const [nombre, rotulo] of [['rotulo 1', rotulo1], ['rotulo 2', rotulo2]]) {
  const d = await disponerTexto({
    texto: rotulo.texto, medir, anchoSeguro: SEGURO, tamano: 76, tamanoMin: 60, maxLineas: 3,
  });
  check(`${nombre} cabe sin desbordar (≤3 lineas, cuerpo ≥60)`, !d.desbordado && d.lineas.length <= 3,
    `${d.lineas.length} linea(s), cuerpo ${d.tamano}`);
  check(`${nombre} usa cuerpo minimo 60 o superior (nunca por debajo)`, d.tamano >= 60, `cuerpo ${d.tamano}`);
  let anchoMaximo = 0;
  for (const l of d.lineas) anchoMaximo = Math.max(anchoMaximo, await medir(l, d.tamano));
  check(`${nombre}: ninguna linea supera el ancho seguro medido de verdad`, anchoMaximo <= SEGURO,
    `${anchoMaximo}px de ${SEGURO}px`);
}

// El parrafo 161 sin cortar (la frase completa) confirma que el corte es
// NECESARIO, no cosmetico: sin el, no hay combinacion de lineas/cuerpo que
// quepa dentro de las mismas reglas.
const sinCortar = await disponerTexto({
  texto: cue161.texto, medir, anchoSeguro: SEGURO, tamano: 76, tamanoMin: 60, maxLineas: 3,
});
check('sin el corte forzado, la frase entera SI desborda (por eso hacia falta partirla)',
  sinCortar.desbordado, `${sinCortar.lineas.length} lineas a cuerpo ${sinCortar.tamano}`);

rmSync(dir, { recursive: true, force: true });

console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
