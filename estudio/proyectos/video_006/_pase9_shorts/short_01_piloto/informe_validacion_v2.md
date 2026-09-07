# Short 1 piloto — `short_01_piloto_v2.mp4` — informe de validación

Reestructuración editorial de `short_01_piloto_v1.mp4` (que **no se modificó
ni se reemplazó** — sigue intacto en este mismo directorio). v2 usa solo
p1–p3 y cierra con una tarjeta CTA en vez de terminar en la lista de
preocupaciones, para que la secuencia sea: preocupación → respuesta de
Jesús → entrega a Dios → invitación a ver el vídeo completo.

## Línea base reportada antes de renderizar

Tomada de `alignment.json` v4 (canónico, sin re-alinear):

- **Fin de p3** (última palabra "descansar."): **14.040s**
- **Inicio de p4**: **17.040s**
- **Pausa natural entre ambos**: 3.000s — coincide con la pausa ya
  declarada en los datos de sincronía, así que se continuó sin esperar
  confirmación adicional, tal como se indicó.
- **Duración resultante del intervalo de audio**: 17.040s objetivo →
  17.044s real (copia directa, +4ms por cuantización AAC, no es contenido
  añadido).

## Cómo se construyó

- **Audio**: un único intervalo continuo `-ss 0 -to 17.040 -c:a copy` sobre
  `video_final.mp4` (mismo maestro que v1, hash verificado sin cambios:
  `a602473a851a8d78141bcebfd3c993df24f632267d00f7f037e5b31e898197fe`). Cero
  cortes internos, cero filtros, cero normalización. La pausa completa
  después de "descansar." (14.040s→17.040s) queda intacta dentro del
  audio — no se añadió ni se quitó silencio.
- **Vídeo**: se conserva exactamente la apertura de v1 (`portada_hook`
  estática hasta 4.466s, crossfade de 0.4s hasta 4.866s, `fondo_limpio`
  después), sin zoom/pan/Ken Burns. A los **14.040s** (fin real de
  "descansar.") arranca un segundo crossfade, ahora de **0.2s**
  (14.040s→14.240s), de `fondo_limpio` hacia la nueva tarjeta
  `cta_final_v1_1080x1920.png`, que se mantiene estática el resto de la
  pausa natural hasta el final (17.067s de vídeo). Partículas de baja
  densidad superpuestas en toda la duración, igual que en v1.
- **Subtítulos**: se reutilizan sin cambios de diseño los 3 cues de p2–p3
  de `cues_finales.json` (mismo estilo, tamaño, márgenes, resalte en
  amarillo). El último cue termina en 13.980s, antes del fin real de
  "descansar." (14.040s) y muy antes de que empiece la tarjeta — ningún
  subtítulo se superpone a la tarjeta CTA.
- **Duración del contenedor**: 512 fotogramas a 30fps = 17.067s de vídeo
  (23ms más que el audio real de 17.044s, incluso más margen que el
  patrón ya aceptado en el render maestro y en v1 — el vídeo nunca
  termina antes que el audio).

## Imagen nueva verificada antes de usarla

- `cta_final_v1_1080x1920.png`: SHA-256
  `dc98017cd5e1aaccc23b2d60295acabd85d2d8d23179582e0853ef1135f131f9`
  (coincide con el manifiesto y con el hash exigido), 1080×1920 RGBA,
  integridad de PNG verificada chunk a chunk (IEND presente, 0 bytes
  sobrantes), decodificación ffmpeg limpia.

## Validación obligatoria

1. **Solo se escucha p1–p3**: el audio es el intervalo `0→17.040` del
   maestro; p4 empieza en 17.040s y el corte cae justo antes. ✅
2. **Intervalo continuo único del maestro**: comparación de forma de onda
   entre el audio del Short y el mismo tramo re-extraído del maestro →
   `mean_volume -85.5dB` (diferencia inaudible, contenido idéntico). ✅
3. **p4 no llega a escucharse**: ventana 14.10s–17.00s (dentro de la
   pausa) mide `mean -41.6dB / max -27.7dB` — nivel de ambiente/silencio de
   pausa, muy por debajo de los -22.5dB de voz real medidos en el
   arranque; no hay locución de p4. ✅
4. **"descansar" completa, no recortada**: el intervalo de audio llega
   hasta 17.044s, muy por encima del fin real de la palabra (14.040s);
   sobra toda la pausa de 3s. Confirmado también visualmente: el
   subtítulo "descansar." se ve completo en el fotograma de control
   (13.90s). ✅
5. **El CTA empieza después del último fonema de "descansar"**: el
   crossfade hacia la tarjeta arranca exactamente en 14.040s (el mismo
   valor usado como fin real de p3), no antes. ✅
6. **Sin silencio añadido ni audio alterado**: un solo `-c:a copy`, sin
   `-af`, sin recodificar, sin recortar de más ni de menos que
   `0→17.040`. ✅
7. **Formato y decodificación**: 1080×1920, 30fps, H.264/yuv420p, AAC,
   `+faststart`; `ffmpeg -v warning ... -f null -` → 0 líneas de
   error/advertencia. ✅
8. **Entrega**: `short_01_piloto_v2.mp4` (2,065,051 bytes) + fotogramas de
   control (`chk_13_90_descansar.png` inicio del cierre de "descansar",
   `chk_14_00_pre_cta.png` justo al iniciar el crossfade,
   `chk_14_14_mid_cta.png` a mitad del crossfade, `chk_14_30_cta_full.png`
   tarjeta ya estable, `chk_last.png` último fotograma) + este informe.
   SHA-256 del entregable:
   `4c4c66fd5c1d0b726745da60c60ba2cacf7594eb3d812356378d48a45131f7e5`. ✅
9. **v1 no se tocó**: `short_01_piloto_v1.mp4` sigue en este directorio sin
   modificar. No se produjeron los Shorts 2–6 ni el de reserva. ✅

## No incluido (según instrucción explícita)

- No hay CTA hablado.
- No se agregaron flechas, botones, textos adicionales ni segundos extra
  más allá de la pausa natural ya existente.
- No se llamó a ElevenLabs ni se generó voz nueva.
