/**
 * Corta un bloque de audio ya grabado en fronteras de parrafo.
 *
 * Para insertar un interludio dentro de un bloque hace falta saber en que
 * segundo exacto termina un parrafo y empieza el siguiente. La alineacion lo
 * dice palabra por palabra, asi que el corte no se estima: se lee.
 *
 * El corte va al PUNTO MEDIO del silencio que ya existe entre los dos
 * parrafos, no al final de la ultima palabra. Asi la respiracion que grabo la
 * voz se reparte a ambos lados del interludio, en vez de quedar amputada a un
 * lado y sonar como un corte seco.
 */

/** Tiempos de inicio y fin de cada parrafo del bloque, relativos a su audio. */
export function tiemposPorParrafo(palabras, textosParrafo) {
  const cuentas = textosParrafo.map((t) => t.split(/\s+/).filter(Boolean).length);
  const total = cuentas.reduce((s, n) => s + n, 0);

  if (total !== palabras.length) {
    throw new Error(
      `La alineacion trae ${palabras.length} palabras y el texto del bloque tiene ${total}. ` +
        'No se puede localizar la frontera entre parrafos.'
    );
  }

  const tiempos = [];
  let i = 0;
  for (const n of cuentas) {
    tiempos.push({ inicio: palabras[i].inicio, fin: palabras[i + n - 1].fin, palabras: n });
    i += n;
  }
  return tiempos;
}

/**
 * Convierte "quiero un hueco tras el parrafo N" en un instante del audio.
 *
 * `indices` son posiciones dentro del bloque (0 = su primer parrafo). Cada
 * elemento puede ser un numero simple (sin desplazamiento) o
 * { indice, offsetMs }. Se descarta un corte tras el ultimo parrafo: ahi no
 * hay silencio interior que partir, ese hueco es el que va entre bloques.
 *
 * El corte base va siempre al punto medio del silencio natural que ya trae la
 * grabacion (o al final de la ultima palabra, si ese silencio es <= 0.06s:
 * partir por el medio ahi partiria una palabra). `offsetMs` desplaza ese
 * punto base — en milisegundos, puede ser negativo — para cuando la
 * alineacion automatica no localiza bien el final acustico real (p.ej. cerca
 * de una pausa larga, donde el ultimo timestamp de palabra puede quedar
 * inflado). El resultado siempre se recorta a los limites del audio del
 * bloque, nunca puede caer antes de 0 ni despues de su duracion.
 */
export function puntosDeCorte(tiempos, indices, duracionBloque) {
  const cortes = [];

  for (const item of indices) {
    const idx = typeof item === 'number' ? item : item.indice;
    const offsetMs = (typeof item === 'number' ? 0 : item.offsetMs) ?? 0;
    if (idx < 0 || idx >= tiempos.length - 1) continue;

    const finActual = tiempos[idx].fin;
    const inicioSiguiente = tiempos[idx + 1].inicio;
    const silencio = inicioSiguiente - finActual;

    const base = silencio > 0.06 ? finActual + silencio / 2 : finActual;
    const en = base + offsetMs / 1000;

    cortes.push({
      trasIndice: idx,
      en: Math.min(Math.max(en, 0), duracionBloque),
      silencioNatural: Math.max(0, silencio),
      offsetMs,
    });
  }

  return cortes.sort((a, b) => a.en - b.en);
}

/**
 * Parte un bloque en tramos por sus puntos de corte.
 * Cada tramo lleva los parrafos que contiene y su ventana dentro del audio.
 */
export function tramosDelBloque({ bloque, archivo, parrafos, tiempos, cortes, duracion }) {
  const tramos = [];
  let desde = 0;
  let primerParrafo = 0;

  for (const corte of cortes) {
    tramos.push({
      bloque,
      archivo,
      desde,
      hasta: corte.en,
      parrafos: parrafos.slice(primerParrafo, corte.trasIndice + 1),
      trasParrafoGlobal: parrafos[corte.trasIndice],
      silencioNatural: corte.silencioNatural,
    });
    desde = corte.en;
    primerParrafo = corte.trasIndice + 1;
  }

  tramos.push({
    bloque,
    archivo,
    desde,
    hasta: duracion,
    parrafos: parrafos.slice(primerParrafo),
    trasParrafoGlobal: parrafos[parrafos.length - 1],
    silencioNatural: null,
  });

  return tramos.filter((t) => t.parrafos.length > 0 && t.hasta - t.desde > 0.01);
}

/** Palabras que caen dentro de un tramo, ya en tiempo absoluto del video. */
export function palabrasDelTramo(palabras, tramo, inicioAbsoluto) {
  return palabras
    .filter((p) => p.inicio >= tramo.desde - 1e-6 && p.inicio < tramo.hasta - 1e-6)
    .map((p) => ({
      texto: p.texto,
      inicio: p.inicio - tramo.desde + inicioAbsoluto,
      fin: Math.min(p.fin, tramo.hasta) - tramo.desde + inicioAbsoluto,
    }));
}
