# Video 9 — Los 3 Shorts (vertical 1080×1920)

**Estado:** Short 1 y Short 2 corregidos (ver abajo); Short 3 aprobado sin cambios. **No se publicó ni programó nada.**
**Fecha:** 2026-11-09 (entrega original) / **2026-11-11** (corrección de finales, Short 1 y 2)
El video largo no se tocó. No se generó voz nueva — los 3 Shorts se extrajeron directamente de los bloques TTS ya aprobados (4, 6 y 11).

## Corrección de finales — 2026-11-11

Orlando reportó, al escuchar los 3 Shorts, que después del «Amén» se oía un residuo: en el Short 1, el arranque de «Señor,» (la frase siguiente del bloque 4 en el largo); en el Short 2, un sonido tipo «shh». El Short 3 quedó aprobado tal cual.

**Causa:** la marca de fin de palabra de la alineación de ElevenLabs no coincide con el fin acústico real de la voz — puede sobrepasarlo hasta ~1s e incluir el arranque de la palabra siguiente. El corte original se calculó sobre esa marca de alineación (más un margen fijo), por lo que heredó el problema en los dos casos:

| Short | Lo que marcaba la alineación | Lo que mostró el audio real (silencedetect en banda específica) | Corte anterior (con el problema) | Corte corregido |
|---|---|---|---|---|
| 1 (bloque 4) | "Amén." termina en 95,04s | Voz ya en silencio real desde 94,08s; "Señor," arranca genuinamente hacia 95,1–95,2s (banda vocal 1000–2000Hz) | 95,39s → alcanzaba a capturar el arranque de "Señor," | **94,45s** (dentro del silencio real 94,08–95,1s) |
| 2 (bloque 6) | "Amén." termina en 118,16s (más allá de la duración real del bloque, 118,126s) | Voz decae hacia 117,1–117,3s; silencio limpio real hasta 117,9s; residuo nuevo tipo "shh" en 118,0–118,13s (banda >3500Hz) | fin del archivo (118,126s) → incluía el residuo completo | **117,65s** (dentro del silencio real 117,3–117,9s) |

Se recortó cada voz dentro de su ventana de silencio real confirmada (sin tocar la narración v1 original, solo se releyó para extraer el fragmento) y se añadió una **cola de 3,0s de música sola** tras el fin de cada voz (partículas + invitación visual, sin locución), con el fundido final aplicado únicamente sobre esa cola musical — nunca sobre la voz. Verificación final de los últimos 5 segundos de cada MP4 corregido, en banda específica: Short 1 sin ninguna energía vocal (banda 1000–2000Hz) en toda la ventana; Short 2 sin ninguna energía de alta frecuencia en los últimos ~2,45s. Ambos decodifican limpio.

## Extracción de audio — carácter exacto + margen natural verificado

Cada Short se localizó por el texto exacto marcado `[INICIO SHORT N]`/`[FIN SHORT N]` del guion aprobado, dentro de la alineación por carácter de su bloque de origen (ninguno de los tres toca el bloque 4 original de la CTA ni nada regenerado). Antes de cortar, se verificó con `silencedetect` a resolución fina que el margen de entrada y de salida fuera silencio real, no voz:

| Short | Bloque | Extracción (voz) | Cola musical | Duración total | Primera sílaba | Última palabra |
|---|---|---|---:|---:|---|---|
| 1 — ¿Cuidas de todos y terminas agotado? | 4 | 59,833s–94,450s | 3,0s | **37,633s** | "¿Cuidas" @ 0,300s, arranca tras silencio limpio | "Amén." termina @ 35,207s, cortado en silencio real (corregido) |
| 2 — ¿Te sientes culpable cuando descansas? | 6 | 79,673s–117,650s | 3,0s | **40,977s** | "¿Te" @ 0,300s, arranca tras silencio limpio | "Amén." termina @ 38,487s, cortado en silencio real (corregido) |
| 3 — ¿Sigues resolviendo problemas en la cama? | 11 | 39,300s–73,550s | — (sin cambios) | **34,267s** | "Ya" @ 0,300s, arranca tras silencio limpio | "Amén." termina @ 33,90s, silencio limpio después |

