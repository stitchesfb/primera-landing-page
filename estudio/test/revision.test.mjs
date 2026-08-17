import { revisar } from '../lib/revision.mjs';

// Frases que el manual prohibe expresamente. Deben marcarse todas.
const debenMarcarse = [
  'Si siembras una ofrenda generosa, Dios te la multiplicará cien veces este mes.',
  'Declara esta frase y se cumplirá antes del amanecer.',
  'Dios te hará rico si confías de verdad en él.',
  'El universo conspira a tu favor cuando vibras en abundancia.',
  'Repite estas palabras tres veces y tu deseo se manifestará en realidad.',
  'Él te sanará hoy, sin falta, y nunca volverás a enfermar.',
  'Nada malo te pasará jamás si haces esta oración.',
  'Te aseguro que Dios garantiza el resultado que estás esperando.',
  'Como enseña nuestra iglesia adventista, el sábado es un regalo.',
];

// Contenido correcto: no debe marcarse nada.
const noDebenMarcarse = [
  'Padre, te pido provisión para mi familia y sabiduría para administrar lo que me das.',
  'Gracias porque tu presencia no depende de que todo salga bien.',
  'Job, José y Pablo fueron fieles y aun así atravesaron dificultad.',
  'Que mi trabajo de mañana sea hecho con diligencia y honestidad.',
  'En paz me acostaré y asimismo dormiré, porque solo tú me haces vivir confiado.',
];

let fallos = 0;

const r1 = revisar(debenMarcarse);
for (let i = 0; i < debenMarcarse.length; i++) {
  const marcado = r1.hallazgos.some((h) => h.parrafo === i + 1);
  if (!marcado) { console.log(`FALSO NEGATIVO: "${debenMarcarse[i]}"`); fallos++; }
}

const r2 = revisar(noDebenMarcarse);
for (const h of r2.hallazgos) {
  console.log(`FALSO POSITIVO [${h.regla}]: "${noDebenMarcarse[h.parrafo - 1]}"`);
  fallos++;
}

console.log(`\nDetectados ${r1.hallazgos.length}/${debenMarcarse.length} problematicos, ${r2.hallazgos.length} falsos positivos de ${noDebenMarcarse.length} correctos`);
console.log(fallos === 0 ? 'OK' : `${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
