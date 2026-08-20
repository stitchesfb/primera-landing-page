/**
 * Lo que hay que garantizar del montaje vertical: que ningun caracter se salga
 * del cuadro, que el cierre no lleve simbolos raros delante y que la cama se
 * abra donde el Short no tiene voz.
 *
 * El desbordamiento se comprueba dibujando de verdad, no contando caracteres:
 * contar caracteres es lo que dejo media "o" de «sino» fuera del borde derecho.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  construirAss, formaDelShort, crearMedidor, disponerTexto, validarOverflow,
} from '../lib/shortsRender.mjs';

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'ok   ' : 'FALLO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };

const dir = mkdtempSync(join(tmpdir(), 'shortsrender-'));
const ANCHO = 1080;
const ALTO = 1920;
const MARGEN = 80;
const SEGURO = ANCHO - 2 * MARGEN;
const medir = crearMedidor({ ancho: ANCHO, tmp: join(dir, 'medidas') });

// --- la medida mide ---------------------------------------------------------
const anchoM = await medir('m', 76);
const anchoI = await medir('i', 76);
check('la medida distingue el ancho real de cada letra', anchoM > anchoI * 1.5,
  `"m" ${anchoM}px contra "i" ${anchoI}px`);

// Esta es la frase exacta del segundo 20 del short_01. Con 24 caracteres por
// linea daba «circunstancias perfectas, sino» y la "o" final se salia.
const LINEA_QUE_SE_SALIA = 'perfectas, sino en la paz que';
check('la linea que se salia se mide como demasiado ancha',
  (await medir(LINEA_QUE_SE_SALIA, 76)) > SEGURO,
  `${await medir(LINEA_QUE_SE_SALIA, 76)}px contra ${SEGURO}px de ancho seguro`);

// --- el reparto respeta el ancho seguro -------------------------------------
const frase = 'No en una paz fabricada por circunstancias perfectas, sino en la paz que nace de saber.';
const puesto = await disponerTexto({
  texto: frase, medir, anchoSeguro: SEGURO, tamano: 76, tamanoMin: 60, maxLineas: 3,
});
let anchoMaximo = 0;
for (const l of puesto.lineas) anchoMaximo = Math.max(anchoMaximo, await medir(l, puesto.tamano));
check('ninguna linea repartida supera el ancho seguro', anchoMaximo <= SEGURO,
  `la mas ancha ${anchoMaximo}px de ${SEGURO}px, a cuerpo ${puesto.tamano}`);
check('no se pierde ni una palabra al repartir',
  puesto.lineas.join(' ').split(/\s+/).join(' ') === frase.split(/\s+/).join(' '));

// Una palabra sola larguisima no puede colarse: hay que bajar el cuerpo.
const largo = await disponerTexto({
  texto: 'incomprensiblementeinterminable', medir, anchoSeguro: SEGURO,
  tamano: 76, tamanoMin: 40, maxLineas: 3,
});
check('una palabra que no cabe baja de cuerpo en vez de salirse',
  (await medir(largo.lineas[0], largo.tamano)) <= SEGURO,
  `cuerpo ${largo.tamano}`);

// --- la validacion sobre el ASS final ---------------------------------------
const cues = [
  { inicio: 0, fin: 3, lineas: puesto.lineas, tamano: puesto.tamano },
];
const cta = { inicio: 3.2, fin: 6, lineas: ['SIGAMOS ORANDO', 'Mira la oración completa'], tamano: 62 };

const ass = join(dir, 'sano.ass');
writeFileSync(ass, construirAss({ cues, cta, ancho: ANCHO, alto: ALTO, margen: MARGEN }));
const problemas = await validarOverflow({ ass, cues, cta, ancho: ANCHO, alto: ALTO, margen: MARGEN });
check('el ASS bien maquetado no da ningun desbordamiento', problemas.length === 0,
  problemas.join(' | ') || 'ninguno');

// Control: si la validacion no detectara un desbordamiento de verdad, un cero
// no significaria nada. Se fuerza uno metiendo una linea sin repartir.
const malo = [{ inicio: 0, fin: 3, lineas: [frase], tamano: 76 }];
const assMalo = join(dir, 'malo.ass');
writeFileSync(assMalo, construirAss({ cues: malo, ancho: ANCHO, alto: ALTO, margen: MARGEN }));
const detectados = await validarOverflow({
  ass: assMalo, cues: malo, cta: null, ancho: ANCHO, alto: ALTO, margen: MARGEN,
});
check('una linea sin repartir SI se detecta (control)', detectados.length === 1,
  detectados[0] ?? 'no se detecto nada');

// --- el cierre ---------------------------------------------------------------
const textoAss = construirAss({ cues, cta, ancho: ANCHO, alto: ALTO, margen: MARGEN });
check('el cierre lleva el texto aprobado', textoAss.includes('SIGAMOS ORANDO'));
check('el cierre no lleva ningun simbolo delante del texto',
  !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(textoAss),
  'sin emoji ni simbolos');
check('los margenes laterales van escritos en el estilo',
  textoAss.includes(`,${MARGEN},${MARGEN},`));

// --- la cama se abre donde no hay voz ---------------------------------------
const plan = {
  duracion: 30,
  tramos: [
    { tipo: 'voz', destino: 0, duracionDestino: 10 },
    { tipo: 'silencio', destino: 10, duracionDestino: 2.5 },
    { tipo: 'voz', destino: 12.5, duracionDestino: 13 },
    { tipo: 'cta', destino: 25.5, duracionDestino: 4.5 },
  ],
};
const forma = formaDelShort(plan, 1.5);
check('el interludio y el cierre son huecos de la cama', forma.huecos.length === 2,
  JSON.stringify(forma.huecos));
check('la narracion acaba donde acaba la ultima voz', forma.finNarracion === 25.5);

rmSync(dir, { recursive: true, force: true });
console.log(`\n${medir.estadisticas().medidas} medidas`);
console.log(`${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
