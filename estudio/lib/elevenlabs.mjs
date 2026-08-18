/**
 * Cliente de ElevenLabs.
 *
 * Solo tres cosas nos interesan aqui:
 *   1. Consultar el consumo real de la cuenta (para medir, no suponer).
 *   2. Generar voz CON timestamps por caracter.
 *   3. Alinear audio ya existente contra su texto (forced alignment), para
 *      los cinco bloques que ya se produjeron antes de existir este pipeline.
 */

const ESPERA_BASE_MS = 1000;

class ErrorAPI extends Error {
  constructor(mensaje, estado, cuerpo) {
    super(mensaje);
    this.estado = estado;
    this.cuerpo = cuerpo;
  }
}

export class ElevenLabs {
  // Campo privado de clase: no es enumerable ni accesible desde fuera, asi que
  // no puede acabar en un console.dir, un JSON.stringify ni un volcado de error.
  #apiKey;

  constructor({ apiKey, base = 'https://api.elevenlabs.io', reintentos = 3 }) {
    if (!apiKey) throw new Error('Falta ELEVENLABS_API_KEY. Copia .env.example a .env y rellenalo.');
    this.#apiKey = apiKey;
    this.base = base.replace(/\/$/, '');
    this.reintentos = reintentos;
  }

  async #peticion(ruta, opciones = {}, { crudo = false } = {}) {
    const url = `${this.base}${ruta}`;
    let ultimoError;

    for (let intento = 0; intento <= this.reintentos; intento++) {
      if (intento > 0) {
        // Backoff exponencial: 1s, 2s, 4s.
        await new Promise((r) => setTimeout(r, ESPERA_BASE_MS * 2 ** (intento - 1)));
      }
      try {
        const res = await fetch(url, {
          ...opciones,
          headers: { 'xi-api-key': this.#apiKey, ...(opciones.headers || {}) },
        });

        if (!res.ok) {
          const cuerpo = await res.text().catch(() => '');
          const err = new ErrorAPI(`${res.status} ${res.statusText} en ${ruta}${pista(res.status, ruta)}`, res.status, cuerpo);
          // 4xx que no sea 429 es culpa nuestra: reintentar no lo arregla.
          if (res.status !== 429 && res.status >= 400 && res.status < 500) throw err;
          ultimoError = err;
          continue;
        }
        return crudo ? res : await res.json();
      } catch (e) {
        if (e instanceof ErrorAPI && e.estado !== 429 && e.estado < 500) throw e;
        ultimoError = e;
      }
    }
    throw ultimoError;
  }

  /**
   * Consumo y limite de la suscripcion.
   *
   * `character_count` es el contador de uso del ciclo y `character_limit` el
   * tope. La diferencia de `character_count` antes y despues de una llamada es
   * lo que esa llamada costo de verdad: es la unica fuente fiable del descuento
   * que aplica Flash v2.5, que la documentacion publica no deja claro.
   */
  async suscripcion() {
    const s = await this.#peticion('/v1/user/subscription');
    return {
      usados: s.character_count,
      limite: s.character_limit,
      restantes: s.character_limit - s.character_count,
      plan: s.tier,
      reinicio: s.next_character_count_reset_unix
        ? new Date(s.next_character_count_reset_unix * 1000)
        : null,
      crudo: s,
    };
  }

  async voces() {
    const r = await this.#peticion('/v1/voices');
    return (r.voices || []).map((v) => ({ id: v.voice_id, nombre: v.name, categoria: v.category }));
  }

  /** Datos y ajustes guardados de una voz, para dejar constancia de cual se uso. */
  async voz(voiceId) {
    const v = await this.#peticion(`/v1/voices/${voiceId}`);
    return {
      id: v.voice_id,
      nombre: v.name,
      categoria: v.category,
      ajustes_guardados: v.settings ?? null,
    };
  }

