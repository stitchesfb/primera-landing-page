/**
 * Short de varios tramos no contiguos (video_005 short_01: parrafos 2-5 +
 * pausa insertada + parrafos 13-17). Capacidad opcional sobre planearShort:
 * esta prueba no toca ese archivo y solo ejercita planearShortMultiTramo, asi
 * que si algo aqui rompe el Short tradicional de un solo rango es que la
 * "ampliacion minima" dejo de serlo.
 */
import { planearShort, planearShortMultiTramo, palabrasDelShort } from '../lib/shorts.mjs';

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'ok   ' : 'FALLO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };
const cerca = (a, b, e = 0.001) => Math.abs(a - b) < e;

// 17 parrafos: el rango 2-5, un bache de parrafos 6-12 que el Short NUNCA
// debe tocar, y el rango 13-17. Gaps normales (0.2-0.3s) entre parrafos
// vecinos, igual que en el video real: no son interludios (recortarDesde
// por defecto es 5s) y no se recortan.
const timeline = {
  duracion_total_s: 30,
  fin_narracion_s: 25,
  segmentos: [
    { numero: 1,  texto: 'Uno.',        inicio: 0,    fin: 1,    duracion: 1 },
    { numero: 2,  texto: 'Dos.',        inicio: 2.5,  fin: 4.5,  duracion: 2 },
    { numero: 3,  texto: 'Tres.',       inicio: 4.8,  fin: 6.5,  duracion: 1.7 },
    { numero: 4,  texto: 'Cuatro.',     inicio: 6.8,  fin: 8.5,  duracion: 1.7 },
    { numero: 5,  texto: 'Cinco.',      inicio: 8.8,  fin: 10.3, duracion: 1.5 },
    { numero: 6,  texto: 'Seis.',       inicio: 11,   fin: 11.5, duracion: 0.5 },
    { numero: 7,  texto: 'Siete.',      inicio: 11.7, fin: 12.2, duracion: 0.5 },
    { numero: 8,  texto: 'Ocho.',       inicio: 12.4, fin: 12.9, duracion: 0.5 },
    { numero: 9,  texto: 'Nueve.',      inicio: 13.1, fin: 13.4, duracion: 0.3 },
    { numero: 10, texto: 'Diez.',       inicio: 13.5, fin: 13.7, duracion: 0.2 },
    { numero: 11, texto: 'Once.',       inicio: 13.75,fin: 13.9, duracion: 0.15 },
    { numero: 12, texto: 'Doce.',       inicio: 13.92,fin: 13.98,duracion: 0.06 },
    { numero: 13, texto: 'Trece.',      inicio: 14,   fin: 15.5, duracion: 1.5 },
    { numero: 14, texto: 'Catorce.',    inicio: 15.7, fin: 17,   duracion: 1.3 },
    { numero: 15, texto: 'Quince.',     inicio: 17.2, fin: 18.6, duracion: 1.4 },
    { numero: 16, texto: 'Dieciseis.',  inicio: 18.8, fin: 20.1, duracion: 1.3 },
    { numero: 17, texto: 'Diecisiete.', inicio: 20.3, fin: 21.7, duracion: 1.4 },
  ],
  huecos: [
    { trasParrafo: 1,  inicio: 1,    duracion: 1.5, tipo: 'pause' },
    { trasParrafo: 2,  inicio: 4.5,  duracion: 0.3, tipo: 'pause' },
    { trasParrafo: 3,  inicio: 6.5,  duracion: 0.3, tipo: 'pause' },
    { trasParrafo: 4,  inicio: 8.5,  duracion: 0.3, tipo: 'pause' },
    { trasParrafo: 13, inicio: 15.5, duracion: 0.2, tipo: 'pause' },
    { trasParrafo: 14, inicio: 17,   duracion: 0.2, tipo: 'pause' },
    { trasParrafo: 15, inicio: 18.6, duracion: 0.2, tipo: 'pause' },
    { trasParrafo: 16, inicio: 20.1, duracion: 0.2, tipo: 'pause' },
    { trasParrafo: 17, inicio: 21.7, duracion: 2,   tipo: 'pause' },
  ],
};

const tramos = [{ parrafos: [2, 5] }, { pausaMs: 850 }, { parrafos: [13, 17] }];
const plan = planearShortMultiTramo({ timeline, tramos, interludioInterno: 2.5, ctaSegundos: 3 });

// --- 1. compatibilidad con un Short tradicional -----------------------------
// La misma tabla de tiempos, usada con planearShort (un solo rango, sobre el
// mismo tramo B que usa el Short multiple), da un plan autoconsistente y sin
// pausas insertadas: planearShortMultiTramo es codigo nuevo aparte, no una
// reescritura de planearShort.
const tradicional = planearShort({ timeline, desde: 13, hasta: 17, interludioInterno: 2.5, ctaSegundos: 3 });
const sumaTradicional = tradicional.tramos.reduce((s, t) => s + t.duracionDestino, 0);
check('un Short de un solo rango sigue funcionando con planearShort sin tocar: duracion = suma de sus tramos',
  cerca(tradicional.duracion, sumaTradicional), `${tradicional.duracion.toFixed(3)}s`);
