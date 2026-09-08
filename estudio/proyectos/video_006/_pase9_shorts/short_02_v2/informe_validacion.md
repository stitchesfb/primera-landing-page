# Short 2 v2 — `short_02_v2.mp4` — informe de validación

Reemplaza a `short_02.mp4` (rechazado por una pausa interna de ~6-7s cerca
del segundo 13, no aprobada). Corta el contenido justo antes de esa pausa
en vez de continuar a través de ella.

## 1. Intervalo exacto utilizado

- Inicio (p390, hook): **2162.033s** (36:02.033) — conservado del original.
- Fin del contenido hablado (p392 "...corresponde a hoy."): **2176.012s**
  (fin real de segmento, confirmado en `alignment.json`).
- Duración hablada: **13.978s**.
- Inicio de la pausa larga (p393): 2182.012s → pausa real de 6.000s.
- CTA: usa los primeros **3.000s** de esa pausa (según instrucción, no la
  pausa completa).
- Fin del intervalo de audio: **2179.012s**.

## 2. Audio: extracción continua única

`ffmpeg -ss 2162.033 -to 2179.012 -map 0:a -c:a copy` — un solo corte.

## 3. Sin uniones internas ni filtros de audio

Un único `-c:a copy`. Cero `-af`, cero normalización.

**Verificación de origen**: comparación por correlación cruzada contra el
mismo tramo re-extraído ahora del maestro. Desfase óptimo: 1021 muestras
(23.15ms, el mismo "encoder delay" AAC ya documentado en este proyecto).
Residuo tras alinear: **-44.7dB** — confirma contenido idéntico al
maestro, no regenerado.

## 4. Informe de pausas internas

Ninguna. El tramo hook(p390)+p391+p392 no tiene ningún hueco interno
(gap máximo real entre palabras: 0.128s, medido palabra por palabra en
`alignment.json`).

## 5. El CTA nunca se superpone a la voz

Nivel de audio en la ventana del CTA (14.0s–16.9s): **-42.2dB** de media
(ambiente/silencio, muy por debajo de los -20.1dB de voz real medidos en
el arranque). El crossfade hacia la tarjeta empieza exactamente en
13.978s, el mismo instante en que termina la última palabra.

## 6. Primera y última frase completas

- Primera frase (hook p390): voz real desde el segundo 0 (-20.1dB de
  media en los primeros 0.5s).
- Última frase (p392 "Hoy ya tiene suficiente con lo que corresponde a
  hoy."): completa — el corte cae en el fin real del segmento, no a
  mitad de palabra. Conserva íntegra la afirmación de "no debemos
  afanarnos por el día de mañana" (p390+p391+p392).

## 7. Decodificación completa

`ffmpeg -v warning -i short_02_v2.mp4 -f null -` → 0 líneas de
error/advertencia.

## 8. Formato

1080×1920, H.264/yuv420p, 30fps, AAC, `+faststart`, duración 17.000s.

## 9. Comprobación visual

- Apertura: portada "NO TE AFANES POR MAÑANA" + "MATEO 6" desde el
  fotograma 0, idéntica a la versión anterior (mismas imágenes, sin
  cambios).
- Subtítulos: posición elevada (MarginV 280, igual que la versión
  anterior) por la misma razón ya documentada — la cara en esta imagen
  empieza muy arriba (~33% del alto).
- CTA: tarjeta aprobada, ningún subtítulo la cubre.

## 10. Solo las imágenes ya aprobadas para este Short

Mismas tres imágenes de `short_02/` (hook/fondo/CTA), hashes ya
verificados en el pase anterior, sin cambios.

## SHA-256 del entregable

`af9673095a36b8d9d1bd2c0dd189ca34e63bbb9a06b60a48eb1b9c63d10e3591`
