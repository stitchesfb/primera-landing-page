/**
 * Revision doctrinal asistida.
 *
 * Esto NO aprueba nada. Produce un informe con frases marcadas, la regla del
 * manual que tocan y una reescritura sugerida. Detecta patrones conocidos;
 * no entiende teologia. Un guion sin marcas puede seguir siendo problematico,
 * y una marca puede ser un falso positivo. La firma humana es la que vale.
 *
 * Reglas derivadas del "Manual del canal", secciones 2 y 11.
 */

const a = '[aá]', e = '[eé]', i = '[ií]', o = '[oó]', u = '[uú]';

export const REGLAS = [
  {
    id: 'prosperidad',
    severidad: 'alto',
    manual: '2 - Rechazo de la teologia de prosperidad',
    patron: new RegExp(
      `(?:${o}frenda|siembra|semilla|diezmo|d${a}(?:r|diva))[^.]{0,60}(?:multiplicar|cien\\s*veces|recibir${a}s?\\s+(?:el\\s+)?(?:doble|mil)|te\\s+har${a}\\s+(?:rico|prosperar))`,
      'i'
    ),
    sugerencia: 'Reformula hacia generosidad y administracion, sin vincular dar con retorno economico garantizado.',
  },
  {
    id: 'riqueza_garantizada',
    severidad: 'alto',
    manual: '2 - No promesas que la Biblia no hace',
    patron: new RegExp(
      `(?:Dios|${e}l|Se${'\\u00f1'}or)\\s+(?:te\\s+)?(?:har${a}|volver${a}|convertir${a})\\s+(?:rico|millonari|pr${o}sper)`,
      'i'
    ),
    sugerencia: 'La Biblia no garantiza riqueza material. Habla de provision, trabajo y contentamiento.',
  },
  {
    id: 'sanidad_garantizada',
    severidad: 'alto',
    manual: '2 - Especial cuidado con salud',
    patron: new RegExp(
      `(?:te\\s+)?(?:sanar${a}|curar${a}|sanas)\\s*(?:hoy|ahora|esta\\s+noche|siempre|sin\\s+falta)|` +
        `(?:nunca|jam${a}s)\\s+(?:volver${a}s?\\s+a\\s+)?(?:enfermar|estar${a}s?\\s+enferm)`,
      'i'
    ),
    sugerencia: 'Pide sanidad y confia en el cuidado de Dios, sin afirmar el resultado ni su plazo.',
  },
  {
    id: 'proteccion_absoluta',
    severidad: 'alto',
    manual: '2 - Especial cuidado con proteccion fisica',
    patron: new RegExp(
      `(?:nunca|jam${a}s|nada)\\s+(?:malo\\s+)?(?:te\\s+)?(?:pasar${a}|ocurrir${a}|suceder${a}|podr${a}\\s+da${'\\u00f1'}arte)|` +
        `(?:est${a}s|estar${a}s)\\s+(?:totalmente|completamente)\\s+(?:a\\s+salvo|protegid)`,
      'i'
    ),
    sugerencia: 'Job, Jose y Pablo muestran que fidelidad y dificultad coexisten. Afirma la presencia de Dios, no la ausencia de problemas.',
  },
  {
    id: 'universo',
    severidad: 'alto',
    manual: '2 - Dios es la fuente, no el universo',
    patron: new RegExp(
      `\\bel\\s+universo\\b|\\bley\\s+de\\s+(?:la\\s+)?atracci${o}n\\b|\\bvibraci${o}n(?:es)?\\s+(?:alta|positiva)|\\benerg${i}a\\s+(?:c${o}smica|del\\s+universo)`,
      'i'
    ),
    sugerencia: 'Sustituye por Dios, su caracter o su Palabra como fuente.',
  },
  {
    id: 'manifestacion',
    severidad: 'alto',
    manual: '2 - Declaraciones biblicas, no magia verbal',
    patron: new RegExp(
      `\\bmanifest(?:ar|a|as|arlo|aci${o}n)\\b[^.]{0,40}\\b(?:realidad|deseo|abundancia)|` +
        `\\batra${e}?r?\\s+(?:la\\s+)?(?:abundancia|prosperidad|riqueza)\\b`,
      'i'
    ),
    sugerencia: 'Las declaraciones recuerdan verdades biblicas; no crean realidad por si mismas.',
  },
  {
    id: 'magia_verbal',
    severidad: 'alto',
    manual: '2 - Declaraciones biblicas, no magia verbal',
    patron: new RegExp(
      `(?:repite|declara|d${i}(?:lo)?)\\s*(?:esto|esta\\s+frase|estas\\s+palabras)?[^.]{0,40}` +
        `(?:y\\s+(?:se\\s+)?(?:cumplir${a}|ocurrir${a}|suceder${a}|pasar${a})|` +
        `(?:tres|siete|3|7)\\s+veces\\s+y)`,
      'i'
    ),
    sugerencia: 'Repetir una frase no obliga a Dios. Presenta la declaracion como recordatorio, no como formula.',
  },
  {
    id: 'garantia_generica',
    severidad: 'medio',
    manual: '11 - Hay alguna promesa que el texto biblico no garantiza',
    patron: new RegExp(`\\bgarantiz${a}?(?:do|da|r|)\\b|\\bte\\s+aseguro\\s+que\\s+Dios\\b`, 'i'),
    sugerencia: 'Revisa si el pasaje citado sostiene esa garantia. Si no, suavizalo a confianza y esperanza.',
  },
  {
    id: 'denominacional',
    severidad: 'medio',
    manual: '2 - Evitar controversia denominacional / posicionamiento no denominacional',
    patron: new RegExp(
      `\\badventist${a}?s?\\b|\\biglesia\\s+(?:cat${o}lica|evang${e}lica|pentecostal|bautista)\\b|\\bnuestra\\s+denominaci${o}n\\b`,
      'i'
    ),
    sugerencia: 'El canal es biblico y no denominacional en publico. Quita la identificacion explicita.',
  },
];

