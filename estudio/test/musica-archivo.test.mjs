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
import { sonoridad, camaDesdeArchivo, mezclarMuestra } from '../lib/musicaArchivo.mjs';

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

// --- una pista mas corta que la ventana se repite, no se corta --------------
const corta = join(dir, 'corta.wav');
await ejecutar(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'lavfi',
  '-i', 'sine=frequency=300:duration=5', '-ar', '44100', '-ac', '2', corta]);
const r = await camaDesdeArchivo({
  pista: corta, segundos: DUR, envolvente: nivel,
  salidaWav: join(dir, 'rep.wav'), gananciaDb: 0, fadeIn: 1, fadeOut: 1,
});
check('avisa cuando ha tenido que repetir la pista', r.repetida === true);
const rep = await sonoridad(join(dir, 'rep.wav'));
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
