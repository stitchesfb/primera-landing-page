# Short 5 v2 — `short_05_v2.mp4` — informe de validación

Reemplaza a `short_05.mp4` (rechazado por una pausa interna de ~6-7s cerca
del segundo 10, no aprobada). Corta el contenido justo antes de esa pausa.

## 1. Intervalo exacto utilizado

- Inicio (p477, hook): **2649.139s** (44:09.139) — conservado del original.
- Fin del contenido hablado (p480 "...responderlas ahora."): **2658.381s**
  (fin real de segmento).
- Duración hablada: **9.242s**.
- Inicio de la pausa larga (p481): 2664.381s → pausa real de 6.000s.
- CTA: usa los primeros **3.000s** de esa pausa.
- Fin del intervalo de audio: **2661.381s**.

## 2. Audio: extracción continua única

`ffmpeg -ss 2649.139 -to 2661.381 -map 0:a -c:a copy` — un solo corte.

## 3. Sin uniones internas ni filtros de audio

Un único `-c:a copy`. Cero `-af`, cero normalización.

**Verificación de origen**: correlación cruzada contra el mismo tramo
re-extraído ahora del maestro. Desfase óptimo: 107 muestras (2.43ms).
Residuo tras alinear: **-33.2dB** — confirma contenido idéntico al
maestro.

## 4. Informe de pausas internas

Ninguna. El tramo hook(p477)+p478+p479+p480 no tiene ningún hueco interno
(gap máximo real entre palabras: 0.093s).

## 5. El CTA nunca se superpone a la voz

Nivel de audio en la ventana del CTA (9.3s–12.1s): **-36.2dB** de media
(muy por debajo de los -20.7dB de voz real). El crossfade empieza
exactamente en 9.242s, al terminar la última palabra.

## 6. Primera y última frase completas

- Primera frase (hook p477 "Señor, aquí está nuestro mañana."): voz real
  desde el segundo 0 (-20.7dB de media).
- Última frase (p480 "No tenemos que responderlas ahora."): completa.
  Conserva íntegra la entrega del mañana en las manos de Dios
  (p477 "aquí está nuestro mañana" + p478 "Lo ponemos en tus manos.").

## 7. Decodificación completa

`ffmpeg -v warning -i short_05_v2.mp4 -f null -` → 0 líneas de
error/advertencia.

## 8. Formato

1080×1920, H.264/yuv420p, 30fps, AAC, `+faststart`, duración 12.267s.

## 9. Comprobación visual

- Apertura: portada "AQUÍ ESTÁ NUESTRO MAÑANA" desde el fotograma 0,
  idéntica a la versión anterior.
- Subtítulos: posición congelada sin cambios (MarginV 493) — sin rostro
  en cámara en esta escena.
- CTA: tarjeta aprobada, ningún subtítulo la cubre.

## 10. Solo las imágenes ya aprobadas para este Short

Mismas tres imágenes de `short_05/` (hook/fondo/CTA), sin cambios.

## SHA-256 del entregable

`e0c52ed3d007da3a77b9b980b16094c73fc457f6061d13df7e48f2b7d6dee11c`
