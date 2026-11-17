# Video 10 — Prueba audiovisual de la apertura + Salmo 121 (68 s)

**Estado:** entregada para revisión de Orlando. **No se renderizó el video largo ni los Shorts.**
**Fecha:** 2026-11-17
**Audio maestro:** `video_010_narracion_completa_sin_musica_v2.mp3` (la versión corregida y aprobada), sin tocar.

## Qué cubre la prueba

0–68,0 s: la apertura (bloque 1 revisado), la pausa 1 real (3 s, tras «…el que te guarda”»."») y la lectura completa del Salmo 121 (bloque 2), con su silencio natural final. Ventana elegida para terminar justo después del cierre de la lectura («…para siempre»."»), dentro del rango de 60–90 s pedido.

## Imagen

Se usaron las dos imágenes adjuntas de forma distinta, siguiendo el criterio ya establecido en el Video 9 (la miniatura no se inserta en el video):

- **Fondo del video:** `originales/E01_valle_nocturno.webp` — el paisaje de montaña sin texto. Recortado/escalado a 1920×1080 (16:9).
- **Miniatura:** `originales/VIDEO_010_MINIATURA.webp` ("DIOS NO DUERME · SALMO 121") — **no se incluyó en el render**, igual que las miniaturas de videos anteriores; se sube aparte en YouTube.

Si Orlando quería la miniatura como fondo del video, avisar para rehacer la prueba — se asumió este reparto por ser el mismo que ya se usó antes.

## Estilo nocturno (Decisiones Cerradas)

- **Movimiento:** imagen fija, sin zoom ni paneo (`canal.json` → `render.presets.noche`, `movimiento: imagen_fija_particulas`, `zoom_total: 0`) — el baseline cerrado, no el experimento de movimiento usado en los Videos 7/9.
- **Partículas:** 82, período 24 s (mismo preset nocturno de siempre). Blancas, suaves, discretas — verificado por fotograma en 1 s, 30 s y 60 s.
- **Resolución/fps:** 1920×1080, 30 fps, h264/aac.

## Música

**`alone_with_my_thoughts.mp3`** (Esther Abrami, "No.7 Alone With My Thoughts") — siguiente en la rotación libre del canal tras completar una vuelta: Video 7 = alone_with_my_thoughts, Video 8 = touching_moment, Video 9 = one_step_closer; el Video 10 vuelve a abrir el ciclo.

- Sonoridad medida (no asumida): **-27,7 LUFS** (coincide con `canal.json`).
- Ganancia aplicada: **+17,2 dB** (fórmula del canal: objetivo −33,5 LUFS + ducking 23 dB − LUFS medido).
- Ducking plano del perfil nocturno: **-23 dB bajo voz y en interludios, sin diferencia entre ambos** (regla aprobada 2026-08-22 — la música no sube en las pausas). Verificado con `volumedetect` en ventanas de 1 s alrededor de la pausa 1 (t=20 a t=27): nivel estable entre -32 y -36 dB en todo momento, sin ningún salto al entrar o salir de la pausa.
- Fade-in real de 4 s en el minuto 0 (de verdad es el inicio del video): verificado con `volumedetect` — silencio total en t=0-1s, subiendo gradualmente hasta el nivel estable hacia t=4-5s.
- Sin fade-out real (68 s no es el final del video) — se añadió únicamente un fundido corto de 1 s al final de la pista, solo para no cortar en seco el límite artificial de esta muestra de prueba.

## Verificación de los empalmes corregidos (7:01 y 11:37), sobre el audio maestro

Pedido aparte de esta prueba audiovisual: se volvió a comprobar con `silencedetect` sobre `video_010_narracion_completa_sin_musica_v2.mp3` (el mismo archivo usado como maestro aquí) que las dos pausas corregidas la tarea anterior siguen intactas:

| Pausa | Bloque | Medido ahora |
|---|---|---:|
| 5 (tras "Amén" del Short 2) | 6 | 4,027 s |
| 7 (tras "Amén" del Short 3) | 8 | 3,972 s |

Ambas dentro de tolerancia del objetivo de 4,0 s, sin cambios desde la corrección anterior.

## Cierre con fundido musical

Instrucción recibida para el cierre del video completo ("aplica el fundido musical suave después del Amén final"): anotada para el render completo — esta prueba de 68 s no llega al final del video (que está en el minuto 19), así que no hay un "Amén final" dentro de esta ventana para mostrarlo.

## Resultado

| Campo | Valor |
|---|---|
| Archivo | `video_010_prueba_apertura_salmo_68s.mp4` |
| Duración | 68,000 s |
| SHA-256 | `b226512af762325a9a9551ddd308bac75342236c417a746de1797a11f1c699e0` |
| Decodificación | completa, sin errores |

**Me detengo aquí** para que Orlando apruebe la imagen, las partículas y la mezcla antes del render completo del Video 10.
