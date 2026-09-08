# Short 3 v1 — `short_03_v1.mp4` — informe de validación

Candidato extendido aprobado (p80–p90). Primer Short 3 producido.

## 1. Intervalo exacto utilizado

- Inicio (p80, hook): **405.607s** (06:45.607).
- Fin hablado (p90 "Amadas por ti."): **463.053s** (07:43.053), fin real
  de segmento en `alignment.json`.
- Duración hablada: **57.446s**.
- Pausa natural disponible tras p90 (antes de p91): 3.000s.
- CTA: usa **2.000s** de esa pausa (instrucción explícita: no 1.554s, dos
  segundos para mejor legibilidad).
- Fin del intervalo de audio: **465.053s**.
- Duración final: **59.446s** (objetivo cumplido).

## 2. Audio: extracción continua única

`ffmpeg -ss 405.607 -to 465.053 -map 0:a -c:a copy` — un solo corte
continuo de p80 a p90 más 2s de pausa, sin reconstrucción por párrafos.

## 3. Sin uniones internas ni filtros de audio

Un único `-c:a copy`. Cero `-af`, cero normalización, cero cambios de
volumen.

**Verificación de origen**: correlación cruzada contra el mismo tramo
re-extraído ahora del maestro. Desfase óptimo: 996 muestras (22.59ms,
"encoder delay" AAC habitual). Residuo tras alinear: **-46.1dB** —
confirma contenido idéntico al maestro, no regenerado.

## 4. Informe de pausas internas

Una sola pausa real dentro del tramo: **6.000s tras p83** (en el segundo
23.443 del Short), ya declarada en `edit_plan.json` como pausa
"importante" del guion original — no es un defecto, es la pausa entre
"¿No valen ustedes mucho más que ellas?" y la oración que sigue. No
aplica la restricción de "≤1.2s antes del CTA" (esa regla es específica
de los Shorts 2 y 5 en este pase); aquí el candidato ya estaba aprobado
con esa pausa incluida.

## 5. El CTA nunca se superpone a la voz

Nivel de audio en la ventana del CTA (57.5s–59.4s): **-45.0dB** de media,
muy por debajo de los -20.2dB de voz real. El crossfade hacia la tarjeta
arranca exactamente en 57.446s, al terminar "Amadas por ti."

## 6. Primera y última frase completas

- Primera frase (hook p80 "Jesús nos invita a mirar las aves del
  cielo."): voz real desde el segundo 0 (-20.2dB de media).
- Última frase (p90 "Amadas por ti."): completa. Cierra la tríada
  afirmativa "Somos personas conocidas por ti. Vistas por ti. Amadas por
  ti." — un cierre que fortalece el mensaje frente al candidato original
  (que terminaba a mitad de una petición en p84).

## 7. Palabras completas, en orden, sin duplicar

Los 15 cues de subtítulos reconstruyen exactamente, en orden, el texto
de p81–p90 (el hook p80 no lleva subtítulo normal). p81, p82, p84 y p86
se dividieron en 2–3 cues cada uno en límites de cláusula reales
(verificado con `disponerTexto`/`crearMedidor`) porque no cabían en 2
líneas a tamaño legible.

## 8. Decodificación completa

`ffmpeg -v warning -i short_03_v1.mp4 -f null -` → 0 líneas de
error/advertencia.

## 9. Formato

1080×1920, H.264/yuv420p, 30fps, AAC, `+faststart`, duración 59.467s.

## 10. Comprobación visual

- Apertura: portada "MIRA LAS AVES DEL CIELO" desde el fotograma 0.
- Transición: crossfade de 0.4s que termina exactamente en 4.272s (fin
  real de la primera frase, p80).
- Subtítulos: posición congelada sin cambios (MarginV 493) — escena sin
  rostro (aves, luna, lago, lirios).
- CTA: tarjeta aprobada, ningún subtítulo la cubre.

## 11. Solo las imágenes proporcionadas para este Short

Únicamente `short_03/portada_hook_1080x1920.png`,
`short_03/fondo_limpio_1080x1920.png` y
`short_03/cta_final_1080x1920.png` (hashes verificados contra
`SHA256SUMS_SHORTS_02_05.txt`), más el bucle de partículas ya aprobado
en el Short 1, sin regenerar.

## SHA-256 del entregable

`225fc0c52064b0a178141ff1a862ae58b426177bae21dc304543f8a9f69eac5c`
