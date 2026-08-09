/* Motor de animación determinista.
 *
 * No usa requestAnimationFrame ni animaciones CSS: el render llama a
 * `seek(t)` con el tiempo exacto de cada fotograma y esta función escribe
 * los estilos correspondientes. Así el mismo segundo produce siempre el
 * mismo píxel, que es lo que permite grabar sin saltos ni tirones.
 *
 * API que usa render.mjs:
 *   window.montar(config) -> { duracion, hitos }
 *   window.seek(t)
 */

(() => {
  'use strict';

  // --- utilidades de tiempo -------------------------------------------

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /** Progreso 0..1 de una rampa que empieza en `inicio` y dura `dur`. */
  const rampa = (t, inicio, dur) => clamp((t - inicio) / dur, 0, 1);

  // --- ritmo ------------------------------------------------------------

  const ENTRADA = 0.95;      // duración de la entrada de cada línea
  const ESCALON = 0.17;      // retraso entre líneas consecutivas
  const SALIDA = 0.65;       // duración de la salida del bloque
  const DY_ENTRADA = 24;     // px que sube cada línea al entrar
  const DY_SALIDA = -16;     // px que sube cada línea al salir

  /** Cuánto se sostiene un bloque de texto, según lo que hay que leer. */
  function duracionBloque(lineas, velocidad) {
    const caracteres = lineas.join(' ').length;
    const base = 2.2 + caracteres * 0.038 + lineas.length * 0.3;
    const entrada = ENTRADA + (lineas.length - 1) * ESCALON;
    return (Math.max(base, entrada + 1.4) + SALIDA) * velocidad;
  }

  // --- construcción de la escena ---------------------------------------

  let escena = null;

  function crearLinea(texto, clases) {
    const el = document.createElement('div');
    el.className = 'linea' + (clases ? ' ' + clases : '');
    el.textContent = texto;
    return el;
  }

  function crearBloque(clase) {
    const el = document.createElement('div');
    el.className = 'block' + (clase ? ' ' + clase : '');
    return el;
  }

  /** Carga una imagen de fondo propia antes de empezar a dibujar. */
  function cargarImagen(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo cargar la imagen de fondo: ' + src));
      img.src = src;
    });
  }

  /**
   * Monta el DOM y calcula la línea de tiempo completa.
   * config = { oracion, tema, canal, formato, velocidad }
   */
  window.montar = async function montar(config) {
    const { oracion, tema, canal } = config;
    const velocidad = config.velocidad || 1;

    const stage = document.getElementById('stage');
    stage.className = 'fmt-' + (config.formato === 'wide' ? 'wide' : 'shorts');
    stage.style.setProperty('--fondo', tema.fondo);
    stage.style.setProperty('--texto', tema.texto);
    stage.style.setProperty('--acento', tema.acento);
    stage.style.setProperty('--brillo', tema.brillo);

    const eyebrow = document.getElementById('eyebrow');
    const handle = document.getElementById('handle');
    const contenido = document.getElementById('content');
    contenido.textContent = '';

    eyebrow.textContent = oracion.eyebrow || 'Oración diaria';
    handle.textContent = canal.handle || '';

    const bloques = [];   // { inicio, fin, lineas: [el], regla?: el }
    const hitos = {};     // momentos útiles para elegir la miniatura
    let t = 0;

    // 1. Portada: título + subtítulo + regla que se dibuja.
    {
      const el = crearBloque('titulo');
      const lineas = [];
      const tit = crearLinea(oracion.titulo, 't');
      el.appendChild(tit);
      lineas.push(tit);
      if (oracion.subtitulo) {
        const sub = crearLinea(oracion.subtitulo, 's');
        el.appendChild(sub);
        lineas.push(sub);
      }
      const regla = document.createElement('div');
      regla.className = 'regla';
      el.appendChild(regla);
      contenido.appendChild(el);

      const dur = (4.4 + oracion.titulo.length * 0.02) * velocidad;
      bloques.push({ inicio: t, fin: t + dur, lineas, regla });
      hitos.portada = t + Math.min(2.6, dur - SALIDA - 0.3);
      t += dur;
    }

    // 2. Cuerpo de la oración, bloque a bloque.
    oracion.segmentos.forEach((seg) => {
      const el = crearBloque();
      const lineas = seg.lineas.map((texto) => {
        const l = crearLinea(texto);
        el.appendChild(l);
        return l;
      });
      contenido.appendChild(el);

      const dur = duracionBloque(seg.lineas, velocidad) * (seg.factor || 1);
      bloques.push({ inicio: t, fin: t + dur, lineas });
      t += dur;
    });

    // 3. Cierre: «Amén.» y llamada a la acción.
    {
      const el = crearBloque('cierre');
      const lineas = [];
      const amen = crearLinea(oracion.cierre || 'Amén.', 'a');
      el.appendChild(amen);
      lineas.push(amen);
      if (canal.cta) {
        const cta = crearLinea(canal.cta, 'c');
        el.appendChild(cta);
        lineas.push(cta);
      }
      contenido.appendChild(el);

      const dur = 5.8 * velocidad;
      bloques.push({ inicio: t, fin: t + dur, lineas });
      hitos.cierre = t + 2.4;
      t += dur;
    }

    const lienzo = document.getElementById('fondo');
    const imagen = oracion.fondo && oracion.fondo.imagen
      ? await cargarImagen(oracion.fondo.imagen)
      : null;

    escena = {
      bloques,
      eyebrow,
      handle,
      bar: document.getElementById('bar'),
      duracion: t,
      fondo: window.crearFondo(lienzo, {
        ancho: stage.clientWidth,
        alto: stage.clientHeight,
        duracion: t,
        imagen,
      }),
    };

    // Estado inicial coherente antes del primer fotograma.
    window.seek(0);
    return { duracion: t, hitos };
  };

  // --- dibujo de un fotograma ------------------------------------------

  window.seek = function seek(t) {
    if (!escena) throw new Error('Hay que llamar a montar() antes de seek()');
    const D = escena.duracion;

    escena.fondo.dibujar(t);

    escena.bloques.forEach((b) => {
      const salidaInicio = b.fin - SALIDA;
      // Fuera de su ventana el bloque no pinta nada.
      const visible = t >= b.inicio - 0.001 && t < b.fin + 0.001;

      b.lineas.forEach((el, i) => {
        if (!visible) {
          if (el.style.opacity !== '0') el.style.opacity = '0';
          return;
        }
        const entra = easeOut(rampa(t, b.inicio + 0.1 + i * ESCALON, ENTRADA));
        const sale = easeInOut(rampa(t, salidaInicio + i * 0.05, SALIDA));

        const op = entra * (1 - sale);
        const dy = DY_ENTRADA * (1 - entra) + DY_SALIDA * sale;
        el.style.opacity = op.toFixed(4);
        el.style.transform = 'translateY(' + dy.toFixed(2) + 'px)';
      });

      if (b.regla) {
        if (!visible) {
          b.regla.style.opacity = '0';
        } else {
          const crece = easeInOut(rampa(t, b.inicio + 0.55, 1.5));
          const sale = easeInOut(rampa(t, salidaInicio, SALIDA));
          b.regla.style.width = (crece * 260).toFixed(1) + 'px';
          b.regla.style.opacity = (0.55 * crece * (1 - sale)).toFixed(4);
        }
      }
    });

    // Eyebrow y handle: entran al principio y se mantienen.
    const marcoIn = easeOut(rampa(t, 0.5, 1.2));
    const marcoOut = easeInOut(rampa(t, D - 1.1, 1.0));
    escena.eyebrow.style.opacity = (marcoIn * (1 - marcoOut)).toFixed(4);
    escena.handle.style.opacity = (0.9 * easeOut(rampa(t, 1.1, 1.2)) * (1 - marcoOut)).toFixed(4);

    // Barra de progreso.
    escena.bar.style.width = (clamp(t / D, 0, 1) * 100).toFixed(3) + '%';
  };
})();
