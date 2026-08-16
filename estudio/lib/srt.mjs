/**
 * Subtitulos a partir de la alineacion por caracter de ElevenLabs.
 *
 * Cada parrafo se genera en su propia llamada y trae tiempos relativos a su
 * propio audio. Como conocemos el offset absoluto de cada parrafo en la linea
 * de tiempo, sumamos y listo: el desfase no se puede acumular, porque ningun
 * parrafo hereda el error del anterior.
 */

const FIN_DE_FRASE = /[.!?…]["'”’)]?$/;
const PAUSA_SUAVE = /[,;:]["'”’)]?$/;

/** Agrupa los caracteres alineados en palabras con inicio y fin. */
export function palabrasDesdeAlineacion(alineacion, offset = 0) {
  if (alineacion.palabras?.length) {
    return alineacion.palabras
      .filter((p) => p.texto.trim())
      .map((p) => ({ texto: p.texto.trim(), inicio: p.inicio + offset, fin: p.fin + offset }));
  }

  const { caracteres, inicios, finales } = alineacion;
  const palabras = [];
  let actual = null;

  for (let i = 0; i < caracteres.length; i++) {
    const c = caracteres[i];
    if (/\s/.test(c)) {
      if (actual) palabras.push(actual);
      actual = null;
      continue;
    }
    if (!actual) actual = { texto: '', inicio: inicios[i] + offset, fin: finales[i] + offset };
    actual.texto += c;
    actual.fin = finales[i] + offset;
  }
  if (actual) palabras.push(actual);
  return palabras;
}

/**
 * Reparte las palabras en subtitulos.
 *
 * Corta preferentemente en fin de frase, luego en coma, y solo si no queda
 * mas remedio por longitud o por duracion. Un subtitulo que cambia a mitad de
 * una idea se lee peor que uno un poco mas largo.
 */
export function agruparEnSubtitulos(palabras, opciones, limite = Infinity) {
  const maxLinea = opciones.max_caracteres_linea;
  const maxLineas = opciones.max_lineas;
  const maxCaracteres = maxLinea * maxLineas;
  const durMax = opciones.duracion_max_s;
  const durMin = opciones.duracion_min_s;

  const cues = [];
  let grupo = [];

  const largoDe = (g) => g.reduce((s, p) => s + p.texto.length, 0) + Math.max(0, g.length - 1);
  const cerrar = () => {
    if (!grupo.length) return;
    cues.push({
      inicio: grupo[0].inicio,
      fin: grupo[grupo.length - 1].fin,
      texto: grupo.map((p) => p.texto).join(' '),
    });
    grupo = [];
  };

  for (const palabra of palabras) {
    const tentativo = [...grupo, palabra];
    const duracion = palabra.fin - tentativo[0].inicio;

    if (grupo.length && (largoDe(tentativo) > maxCaracteres || duracion > durMax)) {
      cerrar();
      grupo = [palabra];
    } else {
      grupo = tentativo;
    }

    const largo = largoDe(grupo);
    const dur = grupo[grupo.length - 1].fin - grupo[0].inicio;
    const finFrase = FIN_DE_FRASE.test(palabra.texto);
    const pausa = PAUSA_SUAVE.test(palabra.texto);

    // Cierra en puntuacion si el subtitulo ya tiene cuerpo suficiente; asi se
    // evitan cues de dos palabras sueltas colgando tras un punto.
    if ((finFrase && (largo >= maxLinea * 0.5 || dur >= durMin)) || (pausa && largo >= maxCaracteres * 0.75)) {
      cerrar();
    }
  }
  cerrar();

  return separarSolapes(cues, opciones.hueco_min_s, durMin, limite);
}

/**
 * Evita que dos subtitulos se pisen y da un minimo legible a los muy cortos.
 *
 * `limite` es el final de la narracion: un subtitulo no puede quedarse en
 * pantalla sobre el cierre musical, cuando ya no hay voz que acompañe.
 */
function separarSolapes(cues, huecoMin, durMin, limite) {
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    const siguiente = cues[i + 1];

    if (c.fin - c.inicio < durMin) {
      const tope = siguiente ? siguiente.inicio - huecoMin : c.inicio + durMin;
      c.fin = Math.min(c.inicio + durMin, Math.max(c.fin, tope));
    }
    if (siguiente && c.fin > siguiente.inicio - huecoMin) {
      c.fin = Math.max(c.inicio + 0.3, siguiente.inicio - huecoMin);
    }
    if (c.fin > limite) c.fin = Math.max(c.inicio + 0.3, limite);
  }
  return cues;
}

/** Parte el texto en como mucho `maxLineas` lineas equilibradas. */
function repartirLineas(texto, maxLinea, maxLineas) {
  if (texto.length <= maxLinea) return [texto];

  const palabras = texto.split(' ');
  const lineas = [];
  let actual = '';

  for (const p of palabras) {
    const tentativo = actual ? `${actual} ${p}` : p;
    if (tentativo.length > maxLinea && actual) {
      lineas.push(actual);
      actual = p;
    } else {
      actual = tentativo;
    }
  }
  if (actual) lineas.push(actual);

  // Si se pasa de lineas, junta las sobrantes en la ultima antes que perder texto.
  if (lineas.length > maxLineas) {
    const cabeza = lineas.slice(0, maxLineas - 1);
    cabeza.push(lineas.slice(maxLineas - 1).join(' '));
    return cabeza;
  }
  return lineas;
}

export function tiempoSRT(segundos) {
  const ms = Math.max(0, Math.round(segundos * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const resto = ms % 1000;
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${p(h)}:${p(m)}:${p(s)},${p(resto, 3)}`;
}

export function renderSRT(cues, opciones) {
  return (
    cues
      .map((c, i) => {
        const lineas = repartirLineas(c.texto, opciones.max_caracteres_linea, opciones.max_lineas);
        return `${i + 1}\n${tiempoSRT(c.inicio)} --> ${tiempoSRT(c.fin)}\n${lineas.join('\n')}`;
      })
      .join('\n\n') + '\n'
  );
}
