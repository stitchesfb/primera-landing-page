# Video 10 — Master completo (1080p)

**Estado:** entregado para revisión de Orlando. **No se publicó ni programó nada.**
**Fecha:** 2026-11-18
**Audio base:** `video_010_narracion_completa_sin_musica_v2.mp3` (aprobada), **sin modificar en ningún momento** — solo se le añadió música por encima.

## Escenas y transiciones

Tres paisajes nocturnos, en el orden pedido, cada cambio ajustado a la pausa real más cercana de la narración v2 (en vez de los tiempos aproximados dados, siguiendo la instrucción explícita de priorizar la pausa real):

| Escena | Imagen | Entra en | Pausa usada | Objetivo de Orlando |
|---|---|---|---|---|
| 1 | Valle nocturno (`E01_valle_nocturno.webp`) | 0:00 | — (apertura) | 0:00 |
| 2 | Lago nocturno (`E02_lago_nocturno.webp`) | ≈2:35 | Pausa 3 (154,287–158,261s) | «cerca de 3:30» |
| 3 | Mirador entre montañas (`E03_mirador_montanas.webp`) | ≈7:02 | Pausa 5, interna del bloque 6, tras el Short 2 (420,930–424,957s) | «cerca de 7:05» |
| 4 | Lago nocturno (otra vez) | ≈11:38 | Pausa 7, interna del bloque 8, tras el Short 3 (696,758–700,729s) | «cerca de 11:41» |
| 5 | Valle nocturno (otra vez, hasta el cierre) | ≈15:10 | Pausa 8 (905,511–915,488s) | «cerca de 15:15» |

**Nota sobre la escena 2:** la pausa real más cercana a "cerca de 3:30" resultó ser la pausa 3 (2:34–2:38), no una pausa más próxima a los 3:30 exactos — no hay ninguna pausa real entre los 2:38 y los 6:24 (los bloques 4 y 5 son continuación directa, sin pausa marcada en el guion). Si Orlando prefería que el cambio ocurriera más tarde, se puede ajustar a la pausa 4 (6:24–6:33) en una nueva pasada.

Cada fundido cruzado dura 3,0 s, centrado en el punto medio de su pausa (con margen a ambos lados para no cruzar nunca con voz real). Las partículas son una capa independiente, superpuesta DESPUÉS de construir la cadena de fundidos de fondo — por eso se ven continuas, sin salto ni reinicio, durante las cuatro transiciones.

**Miniatura:** `VIDEO_010_MINIATURA.webp` ("DIOS NO DUERME · SALMO 121") es la portada de YouTube — **no se insertó en el render**, se sube aparte.

## Estilo visual

- Imagen fija (sin zoom ni paneo) en cada escena — el baseline de Decisiones Cerradas (`render.presets.noche`, `movimiento: imagen_fija_particulas`), no el experimento de movimiento de los Videos 7/9.
- Partículas blancas, 82, período 24 s — mismo preset nocturno, misma semilla que la prueba de 68 s ya aprobada.
- 1920×1080, 30 fps, h264.

## Música

**`alone_with_my_thoughts.mp3`** (misma pista aprobada en la prueba de 68s). Sonoridad medida: −27,7 LUFS; ganancia aplicada +17,2 dB. Ducking plano −23 dB bajo voz y en interludios en los 19 minutos completos (regla del perfil nocturno — no sube en las pausas). La pista se repite en bucle con el cruce de 4 s ya aprobado (`canal.json` → `musica.cruce_loop_s`): 9 vueltas a lo largo del video.

**Cierre:** tras el "Amén" final, 10 s de música con fundido suave hasta el silencio total (pausa 9 del guion). Verificado con `volumedetect`: de −18,8 dB (con voz) a −87,3 dB (silencio total) en los últimos 12 s.

## Verificación pedida

| Punto a revisar | Resultado |
|---|---|
| "Ya apagaste la luz" completa en la apertura | Sin silencios largos en los primeros 5s — solo pausas cortas normales del habla (0,05–0,27s). Frase íntegra. |
| Empalme cerca de 7:01 (pausa 5, bloque 6) suena natural | Nivel de la mezcla baja de forma gradual (−18 a −40dB) al entrar en la pausa y sube igual de gradual al salir — sin salto ni artefacto. |
| Empalme cerca de 11:37 (pausa 7, bloque 8) suena natural | Mismo patrón: transición gradual, sin salto. |
| Música se desvanece tras el "Amén" final | Fundido suave confirmado, de nivel de voz hasta silencio total en 10s. |

## Resultado

| Campo | Valor |
|---|---|
| Archivo | `video_010_master.mp4` |
| Duración | 1150,479 s (19:10,48) |
| SHA-256 | `56ae59a41dea4ca1f7f7528c1888c14b7e31dfe9085d9d05befab22f30fa6be1` |
| Resolución / fps | 1920×1080 / 30fps |
| Decodificación | completa, sin errores |
| Tamaño | 91.099.345 bytes (~87 MB) |

## Subtítulos (SRT, aparte — no quemados)

`video_010.srt` — 289 cues, sincronizados con la narración v2: los offsets de cada uno de los 11 bloques se anclaron con `silencedetect` sobre las 6 pausas reales ya verificadas (no con duraciones nominales de archivo, que arrastran un pequeño redondeo de cada concatenación); los bloques en continuación directa (5, 7, 9, 11) usan la duración nominal del bloque anterior sin más ajuste. Las palabras de los bloques 6 y 8 posteriores al punto de corte de su pausa interna se desplazaron por el mismo tiempo que se insertó ahí. Sin solapes entre cues (verificado programáticamente). El primer cue empieza en 0,000s; el último ("Amén.") termina exactamente en 1140,506s, el fin real de la narración.

## Lo que no se incluyó en esta entrega

Los 3 Shorts del Video 10 no se han preparado todavía — no se pidieron en esta tarea.
