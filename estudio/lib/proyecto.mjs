/**
 * Carpeta de proyecto y maquina de estados.
 *
 * Reglas duras, sin banderas para saltarselas:
 *   - 'voz' exige estado APPROVED_FOR_AUDIO.
 *   - 'publicar' exige estado APPROVED_FOR_PUBLISHING.
 *
 * narration.txt es prosa pura: parrafos separados por linea en blanco, sin
 * marcas ni directivas. No hay nada que limpiar antes de mandarlo a la API,
 * asi que es imposible que la voz lea una instruccion de edicion. Todo lo
 * estructural vive en edit_plan.json y apunta a los parrafos por su numero.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from './config.mjs';

export const ESTADOS = [
  'draft',
  'reviewed',
  'APPROVED_FOR_AUDIO',
  'audio',
  'rendered',
  'APPROVED_FOR_PUBLISHING',
  'published',
];

export function dirProyectos() {
  return join(RAIZ, 'proyectos');
}

export function listarProyectos() {
  const dir = dirProyectos();
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export function cargarProyecto(id) {
  const dir = join(dirProyectos(), id);
  if (!existsSync(dir)) {
    throw new Error(`No existe el proyecto "${id}" en ${dirProyectos()}`);
  }

  const rutaNarracion = join(dir, 'narration.txt');
  if (!existsSync(rutaNarracion)) {
    throw new Error(`Falta ${id}/narration.txt`);
  }
  const parrafos = partirParrafos(readFileSync(rutaNarracion, 'utf8'));
  if (!parrafos.length) throw new Error(`${id}/narration.txt esta vacio`);

  const rutaPlan = join(dir, 'edit_plan.json');
  const plan = existsSync(rutaPlan) ? JSON.parse(readFileSync(rutaPlan, 'utf8')) : null;

  return {
    id,
    dir,
    salida: join(dir, 'output'),
    parrafos,
    plan,
    estado: leerEstado(dir),
  };
}

/**
 * Parrafos = bloques separados por una o mas lineas en blanco.
 * Los saltos simples dentro de un parrafo se colapsan a espacio: son formato
 * del archivo, no pausas. Las pausas se declaran en edit_plan.json.
 */
export function partirParrafos(texto) {
  return texto
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n+/)
    .map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean).join(' ').trim())
    .filter(Boolean);
}

export function leerEstado(dir) {
  const ruta = join(dir, 'estado.json');
  if (!existsSync(ruta)) return { estado: 'draft', historial: [] };
  return JSON.parse(readFileSync(ruta, 'utf8'));
}

export function escribirEstado(proyecto, nuevo, nota) {
  if (!ESTADOS.includes(nuevo)) throw new Error(`Estado desconocido: ${nuevo}`);
  const estado = proyecto.estado ?? { estado: 'draft', historial: [] };
  estado.historial = estado.historial ?? [];
  estado.historial.push({
    de: estado.estado,
    a: nuevo,
    fecha: new Date().toISOString(),
    nota: nota ?? null,
  });
  estado.estado = nuevo;
  mkdirSync(proyecto.dir, { recursive: true });
  writeFileSync(join(proyecto.dir, 'estado.json'), JSON.stringify(estado, null, 2) + '\n');
  proyecto.estado = estado;
  return estado;
}

export function exigirEstado(proyecto, requerido, comando) {
  const actual = proyecto.estado?.estado ?? 'draft';
  if (actual === requerido) return;
  throw new Error(
    `"${comando}" exige estado ${requerido}, pero ${proyecto.id} esta en "${actual}".\n` +
      `  Aprobacion humana obligatoria. Cuando el guion este revisado:\n` +
      `    node cli.mjs aprobar-audio ${proyecto.id}`
  );
}

export function asegurarSalida(proyecto) {
  mkdirSync(proyecto.salida, { recursive: true });
  return proyecto.salida;
}
