#!/usr/bin/env node
/**
 * Renderiza los videos de oraciones diarias.
 *
 * Abre scene.html en Chromium, avanza la escena fotograma a fotograma con
 * seek(t), captura cada uno como PNG y se los pasa a ffmpeg por una tubería.
 * Al no depender del reloj del navegador, el resultado es idéntico en cada
 * ejecución y no hay fotogramas perdidos aunque la máquina vaya lenta.
 *
 * Uso:
 *   node render.mjs --oracion manana --formato ambos
 *   node render.mjs --oracion todas --formato shorts --sin-musica
 *
 * Opciones:
 *   --oracion <id|todas>   Qué oración renderizar (por defecto: todas)
 *   --formato <f>          shorts | wide | ambos        (por defecto: ambos)
 *   --fps <n>              Fotogramas por segundo       (por defecto: 30)
 *   --velocidad <n>        Multiplicador de ritmo, 1.2 = más pausado
 *   --sin-musica           Deja el video mudo, para ponerle tu propio audio
 *   --sin-miniatura        No genera la imagen de portada
 *   --salida <dir>         Carpeta de salida             (por defecto: ./out)
 */

import { chromium } from 'playwright';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generarMusica } from './audio.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));

const FORMATOS = {
  shorts: { ancho: 1080, alto: 1920 },
  wide: { ancho: 1920, alto: 1080 },
};

// --- argumentos -------------------------------------------------------

function parseArgs(argv) {
  const o = {
    oracion: 'todas',
    formato: 'ambos',
    fps: 30,
    velocidad: 1,
    musica: true,
    miniatura: true,
    salida: join(AQUI, 'out'),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--oracion') o.oracion = argv[++i];
    else if (a === '--formato') o.formato = argv[++i];
    else if (a === '--fps') o.fps = Number(argv[++i]);
    else if (a === '--velocidad') o.velocidad = Number(argv[++i]);
    else if (a === '--sin-musica') o.musica = false;
    else if (a === '--sin-miniatura') o.miniatura = false;
    else if (a === '--salida') o.salida = argv[++i];
    else if (a === '--ayuda' || a === '-h') { console.log(ayuda()); process.exit(0); }
    else { console.error('Opción desconocida: ' + a); process.exit(1); }
  }
  if (!['shorts', 'wide', 'ambos'].includes(o.formato)) {
    console.error('--formato debe ser shorts, wide o ambos');
    process.exit(1);
  }
  return o;
}

function ayuda() {
  return readFileSync(new URL(import.meta.url))
    .toString()
    .split('\n')
    .slice(1)
    .filter((l) => l.startsWith(' *') || l.startsWith('/**'))
    .map((l) => l.replace(/^\/?\*+ ?/, ''))
    .join('\n');
}

// --- Chromium ---------------------------------------------------------

/**
 * Playwright descarga su propio Chromium, pero en contenedores preparados
 * (como el de Claude Code) ya viene uno instalado con otro número de build.
 * Si el que espera Playwright no está, reutilizamos el que haya.
 */
function buscarChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const raiz = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!raiz || !existsSync(raiz)) return undefined;
  const candidatos = readdirSync(raiz)
    .filter((d) => d.startsWith('chromium-'))
    .map((d) => join(raiz, d, 'chrome-linux', 'chrome'))
    .filter((p) => existsSync(p));
  return candidatos[0];
}

// --- ffmpeg -----------------------------------------------------------

function correrFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', reject);
    p.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error('ffmpeg salió con código ' + code + '\n' + err.slice(-1500)))
    );
  });
}

function escribir(stream, buf) {
  return new Promise((resolve, reject) => {
    if (stream.write(buf)) return resolve();
    // Hay que quitar el listener que no se usa: si no, cada fotograma que
    // espera a que se vacíe el buffer deja uno colgado en el socket.
    const alFallar = (e) => { stream.off('drain', alDrenar); reject(e); };
    const alDrenar = () => { stream.off('error', alFallar); resolve(); };
    stream.once('drain', alDrenar);
    stream.once('error', alFallar);
  });
}


// --- render de un formato --------------------------------------------

