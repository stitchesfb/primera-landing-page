/**
 * edit_plan.json: validacion y construccion de la linea de tiempo.
 *
 * El plan referencia parrafos por su numero (1 = primer parrafo de
 * narration.txt). No lleva texto narrable: si algo se puede leer en voz alta,
 * va en narration.txt; si es una instruccion de edicion, va aqui.
 *
 * Eventos soportados:
 *   { "after": 4,  "type": "interlude", "seconds": 10, "note": "fin bloque 1" }
 *   { "after": 7,  "type": "pause",     "seconds": 3 }
 *   { "after": 12, "type": "image",     "src": "escena_02.png", "crossfade": 2 }
 *   { "after": 15, "type": "block_end", "seconds": 10, "block": 2 }
 *   { "at": "end", "type": "outro",     "music_seconds": 25, "fade_out": 8 }
 *
 * block_end admite ademas "seconds": 0: marca la frontera estructural entre
 * dos bloques de audio (asi reparte los parrafos repartirParrafosEnBloques)
 * sin insertar ningun silencio ahi. Es la unica forma de decir "aqui hay un
 * corte de archivo, pero ninguna pausa editorial": no genera anullsrc, no
 * anade hueco a la linea de tiempo. pause e interlude siguen exigiendo una
 * duracion mayor que cero — una pausa de 0s no tiene sentido editorial.
 *
 * Un evento con hueco (pause/interlude/block_end) puede llevar ademas
 * "cut_offset_ms": -500 para desplazar el corte interno dentro del bloque,
 * en milisegundos, relativo al punto de corte calculado por defecto (el
 * punto medio del silencio natural — ver puntosDeCorte() en troceo.mjs).
 * Negativo lo adelanta, positivo lo atrasa; se recorta a los limites del
 * audio del bloque. Sirve para cuando la alineacion automatica no localiza
 * bien el final acustico real de la ultima palabra (p.ej. su timestamp
 * queda inflado por estar pegado a una pausa larga) y hay que reubicar el
 * corte a mano dentro del silencio verdadero, en vez de confiar en el punto
 * que calcula la alineacion. Un evento con cut_offset_ms distinto de cero
 * ademas lleva 30ms de fundido tecnico a cada lado del corte por defecto,
 * para no dejar un clic de discontinuidad de muestra — ver montarTramos()
 * en audio.mjs. "fade_out_ms" / "fade_in_ms" declarados a mano en el evento
 * fijan esa duracion (o la activan sin cut_offset_ms — p.ej. en la frontera
 * entre dos archivos de audio distintos, donde no hay corte interior que
 * reubicar pero igual conviene suavizar la union).
 */

const TIPOS_CON_HUECO = new Set(['pause', 'interlude', 'block_end']);

