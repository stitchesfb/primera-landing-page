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
 */

const TIPOS_CON_HUECO = new Set(['pause', 'interlude', 'block_end']);

export function validarPlan(proyecto, canal) {
  const problemas = [];
  const avisos = [];
  const plan = proyecto.plan;

  if (!plan) {
    problemas.push('Falta edit_plan.json');
    return { problemas, avisos, plan: null };
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
      if (!(ev.seconds > 0)) {
        problemas.push(`${donde}: ${ev.type} necesita "seconds" mayor que cero`);
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
      avisos.push(
        `${estrategicos.length} interludios estrategicos; el formato "${plan.pilar}" pide entre ${min} y ${max}`
      );
    }
  }

  const bloques = eventos.filter((e) => e.type === 'block_end').length;
  if (formato && bloques && bloques !== formato.bloques_esperados - 1 && bloques !== formato.bloques_esperados) {
    avisos.push(
      `${bloques} cierres de bloque marcados; el formato "${plan.pilar}" espera ${formato.bloques_esperados} bloques`
    );
  }

  return { problemas, avisos, plan, estrategicos: estrategicos.length, outro };
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
      huecoTras.set(ev.after, { segundos: ev.seconds, tipo: ev.type, nota: ev.note ?? null });
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
