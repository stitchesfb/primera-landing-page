/**
 * Comprobaciones obligatorias antes de dar por buena una importacion.
 *
 * Cada comprobacion devuelve { id, ok, detalle }. Ninguna es informativa: si
 * una falla, la base de audio no sirve para renderizar encima y hay que
 * arreglarla antes de seguir.
 */

export function validarImportacion({
  archivos,
  bloques,
  proyecto,
  plan,
  linea,
  alineaciones,
  duracionesBloques,
  cues,
  duracionAudio,
  colas: colasDadas = null,
  toleranciaS = 0.25,
}) {
  const pruebas = [];
  const añadir = (id, ok, detalle) => pruebas.push({ id, ok, detalle });

  // 1. Los audios estan y se leyeron todos.
  añadir(
    'audios_presentes',
    archivos.length === bloques.length && archivos.length > 0,
    `${archivos.length} archivos de audio, ${bloques.length} bloques mapeados`
  );

  // 2. Los block_end apuntan a limites reales de parrafo y van en orden.
  const cortes = (plan?.events ?? [])
    .filter((e) => e.type === 'block_end')
    .map((e) => e.after);
  const ordenados = [...cortes].sort((a, b) => a - b);
  const enOrden = cortes.every((v, i) => v === ordenados[i]);
  const sinRepetir = new Set(cortes).size === cortes.length;
  const dentroDeRango = cortes.every((v) => v >= 1 && v < proyecto.parrafos.length);
  const cuentaCorrecta = cortes.length === archivos.length - 1;
  añadir(
    'block_end_coinciden',
    cuentaCorrecta && enOrden && sinRepetir && dentroDeRango,
    cuentaCorrecta
      ? `${cortes.length} cortes en [${cortes.join(', ')}] para ${archivos.length} audios`
      : `${cortes.length} cortes para ${archivos.length} audios; hacen falta ${archivos.length - 1}`
  );

  // 3. Todos los parrafos entraron en algun bloque, sin huecos ni duplicados.
  const asignados = bloques.flat().sort((a, b) => a - b);
  const esperados = Array.from({ length: proyecto.parrafos.length }, (_, i) => i);
  const completo =
    asignados.length === esperados.length && asignados.every((v, i) => v === esperados[i]);
  const bloquesConPalabras = alineaciones.filter((a) => contarPalabras(a) > 0).length;
  añadir(
    'parrafos_alineados',
    completo && bloquesConPalabras === alineaciones.length,
    `${asignados.length}/${proyecto.parrafos.length} parrafos asignados · ` +
      `${bloquesConPalabras}/${alineaciones.length} bloques con alineacion`
  );

  // 4. Ningun subtitulo dentro de un interludio: ahi no hay voz que subtitular.
  const dentroDeHueco = [];
  for (const cue of cues) {
    for (const h of linea.huecos) {
      const finHueco = h.inicio + h.duracion;
      const solapa = cue.inicio < finHueco - 0.05 && cue.fin > h.inicio + 0.05;
      if (solapa) dentroDeHueco.push({ cue: cue.inicio, hueco: h.inicio, tras: h.trasParrafo });
    }
  }
  añadir(
    'sin_subtitulos_en_interludios',
    dentroDeHueco.length === 0,
    dentroDeHueco.length
      ? `${dentroDeHueco.length} solapan con un interludio (primero en ${dentroDeHueco[0].cue.toFixed(2)}s)`
      : `${linea.huecos.length} interludios revisados, ninguno con subtitulo encima`
  );

  // 5. Sin solapes entre subtitulos consecutivos.
  const solapes = [];
  for (let i = 1; i < cues.length; i++) {
    if (cues[i].inicio < cues[i - 1].fin) solapes.push(i + 1);
  }
  añadir(
    'sin_solapes',
    solapes.length === 0,
    solapes.length ? `subtitulos solapados: ${solapes.slice(0, 5).join(', ')}` : `${cues.length} subtitulos en orden`
  );

  // 6. Ningun subtitulo sobrevive al final de la narracion.
  const ultimo = cues[cues.length - 1];
  const excede = ultimo ? ultimo.fin - linea.finNarracion : 0;
  añadir(
    'subtitulos_dentro_de_narracion',
    excede <= 0.05,
    ultimo
      ? `ultimo subtitulo termina en ${ultimo.fin.toFixed(2)}s; narracion en ${linea.finNarracion.toFixed(2)}s`
      : 'no hay subtitulos'
  );

  // 7. La duracion del mp3 coincide con la calculada en timeline.json.
  const desvio = Math.abs(duracionAudio - linea.duracionTotal);
  añadir(
    'duracion_coincide',
    desvio <= toleranciaS,
    `audio.mp3 ${duracionAudio.toFixed(3)}s vs timeline ${linea.duracionTotal.toFixed(3)}s ` +
      `(desvio ${(desvio * 1000).toFixed(0)} ms, tolerancia ${(toleranciaS * 1000).toFixed(0)} ms)`
  );

  // 8. Drift acumulativo.
  //
  // Para cada bloque medimos el silencio de cola: cuanto queda de audio
  // despues de la ultima palabra alineada. Si la alineacion fuera derivando,
  // ese margen se iria haciendo negativo (la alineacion se sale del archivo) o
  // creceria bloque a bloque de forma sistematica. Un margen pequeño, positivo
  // y sin tendencia es lo que esperamos.
  // Cuando el audio se troceo en tramos, quien llama ya conoce la geometria y
  // pasa las colas resueltas; si no, se deducen de la alineacion del bloque.
  const colas = colasDadas ?? alineaciones.map((al, i) => {
    const fin = finAlineacion(al);
    return fin == null ? null : duracionesBloques[i] - fin;
  });
  const validas = colas.filter((v) => v != null);
  const negativas = validas.filter((v) => v < -0.05);
  const creciente =
    validas.length >= 3 && validas.every((v, i) => i === 0 || v >= validas[i - 1] - 1e-9);
  const rango = validas.length ? Math.max(...validas) - Math.min(...validas) : 0;
  const hayDrift = negativas.length > 0 || (creciente && rango > 0.5);
  añadir(
    'sin_drift_acumulativo',
    !hayDrift,
    validas.length
      ? `silencio de cola por bloque: ${validas.map((v) => v.toFixed(2)).join(' · ')} s` +
        (negativas.length ? ` — ${negativas.length} negativos` : '')
      : 'sin datos de alineacion'
  );

  return {
    pruebas,
    ok: pruebas.every((p) => p.ok),
    fallos: pruebas.filter((p) => !p.ok).length,
  };
}

function contarPalabras(al) {
  if (!al) return 0;
  if (al.palabras?.length) return al.palabras.length;
  return (al.caracteres || []).filter((c) => !/\s/.test(c)).length ? 1 : 0;
}

function finAlineacion(al) {
  if (al?.palabras?.length) return al.palabras[al.palabras.length - 1].fin;
  const f = al?.finales;
  return f?.length ? f[f.length - 1] : null;
}
