# Video 7 — Preflight actualizado para la revisión 3 (sin llamadas a ElevenLabs, sin gasto)

**Modo de esta ejecución:** preflight local exclusivamente. No se llamó a ElevenLabs, no se consumieron créditos, no se generó ningún bloque nuevo.

## 0. Documentos maestros reemplazados

- `VIDEO_007_GUION_APROBADO.md`: reemplazado por la versión con la revisión 3 aprobada por Orlando el 30 de septiembre de 2026 (guion final, voz, bloque 1 y revisión 3 aprobados; generación TTS completa todavía no autorizada).
- `VIDEO_007_PLAN_TECNICO_PRE_TTS.md`: reemplazado por la versión actualizada correspondiente, con el resultado de calibración del bloque 1 ya incorporado.

## 1. Reprocesamiento programático del guion

Se volvió a ejecutar el extractor determinista (`_generacion/lib_local/extraerGuion.mjs`) contra el nuevo guion. Reglas de exclusión sin cambios respecto al preflight anterior:

- excluye encabezados `## BLOQUE NN — título`;
- excluye toda marca entre corchetes (`[INICIO/FIN SHORT N]`, `[PAUSA IMPORTANTE N…]`) — se registran como metadato del bloque, no como texto narrado;
- excluye la nota introductoria en blockquote y los separadores `---`;
- excluye todo el contenido desde `## Notas para revisión editorial` en adelante (no es narración).

Resultado: 106 párrafos narrados (antes 101; la revisión 3 añadió 5 párrafos nuevos, repartidos en los bloques 6, 10, 17, 18 y 23), agrupados en 24 bloques editoriales.

## 2. Recuento de caracteres y palabras

**Total facturable:** 35.290 caracteres, 5.808 palabras.

Nota sobre el conteo: el preflight original de Video 7 sumaba los caracteres de cada párrafo sin contar los separadores `\n\n` usados para unir varios párrafos dentro de un mismo bloque TTS. Esa cifra subestimaba el texto real en 2 caracteres por cada unión interna de párrafos. Desde esta revisión, `caracteres` en ambos manifiestos (`_preflight/manifiesto_bloques.json` y `_generacion/manifiesto.json`) es siempre `texto.length` real — el string exacto que se enviaría a la API — para que coincida con lo que se factura. Esto ya se había resuelto así para el bloque 1 en la calibración (1.153, no 1.151).

## 3. Reagrupación en bloques TTS (20–30 objetivo)

Con la revisión 3, los bloques 6, 10, 17 y 18 crecieron lo suficiente para quedar dentro o cerca del rango 1.200–2.000 caracteres por sí solos, y el bloque 23 creció de 1.948 (unido a 24 en el preflight anterior) a 1.827 caracteres por sí solo. Eso cambia la conclusión de la revisión anterior:

- **La unión 23+24 ya no es viable.** Sumados darían ≈2.729 caracteres, un 36% por encima del rango objetivo y por encima del límite configurado `canal.json → api.max_caracteres_por_peticion` (2.000). Unirlos violaría ese límite técnico.
- **No fue necesaria ninguna otra unión.** Los 24 bloques editoriales, generados 1:1 como 24 bloques TTS, ya caen dentro del rango 20–30 pedido, y ninguno requiere partirse para entrar en rango (partir un bloque significaría dividir un párrafo, lo cual está prohibido).

**Resultado: 24 bloques TTS, mapeo 1:1 con los 24 bloques editoriales.** Ningún bloque TTS abarca más de un bloque editorial ni viceversa.

