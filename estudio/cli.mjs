#!/usr/bin/env node
/**
 * Estudio — pipeline de produccion de "Oraciones Biblicas Diarias".
 *
 * Checkpoint 1: todo lo anterior al render.
 *
 *   node cli.mjs sonda                 Mide el coste real de Flash v2.5 por API
 *   node cli.mjs voces                 Lista las voces y sus IDs
 *   node cli.mjs estimar  <proyecto>   Valida el plan y estima creditos (no gasta)
 *   node cli.mjs revisar  <proyecto>   Informe doctrinal asistido (no gasta)
 *   node cli.mjs aprobar-audio <proy>  Marca APPROVED_FOR_AUDIO
 *   node cli.mjs voz      <proyecto>   Genera la voz (exige aprobacion)
 *   node cli.mjs importar <proyecto>   Alinea audio ya existente, sin generar
 *   node cli.mjs estado   [proyecto]   Muestra el estado
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { cargarCanal, cargarEnv, cargarCalibracion, guardarCalibracion, registrarMedida, constantes } from './lib/config.mjs';
import { ElevenLabs } from './lib/elevenlabs.mjs';
import { cargarProyecto, listarProyectos, escribirEstado, exigirEstado, asegurarSalida } from './lib/proyecto.mjs';
import { validarPlan, construirLinea } from './lib/plan.mjs';
import { estimar, comparar, mmss, miles } from './lib/estimacion.mjs';
import { palabrasDesdeAlineacion, agruparEnSubtitulos, renderSRT } from './lib/srt.mjs';
import { revisar, CHECKLIST } from './lib/revision.mjs';
import { montarNarracion, duracionSegundos } from './lib/audio.mjs';

const canal = cargarCanal();
const env = cargarEnv();

// --- presentacion -----------------------------------------------------

const c = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  rojo: (s) => `\x1b[31m${s}\x1b[0m`,
  verde: (s) => `\x1b[32m${s}\x1b[0m`,
  ambar: (s) => `\x1b[33m${s}\x1b[0m`,
  cian: (s) => `\x1b[36m${s}\x1b[0m`,
};

const titulo = (t) => console.log(`\n${c.bold(t)}\n${'─'.repeat(t.length)}`);

function cliente() {
  return new ElevenLabs({
    apiKey: env.ELEVENLABS_API_KEY,
    base: canal.api.base,
    reintentos: canal.api.reintentos,
  });
}

function vozId() {
  const id = env.ELEVENLABS_VOICE_ID;
  if (!id) throw new Error('Falta ELEVENLABS_VOICE_ID en .env. Ejecuta "node cli.mjs voces" para verlo.');
  return id;
}

async function preguntar(texto) {
  const rl = createInterface({ input: stdin, output: stdout });
  const r = (await rl.question(texto)).trim().toUpperCase();
  rl.close();
  return r === 'YES' || r === 'SI' || r === 'SÍ';
}

// --- sonda: medir en vez de suponer -----------------------------------

/**
 * Averigua, contra la API real, dos cosas que la documentacion publica no
 * deja claras y que cambian el presupuesto del canal entero:
 *
 *   1. Cuantos creditos descuenta de verdad Flash v2.5 por caracter. En la web
 *      se observo 1:1 (879 caracteres = 879 creditos); varias fuentes dicen
 *      que por API son 0,5. Aqui se mide, no se supone.
 *   2. Si el contexto de prosodia (previous_text / next_text) se factura. Si
 *      se facturara, generar parrafo a parrafo con contexto costaria hasta el
 *      triple, y habria que replantear la segmentacion.
 */
