/**
 * Reproduce el fallo de la primera importacion real: el ultimo subtitulo de un
 * bloque se alargaba hasta la duracion minima legible y se metia dentro del
 * interludio siguiente, donde ya no hay voz que acompanar.
 *
 * La causa era agrupar las palabras de todo el video de una vez y limitarlas
 * solo al final de la narracion. Agrupando por segmento, cada subtitulo queda
 * encerrado en el audio del que sale.
 */
import { readFileSync } from 'node:fs';
import { agruparEnSubtitulos, palabrasDesdeAlineacion } from '../lib/srt.mjs';
import { construirLinea } from '../lib/plan.mjs';

const canal = JSON.parse(readFileSync(new URL('../canal.json', import.meta.url), 'utf8'));

let fallos = 0;
const check = (nombre, ok, detalle = '') => {
  console.log(`${ok ? 'ok   ' : 'FALLO'} ${nombre}${detalle ? ' — ' + detalle : ''}`);
  if (!ok) fallos++;
};

// Dos bloques, y el primero termina en una palabra corta y aislada: el caso
// exacto que dispara la extension a la duracion minima.
// Bloques largos que terminan en una palabra muy corta. En la importacion real
// el subtitulo culpable duraba 0,4 s: al estirarlo hasta el minimo legible de
// 1,2 s se salia del bloque y aterrizaba en el interludio.
const textos = [
  'Padre mio, en esta noche que ya cae sobre la casa y sobre el ruido del dia que se apaga, ' +
  'te entrego lo que traigo en el pecho y no se nombrar todavia, lo que me pesa y lo que me ' +
  'alegra por igual, porque tu conoces ambas cosas mejor que yo mismo. Amen.',
  'Gracias porque tu no duermes ni te adormeces sobre mi vida, y puedo cerrar los ojos ' +
  'precisamente porque tu los mantienes abiertos sobre los mios cuando yo ya no puedo. Amen.',
];
const duraciones = [22.0, 20.0];

const proyecto = {
  id: 't', parrafos: textos,
  plan: {
    pilar: 'noche',
    defaults: { pause_after_paragraph: 3.0 },
    events: [
      { after: 1, type: 'block_end', seconds: 10 },
      { at: 'end', type: 'outro', music_seconds: 25, fade_out: 8 },
    ],
  },
};
const linea = construirLinea(proyecto, canal, duraciones);

// La ultima palabra acaba antes del final del audio, como en un mp3 real.
const alineaciones = textos.map((t, i) => {
  const util = duraciones[i] - 0.45;
  const paso = util / t.length;
  return {
    caracteres: [...t],
    inicios: [...t].map((_, j) => j * paso),
    finales: [...t].map((_, j) => (j + 1) * paso),
    palabras: null,
  };
});

// Agrupacion por segmento, como hace ahora escribirSincronizacion.
const cues = [];
linea.segmentos.forEach((seg, i) => {
  cues.push(...agruparEnSubtitulos(palabrasDesdeAlineacion(alineaciones[i], seg.inicio),
                                   canal.subtitulos, seg.fin));
});

const invasores = cues.filter((c) =>
  linea.huecos.some((h) => c.inicio < h.inicio + h.duracion - 0.05 && c.fin > h.inicio + 0.05));
check('ningun subtitulo entra en el interludio', invasores.length === 0,
  invasores.map((c) => `${c.inicio.toFixed(2)}-${c.fin.toFixed(2)}`).join(' '));

const cruzan = cues.filter((c) =>
  linea.segmentos.some((s) => c.inicio < s.fin - 0.05 && c.fin > s.fin + 0.05));
check('ningun subtitulo cruza una frontera de bloque', cruzan.length === 0,
  cruzan.map((c) => `${c.inicio.toFixed(2)}-${c.fin.toFixed(2)}`).join(' '));

for (const seg of linea.segmentos) {
  const suyos = cues.filter((c) => c.inicio >= seg.inicio - 0.01 && c.inicio < seg.fin);
  const ultimo = suyos[suyos.length - 1];
  check(`el ultimo subtitulo del bloque ${seg.numero} respeta su final`,
    ultimo && ultimo.fin <= seg.fin + 0.01,
    ultimo ? `${ultimo.fin.toFixed(2)} <= ${seg.fin.toFixed(2)}` : 'sin subtitulos');
}

check('se generaron subtitulos', cues.length >= 2, `${cues.length}`);
check('en orden y sin solapes', cues.every((c, i) => i === 0 || c.inicio >= cues[i - 1].fin));

// Y la comprobacion inversa: agrupando de golpe, como antes, el fallo aparece.
const todas = [];
linea.segmentos.forEach((seg, i) => todas.push(...palabrasDesdeAlineacion(alineaciones[i], seg.inicio)));
const viejos = agruparEnSubtitulos(todas, canal.subtitulos, linea.finNarracion);
const invadeViejo = viejos.some((c) =>
  linea.huecos.some((h) => c.inicio < h.inicio + h.duracion - 0.05 && c.fin > h.inicio + 0.05));
check('la agrupacion global SI producia el fallo (control)', invadeViejo === true);

console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