| Bloque | Párrafos | Caracteres | Palabras | Marcadores | Rango 1200–2000 |
|---|---|---:|---:|---|---|
| 1 | p1–p2 | 1.153 | 190 | INICIO/FIN SHORT 1, PAUSA 1 | corto (−4%) — **ya generado, no se toca** |
| 2 | p3–p5 | 1.165 | 186 | — | corto (−3%) |
| 3 | p6–p9 | 1.076 | 184 | — | corto (−10%) |
| 4 | p10–p12 | 1.049 | 177 | — | corto (−13%) |
| 5 | p13–p16 | 1.131 | 190 | PAUSA 2 | corto (−6%) |
| 6 | p17–p21 | 2.002 | 330 | PAUSA 3 | **largo (+0,1%)** |
| 7 | p22–p24 | 1.162 | 193 | INICIO/FIN SHORT 2 | corto (−3%) |
| 8 | p25–p28 | 1.983 | 315 | PAUSA 4 | dentro |
| 9 | p29–p32 | 1.859 | 301 | — | dentro |
| 10 | p33–p37 | 1.788 | 296 | PAUSA 5 | dentro |
| 11 | p38–p41 | 1.178 | 197 | — | corto (−2%) |
| 12 | p42–p46 | 1.794 | 291 | — | dentro |
| 13 | p47–p50 | 1.188 | 195 | PAUSA 6 | corto (−1%) |
| 14 | p51–p54 | 1.220 | 194 | — | dentro |
| 15 | p55–p59 | 1.835 | 290 | — | dentro |
| 16 | p60–p63 | 1.175 | 189 | PAUSA 7 | corto (−2%) |
| 17 | p64–p68 | 1.899 | 296 | — | dentro |
| 18 | p69–p73 | 1.852 | 309 | — | dentro |
| 19 | p74–p76 | 1.098 | 186 | INICIO/FIN SHORT 3 | corto (−9%) |
| 20 | p77–p81 | 1.798 | 298 | PAUSA 8 | dentro |
| 21 | p82–p85 | 1.084 | 177 | — | corto (−10%) |
| 22 | p86–p91 | 2.072 | 357 | PAUSA 9 | **largo (+4%)** |
| 23 | p92–p98 | 1.827 | 310 | — | dentro |
| 24 | p99–p106 | 902 | 157 | PAUSA 10 | **corto (−25%)** |

**Total: 35.290 caracteres, 5.808 palabras, 24 bloques.**

## 4. Confirmación: ninguna frase, cita, oración o Short queda dividido

Cada bloque TTS es un bloque editorial completo, con todos sus párrafos íntegros unidos por `\n\n`. Como el corte solo ocurre en los límites de bloque editorial (nunca dentro de un párrafo), y los tres Shorts están cada uno completamente contenido dentro de un único bloque editorial (Short 1 en el bloque 1, Short 2 en el bloque 7, Short 3 en el bloque 19), ningún Short, cita bíblica, oración completa o frase queda partido entre dos bloques TTS.

## 5. Bloque 1: conservado sin regenerar

- Texto del bloque 1 en la revisión 3: **sin cambios** (confirmado por diff de git contra la versión anterior — la revisión 3 no tocó el bloque 1).
- `texto_sha256` recalculado contra el guion nuevo: `1c72d1556efbfd2944c48e7efe04fa59f67a8b0b37d1e3d67eed45d132e8c3b9` — **idéntico** al hash ya registrado en el manifiesto de generación.
- El chequeo de reanudación (`generar_bloque.mjs 1 --dry-run`, ejecutado sin llamar a la API) confirma: **SALTAR** — "texto, voz, modelo y ajustes idénticos; audio ya presente en disco".
- El MP3 existente (`_generacion/audio/bloques/1.mp3`) se reutiliza tal cual; no se generó nada nuevo.
- Se conservó en el manifiesto la observación aceptada por Orlando: ligera prolongación de "noche" cerca del segundo 3; no requiere regeneración.
- El bloque 1 conserva el identificador `"1"` en el nuevo mapeo (no hubo renumeración en su caso), pero la verificación se hizo por hash y texto, no asumiendo el número — así habría quedado detectado si el guion hubiera cambiado ese bloque.
- El antiguo bloque `"23-24"` ya no existe como tal: al no ser viable la unión, sus dos bloques editoriales vuelven a ser bloques TTS independientes `"23"` y `"24"`. Ninguno de los dos tenía audio generado, así que no hay nada que reconciliar por hash ahí.