async function renderFormato(page, { oracion, tema, canal, formato, opciones, destino }) {
  const { ancho, alto } = FORMATOS[formato];
  await page.setViewportSize({ width: ancho, height: alto });
  await page.goto(pathToFileURL(join(AQUI, 'scene.html')).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);

  const { duracion, hitos } = await page.evaluate(
    (cfg) => window.montar(cfg),
    { oracion, tema, canal, formato, velocidad: opciones.velocidad }
  );

  const fps = opciones.fps;
  const total = Math.round(duracion * fps);
  const salidaVideo = join(destino, `${oracion.id}-${formato}.mp4`);
  const salidaCruda = opciones.musica ? join(destino, `.${oracion.id}-${formato}.tmp.mp4`) : salidaVideo;

  const ff = spawn(ffmpegPath, [
    '-y',
    '-f', 'image2pipe', '-vcodec', 'png', '-framerate', String(fps), '-i', 'pipe:0',
    // El degradado del fondo se dibuja en 8 bits y deja anillos de banding muy
    // visibles sobre un fondo oscuro. gradfun los deshace y el grano —con
    // semilla fija, para no perder la reproducibilidad— evita que el propio
    // x264 los vuelva a crear al cuantizar.
    '-vf', 'gradfun=strength=1.5:radius=24,noise=alls=2:allf=t:all_seed=20260804',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart',
    salidaCruda,
  ], { stdio: ['pipe', 'ignore', 'pipe'] });

  let errFf = '';
  ff.stderr.on('data', (d) => { errFf += d; });
  const cerrado = new Promise((resolve, reject) => {
    ff.on('error', reject);
    ff.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error('ffmpeg salió con código ' + code + '\n' + errFf.slice(-1500)))
    );
  });

  process.stdout.write(`  ${formato} · ${ancho}×${alto} · ${duracion.toFixed(1)} s · ${total} fotogramas\n  `);
  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.seek(t), i / fps);
    const png = await page.screenshot({ type: 'png', animations: 'disabled' });
    await escribir(ff.stdin, png);
    if (i % Math.ceil(total / 40) === 0) process.stdout.write('·');
  }
  ff.stdin.end();
  process.stdout.write(' listo\n');
  await cerrado;

  if (opciones.musica) {
    const wav = join(destino, `.${oracion.id}-${formato}.wav`);
    generarMusica(wav, duracion);
    await correrFfmpeg([
      '-y', '-i', salidaCruda, '-i', wav,
      '-map', '0:v', '-map', '1:a',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest',
      '-movflags', '+faststart', salidaVideo,
    ]);
    rmSync(salidaCruda, { force: true });
    rmSync(wav, { force: true });
  }

  // Miniatura: un fotograma de la portada, ya compuesto.
  if (opciones.miniatura) {
    await page.evaluate((t) => window.seek(t), hitos.portada);
    const bruta = join(destino, `.miniatura-${formato}.png`);
    await page.screenshot({ path: bruta, type: 'png', animations: 'disabled' });
    const destinoMini = join(destino, `miniatura-${formato}.png`);
    const escala = formato === 'wide' ? '1280:720' : '1080:1920';
    await correrFfmpeg(['-y', '-i', bruta, '-vf', `scale=${escala}:flags=lanczos`, destinoMini]);
    rmSync(bruta, { force: true });
  }

  return { salidaVideo, duracion };
}

// --- principal --------------------------------------------------------

async function main() {
  const opciones = parseArgs(process.argv.slice(2));
  const datos = JSON.parse(readFileSync(join(AQUI, 'oraciones.json'), 'utf8'));

  const seleccion = opciones.oracion === 'todas'
    ? datos.oraciones
    : datos.oraciones.filter((o) => o.id === opciones.oracion);

  if (!seleccion.length) {
    console.error(`No encuentro la oración «${opciones.oracion}». Disponibles: ` +
      datos.oraciones.map((o) => o.id).join(', '));
    process.exit(1);
  }

  const formatos = opciones.formato === 'ambos' ? ['shorts', 'wide'] : [opciones.formato];
  const executablePath = buscarChromium();
  const navegador = await chromium.launch({ executablePath });
  const page = await navegador.newPage();

  try {
    for (const oracion of seleccion) {
      const tema = datos.temas[oracion.tema] || datos.temas.tinta;
      const destino = join(opciones.salida, oracion.id);
      mkdirSync(destino, { recursive: true });

      console.log(`\n▸ ${oracion.titulo}`);
      for (const formato of formatos) {
        await renderFormato(page, { oracion, tema, canal: datos.canal, formato, opciones, destino });
      }

      if (oracion.youtube) {
        const y = oracion.youtube;
        writeFileSync(
          join(destino, 'youtube.txt'),
          [
            'TÍTULO', y.titulo, '',
            'DESCRIPCIÓN', y.descripcion, '',
            'ETIQUETAS', (y.etiquetas || []).join(', '), '',
          ].join('\n'),
          'utf8'
        );
      }
      console.log(`  → ${destino}`);
    }
  } finally {
    await navegador.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
