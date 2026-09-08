# Short 4 v1 — `short_04_v1.mp4` — informe de validación

Candidato extendido aprobado (p224–p231). Primer Short 4 producido.

## 1. Intervalo exacto utilizado

- Inicio (p224, hook): **1183.755s** (19:43.755).
- Fin hablado (p231 "...nuevas responsabilidades, él sabe."): **1228.941s**
  (20:28.941), fin real de segmento en `alignment.json`.
- Duración hablada: **45.186s**.
- Pausa natural disponible tras p231 (antes de p232): 3.000s.
- CTA: usa los **3.000s** completos de esa pausa.
- Fin del intervalo de audio: **1231.941s**.
- Duración final: **48.186s** (objetivo cumplido exacto).

## 2. Audio: extracción continua única

`ffmpeg -ss 1183.755 -to 1231.941 -map 0:a -c:a copy` — un solo corte
continuo de p224 a p231 más 3s de pausa.

## 3. Sin uniones internas ni filtros de audio

Un único `-c:a copy`. Cero `-af`, cero normalización.

**Verificación de origen**: correlación cruzada contra el mismo tramo
re-extraído ahora del maestro. Desfase óptimo: 960 muestras (21.77ms,
"encoder delay" AAC habitual). Residuo tras alinear: **-38.7dB** —
confirma contenido idéntico al maestro, no regenerado.

## 4. Informe de pausas internas

Una sola pausa real dentro del tramo: **6.000s tras p228** (en el segundo
24.938 del Short), ya declarada en `edit_plan.json` como pausa
"importante" — entre "Dice que el Padre ya sabe." y la tríada que sigue
("Antes de que... él sabe"). No aplica la restricción de "≤1.2s antes
del CTA" (específica de los Shorts 2 y 5 en este pase).

## 5. El CTA nunca se superpone a la voz

Nivel de audio en la ventana del CTA (45.3s–48.1s): **-35.1dB** de media,
muy por debajo de los -18.1dB de voz real. El crossfade arranca
exactamente en 45.186s, al terminar "...él sabe."

## 6. Primera y última frase completas

- Primera frase (hook p224 "Después de hablar del alimento, la bebida y
  el vestido, Jesús nos recuerda que nuestro Padre celestial sabe que
  necesitamos todas estas cosas."): voz real desde el segundo 0
  (-18.1dB de media).
- Última frase (p231 "Antes de que amanezca y aparezcan nuevas
  responsabilidades, él sabe."): completa e íntegra, tal como se pidió.
  Cierra la tríada anafórica "Antes de que... él sabe" (p229, p230,
  p231) — un cierre más fuerte que el candidato original, que la dejaba
  a la mitad.

## 7. Palabras completas, en orden, sin duplicar

Los 10 cues reconstruyen exactamente, en orden, el texto de p225–p231
(el hook p224 no lleva subtítulo normal). p227, p230 y p231 se
dividieron en 2 cues cada uno en límites de cláusula reales.

## 8. Decodificación completa

`ffmpeg -v warning -i short_04_v1.mp4 -f null -` → 0 líneas de
error/advertencia.

## 9. Formato

1080×1920, H.264/yuv420p, 30fps, AAC, `+faststart`, duración 48.234s.

## 10. Comprobación visual

- Apertura: portada "DIOS YA SABE LO QUE NECESITAS" desde el fotograma 0.
- Transición: crossfade de 0.4s que termina exactamente en 9.938s (fin
  real de la primera frase, p224).
- Subtítulos: **posición elevada** (MarginV 280, misma razón que el
  Short 2) — en esta imagen la cara empieza en ~y=700px (36.5% del
  alto), y la banda congelada (493) habría dejado solo ~57px de margen.
  Verificado con medición real de tinta: el texto no baja de la fila
  430 (22.4%), con ~270px de margen libre antes del pelo.
- CTA: tarjeta aprobada, ningún subtítulo la cubre.

## 11. Solo las imágenes proporcionadas para este Short

Únicamente `short_04/portada_hook_1080x1920.png`,
`short_04/fondo_limpio_1080x1920.png` y
`short_04/cta_final_1080x1920.png` (hashes verificados contra
`SHA256SUMS_SHORTS_02_05.txt`), más el bucle de partículas ya aprobado
en el Short 1, sin regenerar.

## SHA-256 del entregable

`17e0051381b3bced36970b03f5378c79685c08e9d422c1342a2760958b59b793`
