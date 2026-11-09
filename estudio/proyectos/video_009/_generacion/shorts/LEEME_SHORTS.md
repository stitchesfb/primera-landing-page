# Video 9 — Los 3 Shorts (vertical 1080×1920)

**Estado:** entregados para revisión de Orlando. **No se publicó ni programó nada.**
**Fecha:** 2026-11-09
El video largo no se tocó. No se generó voz nueva — los 3 Shorts se extrajeron directamente de los bloques TTS ya aprobados (4, 6 y 11).

## Extracción de audio — carácter exacto + margen natural verificado

Cada Short se localizó por el texto exacto marcado `[INICIO SHORT N]`/`[FIN SHORT N]` del guion aprobado, dentro de la alineación por carácter de su bloque de origen (ninguno de los tres toca el bloque 4 original de la CTA ni nada regenerado). Antes de cortar, se verificó con `silencedetect` a resolución fina que el margen de entrada y de salida fuera silencio real, no voz:

| Short | Bloque | Extracción | Duración real | Primera sílaba | Última palabra |
|---|---|---|---:|---|---|
| 1 — ¿Cuidas de todos y terminas agotado? | 4 | 59,833s–95,390s | **35,567s** | "¿Cuidas" @ 0,300s, arranca tras silencio limpio | "Amén." termina @ 35,21s, silencio limpio después |
| 2 — ¿Te sientes culpable cuando descansas? | 6 | 79,673s–118,126s (fin real del bloque) | **38,467s** | "¿Te" @ 0,300s, arranca tras silencio limpio | "Amén." termina @ 38,49s — el bloque 6 termina ahí mismo, no hay nada más que cortar |
| 3 — ¿Sigues resolviendo problemas en la cama? | 11 | 39,300s–73,550s | **34,267s** | "Ya" @ 0,300s, arranca tras silencio limpio | "Amén." termina @ 33,90s, silencio limpio después |

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
| short1 | 35,567s | `e2cd0933de7711074cc7557a89138e894a06600fea5366f02ad050d147de08b5` |
| short2 | 38,467s | `28d02bc5d778e79a2432ee67148f185c46bf6bdedb7f2f8c6eba6f05653a64e1` |
| short3 | 34,267s | `c82e47ff99ab5ababe6a95d41151bb3a34b92b72e85359492c71e87bee5d92c3` |

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