async function cmdSonda() {
  const el = cliente();
  const voz = vozId();
  const modelo = canal.voz.modelo;

  const TEXTO = 'Padre, gracias por este dia nuevo y por tu fidelidad constante.';
  const CONTEXTO = 'Antes de dormir, entrega a Dios lo que hoy te preocupa.';

  titulo('Sonda de creditos');
  console.log(`Modelo:  ${c.cian(modelo)}`);
  console.log(`Voz:     ${voz}`);
  console.log(`Texto:   "${TEXTO}" ${c.dim(`(${TEXTO.length} caracteres)`)}`);

  const antes = await el.suscripcion();
  console.log(`\nPlan ${c.bold(antes.plan)} — usados ${miles(antes.usados)} de ${miles(antes.limite)}`);

  // Medida 1: llamada limpia, sin contexto.
  process.stdout.write('\nGenerando muestra sin contexto… ');
  const r1 = await el.vozConTiempos({
    voiceId: voz, texto: TEXTO, modelo,
    ajustes: canal.voz.ajustes, formatoSalida: canal.api.formato_salida,
  });
  const tras1 = await el.suscripcion();
  const coste1 = tras1.usados - antes.usados;
  console.log(c.verde('hecho'));

  // Medida 2: misma longitud de texto narrado, ahora con contexto vecino.
  process.stdout.write('Generando muestra con contexto…  ');
  await el.vozConTiempos({
    voiceId: voz, texto: TEXTO, modelo,
    ajustes: canal.voz.ajustes, formatoSalida: canal.api.formato_salida,
    previoTexto: CONTEXTO, siguienteTexto: CONTEXTO,
  });
  const tras2 = await el.suscripcion();
  const coste2 = tras2.usados - tras1.usados;
  console.log(c.verde('hecho'));

  const ratio = coste1 / TEXTO.length;
  const segundos = duracionAlineacion(r1.alineacion);

  titulo('Resultado');
  console.log(`Caracteres enviados        ${TEXTO.length}`);
  console.log(`Creditos descontados       ${c.bold(String(coste1))}`);
  console.log(`Ratio real                 ${c.bold(ratio.toFixed(3))} creditos/caracter`);
  console.log(
    ratio <= 0.6
      ? c.verde('  → El descuento de Flash SI aplica por API. Capacidad mensual al doble.')
      : ratio >= 0.9
        ? c.ambar('  → Flash cobra 1:1 tambien por API, igual que en la web.')
        : c.ambar('  → Ratio intermedio; conviene repetir la sonda con otro texto.')
  );

  console.log(`\nCon contexto de prosodia   ${coste2} creditos`);
  const extra = coste2 - coste1;
  console.log(
    extra <= Math.max(2, TEXTO.length * 0.05)
      ? c.verde('  → previous_text/next_text NO se facturan. Segmentamos con contexto sin penalizacion.')
      : c.ambar(`  → El contexto suma ~${extra} creditos por llamada. Habra que usarlo solo entre bloques.`)
  );

  if (segundos) {
    console.log(`\nRitmo medido               ${Math.round((TEXTO.length / segundos) * 60)} caracteres/minuto`);
  }

  const cal = cargarCalibracion();
  registrarMedida(cal, {
    origen: 'sonda',
    modelo,
    caracteres: TEXTO.length,
    creditos: coste1,
    creditos_por_caracter: ratio,
    creditos_con_contexto: coste2,
    segundos,
  });
  guardarCalibracion(cal);
  console.log(c.dim('\nGuardado en calibracion.json. "estimar" ya usa estos numeros reales.'));
}

function duracionAlineacion(al) {
  const f = al?.finales;
  return f?.length ? f[f.length - 1] : null;
}

async function cmdVoces() {
  const voces = await cliente().voces();
  titulo(`Voces disponibles (${voces.length})`);
  for (const v of voces) {
    console.log(`${c.cian(v.id)}  ${v.nombre} ${c.dim(`(${v.categoria})`)}`);
  }
  console.log(c.dim('\nCopia el ID de "El Faraon" a ELEVENLABS_VOICE_ID en .env'));
}

// --- estimar ----------------------------------------------------------

function analizar(id) {
  const proyecto = cargarProyecto(id);
  const validacion = validarPlan(proyecto, canal);
  const cal = cargarCalibracion();
  const cte = constantes(canal, cal);

  let linea = null;
  if (!validacion.problemas.length) {
    const duracionesEstimadas = proyecto.parrafos.map((p) => (p.length / cte.caracteresPorMinuto) * 60);
    linea = construirLinea(proyecto, canal, duracionesEstimadas);
  }
  const est = estimar({ parrafos: proyecto.parrafos, canal, constantes: cte, linea });
  return { proyecto, validacion, cte, linea, est };
}

function imprimirValidacion(validacion) {
  for (const p of validacion.problemas) console.log(c.rojo(`  ✗ ${p}`));
  for (const a of validacion.avisos) console.log(c.ambar(`  ! ${a}`));
  if (!validacion.problemas.length && !validacion.avisos.length) {
    console.log(c.verde('  ✓ Plan de edicion valido'));
  }
}

