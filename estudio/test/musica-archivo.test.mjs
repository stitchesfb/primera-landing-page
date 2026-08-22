/**
 * Lo que decide si una prueba A/B/C de musica significa algo: que las tres
 * pistas lleguen al oido al mismo volumen y con el mismo ducking. Si no, se
 * estaria eligiendo la que venia masterizada mas alta.
 */
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rutaFfmpeg, ejecutar } from '../lib/audio.mjs';
import { nivelEn } from '../lib/musica.mjs';
import { sonoridad, camaDesdeArchivo, mezclarMuestra, regionUtil } from '../lib/musicaArchivo.mjs';
import { readFileSync } from 'node:fs';

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'ok   ' : 'FALLO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };

const dir = mkdtempSync(join(tmpdir(), 'musarch-'));
const musica = fileURLToPath(new URL('../assets/music/', import.meta.url));
const ffmpeg = await rutaFfmpeg();
const DUR = 24;

const forma = { huecos: [{ inicio: 8, duracion: 8 }], finNarracion: DUR, rampa: 1.5 };
const nivel = (t) => nivelEn(t, {
  ...forma, cierre: { fadeIn: 2, fadeOut: 2, duracionTotal: DUR },
  bajoVoz: -23, enInterludio: -15.5,
});
const dB = (g) => 20 * Math.log10(g);
check('la envolvente baja bajo la voz', Math.abs(dB(nivel(5)) - (-23)) < 0.1, dB(nivel(5)).toFixed(2));
check('la envolvente abre en el interludio', Math.abs(dB(nivel(12)) - (-15.5)) < 0.1, dB(nivel(12)).toFixed(2));

// --- las tres pistas existen y se pueden medir ------------------------------
const pistas = ['one_step_closer.mp3', 'alone_with_my_thoughts.mp3', 'touching_moment.mp3'];
const crudas = [];
for (const p of pistas) {
  const ruta = join(musica, p);
  check(`existe ${p}`, existsSync(ruta));
  const s = await sonoridad(ruta);
  check(`se mide ${p}`, Number.isFinite(s.lufs) && s.lufs < 0, `${s.lufs.toFixed(1)} LUFS`);
  crudas.push({ p, ruta, ...s });
}

// Este es el motivo de existir del ajuste de nivel: vienen muy desigualadas.
const dispersionCruda = Math.max(...crudas.map((x) => x.lufs)) - Math.min(...crudas.map((x) => x.lufs));
check('las pistas vienen a volumenes muy distintos', dispersionCruda > 3,
  `${dispersionCruda.toFixed(1)} LU entre la mas alta y la mas baja`);

// --- igualarlas las deja a la misma sonoridad -------------------------------
const OBJETIVO = -40;
const finales = [];
for (const { p, ruta } of crudas) {
  const wav = join(dir, `c-${p}.wav`);
  const hacer = (g) => camaDesdeArchivo({
    pista: ruta, segundos: DUR, envolvente: nivel, salidaWav: wav,
    gananciaDb: g, fadeIn: 1, fadeOut: 1,
  });
  await hacer(0);
  const sin = await sonoridad(wav);
  await hacer(OBJETIVO - sin.lufs);
  const con = await sonoridad(wav);
  finales.push({ p, wav, lufs: con.lufs });
}
const dispersionFinal = Math.max(...finales.map((x) => x.lufs)) - Math.min(...finales.map((x) => x.lufs));
check('tras igualarlas quedan al mismo volumen', dispersionFinal <= 0.6,
  `${dispersionFinal.toFixed(2)} LU de diferencia, desde ${dispersionCruda.toFixed(1)}`);
check('y en el objetivo pedido',
  finales.every((x) => Math.abs(x.lufs - OBJETIVO) <= 0.6),
  finales.map((x) => x.lufs.toFixed(1)).join(', '));

// --- el bucle de las pistas largas ------------------------------------------
//
// Una pieza de dos minutos y medio bajo un video de media hora da doce vueltas.
// Si la costura se nota, se nota doce veces y acompasada, que es justo el tipo
// de patron que el oido encuentra solo.

// Pista de prueba con los fundidos que trae cualquier pieza publicada: entra
// desde el silencio y se apaga. Sin quitarlos, cruzar la cola con la cabeza es
// cruzar dos zonas mudas.
const conFundidos = join(dir, 'confundidos.wav');
await ejecutar(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'lavfi',
  '-i', 'sine=frequency=330:duration=12',
  '-af', 'afade=t=in:st=0:d=2,afade=t=out:st=10:d=2',
  '-ar', '44100', '-ac', '2', conFundidos]);

