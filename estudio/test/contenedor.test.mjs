/**
 * El diagnostico del contenedor tiene que hacer dos cosas bien, y las dos
 * fallan de forma silenciosa: no dar la alarma sobre un archivo sano —o nadie
 * volveria a hacerle caso— y sí darla sobre uno que un reproductor web no
 * podria arrancar.
 *
 * Se comprueban las dos sobre archivos de verdad.
 */
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rutaFfmpeg, ejecutar } from '../lib/audio.mjs';
import { cajasSuperiores, analizarMoov } from '../lib/mp4.mjs';
import { diagnosticar, repararContenedor, pruebaDecodificacion } from '../lib/diagnostico.mjs';
import { huellaVideo } from '../lib/remux.mjs';

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'ok   ' : 'FALLO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };

const dir = mkdtempSync(join(tmpdir(), 'contenedor-'));
const ffmpeg = await rutaFfmpeg();

// Archivo sano: como los que produce el pipeline.
const sano = join(dir, 'sano.mp4');
await ejecutar(ffmpeg, [
  '-y', '-loglevel', 'error',
  '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=30:duration=8',
  '-f', 'lavfi', '-i', 'sine=frequency=300:duration=8',
  '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '32', '-pix_fmt', 'yuv420p', '-g', '60',
  '-c:a', 'aac', '-b:a', '96k', '-ar', '44100', '-movflags', '+faststart', sano,
]);

// --- lectura del contenedor ------------------------------------------------
const sup = cajasSuperiores(sano);
check('se leen las cajas de primer nivel', sup.cajas.length >= 3,
  sup.cajas.map((c) => c.tipo).join(' → '));
const iMoov = sup.cajas.findIndex((c) => c.tipo === 'moov');
const iMdat = sup.cajas.findIndex((c) => c.tipo === 'mdat');
check('detecta faststart', iMoov > -1 && iMdat > -1 && iMoov < iMdat);

const moov = analizarMoov(sano);
check('encuentra las dos pistas', moov.pistas.length === 2,
  moov.pistas.map((p) => p.tipo).join(', '));
const pv = moov.pistas.find((p) => p.tipo === 'vide');
check('lee la tabla de fotogramas llave', pv.llaves.primera === 1,
  `primera llave en la muestra ${pv.llaves.primera}`);
check('lee la lista de edicion', Array.isArray(pv.edicion) && pv.edicion.length === 1,
  JSON.stringify(pv.edicion));

// --- no dar la alarma sobre un archivo sano --------------------------------
//
// Un AAC siempre trae delante una trama con DTS negativo: el retardo del
// codificador. Si eso contara como anomalia, el diagnostico marcaria como roto
// cualquier MP4 del mundo.
const dSano = await diagnosticar(sano);
check('el archivo sano no da ninguna anomalia grave', dSano.graves === 0,
  dSano.anomalias.map((a) => a.texto).join(' | ') || 'ninguna');

// --- sí darla sobre uno que no arranca -------------------------------------
const roto = join(dir, 'roto.mp4');
await ejecutar(ffmpeg, [
  '-y', '-loglevel', 'error',
  '-i', sano, '-itsoffset', '1.5', '-i', sano,
  '-map', '0:v', '-map', '1:a', '-c', 'copy', roto,
]);

const dRoto = await diagnosticar(roto);
const dice = (t) => dRoto.anomalias.some((a) => a.grave && a.texto.includes(t));
check('detecta el indice detras de los datos', dice('moov va DESPUES'));
check('detecta el arranque desplazado del audio', dice('el audio no empieza en 0'));
check('detecta que las pistas no arrancan a la vez', dice('no arrancan a la vez'));

// --- la reparacion arregla sin recodificar ---------------------------------
const flags = [...new Set(dRoto.anomalias.filter((a) => a.grave).flatMap((a) => a.flags))];
const arreglado = join(dir, 'arreglado.mp4');
await repararContenedor({ entrada: roto, salida: arreglado, flags });
check('la reparacion produce el archivo', existsSync(arreglado));

const dArreglado = await diagnosticar(arreglado);
check('el archivo reparado ya no tiene anomalias graves', dArreglado.graves === 0,
  dArreglado.anomalias.map((a) => a.texto).join(' | ') || 'ninguna');

// Lo que no puede pasar bajo ningun concepto: que "reparar el contenedor"
// acabe recodificando la imagen.
check('la imagen no se ha tocado', await huellaVideo(arreglado) === await huellaVideo(roto),
  await huellaVideo(arreglado));

// --- las pruebas de reproduccion miden algo --------------------------------
const p0 = await pruebaDecodificacion(arreglado, { desde: 0, segundos: 4 });
const pm = await pruebaDecodificacion(arreglado, { desde: 4, segundos: 4 });
check('decodifica desde el principio', p0.ok && p0.fotogramas > 0, `${p0.fotogramas} fotogramas`);
check('decodifica desde la mitad', pm.ok && pm.fotogramas > 0, `${pm.fotogramas} fotogramas`);

rmSync(dir, { recursive: true, force: true });
console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
