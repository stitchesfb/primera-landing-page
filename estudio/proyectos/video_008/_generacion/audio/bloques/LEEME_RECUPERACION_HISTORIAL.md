# Video 8 (Salmo 23) — 4 audios recuperados del historial de ElevenLabs

**No se generó ningún audio nuevo en esta tarea.** Los 4 archivos de este directorio se descargaron
directamente del historial de la cuenta de ElevenLabs (endpoint `/v1/history/{id}` y
`/v1/history/{id}/audio`), usando los History ID indicados por Orlando (bloque 19) o localizados
por contenido/duración (bloques 1, 2, 18) — ver sección "Cómo se identificaron" más abajo.

**Actualización 2026-10-24:** Orlando aportó el guion aprobado (`VIDEO_008_GUION_APROBADO.md`) y
el plan técnico (`VIDEO_008_PLAN_TECNICO_PRE_TTS.md`), ahora persistidos en
`estudio/proyectos/video_008/`. Se cotejó el texto completo de los 4 bloques contra ese guion —
ver sección "Cotejo contra el guion aprobado" más abajo. **Los 3 bloques identificados por
duración/contenido (1, 2 y 18) quedan confirmados exactos, ya no son una inferencia sin verificar.**

## Los 4 bloques recuperados

| Bloque | Archivo | History ID | Modelo | Voz | Duración real (ffprobe) | SHA-256 |
|---|---|---|---|---|---:|---|
| 1 | `1.mp3` | `Mu8NtZNgVrxj3UeFFWvi` | `eleven_flash_v2_5` | `8mBRP99B2Ng2QwsJMFQl` ("El Faraon - Full, Clear, Mellow") | 115,722s (≈1:56) | `4d552096fcd2d7262cb6761b1d3ee4c827d5c0965455b8a273073125835539fe` |
| 2 | `2.mp3` | `7J12nrwWWYC7BfsA4gO3` | `eleven_flash_v2_5` | `8mBRP99B2Ng2QwsJMFQl` | 116,193s (≈1:56) | `a58247df6eb637362c3f13006da71be6a31d1a69ea6109f095b00f21145e9815` |
| 18 | `18.mp3` | `kWHnNar2Dq2FKam5Onwr` | `eleven_flash_v2_5` | `8mBRP99B2Ng2QwsJMFQl` | 130,168s (≈2:10) | `9a4c4fe62569fac35342ad68f65ab57e09e26cb0b726847cd093a754991e7656` |
| 19 | `19.mp3` | `WGMbjBfRYJ8TXSXk7RYT` | `eleven_v4` | (no devuelto por la API para este item — ver nota) | 97,149s (≈1:37) | `69a3e173fea6a9503cfcc506957ad03b251fab1004da542acb482dc6ee76ce38` |

Los 4 traen **alineación por carácter completa** (`character_start_times_seconds` /
`character_end_times_seconds`), guardada en `1.alignment.json`, `2.alignment.json`,
`18.alignment.json` y `19.alignment.json`, mismo formato que `estudio/proyectos/video_007/_generacion/audio/bloques/*.alignment.json`
(`{alignment, normalized_alignment}`, cada uno con `characters` + los dos arreglos de tiempos).

**Nota sobre `character_end_times_seconds` (confirmado y corregido el 2026-10-24):** en este
endpoint de historial, ese arreglo contiene la **duración de cada carácter**, no un tiempo
acumulado — sumado da la duración total (verificado: coincide con la duración real del MP3 en los
4 casos, margen de 0,04–0,05s). `character_start_times_seconds` sí es acumulado desde 0. Es
distinto del formato que produce el endpoint de generación con timestamps (`vozConTiempos` en
`estudio/lib/elevenlabs.mjs`), que usan los `*.alignment.json` de video_007, donde ambos arreglos
ya son acumulados.

Por eso cada bloque tiene ahora **dos** archivos de alineación:
- `{N}.alignment_historial_crudo.json` — la respuesta cruda del historial, **sin tocar**, tal como
  la devolvió la API (`character_end_times_seconds` = duración por carácter).
- `{N}.alignment.json` — versión **normalizada** al formato que espera el proyecto (igual al de
  video_007): `character_end_times_seconds` recalculado como tiempo absoluto acumulado
  (`start[i] + duración[i]`). Incluye un bloque `_validacion` con la duración real del audio
  (ffprobe), la duración según la alineación, el delta entre ambas, y la lista de errores de
  `start<=end`/límites del audio (vacía en los 4 bloques).

## Texto, ajustes y configuración de cada bloque