/** Marca 1 vez por parrafo y regla: repetir el mismo aviso no aporta. */
export function revisar(parrafos) {
  const hallazgos = [];

  parrafos.forEach((texto, idx) => {
    for (const regla of REGLAS) {
      const m = texto.match(regla.patron);
      if (!m) continue;
      hallazgos.push({
        parrafo: idx + 1,
        regla: regla.id,
        severidad: regla.severidad,
        manual: regla.manual,
        frase: recorte(texto, m.index, m[0].length),
        sugerencia: regla.sugerencia,
      });
    }
  });

  const orden = { alto: 0, medio: 1, bajo: 2 };
  hallazgos.sort((x, y) => orden[x.severidad] - orden[y.severidad] || x.parrafo - y.parrafo);

  return {
    hallazgos,
    altos: hallazgos.filter((h) => h.severidad === 'alto').length,
    medios: hallazgos.filter((h) => h.severidad === 'medio').length,
  };
}

function recorte(texto, indice, largo, margen = 45) {
  const desde = Math.max(0, indice - margen);
  const hasta = Math.min(texto.length, indice + largo + margen);
  return (desde > 0 ? '…' : '') + texto.slice(desde, hasta).trim() + (hasta < texto.length ? '…' : '');
}

/** Checklist del manual (seccion 11) que solo puede responder una persona. */
export const CHECKLIST = [
  'El mensaje esta respaldado por la Biblia',
  'No hay ninguna promesa que el texto biblico no garantice',
  'Es compatible con la linea doctrinal, sin identificar al canal con una denominacion',
  'El comienzo explica rapido por que vale la pena escuchar',
  'Las pausas ayudan y la lectura suena natural en voz alta',
  'Se pueden extraer 2-3 Shorts sin descontextualizar la Escritura',
];
