import { readFileSync, existsSync, statSync } from 'node:fs';
import { cargarBloquesTts } from './lib_local/extraerGuion.mjs';

const bloques = cargarBloquesTts('../VIDEO_007_GUION_APROBADO.md');
const m = JSON.parse(readFileSync('manifiesto.json', 'utf8'));
let todoOk = true;
for (let n = 1; n <= 24; n++) {
  const id = String(n);
  const b = bloques.find((x) => x.bloqueTts === id);
  const e = m.bloques.find((x) => x.bloque_tts === id);
  const hashTextoOk = b.textoSha256 === e.texto_sha256;
  const rutaAudio = 'audio/bloques/' + e.archivo_audio;
  const existe = existsSync(rutaAudio);
  const tamOk = existe && statSync(rutaAudio).size > 0;
  const estadoOk = e.estado === 'generado';
  const ok = hashTextoOk && existe && tamOk && estadoOk;
  console.log(id.padStart(2), ok ? 'OK' : 'PROBLEMA', JSON.stringify({ hashTextoOk, existe, tamOk, estadoOk }));
  if (!ok) todoOk = false;
}
console.log(todoOk ? '\nOK: los 24 bloques tienen hash de texto, estado y audio consistentes.' : '\nHAY PROBLEMAS, ver arriba.');
