/**
 * Extractos verticales a partir del video largo, sin generar voz nueva.
 *
 * Un Short no es un recorte cualquiera: tiene que entrar y salir en un punto
 * donde la voz no este a media frase, durar lo que dura la atencion de quien
 * lo ve, y seguir cuadrando con los subtitulos. Las tres cosas salen de los
 * mismos datos que ya produjo la importacion —timeline.json para los limites
 * de cada parrafo, alignment.json para cada palabra—, asi que no hace falta
 * volver a medir nada ni gastar un credito.
 *
 * El modelo es una lista de tramos. Cada tramo dice de donde sale en el audio
 * original y cuanto dura en el Short. Los tramos de voz se copian tal cual;
 * los de silencio pueden acortarse, porque diez segundos de interludio que
 * funcionan en un video de media hora se hacen eternos en cuarenta segundos.
 * De esa lista salen a la vez el audio, los subtitulos y la duracion.
 */

const seg = (timeline, numero) => timeline.segmentos.find((s) => s.numero === numero);

/**
 * Silencio real entre el parrafo `numero` y el siguiente.
 *
 * Se mide entre la ultima palabra de uno y la primera del otro, no se lee del
 * plan de edicion. El plan dice lo que se pidio; la alineacion dice lo que hay,
 * que incluye ademas la respiracion que trajo la propia grabacion.
 */
function huecoEntre(timeline, numero) {
  const actual = seg(timeline, numero);
  const siguiente = seg(timeline, numero + 1);
  if (!actual || !siguiente) return null;
  const duracion = siguiente.inicio - actual.fin;
  return duracion > 0 ? { inicio: actual.fin, duracion } : null;
}

/**
 * Construye un Short a partir de un rango de parrafos.
 *
 * `entrada` y `salida` son cuanto respiro se toma del silencio de alrededor:
 * arrancar justo en la primera silaba suena a corte, y cortar justo en la
 * ultima suena a que se ha caido la senal. Nunca se toma mas de la mitad del
 * silencio disponible, para no invadir el parrafo vecino.
 */
export function planearShort({
  timeline,
  desde,
  hasta,
  entradaMax = 0.6,
  salidaMax = 0.9,
  interludioInterno = 2.5,
  recortarDesde = 5,
  ctaSegundos = 0,
}) {
  const primero = seg(timeline, desde);
  const ultimo = seg(timeline, hasta);
  if (!primero) throw new Error(`El timeline no tiene el parrafo ${desde}`);
  if (!ultimo) throw new Error(`El timeline no tiene el parrafo ${hasta}`);

  // Respiro de entrada: sale del silencio que precede al primer parrafo.
  const huecoAntes = huecoEntre(timeline, desde - 1);
  const disponibleAntes = huecoAntes ? huecoAntes.duracion : primero.inicio;
  if (disponibleAntes < 0) throw new Error(`El parrafo ${desde} empieza antes de que acabe el anterior`);
  const entrada = Math.max(0, Math.min(entradaMax, disponibleAntes / 2));

  // Respiro de salida: del silencio que sigue al ultimo parrafo.
  const huecoDespues = huecoEntre(timeline, hasta);
  const disponibleDespues = huecoDespues
    ? huecoDespues.duracion
    : Math.max(0, timeline.fin_narracion_s - ultimo.fin);
  const salida = Math.max(0, Math.min(salidaMax, disponibleDespues / 2));

  const tramos = [];
  let destino = 0;
  const empujar = (t) => { tramos.push({ ...t, destino }); destino += t.duracionDestino; };

  empujar({
    tipo: 'entrada', origen: primero.inicio - entrada,
    duracionOrigen: entrada, duracionDestino: entrada,
  });

  for (let n = desde; n <= hasta; n++) {
    const s = seg(timeline, n);
    if (!s) throw new Error(`El timeline no tiene el parrafo ${n}`);
    empujar({
      tipo: 'voz', parrafo: n, origen: s.inicio,
      duracionOrigen: s.duracion, duracionDestino: s.duracion, texto: s.texto,
    });

    if (n === hasta) break;
    const hueco = huecoEntre(timeline, n);
    if (!hueco) continue;
    // Un interludio largo es un respiro en media hora y un agujero en cuarenta
    // segundos: se acorta. Las pausas normales entre parrafos NO se tocan —
    // son el ritmo aprobado del canal, y recortarlas cambiaria como suena la
    // oracion, no solo cuanto dura.
    const esInterludio = hueco.duracion >= recortarDesde;
    const destinoHueco = esInterludio ? Math.min(hueco.duracion, interludioInterno) : hueco.duracion;
    empujar({
      tipo: 'silencio', trasParrafo: n, origen: hueco.inicio,
      duracionOrigen: hueco.duracion, duracionDestino: destinoHueco,
      recortadoDe: hueco.duracion, esInterludio,
    });
  }

  empujar({
    tipo: 'salida', origen: ultimo.fin,
    duracionOrigen: salida, duracionDestino: salida,
  });

  if (ctaSegundos > 0) {
    // El cierre no lleva voz: solo la cama musical y el rotulo. Sale del audio
    // original igualmente, para que la musica siga siendo la aprobada.
    empujar({
      tipo: 'cta', origen: ultimo.fin + salida,
      duracionOrigen: ctaSegundos, duracionDestino: ctaSegundos,
    });
  }

  const voz = tramos.filter((t) => t.tipo === 'voz');
  return {
    desde, hasta,
    inicioEnVideo: primero.inicio - entrada,
    finEnVideo: ultimo.fin + salida,
    entrada, salida,
    disponibleAntes, disponibleDespues,
    tramos,
    duracion: destino,
    segundosVoz: voz.reduce((s, t) => s + t.duracionDestino, 0),
    segundosSilencio: tramos.filter((t) => t.tipo === 'silencio')
      .reduce((s, t) => s + t.duracionDestino, 0),
    ctaSegundos,
    recortes: tramos.filter(
      (t) => t.tipo === 'silencio' && t.duracionDestino < t.duracionOrigen
    ),
    texto: voz.map((t) => ({ parrafo: t.parrafo, texto: t.texto })),
  };
}