async function cmdEstimar(id) {
  const { proyecto, validacion, cte, linea, est } = analizar(id);

  titulo(`Proyecto ${proyecto.id}`);
  console.log(`Estado          ${c.bold(proyecto.estado.estado)}`);
  console.log(`Pilar           ${proyecto.plan?.pilar ?? '—'}`);
  console.log(`Parrafos        ${proyecto.parrafos.length}`);

  titulo('Plan de edicion');
  imprimirValidacion(validacion);
  if (validacion.problemas.length) {
    process.exitCode = 1;
    return;
  }

  titulo('Estimacion');
  const marca = (ok) => (ok ? c.verde('medido') : c.ambar('supuesto'));
  console.log(`Caracteres narrados        ${miles(est.caracteres)}`);
  console.log(`Ritmo                      ${cte.caracteresPorMinuto} car/min  ${marca(cte.calibradoRitmo)}`);
  console.log(`Tarifa                     ${cte.creditosPorCaracter} cred/car  ${marca(cte.calibradoCreditos)}`);
  console.log('');
  console.log(`Narracion estimada         ${c.bold(mmss(est.minutosNarracion * 60))}`);
  console.log(`Pausas, interludios, cierre ${mmss(est.segundosSilencio)}`);
  console.log(`Duracion final estimada    ${c.bold(mmss(linea.duracionTotal))}`);

  const formato = canal.formatos[proyecto.plan.pilar];
  if (formato) {
    const min = linea.duracionTotal / 60;
    const dentro = min >= formato.duracion_objetivo_min && min <= formato.duracion_objetivo_max;
    console.log(
      dentro
        ? c.verde(`  ✓ Dentro del objetivo (${formato.duracion_objetivo_min}-${formato.duracion_objetivo_max} min)`)
        : c.ambar(`  ! Fuera del objetivo (${formato.duracion_objetivo_min}-${formato.duracion_objetivo_max} min)`)
    );
  }
  const pctVoz = (linea.segundosNarracion / linea.duracionTotal) * 100;
  console.log(c.dim(`  Narracion original: ${pctVoz.toFixed(0)}% del video. Sin repeticion de contenido.`));

  console.log('');
  console.log(`Creditos estimados         ${c.bold(miles(est.creditos))}`);
  if (est.parrafosLargos.length) {
    console.log(c.ambar(`  ! Parrafos por encima de ${canal.api.max_caracteres_por_peticion} caracteres: ` +
      est.parrafosLargos.map((p) => `${p.numero} (${p.caracteres})`).join(', ')));
  }

  if (env.ELEVENLABS_API_KEY) {
    try {
      const s = await cliente().suscripcion();
      console.log('');
      console.log(`Restantes ahora            ${miles(s.restantes)}`);
      console.log(`Restantes tras generar     ${c.bold(miles(s.restantes - est.creditos))}`);
      if (s.restantes < est.creditos) console.log(c.rojo('  ✗ No hay creditos suficientes este ciclo.'));
      if (s.reinicio) console.log(c.dim(`  Renueva el ${s.reinicio.toLocaleDateString('es-ES')}`));
    } catch (e) {
      console.log(c.dim(`\n(No se pudo consultar la cuota: ${e.message})`));
    }
  } else {
    console.log(c.dim('\n(Sin ELEVENLABS_API_KEY no se puede mostrar la cuota restante)'));
  }

  if (!cte.calibradoCreditos) {
    console.log(c.ambar('\nLa tarifa aun es un supuesto. Ejecuta "node cli.mjs sonda" para medirla.'));
  }
}

// --- revisar ----------------------------------------------------------

