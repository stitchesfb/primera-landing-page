# Oraciones diarias — generador de videos

Genera videos animados de oraciones para YouTube a partir de un archivo de
texto. Mismo contenido en dos formatos: **Shorts vertical (1080×1920)** y
**horizontal (1920×1080)**.

Estilo: minimalista tipográfico. Fondo oscuro, tipografía serif, las líneas
de la oración entran una a una y se van; nada de imágenes de archivo.

## Cómo se hace un video

```bash
cd videos
npm install                                   # solo la primera vez
node render.mjs --oracion manana --formato ambos --tono
```

Sale en `out/manana/`:

```
manana-shorts.mp4      1080×1920, ~51 s   → YouTube Shorts, Reels, TikTok
manana-wide.mp4        1920×1080, ~51 s   → video normal de YouTube
miniatura-shorts.png   1080×1920          → portada vertical
miniatura-wide.png     1280×720           → miniatura de YouTube
youtube.txt            título, descripción y etiquetas listos para copiar
```

### Opciones

| Opción | Qué hace |
| --- | --- |
| `--oracion <id>` | Qué oración renderizar. `todas` (por defecto) las hace en fila |
| `--formato <f>` | `shorts`, `wide` o `ambos` (por defecto) |
| `--fps <n>` | Fotogramas por segundo. 30 por defecto; 60 tarda el doble |
| `--velocidad <n>` | Ritmo general. `1.2` = más pausado, `0.85` = más ágil |
| `--tono` | Añade un fondo sonoro suave generado con ffmpeg |
| `--sin-miniatura` | No genera las imágenes de portada |
| `--salida <dir>` | Carpeta de salida (por defecto `out/`) |

Renderizar los dos formatos tarda unos minutos: se captura cada fotograma por
separado, que es justo lo que evita los tirones.

## Cómo escribir una oración nueva

Todo el contenido vive en `oraciones.json`. Copia el bloque de `manana`,
cámbiale el `id` y escribe el texto:

```json
{
  "id": "noche",
  "tema": "tinta",
  "eyebrow": "Oración diaria",
  "titulo": "Oración de la noche",
  "subtitulo": "Para cerrar el día en paz",
  "segmentos": [
    { "lineas": ["Gracias por lo que hoy salió bien,", "y por lo que no."] }
  ],
  "cierre": "Amén.",
  "youtube": { "titulo": "…", "descripcion": "…", "etiquetas": ["…"] }
}
```

Dos cosas que importan:

- **Cada `lineas` es un salto de línea real en pantalla.** Corta donde
  respirarías al leer en voz alta, no donde caiga el margen. Tres o cuatro
  líneas por segmento es lo que se lee cómodo en un móvil.
- **La duración se calcula sola** según cuántos caracteres tiene el segmento.
  Si uno concreto necesita más aire, añádele `"factor": 1.3`.

El `handle` del canal y la llamada a la acción están en `canal`, arriba del
archivo. Los colores, en `temas`: viene `tinta` (fondo oscuro) y `papel`
(fondo claro), y puedes añadir los tuyos.

## Cómo funciona por dentro

```
scene.html + scene.css + scene.js   La escena, como página web
render.mjs                          Captura y codificación
fonts/                              EB Garamond e Inter (SIL Open Font License)
```

El truco está en que **nada se anima solo**. `scene.js` expone `seek(t)`, que
dibuja el estado exacto de la escena en el segundo `t`. `render.mjs` abre la
página en Chromium, llama a `seek(0)`, `seek(1/30)`, `seek(2/30)`… captura
cada fotograma y se los pasa a ffmpeg por una tubería.

Como no depende del reloj del navegador, da igual que la máquina vaya lenta:
no se pierde ni un fotograma y dos renders del mismo texto salen idénticos.

Antes de codificar pasa un `gradfun` con un grano finísimo de semilla fija: el
degradado del fondo se dibuja en 8 bits y, sobre negro, deja anillos de
banding bien visibles. Ese paso los deshace y evita que x264 los recree.

## Sonido

`--tono` genera un fondo sonoro sobrio (tres notas graves con un vibrato muy
lento) para que el video no suba mudo. Es un suelo, no una banda sonora.

Para narración o música de verdad, lo práctico es renderizar sin `--tono` y
montar el audio encima:

```bash
ffmpeg -i out/manana/manana-shorts.mp4 -i voz.mp3 \
  -c:v copy -c:a aac -b:a 192k -shortest manana-final.mp4
```

Ojo con la música: en YouTube usa pistas de la Biblioteca de audio o con
licencia propia, o el video se lleva un reclamo de Content ID.

## Licencias

- **Tipografías**: EB Garamond e Inter, ambas bajo SIL Open Font License 1.1.
  Se pueden incrustar y usar comercialmente.
- **Textos de las oraciones**: originales, escritos para este proyecto. Si
  añades oraciones litúrgicas o traducciones bíblicas modernas, comprueba
  antes sus derechos.