## 6. Manifiesto actualizado

`_generacion/manifiesto.json` y `_preflight/manifiesto_bloques.json` fueron regenerados con los 24 bloques de la revisión 3:

- **Bloque 1:** `estado: "generado"`, con su audio, hashes, ajustes, créditos reales/estimados y la observación aceptada conservados.
- **Bloques 2–24:** `estado: "pendiente"`, sin audio, sin `voice_id`/`model_id`/`history_item_id`.

Verificación de reanudación ejecutada localmente (sin llamar a la API):

```
bloque "1"  --dry-run  → SALTAR (ya esta)
bloque "24" --dry-run  → GENERAR (estado previo del bloque es "pendiente")
```

## 7. Proyección de duración

Usando el ritmo real medido en la calibración (694,9 caracteres/minuto, sin pausas digitales):

**35.290 caracteres ÷ 694,9 car/min = 50,79 min ≈ 50 min 47 s de narración pura.**

Esto coincide, dentro del margen de redondeo, con la proyección ya aprobada en el plan técnico (~50:43, calculada sobre la cifra aproximada de 35.232 caracteres en vez del total exacto con separadores).

**Las diez pausas importantes se suman aparte, todavía sin duración aprobada.** Se verificó la posición exacta de cada una contra los párrafos reales (no por suposición): siete caen en el límite entre dos bloques TTS y tres quedan **dentro** de un bloque, cerca de su final:

| Pausa | Ubicación exacta | Duración |
|---|---|---|
| 1 | dentro del bloque 1, entre el Short 1 y el párrafo siguiente | por aprobar |
| 2 | límite entre el bloque 4 y el bloque 5 | por aprobar |
| 3 | límite entre el bloque 5 y el bloque 6 | por aprobar |
| 4 | límite entre el bloque 7 y el bloque 8 | por aprobar |
| 5 | **dentro del bloque 10**, entre su párrafo principal y la frase de transición que lo cierra — no en el límite 10→11 | por aprobar |
| 6 | límite entre el bloque 12 y el bloque 13 | por aprobar |
| 7 | límite entre el bloque 15 y el bloque 16 | por aprobar |
| 8 | **dentro del bloque 20**, entre sus dos últimos párrafos — no en el límite 20→21 | por aprobar |
| 9 | límite entre el bloque 21 y el bloque 22 (antes del tramo final) | por aprobar |
| 10 | dentro del bloque 24, antes del "amén" final | por aprobar |

Esto corrige una imprecisión del preflight anterior: las pausas 5 y 8 no están en el límite entre bloques TTS, sino dentro de un bloque. En consecuencia, **el límite real 10→11 (que la muestra C debe validar) no tiene ninguna pausa digital** — es un empalme directo entre dos respuestas de la API generadas por separado, exactamente el caso que más necesita verificarse por continuidad audible.

Con 50:47 de narración y el objetivo práctico ya fijado de 51–52 minutos totales, cada pausa dispone en promedio de apenas unos segundos si se reparte el margen restante entre las diez — esto ya estaba señalado como riesgo y sigue sin resolverse hasta que se escuchen y aprueben las pausas reales sobre audio generado.

## 8. Muestras B, C y D recalculadas (no generadas)

Con el nuevo mapeo 1:1, los bloques de referencia de las muestras B–D no cambiaron de número respecto al plan técnico (porque ninguno de ellos caía en el tramo 23–24 que sí se renumeró):