async function cmdRevisar(id) {
  const proyecto = cargarProyecto(id);
  const { hallazgos, altos, medios } = revisar(proyecto.parrafos);

  titulo(`Revision doctrinal — ${proyecto.id}`);
  console.log(c.dim('Informe asistido. No aprueba nada: detecta patrones conocidos y'));
  console.log(c.dim('puede fallar en ambos sentidos. La revision humana sigue siendo obligatoria.'));

  if (!hallazgos.length) {
    console.log(c.verde('\n✓ Sin patrones marcados en los ' + proyecto.parrafos.length + ' parrafos.'));
  } else {
    console.log(`\n${altos} de severidad alta, ${medios} media\n`);
    for (const h of hallazgos) {
      const color = h.severidad === 'alto' ? c.rojo : c.ambar;
      console.log(color(`[${h.severidad.toUpperCase()}] parrafo ${h.parrafo} — ${h.regla}`));
      console.log(`  "${h.frase}"`);
      console.log(c.dim(`  Manual ${h.manual}`));
      console.log(c.dim(`  → ${h.sugerencia}\n`));
    }
  }

  titulo('Checklist humana (manual, seccion 11)');
  for (const punto of CHECKLIST) console.log(`  [ ] ${punto}`);

  const salida = asegurarSalida(proyecto);
  writeFileSync(
    join(salida, 'revision.json'),
    JSON.stringify({ fecha: new Date().toISOString(), altos, medios, hallazgos, checklist: CHECKLIST }, null, 2) + '\n'
  );
  console.log(c.dim(`\nInforme guardado en ${basename(salida)}/revision.json`));

  if (proyecto.estado.estado === 'draft') {
    escribirEstado(proyecto, 'reviewed', `${altos} altos, ${medios} medios`);
    console.log(`Estado → ${c.bold('reviewed')}`);
  }
  console.log(c.dim('\nPara habilitar el gasto de creditos:  node cli.mjs aprobar-audio ' + proyecto.id));
}

// --- aprobaciones -----------------------------------------------------

async function cmdAprobarAudio(id, nota) {
  const proyecto = cargarProyecto(id);
  const { validacion } = { validacion: validarPlan(proyecto, canal) };
  if (validacion.problemas.length) {
    titulo('No se puede aprobar: el plan tiene errores');
    imprimirValidacion(validacion);
    process.exitCode = 1;
    return;
  }
  const { altos } = revisar(proyecto.parrafos);
  if (altos > 0) {
    console.log(c.ambar(`\nAviso: la revision marca ${altos} hallazgo(s) de severidad alta.`));
    if (!(await preguntar('Aprobar igualmente? YES/NO: '))) {
      console.log('Cancelado.');
      return;
    }
  }
  escribirEstado(proyecto, 'APPROVED_FOR_AUDIO', nota ?? 'aprobado manualmente');
  console.log(c.verde(`\n✓ ${proyecto.id} → APPROVED_FOR_AUDIO`));
  console.log(c.dim('  Ya se puede ejecutar:  node cli.mjs voz ' + proyecto.id));
}

// --- voz --------------------------------------------------------------

