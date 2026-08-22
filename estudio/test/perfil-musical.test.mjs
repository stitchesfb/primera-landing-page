/**
 * La regla del perfil nocturno no puede vivir solo escrita en canal.json: basta
 * que alguien suba un numero "para probar" y se quede. Aqui se comprueba que la
 * validacion la sostiene, y que canal.json la cumple de verdad.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validarPerfilMusical, pistaDelProyecto } from '../lib/perfilMusical.mjs';

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'ok   ' : 'FALLO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };

const canal = JSON.parse(readFileSync(fileURLToPath(new URL('../canal.json', import.meta.url)), 'utf8'));
const noche = canal.render.presets.noche.musica;

check('el perfil nocturno tiene la cama plana',
  noche.bajo_voz_db === noche.en_interludio_db,
  `${noche.bajo_voz_db} dB bajo voz y ${noche.en_interludio_db} dB en interludio`);
check('y en el nivel aprobado', noche.bajo_voz_db === -23, `${noche.bajo_voz_db} dB`);

const real = validarPerfilMusical(canal, 'noche');
check('canal.json pasa la validacion del perfil', real.problemas.length === 0,
  real.problemas.join(' | ') || real.notas.join(' | '));

// Control: si alguien vuelve a subir la cama en los interludios, tiene que
// saltar. Sin esto, un cero de problemas no significaria nada.
const tocado = JSON.parse(JSON.stringify(canal));
tocado.render.presets.noche.musica.en_interludio_db = -15.5;
const roto = validarPerfilMusical(tocado, 'noche');
check('subir la cama en los interludios SI se detecta (control)',
  roto.problemas.length === 1 && roto.problemas[0].includes('no puede subir'),
  roto.problemas[0] ?? 'no se detecto nada');

// --- la biblioteca ----------------------------------------------------------
check('la biblioteca trae las tres pistas aprobadas',
  canal.musica.biblioteca.length === 3,
  canal.musica.biblioteca.map((x) => x.archivo).join(', '));
check('se conserva la normalizacion entre pistas', canal.musica.normalizar === true);
check('se conserva el cruce del bucle', canal.musica.cruce_loop_s > 0 && canal.musica.recorte_fundidos === true,
  `cruce ${canal.musica.cruce_loop_s}s, recorte de fundidos ${canal.musica.recorte_fundidos}`);

// --- eleccion de pista ------------------------------------------------------
const rotadas = [0, 1, 2, 3].map((i) => pistaDelProyecto({ canal, proyecto: {}, indice: i }).archivo);
check('sin pedir nada, rota entre las tres',
  new Set(rotadas.slice(0, 3)).size === 3 && rotadas[3] === rotadas[0],
  rotadas.join(' → '));

const pedida = pistaDelProyecto({ canal, proyecto: { plan: { musica: 'touching_moment.mp3' } } });
check('un proyecto puede pedir la suya', pedida.archivo === 'touching_moment.mp3', pedida.motivo);

let error = null;
try {
  pistaDelProyecto({ canal, proyecto: { plan: { musica: 'la_que_sea.mp3' } } });
} catch (e) { error = e.message; }
check('pedir una pista que no esta en la biblioteca falla en voz alta',
  error !== null && error.includes('no esta en la biblioteca'), error ?? 'no fallo');

console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
