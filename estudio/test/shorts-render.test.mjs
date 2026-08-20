/**
 * Lo que puede salir mal al montar un Short y no se ve hasta tener el MP4
 * delante: que el separador de linea acabe impreso como una barra, que un
 * rotulo largo se salga del cuadro, o que la cama musical no sepa donde
 * callarse.
 */
import { construirAss, repartirLineas, formaDelShort } from '../lib/shortsRender.mjs';
import { planearShort } from '../lib/shorts.mjs';

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'ok   ' : 'FALLO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };

// --- reparto en lineas -----------------------------------------------------
const l = repartirLineas('Si algo difícil ocurre, tú estarás conmigo.', 24, 3);
check('reparte sin partir palabras', l.every((x) => x.length <= 24) && l.join(' ').split(/\s+/).length === 7,
  JSON.stringify(l));
check('respeta el maximo de lineas',
  repartirLineas('uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece', 12, 3).length === 3);

// --- ASS -------------------------------------------------------------------
const ass = construirAss({
  cues: [{ inicio: 1.5, fin: 4.25, texto: 'Si algo difícil ocurre, tú estarás conmigo.' }],
  cta: { inicio: 10, fin: 14.5, lineas: ['🌙 Continúa con la oración completa', 'Mira el video relacionado'] },
  ancho: 1080, alto: 1920,
});

// El fallo real: escapar DESPUES de unir convertia el propio \N en una barra
// literal, y el subtitulo salia con un "\" impreso al final de cada linea.
const dialogos = ass.split('\n').filter((x) => x.startsWith('Dialogue:'));
const cuerpo = (d) => d.split(',').slice(9).join(',');
check('el separador de linea no se imprime como barra',
  !/\\\\N/.test(cuerpo(dialogos[0])) && cuerpo(dialogos[0]).includes('\\N'),
  cuerpo(dialogos[0]));
check('los acentos viajan sin tocar', cuerpo(dialogos[0]).includes('difícil'));
check('los tiempos salen en centesimas', dialogos[0].includes('0:00:01.50') && dialogos[0].includes('0:00:04.25'));

// Un rotulo de 34 caracteres a cuerpo 62 se sale de 1080 px por los dos lados.
const cta = cuerpo(dialogos.at(-1));
const lineasCta = cta.replace(/\{[^}]*\}/g, '').split('\\N');
check('el rotulo de cierre se reparte para caber',
  lineasCta.every((x) => x.length <= 22), JSON.stringify(lineasCta));
check('el rotulo conserva el emoji', cta.includes('🌙'));
check('el rotulo entra con fundido', cta.includes('\\fad('));

// Las llaves del texto no pueden abrir una etiqueta de libass.
const conLlaves = construirAss({
  cues: [{ inicio: 0, fin: 1, texto: 'texto {\\b1} peligroso' }], ancho: 1080, alto: 1920,
});
check('el texto no puede inyectar etiquetas',
  !/\{\\b1\}/.test(conLlaves.split('\n').find((x) => x.startsWith('Dialogue:'))));

// --- forma de la cama ------------------------------------------------------
const timeline = {
  fin_narracion_s: 100,
  segmentos: [
    { numero: 1, texto: 'uno dos', inicio: 10, fin: 14, duracion: 4 },
    { numero: 2, texto: 'tres cuatro', inicio: 17, fin: 22, duracion: 5 },
    { numero: 3, texto: 'cinco seis', inicio: 34, fin: 40, duracion: 6 },
    { numero: 4, texto: 'siete ocho', inicio: 43, fin: 48, duracion: 5 },
  ],
};
const plan = planearShort({ timeline, desde: 2, hasta: 3, interludioInterno: 2.5, ctaSegundos: 4.5 });
const forma = formaDelShort(plan, 1.5);

check('la cama se abre en el interludio acortado y en el cierre',
  forma.huecos.length === 2, JSON.stringify(forma.huecos.map((h) => +h.duracion.toFixed(2))));
check('el cierre queda declarado como hueco',
  Math.abs(forma.huecos.at(-1).duracion - 4.5) < 0.01);
// Sin esto la cama seguiria en nivel de voz durante el rotulo, que es justo
// cuando tiene que sostener el silencio sola.
check('la narracion termina antes del cierre',
  forma.finNarracion <= plan.duracion - 4.5 + 0.01,
  `${forma.finNarracion.toFixed(2)}s de ${plan.duracion.toFixed(2)}s`);

console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