async function cmdVoz(id, opciones) {
  const { proyecto, validacion, cte, linea, est } = analizar(id);

  exigirEstado(proyecto, 'APPROVED_FOR_AUDIO', 'voz');
  if (validacion.problemas.length) {
    titulo('El plan de edicion tiene errores');
    imprimirValidacion(validacion);
    process.exitCode = 1;
    return;
  }

  const el = cliente();
  const voz = vozId();
  const antes = await el.suscripcion();

  titulo(`Generacion de voz — ${proyecto.id}`);
  console.log(`Estimated narration:                  ${(est.minutosNarracion).toFixed(1)} minutes`);
  console.log(`Estimated ElevenLabs usage:           ${miles(est.creditos)} credits`);
  console.log(`Remaining monthly allowance after:    ${miles(antes.restantes - est.creditos)}`);
  console.log(c.dim(`  (${proyecto.parrafos.length} peticiones, modelo ${canal.voz.modelo})`));

  if (antes.restantes < est.creditos) {
    console.log(c.rojo('\n✗ Creditos insuficientes en el ciclo actual.'));
    process.exitCode = 1;
    return;
  }
  if (!opciones.si && !(await preguntar('\nProceed? YES/NO: '))) {
    console.log('Cancelado. No se ha gastado nada.');
    return;
  }

  const salida = asegurarSalida(proyecto);
  const dirParrafos = join(salida, 'parrafos');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(dirParrafos, { recursive: true });

  const alineaciones = [];
  const rutas = [];

  for (const [i, texto] of proyecto.parrafos.entries()) {
    process.stdout.write(`\r  parrafo ${i + 1}/${proyecto.parrafos.length}…    `);
    const r = await el.vozConTiempos({
      voiceId: voz,
      texto,
      modelo: canal.voz.modelo,
      ajustes: canal.voz.ajustes,
      formatoSalida: canal.api.formato_salida,
      previoTexto: proyecto.parrafos[i - 1],
      siguienteTexto: proyecto.parrafos[i + 1],
    });
    const ruta = join(dirParrafos, `${String(i + 1).padStart(3, '0')}.mp3`);
    writeFileSync(ruta, r.audio);
    rutas.push(ruta);
    alineaciones.push(r.alineacion);
  }
  console.log(`\r  ${proyecto.parrafos.length} parrafos generados.        `);

  const despues = await el.suscripcion();
  const creditosReales = despues.usados - antes.usados;

  process.stdout.write('  montando la pista…');
  const segmentosMp3 = rutas.map((mp3, i) => ({ mp3, numero: i + 1 }));
  const { duraciones, duracionTotal } = await montarNarracion({
    segmentos: segmentosMp3,
    huecos: linea.huecos,
    outro: linea.outro,
    salidaMp3: join(salida, 'audio.mp3'),
    tmp: join(salida, '.tmp'),
  });
  console.log(' hecho.');

  // Linea de tiempo definitiva, ya con las duraciones reales.
  const lineaReal = construirLinea(proyecto, canal, duraciones);
  const resultado = escribirSincronizacion({ proyecto, salida, linea: lineaReal, alineaciones, duracionTotal });

  const cal = cargarCalibracion();
  registrarMedida(cal, {
    origen: 'voz',
    proyecto: proyecto.id,
    modelo: canal.voz.modelo,
    caracteres: est.caracteres,
    creditos: creditosReales,
    creditos_por_caracter: creditosReales / est.caracteres,
    segundos: lineaReal.segundosNarracion,
  });
  guardarCalibracion(cal);

  escribirEstado(proyecto, 'audio', `${creditosReales} creditos`);

  const cmp = comparar(est.creditos, creditosReales);
  titulo('Estimado contra real');
  console.log(`Creditos estimados         ${miles(cmp.estimado)}`);
  console.log(`Creditos reales            ${c.bold(miles(cmp.real))}`);
  console.log(
    `Desvio                     ${cmp.aceptable ? c.verde(`${cmp.desvioPct.toFixed(1)}%`) : c.ambar(`${cmp.desvioPct.toFixed(1)}%`)}`
  );
  console.log(`Tarifa medida              ${(creditosReales / est.caracteres).toFixed(3)} cred/car`);
  console.log(`Restantes en el ciclo      ${miles(despues.restantes)}`);

  titulo('Salida');
  console.log(`  audio.mp3       ${mmss(duracionTotal)}`);
  console.log(`  subtitles.srt   ${resultado.cues} subtitulos`);
  console.log(`  alignment.json  ${resultado.palabras} palabras con tiempo absoluto`);
  console.log(`  timeline.json   ${lineaReal.huecos.length} huecos, cierre de ${lineaReal.outro.music_seconds}s`);
}

// --- importar audio ya existente --------------------------------------

/**
 * Toma los bloques de audio que ya se produjeron a mano y les da timestamps
 * mediante forced alignment. No genera voz: no gasta creditos de TTS.
 *
 * En este modo el segmento es el BLOQUE, no el parrafo: las pausas internas
 * ya vienen grabadas en el audio. Los huecos que añade el pipeline son los
 * interludios entre bloques declarados en edit_plan.json.
 */
