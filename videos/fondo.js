/* Fondo animado dibujado en canvas.
 *
 * Igual que el resto de la escena, no se anima solo: `dibujar(t)` pinta el
 * estado exacto del segundo `t`. Todo lo aleatorio (estrellas, nubes, motas)
 * sale de un generador con semilla fija, así que dos renders del mismo video
 * dibujan exactamente las mismas partículas en los mismos sitios.
 *
 * La escena es un amanecer: la noche se va calentando hacia el ámbar, el sol
 * asoma por detrás de las colinas y las nubes cruzan despacio. El texto vive
 * en la mitad alta, que es la zona que se mantiene oscura, para que el blanco
 * se lea siempre.
 */

(() => {
  'use strict';

  // --- utilidades -------------------------------------------------------

  /** PRNG pequeño y determinista (mulberry32). */
  function semilla(s) {
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mezcla = (a, b, k) => a + (b - a) * k;
  const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function aRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function mezclaColor(a, b, k) {
    const x = aRgb(a), y = aRgb(b);
    return `rgb(${Math.round(mezcla(x[0], y[0], k))},${Math.round(mezcla(x[1], y[1], k))},${Math.round(mezcla(x[2], y[2], k))})`;
  }

  function rgba(hex, a) {
    const [r, g, b] = aRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  }

  // --- paletas ----------------------------------------------------------

  // Dos momentos del amanecer; el video interpola de uno al otro.
  const NOCHE = {
    alto: '#080B1C',
    medio: '#141A38',
    bajo: '#2A2340',
    horizonte: '#4A3550',
    nube: '#2A2E4E',
    colinas: ['#0A0C1A', '#060810', '#030408'],
  };

  const ALBA = {
    alto: '#131B3E',
    medio: '#3A3560',
    bajo: '#8A5560',
    horizonte: '#E3A05F',
    nube: '#6B4A5A',
    colinas: ['#191428', '#0D0A16', '#050409'],
  };

  // --- construcción -----------------------------------------------------

  /**
   * @param {HTMLCanvasElement} lienzo
   * @param {{ancho:number, alto:number, duracion:number, imagen?:HTMLImageElement}} cfg
   */
  window.crearFondo = function crearFondo(lienzo, cfg) {
    const { ancho, alto, duracion } = cfg;
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext('2d');

    const yHorizonte = alto * (ancho > alto ? 0.8 : 0.74);
    const rnd = semilla(20260804);

    // Estrellas en la mitad alta, que es donde se ven al principio.
    const estrellas = Array.from({ length: 120 }, () => ({
      x: rnd() * ancho,
      y: rnd() * yHorizonte * 0.82,
      r: 0.7 + rnd() * 1.9,
      brillo: 0.25 + rnd() * 0.75,
      fase: rnd() * Math.PI * 2,
    }));

    // Bandas de nube: elipses muy achatadas que cruzan despacio.
    const nubes = Array.from({ length: 9 }, () => ({
      x: rnd() * ancho * 1.4 - ancho * 0.2,
      y: yHorizonte - (0.06 + rnd() * 0.5) * yHorizonte,
      rx: ancho * (0.16 + rnd() * 0.3),
      ry: alto * (0.008 + rnd() * 0.022),
      v: (0.35 + rnd() * 0.9) * (ancho / 1080),
      alfa: 0.16 + rnd() * 0.3,
    }));

    // Motas de polvo suspendidas en el aire.
    const motas = Array.from({ length: 70 }, () => ({
      x: rnd() * ancho,
      y: rnd() * alto,
      r: 0.9 + rnd() * 2.4,
      v: 4 + rnd() * 13,
      deriva: 5 + rnd() * 16,
      fase: rnd() * Math.PI * 2,
      alfa: 0.1 + rnd() * 0.3,
    }));

    // Tres siluetas de colina, cada una con su propio perfil.
    const colinas = [
      { amp: alto * 0.035, base: yHorizonte + alto * 0.020, f: 1.7, desf: 0.0, par: 9 },
      { amp: alto * 0.055, base: yHorizonte + alto * 0.062, f: 1.1, desf: 2.1, par: 5 },
      { amp: alto * 0.075, base: yHorizonte + alto * 0.125, f: 0.7, desf: 4.3, par: 2 },
    ];

    function cielo(t, p) {
      const g = ctx.createLinearGradient(0, 0, 0, yHorizonte + alto * 0.06);
      g.addColorStop(0, mezclaColor(NOCHE.alto, ALBA.alto, p));
      g.addColorStop(0.42, mezclaColor(NOCHE.medio, ALBA.medio, p));
      g.addColorStop(0.78, mezclaColor(NOCHE.bajo, ALBA.bajo, p));
      g.addColorStop(1, mezclaColor(NOCHE.horizonte, ALBA.horizonte, p));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, ancho, yHorizonte + alto * 0.07);
    }

    function pintarEstrellas(t, p) {
      // Se apagan a medida que amanece.
      const visibilidad = clamp(1 - p * 1.7, 0, 1);
      if (visibilidad <= 0.001) return;
      for (const e of estrellas) {
        const parpadeo = 0.65 + 0.35 * Math.sin(t * 1.1 + e.fase);
        ctx.globalAlpha = e.brillo * parpadeo * visibilidad * 0.9;
        ctx.fillStyle = '#EAF0FF';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function pintarSol(t, p) {
      // Sube desde detrás de las colinas y va ganando calor.
      const y = yHorizonte + alto * 0.055 - suave(p) * alto * 0.105;
      const x = ancho * 0.5;
      const r = Math.min(ancho, alto) * 0.062;

      const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 11);
      halo.addColorStop(0, rgba('#FFD9A0', 0.30 * (0.35 + p * 0.65)));
      halo.addColorStop(0.22, rgba('#E39A55', 0.16 * (0.3 + p * 0.7)));
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, ancho, yHorizonte + alto * 0.12);

      // Rayos larguísimos y muy tenues, girando despacio.
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 0.012);
      ctx.globalAlpha = 0.05 + p * 0.075;
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * Math.PI * 2;
        const largo = Math.max(ancho, alto) * 1.15;
        const abre = 0.032 + (i % 3) * 0.014;
        const g = ctx.createLinearGradient(0, 0, Math.cos(a) * largo, Math.sin(a) * largo);
        g.addColorStop(0, rgba('#FFC98A', 0.5));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, largo, a - abre, a + abre);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;

      const disco = ctx.createRadialGradient(x, y, 0, x, y, r);
      disco.addColorStop(0, rgba('#FFF3DC', 0.55 + p * 0.4));
      disco.addColorStop(0.62, rgba('#FFC98A', 0.32 + p * 0.4));
      disco.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = disco;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    function pintarNubes(t, p) {
      const color = mezclaColor(NOCHE.nube, ALBA.nube, p);
      for (const n of nubes) {
        const x = ((n.x + n.v * t) % (ancho * 1.5) + ancho * 1.5) % (ancho * 1.5) - ancho * 0.25;
        ctx.save();
        ctx.translate(x, n.y);
        ctx.scale(1, n.ry / n.rx);
        const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, n.rx);
        gr.addColorStop(0, color);
        gr.addColorStop(0.55, color);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = n.alfa * (0.5 + p * 0.5);
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(0, 0, n.rx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    function pintarColinas(t, p) {
      colinas.forEach((c, i) => {
        ctx.fillStyle = mezclaColor(NOCHE.colinas[i], ALBA.colinas[i], p);
        ctx.beginPath();
        ctx.moveTo(0, alto);
        const paso = Math.max(6, ancho / 180);
        for (let x = 0; x <= ancho; x += paso) {
          const u = (x / ancho) * Math.PI * 2;
          const deriva = t * 0.0016 * c.par;
          const y = c.base
            - Math.sin(u * c.f + c.desf + deriva) * c.amp
            - Math.sin(u * c.f * 2.3 + c.desf * 1.7 - deriva) * c.amp * 0.34;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(ancho, alto);
        ctx.closePath();
        ctx.fill();
      });
    }

    function pintarMotas(t) {
      ctx.fillStyle = '#FFE3B8';
      for (const m of motas) {
        const y = ((m.y - m.v * t) % alto + alto) % alto;
        const x = m.x + Math.sin(t * 0.32 + m.fase) * m.deriva;
        ctx.globalAlpha = m.alfa * (0.55 + 0.45 * Math.sin(t * 0.8 + m.fase));
        ctx.beginPath();
        ctx.arc(x, y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /** Oscurece la franja donde vive el texto para que el blanco no se pierda. */
    function velo() {
      const g = ctx.createLinearGradient(0, 0, 0, alto);
      g.addColorStop(0, 'rgba(6,8,18,0.50)');
      g.addColorStop(0.28, 'rgba(6,8,18,0.42)');
      g.addColorStop(0.62, 'rgba(6,8,18,0.30)');
      g.addColorStop(1, 'rgba(6,8,18,0.16)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, ancho, alto);

      const v = ctx.createRadialGradient(
        ancho / 2, alto * 0.45, Math.min(ancho, alto) * 0.28,
        ancho / 2, alto * 0.45, Math.max(ancho, alto) * 0.72
      );
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.46)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, ancho, alto);
    }

    /** Foto propia con un travelling lento, en vez de la escena dibujada. */
    function pintarImagen(t) {
      const img = cfg.imagen;
      const p = t / duracion;
      const zoom = 1.06 + 0.10 * p;
      const escala = Math.max(ancho / img.width, alto / img.height) * zoom;
      const w = img.width * escala;
      const h = img.height * escala;
      const x = (ancho - w) / 2 - (w - ancho) * 0.12 * (p - 0.5);
      const y = (alto - h) / 2 - (h - alto) * 0.16 * (p - 0.5);
      ctx.drawImage(img, x, y, w, h);
    }

    return {
      dibujar(t) {
        const p = suave(clamp(t / duracion, 0, 1));
        ctx.clearRect(0, 0, ancho, alto);

        if (cfg.imagen) {
          pintarImagen(t);
        } else {
          cielo(t, p);
          pintarEstrellas(t, p);
          pintarSol(t, p);
          pintarNubes(t, p);
          pintarColinas(t, p);
          pintarMotas(t);
        }
        velo();
      },
    };
  };
})();