check('el rango tradicional no inserta ninguna pausa artificial',
  !tradicional.tramos.some((t) => t.insertado));
check('el rango tradicional recorre los parrafos 13 a 17 en orden, sin saltos',
  tradicional.tramos.filter((t) => t.tipo === 'voz').map((t) => t.parrafo).join(',') === '13,14,15,16,17');
check('planearShortMultiTramo exige al menos dos rangos (no reemplaza a planearShort)',
  (() => { try { planearShortMultiTramo({ timeline, tramos: [{ parrafos: [2, 5] }] }); return false; }
           catch { return true; } })());

// --- 2. orden correcto de los tramos ----------------------------------------
const tipos = plan.tramos.map((t) => t.tipo);
check('la secuencia de tramos va entrada, voz A (4 parrafos), pausa insertada, voz B (5 parrafos), salida, cierre',
  tipos.join(',') === 'entrada,voz,silencio,voz,silencio,voz,silencio,voz,' +
    'silencio,voz,silencio,voz,silencio,voz,silencio,voz,silencio,voz,salida,cta',
  tipos.join(','));

// --- 3. exclusion completa de los parrafos 6-12 -----------------------------
const parrafosUsados = plan.tramos.filter((t) => t.tipo === 'voz').map((t) => t.parrafo);
check('parrafos usados son exactamente 2-5 y 13-17, nada de 6-12',
  parrafosUsados.join(',') === '2,3,4,5,13,14,15,16,17', parrafosUsados.join(','));
check('ningun parrafo del 6 al 12 aparece en el texto del Short',
  !plan.texto.some((t) => t.parrafo >= 6 && t.parrafo <= 12));

// --- 4. pausa insertada de 850 ms -------------------------------------------
const pausa = plan.tramos.find((t) => t.insertado);
check('hay exactamente una pausa insertada, de silencio de verdad',
  pausa && pausa.tipo === 'silencio', JSON.stringify(pausa));
check('la pausa insertada dura exactamente 850 ms', cerca(pausa.duracionDestino, 0.85),
  `${pausa.duracionDestino * 1000} ms`);
check('la pausa insertada no viene de ningun tramo del audio original (duracionOrigen 0)',
  pausa.duracionOrigen === 0);

// --- 5. duracion total = suma de tramos + pausa + cierre --------------------
const sumaManual = plan.tramos.reduce((s, t) => s + t.duracionDestino, 0);
check('la duracion total es la suma de todos los tramos (entrada + 2 rangos + pausa + salida + cierre)',
  cerca(plan.duracion, sumaManual) && cerca(plan.duracion, 0.6 + 6.9 + 0.9 + 0.85 + 6.9 + 0.8 + 0.9 + 3),
  `${plan.duracion.toFixed(3)}s`);
check('el cierre pedido (3s) esta integro al final', plan.tramos.at(-1).tipo === 'cta' &&
  cerca(plan.tramos.at(-1).duracionDestino, 3));

// --- 6. subtitulos sincronizados despues del corte --------------------------
const palabras = [
  // parrafo 5 entero (el ultimo de tramo A): [8.8, 10.3) en el video largo.
  { texto: 'Cinco', inicio: 8.8, fin: 10.3 },
  // primera palabra del tramo B (parrafo 13, [14, 15.5) en el video largo) —
  // justo al otro lado de la pausa insertada.
  { texto: 'Trece', inicio: 14.0, fin: 14.4 },
  // una palabra de un parrafo excluido (9, dentro del bache 6-12): no debe
  // aparecer nunca en el Short.
  { texto: 'Nueve', inicio: 13.1, fin: 13.3 },
];
const trasladadas = palabrasDelShort(plan, palabras);
check('solo viajan las palabras de los tramos que SI forman parte del Short',
  trasladadas.length === 2, trasladadas.map((p) => p.texto).join(', '));
check('ninguna palabra del bache 6-12 se cuela en los subtitulos',
  !trasladadas.some((p) => p.texto === 'Nueve'));
const cinco = trasladadas.find((p) => p.texto === 'Cinco');
const trece = trasladadas.find((p) => p.texto === 'Trece');
check('la ultima palabra del tramo A termina exactamente donde empieza la pausa insertada',
  cerca(cinco.fin, pausa.destino), `${cinco.fin.toFixed(3)}s vs pausa en ${pausa.destino.toFixed(3)}s`);
check('la primera palabra del tramo B empieza justo cuando termina la pausa, no donde estaba en el video original (14.0s)',
  cerca(trece.inicio, pausa.destino + pausa.duracionDestino), `${trece.inicio.toFixed(3)}s`);
check('el hueco entre las dos palabras en el Short es exactamente la pausa insertada, ni un ms mas ni menos',
  cerca(trece.inicio - cinco.fin, 0.85), `${(trece.inicio - cinco.fin).toFixed(3)}s`);

console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}`);
process.exit(fallos ? 1 : 0);
