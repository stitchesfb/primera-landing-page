# Video 9 — Generación de los 15 bloques y ensamblado de la narración (v1)

**Estado:** entregado para revisión de Orlando. **No se ha generado música, visuales ni render.**
**Fecha:** 2026-11-06
**Configuración de voz usada (confirmada por Orlando tras la muestra):** `eleven_v4`, voice_id `8mBRP99B2Ng2QwsJMFQl`, `stability 0.5`, `similarity_boost 0.75`, `speed 1`, formato `mp3_44100_128`.

---

## 1. Generación — 15 llamadas, una por bloque, sin reintentos

Cada bloque se generó con **una sola llamada HTTP**, sin reintento automático, usando el texto exacto del plan ya aprobado (`plan_bloques_tts.json`). Cuando la juntura con el bloque vecino era una **continuación directa** (sin pausa real entre medio), se envió el párrafo vecino real como `previous_text`/`next_text` — no se narra, solo evita que la prosodia suene cortada en el borde. Cuando la juntura llevaba una **pausa real** (1, 2, 4, 5, 6, 7), no se envió contexto de ese lado, porque ahí va a sonar un silencio real, no una continuación.

Las 15 llamadas devolvieron **texto alineado idéntico, carácter a carácter, al texto enviado** — ninguna tuvo que repetirse. Cada bloque se guardó (audio + alineación + payload enviado) inmediatamente después de generarse, en `estudio/proyectos/video_009/_generacion/audio/bloques/`.

| Bloque | Caracteres | Contexto previo | Contexto siguiente |
|---:|---:|---|---|
| 1 | 1.903 | — | — (pausa 1 después) |
| 2 | 344 | — (pausa 1 antes) | — (pausa 2 después) |
| 3 | 1.816 | — (pausa 2 antes) | sí |
| 4 | 1.930 | sí | sí |
| 5 | 1.685 | sí | sí |
| 6 | 1.632 | sí | sí |
| 7 | 1.933 | sí | sí |
| 8 | 839 | sí | — (pausa 4 después) |
| 9 | 1.950 | — (pausa 4 antes) | sí |
| 10 | 1.852 | sí | — (pausa 5 después) |
| 11 | 1.984 | — (pausa 5 antes) | sí |
| 12 | 1.498 | sí | sí |
| 13 | 674 | sí | — (pausa 6 después) |
| 14 | 1.326 | — (pausa 6 antes) | — (pausa 7 después) |
| 15 | 1.423 | — (pausa 7 antes) | — (fin) |

### Costo real

| | |
|---|---:|
| Caracteres enviados | 22.789 |
| Presupuesto autorizado (tarifa oficial, 1/carácter) | 22.789 créditos |
| **Consumo real (contador de suscripción, antes/después del lote completo)** | **9.400 créditos** |
| Tarifa real observada | 0,4125 créditos/carácter |

Igual que en el Video 8, el consumo real de `eleven_v4` quedó muy por debajo de la tarifa oficial — esta vez incluso algo más alto que el dato suelto de la muestra (0,298/carácter), pero consistente con el rango ya visto (bloque 19 del Video 8: 0,44/carácter; lote de 15 bloques del Video 8: 9.749 créditos reales). Sigue sin ser una tarifa garantizada para el futuro.

---

## 2. Ensamblado — narración completa con las 8 pausas

**Secuencia:** los 15 bloques en orden, con silencio insertado en las 6 junturas que llevan pausa real entre dos bloques distintos. Las pausas 3 y 8 no son junturas entre bloques — quedaron **dentro** del bloque 6 y del bloque 15 respectivamente (el propio texto enviado llevaba una línea en blanco ahí, y el modelo generó el silencio él mismo).

| Pausa | Entre bloques | Objetivo | Silencio natural ya presente en los bordes | Silencio añadido |
|---|---|---:|---:|---:|
| 1 | 1 → 2 | 3,0s | 0,084s | 2,916s |
| 2 | 2 → 3 | 6,0s | 0,000s | 6,000s |
| 4 | 8 → 9 | 10,0s | 0,000s | 10,000s |
| 5 | 10 → 11 | 10,0s | 0,000s | 10,000s |
| 6 | 13 → 14 | 10,0s | 0,074s | 9,926s |
| 7 | 14 → 15 | 11,0s | 0,000s | 11,000s |

