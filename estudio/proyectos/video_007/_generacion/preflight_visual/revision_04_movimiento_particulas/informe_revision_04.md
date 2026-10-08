# Video 7 — Prueba audiovisual de 90 segundos, revisión 04 (movimiento perceptible + partículas + tomas más cortas)

**Estado:** `prueba_audiovisual_90s_revision_04_pendiente_aprobacion`
**Fecha:** 2026-10-08
**Archivo:** `preflight_visual/revision_04_movimiento_particulas/prueba_audiovisual_90s_revision_04_pendiente_aprobacion.mp4`

Parte de la revisión 03, **ya aprobada parcialmente**: las 4 imágenes, el realismo de la mujer, la secuencia narrativa y la música/nivel quedan exactamente iguales. Esta revisión corrige solo lo señalado: movimiento más perceptible, tomas más cortas y partículas blancas recuperadas del sistema aprobado del canal. **No se generaron imágenes nuevas, no se cambió la narración ni la música.**

## 1. Partículas — sistema reutilizado, no reinventado

Búsqueda programática en el repositorio (`grep -ri "particula"`) sobre los proyectos anteriores del canal. Resultado: el sistema vive en `estudio/lib/particulas.mjs` (motor) y su configuración aprobada en `estudio/canal.json` → `render.presets.noche` (el preset nocturno, el que corresponde a este canal/video). Confirmado también en `video_006/_pase8_render/informe_render_final.md`: *"Partículas: sistema aprobado (`lib/particulas.mjs`), 82 partículas/24s en todas las escenas"*.

**Parámetros recuperados tal cual, sin modificar el motor:**

| Parámetro | Valor aprobado (`canal.json`, preset `noche`) | Usado aquí |
|---|---|---|
| Cantidad de partículas | 82 | 82 |
| Período del bucle | 24s | 24s |
| Semilla | 20260818 (valor por defecto del módulo, no sobrescrito en ningún uso previo encontrado) | 20260818 |
| Color | Blanco puro (fijo en el motor) | Blanco puro |
| Radio | 1,4–4,0 px (variable por partícula, según profundidad simulada) | sin cambios |
| Movimiento | Deriva lateral dominante, vertical ~10% de la lateral (flotan, no caen) | sin cambios |
| Opacidad | 0,16–0,66 aprox., repartida de forma desigual (pocas brillantes, la mayoría apenas insinuadas) | sin cambios |
| Desvanecimiento nace/muere | Curva `sin²`, invisible al nacer y al morir (bucle cerrado sin salto en la costura) | sin cambios |

**Único ajuste real:** la resolución de generación, de 1920×1080 (usada en los videos largos del canal) a 1280×720, porque esa es la resolución de entrega pedida para esta prueba — es el mismo patrón que usa `cli.mjs` en los Shorts (particulas renderizadas directamente al lienzo de salida). No se tocó ninguna proporción de tamaño/opacidad/velocidad del motor.

**Composición:** igual que en `renderer.mjs` (el render aprobado): partículas generadas una vez como bucle de 24s con canal alfa (`qtrle`/`argb`, sin pérdida), repetidas con `-stream_loop -1` y superpuestas **una sola vez sobre el video entero ya armado** (no por imagen), para que floten de forma continua e independiente de los cortes entre escenas — así evita que una partícula "salte" de brillo en cada transición. Se mantiene también `gradfun` tras el overlay, igual que en el render aprobado, para suavizar el banding del cielo nocturno.

**Verificación visual:** vista previa sobre fondo negro (`particulas/preview_motas_sobre_negro.jpg`) y los 3 fotogramas de comprobación — motas pequeñas, blancas, suaves, de tamaño y brillo desiguales, sin patrón de caída tipo nieve/lluvia, sin aspecto de ceniza ni estrellas fugaces. Se revisó que ninguna mota brillante caiga directamente sobre los ojos, las manos o el texto de la Biblia en los fotogramas de comprobación — en el peor caso (fotograma 0:50) hay motas cerca del cabello, ninguna sobre el rostro.

## 2. Movimiento — ahora perceptible (7–9% por toma)

| Toma | Escena | Cambio de escala | Foco | Encuadre |
|---|---|---:|---|---|
| 1 | 1 — preocupada | 1,000 → 1,075 (+7,5%) | (0,26, 0,32) — rostro/mano | Abierto |
| 2 | 1 — preocupada | 1,120 → 1,200 (+7,1%) | (0,24, 0,30) — rostro, más cerrado | Cerrado, desplazamiento distinto al de la toma 1 |
| 3 | 2 — orando | 1,000 → 1,075 (+7,5%) | (0,30, 0,38) — manos/rostro | Abierto |
| 4 | 2 — orando | 1,100 → 1,180 (+7,3%) | (0,32, 0,36) — manos | Cerrado hacia manos y rostro |
| 5 | 3 — Biblia | 1,000 → 1,080 (+8,0%) | (0,55, 0,58) — libro/mano | Hacia las páginas y la mano |
| 6 | 4 — lago | 1,000 → 1,075 (+7,5%) | (0,68, 0,35) — luna y reflejo | Hacia la luna y su reflejo |

Todas las tomas están en el rango 7–9% pedido. Zoom lineal y monótono en una sola dirección (nunca ida y vuelta); el desplazamiento hacia el punto focal es la misma técnica de la revisión 03 (sin capas, sin parallax), solo que ahora con un cambio de escala 1,6–2× mayor y concentrado en tomas más cortas, lo que lo hace claramente perceptible en varios segundos de observación.