export function validarPlan(proyecto, canal) {
  const problemas = [];
  const avisos = [];
  const notas = [];
  const plan = proyecto.plan;

  if (!plan) {
    problemas.push('Falta edit_plan.json');
    return { problemas, avisos, notas, plan: null };
  }

  const nParrafos = proyecto.parrafos.length;

  // Cuando el plan lleva limites escritos a mano, esos numeros solo significan
  // algo si el texto trocea igual que cuando se escribieron. Basta una linea en
  // blanco de mas o de menos para desplazar todas las fronteras de bloque sin
  // que nada mas lo delate, asi que se comprueba antes de tocar la API.
  if (plan.parrafos_esperados != null && plan.parrafos_esperados !== nParrafos) {
    problemas.push(
      `narration.txt trocea en ${nParrafos} parrafos, pero el plan se escribio para ` +
        `${plan.parrafos_esperados}. Los limites de bloque apuntarian a otro sitio.\n` +
        '    Los parrafos se separan por UNA linea en blanco; revisa si el archivo ' +
        'usa otra convencion o trae lineas en blanco de mas.'
    );
  }

  const formato = canal.formatos[plan.pilar];
  if (!formato) {
    problemas.push(
      `pilar "${plan.pilar}" desconocido. Opciones: ${Object.keys(canal.formatos).join(', ')}`
    );
  }

  const reglas = canal.reglas_edicion;
  const pausaDefecto = plan.defaults?.pause_after_paragraph;
  if (pausaDefecto == null) {
    problemas.push('Falta defaults.pause_after_paragraph');
  } else if (pausaDefecto < reglas.pausa_parrafo_min || pausaDefecto > reglas.pausa_parrafo_max) {
    avisos.push(
      `La pausa por defecto (${pausaDefecto}s) queda fuera de la norma del canal ` +
        `(${reglas.pausa_parrafo_min}-${reglas.pausa_parrafo_max}s)`
    );
  }

  const eventos = plan.events ?? [];
  const vistos = new Map();
  let outro = null;

  for (const [i, ev] of eventos.entries()) {
    const donde = `events[${i}]`;

    if (ev.at === 'end') {
      if (ev.type !== 'outro') problemas.push(`${donde}: at:"end" solo admite type:"outro"`);
      if (outro) problemas.push(`${donde}: hay mas de un outro`);
      outro = ev;
      const m = ev.music_seconds;
      if (m == null) problemas.push(`${donde}: outro sin music_seconds`);
      else if (m < reglas.cierre_musica_min || m > reglas.cierre_musica_max) {
        avisos.push(
          `Cierre musical de ${m}s fuera de la norma ` +
            `(${reglas.cierre_musica_min}-${reglas.cierre_musica_max}s)`
        );
      }
      if (ev.fade_out != null && ev.fade_out > (m ?? 0)) {
        problemas.push(`${donde}: fade_out (${ev.fade_out}s) mas largo que el cierre (${m}s)`);
      }
      continue;
    }

    if (!Number.isInteger(ev.after)) {
      problemas.push(`${donde}: falta "after" (numero de parrafo) o no es entero`);
      continue;
    }
    if (ev.after < 1 || ev.after > nParrafos) {
      problemas.push(
        `${donde}: apunta al parrafo ${ev.after}, pero narration.txt tiene ${nParrafos}`
      );
      continue;
    }

    if (TIPOS_CON_HUECO.has(ev.type)) {
      // Solo block_end puede declarar seconds:0 — marca la frontera sin
      // insertar silencio. pause/interlude siguen exigiendo una duracion real.
      const ceroPermitido = ev.type === 'block_end' && ev.seconds === 0;
      if (!(ev.seconds > 0) && !ceroPermitido) {
        problemas.push(
          `${donde}: ${ev.type} necesita "seconds" mayor que cero` +
            (ev.type === 'block_end' ? ' (o exactamente 0, para no insertar pausa)' : '')
        );
      }
      if (ev.cut_offset_ms != null && !Number.isFinite(ev.cut_offset_ms)) {
        problemas.push(`${donde}: cut_offset_ms tiene que ser un numero`);
      }
      for (const campo of ['fade_out_ms', 'fade_in_ms']) {
        if (ev[campo] != null && !(Number.isFinite(ev[campo]) && ev[campo] >= 0)) {
          problemas.push(`${donde}: ${campo} tiene que ser un numero mayor o igual que cero`);
        }
      }
      const clave = `hueco:${ev.after}`;
      if (vistos.has(clave)) {
        problemas.push(
          `${donde}: ya hay otro evento de tiempo tras el parrafo ${ev.after} (${vistos.get(clave)})`
        );
      }
      vistos.set(clave, ev.type);

      if (ev.type === 'block_end' || (ev.type === 'interlude' && ev.seconds >= reglas.interludio_bloque_min)) {
        if (ev.seconds < reglas.interludio_bloque_min || ev.seconds > reglas.interludio_bloque_max) {
          avisos.push(
            `Interludio de bloque tras el parrafo ${ev.after}: ${ev.seconds}s, fuera de ` +
              `${reglas.interludio_bloque_min}-${reglas.interludio_bloque_max}s`
          );
        }
      }
    } else if (ev.type === 'image') {
      if (!ev.src) problemas.push(`${donde}: image sin "src"`);
    } else {
      problemas.push(`${donde}: tipo desconocido "${ev.type}"`);
    }
  }

  if (!outro) problemas.push('Falta el evento de cierre { "at": "end", "type": "outro", ... }');

  // Interludios estrategicos = huecos largos, los que el espectador percibe
  // como respiro. Las pausas cortas entre parrafos no cuentan.
  const estrategicos = eventos.filter(
    (e) => TIPOS_CON_HUECO.has(e.type) && e.seconds >= reglas.interludio_versiculo_min
  );
  if (formato) {
    const { interludios_estrategicos_min: min, interludios_estrategicos_max: max } = formato;
    if (estrategicos.length < min || estrategicos.length > max) {
      // Salirse de la horquilla puede ser un descuido o una decision tomada a
      // conciencia. Se distingue por si el plan la declara: una excepcion
      // documentada deja de ser un aviso, pero sigue quedando escrita para que
      // no se convierta en la norma por inercia.
      const motivo = plan.excepciones?.interludios_estrategicos;
      const cuantos = `${estrategicos.length} interludios estrategicos; el formato "${plan.pilar}" pide entre ${min} y ${max}`;
      if (motivo) notas.push(`${cuantos} — excepcion declarada: ${motivo}`);
      else avisos.push(cuantos);
    }
  }

  const bloques = eventos.filter((e) => e.type === 'block_end').length;
  if (formato && bloques && bloques !== formato.bloques_esperados - 1 && bloques !== formato.bloques_esperados) {
    avisos.push(
      `${bloques} cierres de bloque marcados; el formato "${plan.pilar}" espera ${formato.bloques_esperados} bloques`
    );
  }

  return { problemas, avisos, notas, plan, estrategicos: estrategicos.length, outro };
}

