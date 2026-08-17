/**
 * Prueba las 8 comprobaciones de importacion con 5 bloques reales de audio,
 * primero en un caso sano y luego inyectando cada fallo por separado.
 */
import { mkdirSync, mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { construirLinea } from '../lib/plan.mjs';
import { montarNarracion, ejecutar, rutaFfmpeg } from '../lib/audio.mjs';
import { palabrasDesdeAlineacion, agruparEnSubtitulos } from '../lib/srt.mjs';
import { validarImportacion } from '../lib/validacion.mjs';

const BASE = mkdtempSync(join(tmpdir(), 'estudio-val-'));

const canal = JSON.parse(readFileSync(new URL('../canal.json', import.meta.url), 'utf8'));

// 10 parrafos repartidos en 5 bloques de 2.
const PARRAFOS = [
  'Antes de dormir entrega a Dios lo que hoy te preocupa.',
  'Respira despacio porque el dia ya termino y no tienes que cargarlo.',
  'En paz me acostare y asimismo dormire porque solo tu me haces vivir confiado.',
  'La paz no viene de que todo este resuelto sino de saber en manos de quien estamos.',
  'Padre te entrego a las personas que amo y tu las conoces por nombre.',
  'Por los que estan lejos esta noche extiende tu cuidado sobre ellos.',
  'Ahora quiero entregarte lo que me preocupa del manana.',
  'No dice que la ansiedad desaparecera de golpe dice que hay un lugar donde dejarla.',
  'Que mi cuerpo descanse de verdad y que mi mente se aquiete esta noche.',
  'Gracias Padre porque tu no duermes ni te adormeces. En el nombre de Jesus. Amen.',
];
const BLOQUES = [[0,1],[2,3],[4,5],[6,7],[8,9]];

const plan = {
  pilar: 'noche',
  defaults: { pause_after_paragraph: 3.0 },
  events: [
    { after: 2, type: 'block_end', seconds: 10 },
    { after: 4, type: 'block_end', seconds: 10 },
    { after: 6, type: 'block_end', seconds: 10 },
    { after: 8, type: 'block_end', seconds: 10 },
    { at: 'end', type: 'outro', music_seconds: 25, fade_out: 8 },
  ],
};
const proyecto = { id: 'val', parrafos: PARRAFOS, plan };

// Un mp3 por bloque, con la duracion que corresponde al texto a 650 car/min
// mas medio segundo de silencio de cola, como haria una narracion real.
const ffmpeg = await rutaFfmpeg();
const textosBloque = BLOQUES.map((b) => b.map((i) => PARRAFOS[i]).join(' '));
const archivos = [];
const durVoz = [];
for (const [i, texto] of textosBloque.entries()) {
  const voz = (texto.length / 650) * 60;
  durVoz.push(voz);
  const ruta = join(BASE, `0${i + 1}.mp3`);
  await ejecutar(ffmpeg, ['-y','-loglevel','error','-f','lavfi','-i','sine=frequency=320:r=44100','-t',(voz + 0.5).toFixed(3),'-ac','2','-c:a','libmp3lame','-b:a','192k',ruta]);
  archivos.push(ruta);
}

// El plan visto por bloques: los block_end pasan a separar bloque 1|2|3|4.
const comoBloques = {
  ...proyecto,
  parrafos: textosBloque,
  plan: { ...plan, events: [
    { after: 1, type: 'block_end', seconds: 10 },
    { after: 2, type: 'block_end', seconds: 10 },
    { after: 3, type: 'block_end', seconds: 10 },
    { after: 4, type: 'block_end', seconds: 10 },
    { at: 'end', type: 'outro', music_seconds: 25, fade_out: 8 },
  ]},
};

const lineaPrev = construirLinea(comoBloques, canal, durVoz.map((d) => d + 0.5));
const { duraciones, duracionTotal } = await montarNarracion({
  segmentos: archivos.map((mp3, i) => ({ mp3, numero: i + 1 })),
  huecos: lineaPrev.huecos, outro: lineaPrev.outro,
  salidaMp3: join(BASE, 'audio.mp3'), tmp: join(BASE, '.tmp'),
});
const linea = construirLinea(comoBloques, canal, duraciones);

// Alineaciones sinteticas: las palabras ocupan durVoz, dejando la cola muda.
const hacerAlineaciones = (escala = 1) => textosBloque.map((t, i) => {
  const paso = (durVoz[i] * escala) / t.length;
  return {
    caracteres: [...t],
    inicios: [...t].map((_, j) => j * paso),
    finales: [...t].map((_, j) => (j + 1) * paso),
    palabras: null,
  };
});

const hacerCues = (alineaciones) => {
  const palabras = [];
  linea.segmentos.forEach((seg, i) => palabras.push(...palabrasDesdeAlineacion(alineaciones[i], seg.inicio)));
  return agruparEnSubtitulos(palabras, canal.subtitulos, linea.finNarracion);
};

const base = {
  archivos, bloques: BLOQUES, proyecto, plan, linea,
  duracionesBloques: duraciones, duracionAudio: duracionTotal,
};

let fallos = 0;
const esperar = (nombre, informe, idsQueDebenFallar) => {
  const fallando = informe.pruebas.filter((p) => !p.ok).map((p) => p.id).sort();
  const esperados = [...idsQueDebenFallar].sort();
  const ok = JSON.stringify(fallando) === JSON.stringify(esperados);
  console.log(`${ok ? 'ok   ' : 'FALLO'} ${nombre}`);
  if (!ok) { console.log(`      fallan: [${fallando}]  esperado: [${esperados}]`); fallos++; }
};

// --- caso sano ---
const alSanas = hacerAlineaciones();
const infoSano = validarImportacion({ ...base, alineaciones: alSanas, cues: hacerCues(alSanas) });
esperar('caso sano: las 8 comprobaciones pasan', infoSano, []);
console.log('     ' + infoSano.pruebas.map((p) => `${p.ok ? '✓' : '✗'} ${p.id}`).join('\n     '));

// --- fallo 1: falta un audio ---
esperar('falta un audio', validarImportacion({
  ...base, archivos: archivos.slice(0, 4), alineaciones: alSanas, cues: hacerCues(alSanas),
}), ['audios_presentes', 'block_end_coinciden']);

// --- fallo 2: numero de block_end incorrecto ---
esperar('sobra un block_end', validarImportacion({
  ...base, plan: { ...plan, events: [...plan.events, { after: 9, type: 'block_end', seconds: 10 }] },
  alineaciones: alSanas, cues: hacerCues(alSanas),
}), ['block_end_coinciden']);

// --- fallo 3: un parrafo sin asignar a ningun bloque ---
esperar('parrafo sin asignar', validarImportacion({
  ...base, bloques: [[0,1],[2,3],[4,5],[6,7],[8]], alineaciones: alSanas, cues: hacerCues(alSanas),
}), ['parrafos_alineados']);

// --- fallo 4: subtitulo metido dentro de un interludio ---
const cuesInvadidos = hacerCues(alSanas);
const h = linea.huecos[1];
cuesInvadidos.push({ inicio: h.inicio + 2, fin: h.inicio + 4, texto: 'intruso' });
esperar('subtitulo dentro de un interludio', validarImportacion({
  ...base, alineaciones: alSanas, cues: cuesInvadidos,
}), ['sin_subtitulos_en_interludios', 'sin_solapes']);

// --- fallo 5: drift, la alineacion se sale del audio ---
const alDrift = hacerAlineaciones(1.25);
// El drift se delata en tres comprobaciones a la vez: si la alineacion se
// sale del audio, los subtitulos invaden los interludios y rebasan el final.
esperar('drift: la alineacion excede el audio', validarImportacion({
  ...base, alineaciones: alDrift, cues: hacerCues(alDrift),
}), ['sin_drift_acumulativo', 'sin_subtitulos_en_interludios', 'subtitulos_dentro_de_narracion']);

// --- fallo 6: duracion del mp3 que no cuadra ---
esperar('duracion descuadrada', validarImportacion({
  ...base, alineaciones: alSanas, cues: hacerCues(alSanas), duracionAudio: duracionTotal + 3,
}), ['duracion_coincide']);

console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
rmSync(typeof TMP !== 'undefined' ? TMP : BASE, { recursive: true, force: true });
process.exit(fallos ? 1 : 0);
