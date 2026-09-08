# Short 2 — `short_02.mp4` — informe de validación

Producido aplicando la plantilla congelada del Short 1 (v2). Intervalo
p390 (hook) + p391–p396, hook: "NO TE AFANES POR MAÑANA".

## 1. Intervalo exacto utilizado

Calculado directamente desde `alignment.json` v4 (no desde los timestamps
declarados a mano, aunque coinciden exactamente):

- Inicio (p390, hook): **2162.033s** (36:02.033)
- Fin de la última palabra hablada (p396 "delante."): **2206.578s**
- Duración hablada: **44.545s** (coincide con el valor declarado)
- Pausa disponible antes de p397: **3.000s** — usada completa (dentro del
  máximo de 3s permitido)
- Fin del intervalo de audio extraído: **2209.578s** (36:49.578)

## 2. Audio: extracción continua única

`ffmpeg -ss 2162.033 -to 2209.578 -map 0:a -c:a copy` sobre
`video_final.mp4` — un solo corte, sin reconstrucción por párrafos.

## 3. Sin uniones internas ni filtros de audio

Un único `-c:a copy` de principio a fin. Cero `-af`, cero normalización,
cero cambios de volumen o mezcla.

**Verificación de origen** (comparación de forma de onda contra el mismo
tramo re-extraído ahora mismo del maestro): el diff ingenuo mostró un nivel
alto porque toda copia de AAC recortada a mitad de archivo arrastra un
"encoder delay" (~23ms, 1024 muestras) declarado en su propio
`start_time` — no es un defecto de contenido. Al alinear por
correlación cruzada, el desfase óptimo resultó ser exactamente 1021
muestras (23.15ms, ese mismo encoder delay) y el residuo cayó a
-41.6dB relativo — confirma que el contenido es idéntico al maestro.

## 4. Palabras completas, en orden, sin duplicar

Los 10 cues de subtítulos reconstruyen exactamente, en orden, el texto de
p391–p396 tal como aparece en `alignment.json` (sin Whisper, sin
re-alinear). p393, p395 y p396 se dividieron en 2–3 cues cada uno en
límites de cláusula reales (verificado con `disponerTexto`/`crearMedidor`
del propio proyecto) porque no cabían en 2 líneas a tamaño legible.

## 5. Primera y última frase no cortadas

- Primera frase (hook, p390 "...no debemos afanarnos por el día de
  mañana."): voz real desde el segundo 0 (-20.1dB de media en los
  primeros 0.5s).
- Última frase (p396 "...tenemos delante."): el intervalo de audio se
  extiende 3s más allá de su fin real (2206.578s), así que la palabra y
  su cola quedan íntegras.

## 6. Decodificación completa

`ffmpeg -v warning -i short_02.mp4 -f null -` → 0 líneas de
error/advertencia.

## 7. Formato

1080×1920, H.264/yuv420p, 30fps, AAC, `+faststart`, duración 47.567s
(objetivo 47.545s + 22ms por la misma cuantización de copia de audio ya
documentada en este proyecto).

## 8. Comprobación visual

- Apertura: portada completa desde el fotograma 0, texto "NO TE AFANES /
  POR / MAÑANA" + "MATEO 6" idéntico al aprobado.
- Transición: crossfade de 0.4s que termina exactamente en 6.594s (fin
  real de la primera frase, p390), coincidiendo con la instrucción de
  que "al terminar esa primera frase, quede únicamente el fondo limpio".
  Fotograma de control en 6.65s confirma framing idéntico y texto del
  hook completamente ausente.
- Subtítulos: **posición vertical ajustada** respecto al Short 1 —
  en esta imagen la cara/pelo de la persona empieza mucho más arriba
  (~y=630px, 33% del alto) que en el Short 1 (~55%). La posición
  congelada (MarginV 493) habría rozado el pelo en los cues más grandes.
  Se subió la banda a MarginV 280 (14.6%–22.4% del alto, franja de
  cielo/ventana vacía en esta imagen), manteniendo intacto todo lo demás
  del estilo (tipografía, tamaño, colores, contorno, márgenes L/R,
  resalte en amarillo). Verificado con medición real de tinta sobre
  fondo negro: el texto nunca baja de la fila 430 (22.4%), con 200px de
  margen libre antes del pelo. Verificado también `validarOverflow()`
  (margen 80px L/R): sin desbordes horizontales.
- CTA: crossfade de 0.2s que arranca exactamente en 44.545s (fin real de
  "delante."), tarjeta aprobada "¿NECESITAS DESCANSAR? ESCUCHA LA
  ORACIÓN COMPLETA EN EL VIDEO RELACIONADO" se mantiene el resto de la
  pausa (2.8s). Ningún subtítulo se superpone a la tarjeta. Nivel de
  audio en la pausa: -35.9dB de media (ambiente, no locución de p397).

## 9. Solo las imágenes proporcionadas para este Short

Únicamente `short_02/portada_hook_1080x1920.png`,
`short_02/fondo_limpio_1080x1920.png` y
`short_02/cta_final_1080x1920.png` (hashes verificados contra
`SHA256SUMS_SHORTS_02_05.txt` antes de usarlas), más el bucle de
partículas ya aprobado en el Short 1 (`particulas_vertical_baja.mov`,
sin regenerar).

## 10. SHA-256 del entregable

`b00a0c24803cfc4637b1ce36d2d7d9d09d63b5f42a0b3e3152b57aeccbe47f4a`

## Nota sobre las partículas

Se reutilizó el archivo `particulas_vertical_baja.mov` generado para el
Short 1 (18 motas/24s, baja densidad) sin volver a generarlo, tal como
exige la instrucción.