async function cmdImportar(id) {
  const proyecto = cargarProyecto(id);
  const dirFuente = join(proyecto.dir, 'audio_fuente');

  if (!existsSync(dirFuente)) {
    throw new Error(
      `Falta ${proyecto.id}/audio_fuente/.\n` +
        '  Pon ahi los bloques ya generados, ordenados: 01.mp3, 02.mp3, …'
    );
  }
  const archivos = readdirSync(dirFuente)
    .filter((f) => /\.(mp3|wav|m4a)$/i.test(f))
    .sort();
  if (!archivos.length) throw new Error(`No hay audio en ${dirFuente}`);

  const bloques = repartirParrafosEnBloques(proyecto, archivos.length);

  titulo(`Importar audio — ${proyecto.id}`);
  console.log(`Bloques de audio    ${archivos.length}`);
  console.log(`Parrafos            ${proyecto.parrafos.length}`);
  bloques.forEach((b, i) => {
    console.log(c.dim(`  bloque ${i + 1}: ${archivos[i]} ← parrafos ${b[0] + 1}-${b[b.length - 1] + 1}`));
  });

  const el = cliente();
  const alineaciones = [];
  const duraciones = [];
  const textos = [];

  for (const [i, archivo] of archivos.entries()) {
    process.stdout.write(`\r  alineando bloque ${i + 1}/${archivos.length}…    `);
    const ruta = join(dirFuente, archivo);
    const texto = bloques[i].map((idx) => proyecto.parrafos[idx]).join(' ');
    textos.push(texto);
    alineaciones.push(await el.alinear({ audio: readFileSync(ruta), nombreArchivo: archivo, texto }));
    duraciones.push(await duracionSegundos(ruta));
  }
  console.log(`\r  ${archivos.length} bloques alineados.          `);

  // Proyecto sintetico donde cada "parrafo" es un bloque completo, para que
  // la linea de tiempo y los huecos se calculen con el mismo codigo.
  const comoBloques = {
    ...proyecto,
    parrafos: textos,
    plan: { ...proyecto.plan, events: eventosEntreBloques(proyecto, bloques) },
  };

  const salida = asegurarSalida(proyecto);
  const linea = construirLinea(comoBloques, canal, duraciones);

  process.stdout.write('  montando la pista…');
  const { duracionTotal } = await montarNarracion({
    segmentos: archivos.map((f, i) => ({ mp3: join(dirFuente, f), numero: i + 1 })),
    huecos: linea.huecos,
    outro: linea.outro,
    salidaMp3: join(salida, 'audio.mp3'),
    tmp: join(salida, '.tmp'),
  });
  console.log(' hecho.');

  const resultado = escribirSincronizacion({
    proyecto: comoBloques,
    salida,
    linea,
    alineaciones,
    duracionTotal,
  });

  escribirEstado(proyecto, 'audio', `importado de ${archivos.length} bloques`);

  titulo('Salida');
  console.log(`  audio.mp3       ${mmss(duracionTotal)}`);
  console.log(`  subtitles.srt   ${resultado.cues} subtitulos`);
  console.log(`  alignment.json  ${resultado.palabras} palabras`);
  console.log(`  timeline.json   ${linea.huecos.length} interludios + cierre de ${linea.outro.music_seconds}s`);
  console.log(c.dim('\nSin gasto de creditos de TTS. Listo para el render.'));
}

/** Reparte los parrafos entre N bloques usando los block_end del plan. */
function repartirParrafosEnBloques(proyecto, nBloques) {
  const cortes = (proyecto.plan?.events ?? [])
    .filter((e) => e.type === 'block_end')
    .map((e) => e.after)
    .sort((x, y) => x - y);

  if (cortes.length === nBloques - 1) {
    const bloques = [];
    let desde = 0;
    for (const corte of cortes) {
      bloques.push(rango(desde, corte));
      desde = corte;
    }
    bloques.push(rango(desde, proyecto.parrafos.length));
    return bloques;
  }

  // Sin marcas suficientes, reparto uniforme y aviso.
  console.log(
    c.ambar(
      `  ! El plan marca ${cortes.length} cierres de bloque para ${nBloques} audios. ` +
        'Reparto uniforme; revisa los subtitulos.'
    )
  );
  const porBloque = Math.ceil(proyecto.parrafos.length / nBloques);
  return Array.from({ length: nBloques }, (_, i) =>
    rango(i * porBloque, Math.min((i + 1) * porBloque, proyecto.parrafos.length))
  ).filter((b) => b.length);
}

const rango = (desde, hasta) => Array.from({ length: hasta - desde }, (_, i) => desde + i);

/** Traduce los eventos del plan a huecos entre bloques (indices de bloque). */
function eventosEntreBloques(proyecto, bloques) {
  const finDeBloque = new Map();
  bloques.forEach((b, i) => finDeBloque.set(b[b.length - 1] + 1, i + 1));

  const eventos = [];
  for (const ev of proyecto.plan?.events ?? []) {
    if (ev.at === 'end') {
      eventos.push(ev);
    } else if (finDeBloque.has(ev.after) && (ev.type === 'block_end' || ev.type === 'interlude')) {
      eventos.push({ ...ev, after: finDeBloque.get(ev.after) });
    }
  }
  return eventos;
}

// --- escritura de sincronizacion --------------------------------------

