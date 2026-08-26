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

import { readFileSync, writeFileSync, existsSync, readdirSync, rmSync, mkdirSync, statSync, renameSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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
import { montarNarracion, montarTramos, duracionSegundos, rutaFfmpeg, ejecutar, auditarSilenciosNoDeclarados } from './lib/audio.mjs';
import { generarRevision } from './lib/previsualizar.mjs';
import { generarCama, nivelEn, aperturaEn, planearPiano, DECAE_PIANO } from './lib/musica.mjs';
import { inspeccionarVideo, huellaVideo, remuxarAudio, desfaseAudio } from './lib/remux.mjs';
import {
  diagnosticar, repararContenedor, pruebaDecodificacion, decodificarTodo,
} from './lib/diagnostico.mjs';
import {
  sonoridad, camaDesdeArchivo, mezclarMuestra, vozDeLaVentana,
} from './lib/musicaArchivo.mjs';
import { validarPerfilMusical, pistaDelProyecto } from './lib/perfilMusical.mjs';
import { planearShort, palabrasDelShort } from './lib/shorts.mjs';
import {
  construirVoz, formaDelShort, construirAss, renderizarShort, fotogramasShort,
  crearMedidor, disponerTexto, validarOverflow, validarSeparacion,
} from './lib/shortsRender.mjs';
import { generarLoop } from './lib/particulas.mjs';
import { renderizar, renderizarLoopVisual, loopVisualHastaDuracion } from './lib/renderer.mjs';

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
    .map((e) => ({ after: e.after, offsetMs: e.cut_offset_ms }));

  const tramos = [];
  const palabrasPorTramo = [];
  const detalleCortes = [];

  bloques.forEach((b, k) => {
    const textos = b.map((idx) => proyecto.parrafos[idx]);
    const palabras = palabrasDesdeAlineacion(alineaciones[k], 0);
    const tiempos = tiemposPorParrafo(palabras, textos);

    const indices = internos
      .filter((n) => b.includes(n.after - 1))
      .map((n) => ({ indice: b.indexOf(n.after - 1), offsetMs: n.offsetMs }));
    const cortes = puntosDeCorte(tiempos, indices, duraciones[k]);

    for (const corte of cortes) {
      detalleCortes.push({
        parrafo: b[corte.trasIndice] + 1,
        bloque: k + 1,
        en: corte.en,
        silencioNatural: corte.silencioNatural,
        offsetMs: corte.offsetMs,
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
        `silencio natural ${d.silencioNatural.toFixed(2)}s` +
        (d.offsetMs ? ` · corte desplazado ${d.offsetMs}ms` : '')
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
    tramos,
    duracionesFuenteBloques: duraciones,
  });

  // Silencio real de 15s o mas en la pista montada que ningun hueco declarado
  // explica: la duracion de un tramo puede cuadrar en la linea de tiempo
  // aunque el PCM que se monto ahi este mudo (asi se detecto la omision de
  // los parrafos 150-170 en video_005). Se mira sobre el mp3 YA MONTADO, asi
  // que hace falta ffmpeg y toca despues de escribir el audio final.
  // El cierre (outro) tambien es silencio declarado, aunque no vive en
  // linea.huecos: es el tramo final tras la narracion, sin musica todavia.
  const huecosConCierre = linea.outro?.music_seconds > 0
    ? [...linea.huecos, { inicio: linea.finNarracion, duracion: linea.outro.music_seconds }]
    : linea.huecos;
  const auditoria = await auditarSilenciosNoDeclarados(join(salida, 'audio.mp3'), huecosConCierre);
  informe.pruebas.push({
    id: 'sin_silencios_no_declarados',
    ok: auditoria.ok,
    detalle: auditoria.ok
      ? `${auditoria.silencios.length} silencios largos (>=15s) en la pista, todos explicados por un hueco declarado`
      : auditoria.sinExplicar.map((s) =>
          `${mmss(s.inicio)}–${mmss(s.fin)} (${s.duracion.toFixed(1)}s) sin hueco declarado que lo explique`
        ).join(' | '),
  });
  informe.ok = informe.ok && auditoria.ok;
  informe.fallos = informe.pruebas.filter((p) => !p.ok).length;

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
    console.log(c.verde(`\n✓ Las ${informe.pruebas.length} comprobaciones pasan. Sin gasto de creditos de TTS.`));
  } else {
    console.log(c.rojo(`\n✗ ${informe.fallos} comprobacion(es) fallan.`));
    process.exitCode = 1;
  }
}

// --- remux de audio ---------------------------------------------------

/**
 * Cambia la mezcla de audio de un video ya renderizado sin volver a generar
 * un solo fotograma.
 *
 * El render de los 32:41 cuesta hora y media, y casi toda se va en zoompan.
 * Cuando lo unico que ha cambiado es la cama musical, ese trabajo no aporta
 * nada: el flujo de video se copia byte a byte y se le pega la mezcla nueva.
 *
 * Copiar no es opinable, se demuestra: se compara el MD5 del flujo de video
 * antes y despues, y el desfase de la voz entre las dos mezclas.
 */
async function cmdRemuxar(id, opciones = {}) {
  const proyecto = cargarProyecto(id);
  const salida = asegurarSalida(proyecto);
  const rutaTimeline = join(salida, 'timeline.json');
  const voz = join(salida, 'audio.mp3');

  if (!existsSync(rutaTimeline) || !existsSync(voz)) {
    throw new Error(`Faltan ${id}/output/timeline.json o audio.mp3. Ejecuta antes: importar ${id}`);
  }

  const origen = opciones.video;
  if (!origen) throw new Error('Falta --video <ruta al mp4 ya renderizado>.');
  if (!existsSync(origen)) throw new Error(`No existe el video de origen: ${origen}`);

  const timeline = JSON.parse(readFileSync(rutaTimeline, 'utf8'));
  const base = canal.render;
  const pilar = proyecto.plan?.pilar ?? 'noche';
  const cfg = { ...base, ...(base.presets[pilar] ?? base.presets.noche) };

  exigirPerfilMusical(canal, pilar);
  titulo(`Remux de audio — ${id}`);
  console.log(`Video de origen ${basename(origen)}  (${(statSync(origen).size / 1048576).toFixed(0)} MB)`);

  // El video de origen tiene que ser el de ESTE proyecto. Remuxar una mezcla
  // sobre una imagen de otro montaje daria un archivo perfectamente valido y
  // completamente equivocado, asi que se rechaza antes de gastar nada.
  const antes = await inspeccionarVideo(origen);
  console.log(`                ${antes.ancho}x${antes.alto} · ${antes.fps.toFixed(0)} fps · ` +
    `${mmss(antes.duracionContenedor)} · ${antes.fotogramas ?? '?'} fotogramas`);

  const desajustes = [];
  if (antes.ancho !== cfg.ancho || antes.alto !== cfg.alto) {
    desajustes.push(`resolucion ${antes.ancho}x${antes.alto}, el preset pide ${cfg.ancho}x${cfg.alto}`);
  }
  if (Math.abs(antes.fps - cfg.fps) > 0.01) {
    desajustes.push(`${antes.fps.toFixed(2)} fps, el preset pide ${cfg.fps}`);
  }
  const desvioOrigen = Math.abs(antes.duracionContenedor - timeline.duracion_total_s);
  if (desvioOrigen > 0.5) {
    desajustes.push(
      `dura ${mmss(antes.duracionContenedor)} y el timeline pide ${mmss(timeline.duracion_total_s)} ` +
      `(${desvioOrigen.toFixed(2)}s de diferencia)`
    );
  }
  if (desajustes.length) {
    throw new Error(
      'El video de origen no corresponde a este montaje:\n    - ' + desajustes.join('\n    - ') +
      '\n    Remuxar sobre el video equivocado daria un archivo valido y erroneo.'
    );
  }
  console.log(c.verde(`  ✓ Corresponde al montaje: desvio de ${(desvioOrigen * 1000).toFixed(0)} ms sobre el timeline`));

  const tmp = join(salida, '.tmp-remux');
  mkdirSync(tmp, { recursive: true });

  process.stdout.write('\n  huella del video de origen…');
  const huellaAntes = await huellaVideo(origen);
  console.log(` ${huellaAntes}`);

  // Misma cama que el render completo: mismas constantes, misma semilla, misma
  // funcion. Lo que se aprobo en la muestra es lo que entra aqui.
  process.stdout.write('  cama musical…');
  const t1 = Date.now();
  const m = cfg.musica;
  const forma = { huecos: timeline.huecos, finNarracion: timeline.fin_narracion_s, rampa: m.rampa_s };
  const apertura = (t) => aperturaEn(t, forma);
  const envolvente = (t) => nivelEn(t, {
    ...forma,
    cierre: { fadeIn: m.fade_in_s, fadeOut: timeline.cierre?.fade_out ?? 8, duracionTotal: timeline.duracion_total_s },
    bajoVoz: m.bajo_voz_db, enInterludio: m.en_interludio_db,
  });
  const grupos = planearPiano({ duracionTotal: timeline.duracion_total_s, apertura });
  const wav = join(tmp, 'cama.wav');
  generarCama({
    segundos: timeline.duracion_total_s, offset: 0, envolvente, apertura, grupos, salidaWav: wav,
  });
  const agudo = Math.max(...grupos.flatMap((g) => g.notas.map((n) => n.hz)));
  console.log(` ${grupos.length} grupos de piano, nota mas aguda ${Math.round(agudo)} Hz ` +
    `(${((Date.now() - t1) / 1000).toFixed(0)}s)`);

  process.stdout.write('  remux…');
  const t2 = Date.now();
  const destino = join(salida, 'video_final.mp4');
  // Si el origen ES el destino, ffmpeg leeria y escribiria el mismo archivo.
  const provisional = join(tmp, 'salida.mp4');
  await remuxarAudio({ video: origen, voz, musica: wav, salida: provisional });
  console.log(` hecho en ${((Date.now() - t2) / 1000).toFixed(0)}s`);

  // --- comprobaciones antes de dar el archivo por bueno -------------------
  titulo('Comprobaciones');
  let fallos = 0;
  const comprobar = (nombre, ok, detalle) => {
    console.log(`  ${ok ? c.verde('✓') : c.rojo('✗')} ${nombre}${detalle ? ' — ' + detalle : ''}`);
    if (!ok) fallos++;
  };

  const huellaDespues = await huellaVideo(provisional);
  comprobar('la imagen es identica, byte a byte', huellaDespues === huellaAntes,
    huellaDespues === huellaAntes ? `MD5 ${huellaDespues}` : `${huellaAntes} → ${huellaDespues}`);

  const despues = await inspeccionarVideo(provisional);
  comprobar('mismos fotogramas', despues.fotogramas === antes.fotogramas,
    `${despues.fotogramas ?? '?'} de ${antes.fotogramas ?? '?'}`);
  comprobar('el video no se ha recodificado', despues.codec === antes.codec,
    `${despues.codec}`);

  const desvio = Math.abs(despues.duracionContenedor - timeline.duracion_total_s);
  comprobar('la duracion cuadra con el timeline', desvio <= 0.5,
    `${mmss(despues.duracionContenedor)}, desvio de ${(desvio * 1000).toFixed(0)} ms`);

  // Lo que sostiene la sincronia de los subtitulos es que la voz caiga en el
  // mismo sitio que antes. La envolvente de energia la domina la voz, asi que
  // un desfase de cero lo demuestra sin tener que fiarse del montaje.
  process.stdout.write(c.dim('  midiendo el desfase de la voz…'));
  const lag = await desfaseAudio(origen, provisional);
  process.stdout.write('\r' + ' '.repeat(40) + '\r');
  comprobar('la voz no se ha movido respecto al render aprobado', Math.abs(lag) < 0.02,
    `desfase de ${(lag * 1000).toFixed(0)} ms`);

  const srt = join(salida, 'subtitles.srt');
  comprobar('el .srt sigue aparte, sin quemar', existsSync(srt) && !cfg.subtitulos_quemados,
    basename(srt));

  // Lo que demuestra que los interludios no se han movido es el desfase de cero
  // sobre el mismo audio y la duracion identica; esto solo deja escrito en el
  // log cuantos y de que tipo son, para poder cotejarlo con el render anterior.
  const cortos = timeline.huecos.filter((h) => !h.estrategico).length;
  comprobar('los huecos del timeline son todos interludios', cortos === 0,
    `${timeline.huecos.length} interludios + cierre de ${timeline.cierre?.music_seconds ?? 0}s`);

  if (fallos) {
    rmSync(tmp, { recursive: true, force: true });
    throw new Error(`${fallos} comprobacion(es) fallan. No se ha tocado video_final.mp4.`);
  }

  renameSync(provisional, destino);
  rmSync(tmp, { recursive: true, force: true });

  const bytes = statSync(destino).size;
  titulo('Video final');
  console.log(`  video_final.mp4   ${mmss(despues.duracionContenedor)} · ${(bytes / 1048576).toFixed(0)} MB`);
  console.log(`  subtitles.srt     aparte, sin quemar`);
  console.log(c.dim('  Imagen, movimiento y particulas: los mismos bits del render aprobado.'));
}

/**
 * Comprueba la regla musical del perfil antes de generar una sola muestra.
 *
 * La regla vive en canal.json, pero un archivo de configuracion no se defiende
 * solo: basta que alguien mueva un numero para probar algo y se quede. Aqui se
 * corta el paso.
 */
function exigirPerfilMusical(canalCfg, pilar) {
  const { problemas, notas } = validarPerfilMusical(canalCfg, pilar);
  if (problemas.length) {
    throw new Error(
      `El perfil musical "${pilar}" no cumple la regla del canal:\n    ` + problemas.join('\n    ')
    );
  }
  for (const n of notas) console.log(c.dim(`Perfil musical  ${n}`));
}

// --- prueba de camas musicales ----------------------------------------

// Las pistas viven junto al codigo del estudio, no en la raiz del repositorio:
// ahi arriba esta la landing page que publica Vercel, y estos mp3 acabarian
// servidos como archivos de la web.
const DIR_MUSICA = fileURLToPath(new URL('./assets/music/', import.meta.url));

const PISTAS_PRUEBA = [
  { letra: 'A', archivo: 'one_step_closer.mp3',        titulo: 'One Step Closer', autor: 'Aakash Gandhi' },
  { letra: 'B', archivo: 'alone_with_my_thoughts.mp3', titulo: 'No.7 Alone With My Thoughts', autor: 'Esther Abrami' },
  { letra: 'C', archivo: 'touching_moment.mp3',        titulo: 'Touching Moment', autor: 'Wayne Jones' },
];

/**
 * Tres muestras de audio con la MISMA voz y distinta cama.
 *
 * Todo lo que no sea la musica tiene que ser identico entre las tres, o la
 * comparacion no dice nada: misma ventana, misma voz sin tocar, misma
 * envolvente de ducking, mismos fundidos, mismo codificador.
 *
 * El nivel de cada pista se ajusta a la sonoridad que tiene la cama sintetizada
 * aprobada en esa misma ventana. Sin ese paso la prueba mediria cual se
 * masterizo mas alto, que no es lo que hay que decidir.
 */
async function cmdMusicaPrueba(id, opciones = {}) {
  const proyecto = cargarProyecto(id);
  const salida = asegurarSalida(proyecto);
  const rutaTimeline = join(salida, 'timeline.json');
  const audio = join(salida, 'audio.mp3');
  if (!existsSync(rutaTimeline) || !existsSync(audio)) {
    throw new Error(`Faltan ${id}/output/timeline.json o audio.mp3. Ejecuta antes: importar ${id}`);
  }

  const timeline = JSON.parse(readFileSync(rutaTimeline, 'utf8'));
  const base = canal.render;
  const pre = base.presets[proyecto.plan?.pilar ?? 'noche'] ?? base.presets.noche;
  const m = pre.musica;

  // La misma ventana que la muestra ya revisada: un interludio largo con voz a
  // los dos lados. Es donde se juzga lo unico que importa aqui — como suena la
  // musica cuando la voz calla y como se retira cuando vuelve.
  const largos = timeline.huecos.filter((h) => h.duracion >= 10);
  const elegido = largos[0] ?? timeline.huecos[0];
  if (!elegido) throw new Error('El timeline no tiene interludios.');
  const dur = opciones.duracion ?? 80;
  const desde = opciones.desde ?? Math.max(0, elegido.inicio - Math.min(34, (dur - elegido.duracion) / 2));

  titulo(`Prueba de camas musicales — ${id}`);
  console.log(`Ventana         ${mmss(desde)} → ${mmss(desde + dur)}  (${dur}s del video largo)`);
  console.log(`Interludio      ${elegido.duracion}s en ${mmss(elegido.inicio)}, a ${mmss(elegido.inicio - desde)} de la muestra`);
  console.log(`Ducking         ${m.bajo_voz_db} dB bajo voz → ${m.en_interludio_db} dB en interludio, rampa ${m.rampa_s}s`);

  const tmp = join(salida, '.tmp-musica');
  mkdirSync(tmp, { recursive: true });
  const dirPruebas = join(salida, 'pruebas-musica');
  mkdirSync(dirPruebas, { recursive: true });

  // Envolvente en tiempo de MUESTRA: la ventana empieza en cero, pero se
  // consulta la curva del video largo para que el ducking caiga donde toca.
  const forma = { huecos: timeline.huecos, finNarracion: timeline.fin_narracion_s, rampa: m.rampa_s };
  const nivelAbsoluto = (t) => nivelEn(t, {
    ...forma,
    cierre: { fadeIn: m.fade_in_s, fadeOut: timeline.cierre?.fade_out ?? 8, duracionTotal: timeline.duracion_total_s },
    bajoVoz: m.bajo_voz_db, enInterludio: m.en_interludio_db,
  });
  const envolvente = (t) => nivelAbsoluto(desde + t);

  process.stdout.write('\n  voz de la ventana…');
  const voz = join(tmp, 'voz.wav');
  await vozDeLaVentana({ audio, desde, segundos: dur, salidaWav: voz });
  console.log(` ${dur}s, sin tocar el nivel`);

  // Referencia: la cama sintetizada aprobada, en esta misma ventana.
  process.stdout.write('  cama sintetizada de referencia…');
  const grupos = planearPiano({ duracionTotal: timeline.duracion_total_s, apertura: (t) => aperturaEn(t, forma) });
  const refWav = join(tmp, 'referencia.wav');
  generarCama({
    segundos: dur, offset: desde, envolvente: nivelAbsoluto,
    apertura: (t) => aperturaEn(t, forma), grupos, salidaWav: refWav,
  });
  const ref = await sonoridad(refWav);
  console.log(` ${ref.lufs.toFixed(1)} LUFS`);
  console.log(c.dim('    Es el objetivo de nivel: las tres pistas se ajustan a esa sonoridad.'));

  const FADE_IN = 2;
  const FADE_OUT = 3;
  const hechas = [];

  for (const pista of PISTAS_PRUEBA) {
    const ruta = join(DIR_MUSICA, pista.archivo);
    if (!existsSync(ruta)) throw new Error(`Falta la pista ${pista.archivo} en ${DIR_MUSICA}`);

    titulo(`Prueba ${pista.letra} — ${pista.titulo}`);
    const cruda = await sonoridad(ruta);
    console.log(`  original        ${cruda.lufs.toFixed(1)} LUFS · rango ${cruda.rango?.toFixed(1) ?? '?'} LU · pico ${cruda.pico?.toFixed(1) ?? '?'} dBFS`);

    const camaWav = join(tmp, `cama-${pista.letra}.wav`);
    const hacerCama = (ganancia) => camaDesdeArchivo({
      pista: ruta, desdeEnPista: 0, segundos: dur, envolvente,
      salidaWav: camaWav, gananciaDb: ganancia, fadeIn: FADE_IN, fadeOut: FADE_OUT,
    });

    // Primera pasada sin corregir, para saber donde cae con el ducking puesto.
    await hacerCama(0);
    const sinCorregir = await sonoridad(camaWav);
    const correccion = ref.lufs - sinCorregir.lufs;
    const info = await hacerCama(correccion);
    const final = await sonoridad(camaWav);
    console.log(`  con ducking     ${sinCorregir.lufs.toFixed(1)} LUFS → correccion ${correccion >= 0 ? '+' : ''}${correccion.toFixed(2)} dB → ${final.lufs.toFixed(1)} LUFS`);
    if (info.repetida) console.log(c.ambar('  la pista es mas corta que la ventana: se repite desde el principio'));

    const destino = join(dirPruebas, `prueba_${pista.letra}_${pista.archivo}`);
    await mezclarMuestra({ voz, musica: camaWav, salidaMp3: destino, segundos: dur, fadeIn: FADE_IN, fadeOut: FADE_OUT });
    const mezcla = await sonoridad(destino);
    const bytes = statSync(destino).size;
    console.log(`  ${basename(destino)}  ${(bytes / 1048576).toFixed(1)} MB · mezcla a ${mezcla.lufs.toFixed(1)} LUFS`);
    hechas.push({ ...pista, cruda, final, mezcla, destino, correccion });
  }

  rmSync(tmp, { recursive: true, force: true });

  titulo('Las tres muestras');
  console.log(`  Identico en las tres: ventana ${mmss(desde)}–${mmss(desde + dur)}, voz sin tocar,`);
  console.log(`  ducking ${m.bajo_voz_db}/${m.en_interludio_db} dB, fundidos ${FADE_IN}s y ${FADE_OUT}s, mp3 192 kbps.`);
  console.log('');
  for (const h of hechas) {
    console.log(`  ${h.letra}  ${basename(h.destino).padEnd(34)} ${h.titulo} — ${h.autor}`);
  }
  const dispersion = Math.max(...hechas.map((h) => h.mezcla.lufs)) - Math.min(...hechas.map((h) => h.mezcla.lufs));
  console.log('');
  console.log(dispersion <= 0.6
    ? c.verde(`  ✓ Las tres mezclas quedan dentro de ${dispersion.toFixed(2)} LU entre si: se comparan a igualdad de volumen`)
    : c.ambar(`  ! Las mezclas difieren ${dispersion.toFixed(2)} LU entre si`));
  console.log(c.dim('\n  Nada elegido, nada renderizado, nada publicado.'));
}

/**
 * A/B de cuanto sube la cama en los interludios, con la misma pista.
 *
 * Lo unico que cambia entre las dos muestras es el nivel de la musica cuando
 * calla la voz. Y hay una trampa que evitar: si cada variante se normalizara
 * por separado, la que menos sube en los interludios saldria con MAS ganancia
 * para compensar, y acabaria sonando mas alta bajo la voz — que es justo lo que
 * no debe moverse. Asi que la correccion se calcula UNA vez, con la referencia
 * aprobada, y se aplica igual a las dos.
 */
async function cmdMusicaInterludio(id, opciones = {}) {
  const proyecto = cargarProyecto(id);
  const salida = asegurarSalida(proyecto);
  const rutaTimeline = join(salida, 'timeline.json');
  const audio = join(salida, 'audio.mp3');
  if (!existsSync(rutaTimeline) || !existsSync(audio)) {
    throw new Error(`Faltan ${id}/output/timeline.json o audio.mp3. Ejecuta antes: importar ${id}`);
  }

  const timeline = JSON.parse(readFileSync(rutaTimeline, 'utf8'));
  const base = canal.render;
  const pre = base.presets[proyecto.plan?.pilar ?? 'noche'] ?? base.presets.noche;
  const m = pre.musica;
  const pista = join(DIR_MUSICA, 'one_step_closer.mp3');
  if (!existsSync(pista)) throw new Error(`Falta one_step_closer.mp3 en ${DIR_MUSICA}`);

  // Exactamente la misma ventana que la prueba anterior.
  const largos = timeline.huecos.filter((h) => h.duracion >= 10);
  const elegido = largos[0] ?? timeline.huecos[0];
  const dur = opciones.duracion ?? 80;
  const desde = opciones.desde ?? Math.max(0, elegido.inicio - Math.min(34, (dur - elegido.duracion) / 2));

  const FADE_IN = 2;
  const FADE_OUT = 3;
  const forma = { huecos: timeline.huecos, finNarracion: timeline.fin_narracion_s, rampa: m.rampa_s };
  const cierre = { fadeIn: m.fade_in_s, fadeOut: timeline.cierre?.fade_out ?? 8, duracionTotal: timeline.duracion_total_s };
  const conNiveles = (bajoVoz, enInterludio) => (t) =>
    nivelEn(desde + t, { ...forma, cierre, bajoVoz, enInterludio });

  titulo(`A/B del interludio — ${id}`);
  console.log(`Pista           one_step_closer.mp3 en las dos`);
  console.log(`Ventana         ${mmss(desde)} → ${mmss(desde + dur)}  (${dur}s, la misma de la prueba anterior)`);
  console.log(`Interludio      ${elegido.duracion}s en ${mmss(elegido.inicio)}, a ${mmss(elegido.inicio - desde)} de la muestra`);

  const tmp = join(salida, '.tmp-interludio');
  mkdirSync(tmp, { recursive: true });
  const dirPruebas = join(salida, 'pruebas-musica');
  mkdirSync(dirPruebas, { recursive: true });

  process.stdout.write('\n  voz de la ventana…');
  const voz = join(tmp, 'voz.wav');
  await vozDeLaVentana({ audio, desde, segundos: dur, salidaWav: voz });
  console.log(` ${dur}s, sin tocar el nivel`);

  // La correccion de ganancia se calcula con la referencia aprobada y se
  // congela: las dos variantes usan la misma, o dejarian de ser comparables.
  process.stdout.write('  calibrando contra la cama aprobada…');
  const refWav = join(tmp, 'referencia.wav');
  generarCama({
    segundos: dur, offset: desde, envolvente: (t) => nivelEn(t, { ...forma, cierre, bajoVoz: m.bajo_voz_db, enInterludio: m.en_interludio_db }),
    apertura: (t) => aperturaEn(t, forma),
    grupos: planearPiano({ duracionTotal: timeline.duracion_total_s, apertura: (t) => aperturaEn(t, forma) }),
    salidaWav: refWav,
  });
  const ref = await sonoridad(refWav);
  const tanteo = join(tmp, 'tanteo.wav');
  await camaDesdeArchivo({
    pista, segundos: dur, envolvente: conNiveles(m.bajo_voz_db, m.en_interludio_db),
    salidaWav: tanteo, gananciaDb: 0, fadeIn: FADE_IN, fadeOut: FADE_OUT,
  });
  const ganancia = ref.lufs - (await sonoridad(tanteo)).lufs;
  console.log(` referencia ${ref.lufs.toFixed(1)} LUFS → ganancia fija ${ganancia >= 0 ? '+' : ''}${ganancia.toFixed(2)} dB`);
  console.log(c.dim('    La misma para las dos variantes: el nivel bajo la voz no se mueve.'));

  const variantes = [
    { letra: 'A', enInterludio: -20.5, archivo: 'prueba_A_interludio_-20.5dB.mp3', nota: 'sube 2,5 dB al callar la voz' },
    { letra: 'B', enInterludio: m.bajo_voz_db, archivo: 'prueba_B_interludio_plano.mp3', nota: 'sin subida: la cama no se mueve' },
  ];

  const hechas = [];
  for (const v of variantes) {
    titulo(`Variante ${v.letra} — ${m.bajo_voz_db} dB bajo voz / ${v.enInterludio} dB en interludio`);
    console.log(`  ${v.nota}`);
    const camaWav = join(tmp, `cama-${v.letra}.wav`);
    const info = await camaDesdeArchivo({
      pista, segundos: dur, envolvente: conNiveles(m.bajo_voz_db, v.enInterludio),
      salidaWav: camaWav, gananciaDb: ganancia, fadeIn: FADE_IN, fadeOut: FADE_OUT,
    });
    if (info.repetida) console.log(c.dim(`  la pista se repite: ${info.vueltas} vueltas con cruce de ${info.cruceSegundos}s`));
    const cama = await sonoridad(camaWav);
    const destino = join(dirPruebas, v.archivo);
    await mezclarMuestra({ voz, musica: camaWav, salidaMp3: destino, segundos: dur, fadeIn: FADE_IN, fadeOut: FADE_OUT });
    const mezcla = await sonoridad(destino);
    console.log(`  cama sola       ${cama.lufs.toFixed(1)} LUFS`);
    console.log(`  ${v.archivo}  ${(statSync(destino).size / 1048576).toFixed(1)} MB · mezcla a ${mezcla.lufs.toFixed(1)} LUFS`);
    hechas.push({ ...v, cama, mezcla, destino });
  }

  rmSync(tmp, { recursive: true, force: true });

  titulo('Las dos muestras');
  console.log(`  Identico en las dos: pista, ventana ${mmss(desde)}–${mmss(desde + dur)}, voz sin tocar,`);
  console.log(`  ganancia ${ganancia >= 0 ? '+' : ''}${ganancia.toFixed(2)} dB, ${m.bajo_voz_db} dB bajo la voz, fundidos ${FADE_IN}s y ${FADE_OUT}s, mp3 192 kbps.`);
  console.log(`  Lo unico distinto: el nivel en el interludio.`);
  console.log('');
  for (const h of hechas) console.log(`  ${h.letra}  ${basename(h.destino).padEnd(34)} ${h.enInterludio} dB — ${h.nota}`);
  const salto = hechas[0].cama.lufs - hechas[1].cama.lufs;
  console.log('');
  console.log(c.dim(`  Entre las dos camas hay ${salto.toFixed(2)} LU: es lo que aporta la subida en ese interludio de ${elegido.duracion}s.`));
  console.log(c.dim('  Nada elegido, nada renderizado, nada publicado.'));
}

// --- maquetacion de los Shorts ----------------------------------------

// Margen lateral intocable. YouTube superpone su interfaz sobre los bordes de
// un Short, y un subtitulo pegado al borde se lee mal aunque no se corte.
const MARGEN_SEGURO = 80;
const anchoUtil = (ancho) => ancho - 2 * MARGEN_SEGURO;

// Cuerpo de partida y minimo al que se permite bajar antes de anadir una linea.
const TAMANO_VOZ = 76;
const TAMANO_VOZ_MIN = 60;
const TAMANO_CTA = 62;
const TAMANO_CTA_MIN = 48;
// El gancho manda en el primer segundo: se le deja mas cuerpo que a la voz.
const TAMANO_GANCHO = 96;
const TAMANO_GANCHO_MIN = 72;
// Aire minimo entre el gancho y el subtitulo mientras conviven en pantalla.
const HUECO_GANCHO_PX = 120;

// --- diagnostico del contenedor ---------------------------------------

const kib = (n) => (n / 1048576).toFixed(1) + ' MB';

/**
 * Por que un MP4 que decodifica bien puede no arrancar en un reproductor web.
 *
 * Mira el contenedor, no los flujos: donde esta el indice, que dicen las listas
 * de edicion, si el primer fotograma es llave, si los tiempos empiezan en cero.
 * Con --reparar reescribe el contenedor sin tocar el H.264 y vuelve a medirlo
 * todo sobre el archivo nuevo.
 */
async function cmdDiagnosticar(ruta, opciones = {}) {
  if (!existsSync(ruta)) throw new Error(`No existe el archivo: ${ruta}`);

  titulo(`Diagnostico del contenedor — ${basename(ruta)}`);
  const d = await diagnosticar(ruta);
  await imprimirDiagnostico(ruta, d, { completo: opciones.completo });

  if (!opciones.reparar) return;

  if (d.graves === 0) {
    titulo('Reparacion');
    console.log('  No hay nada que reparar a nivel de contenedor: no se toca el archivo.');
    return;
  }

  const flags = [...new Set(d.anomalias.filter((a) => a.grave).flatMap((a) => a.flags))];
  titulo('Reparacion');
  console.log('  Se reescribe el contenedor copiando el H.264 tal cual.');
  console.log(`  Opciones anadidas: ${flags.length ? flags.join(' ') : '(solo faststart)'}`);

  const destino = opciones.salida ?? join(dirname(ruta), 'video_final_web.mp4');
  const t0 = Date.now();
  const { args } = await repararContenedor({ entrada: ruta, salida: destino, flags });
  console.log(c.dim(`  ffmpeg ${args.filter((a) => a !== '-v' && a !== 'error').join(' ')}`));
  console.log(`  Hecho en ${((Date.now() - t0) / 1000).toFixed(0)}s · ${kib(statSync(destino).size)}`);

  titulo(`Comprobacion del archivo corregido — ${basename(destino)}`);
  const d2 = await diagnosticar(destino);
  await imprimirDiagnostico(destino, d2, { completo: opciones.completo });

  // Una "reparacion" que deja el archivo peor que como estaba no se entrega.
  // Reescribir el contenedor puede introducir problemas propios —un hueco vacio
  // al principio, por ejemplo— y sin esta comprobacion se irian con el archivo.
  if (d2.graves > d.graves) {
    rmSync(destino, { force: true });
    throw new Error(
      `La reparacion EMPEORA el archivo: ${d.graves} anomalias graves antes, ${d2.graves} despues.\n` +
      '    Se ha borrado el archivo corregido. El original queda como estaba.'
    );
  }
  if (d2.graves > 0) {
    console.log(c.ambar(`\n  Quedan ${d2.graves} anomalias graves sin resolver por remux.`));
  }

  // El H.264 tiene que seguir siendo el mismo: reescribir el contenedor no
  // puede cambiar un solo bit de imagen.
  const [antes, despues] = [await huellaVideo(ruta), await huellaVideo(destino)];
  console.log('');
  console.log(antes === despues
    ? c.verde(`  ✓ La imagen no se ha tocado: MD5 del flujo de video ${despues}`)
    : c.rojo(`  ✗ El flujo de video ha cambiado: ${antes} → ${despues}`));
  if (antes !== despues) process.exitCode = 1;
}

async function imprimirDiagnostico(ruta, d, { completo = false } = {}) {
  const { superiores, ftyp, moov, video, audio } = d;

  console.log(`\nContenedor`);
  console.log(`  tamano            ${kib(superiores.total)}`);
  console.log(`  ftyp              ${ftyp?.marca} · compatibles: ${ftyp?.compatibles.join(', ')}`);
  console.log(`  cajas             ${superiores.cajas.map((c) => c.tipo).join(' → ')}`);
  for (const caja of superiores.cajas) {
    console.log(c.dim(`    ${caja.tipo.padEnd(6)} offset ${String(caja.offset).padStart(12)}  ${kib(caja.tamano)}`));
  }
  const iMoov = superiores.cajas.findIndex((x) => x.tipo === 'moov');
  const iMdat = superiores.cajas.findIndex((x) => x.tipo === 'mdat');
  console.log(`  faststart         ${iMoov > -1 && iMdat > -1 && iMoov < iMdat
    ? c.verde('si — moov antes de mdat') : c.rojo('NO — moov despues de mdat')}`);
  console.log(`  escala de pelicula ${moov.mvhd?.escala} · duracion declarada ` +
    `${(moov.mvhd.duracion / moov.mvhd.escala).toFixed(3)}s`);

  console.log(`\nPistas del contenedor`);
  for (const p of moov.pistas) {
    console.log(`  pista ${p.id} (${p.tipo})`);
    console.log(`    escala          ${p.escala} · duracion ${p.segundos?.toFixed(3)}s`);
    console.log(`    lista edicion   ${p.edicion
      ? p.edicion.map((e) => `[dur ${e.duracion}, media_time ${e.tiempoMedio}, ritmo ${e.ritmo}]`).join(' ')
      : 'ninguna'}`);
    console.log(`    fotogramas llave ${p.llaves.todas
      ? 'todas las muestras'
      : `${p.llaves.cuantas} · primeras: ${p.llaves.primeras.join(', ')}`}`);
  }

  console.log(`\nFlujos`);
  for (const [nombre, s] of [['video', video], ['audio', audio]]) {
    if (!s) { console.log(`  ${nombre}: no hay`); continue; }
    console.log(`  ${nombre}`);
    console.log(`    codec           ${s.codec_name} ${s.profile ?? ''} nivel ${s.level ?? '-'}`);
    if (nombre === 'video') {
      console.log(`    imagen          ${s.width}x${s.height} · ${s.pix_fmt} · ${s.r_frame_rate} fps`);
      console.log(`    fotogramas      ${s.nb_frames ?? '?'}`);
    } else {
      console.log(`    audio           ${s.sample_rate} Hz · ${s.channels} canales · ${s.channel_layout ?? '?'}`);
    }
    console.log(`    time_base       ${s.time_base}`);
    console.log(`    start_time      ${s.start_time} (start_pts ${s.start_pts})`);
    console.log(`    duracion        ${s.duration}s`);
    console.log(`    bitrate         ${s.bit_rate ? (Number(s.bit_rate) / 1000).toFixed(0) + ' kbps' : '?'}`);
  }

  console.log(`\nPrimeros paquetes`);
  for (const [nombre, paquetes] of [['video', d.paqVideo], ['audio', d.paqAudio]]) {
    const linea = paquetes.slice(0, 6)
      .map((p) => `${p.dts_time}/${p.pts_time}${String(p.flags ?? '').includes('K') ? 'K' : ''}`)
      .join('  ');
    console.log(`  ${nombre.padEnd(6)} dts/pts: ${linea || '(ninguno)'}`);
  }

  console.log(`\nPruebas de reproduccion`);
  const total = Number(d.probe.format?.duration ?? 0);
  const puntos = [
    { etiqueta: 'desde 0:00', desde: 0, segundos: 6 },
    { etiqueta: `desde ${mmss(total / 2)} (mitad)`, desde: Math.floor(total / 2), segundos: 6 },
    { etiqueta: `desde ${mmss(Math.max(0, total - 15))} (final)`, desde: Math.max(0, total - 15), segundos: 15 },
  ];
  for (const punto of puntos) {
    const r = await pruebaDecodificacion(ruta, punto);
    const ok = r.ok && r.fotogramas > 0 && r.problemas.length === 0;
    console.log(`  ${ok ? c.verde('✓') : c.rojo('✗')} ${punto.etiqueta.padEnd(24)} ` +
      `${r.fotogramas} fotogramas en ${(r.ms / 1000).toFixed(1)}s`);
    for (const p of r.problemas) console.log(c.rojo(`      ${p}`));
  }

  if (completo) {
    process.stdout.write('  decodificando el archivo entero…');
    const t = await decodificarTodo(ruta);
    console.log(` ${t.ok ? c.verde('✓ sin errores') : c.rojo('✗ con errores')} · ` +
      `${t.fotogramas} fotogramas en ${t.segundos.toFixed(0)}s`);
    for (const e of t.errores) console.log(c.rojo(`      ${e}`));
  }

  if (d.notas?.length) {
    console.log(`\nMedido y normal`);
    for (const n of d.notas) console.log(c.dim(`  · ${n}`));
  }

  titulo('Anomalias');
  if (d.anomalias.length === 0) {
    console.log(c.verde('  Ninguna. El contenedor esta armado como espera un reproductor web.'));
  } else {
    for (const a of d.anomalias) {
      console.log(`  ${a.grave ? c.rojo('GRAVE') : c.ambar('aviso')}  ${a.texto}`);
    }
    console.log('');
    console.log(`  ${d.graves} de ${d.anomalias.length} pueden impedir el arranque por si solas.`);
  }
}

// --- Shorts -----------------------------------------------------------

/**
 * Propone los extractos verticales y ensena de que estan hechos.
 *
 * No renderiza: la decision de que trozo del video se convierte en Short es
 * editorial, no tecnica, y hay que poder leerla antes de gastar nada. Para cada
 * Short evalua los rangos de parrafos candidatos con las duraciones REALES del
 * audio ya montado y dice cual cae dentro del objetivo.
 */
/**
 * Renderiza los Shorts ya aprobados.
 *
 * Ni un credito de TTS: la voz se recorta del audio que ya existe. La musica
 * se sintetiza de nuevo con el generador aprobado en vez de recortarse del
 * video largo, porque el Short quita tiempo por dentro al acortar los
 * interludios y empalmar dos trozos de una cama continua meteria un clic justo
 * donde no hay voz que lo tape.
 */
async function cmdShortsRender(id, opciones = {}) {
  const proyecto = cargarProyecto(id);
  const salida = asegurarSalida(proyecto);
  const rutaTimeline = join(salida, 'timeline.json');
  const rutaAlignment = join(salida, 'alignment.json');
  const rutaConfig = join(proyecto.dir, 'shorts.json');
  const audio = join(salida, 'audio.mp3');

  for (const [ruta, quien] of [[rutaTimeline, 'timeline.json'], [rutaAlignment, 'alignment.json'], [audio, 'audio.mp3']]) {
    if (!existsSync(ruta)) throw new Error(`Falta ${id}/output/${basename(ruta)}. Ejecuta antes: importar ${id}`);
  }

  const { timeline, alignment, cfg, obj } = leerDatosShorts(
    proyecto, rutaTimeline, rutaAlignment, rutaConfig
  );
  // La escena vertical esta compuesta para 9:16: se usa entera. La horizontal
  // solo entra si no hay vertical, y entonces sí hay que recortarla.
  const vertical = join(proyecto.dir, obj.imagen ?? 'escena_vertical.png');
  const imagen = existsSync(vertical) ? vertical : join(proyecto.dir, 'escena_nocturna.png');
  if (!existsSync(imagen)) {
    throw new Error(
      `No existe la imagen de fondo. Se busco ${basename(vertical)} y escena_nocturna.png en ${proyecto.dir}`
    );
  }

  const base = canal.render;
  const pre = base.presets[proyecto.plan?.pilar ?? 'noche'] ?? base.presets.noche;
  const ancho = obj.ancho ?? 1080;
  const alto = obj.alto ?? 1920;
  const esVertical = imagen === vertical;

  exigirPerfilMusical(canal, proyecto.plan?.pilar ?? 'noche');
  titulo(`Render de Shorts — ${id}`);
  console.log(`Formato         ${ancho}x${alto} · ${base.fps} fps · crf ${base.crf}`);
  console.log(`Escena          ${basename(imagen)}` +
    (esVertical ? ' — compuesta en 9:16, se usa entera' : ' recortada a 9:16, sin deformar'));
  console.log(`Area segura     ${MARGEN_SEGURO}px por lado · ancho util ${anchoUtil(ancho)}px`);
  console.log(c.dim('Sin TTS: la voz sale de audio.mp3; la musica, del generador aprobado.'));

  const dirShorts = join(salida, 'shorts');
  mkdirSync(dirShorts, { recursive: true });

  // Las motas son las mismas de siempre, en vertical. Menos densidad: el
  // lienzo tiene la mitad de ancho y la misma cantidad se veria como lluvia.
  const tmpComun = join(dirShorts, '.tmp');
  mkdirSync(tmpComun, { recursive: true });
  process.stdout.write('\n  particulas verticales…');
  const loop = join(tmpComun, 'motas.mov');
  const p = await generarLoop({
    salida: loop, ancho, alto, fps: base.fps,
    periodo: pre.particulas.periodo_s,
    cuantas: Math.round(pre.particulas.cuantas * 0.6),
  });
  console.log(` ${p.motas} motas, bucle de ${p.periodo}s`);

  // Un solo medidor para los dos Shorts: la cache se comparte y las palabras
  // que se repiten entre extractos se miden una vez.
  const anchoSeguro = anchoUtil(ancho);
  const medir = crearMedidor({ ancho, tmp: join(tmpComun, 'medidas') });

  const hechos = [];
  const soloEstos = opciones.solo ? opciones.solo.split(',').map((x) => x.trim()).filter(Boolean) : null;
  if (soloEstos) {
    const desconocidos = soloEstos.filter((x) => !cfg.shorts.some((sh) => sh.id === x));
    if (desconocidos.length) throw new Error(`No hay ningun Short con id: ${desconocidos.join(', ')}`);
    console.log(c.ambar(`Solo se monta: ${soloEstos.join(', ')}`));
  }

  for (const corto of cfg.shorts) {
    // Rehacer un Short ya aprobado solo porque toca renderizar otro no aporta
    // nada y produce un archivo nuevo donde habia uno revisado.
    if (soloEstos && !soloEstos.includes(corto.id)) continue;
    if (!corto.parrafos) {
      console.log(c.ambar(`\n  ${corto.id}: sin rango aprobado en shorts.json, se salta.`));
      continue;
    }
    const [desde, hasta] = corto.parrafos;
    titulo(`${corto.id} — ${corto.tema}`);

    const plan = planearShort({
      timeline, desde, hasta,
      interludioInterno: obj.interludio_interno_s,
      ctaSegundos: obj.cta_s,
    });
    console.log(`Parrafos        ${desde}-${hasta} · ${plan.duracion.toFixed(1)}s`);
    console.log(`Ventana         ${mmss(plan.inicioEnVideo)} → ${mmss(plan.finEnVideo)} del video largo`);

    const tmp = join(dirShorts, `.tmp-${corto.id}`);
    mkdirSync(tmp, { recursive: true });

    process.stdout.write('  voz…');
    const voz = join(tmp, 'voz.wav');
    const v = await construirVoz({ audio, plan, salidaWav: voz, tmp: join(tmp, 'trozos') });
    const desvioVoz = Math.abs(v.duracion - plan.duracion);
    console.log(` ${v.piezas} tramos, ${v.duracion.toFixed(2)}s ` +
      (desvioVoz <= 0.05 ? c.verde('✓') : c.rojo(`✗ ${desvioVoz.toFixed(2)}s fuera del plan`)));
    if (desvioVoz > 0.05) throw new Error(`La voz del ${corto.id} no cuadra con el plan.`);

    process.stdout.write('  cama musical…');
    const m = pre.musica;
    const forma = formaDelShort(plan, m.rampa_s);
    const apertura = (t) => aperturaEn(t, forma);
    const envolvente = (t) => nivelEn(t, {
      ...forma,
      cierre: { fadeIn: 1.5, fadeOut: 1.2, duracionTotal: plan.duracion },
      bajoVoz: m.bajo_voz_db, enInterludio: m.en_interludio_db,
    });
    const grupos = planearPiano({ duracionTotal: plan.duracion, apertura });
    const wav = join(tmp, 'cama.wav');
    generarCama({ segundos: plan.duracion, offset: 0, envolvente, apertura, grupos, salidaWav: wav });
    console.log(` ${grupos.length} grupos de piano · ${m.bajo_voz_db} dB bajo voz`);

    // Subtitulos: menos caracteres por linea que en horizontal, porque el ancho
    // util es poco mas de la mitad. El agrupador reparte las PALABRAS en
    // rotulos; cuantas lineas ocupa cada rotulo y con que cuerpo lo decide
    // despues la medida real.
    const palabras = palabrasDelShort(plan, alignment.palabras);
    const crudos = agruparEnSubtitulos(
      palabras,
      { ...canal.subtitulos, max_caracteres_linea: 26, max_lineas: 3 },
      plan.duracion
    );

    process.stdout.write('  maquetando…');
    const cues = [];
    for (const bruto of crudos) {
      const d = await disponerTexto({
        texto: bruto.texto, medir, anchoSeguro,
        tamano: TAMANO_VOZ, tamanoMin: TAMANO_VOZ_MIN, maxLineas: 3,
      });
      if (d.desbordado) {
        throw new Error(
          `Un subtitulo del ${corto.id} no cabe ni al cuerpo minimo: «${bruto.texto}»`
        );
      }
      cues.push({ ...bruto, lineas: d.lineas, tamano: d.tamano });
    }
    const reducidos = cues.filter((x) => x.tamano < TAMANO_VOZ).length;
    console.log(` ${cues.length} rotulos` + (reducidos ? `, ${reducidos} con el cuerpo reducido` : ''));

    const ctaTramo = plan.tramos.find((t) => t.tipo === 'cta');
    let cta = null;
    if (ctaTramo && corto.cta?.length) {
      const lineas = [];
      let tamanoCta = TAMANO_CTA;
      for (const linea of corto.cta) {
        const d = await disponerTexto({
          texto: linea, medir, anchoSeguro,
          tamano: TAMANO_CTA, tamanoMin: TAMANO_CTA_MIN, maxLineas: 2,
        });
        lineas.push(...d.lineas);
        tamanoCta = Math.min(tamanoCta, d.tamano);
      }
      cta = { inicio: ctaTramo.destino, fin: plan.duracion, lineas, tamano: tamanoCta };
    }

    // Gancho de apertura, solo si el Short lo declara. Se superpone al contenido
    // desde el fotograma cero: no anade ni un segundo de duracion.
    let gancho = null;
    if (corto.gancho?.texto) {
      const d = await disponerTexto({
        texto: corto.gancho.texto, medir, anchoSeguro,
        tamano: TAMANO_GANCHO, tamanoMin: TAMANO_GANCHO_MIN, maxLineas: 2,
      });
      if (d.desbordado) throw new Error(`El gancho del ${corto.id} no cabe: «${corto.gancho.texto}»`);
      gancho = { inicio: 0, fin: corto.gancho.segundos ?? 2, lineas: d.lineas, tamano: d.tamano };
      console.log(`  gancho          «${corto.gancho.texto}» ${gancho.fin}s, cuerpo ${d.tamano}`);
    }

    const ass = join(tmp, 'subs.ass');
    writeFileSync(ass, construirAss({
      cues, cta, gancho, ancho, alto, margen: MARGEN_SEGURO,
      bandaCta: obj.banda_cta ?? 0.19, bandaGancho: obj.banda_gancho ?? 0.07,
    }));
    console.log(`  subtitulos      ${cues.length} rotulos de ${palabras.length} palabras, quemados`);

    // Ningun subtitulo puede pisar el cierre: ahi manda el rotulo.
    const invasores = ctaTramo ? cues.filter((c2) => c2.fin > ctaTramo.destino + 0.01) : [];
    if (invasores.length) throw new Error(`${invasores.length} subtitulos invaden el cierre del ${corto.id}.`);

    // Medir al repartir y comprobar al final no es lo mismo: entre una cosa y
    // otra estan el escapado, la union de lineas y los estilos. Esto dibuja
    // cada rotulo tal y como quedara y mira donde cae la tinta de verdad.
    process.stdout.write('  comprobando margenes…');
    const desbordes = await validarOverflow({
      ass, cues, cta, gancho, ancho, alto, margen: MARGEN_SEGURO,
    });
    if (desbordes.length) {
      throw new Error(
        `${desbordes.length} rotulo(s) del ${corto.id} se salen del area segura:\n    ` +
        desbordes.join('\n    ')
      );
    }
    console.log(c.verde(` ✓ los ${cues.length + (cta ? 1 : 0) + (gancho ? 1 : 0)} rotulos caben dentro de ${MARGEN_SEGURO}px por lado`));

    // El gancho entra en el fotograma cero y ahi la voz ya habla: los dos
    // rotulos conviven. Que no se estorben no es que no coincidan en el tiempo
    // —no pueden—, es que ocupen franjas distintas con aire entre ellas.
    if (gancho) {
      const sep = await validarSeparacion({
        ass, ancho, alto, momento: Math.min(1, gancho.fin / 2), huecoMinimo: HUECO_GANCHO_PX,
      });
      if (!sep.ok) throw new Error(`El gancho del ${corto.id} estorba al subtitulo: ${sep.motivo}`);
      console.log(c.verde(`  ✓ gancho y subtitulo separados por ${sep.hueco}px de aire`));
    }

    // Antes de gastar el render entero: unos fotogramas para juzgar donde cae
    // el texto sobre la escena. Con una imagen compuesta —una cara, una
    // ventana— eso no se decide con numeros, se mira.
    if (opciones.fotograma) {
      const conTexto = cues.length ? cues[Math.floor(cues.length / 2)] : null;
      const momentos = gancho ? [
        0,
        1,
        gancho.fin + 0.1,
        ctaTramo ? ctaTramo.destino + 2 : plan.duracion - 1,
      ] : [
        cues[0] ? (cues[0].inicio + cues[0].fin) / 2 : 1,
        conTexto ? (conTexto.inicio + conTexto.fin) / 2 : plan.duracion / 2,
        cues.at(-1) ? (cues.at(-1).inicio + cues.at(-1).fin) / 2 : plan.duracion - 6,
        ctaTramo ? ctaTramo.destino + 2 : plan.duracion - 1,
      ];
      process.stdout.write('  fotogramas…');
      const patron = join(dirShorts, `${corto.id}-fotograma-%d.png`);
      const f = await fotogramasShort({
        imagen, particulas: loop, ass, salidaPatron: patron, momentos,
        ancho, alto, fps: base.fps, zoomTotal: 0.05, foco: pre.foco,
        duracion: plan.duracion, recortar: !esVertical,
      });
      console.log(` ${f.numeros.length} en ${momentos.map((t) => t.toFixed(1) + 's').join(', ')}`);
      rmSync(tmp, { recursive: true, force: true });
      hechos.push({ id: corto.id, fotogramas: f.numeros.length });
      continue;
    }

    process.stdout.write('  render…');
    const destino = join(dirShorts, `${corto.id}.mp4`);
    const t0 = Date.now();
    await renderizarShort({
      imagen, particulas: loop, voz, musica: wav, ass, salida: destino,
      ancho, alto, fps: base.fps, zoomTotal: 0.05, foco: pre.foco,
      crf: base.crf, preset: base.preset_x264, duracion: plan.duracion,
      recortar: !esVertical,
    });
    console.log(` hecho en ${((Date.now() - t0) / 1000).toFixed(0)}s`);

    const real = await duracionSegundos(destino);
    const desvio = Math.abs(real - plan.duracion);
    const bytes = statSync(destino).size;
    console.log(`  ${corto.id}.mp4    ${real.toFixed(2)}s · ${(bytes / 1048576).toFixed(1)} MB · ${ancho}x${alto}`);
    console.log(desvio <= 0.15
      ? c.verde(`  ✓ Duracion cuadra con el plan (desvio ${(desvio * 1000).toFixed(0)} ms)`)
      : c.rojo(`  ✗ Duracion no cuadra: ${real.toFixed(2)}s frente a ${plan.duracion.toFixed(2)}s`));
    if (desvio > 0.15) process.exitCode = 1;

    rmSync(tmp, { recursive: true, force: true });
    hechos.push({ id: corto.id, duracion: real, bytes });
  }

  rmSync(tmpComun, { recursive: true, force: true });

  titulo(opciones.fotograma ? 'Fotogramas para revisar' : 'Shorts');
  if (opciones.fotograma) {
    for (const h of hechos) console.log(`  ${h.id}    ${h.fotogramas} fotogramas PNG`);
    console.log(c.dim('\n  Comprueba que el texto no tape las caras. Nada renderizado todavia.'));
    return;
  }
  for (const h of hechos) {
    console.log(`  ${h.id}.mp4    ${h.duracion.toFixed(1)}s · ${(h.bytes / 1048576).toFixed(1)} MB`);
  }
  console.log(c.dim('\n  Nada publicado. video_001 y sus artifacts finales, intactos.'));
}

/**
 * Lee lo que necesitan tanto el plan como el render de Shorts.
 *
 * timeline.json guarda TRAMOS de audio —los trozos en que se corto cada bloque
 * para meter los interludios—, no parrafos. Un Short se elige por parrafos,
 * asi que los limites se reconstruyen de la alineacion: las palabras vienen
 * con tiempo absoluto y el texto de cada parrafo dice cuantas le tocan.
 */
function leerDatosShorts(proyecto, rutaTimeline, rutaAlignment, rutaConfig) {
  const timelineCrudo = JSON.parse(readFileSync(rutaTimeline, 'utf8'));
  const alignment = JSON.parse(readFileSync(rutaAlignment, 'utf8'));
  const cfg = JSON.parse(readFileSync(rutaConfig, 'utf8'));

  const tiempos = tiemposPorParrafo(alignment.palabras, proyecto.parrafos);
  const timeline = {
    ...timelineCrudo,
    segmentos: tiempos.map((t, i) => ({
      numero: i + 1,
      texto: proyecto.parrafos[i],
      inicio: t.inicio,
      fin: t.fin,
      duracion: t.fin - t.inicio,
    })),
  };
  return { timeline, alignment, cfg, obj: cfg.objetivos ?? {} };
}

async function cmdShortsPlan(id) {
  const proyecto = cargarProyecto(id);
  const salida = asegurarSalida(proyecto);
  const rutaTimeline = join(salida, 'timeline.json');
  const rutaAlignment = join(salida, 'alignment.json');
  const rutaConfig = join(proyecto.dir, 'shorts.json');

  for (const [ruta, quien] of [[rutaTimeline, 'timeline.json'], [rutaAlignment, 'alignment.json']]) {
    if (!existsSync(ruta)) throw new Error(`Falta ${id}/output/${quien}. Ejecuta antes: importar ${id}`);
  }
  if (!existsSync(rutaConfig)) throw new Error(`Falta ${id}/shorts.json`);

  const { timeline, alignment, cfg, obj } = leerDatosShorts(
    proyecto, rutaTimeline, rutaAlignment, rutaConfig
  );

  titulo(`Plan de Shorts — ${id}`);
  console.log(`Video largo     ${mmss(timeline.duracion_total_s)} · ${timeline.segmentos.length} parrafos`);
  console.log(`Formato         ${obj.ancho}x${obj.alto} · interludios internos a ${obj.interludio_interno_s}s`);
  console.log(`Cierre          ${obj.cta_s}s de rotulo sobre musica, sin voz`);
  console.log(c.dim(`Sin TTS: todo sale de audio.mp3 y alignment.json (${alignment.palabras.length} palabras)`));

  for (const corto of cfg.shorts) {
    const [minimo, maximo] = corto.objetivo_s;
    titulo(`${corto.id} — ${corto.tema}`);
    console.log(`Objetivo        ${minimo}-${maximo}s\n`);

    // Una vez aprobado un rango, el plan deja de buscar: reevaluar candidatos
    // podria "mejorar" la eleccion por su cuenta y renderizar otra cosa.
    const rangos = corto.parrafos ? [corto.parrafos] : corto.candidatos;
    if (corto.parrafos) console.log(c.dim(`  Rango aprobado, sin buscar alternativas.\n`));

    const evaluados = [];
    for (const [desde, hasta] of rangos) {
      let plan;
      try {
        plan = planearShort({
          timeline, desde, hasta,
          interludioInterno: obj.interludio_interno_s,
          ctaSegundos: obj.cta_s,
        });
      } catch (e) {
        console.log(c.rojo(`  parrafos ${desde}-${hasta}: ${redactar(e.message)}`));
        continue;
      }
      const cabe = plan.duracion >= minimo && plan.duracion <= maximo;
      evaluados.push({ plan, cabe });
      console.log(
        `  ${cabe ? c.verde('✓') : c.dim('·')} parrafos ${String(`${desde}-${hasta}`).padEnd(7)} ` +
        `${plan.duracion.toFixed(1)}s  ` +
        c.dim(`(voz ${plan.segundosVoz.toFixed(1)}s + silencios ${plan.segundosSilencio.toFixed(1)}s ` +
          `+ entrada ${plan.entrada.toFixed(1)}s + salida ${plan.salida.toFixed(1)}s + cierre ${plan.ctaSegundos}s)`)
      );
    }

    const elegido = (evaluados.find((e) => e.cabe) ?? evaluados[0])?.plan;
    if (!elegido) { console.log(c.rojo('  Ningun candidato es viable.')); continue; }

    console.log(`\n  Elegido: parrafos ${elegido.desde}-${elegido.hasta} · ${elegido.duracion.toFixed(1)}s`);
    console.log(`\n  Corte de entrada`);
    console.log(`    ${mmss(elegido.inicioEnVideo)} (${elegido.inicioEnVideo.toFixed(2)}s del video largo)`);
    console.log(c.dim(`    ${elegido.entrada.toFixed(2)}s de respiro tomados del silencio de ` +
      `${elegido.disponibleAntes.toFixed(1)}s que precede al parrafo ${elegido.desde}`));
    console.log(`\n  Corte de salida`);
    console.log(`    ${mmss(elegido.finEnVideo)} (${elegido.finEnVideo.toFixed(2)}s del video largo)`);
    console.log(c.dim(`    ${elegido.salida.toFixed(2)}s de cola tomados del silencio de ` +
      `${elegido.disponibleDespues.toFixed(1)}s que sigue al parrafo ${elegido.hasta}`));

    if (elegido.recortes.length) {
      console.log(`\n  Interludios acortados dentro del Short`);
      for (const r of elegido.recortes) {
        console.log(`    tras el parrafo ${r.trasParrafo}: ${r.recortadoDe}s → ${r.duracionDestino}s`);
      }
    }

    console.log(`\n  Texto exacto`);
    for (const t of elegido.texto) {
      const s = timeline.segmentos.find((x) => x.numero === t.parrafo);
      console.log(`    [${t.parrafo}] ${mmss(s.inicio)}–${mmss(s.fin)} (${s.duracion.toFixed(1)}s)`);
      for (const linea of envolver(t.texto, 76)) console.log(`         ${linea}`);
    }

    const palabras = palabrasDelShort(elegido, alignment.palabras);
    console.log(`\n  Subtitulos      ${palabras.length} palabras cuadran dentro del Short`);
    console.log(c.dim(`    primera "${palabras[0]?.texto}" en ${palabras[0]?.inicio.toFixed(2)}s · ` +
      `ultima "${palabras.at(-1)?.texto}" en ${palabras.at(-1)?.fin.toFixed(2)}s de ${elegido.duracion.toFixed(1)}s`));
    console.log(`  Cierre          «${(corto.cta ?? []).join(' / ')}» sobre musica, sin voz`);
  }

  titulo('Siguiente paso');
  console.log('  Nada renderizado y nada publicado. Estos extractos necesitan aprobacion.');
}

/** Parte un texto largo en lineas, sin cortar palabras. */
function envolver(texto, ancho) {
  const lineas = [];
  let actual = '';
  for (const palabra of texto.split(/\s+/)) {
    if (actual && (actual + ' ' + palabra).length > ancho) { lineas.push(actual); actual = palabra; }
    else actual = actual ? `${actual} ${palabra}` : palabra;
  }
  if (actual) lineas.push(actual);
  return lineas;
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
/**
 * Instante de arranque que mete mas notas de piano en una ventana de `dur`.
 *
 * El piano es el elemento mas escaso de la cama: pasa medio minuto callado
 * entre grupo y grupo. Una ventana elegida por el interludio puede no traer
 * ninguna nota, y entonces la muestra no sirve para aprobar el piano. Esto
 * busca el peor caso, que es lo que hay que escuchar.
 *
 * Una nota que empieza antes de la ventana pero cuya cola entra en ella no
 * cuenta: lo que se juzga es el ataque.
 */
function ventanaConMasPiano(grupos, dur, duracionTotal) {
  let mejor = 0;
  let cuantos = -1;
  for (let desde = 0; desde + dur <= duracionTotal; desde += 1) {
    const n = grupos.filter((g) => g.t >= desde && g.t + DECAE_PIANO <= desde + dur).length;
    if (n > cuantos) { cuantos = n; mejor = desde; }
  }
  return mejor;
}

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
  const base = canal.render;
  // El preset lo elige el pilar: el nocturno casi no se mueve, el de manana
  // llevara pan lateral perceptible. Son formatos distintos, no ajustes.
  const pilar = proyecto.plan?.pilar ?? base.preset_por_defecto ?? 'noche';
  const pre = base.presets[pilar] ?? base.presets.noche;
  const cfg = { ...base, ...pre };

  // La cama se planifica antes de elegir la ventana, porque una de las formas
  // de elegirla es "donde mas habla el piano".
  const m = cfg.musica;
  const forma = { huecos: timeline.huecos, finNarracion: timeline.fin_narracion_s, rampa: m.rampa_s };
  const apertura = (t) => aperturaEn(t, forma);
  const envolvente = (t) => nivelEn(t, {
    ...forma,
    cierre: {
      fadeIn: m.fade_in_s,
      fadeOut: timeline.cierre?.fade_out ?? 8,
      duracionTotal: timeline.duracion_total_s,
    },
    bajoVoz: m.bajo_voz_db, enInterludio: m.en_interludio_db,
  });
  // El piano se planifica para el video entero antes de sintetizar: asi una
  // ventana recortada trae las notas que sonaran ahi en el render completo.
  const grupos = planearPiano({ duracionTotal: timeline.duracion_total_s, apertura });

  // Ventana: alrededor del interludio pedido, con voz antes y despues.
  const largos = timeline.huecos.filter((h) => h.duracion >= 10);
  const elegido = opciones.interludio != null
    ? timeline.huecos[opciones.interludio - 1]
    : (largos[0] ?? timeline.huecos[0]);
  if (!elegido) throw new Error('El timeline no tiene interludios.');

  const dur = opciones.duracion ?? 80;
  const antes = Math.min(34, (dur - elegido.duracion) / 2);
  const porInterludio = Math.max(0, elegido.inicio - antes);
  const desde = opciones.desde ?? (opciones.piano
    ? ventanaConMasPiano(grupos, dur, timeline.duracion_total_s)
    : porInterludio);

  // Sin esto, una ventana que se sale del audio muere dentro de ffmpeg con
  // "Could not open encoder before EOF", que no dice nada de la causa real.
  const largoVoz = await duracionSegundos(voz);
  if (desde + dur > largoVoz + 0.5) {
    throw new Error(
      `La ventana ${mmss(desde)}–${mmss(desde + dur)} se sale de audio.mp3, que dura ${mmss(largoVoz)}.`
    );
  }

  exigirPerfilMusical(canal, pilar);
  titulo(`Muestra del renderer — ${id}`);
  console.log(`Imagen          ${basename(imagen)}`);
  console.log(`Ventana         ${mmss(desde)} → ${mmss(desde + dur)}  (${dur}s de ${mmss(timeline.duracion_total_s)})`);
  console.log(opciones.piano
    ? `Criterio        ventana con mas eventos de piano de todo el video`
    : `Interludio      ${elegido.duracion}s en ${mmss(elegido.inicio)}, tras el parrafo ${elegido.trasParrafo}`);
  console.log(`Salida          ${cfg.ancho}x${cfg.alto} · ${cfg.fps} fps · crf ${cfg.crf}`);
  console.log(`Preset          ${pilar} · ${cfg.movimiento} ${(cfg.zoom_total * 100).toFixed(0)}%`);
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
  const wav = join(tmp, 'cama.wav');
  const cama = generarCama({ segundos: dur, offset: desde, envolvente, apertura, grupos, salidaWav: wav });
  console.log(` ${m.bajo_voz_db} dB bajo voz → ${m.en_interludio_db} dB en interludio · ` +
    `${cama.gruposEnVentana} grupos de piano en la ventana (${grupos.length} en todo el video)`);

  const enVentana = grupos.filter((g) => g.t >= desde && g.t <= desde + dur);
  if (enVentana.length) {
    console.log(c.dim('\n  Eventos de piano de esta muestra (minuto del video → minuto de la muestra):'));
    for (const g of enVentana) {
      const hz = g.notas.map((n) => `${Math.round(n.hz)}`).join(' · ');
      console.log(c.dim(`    ${mmss(g.t)} → ${mmss(g.t - desde)}   ${g.notas.length} notas   ${hz} Hz`));
    }
    const agudo = Math.max(...enVentana.flatMap((g) => g.notas.map((n) => n.hz)));
    console.log(c.dim(`  Nota mas aguda de la ventana: ${Math.round(agudo)} Hz`));
  }

  process.stdout.write('  render…');
  const sufijo = opciones.recorrido ? '-recorrido' : (opciones.piano ? '-piano' : '');
  const destino = join(salida, `muestra${sufijo}.mp4`);
  await renderizar({
    imagen, particulas: loop, voz, musica: wav, salida: destino,
    desde, duracion: dur, duracionTotal: timeline.duracion_total_s,
    ancho: cfg.ancho, alto: cfg.alto, fps: cfg.fps,
    zoomTotal: cfg.zoom_total, foco: cfg.foco, crf: cfg.crf, preset: cfg.preset_x264,
    srt: canal.render.subtitulos_quemados ? join(salida, 'subtitles.srt') : null,
    recorridoCompleto: Boolean(opciones.recorrido),
  });
  const bytes = statSync(destino).size;
  console.log(` hecho · ${(bytes / 1048576).toFixed(1)} MB`);

  rmSync(tmp, { recursive: true, force: true });

  titulo('Que revisar');
  if (opciones.piano) {
    console.log('  1. Las notas de piano no deben leerse como aviso ni como timer');
    console.log('  2. Deben sonar redondas: entran creciendo, no de golpe');
    console.log('  3. Deben quedar por debajo del pad, asomando sin anunciarse');
    console.log('  4. Deben aparecer de vez en cuando, no gotear');
  } else {
    console.log('  1. Nitidez de la imagen al ampliarla');
    console.log('  2. Velocidad del movimiento: debe ser casi imperceptible');
    console.log('  3. Particulas: perceptibles sin distraer, con profundidad');
    console.log('  4. Volumen y textura de la cama bajo la voz');
  }
  if (elegido.inicio >= desde && elegido.inicio <= desde + dur) {
    console.log(`  5. Como sube en el interludio de ${mmss(elegido.inicio - desde)} a ` +
      `${mmss(elegido.inicio - desde + elegido.duracion)} de la muestra`);
  }
}

// --- render completo --------------------------------------------------

/**
 * Renderiza el video entero con la configuracion aprobada en la muestra.
 *
 * Misma ruta de codigo que 'muestra', solo que la ventana es el video
 * completo: si la muestra se aprobo, el render no puede salir distinto.
 */
async function cmdRender(id, opciones = {}) {
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
  const base = canal.render;
  const pilar = proyecto.plan?.pilar ?? 'noche';
  const cfg = { ...base, ...(base.presets[pilar] ?? base.presets.noche) };

  const total = opciones.duracion ?? timeline.duracion_total_s;
  const largoVoz = await duracionSegundos(voz);

  exigirPerfilMusical(canal, pilar);
  titulo(`Render completo — ${id}`);
  console.log(`Imagen          ${basename(imagen)}`);
  console.log(`Duracion        ${mmss(total)}`);
  console.log(`Preset          ${pilar} · ${cfg.movimiento}` +
    (cfg.movimiento === 'imagen_fija_particulas' ? ' (bucle visual, sin zoom)' : ` ${(cfg.zoom_total * 100).toFixed(0)}%`));
  console.log(`Salida          ${cfg.ancho}x${cfg.alto} · ${cfg.fps} fps · crf ${cfg.crf} · preset ${cfg.preset_x264}`);
  console.log(`Subtitulos      ${cfg.subtitulos_quemados ? 'QUEMADOS' : 'aparte, en subtitles.srt'}`);
  console.log(c.dim(`  voz: ${mmss(largoVoz)} · ${timeline.huecos.length} interludios + cierre de ${timeline.cierre?.music_seconds ?? 0}s`));

  const tmp = join(salida, '.tmp-render');
  mkdirSync(tmp, { recursive: true });
  const tiempos = {};
  const t0 = Date.now();

  process.stdout.write('\n  particulas…');
  const loop = join(tmp, 'motas.mov');
  const p = await generarLoop({
    salida: loop, ancho: cfg.ancho, alto: cfg.alto, fps: cfg.fps,
    periodo: cfg.particulas.periodo_s, cuantas: cfg.particulas.cuantas,
  });
  tiempos.particulas_s = (Date.now() - t0) / 1000;
  console.log(` ${p.motas} motas, bucle de ${p.periodo}s (${tiempos.particulas_s.toFixed(0)}s)`);

  process.stdout.write('  cama musical…');
  const t1 = Date.now();
  const m = cfg.musica;
  const forma = { huecos: timeline.huecos, finNarracion: timeline.fin_narracion_s, rampa: m.rampa_s };
  const apertura = (t) => aperturaEn(t, forma);
  const envolvente = (t) => nivelEn(t, {
    ...forma,
    cierre: { fadeIn: m.fade_in_s, fadeOut: timeline.cierre?.fade_out ?? 8, duracionTotal: timeline.duracion_total_s },
    bajoVoz: m.bajo_voz_db, enInterludio: m.en_interludio_db,
  });
  const wav = join(tmp, 'cama.wav');

  // Por defecto la cama es el pad sintetizado de siempre. opciones.musicaArchivo
  // (una pista de assets/music/) la sustituye por una cama de biblioteca
  // normalizada a opciones.objetivoLufs, con el mismo ducking — es lo que usa
  // el workflow de GitHub Actions para este proyecto. Sin esa opcion, nada
  // cambia frente al render de siempre.
  if (opciones.musicaArchivo) {
    const pista = join(DIR_MUSICA, opciones.musicaArchivo);
    if (!existsSync(pista)) throw new Error(`Falta la pista ${opciones.musicaArchivo} en ${DIR_MUSICA}`);
    const objetivo = opciones.objetivoLufs ?? -33.5;
    await camaDesdeArchivo({ pista, desdeEnPista: 0, segundos: total, envolvente, salidaWav: wav, gananciaDb: 0, fadeIn: 2, fadeOut: 3 });
    const sinCorregir = await sonoridad(wav);
    const correccion = objetivo - sinCorregir.lufs;
    await camaDesdeArchivo({ pista, desdeEnPista: 0, segundos: total, envolvente, salidaWav: wav, gananciaDb: correccion, fadeIn: 2, fadeOut: 3 });
    const final = await sonoridad(wav);
    tiempos.cama_s = (Date.now() - t1) / 1000;
    tiempos.cama_lufs = final.lufs;
    console.log(` ${basename(opciones.musicaArchivo)} a ${final.lufs.toFixed(1)} LUFS (objetivo ${objetivo}) (${tiempos.cama_s.toFixed(0)}s)`);
  } else {
    const grupos = planearPiano({ duracionTotal: timeline.duracion_total_s, apertura });
    generarCama({ segundos: total, offset: 0, envolvente, apertura, grupos, salidaWav: wav });
    tiempos.cama_s = (Date.now() - t1) / 1000;
    console.log(` ${grupos.length} grupos de piano (${tiempos.cama_s.toFixed(0)}s)`);
  }

  const destino = join(salida, 'video_final.mp4');

  if (cfg.movimiento === 'imagen_fija_particulas') {
    // Sin zoom, la unica variable visual en el tiempo son las particulas, que
    // ya cierran en un bucle perfecto de particulas.periodo_s (generarLoop,
    // ver lib/particulas.mjs). Renderizar UN segmento de ese periodo y
    // repetirlo con -c copy evita picar 30fps*total fotogramas por zoompan.
    const periodo = cfg.particulas.periodo_s;

    process.stdout.write('  segmento visual (una vuelta)…');
    const t2 = Date.now();
    const segmento = join(tmp, 'segmento-visual.mp4');
    await renderizarLoopVisual({
      imagen, particulas: loop, salida: segmento, periodo,
      ancho: cfg.ancho, alto: cfg.alto, fps: cfg.fps, crf: cfg.crf, preset: cfg.preset_x264,
    });
    tiempos.segmento_visual_s = (Date.now() - t2) / 1000;
    console.log(` ${periodo}s (${tiempos.segmento_visual_s.toFixed(1)}s)`);

    process.stdout.write('  repitiendo hasta la duracion…');
    const t3 = Date.now();
    const videoRepetido = join(tmp, 'video-repetido.mp4');
    const rep = await loopVisualHastaDuracion({ segmento, duracionTotal: total, periodo, salida: videoRepetido, tmp: join(tmp, '.tmp-loop') });
    tiempos.repeticion_s = (Date.now() - t3) / 1000;
    console.log(` ${rep.vueltas} vueltas (${tiempos.repeticion_s.toFixed(1)}s)`);

    process.stdout.write('  mux final (video sin recodificar)…');
    const t4 = Date.now();
    // remuxarAudio no recorta: si total es menor que la voz completa (--duracion
    // de prueba), hay que recortar la voz aparte o el audio se alargaria mas
    // alla del video repetido. En el render real total siempre es la duracion
    // completa, asi que esto no hace nada de mas trabajo.
    let vozParaMux = voz;
    if (total < largoVoz - 0.05) {
      vozParaMux = join(tmp, 'voz-recortada.mp4');
      const ffmpeg = await rutaFfmpeg();
      await ejecutar(ffmpeg, ['-y', '-loglevel', 'error', '-i', voz, '-t', total.toFixed(3), '-c', 'copy', vozParaMux]);
    }
    await remuxarAudio({ video: videoRepetido, voz: vozParaMux, musica: wav, salida: destino });
    tiempos.mux_s = (Date.now() - t4) / 1000;
    console.log(` (${tiempos.mux_s.toFixed(1)}s)`);
    tiempos.render_video_s = tiempos.segmento_visual_s + tiempos.repeticion_s + tiempos.mux_s;
  } else {
    process.stdout.write('  render…');
    const t2 = Date.now();
    await renderizar({
      imagen, particulas: loop, voz, musica: wav, salida: destino,
      desde: 0, duracion: total, duracionTotal: timeline.duracion_total_s,
      ancho: cfg.ancho, alto: cfg.alto, fps: cfg.fps,
      zoomTotal: cfg.zoom_total, foco: cfg.foco, crf: cfg.crf, preset: cfg.preset_x264,
      srt: cfg.subtitulos_quemados ? join(salida, 'subtitles.srt') : null,
    });
    tiempos.render_video_s = (Date.now() - t2) / 1000;
    console.log(` hecho en ${(tiempos.render_video_s / 60).toFixed(1)} min`);
  }

  const bytes = statSync(destino).size;
  rmSync(tmp, { recursive: true, force: true });

  const real = await duracionSegundos(destino);
  titulo('Video final');
  console.log(`  video_final.mp4   ${mmss(real)} · ${(bytes / 1048576).toFixed(0)} MB`);
  console.log(`  subtitles.srt     aparte, sin quemar`);
  const desvio = Math.abs(real - timeline.duracion_total_s);
  console.log(
    desvio <= 0.5
      ? c.verde(`  ✓ Duracion cuadra con el timeline (desvio ${(desvio * 1000).toFixed(0)} ms)`)
      : c.rojo(`  ✗ Duracion no cuadra: ${real.toFixed(2)}s vs ${timeline.duracion_total_s.toFixed(2)}s`)
  );
  if (desvio > 0.5) process.exitCode = 1;

  writeFileSync(join(salida, 'render_tiempos.json'), JSON.stringify({
    ...tiempos, duracion_real_s: real, duracion_esperada_s: timeline.duracion_total_s, tamano_bytes: bytes,
  }, null, 2) + '\n');
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
  ${c.cian('previsualizar')} <proyecto> MP4 de revision: negro + voz + subtitulos\n  ${c.cian('muestra')}  <proyecto>      Ventana corta con imagen, movimiento, motas y musica\n                            --piano elige la ventana con mas eventos de piano\n  ${c.cian('render')}   <proyecto>      Video completo con la configuracion aprobada\n  ${c.cian('remuxar')}  <proyecto>      Cambia solo el audio de un render ya hecho (--video <mp4>)\n  ${c.cian('diagnosticar')} <mp4>       Estructura del contenedor para reproduccion web (--reparar)\n  ${c.cian('shorts')}   <proyecto>      Propone los extractos verticales (--render los monta)\n  ${c.cian('musica-prueba')} <proyecto> Tres muestras con la misma voz y distinta cama\n  ${c.cian('musica-interludio')} <proyecto> A/B de cuanto sube la cama al callar la voz\n  ${c.cian('resumen')}  [--json <ruta>] Calibracion en formato publicable
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
    case 'render': {
      const i = resto.indexOf('--duracion');
      const iMusica = resto.indexOf('--musica');
      const iLufs = resto.indexOf('--lufs');
      return cmdRender(exigeProyecto(), {
        duracion: i > -1 ? Number(resto[i + 1]) : undefined,
        musicaArchivo: iMusica > -1 ? resto[iMusica + 1] : undefined,
        objetivoLufs: iLufs > -1 ? Number(resto[iLufs + 1]) : undefined,
      });
    }
    case 'muestra': {
      const num = (f) => { const i = resto.indexOf(f); return i > -1 ? Number(resto[i + 1]) : undefined; };
      return cmdMuestra(exigeProyecto(), {
        desde: num('--desde'), duracion: num('--duracion'), interludio: num('--interludio'),
        recorrido: resto.includes('--recorrido'),
        piano: resto.includes('--piano'),
      });
    }
    case 'remuxar': {
      const i = resto.indexOf('--video');
      return cmdRemuxar(exigeProyecto(), { video: i > -1 ? resto[i + 1] : undefined });
    }
    case 'diagnosticar': {
      const i = resto.indexOf('--salida');
      return cmdDiagnosticar(arg, {
        reparar: resto.includes('--reparar'),
        completo: resto.includes('--completo'),
        salida: i > -1 ? resto[i + 1] : undefined,
      });
    }
    case 'shorts': {
      const fotograma = resto.includes('--fotograma');
      if (!fotograma && !resto.includes('--render')) return cmdShortsPlan(exigeProyecto());
      const i = resto.indexOf('--solo');
      return cmdShortsRender(exigeProyecto(), { fotograma, solo: i > -1 ? resto[i + 1] : undefined });
    }
    case 'musica-prueba': {
      const num = (f) => { const i = resto.indexOf(f); return i > -1 ? Number(resto[i + 1]) : undefined; };
      return cmdMusicaPrueba(exigeProyecto(), { desde: num('--desde'), duracion: num('--duracion') });
    }
    case 'musica-interludio': {
      const num = (f) => { const i = resto.indexOf(f); return i > -1 ? Number(resto[i + 1]) : undefined; };
      return cmdMusicaInterludio(exigeProyecto(), { desde: num('--desde'), duracion: num('--duracion') });
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