/**
 * Construye un Short de VARIOS rangos de parrafos no contiguos, unidos por
 * pausas insertadas a proposito (no silencio real del video largo).
 *
 * Capacidad opcional: solo la usa quien la pide explicitamente pasando
 * `tramos` en vez de `desde`/`hasta`. `planearShort` (arriba) no se toca, asi
 * que un Short de un solo rango sigue construyendose exactamente igual que
 * antes.
 *
 * `tramos` es una lista en orden de: `{ parrafos: [desde, hasta] }` para cada
 * rango de voz, y `{ pausaMs }` para cada silencio insertado entre dos
 * rangos. Cada rango de parrafos usa la MISMA logica que planearShort para
 * sus interludios internos (los huecos reales del video largo se acortan
 * igual); entre rangos NO hay hueco real que medir —los parrafos intermedios
 * quedan fuera del Short—, asi que ahi se genera silencio autentico de
 * exactamente `pausaMs` milisegundos, con origen de duracion cero: no viene
 * de ningun punto del video largo, y por eso `trasladar` nunca hace que un
 * instante del video caiga dentro de esta pausa.
 */
export function planearShortMultiTramo({
  timeline, tramos, entradaMax = 0.6, salidaMax = 0.9,
  interludioInterno = 2.5, recortarDesde = 5, ctaSegundos = 0,
}) {
  const rangos = tramos.filter((t) => t.parrafos);
  if (rangos.length < 2) {
    throw new Error('planearShortMultiTramo necesita al menos dos rangos de parrafos; un solo rango es planearShort');
  }

  const [primerDesde] = rangos[0].parrafos;
  const [, ultimoHasta] = rangos[rangos.length - 1].parrafos;
  const primero = seg(timeline, primerDesde);
  const ultimo = seg(timeline, ultimoHasta);
  if (!primero) throw new Error(`El timeline no tiene el parrafo ${primerDesde}`);
  if (!ultimo) throw new Error(`El timeline no tiene el parrafo ${ultimoHasta}`);

  const huecoAntes = huecoEntre(timeline, primerDesde - 1);
  const disponibleAntes = huecoAntes ? huecoAntes.duracion : primero.inicio;
  if (disponibleAntes < 0) throw new Error(`El parrafo ${primerDesde} empieza antes de que acabe el anterior`);
  const entrada = Math.max(0, Math.min(entradaMax, disponibleAntes / 2));

  const huecoDespues = huecoEntre(timeline, ultimoHasta);
  const disponibleDespues = huecoDespues
    ? huecoDespues.duracion
    : Math.max(0, timeline.fin_narracion_s - ultimo.fin);
  const salida = Math.max(0, Math.min(salidaMax, disponibleDespues / 2));

  const salidaTramos = [];
  let destino = 0;
  let finReal = null; // ultimo punto real del video largo visto hasta ahora
  const empujar = (t) => { salidaTramos.push({ ...t, destino }); destino += t.duracionDestino; };

  empujar({
    tipo: 'entrada', origen: primero.inicio - entrada,
    duracionOrigen: entrada, duracionDestino: entrada,
  });

  for (const elemento of tramos) {
    if (elemento.pausaMs != null) {
      const duracionPausa = elemento.pausaMs / 1000;
      // duracionOrigen 0: el intervalo [origen, origen) queda vacio, asi que
      // ningun instante del video largo "cae dentro" de la pausa insertada.
      empujar({
        tipo: 'silencio', trasParrafo: null, origen: finReal,
        duracionOrigen: 0, duracionDestino: duracionPausa,
        insertado: true, esInterludio: false,
      });
      continue;
    }

    const [desde, hasta] = elemento.parrafos;
    for (let n = desde; n <= hasta; n++) {
      const s = seg(timeline, n);
      if (!s) throw new Error(`El timeline no tiene el parrafo ${n}`);
      empujar({
        tipo: 'voz', parrafo: n, origen: s.inicio,
        duracionOrigen: s.duracion, duracionDestino: s.duracion, texto: s.texto,
      });
      finReal = s.fin;

      if (n === hasta) break;
      const hueco = huecoEntre(timeline, n);
      if (!hueco) continue;
      const esInterludio = hueco.duracion >= recortarDesde;
      const destinoHueco = esInterludio ? Math.min(hueco.duracion, interludioInterno) : hueco.duracion;
      empujar({
        tipo: 'silencio', trasParrafo: n, origen: hueco.inicio,
        duracionOrigen: hueco.duracion, duracionDestino: destinoHueco,
        recortadoDe: hueco.duracion, esInterludio,
      });
      finReal = hueco.inicio + hueco.duracion;
    }
  }

  empujar({
    tipo: 'salida', origen: ultimo.fin,
    duracionOrigen: salida, duracionDestino: salida,
  });

  if (ctaSegundos > 0) {
    empujar({
      tipo: 'cta', origen: ultimo.fin + salida,
      duracionOrigen: ctaSegundos, duracionDestino: ctaSegundos,
    });
  }

  const voz = salidaTramos.filter((t) => t.tipo === 'voz');
  return {
    desde: primerDesde, hasta: ultimoHasta,
    inicioEnVideo: primero.inicio - entrada,
    finEnVideo: ultimo.fin + salida,
    entrada, salida,
    disponibleAntes, disponibleDespues,
    tramos: salidaTramos,
    duracion: destino,
    segundosVoz: voz.reduce((s, t) => s + t.duracionDestino, 0),
    segundosSilencio: salidaTramos.filter((t) => t.tipo === 'silencio')
      .reduce((s, t) => s + t.duracionDestino, 0),
    ctaSegundos,
    recortes: salidaTramos.filter(
      (t) => t.tipo === 'silencio' && !t.insertado && t.duracionDestino < t.duracionOrigen
    ),
    texto: voz.map((t) => ({ parrafo: t.parrafo, texto: t.texto })),
  };
}

