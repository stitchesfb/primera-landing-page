# Short 5 — `short_05.mp4` — informe de validación

Producido aplicando la plantilla congelada del Short 1 (v2). Intervalo
p477 (hook) + p478–p486, hook: "AQUÍ ESTÁ NUESTRO MAÑANA".

## 1. Intervalo exacto utilizado

Calculado directamente desde `alignment.json` v4:

- Inicio (p477, hook): **2649.139s** (44:09.139)
- Fin de la última palabra hablada (p486 "Recíbelo."): **2680.634s**
- Duración hablada: **31.495s** (coincide con el valor declarado)
- Pausa disponible antes de p487: **6.000s** — se usaron solo **3.000s**
  (máximo permitido; la pausa real es el doble de lo aprovechado)
- Fin del intervalo de audio extraído: **2683.634s** (44:43.634)

## 2. Audio: extracción continua única

`ffmpeg -ss 2649.139 -to 2683.634 -map 0:a -c:a copy` sobre
`video_final.mp4` — un solo corte, sin reconstrucción por párrafos.

## 3. Sin uniones internas ni filtros de audio

Un único `-c:a copy` de principio a fin. Cero `-af`, cero normalización,
cero cambios de volumen o mezcla.

**Verificación de origen**: mismo método que el Short 2. El desfase por
"encoder delay" AAC en este corte fue de 107 muestras (2.43ms, menor
porque cae en otro punto del archivo); alineado a ese desfase, el
residuo cayó a -33.3dB relativo — confirma contenido idéntico al
maestro.

## 4. Palabras completas, en orden, sin duplicar

Los 9 cues reconstruyen exactamente, en orden, el texto de p478–p486 tal
como aparece en `alignment.json`. Ningún párrafo necesitó dividirse: cada
uno cupo en ≤2 líneas a tamaño 76 o 68 (medido con `disponerTexto`).

## 5. Primera y última frase no cortadas

- Primera frase (hook, p477 "Señor, aquí está nuestro mañana."): voz real
  desde el segundo 0 (-20.7dB de media en los primeros 0.5s).
- Última frase (p486 "Recíbelo."): el intervalo se extiende 3s más allá
  de su fin real, la palabra completa queda íntegra.

## 6. Decodificación completa

`ffmpeg -v warning -i short_05.mp4 -f null -` → 0 líneas de
error/advertencia.

## 7. Formato

1080×1920, H.264/yuv420p, 30fps, AAC, `+faststart`, duración 34.534s
(objetivo 34.496s + ~38ms por cuantización de copia de audio, ya
documentada en este proyecto).

## 8. Comprobación visual

- Apertura: portada completa desde el fotograma 0, texto "AQUÍ ESTÁ /
  NUESTRO / MAÑANA" idéntico al aprobado.
- Transición: crossfade de 0.4s que termina exactamente en 2.322s (fin
  real de la primera frase, p477). Fotograma de control confirma framing
  idéntico y texto del hook completamente ausente.
- Subtítulos: **posición congelada sin cambios** (MarginV 493, igual que
  el Short 1) — en esta escena la persona aparece de espaldas, sin
  rostro visible en cámara, así que no hay ningún riesgo de cubrir una
  cara. Verificado con medición real de tinta sobre fondo negro: el
  texto no baja de la fila 643 (33.5%), idéntico al Short 1. Verificado
  también `validarOverflow()` (margen 80px L/R): sin desbordes.
- CTA: crossfade de 0.2s que arranca exactamente en 31.496s (fin real de
  "Recíbelo."), misma tarjeta aprobada que el Short 2, se mantiene el
  resto de la pausa usada (2.8s). Ningún subtítulo se superpone a la
  tarjeta. Nivel de audio en la pausa: -43.0dB de media (ambiente, muy
  por debajo del nivel de voz).

## 9. Solo las imágenes proporcionadas para este Short

Únicamente `short_05/portada_hook_1080x1920.png`,
`short_05/fondo_limpio_1080x1920.png` y
`short_05/cta_final_1080x1920.png` (hashes verificados contra
`SHA256SUMS_SHORTS_02_05.txt` antes de usarlas), más el bucle de
partículas ya aprobado en el Short 1, sin regenerar.

## 10. SHA-256 del entregable

`03d9821680e365a82d19acf4c6caab442d9ee06a6b1af34a3927d2c7fd1b1113`