**Verificado fotograma a fotograma (último fotograma = mayor zoom de cada toma):** en ningún caso se cortan los ojos, las manos ni la Biblia — las tomas más cerradas (2 y 4, hasta 1,20× y 1,18×) se revisaron una por una antes de dar por buena la secuencia.

## 3. Seis tomas a partir de las cuatro imágenes — duraciones reales

Igual que en la revisión 03, los cortes entre escenas distintas se recalcularon sobre los límites de frase reales de la narración (bloque 1), no sobre los minutos aproximados que diste como guía. Los recortes *dentro* de una misma imagen (toma 1→2 y toma 3→4) son de ritmo visual, no de frase, tal como pediste.

| Toma | Rango en el video final | Duración | Tipo de corte al salir |
|---|---|---:|---|
| 1 — escena 1, abierta | 0,000s – 15,4375s | 15,44s | Fundido corto (0,875s) — misma imagen |
| 2 — escena 1, cerrada | 15,4375s – 25,461s* | 11,77s | Fundido largo (1,75s) — cambio de imagen |
| 3 — escena 2, abierta | 25,461s – 42,000s* | 17,85s | Fundido corto (0,875s) — misma imagen |
| 4 — escena 2, cerrada | 42,000s – 60,1865s* | 21,50s | Fundido largo (1,75s), **dentro de la pausa aprobada** |
| 5 — escena 3, Biblia | 64,1865s – 79,198s* | 18,76s | Fundido largo (1,75s) — cambio de imagen |
| 6 — escena 4, lago | 79,198s – 90,000s | 11,68s | (cierre del video) |

*Los tres asteriscos marcan los mismos puntos de corte ya usados en la revisión 03 (25,461s y 79,198s = finales de frase real; 60,1865–64,1865s = pausa importante 1 ya aprobada). 42,000s y 15,000s son los puntos de reencuadre dentro de la misma imagen, tal como los diste, sin ajuste (no son cortes de escena, son de ritmo visual).

**Transiciones:**
- Dentro de la misma imagen (toma 1→2 y toma 3→4): fundido cruzado de 0,875s.
- Entre imágenes distintas (toma 2→3, toma 4→5, toma 5→6): fundido cruzado de 1,75s.
- El fundido toma 4→5 ocurre **enteramente dentro de los 4s de silencio de la pausa 1** (61,3115s–63,0615s), con margen de ~1,1s de silencio puro antes y después — transición visual tranquila, **sin pasar por negro en ningún punto** del video (verificado: todos los fundidos son disolución directa imagen-a-imagen).

## 4. Audio — idéntico a la revisión 03, verificado a nivel de PCM

No se tocó la narración, la música ni los niveles. Se reutilizó el mismo archivo de mezcla ya construido (`audio_final_90s.wav`, SHA-256 `981883d6...10985`). Verificación adicional pedida: se decodificó el audio de ambos MP4 finales (revisión 03 y revisión 04) a PCM sin comprimir y se comparó por hash:

```
revisión 03 → PCM sha256: 7f5465de7f0b77d729578d817291ac8172e0ad970fc0151e50167164358a1ca5
revisión 04 → PCM sha256: 7f5465de7f0b77d729578d817291ac8172e0ad970fc0151e50167164358a1ca5
```

**Idénticos.** No se llamó a ElevenLabs. Sin subtítulos, sin sonidos ambientales.

## 5. Especificaciones técnicas del entregable

| Campo | Valor |
|---|---|
| Contenedor | MP4 |
| Códec de video | H.264, perfil **Main**, nivel **4.0** |
| Formato de píxel | yuv420p |
| Resolución | 1280×720 |
| Framerate | 30 fps constantes |
| Códec de audio | AAC-LC, estéreo, 44.100 Hz |
| `faststart` | Sí (verificado: `moov` antes de `mdat`) |
| Duración | 90,000s exactos |
| Tamaño | 16,4 MB (< 24 MiB pedidos) |
| Decodificación completa | Verificada (`ffmpeg -v error -i ... -f null -`), sin errores |

## 6. Confirmaciones

- Las 4 imágenes no se regeneraron ni se modificaron — mismos archivos de la revisión 03.
- No se usó ningún clip de Pexels ni Pixabay.
- No se modificó la narración ni se llamó a ElevenLabs.
- No se cambió la música ni sus niveles (verificado por hash de PCM).
- No se renderizó el video largo ni los Shorts.
- Las revisiones anteriores (prueba original rechazada, revisión 02 pausada, revisión 03) quedan intactas, sin tocar.
- Sin subtítulos, sin sonidos ambientales añadidos.
- Sin deformaciones, sin parallax simulado, sin fundidos a negro.

## 7. Archivos de este entregable

- `prueba_audiovisual_90s_revision_04_pendiente_aprobacion.mp4` — la prueba.
- `verificacion/frame_0008_mujer_preocupada_particulas.jpg`, `frame_0050_mujer_orando_particulas.jpg`, `frame_0085_lago_particulas.jpg` — fotogramas de comprobación con partículas visibles.
- `particulas/preview_motas_sobre_negro.jpg` — vista previa aislada del bucle de partículas sobre fondo negro, para juzgar su aspecto sin la escena de fondo.
- `informe_revision_04.md` — este informe.

## 8. Pendiente

Tu aprobación de esta versión frente a la revisión 03 (mismo contenido, menos movimiento y sin partículas). No se ha renderizado nada más allá de esta prueba de 90s.
