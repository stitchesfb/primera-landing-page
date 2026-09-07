# Video 6 — informe del render maestro completo (pase 8)

## Fuentes utilizadas (todas ya aprobadas, ninguna modificada)

- Audio maestro: `output/audio.mp3` (`audio_final_v4`, 49:58.67, sha256
  `9aac92ef7b6cd3811a54453330082413c1a6fe59357b830eb09a3acf407124f6`).
  Solo se decodificó para poder mezclarlo con la música — el archivo en
  disco nunca se recortó, normalizó, recodificó ni se le tocaron pausas o
  párrafos. Verificado idéntico (mismo hash) antes y después del render.
- Música: `assets/music/one_step_closer.mp3` únicamente, sin combinar pistas.
- Imágenes: las 4 aprobadas (`frame_inicial_hook_v2`, `frame_inicial_limpio_v1`,
  `escena_descanso_v1`, `escena_quietud_lago_v1`, esta última reemplazada
  por la versión corregida verificada por hash tras el primer intento fallido).
- Partículas: sistema aprobado (`lib/particulas.mjs`), 82 partículas/24s en
  todas las escenas excepto densidad reducida (18 partículas) durante el hook.

## Incidencias encontradas y corregidas durante este pase

1. **Imagen del lago corrupta** (bloqueó el primer intento): el PNG
   original del zip estaba truncado (sin `IEND`, un `IDAT` incompleto).
   Diagnosticado por verificación de CRC de cada chunk. Reemplazado por
   la versión reexportada, verificada exhaustivamente (hash, tamaño,
   estructura, decodificación) antes de usarla.
2. **Timestamp duplicado en las uniones entre escenas**: el primer
   ensamblaje reveló, en el decodificado completo del video, una
   advertencia de "dts no monótono" exactamente en la unión
   limpia→transición 2. Diagnóstico: `loopVisualHastaDuracion()` recorta
   el bucle repetido con `-c copy -t`, y como la duración de cada escena
   no es múltiplo exacto de los 24s del período, ese recorte cae a mitad
   de un GOP con fotogramas B pendientes, dejando corrupto el último
   fotograma de cada tramo repetido. Las uniones INTERNAS de la
   repetición (copia N → copia N+1 del mismo archivo) se verificaron
   limpias por separado. Arreglo: en vez de recortar el sobrante, se
   generan solo copias COMPLETAS del bucle de 24s (empalman limpio, ya
   verificado) y el remanente fraccional final de cada escena se renderiza
   de nuevo como una pasada de codificación real y propia — igual método
   que ya usa `renderizarLoopVisual()`, sin tocar el archivo de la
   librería. Verificado: decodificación completa del video final sin
   ninguna advertencia de timestamp.
3. **Error de medición durante la validación** (no del render): al
   comprobar el fundido de cierre de 30s con `ffmpeg -ss X -i archivo`,
   el flag `-ss` colocado DESPUÉS de `-i` no recorta lo que ve un filtro
   acumulativo como `volumedetect` — solo recorta la salida. Esto hizo
   parecer, en una primera pasada, que el fundido no existía. Repetido
   con `-ss` ANTES de `-i` (ventana real), se confirmó que el fundido de
   30s sí está correctamente aplicado en el audio (ver §4). El propio
   render nunca tuvo este defecto — fue un error de la técnica de
   medición, ya corregido.

## Especificaciones técnicas del render maestro

| Campo | Valor |
|---|---|
| Ruta | `estudio/proyectos/video_006/output/video_final.mp4` |
| Tamaño | 263,522,499 bytes (251.3 MiB) |
| Duración | 2998.634 s (49:58.63) — vídeo 2998.634s / audio 2998.624s, diferencia 0.3 fotogramas, dentro de la tolerancia de 1 fotograma |
| Vídeo | H.264, 1920×1080, 30 fps, 89959 fotogramas, ~498 kb/s |
| Audio | AAC-LC, 44100 Hz, estéreo, ~196 kb/s |
| Bitrate total (contenedor) | 703 kb/s |
| SHA-256 (maestro completo) | `a602473a851a8d78141bcebfd3c993df24f632267d00f7f037e5b31e898197fe` |

## Validación realizada

- **Primer fotograma y audio desde 00:00**: confirmado — primer
  fotograma muestra el hook con el texto completo; audio mide -22.5dB de
  media en los primeros 0.5s (locución real, no silencio).
- **Desaparición del hook en 4.866s**: fundido de 0.4s (4.866s→5.266s),
  verificado a nivel de fotograma (transición suave, sin salto de
  timestamp en la unión).
- **Transiciones tras p146 y p389**: fundidos de 1.0s, centrados en cada
  interludio de 6s declarado (760.8865s–766.8865s tras p146,
  2156.0333s–2162.0333s tras p389), completamente contenidos dentro del
  silencio — no tocan narración. Timestamps exactos: **763.3865s→764.3865s**
  (limpia→descanso) y **2158.5333s→2159.5333s** (descanso→lago).
- **Uniones del bucle musical**: primera costura en t=113.900s, crossfade
  de potencia constante de 4.000s (`cruceSegundos` confirmado por código).
  Comprobadas varias costuras posteriores contra el nivel de música
  aislado (sin voz): sin salto de volumen. Una caída de nivel observada en
  una primera pasada (t≈683s) se verificó como una pausa narrativa
  declarada (hueco tras p133, 683.89s–686.89s), no un defecto de la música.
- **Nivel de música estable**: plano en -23dB bajo voz y en interludios en
  todo el cuerpo del video (sin ducking, por diseño del perfil nocturno).
- **Inicio de los 90s finales**: la música continúa sola tras
  `fin_narracion_s`=2908.697s.
- **Fundido de los últimos 30s**: verificado con ventana de entrada real
  (`-ss` antes de `-i`): -32.2dB (mitad del outro, sin fundir) →
  -43.5dB (justo antes de los 30s finales) → -50.1dB (mitad del fundido)
  → -75.4dB (últimos 3s) — progresión monótona y correcta hacia el
  silencio.
- **Último fotograma y final exacto**: última imagen es la escena del
  lago, sin pantalla negra, sin corrupción.
- **Duración total**: 2998.634s, dentro de 1 fotograma del audio real.
- **Integridad técnica**: decodificación completa del archivo final sin
  errores ni advertencias (`ffmpeg -v error ... -f null -` limpio).
- **Sincronización audio/vídeo**: diferencia de duración entre pistas
  0.01s (0.3 fotogramas); fotogramas de inicio/fin y transiciones caen
  exactamente donde el guion y el plan de audio los sitúan.
- **Hash del maestro congelado**: idéntico antes y después del render
  (`9aac92e...4f6`).

## Entregables

- `output/video_final.mp4` — render maestro completo (263.5 MB). Por
  superar el límite de 100 MB de GitHub, se persiste partido en 3
  fragmentos en `output/video_final_chunks/` (instrucciones de
  reconstrucción y verificación por hash en `RECONSTRUIR.md` de esa carpeta).
- `output/video_final_comprimido.mp4` — copia de revisión (960×540).
- Este informe.

`subtitles.srt` se conserva sin cambios como archivo aparte para YouTube;
no se quemó en el vídeo ni se añadió ningún otro elemento en pantalla.