Cada oración queda completa, sin ninguna palabra cortada en los bordes.

## Tratamiento visual

Mismas imágenes ya usadas en el video largo para la escena de cada sección (E03 para el Short 1, E04 para el Short 2, E06 para el Short 3), recortadas a 9:16. Mismo tratamiento de movimiento que el video largo: **un solo zoom lento (+3,5% en 23,06s) y luego encuadre fijo** hasta el final del Short — sin reinicios, mismo criterio ya aprobado y corregido para el largo.

- **Rótulo inicial** (gancho, 0–4s, anclado arriba): "¿CUIDAS DE TODOS?" / "¿DESCANSAS CON CULPA?" / "¿SIGUES HACIENDO PLANES?" — medido y ajustado de tamaño para no salirse del área segura.
- **Subtítulos** (quemados, anclados abajo, fuera de la zona de controles de YouTube Shorts): sincronizados palabra por palabra desde la alineación del bloque de origen, 42 car./línea, máx. 2 líneas.
- **Invitación de cierre** (últimos ~4s, sin locución): "Mira la oración completa en nuestro canal."
- **Partículas:** mismo bucle vertical (82, periodo 24s).
- Ninguna miniatura ni placa de título quemada en el video — las miniaturas PNG se suben aparte.

Verificado con `validarOverflow` y `validarSeparacion` (misma herramienta ya usada en los Shorts del Video 8): **0 problemas** en los 3 — ningún rótulo se sale del área segura, el gancho y el primer subtítulo quedan separados con margen suficiente.

## Audio

Voz extraída tal cual del bloque original (sin reprocesar). Música `one_step_closer.mp3` — misma pista y ducking del video largo (−23dB bajo voz, plano), cama propia por Short (no recortada del largo, para no heredar ningún corte), a un nivel que deja la voz clara.

## Verificación técnica

Decodificación completa sin errores en los 3. 1080×1920, 30fps, h264/aac.

| Short | Duración | SHA-256 |
|---|---:|---|
| short1 (corregido 2026-11-11) | 37,633s | `998780d3726725d1072a718ba92386f83c1392dbe191bdb9a478e4a7daec5842` |
| short2 (corregido 2026-11-11) | 40,977s | `a201fbb9db2217142f8109bf2477a508457d8322a8b68426d30cfa7d05454da8` |
| short3 (sin cambios) | 34,267s | `c82e47ff99ab5ababe6a95d41151bb3a34b92b72e85359492c71e87bee5d92c3` |

## Paquete de publicación (para copiar)

### Short 1 — "¿Cansado de cuidar a todos?"

- **Título:** ¿Cuidas de todos y terminas agotado?
- **Descripción:** Una oración breve para entregarle a Jesús el cansancio de cuidar de todos, basada en Mateo 11. Mira la oración completa en nuestro canal. #OracionDeLaNoche #Mateo11 #Shorts
- **Etiquetas:** oracion corta, mateo 11, cansancio, cuidar de otros, shorts cristianos, oracion biblica, descanso

### Short 2 — "La culpa de descansar"

- **Título:** ¿Te sientes culpable cuando descansas?
- **Descripción:** Una oración breve para soltar la culpa de detenerte cuando todavía queda algo pendiente, basada en Mateo 11. Mira la oración completa en nuestro canal. #OracionDeLaNoche #Mateo11 #Shorts
- **Etiquetas:** oracion corta, mateo 11, culpa, descanso, shorts cristianos, oracion biblica, humildad

### Short 3 — "Planes en la cama"

- **Título:** ¿Sigues resolviendo problemas en la cama?
- **Descripción:** Una oración breve para entregarle a Dios lo que no puedes resolver esta noche, basada en Mateo 11. Mira la oración completa en nuestro canal. #OracionDeLaNoche #Mateo11 #Shorts
- **Etiquetas:** oracion corta, mateo 11, preocupacion, descanso, shorts cristianos, oracion biblica, entregar cargas

**Miniatura de los Shorts:** no aplica — YouTube genera automáticamente el fotograma de portada a partir del propio video vertical (igual criterio que el Video 8).
