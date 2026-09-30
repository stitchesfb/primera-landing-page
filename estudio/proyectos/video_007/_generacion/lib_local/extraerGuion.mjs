// Extractor deterministico del guion aprobado de Video 7, agrupado en los
// 23 bloques TTS ya validados en el preflight (24 bloques editoriales, con
// el unico ajuste aprobado: 23+24 unidos). Reproduce en JS la misma logica
// que el parser de preflight en Python, para poder verificar el hash de
// cualquier bloque antes de enviarlo a la API.
//
// Descarta explicitamente: encabezados "## BLOQUE NN — titulo", marcadores
// entre corchetes ([INICIO/FIN SHORT N], [PAUSA IMPORTANTE N...]), la nota
// en blockquote del principio, separadores "---", y todo lo que va despues
// de "## Notas para revision editorial" (metadato editorial, no narracion).

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const RE_BLOQUE = /^## BLOQUE (\d+) — (.+)$/;
const RE_MARCADOR = /^\[(.+)\]$/;

// Union aprobada: los bloques editoriales 23 y 24 se generan como un solo
// bloque TTS. Ningun otro cambio frente a los 24 bloques editoriales.
function bloqueTtsDe(bloqueEditorial) {
  if (bloqueEditorial === 23 || bloqueEditorial === 24) return '23-24';
  return String(bloqueEditorial);
}

export function extraerParrafos(rutaGuion) {
  const lineas = readFileSync(rutaGuion, 'utf8').split('\n');

  let inicioIdx = null;
  let finIdx = lineas.length;
  for (let i = 0; i < lineas.length; i++) {
    if (inicioIdx === null && RE_BLOQUE.test(lineas[i])) inicioIdx = i;
    if (/^## Notas para revisi/.test(lineas[i])) { finIdx = i; break; }
  }
  const cuerpo = lineas.slice(inicioIdx, finIdx);

  const parrafos = [];
  let bloqueActual = null;
  let buffer = [];
  let marcadoresPendientes = [];
  let numeroGlobal = 0;

  const cerrarParrafo = () => {
    if (buffer.length) {
      numeroGlobal++;
      parrafos.push({
        numero: numeroGlobal,
        bloque: bloqueActual,
        texto: buffer.join(' ').trim(),
        marcadoresAntes: [...marcadoresPendientes],
      });
      marcadoresPendientes = [];
      buffer = [];
    }
  };

  for (const raw of cuerpo) {
    const l = raw.trim();
    const mBloque = l.match(RE_BLOQUE);
    if (mBloque) {
      cerrarParrafo();
      bloqueActual = Number(mBloque[1]);
      continue;
    }
    if (l === '') { cerrarParrafo(); continue; }
    const mMarcador = l.match(RE_MARCADOR);
    if (mMarcador) { cerrarParrafo(); marcadoresPendientes.push(mMarcador[1]); continue; }
    if (l === '---') continue;
    buffer.push(l);
  }
  cerrarParrafo();

  return parrafos;
}

export function agruparEnBloquesTts(parrafos) {
  const porBloque = new Map();
  for (const p of parrafos) {
    const btts = bloqueTtsDe(p.bloque);
    if (!porBloque.has(btts)) porBloque.set(btts, []);
    porBloque.get(btts).push(p);
  }
  const bloques = [...porBloque.entries()]
    .map(([bloqueTts, ps]) => {
      const texto = ps.map((p) => p.texto).join('\n\n');
      return {
        bloqueTts,
        parrafoInicio: ps[0].numero,
        parrafoFin: ps[ps.length - 1].numero,
        caracteres: texto.length,
        palabras: texto.split(/\s+/).filter(Boolean).length,
        texto,
        textoSha256: createHash('sha256').update(texto, 'utf8').digest('hex'),
        marcadores: ps.flatMap((p) => p.marcadoresAntes),
      };
    })
    .sort((a, b) => a.parrafoInicio - b.parrafoInicio);
  return bloques;
}

export function cargarBloquesTts(rutaGuion) {
  const parrafos = extraerParrafos(rutaGuion);
  return agruparEnBloquesTts(parrafos);
}