| Muestra | Contenido | Qué valida | Caracteres | Palabras | Costo a 0,276 créd./car. |
|---|---|---|---:|---:|---:|
| B | Bloque 7 completo | Cita bíblica, tono pastoral, Short 2 | 1.162 | 193 | 320,71 créditos |
| C | Bloques 10 y 11, generados por separado | Transición Palabra→oración; empalme sin pausa digital entre dos llamadas API distintas (la PAUSA 5 queda dentro del bloque 10, no en el límite 10→11) | 1.788 + 1.178 = 2.966 | 296 + 197 = 493 | 493,49 + 325,13 = 818,62 créditos |
| D | Bloque 24 completo | Ritmo calmado, finales de palabra, cierre (incluye PAUSA 10) | 902 | 157 | 248,95 créditos |

**Total combinado B+C+D:** 5.030 caracteres, 950 palabras, **1.388,28 créditos estimados** (tarifa conservadora de 0,276; la tarifa real observada en la calibración del bloque 1 fue ≈0,220 créd./car., así que el gasto real probablemente sea menor).

**No se generó ninguna de estas muestras.** Requieren aprobación expresa y por separado.

## 9. Riesgos y hallazgos

1. **Bloques 6 (2.002 car.) y 22 (2.072 car.) superan el límite configurado de 2.000 caracteres por petición** (`canal.json → api.max_caracteres_por_peticion`), por un 0,1% y un 4% respectivamente. El bloque 22 ya estaba en esa situación en el preflight anterior (Orlando no lo objetó); el bloque 6 es nuevo por la revisión 3. Ninguno de los dos se puede dividir sin partir un párrafo, y ninguno se puede fusionar con un vecino sin empeorar el desbalance. Recomendación: aceptar la excepción como se aceptó antes, o confirmar explícitamente el límite de 2.000 antes de generar esos dos bloques.
2. **El bloque 24 queda corto (902 car., −25% del piso de 1.200)** sin posibilidad de unión (es el último bloque, y unirlo al 23 rompería el límite de 2.000). Se acepta como excepción de flexibilidad, igual que ya se había aceptado en el preflight anterior para el mismo bloque.
3. **Diez pausas todavía sin duración aprobada** contra un objetivo práctico de 51–52 minutos totales y 50:47 de narración pura: el margen es ajustado. Habrá que escuchar pausas reales sobre audio generado antes de fijar sus duraciones.
4. Ningún otro bloque requiere ajuste: todas las demás desviaciones del rango 1.200–2.000 son menores (entre −1% y −13%) y consistentes con el criterio ya aprobado de no forzar uniones salvo necesidad clara.

## 10. Archivos modificados en esta tarea

- `estudio/proyectos/video_007/VIDEO_007_GUION_APROBADO.md` — reemplazado por la versión con la revisión 3.
- `estudio/proyectos/video_007/VIDEO_007_PLAN_TECNICO_PRE_TTS.md` — reemplazado por la versión actualizada.
- `estudio/proyectos/video_007/_preflight/manifiesto_bloques.json` — regenerado para 24 bloques (revisión 3), `nota_caracteres` añadida.
- `estudio/proyectos/video_007/_generacion/manifiesto.json` — regenerado para 24 bloques; bloque 1 conservado con su estado `generado` y toda su metadata; bloques 2–24 en `pendiente`.
- `estudio/proyectos/video_007/_generacion/lib_local/extraerGuion.mjs` — `bloqueTtsDe()` simplificado a mapeo 1:1 (ya no une 23+24); comentario de cabecera actualizado con la justificación.
- `estudio/proyectos/video_007/_preflight/informe_preflight.md` — este informe, reemplazado por la versión de la revisión 3.

No se modificó `VIDEO_007_GUION_APROBADO.md` más allá de sustituir el archivo completo por la versión que Orlando ya aprobó — no se alteró ningún texto narrado por iniciativa propia. No se llamó a ElevenLabs. No se generó audio nuevo. No hubo música, visuales ni render.

**Fin del preflight. Se detiene aquí y espera aprobación antes de generar las muestras B, C o D.**
