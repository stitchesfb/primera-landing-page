/**
 * El remux tiene que cumplir dos promesas que no se pueden verificar a ojo:
 * que la imagen no se toca y que la voz no se mueve. Se comprueban sobre
 * archivos de verdad, generados aqui con ffmpeg.
 */
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rutaFfmpeg, ejecutar } from '../lib/audio.mjs';
import { inspeccionarVideo, huellaVideo, remuxarAudio, desfaseAudio } from '../lib/remux.mjs';

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'ok   ' : 'FALLO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };

const dir = mkdtempSync(join(tmpdir(), 'remux-'));
const ffmpeg = await rutaFfmpeg();
const DUR = 12;

// "Voz": tonos separados por silencio, que es lo que da una envolvente con
// forma reconocible. Si el remux desplazara el audio, la correlacion lo veria.
const voz = join(dir, 'voz.mp3');
await ejecutar(ffmpeg, [
  '-y', '-loglevel', 'error',
  '-f', 'lavfi', '-i', `sine=frequency=300:duration=${DUR}`,
  '-af', 'volume=0.8:eval=frame:enable=\'between(t,1,3)+between(t,6,9)\'',
  '-t', String(DUR), voz,
]);

// Dos camas distintas: la "vieja" que lleva el video original y la "nueva".
const camaVieja = join(dir, 'vieja.wav');
const camaNueva = join(dir, 'nueva.wav');
await ejecutar(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'lavfi',
  '-i', `sine=frequency=2000:duration=${DUR}`, '-af', 'volume=0.25', camaVieja]);
await ejecutar(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'lavfi',
  '-i', `sine=frequency=440:duration=${DUR}`, '-af', 'volume=0.05', camaNueva]);

// Video "ya renderizado": imagen en movimiento + la mezcla vieja.
const original = join(dir, 'original.mp4');
await ejecutar(ffmpeg, [
  '-y', '-loglevel', 'error',
  '-f', 'lavfi', '-i', `testsrc2=size=320x180:rate=30:duration=${DUR}`,
  '-i', voz, '-i', camaVieja,
  '-filter_complex', '[1:a][2:a]amix=inputs=2:duration=first:normalize=0[aud]',
  '-map', '0:v', '-map', '[aud]',
  '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '30', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '96k', '-ar', '44100', '-movflags', '+faststart',
  original,
]);

const antes = await inspeccionarVideo(original);
check('se lee el flujo de video del origen', antes.codec === 'h264' && antes.ancho === 320,
  `${antes.codec} ${antes.ancho}x${antes.alto} ${antes.fps.toFixed(0)} fps`);

const huellaAntes = await huellaVideo(original);
const salida = join(dir, 'remuxado.mp4');
await remuxarAudio({ video: original, voz, musica: camaNueva, salida });
check('el remux produce el archivo', existsSync(salida));

const huellaDespues = await huellaVideo(salida);
check('la imagen es identica byte a byte', huellaDespues === huellaAntes, huellaDespues);

const despues = await inspeccionarVideo(salida);
check('mismo numero de fotogramas', despues.fotogramas === antes.fotogramas,
  `${despues.fotogramas} de ${antes.fotogramas}`);
check('mismo codec de video, sin recodificar', despues.codec === antes.codec);
check('misma duracion', Math.abs(despues.duracionContenedor - antes.duracionContenedor) < 0.05,
  `${despues.duracionContenedor.toFixed(3)}s vs ${antes.duracionContenedor.toFixed(3)}s`);

// La musica ha cambiado por completo, pero la voz sigue donde estaba.
const lag = await desfaseAudio(original, salida);
check('la voz no se ha movido', Math.abs(lag) < 0.02, `${(lag * 1000).toFixed(0)} ms`);

// Control: si el audio SI se desplaza, la medida tiene que detectarlo. Sin
// esto, un desfase de 0 podria significar que el medidor no mide nada. El
// retardo se mete en la propia senal (medio segundo de silencio delante), no
// en la marca de tiempo del contenedor, que es justo lo que hay que detectar.
const vozCorrida = join(dir, 'voz-corrida.mp3');
await ejecutar(ffmpeg, [
  '-y', '-loglevel', 'error', '-i', voz, '-af', 'adelay=500:all=1', vozCorrida,
]);
const corrido = join(dir, 'corrido.mp4');
await remuxarAudio({ video: original, voz: vozCorrida, musica: camaNueva, salida: corrido });
const lagCorrido = await desfaseAudio(salida, corrido);
check('un desplazamiento real SI se detecta (control)', Math.abs(lagCorrido - 0.5) < 0.05,
  `${(lagCorrido * 1000).toFixed(0)} ms de los 500 esperados`);

rmSync(dir, { recursive: true, force: true });
console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
