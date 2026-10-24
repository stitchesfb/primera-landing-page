# Video 8 (Salmo 23) — 4 audios recuperados del historial de ElevenLabs

**No se generó ningún audio nuevo en esta tarea.** Los 4 archivos de este directorio se descargaron
directamente del historial de la cuenta de ElevenLabs (endpoint `/v1/history/{id}` y
`/v1/history/{id}/audio`), usando los History ID indicados por Orlando (bloque 19) o localizados
por contenido/duración (bloques 1, 2, 18) — ver sección "Cómo se identificaron" más abajo.

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

**Nota sobre `character_end_times_seconds`:** en este endpoint de historial, ese arreglo contiene
la **duración de cada carácter**, no un tiempo acumulado — hay que sumarlo para obtener la duración
total (se verificó: la suma coincide con la duración real del MP3 en los 4 casos, con un margen de
±0,1s). `character_start_times_seconds` sí es acumulado desde 0. Dejarlo documentado aquí para quien
reutilice estos archivos de alineación — es distinto del formato que produce el endpoint de
generación con timestamps (`vozConTiempos` en `estudio/lib/elevenlabs.mjs`), donde ambos arreglos
son acumulados.

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
- **Ajustes:** `{"stability":0.5}`
- **Fecha de generación:** 2026-10-21T01:50:51Z (en un lote distinto, posterior, solo con `eleven_v4`)
- **Texto completo:** oración de cierre que referencia explícitamente "mi Pastor" y "tu bondad y tu misericordia" (Salmo 23:6), termina en "En el nombre de Jesús. Amén." — texto íntegro en `19.alignment.json`.
- **Nota:** el campo `voice_id`/`voice_name` que devuelve la API para este item específico es `null` — no es una omisión de esta tarea, es lo que devuelve el endpoint de historial para ese item. El modelo (`eleven_v4`) y los ajustes sí se devolvieron con normalidad.

Los JSON crudos completos devueltos por la API (con todos los campos, incluida la alineación sin recortar) se conservan en el scratchpad de esta sesión, no en el repositorio (son el material de trabajo de la recuperación, no un entregable del proyecto):
`/tmp/.../scratchpad/video_008/historial_crudo/{history_item_id}.json`

## Cómo se identificaron los bloques 1, 2 y 18

**No existe en este repositorio un guion aprobado ni un plan técnico del Video 8** (se buscó
exhaustivamente: no hay carpeta `estudio/proyectos/video_008` previa, ningún archivo menciona
"Salmo 23" ni "video_008" en todo el repositorio). Por lo tanto, **no fue posible contrastar el
texto de cada bloque contra un guion aprobado local**, como pidió Orlando — este es exactamente
el documento faltante que se informa aquí, sin intentar suplirlo generando o reconstruyendo un
guion no autorizado.

En su lugar, la identificación se hizo así:

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

   **Esta asignación 1↔2 es una inferencia razonada a partir del contenido y la secuencia del lote
   de generación, no una verificación contra un documento aprobado — porque ese documento no existe
   en este repositorio.** Se señala aquí explícitamente para que Orlando la confirme o la corrija,
   en vez de darla por hecha en silencio.

## Qué falta — documentos y permisos no disponibles en este repositorio

- **Guion aprobado del Video 8 (Salmo 23).** No existe ninguna versión en `estudio/proyectos/` ni
  en ningún otro lugar de este repositorio. Sin él no se puede verificar el texto de cada bloque
  palabra por palabra contra una fuente aprobada, ni confirmar cuántos bloques totales tiene el
  guion, ni las pausas/transiciones planeadas.
- **Plan técnico del Video 8** (equivalente al mapa visual o plan de render de los Video 6/7). No
  existe tampoco.
- **Los 15 bloques restantes** (de los 19 que aparentemente tiene el guion, a juzgar solo por que
  el bloque 19 existe) no están en el historial de ElevenLabs bajo los criterios buscados — pueden
  no haberse generado todavía, haberse generado con otra voz/modelo no buscado aquí, o requerir el
  guion aprobado para saber exactamente qué texto generar. **No se generó nada para suplirlos**, tal
  como se pidió. Quedan pendientes de producción con `eleven_v4`, después de que se apruebe su
  presupuesto — explícitamente indicado por Orlando, no una decisión tomada aquí.

Ninguno de estos vacíos se llenó por inferencia, generación ni suposición — se dejan documentados
para que Orlando aporte el documento que falte o confirme el camino a seguir.

## Qué se conservó intacto

No se tocó nada del Video 7 (guion aprobado, render largo, maestro, grupos, tomas, audios) ni se
ejecutó ninguna generación TTS nueva en esta tarea.