### Bloque 1 — `Mu8NtZNgVrxj3UeFFWvi`
- **Ajustes:** `{"stability":0.65,"similarity_boost":0.88,"use_speaker_boost":true,"style":0,"speed":0.91}`
- **Fecha de generación:** 2026-10-18T20:19:01Z
- **Texto completo** (campo `text` devuelto por la API, idéntico a la alineación reconstruida):
  > Estás cansado, pero tu mente sigue sosteniendo todo. La familia, las decisiones, lo que falta por hacer. Esta noche, trae tus cargas delante de Dios. El Salmo veintitrés nos invita a descansar bajo el cuidado de nuestro Pastor. Vamos a orar.
  >
  > Quizá durante el día fuiste la persona a quien todos acudieron. Escuchaste preguntas, resolviste problemas, procuraste mantener la calma. Tal vez nadie vio cuánto esfuerzo te costó seguir adelante. Ahora hay menos ruido a tu alrededor, pero dentro de ti todavía quedan conversaciones, cuentas, nombres y asuntos pendientes. Puedes llegar a esta oración tal como estás. No necesitas ordenar cada pensamiento antes de hablar con Dios.
  >
  > Busca una posición cómoda. Deja que tu respiración siga su ritmo natural. Puedes escuchar con los ojos cerrados si te ayuda, sin esforzarte por concentrarte en cada frase. Si algún pensamiento te distrae, vuelve con suavidad a la oración. No estamos aquí para hacer algo perfectamente. Estamos aquí para presentar nuestra vida ante el Señor y recordar su cuidado.
  >
  > Padre celestial, aquí estamos. Tú conoces este día desde el principio hasta el final. Conoces las cosas que pudimos explicar y las que guardamos porque no encontramos palabras. Sabes qué responsabilidad pesó más y qué noticia seguimos pensando. Recibe nuestra oración con todo lo que trae: cansancio, gratitud, preguntas y necesidad de tu presencia.

### Bloque 2 — `7J12nrwWWYC7BfsA4gO3`
- **Ajustes:** `{"use_speaker_boost":true,"speed":0.91,"similarity_boost":0.88,"style":0,"stability":0.65}` (mismos valores que el bloque 1)
- **Fecha de generación:** 2026-10-18T20:19:04Z (3s después del bloque 1 — mismo lote de generación)
- **Texto completo:** contiene el **Salmo 23 completo en Reina-Valera 1909** ("Jehová es mi pastor; nada me faltará...") precedido de una introducción en oración y seguido de un comentario devocional. Texto íntegro guardado en `2.alignment.json` (reconstruible desde `characters`) y en el JSON crudo (ver más abajo).

### Bloque 18 — `kWHnNar2Dq2FKam5Onwr`
- **Ajustes:** `{"similarity_boost":0.88,"stability":0.65,"style":0,"speed":0.91,"use_speaker_boost":true}` (mismos valores)
- **Fecha de generación:** 2026-10-18T20:19:07Z (3s después del bloque 2 — mismo lote)
- **Texto completo:** oración sobre misericordia, el día completo, familia y hogar — texto íntegro en `18.alignment.json` y en el JSON crudo.

### Bloque 19, revisión 04 — `WGMbjBfRYJ8TXSXk7RYT`
- **Ajustes devueltos por el historial:** `{"stability":0.5}` — campo incompleto, el historial no confirma `similarity_boost` ni `speed`.
- **Ajustes registrados durante la generación, según Orlando:** `stability: 0,50`, `similarity_boost: 0,75`, `speed: 1,00`. Se registran por separado en `manifiesto_recuperacion.json`, sin fusionarlos con lo que devuelve el historial ni darlos por confirmados de forma independiente — el historial incompleto ni los confirma ni los contradice.
- **Fecha de generación:** 2026-10-21T01:50:51Z (en un lote distinto, posterior, solo con `eleven_v4`)
- **Texto completo:** oración de cierre que referencia explícitamente "mi Pastor" y "tu bondad y tu misericordia" (Salmo 23:6), termina en "En el nombre de Jesús. Amén." — texto íntegro en `19.alignment.json`.
- **Nota:** el campo `voice_id`/`voice_name` que devuelve la API para este item específico es `null` — no es una omisión de esta tarea, es lo que devuelve el endpoint de historial para ese item. El modelo (`eleven_v4`) y los ajustes sí se devolvieron con normalidad.

## Cotejo contra el guion aprobado (2026-10-24)

Con `VIDEO_008_GUION_APROBADO.md` (SHA-256 `c339ca8e18d1...` — coincide exactamente con el que
declara el plan técnico) ya disponible, se extrajo el texto exacto de cada bloque y se comparó
carácter a carácter contra el texto reconstruido desde la alineación de cada audio:

- **Bloque 1:** idéntico, 1.391/1.391 caracteres, cero diferencias.
- **Bloque 2:** idéntico en contenido — las únicas diferencias del diff automático son 2 saltos de
  línea dobles que caen exactamente en las posiciones de `[PAUSA P01]` y `[PAUSA P02]` del guion
  (el audio tiene ahí una pausa real; el texto del guion tiene la etiqueta quitada antes de narrar).
- **Bloque 18:** idéntico en contenido, mismo patrón en la posición de `[PAUSA P09]`.
- **Bloque 19:** idéntico salvo **una** diferencia real, ya anticipada por Orlando: el guion escrito
  dice *"Puede dejar de recorrer cada posibilidad"*, el audio aprobado (revisión 04, `eleven_v4`)
  dice *"Puede descansar sin recorrer cada posibilidad"*. **Se conserva tal cual está en el audio
  aprobado — no se trata como error.**

