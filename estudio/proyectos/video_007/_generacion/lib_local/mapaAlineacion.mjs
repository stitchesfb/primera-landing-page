// ElevenLabs colapsa cada "\n\n" interno (separador entre parrafos de un
// mismo bloque) a un unico caracter (normalmente un espacio) dentro de
// `alignment`/`normalized_alignment`, y en algunos bloques antepone un
// caracter extra (espacio) al inicio del stream de alineacion. Un indice
// de caracter calculado directamente sobre el `texto` original (que si
// conserva el "\n\n" de dos caracteres) NO corresponde 1:1 al indice en
// `alignment.characters`. Esta funcion construye el mapeo real, caracter
// por caracter, y falla ruidosamente si aparece cualquier otro desajuste
// (en vez de adivinar), para no arriesgar un corte dentro de un fonema.

export function mapearIndicesTextoAAlineacion(textoOriginal, caracteresAlineacion) {
  const mapa = new Array(textoOriginal.length).fill(null);
  let oi = 0;
  let ai = 0;

  // Desplazamiento inicial: si la alineacion trae un caracter de mas al
  // principio que no esta en el texto original (visto en bloque 24).
  if (caracteresAlineacion[0] !== textoOriginal[0] && /\s/.test(caracteresAlineacion[0])) {
    ai = 1;
  }

  while (oi < textoOriginal.length) {
    if (ai >= caracteresAlineacion.length) {
      throw new Error(`Se agoto la alineacion en indice alineado ${ai} antes de cubrir el texto completo (indice original ${oi}).`);
    }
    if (textoOriginal[oi] === '\n' && textoOriginal[oi + 1] === '\n') {
      mapa[oi] = ai;
      mapa[oi + 1] = ai;
      oi += 2;
      ai += 1;
      continue;
    }
    if (textoOriginal[oi] === caracteresAlineacion[ai]) {
      mapa[oi] = ai;
      oi += 1;
      ai += 1;
      continue;
    }
    throw new Error(
      `Desajuste de alineacion en indice original ${oi} (caracter "${textoOriginal[oi]}") contra indice alineado ${ai} (caracter "${caracteresAlineacion[ai]}"). Contexto original: ${JSON.stringify(textoOriginal.slice(Math.max(0, oi - 15), oi + 15))}`
    );
  }
  return mapa;
}

/** Tiempo de fin del ultimo caracter de `fraseAntes` y de inicio del primero de `fraseDespues`, mapeados correctamente. */
export function puntoDeCorteSeguro(textoOriginal, alineacion, fraseAntes, fraseDespues) {
  const caracteres = alineacion.characters;
  const mapa = mapearIndicesTextoAAlineacion(textoOriginal, caracteres);

  const idxFinOriginal = textoOriginal.indexOf(fraseAntes) + fraseAntes.length - 1;
  const idxInicioOriginal = textoOriginal.indexOf(fraseDespues);
  if (idxFinOriginal < fraseAntes.length - 1) throw new Error(`No se encontro "${fraseAntes}" en el texto.`);
  if (idxInicioOriginal < 0) throw new Error(`No se encontro "${fraseDespues}" en el texto.`);

  const aiFin = mapa[idxFinOriginal];
  const aiInicio = mapa[idxInicioOriginal];
  const tFin = alineacion.character_end_times_seconds[aiFin];
  const tInicio = alineacion.character_start_times_seconds[aiInicio];

  return {
    idxFinOriginal, idxInicioOriginal, aiFin, aiInicio, tFin, tInicio,
    huecoSegundos: tInicio - tFin,
    puntoDeCorte: (tFin + tInicio) / 2,
  };
}
