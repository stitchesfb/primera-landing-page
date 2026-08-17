# Oraciones diarias — generador de videos

Genera videos animados de oraciones para YouTube a partir de un archivo de
texto. Mismo contenido en dos formatos: **Shorts vertical (1080×1920)** y
**horizontal (1920×1080)**.

Cada video trae fondo animado, música y el texto de la oración entrando línea
a línea. Todo se dibuja o se sintetiza aquí: ni una imagen de archivo ni una
pista de música con licencia de terceros.

## Cómo se hace un video

```bash
cd videos
npm install                                   # solo la primera vez
node render.mjs --oracion manana --formato ambos
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
| `--sin-musica` | Deja el video mudo, para ponerle tu propia voz o música |
| `--sin-miniatura` | No genera las imágenes de portada |
| `--salida <dir>` | Carpeta de salida (por defecto `out/`) |

Renderizar los dos formatos tarda unos minutos: se captura cada fotograma por
separado, que es justo lo que evita los tirones.

## El fondo

Por defecto es un **amanecer dibujado**: el cielo pasa de noche cerrada a
ámbar, las estrellas se apagan, el sol sube por detrás de las colinas y las
nubes cruzan despacio, con polvo suspendido en el aire. Está pintado en un
canvas (`fondo.js`), así que no pesa nada y se puede retocar cambiando
números: las paletas `NOCHE` y `ALBA` mandan sobre todos los colores.

El texto vive en la mitad alta, que es la zona que se mantiene oscura durante
todo el video. Por eso el blanco se lee bien incluso cuando el horizonte ya
está encendido.

### Usar tu propia foto

Si prefieres una imagen tuya de fondo, añádela a la oración en
`oraciones.json`:

```json
"fondo": { "imagen": "img/amanecer.jpg" }
```

La ruta es relativa a la carpeta `videos/`. La foto se encuadra sola y lleva
un travelling lento de acercamiento, para que no quede una imagen congelada.
Conviene que sea grande (2000 px de ancho o más) y que la zona central no
tenga mucho detalle, que es donde va el texto.

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
archivo. Los colores del texto, en `temas`.

## La música

`audio.mjs` sintetiza la pista nota a nota: un acorde de La mayor sostenido,
con campanas que caen encima cada seis segundos y medio, un eco cruzado que
abre el estéreo y fundidos largos a la entrada y a la salida.

Está escrita a mano en vez de usar una pista de archivo por dos razones: no
hay licencia que revisar ni reclamo de Content ID posible, y se puede ajustar
el largo al segundo exacto de cada video.

El detalle que importa: **el cuerpo del sonido está entre 220 Hz y 1,3 kHz**.
Un altavoz de móvil no reproduce casi nada por debajo de 300 Hz, así que un
fondo hecho solo de graves —por bonito que suene con cascos— es silencio en la
mayoría de las reproducciones de un Short. La pista queda en torno a
−16 LUFS: se oye sin esfuerzo, algo por debajo de lo que YouTube normaliza
(−14 LUFS), y deja sitio de sobra para una voz encima.

Para narrar tú la oración, renderiza mudo y monta la voz después:

```bash
node render.mjs --oracion manana --formato shorts --sin-musica
ffmpeg -i out/manana/manana-shorts.mp4 -i voz.mp3 \
  -c:v copy -c:a aac -b:a 192k -shortest manana-final.mp4
```

Si en vez de esto quieres música de verdad, usa la Biblioteca de audio de
YouTube o pistas con licencia propia; cualquier otra cosa se lleva un reclamo.

## Cómo funciona por dentro

```
scene.html + scene.css + scene.js   La escena y el texto, como página web
fondo.js                            El amanecer, dibujado en canvas
audio.mjs                           La música, sintetizada a un WAV
render.mjs                          Captura y codificación
fonts/                              EB Garamond e Inter (SIL Open Font License)
```

El truco está en que **nada se anima solo**. `scene.js` expone `seek(t)`, que
dibuja el estado exacto de la escena en el segundo `t` —incluido el fondo, que
también se pinta en función de `t`—. `render.mjs` abre la página en Chromium,
llama a `seek(0)`, `seek(1/30)`, `seek(2/30)`… captura cada fotograma y se los
pasa a ffmpeg por una tubería.

Como no depende del reloj del navegador, da igual que la máquina vaya lenta:
no se pierde ni un fotograma y dos renders del mismo texto salen idénticos.
Las estrellas y las motas de polvo salen de un generador con semilla fija, por
lo mismo.

Antes de codificar pasa un `gradfun` con un grano finísimo de semilla fija:
los degradados del cielo se dibujan en 8 bits y dejan anillos de banding bien
visibles. Ese paso los deshace y evita que x264 los recree.

## Licencias

- **Tipografías**: EB Garamond e Inter, ambas bajo SIL Open Font License 1.1.
  Se pueden incrustar y usar comercialmente.
- **Fondo y música**: generados por este código, sin material de terceros.
- **Textos de las oraciones**: originales, escritos para este proyecto. Si
  añades oraciones litúrgicas o traducciones bíblicas modernas, comprueba
  antes sus derechos.