**Método de medición:** `silencedetect` (umbral -40dB) sobre cada bloque individual, cruzado contra la alineación por carácter de cada uno (el último carácter no-espacio de cada bloque termina prácticamente en el final real del archivo, y el primero empieza en 0 — ningún bloque quedó con una palabra cortada en sus bordes). El silencio natural resultó casi nulo en todas las junturas con pausa, así que casi toda la duración de cada pausa es silencio añadido — comportamiento esperado de `eleven_v4` con contexto deshabilitado justo en esos bordes (a propósito, como se explicó arriba).

**Duraciones propuestas, no definitivas.** El propio guion dejó la duración de las 8 pausas pendiente de "el plan de audio, considerando el silencio natural ya presente" — se usaron los rangos ya vigentes en `canal.json` → `reglas_edicion` (`pausa_parrafo` 2,0–4,0s para la pausa 1, "después de una frase completa"; `interludio_versiculo` 5,0–7,0s para la pausa 2, justo después de la cita bíblica; `interludio_bloque` 8,0–12,0s para las pausas 4, 5 y 6, que cierran secciones completas de oración; el extremo alto de ese mismo rango, 11s, para la pausa 7, que marca la entrada al tramo final de menor densidad verbal). Quedan abiertas a ajuste, igual que las del Video 8 se afinaron en varias rondas.

### Revisión de las uniones reales

**Bloque 1 → bloque 2 (la pedida expresamente):** bloque 1 termina en *"…corazón dispuesto a recibir tu cuidado, aun cuando todavía me cueste detenerme."* (frase completa, con punto); bloque 2 empieza en *"En el evangelio según Mateo, capítulo once, versículos veintiocho al treinta, Jesús…"* (frase completa desde el inicio). Ninguna palabra cortada en ningún lado. El silencio detectado en la narración ensamblada en ese punto mide 3,18s (objetivo 3,0s) — consistente con el añadido calculado.

**Resto de junturas con pausa (2, 4, 5, 6, 7):** mismo chequeo — todas terminan y empiezan en una frase completa, sin palabras cortadas, y el `silencedetect` sobre el archivo ensamblado encontró exactamente 6 silencios mayores a 2s, en las posiciones y duraciones esperadas (3,18s / 6,22s / 10,23s / 10,92s / 10,39s / 11,24s) — nada anómalo fuera de esas 6 posiciones.

**Junturas de continuación directa (sin pausa):** no llevan silencio insertado; se decodificó cada bloque a PCM antes de concatenar (sin pasar por una re-codificación mp3-a-mp3 intermedia en cada unión) para no acumular artefactos.

---

## 3. Resultado

| | |
|---|---|
| Archivo | `estudio/proyectos/video_009/_generacion/montaje/video_009_narracion_completa_sin_musica_v1.mp3` |
| Duración | **1.654,909s (27:34,91)** |
| Tamaño | 39.718.496 bytes (~38 MB) |
| SHA-256 | `c4f523363dfa0c8d29248b727309ce2d866b31aff419e855ff642dbe7a55b778` |
| Decodificación | completa, sin errores |

**Nota sobre la duración:** queda por debajo del rango de 31–36 minutos que sugería el guion por escrito (3.753 palabras ÷ 136,1 palabras/minuto reales). El ritmo real de esta voz con `eleven_v4`/`speed 1` resultó prácticamente igual al del Video 8 (~137 ppm) — confirma el riesgo que ya se había señalado antes de generar nada: la estimación de 110–125 ppm del guion fue una hipótesis de escritura, no una medición de esta voz.

**No es la narración final.** Las 8 pausas son una primera propuesta razonada, no aprobada palabra por palabra como las del Video 8 todavía. `canal.json` sigue sin modificarse. El Video 7 y el Video 8 permanecen intactos.
