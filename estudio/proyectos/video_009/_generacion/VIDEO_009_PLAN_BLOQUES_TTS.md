# Video 9 — Plan de bloques TTS, voz y muestra (para revisión de Orlando)

**Estado:** plan para revisión. **No se ha generado ningún audio ni gastado ningún crédito de ElevenLabs en esta tarea.**
**Fecha:** 2026-11-06
**Guion fuente:** `VIDEO_009_GUION_COMPLETO_REV01.md` (revisión 01, paquete editorial ya aprobado por Orlando; el guion en sí mismo sigue pendiente de su propia revisión, según su propio encabezado).
**Se respeta:** `estudio/docs/SISTEMA_ACTIVO_ORACIONES_BIBLICAS_DIARIAS.md` (sección 4: Producción) y `estudio/docs/VIDEO_TEMPLATE_ORACIONES_BIBLICAS_DIARIAS.md`.

---

## 0. Problema de pronunciación/continuidad — señalado antes de tocar el texto

No se modificó ninguna palabra del guion. Dos observaciones para tener presentes al escuchar la muestra, ninguna bloquea el plan:

1. **Cita bíblica (Mateo 11:28–30, RVR1909):** usa conjugaciones de "vosotros" (*estáis, llevad, aprended, hallaréis*) y las comillas tipográficas « ». Son palabras españolas estándar — no debería haber un problema real de pronunciación — pero es el fragmento con mayor riesgo de sonar distinto al resto por su registro litúrgico, igual que la cita del Salmo 23 en el Video 8. La muestra 2 (abajo) cubre exactamente este fragmento para poder juzgarlo antes de generar todo.
2. **Continuidad de modelo entre bloques:** el Video 8 terminó usando **dos configuraciones distintas de voz dentro del mismo video** (ver sección 2) sin que fuera una decisión planeada desde el inicio — fue Orlando quien notó el cambio de tono alrededor del minuto 4 y se investigó después. Para el Video 9 recomiendo fijar **una sola configuración para los 15 bloques** antes de generar nada, precisamente para no repetir esa discontinuidad. Es el motivo central de la sección 2.

No hay ninguna palabra, cifra o abreviatura en el texto que requiera normalización: no hay números, no hay guiones largos, no hay caracteres fuera de lo esperado en español (verificado programáticamente sobre el texto completo).

---

## 1. División en bloques TTS

**Método:** se extrajo el texto narrado entre `[INICIO NARRACIÓN]` y `[FIN NARRACIÓN]`, quitando los encabezados `## N.` y todas las marcas entre corchetes (pausas, Shorts), tal como indica el propio guion. Resultado: **79 párrafos**, **22.789 caracteres** (contando los separadores de párrafo dentro de cada bloque; el guion estimaba "aproximadamente 22.857", la diferencia es del orden del redondeo propio de una estimación aproximada).

Se agruparon en **15 bloques continuos**, siguiendo las reglas del Sistema Activo §4: ningún bloque supera los 2.000 caracteres (límite de `canal.json` → `api.max_caracteres_por_peticion`), ningún bloque divide una frase, una oración completa, la cita bíblica ni un Short; los tres Shorts quedan **enteros dentro de un único bloque** cada uno; la apertura es un bloque continuo (no frases sueltas); el tramo final de menor densidad verbal (sección 7, después de la pausa 7) se mantiene como un solo bloque para no introducir una costura justo en la parte más calmada y difícil de reparar del video.

