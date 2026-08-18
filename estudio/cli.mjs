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

import { readFileSync, writeFileSync, existsSync, readdirSync, rmSync, mkdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { cargarCanal, cargarEnv, cargarCalibracion, guardarCalibracion, registrarMedida, constantes } from './lib/config.mjs';
import { ElevenLabs, esperarConsumo } from './lib/elevenlabs.mjs';
import { cargarProyecto, listarProyectos, escribirEstado, exigirEstado, asegurarSalida } from './lib/proyecto.mjs';
import { validarPlan, construirLinea } from './lib/plan.mjs';
import { estimar, comparar, mmss, miles } from './lib/estimacion.mjs';
import { palabrasDesdeAlineacion, agruparEnSubtitulos, renderSRT } from './lib/srt.mjs';
import { revisar, CHECKLIST } from './lib/revision.mjs';
import { validarImportacion } from './lib/validacion.mjs';
import { repartirPorDuracion, construirPlan } from './lib/autoplan.mjs';
import { tiemposPorParrafo, puntosDeCorte, tramosDelBloque, palabrasDelTramo } from './lib/troceo.mjs';
import { montarNarracion, montarTramos, duracionSegundos } from './lib/audio.mjs';
import { generarRevision } from './lib/previsualizar.mjs';
import { generarCama, nivelEn } from './lib/musica.mjs';
import { generarLoop } from './lib/particulas.mjs';
import { renderizar } from './lib/renderer.mjs';

const canal = cargarCanal();
const env = cargarEnv();

// --- presentacion -----------------------------------------------------

// Sin color cuando la salida no es un terminal: en un log de CI o en el
// resumen de GitHub, los codigos ANSI se ven como basura.
const COLOR = stdout.isTTY && !env.NO_COLOR;
const pinta = (codigo) => (s) => (COLOR ? `\x1b[${codigo}m${s}\x1b[0m` : String(s));

const c = {
  bold: pinta(1),
  dim: pinta(2),
  rojo: pinta(31),
  verde: pinta(32),
  ambar: pinta(33),
  cian: pinta(36),
};

const titulo = (t) => console.log(`\n${c.bold(t)}\n${'─'.repeat(t.length)}`);

/**
 * Ultima barrera antes de imprimir: si por cualquier via un secreto acabara
 * dentro de un mensaje de error (una traza de red, un cuerpo de respuesta que
 * lo refleje), no sale por pantalla ni queda en el scrollback del terminal.
 */
function redactar(texto) {
  let s = String(texto ?? '');
  for (const clave of ['ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID']) {
    const valor = env[clave];
    if (valor && valor.length >= 8) s = s.split(valor).join(`«${clave} oculta»`);
  }
  return s;
}

/** Muestra solo los ultimos 4 caracteres, para poder confirmar cual se cargo. */
const huella = (valor) => (valor ? `…${valor.slice(-4)} (${valor.length} caracteres)` : '—');

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
  const ajustes = canal.voz.ajustes;

  const TEXTO =
    'Padre, gracias por este dia nuevo y por tu fidelidad constante. ' +
    'Antes de que empiece lo que tengo por delante, quiero ponerlo en tus manos: ' +
    'lo que me ilusiona y tambien lo que me pesa. Dame paz para lo que no puedo ' +
    'resolver hoy, y diligencia para lo que si depende de mi.';
  const CONTEXTO = 'Antes de dormir, entrega a Dios lo que hoy te preocupa.';

  titulo('Sonda de creditos');
  console.log(`Modelo          ${c.cian(modelo)}`);
  console.log(`Voice ID        ${voz}`);
  console.log(`Texto           "${TEXTO}"`);
  console.log(`Caracteres      ${TEXTO.length}`);
  console.log(`Ajustes         speed ${ajustes.speed} · stability ${ajustes.stability} · ` +
    `similarity ${ajustes.similarity_boost} · style ${ajustes.style} · ` +
    `speaker_boost ${ajustes.use_speaker_boost ? 'on' : 'off'}`);

  let datosVoz = null;
  try {
    datosVoz = await el.voz(voz);
    console.log(`Voz             ${c.bold(datosVoz.nombre)} ${c.dim(`(${datosVoz.categoria})`)}`);
  } catch (e) {
    console.log(c.ambar(`  ! No se pudieron leer los datos de la voz: ${redactar(e.message)}`));
  }

  const antes = await el.suscripcion();
  console.log(`\nPlan ${c.bold(antes.plan)} — usados ${miles(antes.usados)} de ${miles(antes.limite)}`);

  // Medida 1: llamada limpia, sin contexto de prosodia.
  process.stdout.write('\nGenerando muestra sin contexto… ');
  const r1 = await el.vozConTiempos({
    voiceId: voz, texto: TEXTO, modelo, ajustes,
    formatoSalida: canal.api.formato_salida,
  });
  console.log(c.verde('hecho'));
  process.stdout.write('  esperando a que el contador se actualice… ');
  const m1 = await esperarConsumo(el, antes.usados);
  const tras1 = m1.sub;
  const coste1 = tras1.usados - antes.usados;
  console.log(m1.estable ? c.verde(`estable en ${m1.segundos}s`)
    : m1.movio ? c.ambar(`seguia subiendo tras ${m1.segundos}s`)
    : c.ambar('sin cambio'));

  // Medida 2: mismo texto narrado, ahora con contexto vecino a ambos lados.
  process.stdout.write('Generando muestra con contexto…  ');
  await el.vozConTiempos({
    voiceId: voz, texto: TEXTO, modelo, ajustes,
    formatoSalida: canal.api.formato_salida,
    previoTexto: CONTEXTO, siguienteTexto: CONTEXTO,
  });
  console.log(c.verde('hecho'));
  process.stdout.write('  esperando a que el contador se actualice… ');
  const m2 = await esperarConsumo(el, tras1.usados);
  const tras2 = m2.sub;
  const coste2 = tras2.usados - tras1.usados;
  console.log(m2.estable ? c.verde(`estable en ${m2.segundos}s`)
    : m2.movio ? c.ambar(`seguia subiendo tras ${m2.segundos}s`)
    : c.ambar('sin cambio'));

  // Duracion medida del archivo real, no deducida de la alineacion.
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const dirTmp = mkdtempSync(join(tmpdir(), 'sonda-'));
  const rutaMuestra = join(dirTmp, 'muestra.mp3');
  writeFileSync(rutaMuestra, r1.audio);
  const segundos = await duracionSegundos(rutaMuestra);

  if (!m1.movio || !m1.estable || coste1 <= 0) {
    titulo('No se pudo medir');
    console.log(c.rojo(
      m1.movio
        ? `El contador seguia subiendo tras ${m1.segundos}s: la medida seria un cobro parcial.`
        : `El contador no se movio en ${m1.segundos}s pese a que el audio si se genero ` +
          `(${segundos.toFixed(2)} s).`
    ));
    console.log('ElevenLabs actualiza el consumo de forma asincrona y esta vez tardo mas de la cuenta.');
    console.log(c.dim('Vuelve a lanzar la sonda en unos minutos. No se guarda ninguna calibracion.'));
    console.log(`\nPlan ${antes.plan} — usados ${miles(antes.usados)} de ${miles(antes.limite)}`);
    console.log(`Ritmo medido (si es valido)  ${Math.round((TEXTO.length / segundos) * 60)} caracteres/minuto`);
    rmSync(dirTmp, { recursive: true, force: true });
    process.exitCode = 1;
    return;
  }

  const ratio = coste1 / TEXTO.length;
  const extra = coste2 - coste1;
  const contextoFacturado = extra > Math.max(2, TEXTO.length * 0.05);
  const carPorMin = Math.round((TEXTO.length / segundos) * 60);

  titulo('Resultado');
  console.log(`Creditos antes             ${miles(antes.usados)}`);
  console.log(`Creditos despues           ${miles(tras1.usados)}`);
  console.log(`Creditos consumidos        ${c.bold(String(coste1))}`);
  console.log(`Costo efectivo             ${c.bold(ratio.toFixed(3))} creditos/caracter`);
  console.log(
    ratio <= 0.6
      ? c.verde('  → El descuento de Flash SI aplica por API. Capacidad mensual al doble.')
      : ratio >= 0.9
        ? c.ambar('  → Flash cobra 1:1 tambien por API, igual que en la web (879 = 879).')
        : c.ambar('  → Ratio intermedio; conviene repetir la sonda con otro texto.')
  );

  console.log(`\nCon contexto de prosodia   ${coste2} creditos (${extra >= 0 ? '+' : ''}${extra})`);
  console.log(
    contextoFacturado
      ? c.ambar(`  → previous_text/next_text SI se facturan. Usarlos solo donde la union se note.`)
      : c.verde('  → previous_text/next_text NO se facturan. Segmentamos con contexto sin penalizacion.')
  );

  console.log(`\nDuracion del audio         ${segundos.toFixed(2)} s`);
  console.log(`Ritmo medido               ${carPorMin} caracteres/minuto`);
  console.log(c.dim(
    `  A este ritmo, los ${miles(antes.limite)} creditos del ciclo dan ` +
    `${(antes.limite / ratio / carPorMin).toFixed(0)} min de narracion`
  ));

  rmSync(dirTmp, { recursive: true, force: true });

  const registro = {
    fecha: new Date().toISOString(),
    modelo,
    voice_id: voz,
    voz_nombre: datosVoz?.nombre ?? null,
    ajustes_enviados: ajustes,
    ajustes_guardados_en_la_voz: datosVoz?.ajustes_guardados ?? null,
    caracteres_enviados: TEXTO.length,
    creditos_antes: antes.usados,
    creditos_despues: tras1.usados,
    creditos_consumidos: coste1,
    costo_por_caracter: ratio,
    creditos_con_contexto: coste2,
    contexto_facturado: contextoFacturado,
    duracion_audio_s: segundos,
    caracteres_por_minuto: carPorMin,
    plan: antes.plan,
    limite_del_ciclo: antes.limite,
  };

  const cal = cargarCalibracion();
  cal.sonda = registro;
  registrarMedida(cal, {
    origen: 'sonda',
    modelo,
    caracteres: TEXTO.length,
    creditos: coste1,
    creditos_por_caracter: ratio,
    segundos,
  });
  guardarCalibracion(cal);

  console.log(c.dim('\nGuardado en calibracion.json (fuera de git). "estimar" ya usa estos numeros.'));
  console.log(c.bold('\nSonda terminada. No se ha generado ningun video.'));
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
  for (const n of validacion.notas ?? []) console.log(c.dim(`  · ${n}`));
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

// --- plan automatico --------------------------------------------------

/**
 * Genera edit_plan.json deduciendo los limites de bloque de los audios.
 *
 * Se niega a pisar un plan existente: si ya hay uno escrito a mano, esa es la
 * verdad editorial y no la sobreescribe una heuristica.
 */
async function cmdPlanAuto(id, opciones = {}) {
  const proyecto = cargarProyecto(id);
  const rutaPlan = join(proyecto.dir, 'edit_plan.json');

  const yaExiste = existsSync(rutaPlan);
  if (yaExiste && !opciones.forzar && !opciones.comparar) {
    console.log(c.ambar(`${id}/edit_plan.json ya existe; no lo toco.`));
    console.log(c.dim('  Usa --forzar para regenerarlo, o --comparar para contrastarlo.'));
    return;
  }

  const dirFuente = join(proyecto.dir, 'audio_fuente');
  if (!existsSync(dirFuente)) throw new Error(`Falta ${id}/audio_fuente/`);
  const archivos = readdirSync(dirFuente).filter((f) => /\.(mp3|wav|m4a)$/i.test(f)).sort();
  if (!archivos.length) throw new Error(`No hay audio en ${dirFuente}`);

  titulo(`Plan automatico — ${id}`);
  const duraciones = [];
  for (const f of archivos) duraciones.push(await duracionSegundos(join(dirFuente, f)));

  const { bloques, diagnostico } = repartirPorDuracion(proyecto.parrafos, duraciones);
  const pilar = opciones.pilar ?? 'noche';
  const plan = construirPlan({ id, pilar, parrafos: proyecto.parrafos, bloques, canal });

  console.log(`Parrafos ${proyecto.parrafos.length} · audios ${archivos.length} · pilar ${pilar}\n`);
  console.log('  bloque  parrafos   audio     caracteres  vs esperado   car/min');
  for (const d of diagnostico) {
    const desvio = `${d.desvioPct >= 0 ? '+' : ''}${d.desvioPct.toFixed(1)}%`;
    const marca = Math.abs(d.desvioPct) <= 12 ? c.verde('ok') : c.ambar('!!');
    console.log(
      `  ${String(d.bloque).padStart(6)}  ${`${d.parrafos[0]}-${d.parrafos[1]}`.padEnd(9)} ` +
      `${mmss(d.segundos).padStart(6)}  ${String(d.caracteres).padStart(10)}  ` +
      `${desvio.padStart(11)}   ${String(d.caracteresPorMinuto).padStart(7)} ${marca}`
    );
  }

  const fuera = diagnostico.filter((d) => Math.abs(d.desvioPct) > 12);
  if (fuera.length) {
    console.log(c.ambar(
      `\n  ! ${fuera.length} bloque(s) se desvian mas de un 12% de lo esperado por duracion.`
    ));
    console.log(c.dim('    La alineacion posterior lo confirmara: si un limite estuviera mal,'));
    console.log(c.dim('    "sin_drift_acumulativo" fallaria. Revisa el reparto si eso ocurre.'));
  }

  // Con un plan escrito a mano, la inferencia no manda: solo contrasta. Si los
  // limites del autor y los que sugiere el audio discrepan mucho, es senal de
  // que uno de los dos no corresponde a este material, y vale la pena mirarlo
  // antes de gastar una alineacion entera.
  if (yaExiste && opciones.comparar) {
    const manual = (proyecto.plan?.events ?? [])
      .filter((e) => e.type === 'block_end')
      .map((e) => e.after)
      .sort((x, y) => x - y);
    const inferidos = bloques.slice(0, -1).map((b) => b[b.length - 1] + 1);

    titulo('Contraste con los limites del guion');
    console.log(`  Del autor   [${manual.join(', ')}]`);
    console.log(`  Inferidos   [${inferidos.join(', ')}]`);

    if (manual.length !== inferidos.length) {
      console.log(c.ambar('  ! Distinto numero de cortes; no son comparables.'));
    } else {
      const difs = manual.map((m, i) => Math.abs(m - inferidos[i]));
      const peor = Math.max(...difs);
      console.log(`  Diferencia  [${difs.join(', ')}] parrafos · maxima ${peor}`);
      console.log(
        peor <= 5
          ? c.verde('  ✓ Coinciden. Los limites del autor cuadran con las duraciones del audio.')
          : c.ambar(
              `  ! Se separan hasta ${peor} parrafos. Manda el plan del autor, pero si la\n` +
              '    alineacion falla "sin_drift_acumulativo", este es el primer sitio donde mirar.'
            )
      );
    }
    console.log(c.dim('\n  No se ha modificado edit_plan.json.'));
    return;
  }

  const estrategicos = plan.events.filter((e) => e.seconds >= canal.reglas_edicion.interludio_versiculo_min).length;
  writeFileSync(rutaPlan, JSON.stringify(plan, null, 2) + '\n');

  console.log(`\n  ${plan.events.length - 1} eventos + cierre · ${estrategicos} interludios estrategicos`);
  console.log(c.dim(`  Escrito en ${id}/edit_plan.json`));
  console.log(c.dim('\n  En audio ya generado solo se insertan los interludios ENTRE bloques y el'));
  console.log(c.dim('  cierre: las pausas internas ya vienen grabadas en cada mp3.'));
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

  const validacionPlan = validarPlan(proyecto, canal);
  if (validacionPlan.problemas.length) {
    titulo('El plan de edicion tiene errores');
    for (const x of validacionPlan.problemas) console.log(c.rojo(`  ✗ ${x}`));
    process.exitCode = 1;
    return;
  }

  const bloques = repartirParrafosEnBloques(proyecto, archivos.length);
  const finDeBloque = new Set(bloques.map((b) => b[b.length - 1] + 1));

  titulo(`Importar audio — ${proyecto.id}`);
  console.log(`Bloques de audio    ${archivos.length}`);
  console.log(`Parrafos            ${proyecto.parrafos.length}`);
  bloques.forEach((b, i) => {
    console.log(c.dim(`  bloque ${i + 1}: ${archivos[i]} ← parrafos ${b[0] + 1}-${b[b.length - 1] + 1}`));
  });

  const el = cliente();
  const alineaciones = [];
  const duraciones = [];

  for (const [i, archivo] of archivos.entries()) {
    process.stdout.write(`\r  alineando bloque ${i + 1}/${archivos.length}…    `);
    const ruta = join(dirFuente, archivo);
    const texto = bloques[i].map((idx) => proyecto.parrafos[idx]).join(' ');
    alineaciones.push(await el.alinear({ audio: readFileSync(ruta), nombreArchivo: archivo, texto }));
    duraciones.push(await duracionSegundos(ruta));
  }
  console.log(`\r  ${archivos.length} bloques alineados.          `);

  // Los huecos que NO caen en un final de bloque exigen partir el audio por
  // dentro. La alineacion dice en que segundo termina cada parrafo, asi que el
  // corte se lee en vez de estimarse.
  const internos = (proyecto.plan.events ?? [])
    .filter((e) => e.at !== 'end' && e.seconds > 0 && !finDeBloque.has(e.after))
    .map((e) => e.after);

  const tramos = [];
  const palabrasPorTramo = [];
  const detalleCortes = [];

  bloques.forEach((b, k) => {
    const textos = b.map((idx) => proyecto.parrafos[idx]);
    const palabras = palabrasDesdeAlineacion(alineaciones[k], 0);
    const tiempos = tiemposPorParrafo(palabras, textos);

    const indices = internos
      .filter((n) => b.includes(n - 1))
      .map((n) => b.indexOf(n - 1));
    const cortes = puntosDeCorte(tiempos, indices, duraciones[k]);

    for (const corte of cortes) {
      detalleCortes.push({
        parrafo: b[corte.trasIndice] + 1,
        bloque: k + 1,
        en: corte.en,
        silencioNatural: corte.silencioNatural,
      });
    }

    for (const t of tramosDelBloque({
      bloque: k + 1, archivo: join(dirFuente, archivos[k]),
      parrafos: b, tiempos, cortes, duracion: duraciones[k],
    })) {
      tramos.push({ ...t, palabras });
    }
  });

  if (internos.length) {
    console.log(`  ${detalleCortes.length} corte(s) interno(s), en la frontera exacta entre parrafos:`);
    for (const d of detalleCortes) {
      console.log(c.dim(
        `    tras el parrafo ${d.parrafo} (bloque ${d.bloque}) en ${mmss(d.en)} del bloque · ` +
        `silencio natural ${d.silencioNatural.toFixed(2)}s`
      ));
    }
  }

  // Proyecto sintetico donde cada "parrafo" es un TRAMO, para que la linea de
  // tiempo y los huecos se calculen con el mismo codigo de siempre.
  const finDeTramo = new Map();
  tramos.forEach((t, i) => finDeTramo.set(t.trasParrafoGlobal + 1, i + 1));

  const eventos = [];
  for (const ev of proyecto.plan.events ?? []) {
    if (ev.at === 'end') { eventos.push(ev); continue; }
    if (!(ev.seconds > 0)) continue;
    const enTramo = finDeTramo.get(ev.after);
    if (enTramo == null) {
      console.log(c.rojo(`  ✗ El hueco tras el parrafo ${ev.after} no cae en ninguna frontera de tramo.`));
      process.exitCode = 1;
      return;
    }
    eventos.push({ ...ev, after: enTramo });
  }

  const comoTramos = {
    ...proyecto,
    parrafos: tramos.map((t) => t.parrafos.map((i) => proyecto.parrafos[i]).join(' ')),
    plan: { ...proyecto.plan, defaults: { pause_after_paragraph: 0 }, events: eventos },
  };

  const salida = asegurarSalida(proyecto);

  process.stdout.write('  montando la pista…');
  const { duraciones: durTramos, duracionTotal } = await montarTramos({
    tramos,
    huecos: construirLinea(comoTramos, canal, tramos.map((t) => t.hasta - t.desde)).huecos,
    outro: { music_seconds: proyecto.plan.events.find((e) => e.at === 'end')?.music_seconds ?? 0 },
    salidaMp3: join(salida, 'audio.mp3'),
    tmp: join(salida, '.tmp'),
  });
  console.log(' hecho.');

  const linea = construirLinea(comoTramos, canal, durTramos);
  linea.segmentos.forEach((seg, i) => {
    palabrasPorTramo.push(palabrasDelTramo(tramos[i].palabras, tramos[i], seg.inicio));
  });

  const resultado = escribirSincronizacion({
    proyecto: comoTramos, salida, linea,
    palabrasPorSegmento: palabrasPorTramo,
    duracionTotal,
  });

  // Silencio de cola de cada tramo: cuanto audio queda tras su ultima palabra.
  // Si la alineacion derivara, este margen se volveria negativo.
  const colas = linea.segmentos.map((seg, i) => {
    const ps = palabrasPorTramo[i];
    return ps?.length ? seg.fin - ps[ps.length - 1].fin : null;
  });

  const informe = validarImportacion({
    archivos, bloques, proyecto, plan: proyecto.plan, linea,
    alineaciones: palabrasPorTramo.map((ps) => ({ palabras: ps })),
    duracionesBloques: durTramos,
    colas,
    cues: resultado.listaCues,
    duracionAudio: duracionTotal,
  });

  titulo('Validacion');
  for (const x of informe.pruebas) {
    console.log(`  ${x.ok ? c.verde('✓') : c.rojo('✗')} ${x.id.padEnd(32)} ${c.dim(x.detalle)}`);
  }

  writeFileSync(
    join(salida, 'validacion.json'),
    JSON.stringify({ fecha: new Date().toISOString(), proyecto: proyecto.id, ...informe }, null, 2) + '\n'
  );

  titulo('Interludios colocados');
  for (const h of linea.huecos) {
    const t = tramos[h.trasParrafo - 1];
    const parrafo = t.trasParrafoGlobal + 1;
    const frase = proyecto.parrafos[t.trasParrafoGlobal].replace(/\s+/g, ' ');
    const ev = (proyecto.plan.events ?? []).find((e) => e.after === parrafo);
    console.log(
      `  ${mmss(h.inicio).padStart(6)}  ${String(h.duracion).padStart(4)}s  tras el parrafo ${parrafo}` +
      (ev?.note ? c.dim(`  — ${ev.note}`) : '')
    );
    console.log(c.dim(`          «${frase.length > 96 ? frase.slice(0, 96) + '…' : frase}»`));
  }
  const cierre = linea.outro.music_seconds;
  if (cierre > 0) {
    console.log(`  ${mmss(linea.finNarracion).padStart(6)}  ${String(cierre).padStart(4)}s  cierre tras «${proyecto.parrafos[proyecto.parrafos.length - 1]}»`);
  }

  titulo('Salida');
  console.log(`  audio.mp3       ${mmss(duracionTotal)}`);
  console.log(`  subtitles.srt   ${resultado.cues} subtitulos`);
  console.log(`  timeline.json   ${linea.huecos.length} interludios + cierre de ${cierre}s`);
  console.log(c.dim(`  alignment.json  ${resultado.palabras} palabras (fuente de sincronia)`));

  if (informe.ok) {
    escribirEstado(proyecto, 'audio', `${tramos.length} tramos, ${linea.huecos.length} interludios`);
    console.log(c.verde('\n✓ Las 8 comprobaciones pasan. Sin gasto de creditos de TTS.'));
  } else {
    console.log(c.rojo(`\n✗ ${informe.fallos} comprobacion(es) fallan.`));
    process.exitCode = 1;
  }
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

function escribirSincronizacion({
  proyecto, salida, linea, alineaciones, palabrasPorSegmento, duracionTotal,
}) {
  // Los subtitulos se agrupan POR SEGMENTO, no sobre la palabra suelta de todo
  // el video. Asi ninguno puede cruzar una frontera de bloque ni alargarse
  // dentro de un interludio: cada uno queda encerrado en el audio del que sale.
  const palabras = [];
  const cues = [];
  linea.segmentos.forEach((seg, i) => {
    const suyas = palabrasPorSegmento
      ? palabrasPorSegmento[i]
      : alineaciones?.[i] && palabrasDesdeAlineacion(alineaciones[i], seg.inicio);
    if (!suyas?.length) return;
    palabras.push(...suyas);
    cues.push(...agruparEnSubtitulos(suyas, canal.subtitulos, seg.fin));
  });
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

  return { cues: cues.length, palabras: palabras.length, listaCues: cues };
}

// --- video de revision ------------------------------------------------

/**
 * MP4 minimo para revisar la sincronia a ojo: negro, voz y subtitulos quemados.
 * No es el renderer y no pretende parecerse al video final.
 */
async function cmdPrevisualizar(id) {
  const proyecto = cargarProyecto(id);
  const salida = proyecto.salida;

  const audio = join(salida, 'audio.mp3');
  const srt = join(salida, 'subtitles.srt');
  const rutaTimeline = join(salida, 'timeline.json');

  if (!existsSync(audio) || !existsSync(srt)) {
    throw new Error(
      `Faltan ${id}/output/audio.mp3 o subtitles.srt.\n` +
      `  Ejecuta antes:  node cli.mjs importar ${id}`
    );
  }

  const timeline = existsSync(rutaTimeline)
    ? JSON.parse(readFileSync(rutaTimeline, 'utf8'))
    : null;

  titulo(`Video de revision — ${id}`);
  process.stdout.write('  codificando…');
  const r = await generarRevision({
    audio, srt, timeline, salida: join(salida, 'revision.mp4'),
  });
  console.log(' hecho.');

  const bytes = (await import('node:fs')).statSync(join(salida, 'revision.mp4')).size;
  console.log(`  revision.mp4    ${mmss(r.segundos)} · ${(bytes / 1048576).toFixed(1)} MB`);
  console.log(`  ${r.marcas} interludios marcados en pantalla`);
  console.log(c.dim('\n  Negro, voz y subtitulos. Sin imagen, particulas, musica ni efectos:'));
  console.log(c.dim('  sirve para juzgar CUANDO aparece el texto, nada mas.'));
}

// --- muestra del renderer ---------------------------------------------

/**
 * Renderiza una ventana corta del video con todo lo que llevara el final:
 * imagen con movimiento, particulas, voz y cama musical con su ducking.
 *
 * La ventana se elige alrededor de un interludio y con voz a los dos lados,
 * porque lo que hay que juzgar no es un fotograma bonito sino la transicion:
 * como sube la musica cuando calla la voz y como vuelve a bajar.
 */
async function cmdMuestra(id, opciones = {}) {
  const proyecto = cargarProyecto(id);
  const salida = asegurarSalida(proyecto);
  const rutaTimeline = join(salida, 'timeline.json');
  const voz = join(salida, 'audio.mp3');

  if (!existsSync(rutaTimeline) || !existsSync(voz)) {
    throw new Error(`Faltan ${id}/output/timeline.json o audio.mp3. Ejecuta antes: importar ${id}`);
  }

  const imagen = opciones.imagen ?? join(proyecto.dir, 'escena_nocturna.png');
  if (!existsSync(imagen)) throw new Error(`No existe la imagen de fondo: ${imagen}`);

  const timeline = JSON.parse(readFileSync(rutaTimeline, 'utf8'));
  const cfg = canal.render;

  // Ventana: alrededor del interludio pedido, con voz antes y despues.
  const largos = timeline.huecos.filter((h) => h.duracion >= 10);
  const elegido = opciones.interludio != null
    ? timeline.huecos[opciones.interludio - 1]
    : (largos[0] ?? timeline.huecos[0]);
  if (!elegido) throw new Error('El timeline no tiene interludios.');

  const dur = opciones.duracion ?? 80;
  const antes = Math.min(34, (dur - elegido.duracion) / 2);
  const desde = opciones.desde ?? Math.max(0, elegido.inicio - antes);

  titulo(`Muestra del renderer — ${id}`);
  console.log(`Imagen          ${basename(imagen)}`);
  console.log(`Ventana         ${mmss(desde)} → ${mmss(desde + dur)}  (${dur}s de ${mmss(timeline.duracion_total_s)})`);
  console.log(`Interludio      ${elegido.duracion}s en ${mmss(elegido.inicio)}, tras el parrafo ${elegido.trasParrafo}`);
  console.log(`Salida          ${cfg.ancho}x${cfg.alto} · ${cfg.fps} fps · crf ${cfg.crf}`);
  if (opciones.recorrido) {
    console.log(c.ambar('Modo recorrido  el zoom de los 32:41 comprimido en esta ventana'));
    console.log(c.dim('                No es la velocidad real: sirve para ver cuanto viaja el encuadre.'));
  }

  const tmp = join(salida, '.tmp-muestra');
  mkdirSync(tmp, { recursive: true });

  process.stdout.write('\n  particulas…');
  const loop = join(tmp, 'motas.mov');
  const p = await generarLoop({
    salida: loop, ancho: cfg.ancho, alto: cfg.alto, fps: cfg.fps,
    periodo: cfg.particulas.periodo_s, cuantas: cfg.particulas.cuantas,
  });
  console.log(` ${p.motas} motas, bucle de ${p.periodo}s`);

  process.stdout.write('  cama musical…');
  const m = cfg.musica;
  const envolvente = (t) => nivelEn(t, {
    huecos: timeline.huecos,
    finNarracion: timeline.fin_narracion_s,
    cierre: {
      fadeIn: m.fade_in_s,
      fadeOut: timeline.cierre?.fade_out ?? 8,
      duracionTotal: timeline.duracion_total_s,
    },
    bajoVoz: m.bajo_voz_db, enInterludio: m.en_interludio_db, rampa: m.rampa_s,
  });
  const wav = join(tmp, 'cama.wav');
  generarCama({ segundos: dur, offset: desde, envolvente, salidaWav: wav });
  console.log(` ${m.bajo_voz_db} dB bajo la voz, ${m.en_interludio_db} dB en interludio`);

  process.stdout.write('  render…');
  const destino = join(salida, opciones.recorrido ? 'muestra-recorrido.mp4' : 'muestra.mp4');
  await renderizar({
    imagen, particulas: loop, voz, musica: wav, salida: destino,
    desde, duracion: dur, duracionTotal: timeline.duracion_total_s,
    ancho: cfg.ancho, alto: cfg.alto, fps: cfg.fps,
    zoomTotal: cfg.zoom_total, foco: cfg.foco, crf: cfg.crf, preset: cfg.preset,
    srt: canal.render.subtitulos_quemados ? join(salida, 'subtitles.srt') : null,
    recorridoCompleto: Boolean(opciones.recorrido),
  });
  const bytes = statSync(destino).size;
  console.log(` hecho · ${(bytes / 1048576).toFixed(1)} MB`);

  rmSync(tmp, { recursive: true, force: true });

  titulo('Que revisar');
  console.log('  1. Nitidez de la imagen al ampliarla');
  console.log('  2. Velocidad del movimiento: debe ser casi imperceptible');
  console.log('  3. Particulas: deben insinuarse, no llamar la atencion');
  console.log(`  4. Volumen de la cama bajo la voz`);
  console.log(`  5. Como sube en el interludio de ${mmss(elegido.inicio - desde)} a ` +
    `${mmss(elegido.inicio - desde + elegido.duracion)} de la muestra`);
}

// --- resumen seguro ---------------------------------------------------

/**
 * Vuelca la calibracion en un formato apto para publicar (log de CI, artifact).
 *
 * calibracion.json nunca contiene la clave, pero si el voice_id. No es una
 * credencial, pero tampoco hace falta que salga entero de la maquina: aqui se
 * reduce a sus ultimos 4 caracteres, suficiente para saber que voz se midio.
 */
function sanearCalibracion(cal) {
  const acortar = (v) => (typeof v === 'string' && v.length > 4 ? `…${v.slice(-4)}` : v ?? null);
  const s = cal.sonda;

  return {
    generado: new Date().toISOString(),
    creditos_por_caracter: cal.creditos_por_caracter,
    caracteres_por_minuto: cal.caracteres_por_minuto,
    sonda: s
      ? {
          fecha: s.fecha,
          modelo: s.modelo,
          voz_nombre: s.voz_nombre,
          voice_id: acortar(s.voice_id),
          ajustes_enviados: s.ajustes_enviados,
          ajustes_guardados_en_la_voz: s.ajustes_guardados_en_la_voz,
          caracteres_enviados: s.caracteres_enviados,
          creditos_antes: s.creditos_antes,
          creditos_despues: s.creditos_despues,
          creditos_consumidos: s.creditos_consumidos,
          costo_por_caracter: s.costo_por_caracter,
          creditos_con_contexto: s.creditos_con_contexto,
          contexto_facturado: s.contexto_facturado,
          duracion_audio_s: s.duracion_audio_s,
          caracteres_por_minuto: s.caracteres_por_minuto,
          plan: s.plan,
          limite_del_ciclo: s.limite_del_ciclo,
        }
      : null,
    medidas: (cal.medidas ?? []).map((m) => ({ ...m, voice_id: undefined })),
  };
}

async function cmdResumen(destino) {
  const cal = cargarCalibracion();
  const limpio = sanearCalibracion(cal);
  const s = limpio.sonda;

  titulo('Resumen de calibracion');
  if (!s) {
    console.log(c.ambar('Todavia no se ha ejecutado la sonda.'));
    process.exitCode = 1;
    return;
  }

  console.log(`Modelo                     ${s.modelo}`);
  console.log(`Voz                        ${s.voz_nombre ?? '—'} (${s.voice_id})`);
  console.log(`Plan                       ${s.plan} · limite ${miles(s.limite_del_ciclo)}`);
  console.log('');
  console.log(`Caracteres enviados        ${s.caracteres_enviados}`);
  console.log(`Creditos antes             ${miles(s.creditos_antes)}`);
  console.log(`Creditos despues           ${miles(s.creditos_despues)}`);
  console.log(`Creditos consumidos        ${c.bold(String(s.creditos_consumidos))}`);
  console.log(`Costo por caracter         ${c.bold(s.costo_por_caracter.toFixed(3))}`);
  console.log(`Con contexto de prosodia   ${s.creditos_con_contexto} ` +
    `(${s.contexto_facturado ? 'SE FACTURA' : 'no se factura'})`);
  console.log(`Duracion del audio         ${s.duracion_audio_s.toFixed(2)} s`);
  console.log(`Ritmo                      ${s.caracteres_por_minuto} caracteres/minuto`);

  const medible = s.costo_por_caracter > 0 && s.caracteres_por_minuto > 0;
  console.log('');
  if (medible) {
    const minutosPorCiclo = s.limite_del_ciclo / s.costo_por_caracter / s.caracteres_por_minuto;
    console.log(`Capacidad del ciclo        ${c.bold(minutosPorCiclo.toFixed(0))} minutos de narracion`);
    console.log(c.dim(`  ≈ ${(minutosPorCiclo / 37).toFixed(1)} nocturnos de 37 min, o ` +
      `${(minutosPorCiclo / 18).toFixed(1)} videos de manana de 20 min`));
  } else {
    console.log(c.ambar('Capacidad del ciclo        no calculable: la tarifa medida es cero'));
  }

  if (destino) {
    writeFileSync(destino, JSON.stringify(limpio, null, 2) + '\n');
    console.log(c.dim(`\nEscrito en ${destino} (sin clave; voice_id acortado)`));
  }
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
  ${c.cian('plan-auto')} <proyecto>     Deduce edit_plan.json de las duraciones del audio\n  ${c.cian('importar')} <proyecto>      Alinea audio ya existente, sin generar voz
  ${c.cian('previsualizar')} <proyecto> MP4 de revision: negro + voz + subtitulos\n  ${c.cian('muestra')}  <proyecto>      Ventana corta con imagen, movimiento, motas y musica\n  ${c.cian('resumen')}  [--json <ruta>] Calibracion en formato publicable
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
    case 'plan-auto': return cmdPlanAuto(exigeProyecto(), {
      forzar: resto.includes('--forzar'),
      comparar: resto.includes('--comparar'),
      pilar: resto.includes('--pilar') ? resto[resto.indexOf('--pilar') + 1] : undefined,
    });
    case 'importar': return cmdImportar(exigeProyecto());
    case 'previsualizar': return cmdPrevisualizar(exigeProyecto());
    case 'muestra': {
      const num = (f) => { const i = resto.indexOf(f); return i > -1 ? Number(resto[i + 1]) : undefined; };
      return cmdMuestra(exigeProyecto(), {
        desde: num('--desde'), duracion: num('--duracion'), interludio: num('--interludio'),
        recorrido: resto.includes('--recorrido'),
      });
    }
    case 'resumen': {
      const i = process.argv.indexOf('--json');
      return cmdResumen(i > -1 ? process.argv[i + 1] : null);
    }
    case 'estado': return cmdEstado(arg && !arg.startsWith('--') ? arg : null);
    default:
      console.log(AYUDA);
      if (comando) process.exitCode = 1;
  }
}

principal().catch((e) => {
  console.error(`\n${c.rojo('Error:')} ${redactar(e.message)}`);
  process.exitCode = 1;
});
