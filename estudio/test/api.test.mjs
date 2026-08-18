/**
 * Pruebas de la capa de API sin tocar la red.
 *
 * Cubren lo que fallo en produccion: la espera del contador de consumo, que
 * dio cero porque ElevenLabs lo actualiza de forma asincrona, y despues no
 * llego a existir por una edicion mal aplicada que 'node --check' no detecta.
 */
import { esperarConsumo } from '../lib/elevenlabs.mjs';

let fallos = 0;
const check = (nombre, ok, detalle = '') => {
  console.log(`${ok ? 'ok   ' : 'FALLO'} ${nombre}${detalle ? ' — ' + detalle : ''}`);
  if (!ok) fallos++;
};

// Cliente falso: el contador se mueve a la enesima consulta.
const clienteFalso = (mueveEnConsulta, base = 1000, delta = 250) => {
  let consultas = 0;
  return {
    consultas: () => consultas,
    async suscripcion() {
      consultas++;
      return { usados: consultas >= mueveEnConsulta ? base + delta : base, limite: 131000 };
    },
  };
};

// 1. El contador se mueve a la tercera: debe detectarlo y devolver el valor nuevo.
const a = clienteFalso(3);
const r1 = await esperarConsumo(a, 1000, { intentos: 10, esperaMs: 5 });
check('detecta el movimiento del contador', r1.movio === true);
check('devuelve el consumo real', r1.sub.usados - 1000 === 250, `${r1.sub.usados - 1000}`);
check('para en cuanto se mueve', a.consultas() === 3, `${a.consultas()} consultas`);

// 2. Nunca se mueve: no debe inventar un cero, debe declararlo.
const b = clienteFalso(999);
const r2 = await esperarConsumo(b, 1000, { intentos: 4, esperaMs: 5 });
check('declara que no pudo medir', r2.movio === false);
check('agota los intentos', b.consultas() === 4, `${b.consultas()} consultas`);
check('informa cuanto espero', r2.segundos === 0.02, `${r2.segundos}s`);

// 3. Se mueve a la primera: el caso rapido tambien vale.
const c = clienteFalso(1);
const r3 = await esperarConsumo(c, 1000, { intentos: 10, esperaMs: 5 });
check('caso rapido', r3.movio === true && c.consultas() === 1);

// 4. Humo del CLI: al ser esperarConsumo un import y no una funcion suelta,
//    si falta o se renombra, CUALQUIER comando falla al cargar el modulo.
//    Esto es lo que no detectaba 'node --check', que solo mira la sintaxis.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
for (const args of [[], ['estado'], ['estimar', 'ejemplo_noche'], ['revisar', 'ejemplo_noche']]) {
  try {
    execFileSync('node', [join(raiz, 'cli.mjs'), ...args], { cwd: raiz, stdio: 'pipe' });
    check(`el CLI carga y ejecuta: ${args.join(' ') || '(ayuda)'}`, true);
  } catch (e) {
    const salida = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    check(`el CLI carga y ejecuta: ${args.join(' ') || '(ayuda)'}`, false, salida.slice(-200).trim());
  }
}

console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