| Bloque | Párrafos | Caracteres | Sección(es) | Short | Pausa que lo precede | Pausa(s) embebida(s) dentro |
|---|---:|---:|---|---|---|---|
| 1 | 6 | 1.903 | 1 | — | apertura | — |
| 2 | 2 | 344 | 2 | — | P1 | — |
| 3 | 6 | 1.816 | 2 | — | P2 | — |
| 4 | 6 | 1.930 | 2–3 | **Short 1** | — (sigue del 3) | — |
| 5 | 5 | 1.685 | 3 | — | — (sigue del 4) | — |
| 6 | 5 | 1.632 | 3–4 | **Short 2** | — (sigue del 5) | **P3** |
| 7 | 6 | 1.933 | 4 | — | — (sigue del 6) | — |
| 8 | 3 | 839 | 4 | — | — (sigue del 7) | P4 (al final) |
| 9 | 6 | 1.950 | 5 | — | P4 | — |
| 10 | 6 | 1.852 | 5 | — | — (sigue del 9) | P5 (al final) |
| 11 | 6 | 1.984 | 6 | **Short 3** | P5 | — |
| 12 | 5 | 1.498 | 6 | — | — (sigue del 11) | — |
| 13 | 2 | 674 | 6 | — | — (sigue del 12) | P6 (al final) |
| 14 | 5 | 1.326 | 7 | — | P6 | P7 (al final) |
| 15 | 10 | 1.423 | 7 (cierre) | — | P7 | **P8** |

**Total: 15 bloques, 79 párrafos, 22.789 caracteres.** Máximo por bloque: 1.984 (bloque 11). Mínimo: 344 (bloque 2, la cita bíblica — deliberadamente aislada sola, igual criterio que el Video 8 con el Salmo 23, para poder regenerarla sola si hiciera falta sin tocar nada alrededor).

Las pausas 1, 2, 4, 5, 6 y 7 caen exactamente en una frontera entre dos bloques (no requieren nada especial). Las pausas **3** y **8** caen *dentro* de un bloque (bloques 6 y 15) porque el párrafo inmediatamente anterior era demasiado corto para quedar solo y no convenía partir ahí — igual que ocurrió con varias pausas del Video 8 (bloques 2, 18 y 19), se generan como una doble línea en blanco dentro del mismo texto enviado a ElevenLabs, y el silencio real se mide y ajusta en el montaje, no se asume de la puntuación.

Los tres Shorts quedan así:

| Short | Bloque que lo contiene | Caracteres del Short dentro del bloque |
|---|---|---:|
| 1 | Bloque 4 | 443 |
| 2 | Bloque 6 | 496 |
| 3 | Bloque 11 | 469 |

Archivo de datos: `estudio/proyectos/video_009/_generacion/plan_bloques_tts.json` (rangos de párrafo exactos, texto de las primeras/últimas palabras de cada bloque, para verificación).

---

## 2. Configuración de voz — comparación y recomendación

### Lo que dicen los documentos vigentes

`estudio/canal.json` y el archivo histórico `DECISIONES_CERRADAS_ORACIONES_BIBLICAS_DIARIAS_v1.2_ARCHIVO.md` **coinciden exactamente** entre sí — no hay contradicción ahí:

| Campo | Valor |
|---|---|
| Modelo | `eleven_flash_v2_5` |
| Voice ID | `8mBRP99B2Ng2QwsJMFQl` ("El Faraón - Full, Clear, Mellow") |
| `stability` | 0.65 |
| `similarity_boost` | 0.88 |
| `style` | 0.0 |
| `use_speaker_boost` | true |
| `speed` | 0.91 |
| Formato | `mp3_44100_128` |

### Lo que realmente se generó y quedó aprobado en el Video 8

El Video 8 terminó usando **dos configuraciones distintas** en los mismos 19 bloques de su narración final:

| Bloques | Modelo real usado | `stability` | `similarity_boost` | `speed` | `style` / `speaker_boost` |
|---|---|---:|---:|---:|---|
| 1, 2, 18 (3 de 19) | `eleven_flash_v2_5` | 0.65 | 0.88 | 0.91 | 0 / true — **igual que canal.json** |
| 3–17, 19 (16 de 19) | `eleven_v4` | 0.5 | 0.75 | 1.0 | no usados (el modelo v4 no admite esos campos) |

Esto **no fue un accidente silencioso**: Orlando autorizó en su momento generar los bloques 3–17 con esa configuración de v4, y más adelante, al notar que el tono cambiaba a partir del minuto 4, se investigó y se confirmó que el cambio venía exactamente de ahí (bloque 3 = primer bloque en v4). La investigación quedó documentada, pero **nunca se revirtió** ni se actualizó `canal.json` para reflejarlo — por eso hoy el archivo vigente sigue describiendo Flash v2.5, mientras que el 84% del contenido real del Video 8 ya publicado (bloques 3–19) suena con v4. Esa es la contradicción concreta que señala el guion del Video 9.