  /**
   * Texto a voz con alineacion por caracter.
   *
   * `previoTexto` / `siguienteTexto` le dan al modelo el contexto vecino para
   * que la prosodia no se corte en la union entre parrafos. No se narran: solo
   * condicionan la entonacion del fragmento que si se narra.
   */
  async vozConTiempos({
    voiceId,
    texto,
    modelo,
    ajustes,
    formatoSalida = 'mp3_44100_128',
    previoTexto,
    siguienteTexto,
  }) {
    const cuerpo = {
      text: texto,
      model_id: modelo,
      voice_settings: ajustes,
    };
    if (previoTexto) cuerpo.previous_text = previoTexto;
    if (siguienteTexto) cuerpo.next_text = siguienteTexto;

    const r = await this.#peticion(
      `/v1/text-to-speech/${voiceId}/with-timestamps?output_format=${encodeURIComponent(formatoSalida)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      }
    );

    return {
      audio: Buffer.from(r.audio_base64, 'base64'),
      alineacion: normalizarAlineacion(r.alignment || r.normalized_alignment),
    };
  }

  /**
   * Alineacion forzada: audio ya existente + su transcripcion -> tiempos.
   * Es la via para dar subtitulos exactos a los cinco bloques ya producidos
   * sin volver a generar (ni pagar) nada de voz.
   */
  async alinear({ audio, nombreArchivo = 'audio.mp3', texto }) {
    const form = new FormData();
    form.append('file', new Blob([audio]), nombreArchivo);
    form.append('text', texto);

    const r = await this.#peticion('/v1/forced-alignment', { method: 'POST', body: form });

    if (Array.isArray(r.characters) && r.characters.length) {
      return {
        caracteres: r.characters.map((c) => c.text ?? c.character ?? ''),
        inicios: r.characters.map((c) => c.start),
        finales: r.characters.map((c) => c.end),
        palabras: (r.words || []).map((w) => ({ texto: w.text, inicio: w.start, fin: w.end })),
      };
    }
    // Algunas respuestas traen solo palabras; reconstruimos caracteres desde ahi.
    return alineacionDesdePalabras(r.words || []);
  }
}

/**
 * Traduce el codigo HTTP a la causa concreta.
 *
 * La diferencia entre 401 y 403 es la que decide que hay que arreglar, y sin
 * explicarla los dos se leen igual de opacos:
 *   401 — la clave no vale: revocada, caducada, mal copiada o de otra cuenta.
 *   403 — la clave vale, pero no tiene permiso para ESE endpoint.
 */
function pista(estado, ruta) {
  if (estado === 401) {
    return (
      '\n  La clave no es valida. Comprueba que sigue existiendo en ElevenLabs' +
      '\n  (Profile > API keys) y que el secreto no lleva espacios ni saltos de linea.' +
      '\n  Una clave borrada o regenerada da este mismo error.'
    );
  }
  if (estado === 403) {
    const permiso = ruta.startsWith('/v1/user')
      ? 'User read'
      : ruta.startsWith('/v1/voices')
        ? 'Voices read'
        : ruta.startsWith('/v1/text-to-speech')
          ? 'Text to Speech'
          : ruta.startsWith('/v1/forced-alignment')
            ? 'Forced alignment'
            : null;
    return permiso
      ? `\n  La clave es valida pero le falta el permiso "${permiso}".` +
        '\n  Editala en ElevenLabs y marca ese scope.'
      : '\n  La clave es valida pero no tiene permiso para este endpoint.';
  }
  if (estado === 429) return '\n  Limite de peticiones o de creditos alcanzado.';
  return '';
}

function normalizarAlineacion(a) {
  if (!a) throw new Error('La API no devolvio alineacion.');
  return {
    caracteres: a.characters,
    inicios: a.character_start_times_seconds,
    finales: a.character_end_times_seconds,
    palabras: null,
  };
}

/** Reparte los tiempos de cada palabra entre sus caracteres, de forma uniforme. */
function alineacionDesdePalabras(words) {
  const caracteres = [];
  const inicios = [];
  const finales = [];
  const palabras = [];

  words.forEach((w, i) => {
    const texto = w.text ?? '';
    palabras.push({ texto, inicio: w.start, fin: w.end });
    const paso = texto.length ? (w.end - w.start) / texto.length : 0;
    for (let j = 0; j < texto.length; j++) {
      caracteres.push(texto[j]);
      inicios.push(w.start + paso * j);
      finales.push(w.start + paso * (j + 1));
    }
    if (i < words.length - 1) {
      caracteres.push(' ');
      inicios.push(w.end);
      finales.push(words[i + 1].start);
    }
  });

  return { caracteres, inicios, finales, palabras };
}

/**
 * Espera a que el contador de consumo refleje la llamada.
 *
 * ElevenLabs actualiza character_count de forma asincrona: leerlo justo
 * despues de generar devuelve el valor anterior y la resta da cero. Aqui se
 * sondea hasta que se mueva; lo que no se hace es inventar un cero y guardarlo
 * como si fuera la tarifa real.
 */
export async function esperarConsumo(el, usadosAntes, { intentos = 20, esperaMs = 3000 } = {}) {
  let ultima = null;
  for (let i = 1; i <= intentos; i++) {
    await new Promise((r) => setTimeout(r, esperaMs));
    ultima = await el.suscripcion();
    if (ultima.usados !== usadosAntes) {
      return { sub: ultima, movio: true, segundos: (i * esperaMs) / 1000 };
    }
  }
  return { sub: ultima, movio: false, segundos: (intentos * esperaMs) / 1000 };
}
