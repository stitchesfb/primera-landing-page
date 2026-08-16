/**
 * Estimacion de creditos y duracion antes de gastar nada.
 *
 * Todo lo que aqui es "estimado" queda marcado como tal. Las dos constantes
 * que mandan (creditos por caracter y caracteres por minuto) salen de
 * calibracion.json cuando ya se han medido, y de canal.json solo mientras no
 * exista medida. El comando 'sonda' existe para que dejen de ser supuestos.
 */

export function contarCaracteres(parrafos) {
  return parrafos.map((p) => p.length);
}

export function estimar({ parrafos, canal, constantes, linea }) {
  const porParrafo = contarCaracteres(parrafos);
  const caracteres = porParrafo.reduce((s, n) => s + n, 0);

  const creditos = Math.round(caracteres * constantes.creditosPorCaracter);
  const minutosNarracion = caracteres / constantes.caracteresPorMinuto;

  // Cuantas peticiones haran falta: la API pide <=2000 caracteres por llamada
  // para que los timestamps salgan fiables, asi que los parrafos largos se
  // parten. Ningun parrafo deberia llegar a ese tope, pero lo comprobamos.
  const tope = canal.api.max_caracteres_por_peticion;
  const parrafosLargos = porParrafo
    .map((n, i) => ({ numero: i + 1, caracteres: n }))
    .filter((p) => p.caracteres > tope);

  return {
    caracteres,
    porParrafo,
    creditos,
    minutosNarracion,
    peticiones: parrafos.length,
    parrafosLargos,
    segundosSilencio: linea?.segundosSilencio ?? 0,
    minutosTotales: linea ? linea.duracionTotal / 60 : minutosNarracion,
  };
}

/** Compara lo estimado con lo que la API descontó de verdad. */
export function comparar(estimado, real) {
  const desvio = estimado === 0 ? 0 : ((real - estimado) / estimado) * 100;
  return {
    estimado,
    real,
    diferencia: real - estimado,
    desvioPct: desvio,
    // Un 10% de margen absorbe el redondeo y la normalizacion de texto que
    // hace el modelo (numeros y abreviaturas se expanden antes de narrar).
    aceptable: Math.abs(desvio) <= 10,
  };
}

export function mmss(segundos) {
  const s = Math.max(0, Math.round(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
    : `${m}:${String(r).padStart(2, '0')}`;
}

export function miles(n) {
  return Math.round(n).toLocaleString('es-ES');
}