(Nota aparte: durante la producción del Video 8 también se probaron configuraciones de v4 para el párrafo de la CTA del bloque 4 — `clone_strength`, `language_code`, `stability 0.65/similarity 0.88/speed 0.91` — pero ese párrafo completo se eliminó después de la narración final aprobada. Esas pruebas no forman parte de lo que el público realmente escuchó y no las cuento aquí como "lo aprobado".)

### Costo publicado de cada modelo

| Modelo | Tarifa | Fuente |
|---|---|---|
| `eleven_flash_v2_5` | **0,276 créditos/carácter** | Medida contra la API (`canal.json` → `constantes`, confirmada por dos vías independientes) |
| `eleven_v4` | **1 crédito/carácter** | Tarifa oficial publicada (`GET /v1/models`), la que se usó para presupuestar el Video 8 |

Un solo dato histórico del Video 8 (bloque 19) sugirió un consumo real más bajo para v4 (≈0,44 créditos/carácter) y el cargo total verificado de los 15 bloques en v4 fue de 9.749 créditos sobre un presupuesto de 27.160 — es decir, en la práctica salió más barato que la tarifa oficial, pero **sin garantía**; el Sistema Activo pide presupuestar siempre con la tarifa publicada.

### Mi recomendación para el Video 9

**Usar `eleven_flash_v2_5` con los ajustes de `canal.json` (los mismos de siempre) para los 15 bloques, de forma uniforme.** Razones:

1. Es el único de los dos que sigue siendo el baseline *documentado y vigente* — el que requeriría cero cambios y ninguna actualización de `canal.json` para justificarse.
2. Cuesta entre 3,5 y 4 veces menos por carácter (presupuesto oficial), con el mismo voice ID y la misma voz aprobada.
3. Es exactamente lo que se usó en los bloques 1, 2 y 18 del Video 8 — los únicos que Orlando nunca reportó como "distintos".
4. Usar una sola configuración en los 15 bloques evita repetir la discontinuidad de tono que apareció sin planearse en el Video 8.

**La alternativa real** es adoptar formalmente `eleven_v4` (stability 0.5 / similarity_boost 0.75 / speed 1.0) como el nuevo baseline, porque es el sonido que de hecho llevan la mayoría de los minutos ya publicados del Video 8 y los oyentes habituales ya lo escucharon. Si Orlando prefiere esa continuidad sobre el ahorro de costo, lo correcto es decidirlo ahora, de forma explícita, y actualizar `canal.json` en consecuencia — no dejarlo otra vez como una deriva sin documentar.

**No decido esto por mi cuenta.** Sistema Activo §4 pide confirmar voz/modelo con una muestra antes de cada producción importante — por eso la muestra de la sección 3 está pensada para poder escuchar cualquiera de las dos opciones (o ambas) antes de comprometer el presupuesto completo.

---

## 3. Muestra propuesta — fragmentos y costo

**Objetivo:** escuchar apertura, lectura/aplicación bíblica, cierre calmado y al menos una unión real entre bloques, con el menor gasto posible — igual exigencia que el punto de aprobación 5 del Sistema Activo.

| Fragmento | Contenido | Párrafos | Caracteres |
|---|---|---|---:|
| **Muestra 1 — Apertura** | Los dos primeros párrafos del bloque 1 ("Tal vez todos en casa ya descansan…" / "Quizá hoy hiciste muchas cosas…") | idx 0–1 | 693 |
| **Muestra 2 — Lectura bíblica + unión real bloque 1→2** | Último párrafo del bloque 1 + los dos párrafos del bloque 2 (introducción + cita de Mateo 11:28–30 completa) | idx 5–7 | 637 |
| **Muestra 3 — Cierre calmado** | Los cinco párrafos finales del bloque 15, después de la pausa 8, hasta el "Amén" | idx 74–78 | 633 |