Con esto, **la asignación bloque 1 = `Mu8NtZNgVrxj3UeFFWvi` y bloque 2 = `7J12nrwWWYC7BfsA4gO3` queda
confirmada**, ya no es una inferencia pendiente de verificar.

## Dónde están los JSON crudos completos del historial

Persistidos en el repositorio en `historial_crudo/{history_item_id}.json` (copia exacta, verificada
byte a byte, de lo que devolvió `/v1/history/{id}`). También quedan en el scratchpad de la sesión
que los descargó, pero la copia que cuenta es la del repositorio.

## Cómo se identificaron los bloques 1, 2 y 18

**Nota histórica (ya resuelta):** en el momento de esta recuperación (antes del 2026-10-24) no
existía en este repositorio un guion aprobado ni un plan técnico del Video 8, así que la
identificación de los bloques 1, 2 y 18 se hizo sin poder contrastar contra una fuente local — se
documentó entonces como un vacío pendiente. Orlando aportó ambos documentos el 2026-10-24 y el
cotejo de la sección anterior confirma que la identificación hecha en su momento fue correcta. El
método que se usó, para que quede constancia:

1. Se listó el historial completo de ElevenLabs filtrado por `voice_id=8mBRP99B2Ng2QwsJMFQl` (639
   items en total, paginado completo).
2. Se descartaron los 624 items con un patrón de fecha/contenido que los identifica como material
   del Video 7 (Salmo 91) — confirmado leyendo su texto, que menciona explícitamente "El Salmo 91..."
   en varios casos.
3. Se aisló un lote de 4 generaciones consecutivas el 2026-10-18 entre las 20:19:01 y las 20:19:10
   (3 segundos de diferencia entre cada una — un patrón típico de generación por lote, no de
   pruebas sueltas), con duraciones 115,7s / 116,1s / 130,1s / 112,5s.
4. Las primeras 3 coinciden, dentro de un margen de menos de un segundo, con las duraciones que dio
   Orlando para los bloques 1, 2 y 18 (1:56, 1:56 y 2:10). La 4ª (112,5s) es una versión en Flash
   v2.5 del **bloque 19** (mismo texto inicial que la versión `eleven_v4` ya aprobada) — se excluyó,
   junto con otras 3 variantes/pruebas cortas de ese mismo bloque 19 encontradas en fechas
   posteriores (18:37, 00:52 y 01:29 del día siguiente, dos de ellas de menos de 9 segundos — pruebas
   cortas evidentes), tal como pidió Orlando explícitamente.
5. Dentro de las 3 restantes, el **bloque 18 se identifica sin ambigüedad** por duración exacta
   (130,1s ≈ 2:10, y ningún otro candidato se le acerca).
6. Entre las otras dos (115,7s y 116,1s, ambas ≈1:56), la asignación **bloque 1 = `Mu8NtZNgVrxj3UeFFWvi`**
   y **bloque 2 = `7J12nrwWWYC7BfsA4gO3`** se hizo por el contenido, no por duración (son casi
   idénticas): el primer texto termina su introducción con "Vamos a orar" y menciona el Salmo 23
   solo de pasada; el segundo empieza "Señor, ayúdanos a acercarnos..." y a continuación **lee el
   Salmo 23 completo** — la secuencia narrativa (introducción → oración breve → lectura del salmo)
   es la que tiene sentido como bloque 1 seguido de bloque 2, no al revés.

   **Esta asignación 1↔2, hecha por inferencia de contenido en su momento, quedó confirmada exacta
   el 2026-10-24 al cotejarla carácter a carácter contra el guion aprobado** — ver sección de cotejo
   arriba.

## Qué falta todavía

- **Los 15 bloques restantes (3–17).** No están en el historial de ElevenLabs bajo los criterios
  buscados — no se generó nada para suplirlos. Presupuesto propuesto (sin generar audio) en
  `../../VIDEO_008_PRESUPUESTO_15_BLOQUES_V4.md`.
- **`voice_id` y ajustes completos de `eleven_v4`** para esos 15 bloques: ni el guion ni el plan
  técnico los traen (el plan técnico pide recuperarlos "del manifiesto canónico aprobado de Video 7",
  que tampoco los tiene registrados en v4 — Video 7 usó Flash v2.5, no v4). Lo único disponible de
  v4 es el bloque 19, con ajustes parciales (ver arriba). Sin esto no se puede armar el comando de
  generación de los 15 bloques restantes.
- **Tarifa real de `eleven_v4`** para esta cuenta: solo hay un dato observado (el propio bloque 19),
  no una tarifa confirmada — ver el documento de presupuesto para el detalle y la recomendación de
  confirmarla con un bloque de control antes de generar los 15.

Ninguno de estos vacíos se llenó por inferencia, generación ni suposición.

## Qué se conservó intacto

No se tocó nada del Video 7 (guion aprobado, render largo, maestro, grupos, tomas, audios) ni se
ejecutó ninguna generación TTS nueva en esta tarea.
