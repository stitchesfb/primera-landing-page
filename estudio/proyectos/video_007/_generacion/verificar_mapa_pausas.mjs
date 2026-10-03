// Verificacion programatica del mapa definitivo de pausas contra los
// marcadores reales del guion aprobado y el mapa real de bloques TTS
// (1:1 con los bloques editoriales, revision 3 + correccion de fronteras
// de pausas 5 y 8). No llama a ElevenLabs. Solo lee el guion.

import { readFileSync } from 'node:fs';

const RUTA_GUION = '/home/user/primera-landing-page/estudio/proyectos/video_007/VIDEO_007_GUION_APROBADO.md';
const RE_BLOQUE = /^## BLOQUE (\d+) — (.+)$/;
const RE_MARCADOR = /^\[(.+)\]$/;

function extraerParrafos(rutaGuion) {
  const lineas = readFileSync(rutaGuion, 'utf8').split('\n');
  let inicioIdx = null, finIdx = lineas.length;
  for (let i = 0; i < lineas.length; i++) {
    if (inicioIdx === null && RE_BLOQUE.test(lineas[i])) inicioIdx = i;
    if (/^## Notas para revisi/.test(lineas[i])) { finIdx = i; break; }
  }
  const cuerpo = lineas.slice(inicioIdx, finIdx);
  const parrafos = [];
  let bloqueActual = null, buffer = [], marcadoresPendientes = [], numeroGlobal = 0;
  const cerrarParrafo = () => {
    if (buffer.length) {
      numeroGlobal++;
      parrafos.push({ numero: numeroGlobal, bloque: bloqueActual, texto: buffer.join(' ').trim(), marcadoresAntes: [...marcadoresPendientes] });
      marcadoresPendientes = []; buffer = [];
    }
  };
  for (const raw of cuerpo) {
    const l = raw.trim();
    const mBloque = l.match(RE_BLOQUE);
    if (mBloque) { cerrarParrafo(); bloqueActual = Number(mBloque[1]); continue; }
    if (l === '') { cerrarParrafo(); continue; }
    const mMarcador = l.match(RE_MARCADOR);
    if (mMarcador) { cerrarParrafo(); marcadoresPendientes.push(mMarcador[1]); continue; }
    if (l === '---') continue;
    buffer.push(l);
  }
  cerrarParrafo();
  return parrafos;
}

const parrafos = extraerParrafos(RUTA_GUION);

const posiciones = [];
for (let i = 0; i < parrafos.length; i++) {
  const p = parrafos[i];
  for (const marcador of p.marcadoresAntes) {
    if (!marcador.startsWith('PAUSA')) continue;
    const numero = Number(marcador.match(/PAUSA IMPORTANTE (\d+)/)[1]);
    const prev = parrafos[i - 1];
    const tipo = prev.bloque === p.bloque ? 'interna' : 'frontera';
    posiciones.push({
      numero, marcador, tipo,
      bloqueAntes: prev.bloque, bloqueDespues: p.bloque,
      parrafoAntes: prev.numero, parrafoDespues: p.numero,
      fraseAntes: prev.texto.slice(-60), fraseDespues: p.texto.slice(0, 60),
    });
  }
}
posiciones.sort((a, b) => a.numero - b.numero);

// Mapa definitivo autorizado por Orlando (2026-10-03).
const MAPA_ESPERADO = [
  { numero: 1, tipo: 'interna', bloque: 1, segundos: 4 },
  { numero: 2, tipo: 'frontera', bloqueAntes: 4, bloqueDespues: 5, segundos: 3 },
  { numero: 3, tipo: 'frontera', bloqueAntes: 5, bloqueDespues: 6, segundos: 4 },
  { numero: 4, tipo: 'frontera', bloqueAntes: 7, bloqueDespues: 8, segundos: 4 },
  { numero: 5, tipo: 'frontera', bloqueAntes: 10, bloqueDespues: 11, segundos: 4 },
  { numero: 6, tipo: 'frontera', bloqueAntes: 12, bloqueDespues: 13, segundos: 4 },
  { numero: 7, tipo: 'frontera', bloqueAntes: 15, bloqueDespues: 16, segundos: 4 },
  { numero: 8, tipo: 'frontera', bloqueAntes: 20, bloqueDespues: 21, segundos: 4 },
  { numero: 9, tipo: 'frontera', bloqueAntes: 21, bloqueDespues: 22, segundos: 5 },
  { numero: 10, tipo: 'interna', bloque: 24, segundos: 4 },
];

console.log('=== Verificacion del mapa definitivo de pausas ===\n');
let todoOk = true;
for (const esperado of MAPA_ESPERADO) {
  const real = posiciones.find((p) => p.numero === esperado.numero);
  if (!real) {
    console.log(`PAUSA ${esperado.numero}: NO ENCONTRADA en el guion. DISCREPANCIA.`);
    todoOk = false;
    continue;
  }
  let ok;
  if (esperado.tipo === 'interna') {
    ok = real.tipo === 'interna' && real.bloqueAntes === esperado.bloque && real.bloqueDespues === esperado.bloque;
  } else {
    ok = real.tipo === 'frontera' && real.bloqueAntes === esperado.bloqueAntes && real.bloqueDespues === esperado.bloqueDespues;
  }
  console.log(
    `PAUSA ${String(esperado.numero).padEnd(2)} (${esperado.segundos}s) — esperado: ${esperado.tipo === 'interna' ? `interna bloque ${esperado.bloque}` : `frontera ${esperado.bloqueAntes}->${esperado.bloqueDespues}`} | real: ${real.tipo === 'interna' ? `interna bloque ${real.bloqueAntes}` : `frontera ${real.bloqueAntes}->${real.bloqueDespues}`} -> ${ok ? 'OK' : 'DISCREPANCIA'}`
  );
  if (!ok) todoOk = false;
}

console.log(`\nTotal de pausas encontradas en el guion: ${posiciones.length} (se esperaban 10)`);
if (posiciones.length !== 10) todoOk = false;

console.log(`\nResultado: ${todoOk ? 'TODAS LAS UBICACIONES COINCIDEN' : 'HAY DISCREPANCIAS -- DETENERSE ANTES DE MONTAR'}`);
if (!todoOk) process.exit(1);