**Total de la muestra: 1.963 caracteres.** Esto es aparte y no se resta del presupuesto de la narración completa (los mismos párrafos se volverán a generar dentro de sus bloques normales si la muestra se aprueba).

### Costo de la muestra (tarifa usada: la **tarifa publicada** de cada modelo, igual criterio que el presupuesto completo)

| Si se prueba con… | Costo de la muestra |
|---|---:|
| `eleven_flash_v2_5` (0,276 créditos/carácter) | **≈ 542 créditos** |
| `eleven_v4` (1 crédito/carácter) | **≈ 1.963 créditos** |

---

## 4. Presupuesto de la narración completa (separado de la muestra)

| Si se genera con… | Caracteres | Tarifa usada | Créditos estimados |
|---|---:|---|---:|
| `eleven_flash_v2_5` (recomendado) | 22.789 | 0,276/carácter (medida, confiable) | **≈ 6.290** |
| `eleven_v4` (alternativa de continuidad) | 22.789 | 1/carácter (oficial publicada, la que se presupuesta) | **≈ 22.789** |

*Referencia sin garantía, no parte del presupuesto formal:* si el consumo real de v4 se pareciera al observado en el Video 8 (~0,42–0,44/carácter), el gasto real rondaría los 9.500–10.000 créditos en vez de 22.789 — pero el presupuesto que correspondería aprobar, siguiendo la misma regla que se usó en el Video 8, es el calculado con la tarifa oficial.

**Riesgo de duración:** el propio guion advierte que su estimación de 110–125 palabras/minuto es una hipótesis de escritura, no una medición de esta voz — y en el Video 8 el ritmo real resultó ~137 palabras/min, más rápido que lo estimado entonces. Es razonable esperar que la duración final de este guion (3.753 palabras) quede en el extremo corto del rango que el propio guion sugiere (31–36 min) o incluso un poco por debajo, hasta confirmarlo con la muestra y la generación real.

---

## 5. Qué falta — puntos de aprobación pendientes (Sistema Activo §4)

1. **Aprobar o corregir la división en 15 bloques** (sección 1).
2. ~~Decidir la configuración de voz~~ — **confirmada por Orlando el 2026-11-06: `eleven_v4`**, voice_id `8mBRP99B2Ng2QwsJMFQl`, `stability 0.5`, `similarity_boost 0.75`, `speed 1` (los mismos ajustes de la narración v4 realmente aprobada del Video 8). No se actualiza `canal.json` — es una decisión de alcance Video 9.
3. ~~Autorizar y generar la muestra~~ — **generada el 2026-11-06.** Ver sección 6.
4. Tras revisar la muestra: **autorizar el gasto completo** de la narración (sección 4).

---

## 6. Muestra generada — resultado real (2026-11-06)

Se generaron los 3 fragmentos de la sección 3 con la configuración confirmada (`eleven_v4`, stability 0.5, similarity_boost 0.75, speed 1), reconstruidos programáticamente desde el guion ya segmentado para garantizar coincidencia exacta de caracteres con el plan, e incluyendo `previous_text`/`next_text` de los párrafos vecinos reales (no narrados, solo para que la prosodia no suene cortada en los bordes).

| Fragmento | Caracteres | Duración real | Texto alineado idéntico al enviado |
|---|---:|---:|---|
| Apertura | 693 | 46,21s | sí |
| Lectura bíblica + unión real bloque 1→2 | 637 | 45,71s | sí |
| Cierre (tras pausa 8) | 633 | 49,79s | sí |

**Costo real:** 585 créditos para 1.963 caracteres (0,298 créditos/carácter), medido por el contador de suscripción antes/después — por debajo de la tarifa oficial de 1/carácter usada para presupuestar, consistente con lo ya observado en el Video 8 (un solo dato, no garantizado como tarifa futura).

Decodificación limpia en los 3 archivos. Archivos y metadatos (audio, alineación por carácter, payload enviado) en `estudio/proyectos/video_009/_generacion/muestra_v4/`.

**No se ha generado ningún bloque de los 15 definitivos.** El guion no se tocó. El Video 7 y el Video 8 permanecen intactos.
