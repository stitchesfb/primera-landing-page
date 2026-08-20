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

// Archivo sano: como los que produce el pipeline, CON fotogramas B.
//
// Los fotogramas B son lo que hace este caso interesante. El decodificador
// recibe las imagenes en un orden distinto del que las muestra, asi que los
// primeros DTS salen negativos para que el primer PTS caiga en cero, y el
// muxer anade una lista de edicion que recorta ese adelanto. Un archivo
// perfectamente sano, en resumen, viene con DTS negativos y lista de edicion.
// Sin fotogramas B el test pasaria sin tocar nada de eso.
const sano = join(dir, 'sano.mp4');
await ejecutar(ffmpeg, [
  '-y', '-loglevel', 'error',
  '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=30:duration=8',
  '-f', 'lavfi', '-i', 'sine=frequency=300:duration=8',
  '-c:v', 'libx264', '-preset', 'veryfast', '-bf', '3', '-crf', '32',
  '-pix_fmt', 'yuv420p', '-g', '60',
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
// Si el retardo del codificador contara como anomalia, el diagnostico marcaria
// como roto cualquier MP4 del mundo — y peor: propondria "arreglarlo".
const dSano = await diagnosticar(sano);

// Antes de nada, que el archivo de prueba traiga de verdad lo que hay que
// tolerar. Si no, el check de abajo pasaria sin haber probado nada.
const primerVideo = dSano.paqVideo[0];
check('el archivo de prueba trae retardo de reordenacion',
  Number(primerVideo.dts_time) < 0 && Math.abs(Number(primerVideo.pts_time)) < 0.001,
  `primer paquete dts ${primerVideo.dts_time}, pts ${primerVideo.pts_time}`);
check('el archivo de prueba trae lista de edicion en video',
  pv.edicion?.[0]?.tiempoMedio > 0, `media_time ${pv.edicion?.[0]?.tiempoMedio}`);

check('el archivo sano no da ninguna anomalia grave', dSano.graves === 0,
  dSano.anomalias.map((a) => a.texto).join(' | ') || 'ninguna');
check('el retardo del codificador queda anotado, no marcado', dSano.notas.length > 0,
  `${dSano.notas.length} notas`);

// --- sí darla sobre uno que no puede arrancar en la web --------------------
//
// Indice al final: el reproductor tiene que bajar el archivo entero antes de
// saber que hay dentro. Es el defecto que un remux sí arregla del todo.
const sinIndice = join(dir, 'sin-faststart.mp4');
await ejecutar(ffmpeg, [
  '-y', '-loglevel', 'error', '-i', sano, '-c', 'copy', '-movflags', '+disable_chpl', sinIndice,
]);
const dSinIndice = await diagnosticar(sinIndice);
check('detecta el indice detras de los datos',
  dSinIndice.anomalias.some((a) => a.grave && a.texto.includes('moov va DESPUES')));

const flags = [...new Set(dSinIndice.anomalias.filter((a) => a.grave).flatMap((a) => a.flags))];
const arreglado = join(dir, 'arreglado.mp4');
await repararContenedor({ entrada: sinIndice, salida: arreglado, flags });
check('la reparacion produce el archivo', existsSync(arreglado));

const dArreglado = await diagnosticar(arreglado);
check('el archivo reparado ya no tiene anomalias graves', dArreglado.graves === 0,
  dArreglado.anomalias.map((a) => a.texto).join(' | ') || 'ninguna');

// Lo que no puede pasar bajo ningun concepto: que "reparar el contenedor"
// acabe recodificando la imagen.
check('la imagen no se ha tocado', await huellaVideo(arreglado) === await huellaVideo(sinIndice),
  await huellaVideo(arreglado));

// --- un desfase real se detecta, aunque el remux no lo cure ----------------
//
// Pistas que arrancan en momentos distintos: el diagnostico tiene que verlo
// aunque no exista una opcion de contenedor que lo arregle. Ver un problema y
// no poder arreglarlo es un resultado legitimo; inventarse un arreglo, no.
const desfasado = join(dir, 'desfasado.mp4');
await ejecutar(ffmpeg, [
  '-y', '-loglevel', 'error',
  '-i', sano, '-itsoffset', '1.5', '-i', sano,
  '-map', '0:v', '-map', '1:a', '-c', 'copy', desfasado,
]);
const dDesfasado = await diagnosticar(desfasado);
const dice = (t) => dDesfasado.anomalias.some((a) => a.grave && a.texto.includes(t));
check('detecta el arranque desplazado del audio', dice('el audio no empieza en 0'));
check('detecta que las pistas no arrancan a la vez', dice('no arrancan a la vez'));

// --- reparar lo que no esta roto lo rompe ----------------------------------
//
// Aplicar a un archivo sano las opciones que arreglan uno roto le mete un hueco
// vacio al principio y retrasa el video frente al audio. Por eso la reparacion
// solo puede aplicarse a partir de anomalias encontradas, y por eso hay que
// comparar el resultado antes de entregarlo.
const empeorado = join(dir, 'empeorado.mp4');
await repararContenedor({
  entrada: sano, salida: empeorado,
  flags: ['-ignore_editlist 1', '-avoid_negative_ts make_zero'],
});
const dEmpeorado = await diagnosticar(empeorado);
check('reparar un archivo sano lo empeora, y se nota', dEmpeorado.graves > dSano.graves,
  `${dSano.graves} anomalias graves antes, ${dEmpeorado.graves} despues`);

// --- las pruebas de reproduccion miden algo --------------------------------
const p0 = await pruebaDecodificacion(arreglado, { desde: 0, segundos: 4 });
const pm = await pruebaDecodificacion(arreglado, { desde: 4, segundos: 4 });
check('decodifica desde el principio', p0.ok && p0.fotogramas > 0, `${p0.fotogramas} fotogramas`);
check('decodifica desde la mitad', pm.ok && pm.fotogramas > 0, `${pm.fotogramas} fotogramas`);

rmSync(dir, { recursive: true, force: true });
console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
