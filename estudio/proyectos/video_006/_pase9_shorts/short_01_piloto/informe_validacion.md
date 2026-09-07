# Short 1 (piloto) — `short_01_piloto_v1.mp4` — informe de validación

Candidato 1 aprobado (p1–p10), intervalo `00:00.000 → 00:52.976` extraído de
`video_final.mp4`. Ningún otro Short se produjo en este pase.

## Fuentes usadas (ninguna modificada)

- Vídeo maestro: `output/video_final.mp4`, SHA-256
  `a602473a851a8d78141bcebfd3c993df24f632267d00f7f037e5b31e898197fe`
  — verificado idéntico antes y después de este trabajo.
- Audio maestro (indirectamente, vía el vídeo): `output/audio.mp3`, SHA-256
  `9aac92ef7b6cd3811a54453330082413c1a6fe59357b830eb09a3acf407124f6`
  — verificado sin cambios.
- Imágenes (las dos únicas autorizadas):
  `portada_hook_v2_1080x1920.png` (SHA-256
  `58d98cb18a6a46eb325172af1dfe40f616ed968ff931f7deeb2a6c7270d40c6c`) y
  `fondo_limpio_1080x1920.png` (SHA-256
  `24dec952193294a96bd1dbd8becf0b04e13b176f0988c57fc4b99ea652af8d44`).
- Partículas: sistema aprobado (`lib/particulas.mjs`), bucle vertical
  1080×1920/30fps de baja densidad (18 motas/24s, igual densidad que el
  hook del vídeo largo), generado con `generarLoop()` sin tocar la librería.
- Subtítulos: `alignment.json` v4 (canónico, post-reparación), sin Whisper
  ni re-alineación.

## Cómo se construyó

- **Audio**: un único recorte continuo de `video_final.mp4` con
  `-c:a copy` (`-ss 0 -to 52.976 -map 0:a -c:a copy`), duración real
  52.987937s (12ms sobre el objetivo por la cuantización propia de copiar
  AAC — no es un recorte adicional ni una alteración de contenido). En el
  montaje final el audio se vuelve a copiar tal cual (`-c:a copy`), sin
  ningún filtro, sin volver a tocar el `-ss`/`-to`.
- **Vídeo**: `portada_hook` estática 0–4.466s → transición `xfade` (fundido
  cruzado) de 0.4s entre 4.466s y 4.866s → `fondo_limpio` estática hasta el
  final. Sin zoom, sin pan, sin Ken Burns en ningún tramo (no se usó
  `zoompan`). Partículas superpuestas (`overlay`) en toda la duración.
  Subtítulos quemados con `subtitles=` (libass/ASS).
- **Duración del contenedor**: 1590 fotogramas a 30fps = 53.000s de vídeo
  (12ms más que el audio real de 52.988s, dentro de la misma tolerancia de
  redondeo ya aceptada en el render maestro). El audio nunca se recorta
  para encajar: se copia completo y el vídeo simplemente no termina antes.

## Validación obligatoria (12 puntos)

1. **Hash del maestro**: `video_final.mp4` verificado idéntico
   (`a602473a8...8197fe`) antes y después de este trabajo. ✅
2. **Intervalo continuo único**: el audio del Short procede de un solo
   `-ss 0 -to 52.976 -c:a copy` sobre el maestro; no hay reconstrucción
   párrafo a párrafo. Verificado por diferencia de forma de onda
   (`amix` con pesos `1 -1`) entre el audio del Short y el mismo tramo
   extraído de nuevo del maestro: `mean_volume -80.8dB` (silencio, es
   decir, contenido idéntico). ✅
3. **Sin uniones internas ni filtros de audio**: un único `-c:a copy` de
   principio a fin, cero pasadas de `-af`/normalización/ducking. ✅
4. **Voz desde el segundo cero**: nivel medio de los primeros 0.5s
   = -22.5dB (locución real, no silencio) — coincide con la medida ya
   documentada para el mismo punto en el vídeo largo. ✅
5. **Palabras de p1–p10 completas, en orden, sin duplicar**: contrastado
   contra `alignment.json` (segmentos 1–10, texto íntegro). Los 13 cues de
   `cues_finales.json` reconstruyen exactamente el texto de p2–p10 en
   orden (p1 no lleva subtítulo: la portada hace de gancho visual). ✅
6. **Frase final no cortada**: "cuando todo a su alrededor ya está en
   silencio." aparece completa en el último cue y en el último fotograma
   del vídeo (ver captura). El segmento p10 termina en 52.976s, dentro del
   intervalo extraído. ✅
7. **Decodificación completa sin errores**: `ffmpeg -v warning -i ... -f
   null -` sobre el archivo final → 0 líneas de advertencia/error. ✅
8. **Formato**: 1080×1920, H.264/yuv420p, 30fps, AAC, `+faststart`,
   duración 53.000s (objetivo ≈52.976s, diferencia de 24ms explicada por
   la cuantización de copia de audio ya descrita). ✅
9. **Subtítulos no cubren la cara ni la zona de UI de Shorts**: medido
   dibujando cada cue real y localizando las filas con tinta — la banda de
   texto cae entre 26.0% y 33.5% de la altura; la cara ocupa desde ~55%.
   Margen libre mínimo: 413px. Márgenes horizontales verificados con
   `validarOverflow()` (margen 80px cada lado): sin desbordes. ✅
10. **Transición termina exactamente en 4.866s**: `xfade` configurado con
    `offset=4.466` y `duration=0.4` (4.466+0.4=4.866). Confirmado por
    fotogramas: en 4.40s el título aún está completo; en 4.90s ya no queda
    ningún resto de texto ni diferencia de encuadre. ✅
11. **Solo las dos imágenes aprobadas**: el filtro usa exactamente
    `portada_hook_v2_1080x1920.png` y `fondo_limpio_1080x1920.png` como
    únicas entradas de imagen; no se referencia ningún otro archivo visual
    (aparte del bucle de partículas ya aprobado). ✅
12. **Entrega**: `short_01_piloto_v1.mp4` (5,280,434 bytes) + este informe.
    SHA-256 del entregable:
    `e068d0a919e0a6a3acf87db29a45882feb5cb0872ff8ddd96fe901b5041171cd`. ✅

## No incluido (según instrucción explícita)

- No se produjeron los Shorts 2–6 ni el de reserva.
- No se añadió CTA hablado ni pantalla de cierre.
- No se usó ElevenLabs ni se generó voz nueva.
