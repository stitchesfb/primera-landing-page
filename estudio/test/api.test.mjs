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

// Cliente falso: devuelve la secuencia de valores que se le pase, repitiendo
// el ultimo. Sirve para simular un contador que sube a plazos.
const clienteFalso = (secuencia) => {
  let consultas = 0;
  return {
    consultas: () => consultas,
    async suscripcion() {
      const v = secuencia[Math.min(consultas, secuencia.length - 1)];
      consultas++;
      return { usados: v, limite: 131000 };
    },
  };
};

const OPC = { intentos: 30, esperaMs: 1, estables: 3 };

// 1. El caso que nos mordio: el cargo llega a plazos (75, luego 271 en total).
//    Pararse en el primer cambio daria 75; hay que llegar a 271.
const a = clienteFalso([1000, 1075, 1075, 1271, 1271, 1271, 1271, 1271]);
const r1 = await esperarConsumo(a, 1000, OPC);
check('espera a que el contador deje de subir', r1.estable === true);
check('devuelve el cargo completo, no el parcial', r1.sub.usados - 1000 === 271, `${r1.sub.usados - 1000}`);

// 2. Sube de una vez y se queda quieto.
const b = clienteFalso([1000, 1271]);
const r2 = await esperarConsumo(b, 1000, OPC);
check('caso simple: sube una vez y se estabiliza', r2.estable === true && r2.sub.usados === 1271);

// 3. Nunca se mueve: no debe inventar un cero.
const c = clienteFalso([1000]);
const r3 = await esperarConsumo(c, 1000, { intentos: 5, esperaMs: 1, estables: 3 });
check('declara que no pudo medir', r3.movio === false && r3.estable === false);

// 4. Sigue subiendo al agotar los intentos: no puede darse por buena.
const d = clienteFalso(Array.from({ length: 40 }, (_, i) => 1000 + i * 10));
const r4 = await esperarConsumo(d, 1000, { intentos: 6, esperaMs: 1, estables: 3 });
check('marca como no estable si seguia subiendo', r4.movio === true && r4.estable === false);

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
