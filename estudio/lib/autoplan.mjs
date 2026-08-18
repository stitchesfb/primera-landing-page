/**
 * Deduce los limites de bloque a partir de las duraciones de los audios.
 *
 * El problema: sabemos que hay cinco bloques de audio y una lista de parrafos,
 * pero no cual va con cual. La pista fiable es la duracion: si el bloque 2 dura
 * el 22% del audio total, contiene aproximadamente el 22% de los caracteres.
 *
 * Se corta en la frontera de parrafo mas cercana a cada objetivo acumulado. Es
 * robusto porque los bloques duran minutos y los parrafos segundos: para
 * equivocarse de parrafo, la estimacion tendria que fallar por medio parrafo.
 *
 * Y no se cree a si mismo: la alineacion forzada posterior comprueba el
 * reparto, y si un limite estuviera mal, los silencios de cola por bloque se
 * volverian negativos y 'sin_drift_acumulativo' lo cazaria.
 */

/** Citas biblicas, para colocar los interludios donde el manual los pide. */
const LIBROS =
  'Genesis|Exodo|Levitico|Numeros|Deuteronomio|Josue|Jueces|Rut|Samuel|Reyes|Cronicas|' +
  'Esdras|Nehemias|Ester|Job|Salmo|Salmos|Proverbios|Eclesiastes|Cantares|Isaias|' +
  'Jeremias|Lamentaciones|Ezequiel|Daniel|Oseas|Joel|Amos|Abdias|Jonas|Miqueas|Nahum|' +
  'Habacuc|Sofonias|Hageo|Zacarias|Malaquias|Mateo|Marcos|Lucas|Juan|Hechos|Romanos|' +
  'Corintios|Galatas|Efesios|Filipenses|Colosenses|Tesalonicenses|Timoteo|Tito|Filemon|' +
  'Hebreos|Santiago|Pedro|Judas|Apocalipsis';

const CITA = new RegExp(`\\b(${LIBROS})\\b`, 'i');

export function citaBiblica(texto) {
  return CITA.test(texto.normalize('NFD').replace(/[̀-ͯ]/g, ''));
}

/**
 * Reparte `parrafos` entre tantos bloques como duraciones se pasen.
 * Devuelve, por bloque, los indices de parrafo (base 0) y el diagnostico del
 * ajuste, para poder revisar el reparto antes de gastar nada.
 */
export function repartirPorDuracion(parrafos, duraciones) {
  const nBloques = duraciones.length;
  if (nBloques < 1) throw new Error('No hay duraciones de audio');
  if (parrafos.length < nBloques) {
    throw new Error(`${parrafos.length} parrafos para ${nBloques} bloques: no alcanza para uno por bloque`);
  }

  const chars = parrafos.map((p) => p.length);
  const totalChars = chars.reduce((s, n) => s + n, 0);
  const totalDur = duraciones.reduce((s, d) => s + d, 0);

  const acumChars = [];
  chars.reduce((s, n) => { acumChars.push(s + n); return s + n; }, 0);

  const cortes = [];
  let acumDur = 0;

  for (let k = 0; k < nBloques - 1; k++) {
    acumDur += duraciones[k];
    const objetivo = totalChars * (acumDur / totalDur);

    // El corte debe dejar sitio: al menos un parrafo por delante para este
    // bloque y uno por cada bloque que aun queda por repartir.
    const minimo = (cortes[k - 1] ?? 0) + 1;
    const maximo = parrafos.length - (nBloques - 1 - k);

    let mejor = minimo;
    let mejorError = Infinity;
    for (let i = minimo; i <= maximo; i++) {
      const error = Math.abs(acumChars[i - 1] - objetivo);
      if (error < mejorError) { mejorError = error; mejor = i; }
    }
    cortes.push(mejor);
  }

  const bloques = [];
  let desde = 0;
  for (const corte of [...cortes, parrafos.length]) {
    bloques.push(Array.from({ length: corte - desde }, (_, i) => desde + i));
    desde = corte;
  }

  const diagnostico = bloques.map((b, k) => {
    const charsBloque = b.reduce((s, i) => s + chars[i], 0);
    const esperado = totalChars * (duraciones[k] / totalDur);
    return {
      bloque: k + 1,
      parrafos: [b[0] + 1, b[b.length - 1] + 1],
      caracteres: charsBloque,
      esperado: Math.round(esperado),
      desvioPct: esperado ? ((charsBloque - esperado) / esperado) * 100 : 0,
      segundos: duraciones[k],
      caracteresPorMinuto: Math.round((charsBloque / duraciones[k]) * 60),
    };
  });

  return { bloques, cortes, diagnostico };
}

/**
 * Construye el edit_plan a partir del reparto.
 *
 * En audio ya generado, las pausas internas de cada bloque vienen grabadas: lo
 * unico que el pipeline puede insertar son los interludios ENTRE bloques y el
 * cierre. Los interludios tras versiculo se dejan anotados igualmente, porque
 * cuentan para la revision editorial y serviran si algun dia se regenera la
 * voz, pero en modo importar no alteran el audio.
 */
export function construirPlan({ id, pilar, parrafos, bloques, canal }) {
  const reglas = canal.reglas_edicion;
  const eventos = [];

  bloques.slice(0, -1).forEach((b, k) => {
    eventos.push({
      after: b[b.length - 1] + 1,
      type: 'block_end',
      seconds: 10,
      block: k + 1,
      note: `fin del bloque ${k + 1}`,
    });
  });

  const finales = new Set(eventos.map((e) => e.after));
  const formato = canal.formatos[pilar];
  const tope = (formato?.interludios_estrategicos_max ?? 9) - eventos.length;

  const versiculos = [];
  parrafos.forEach((texto, i) => {
    if (versiculos.length >= tope) return;
    if (finales.has(i + 1) || i + 1 === parrafos.length) return;
    if (citaBiblica(texto)) versiculos.push(i + 1);
  });

  for (const n of versiculos) {
    eventos.push({ after: n, type: 'interlude', seconds: 6, note: 'tras cita biblica' });
  }

  eventos.sort((a, b) => a.after - b.after);
  eventos.push({ at: 'end', type: 'outro', music_seconds: 25, fade_out: 8 });

  return {
    id,
    pilar,
    _generado: `plan-auto ${new Date().toISOString()} — limites deducidos de las duraciones de ${bloques.length} audios`,
    defaults: { pause_after_paragraph: (reglas.pausa_parrafo_min + reglas.pausa_parrafo_max) / 2 },
    events: eventos,
  };
}
