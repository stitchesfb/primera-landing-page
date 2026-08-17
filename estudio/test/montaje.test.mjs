/**
 * Verifica el montaje y la sincronia sin tocar la API:
 * genera audios de duracion conocida, los monta con los huecos del plan y
 * comprueba que la pista final y los subtitulos caen donde dice la linea.
 */
import { mkdirSync, mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { construirLinea } from '../lib/plan.mjs';
import { montarNarracion, ejecutar, rutaFfmpeg, duracionSegundos } from '../lib/audio.mjs';
import { palabrasDesdeAlineacion, agruparEnSubtitulos, renderSRT, tiempoSRT } from '../lib/srt.mjs';

const TMP = mkdtempSync(join(tmpdir(), 'estudio-montaje-'));


const canal = JSON.parse(readFileSync(new URL('../canal.json', import.meta.url), 'utf8'));

const DURACIONES = [3.0, 4.0, 2.5, 5.0, 3.5];
const TEXTOS = [
  'Antes de dormir entrega a Dios lo que hoy te preocupa.',
  'En paz me acostare y asimismo dormire porque solo tu me haces vivir confiado.',
  'Padre te entrego a las personas que amo esta noche.',
  'No dice que la ansiedad desaparecera de golpe dice que hay un lugar donde dejarla.',
  'En el nombre de Jesus. Amen.',
];

const ffmpeg = await rutaFfmpeg();
const mp3s = [];
for (const [i, d] of DURACIONES.entries()) {
  const ruta = join(TMP, `p${i + 1}.mp3`);
  await ejecutar(ffmpeg, ['-y','-loglevel','error','-f','lavfi','-i',`sine=frequency=${300+i*40}:r=44100`,'-t',String(d),'-ac','2','-c:a','libmp3lame','-b:a','192k',ruta]);
  mp3s.push(ruta);
}

const proyecto = {
  id: 'test', parrafos: TEXTOS,
  plan: {
    pilar: 'noche',
    defaults: { pause_after_paragraph: 3.0 },
    events: [
      { after: 2, type: 'block_end', seconds: 10 },
      { after: 4, type: 'interlude', seconds: 6 },
      { at: 'end', type: 'outro', music_seconds: 25, fade_out: 8 },
    ],
  },
};

// Huecos esperados: 3 (tras p1) + 10 (tras p2) + 3 (tras p3) + 6 (tras p4) = 22, + 25 outro
const HUECOS_ESPERADOS = 3 + 10 + 3 + 6;
const OUTRO = 25;

const lineaPrevia = construirLinea(proyecto, canal, DURACIONES);
const { duraciones, duracionTotal } = await montarNarracion({
  segmentos: mp3s.map((mp3, i) => ({ mp3, numero: i + 1 })),
  huecos: lineaPrevia.huecos,
  outro: lineaPrevia.outro,
  salidaMp3: join(TMP, 'audio.mp3'),
  tmp: join(TMP, '.tmp'),
});

const linea = construirLinea(proyecto, canal, duraciones);

let fallos = 0;
const check = (nombre, real, esperado, tol) => {
  const ok = Math.abs(real - esperado) <= tol;
  console.log(`${ok ? 'ok  ' : 'FALLO'} ${nombre}: ${real.toFixed(3)} (esperado ${esperado.toFixed(3)} ±${tol})`);
  if (!ok) fallos++;
};

console.log('--- duraciones medidas por parrafo ---');
DURACIONES.forEach((d, i) => check(`parrafo ${i + 1}`, duraciones[i], d, 0.06));

console.log('\n--- linea de tiempo ---');
const sumaVoz = duraciones.reduce((s, d) => s + d, 0);
check('huecos totales', linea.segundosSilencio, HUECOS_ESPERADOS + OUTRO, 0.001);
check('duracion calculada', linea.duracionTotal, sumaVoz + HUECOS_ESPERADOS + OUTRO, 0.001);
check('duracion real del mp3', duracionTotal, linea.duracionTotal, 0.12);

console.log('\n--- offsets absolutos ---');
let acumulado = 0;
linea.segmentos.forEach((seg, i) => {
  check(`inicio parrafo ${i + 1}`, seg.inicio, acumulado, 0.001);
  acumulado += duraciones[i];
  const hueco = linea.huecos.find((h) => h.trasParrafo === i + 1);
  if (hueco) acumulado += hueco.duracion;
});

console.log('\n--- subtitulos ---');
// Alineacion sintetica: reparte los caracteres de cada parrafo en su duracion.
const alineaciones = TEXTOS.map((t, i) => {
  const paso = duraciones[i] / t.length;
  return {
    caracteres: [...t],
    inicios: [...t].map((_, j) => j * paso),
    finales: [...t].map((_, j) => (j + 1) * paso),
    palabras: null,
  };
});

const palabras = [];
linea.segmentos.forEach((seg, i) => palabras.push(...palabrasDesdeAlineacion(alineaciones[i], seg.inicio)));

const primeraP5 = palabras.find((p) => p.texto === 'nombre');
check('palabra del parrafo 5 en tiempo absoluto', primeraP5.inicio, linea.segmentos[4].inicio + 0.9, 1.2);

const cues = agruparEnSubtitulos(palabras, canal.subtitulos, linea.finNarracion);
console.log(`     ${cues.length} subtitulos generados`);

// Ningun subtitulo puede caer dentro de un hueco: ahi no hay voz.
for (const cue of cues) {
  for (const h of linea.huecos) {
    const dentro = cue.inicio > h.inicio + 0.05 && cue.inicio < h.inicio + h.duracion - 0.05;
    if (dentro) { console.log(`FALLO subtitulo dentro del hueco tras p${h.trasParrafo}: ${tiempoSRT(cue.inicio)}`); fallos++; }
  }
}
console.log('ok   ningun subtitulo cae dentro de un interludio');

// Monotonia y no solape.
for (let i = 1; i < cues.length; i++) {
  if (cues[i].inicio < cues[i - 1].fin) { console.log(`FALLO solape en el subtitulo ${i + 1}`); fallos++; }
}
console.log('ok   sin solapes');

const ultimo = cues[cues.length - 1];
check('fin del ultimo subtitulo <= fin de narracion', ultimo.fin, linea.finNarracion, 0.5);

console.log('\n--- muestra del SRT ---');
console.log(renderSRT(cues, canal.subtitulos).split('\n\n').slice(0, 3).join('\n\n'));

console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
rmSync(typeof TMP !== 'undefined' ? TMP : BASE, { recursive: true, force: true });
process.exit(fallos ? 1 : 0);