// Cuanto recorta depende de la forma del fundido: aqui es lineal de 2s, y cae
// por debajo del umbral solo en su ultimo cuarto de segundo. Lo que hay que
// comprobar no es cuanto quita, sino que quita por los dos lados y deja dentro
// el cuerpo de la pieza.
const region = regionUtil(readFileSync(conFundidos).subarray(44));
check('encuentra el tramo util, sin los fundidos de la pista',
  region.recortado && region.entradaS > 0 && region.salidaS > 0 && region.fin > region.inicio,
  `descarta ${region.entradaS?.toFixed(1)}s de entrada y ${region.salidaS?.toFixed(1)}s de salida`);

const SEG = 40;
const plano = () => 1;
const bache = (wav, c) => {
  const b = readFileSync(wav).subarray(44);
  const rms = (t, w = 0.3) => {
    const n = b.length >> 2;
    const a = Math.max(0, Math.round((t - w / 2) * 44100));
    const z = Math.min(n - 1, Math.round((t + w / 2) * 44100));
    let s = 0;
    for (let i = a; i <= z; i++) { const v = b.readInt16LE(i * 4) / 32768; s += v * v; }
    return Math.sqrt(s / Math.max(1, z - a + 1));
  };
  const dBx = (x) => 20 * Math.log10(Math.max(1e-9, x));
  const fuera = (dBx(rms(c - 3)) + dBx(rms(c + 3))) / 2;
  let peor = 0;
  for (let d = -1.5; d <= 1.5; d += 0.05) peor = Math.max(peor, fuera - dBx(rms(c + d)));
  return peor;
};

const seco = join(dir, 'seco.wav');
const rSeco = await camaDesdeArchivo({
  pista: conFundidos, segundos: SEG, envolvente: plano, salidaWav: seco,
  gananciaDb: 0, fadeIn: 0.01, fadeOut: 0.01, cruceLoop: 0,
});
const cruzado = join(dir, 'cruzado.wav');
const rCruzado = await camaDesdeArchivo({
  pista: conFundidos, segundos: SEG, envolvente: plano, salidaWav: cruzado,
  gananciaDb: 0, fadeIn: 0.01, fadeOut: 0.01, cruceLoop: 2,
});

check('avisa cuando ha tenido que repetir la pista', rCruzado.repetida === true,
  `${rCruzado.vueltas} vueltas, cruce de ${rCruzado.cruceSegundos}s`);
check('deja constancia de lo que recorto', rCruzado.recorte !== null,
  JSON.stringify(rCruzado.recorte));

// Control: sin cruce la costura tiene que verse, o medir cero no diria nada.
const bacheSeco = bache(seco, rSeco.costuras[0]);
const bacheCruzado = bache(cruzado, rCruzado.costuras[0]);
check('sin cruce la costura SI deja un bajon (control)', bacheSeco > 6,
  `${bacheSeco.toFixed(1)} dB`);
check('el cruce lo hace mucho menor', bacheCruzado < bacheSeco / 2,
  `${bacheCruzado.toFixed(1)} dB frente a ${bacheSeco.toFixed(1)} dB`);

const rep = await sonoridad(cruzado);
check('la ventana repetida suena de principio a fin', Number.isFinite(rep.lufs) && rep.lufs > -70,
  `${rep.lufs.toFixed(1)} LUFS`);

// --- la voz manda en la mezcla ----------------------------------------------
const voz = join(dir, 'voz.wav');
await ejecutar(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'lavfi',
  '-i', 'sine=frequency=200:duration=' + DUR, '-af', 'volume=0.5',
  '-ar', '44100', '-ac', '2', voz]);
const sVoz = await sonoridad(voz);
const mezcla = join(dir, 'mezcla.mp3');
await mezclarMuestra({ voz, musica: finales[0].wav, salidaMp3: mezcla, segundos: DUR, fadeIn: 1, fadeOut: 1 });
const sMezcla = await sonoridad(mezcla);
check('la cama no levanta la mezcla por encima de la voz',
  Math.abs(sMezcla.lufs - sVoz.lufs) < 1.5,
  `voz sola ${sVoz.lufs.toFixed(1)} LUFS, con cama ${sMezcla.lufs.toFixed(1)} LUFS`);

rmSync(dir, { recursive: true, force: true });
console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