function escribirSincronizacion({ proyecto, salida, linea, alineaciones, duracionTotal }) {
  const palabras = [];
  linea.segmentos.forEach((seg, i) => {
    const al = alineaciones[i];
    if (al) palabras.push(...palabrasDesdeAlineacion(al, seg.inicio));
  });

  const cues = agruparEnSubtitulos(palabras, canal.subtitulos, linea.finNarracion);
  writeFileSync(join(salida, 'subtitles.srt'), renderSRT(cues, canal.subtitulos));

  writeFileSync(
    join(salida, 'alignment.json'),
    JSON.stringify(
      {
        proyecto: proyecto.id,
        duracion_total_s: duracionTotal,
        fuente: 'elevenlabs',
        segmentos: linea.segmentos.map((s) => ({
          numero: s.numero, inicio: s.inicio, fin: s.fin, duracion: s.duracion,
        })),
        palabras,
      },
      null, 2
    ) + '\n'
  );

  // Lo que consumira el renderer: cuando suena voz, cuando hay musica sola,
  // donde cambia la imagen y donde empieza el fade final.
  writeFileSync(
    join(salida, 'timeline.json'),
    JSON.stringify(
      {
        proyecto: proyecto.id,
        duracion_total_s: duracionTotal,
        fin_narracion_s: linea.finNarracion,
        segundos_narracion: linea.segundosNarracion,
        segundos_silencio: linea.segundosSilencio,
        segmentos: linea.segmentos,
        huecos: linea.huecos,
        imagenes: linea.imagenes,
        cierre: linea.outro,
      },
      null, 2
    ) + '\n'
  );

  return { cues: cues.length, palabras: palabras.length };
}

// --- estado -----------------------------------------------------------

async function cmdEstado(id) {
  const ids = id ? [id] : listarProyectos();
  if (!ids.length) {
    console.log('No hay proyectos en proyectos/');
    return;
  }
  titulo('Estado');
  for (const pid of ids) {
    try {
      const p = cargarProyecto(pid);
      const marca = p.estado.estado.startsWith('APPROVED') ? c.verde : c.dim;
      console.log(`  ${pid.padEnd(22)} ${marca(p.estado.estado)}  ${c.dim(`${p.parrafos.length} parrafos`)}`);
    } catch (e) {
      console.log(`  ${pid.padEnd(22)} ${c.rojo('error')}  ${c.dim(e.message)}`);
    }
  }
}

// --- entrada ----------------------------------------------------------

const AYUDA = `
${c.bold('Estudio — Oraciones Biblicas Diarias')}   ${c.dim('Checkpoint 1')}

  ${c.cian('sonda')}                    Mide el coste real por API (gasta ~130 creditos)
  ${c.cian('voces')}                    Lista las voces y sus IDs
  ${c.cian('estimar')}  <proyecto>      Valida el plan y estima. No gasta nada
  ${c.cian('revisar')}  <proyecto>      Informe doctrinal asistido. No gasta nada
  ${c.cian('aprobar-audio')} <proyecto> Marca APPROVED_FOR_AUDIO
  ${c.cian('voz')}      <proyecto>      Genera la voz. Exige aprobacion previa
  ${c.cian('importar')} <proyecto>      Alinea audio ya existente, sin generar voz
  ${c.cian('estado')}   [proyecto]      Muestra el estado

  Opciones:  --si    salta la confirmacion en 'voz'
`;

async function principal() {
  const [, , comando, arg, ...resto] = process.argv;
  const opciones = { si: resto.includes('--si') || arg === '--si' };

  const exigeProyecto = () => {
    if (!arg || arg.startsWith('--')) throw new Error(`"${comando}" necesita el nombre del proyecto.`);
    return arg;
  };

  switch (comando) {
    case 'sonda': return cmdSonda();
    case 'voces': return cmdVoces();
    case 'estimar': return cmdEstimar(exigeProyecto());
    case 'revisar': return cmdRevisar(exigeProyecto());
    case 'aprobar-audio': return cmdAprobarAudio(exigeProyecto(), resto.filter((r) => !r.startsWith('--')).join(' '));
    case 'voz': return cmdVoz(exigeProyecto(), opciones);
    case 'importar': return cmdImportar(exigeProyecto());
    case 'estado': return cmdEstado(arg && !arg.startsWith('--') ? arg : null);
    default:
      console.log(AYUDA);
      if (comando) process.exitCode = 1;
  }
}

principal().catch((e) => {
  console.error(`\n${c.rojo('Error:')} ${e.message}`);
  process.exitCode = 1;
});