/**
 * Construye la linea de tiempo.
 *
 * `duraciones` son los segundos de audio de cada parrafo. Antes de generar se
 * pasan estimados; despues de generar, los reales medidos del WAV. La misma
 * funcion sirve para las dos cosas, asi que la estimacion y el montaje final
 * no pueden divergir.
 */
export function construirLinea(proyecto, canal, duraciones) {
  const plan = proyecto.plan;
  const pausaDefecto = plan.defaults?.pause_after_paragraph ?? 0;
  const eventos = plan.events ?? [];

  const huecoTras = new Map();
  const imagenTras = new Map();
  let outro = { music_seconds: 0, fade_out: 0 };

  for (const ev of eventos) {
    if (ev.at === 'end' && ev.type === 'outro') {
      outro = { music_seconds: ev.music_seconds ?? 0, fade_out: ev.fade_out ?? 0 };
    } else if (TIPOS_CON_HUECO.has(ev.type)) {
      // Un evento con cut_offset_ms lleva 30ms de fundido a cada lado por
      // defecto (para no dejar clic en el corte reubicado). fade_out_ms /
      // fade_in_ms declarados a mano tienen prioridad y sirven tambien sin
      // cut_offset_ms — p.ej. una frontera entre dos archivos de audio
      // distintos, donde no hay corte interior que reubicar pero igual
      // conviene suavizar la union.
      huecoTras.set(ev.after, {
        segundos: ev.seconds,
        tipo: ev.type,
        nota: ev.note ?? null,
        fadeOutMs: ev.fade_out_ms ?? (ev.cut_offset_ms ? 30 : 0),
        fadeInMs: ev.fade_in_ms ?? (ev.cut_offset_ms ? 30 : 0),
      });
    } else if (ev.type === 'image') {
      imagenTras.set(ev.after, ev);
    }
  }

  const segmentos = [];
  const huecos = [];
  const imagenes = [];
  let t = 0;

  proyecto.parrafos.forEach((texto, i) => {
    const numero = i + 1;
    const dur = duraciones[i] ?? 0;
    segmentos.push({ numero, texto, inicio: t, fin: t + dur, duracion: dur });
    t += dur;

    if (imagenTras.has(numero)) {
      const ev = imagenTras.get(numero);
      imagenes.push({ en: t, src: ev.src, crossfade: ev.crossfade ?? 1.5 });
    }

    const ultimo = numero === proyecto.parrafos.length;
    if (ultimo) return;

    const explicito = huecoTras.get(numero);
    const segundos = explicito ? explicito.segundos : pausaDefecto;
    if (segundos > 0) {
      huecos.push({
        trasParrafo: numero,
        inicio: t,
        duracion: segundos,
        tipo: explicito?.tipo ?? 'pause',
        estrategico: segundos >= canal.reglas_edicion.interludio_versiculo_min,
        nota: explicito?.nota ?? null,
        fadeOutMs: explicito?.fadeOutMs ?? 0,
        fadeInMs: explicito?.fadeInMs ?? 0,
      });
      t += segundos;
    }
  });

  const finNarracion = t;
  t += outro.music_seconds;

  return {
    segmentos,
    huecos,
    imagenes,
    outro,
    finNarracion,
    duracionTotal: t,
    segundosNarracion: duraciones.reduce((s, d) => s + (d ?? 0), 0),
    segundosSilencio: huecos.reduce((s, h) => s + h.duracion, 0) + outro.music_seconds,
  };
}