/**
 * Reubica un instante del video largo en el tiempo del Short.
 *
 * Devuelve null si cae en un trozo que no viaja al Short. Es lo que mantiene
 * los subtitulos cuadrados despues de acortar un interludio: las palabras
 * posteriores se desplazan justo lo que se quito.
 */
export function trasladar(plan, t) {
  for (const [i, tr] of plan.tramos.entries()) {
    const fin = tr.origen + tr.duracionOrigen;
    // El instante justo en la frontera pertenece al tramo que EMPIEZA. Sin
    // esto, el inicio de un parrafo caeria dentro del silencio anterior y, si
    // ese silencio se acorto, se perderia: la primera palabra se quedaria sin
    // subtitulo.
    const ultimo = i === plan.tramos.length - 1;
    const dentro = t >= tr.origen && (ultimo ? t <= fin : t < fin);
    if (!dentro) continue;
    if (tr.duracionDestino === 0) return null;
    const desplazamiento = t - tr.origen;
    if (desplazamiento > tr.duracionDestino) return null;
    return tr.destino + desplazamiento;
  }
  return null;
}

/**
 * Palabras del alignment que caen dentro del Short, ya en tiempo del Short.
 *
 * Solo cuentan las que caen en un tramo de VOZ. El respiro de entrada, la cola
 * y sobre todo el cierre salen de instantes del video largo donde sigue
 * hablando la voz, pero en el Short esos trozos van sin ella: el cierre es
 * musica y rotulo. Traducir sus palabras metia en el Short subtitulos de
 * parrafos que no forman parte del extracto.
 */
export function palabrasDelShort(plan, palabras) {
  const salida = [];
  for (const tramo of plan.tramos) {
    if (tramo.tipo !== 'voz') continue;
    const fin = tramo.origen + tramo.duracionOrigen;
    for (const p of palabras) {
      if (p.inicio < tramo.origen || p.fin > fin) continue;
      salida.push({
        texto: p.texto,
        parrafo: tramo.parrafo,
        inicio: tramo.destino + (p.inicio - tramo.origen),
        fin: tramo.destino + (p.fin - tramo.origen),
      });
    }
  }
  return salida.sort((a, b) => a.inicio - b.inicio);
}
