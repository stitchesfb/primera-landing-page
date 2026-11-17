# Video 10 — Plan de bloques TTS, voz y muestra (para revisión de Orlando)

**Estado:** plan para revisión. **No se ha generado ningún audio ni gastado ningún crédito de ElevenLabs en esta tarea.**
**Fecha:** 2026-11-15
**Guion fuente:** `VIDEO_010_GUION_COMPLETO_REV01.md` (paquete editorial aprobado por Orlando; su aprobación reemplaza el estado "pendiente de revisión" del encabezado del propio guion).
**Se respeta:** `estudio/docs/SISTEMA_ACTIVO_ORACIONES_BIBLICAS_DIARIAS.md` (§4 Producción) y `estudio/docs/VIDEO_TEMPLATE_ORACIONES_BIBLICAS_DIARIAS.md`.
**Prioridad para este proyecto (indicada por Orlando):** ante cualquier conflicto entre lo realmente usado en el Video 9 y una decisión cerrada, se presenta la diferencia para que decida — ver sección 1.

**Actualización (2026-11-16):** la sección 1 de abajo quedó resuelta. El 2026-11-14 Orlando actualizó `canal.json` directamente para establecer `eleven_v4` (El Faraón, `stability 0.5`/`similarity_boost 0.75`/`speed 1`) como configuración **predeterminada del canal**, reemplazando `eleven_flash_v2_5`. Esto ocurrió ~11 minutos después de generarse la muestra de este video (sección 3), así que la muestra y la regeneración del bloque 1 (sección 3) quedaron, en los hechos, alineadas con el nuevo baseline del canal — ya no son una excepción. La sección 1 se conserva sin reescribir porque documenta con exactitud el análisis y la contradicción tal como se presentaron antes de esa decisión.

---

## 1. Configuración de voz — verificación contra el Video 9

### Lo que dicen los documentos vigentes (`canal.json` y `DECISIONES_CERRADAS_ORACIONES_BIBLICAS_DIARIAS_v1.2_ARCHIVO.md`)

Coinciden exactamente entre sí:

| Campo | Valor | Fuente |
|---|---|---|
| Modelo | `eleven_flash_v2_5` | `canal.json` → `voz.modelo` |
| Voz / Voice ID | "El Faraón - Full, Clear, Mellow" / `8mBRP99B2Ng2QwsJMFQl` | `canal.json` → `voz` ; `DECISIONES_CERRADAS` §4 |
| `stability` | 0.65 | `canal.json` → `voz.ajustes` |
| `similarity_boost` | 0.88 | ídem |
| `style` | 0.0 | ídem |
| `use_speaker_boost` | true | ídem |
| `speed` | 0.91 | ídem |
| Formato de salida | `mp3_44100_128` | `canal.json` → `api.formato_salida` |

Esta es la configuración que, según la instrucción de Orlando para este proyecto, tiene prioridad por defecto.

### Lo que realmente se generó y quedó aprobado en el Video 9

Evidencia: `estudio/proyectos/video_009/_generacion/audio/bloques/resultado_generacion.json` (consumo real medido) y los 15 archivos `N.payload_enviado.json` del mismo directorio (verificados puntualmente los bloques 1, 8 y 15 — idénticos entre sí y al resumen).

| Campo | Valor real usado en los 15 bloques |
|---|---|
| Modelo | `eleven_v4` |
| Voice ID | `8mBRP99B2Ng2QwsJMFQl` (misma voz) |
| `stability` | 0.5 |
| `similarity_boost` | 0.75 |
| `speed` | 1.0 |
| `style` / `use_speaker_boost` | no aplican en v4 |
| Formato de salida | `mp3_44100_128` (igual que lo vigente) |

**A diferencia del Video 8** (que mezcló dos configuraciones dentro de la misma narración final sin planearlo), **el Video 9 usó esta configuración de forma uniforme en los 15 bloques** — confirmado en `resultado_generacion.json` y en los tres payloads verificados. No hay ambigüedad sobre qué llegó al audio final aprobado.

### La contradicción, señalada como pide el guion de este video

**Esto contradice una decisión cerrada.** El Video 9 quedó aprobado con `eleven_v4` (stability 0.5 / similarity 0.75 / speed 1.0), mientras que `canal.json` y `DECISIONES_CERRADAS` siguen describiendo `eleven_flash_v2_5` (stability 0.65 / similarity 0.88 / speed 0.91) como la voz del canal. Esa decisión de v4 se registró explícitamente como **de alcance Video 9** (`estado.json` → `configuracion_de_voz.decision_video_009`: *"no se actualiza canal.json, que sigue describiendo eleven_flash_v2_5 como baseline del canal; esta es una decisión de alcance Video 9"*) — es decir, nunca se propuso como cambio permanente, y el propio Video 9 ya la trató como una excepción, no como una actualización de `DECISIONES_CERRADAS`.

Dado que Orlando dio prioridad a Decisiones Cerradas para este proyecto, **mi recomendación por defecto para el Video 10 es `eleven_flash_v2_5` con los ajustes de `canal.json`**, uniforme en los 11 bloques. Razones: es la configuración documentada y vigente, no requiere ninguna actualización para justificarse, y cuesta 3,5–4 veces menos por carácter (ver tarifas en la sección 3).

**La alternativa real** — si Orlando prefiere continuidad de tono con el Video 9, el más reciente — es repetir `eleven_v4` (stability 0.5 / similarity_boost 0.75 / speed 1.0), exactamente como quedó aprobado allí. No lo asumo por mi cuenta: la muestra de la sección 3 está pensada para poder escucharse con cualquiera de las dos configuraciones si Orlando lo pide.

### Dato que queda sin verificar

La tarifa real observada de `eleven_v4` en el Video 9 (0,4125 créditos/carácter) es un solo dato histórico de ese video, con un texto distinto; no hay garantía de que se repita igual en el Video 10. El presupuesto de abajo usa la tarifa oficial publicada (1 crédito/carácter) para `eleven_v4`, y la tarifa medida y confiable (0,276 créditos/carácter) para `eleven_flash_v2_5`, con el dato de 0,4125 como referencia aparte, sin peso en el presupuesto formal.

---

## 2. División en bloques y pausas

**Método:** se extrajo el texto narrado entre `[INICIO NARRACIÓN]` y `[FIN NARRACIÓN]` (la primera aparición de ambas marcas en el guion está dentro de las notas de producción, entre comillas simples — se usó la segunda aparición de cada una, que delimita la narración real). Se quitaron los encabezados `## N.` y las marcas entre corchetes (pausas, Shorts), tal como indica el propio guion. Resultado: **62 párrafos narrados, 15.424 caracteres sin separadores de párrafo** (15.526 contando los separadores internos de cada bloque, igual criterio de conteo que el Video 9).

Se agruparon en **11 bloques continuos**, con las mismas reglas del Video 9 (Sistema Activo §4): ningún bloque supera los 2.000 caracteres (`canal.json` → `api.max_caracteres_por_peticion`), ningún bloque divide una frase ni un párrafo; el **Salmo 121 completo** (cántico gradual + los 8 versículos) queda aislado **entero en un solo bloque**, igual criterio que la cita de Mateo 11 en el Video 9 — para poder regenerarlo solo si hiciera falta sin tocar nada alrededor; los **tres Shorts** quedan enteros dentro de un único bloque cada uno.

| Bloque | Párrafos | Caracteres | Sección(es) | Short | Pausa que lo precede | Pausa(s) embebida(s) dentro |
|---|---:|---:|---|---|---|---|
| 1 | 1 | 337 | 1 | — | apertura | — |
| 2 | 10 | 541 | 1 | — | P1 | — |
| 3 | 4 | 1.215 | 1–2 | **Short 1** | P2 | — |
| 4 | 6 | 1.971 | 2 | — | P3 | — |
| 5 | 4 | 1.305 | 2 | — | — (sigue del 4) | — |
| 6 | 5 | 1.744 | 3 | **Short 2** | P4 | P5 |
| 7 | 6 | 1.896 | 3 | — | — (sigue del 6) | — |
| 8 | 6 | 1.824 | 4 | **Short 3** | P6 | P7 |
| 9 | 5 | 1.505 | 4 | — | — (sigue del 8) | — |
| 10 | 7 | 1.896 | 5 | — | P8 | — |
| 11 | 8 | 1.321 | 5 (cierre) | — | — (sigue del 10) | — |

**Total: 11 bloques, 62 párrafos, 15.555 caracteres** (15.526 originales + 29 por la revisión del bloque 1 del 2026-11-16, ver más abajo). Máximo por bloque: 1.971 (bloque 4). El bloque 2 (541 caracteres) es el Salmo 121 completo, aislado por el mismo motivo que la cita bíblica del Video 9.

### Revisión del bloque 1 (2026-11-16)

Orlando aprobó la muestra de apertura y pidió sustituir las dos últimas frases del bloque 1 por un texto nuevo. Texto anterior → texto vigente:

| | Texto | Caracteres |
|---|---|---:|
| Antes | "…piensa un momento en ella. Vamos a ponerla delante de Dios. Escucha lo que dice el salmo: «Ni se dormirá el que te guarda»." | 308 |
| **Vigente** | "…piensa un momento en ella. «Vamos a confiarle esa preocupación a Dios. El salmo nos recuerda por qué podemos hacerlo: “Ni se dormirá el que te guarda”»." | **337** |

Actualizado en `VIDEO_010_GUION_COMPLETO_REV01.md` (con nota de historial) y en `plan_bloques_tts.json`. El bloque 1 ya se regeneró con este texto (ver sección 3) — no requiere generarse de nuevo al autorizar el lote.

Los tres Shorts:

| Short | Bloque que lo contiene | Rótulo (guion) |
|---|---|---|
| 1 | Bloque 3 | ¿Y SI ALGO SALE MAL? |
| 2 | Bloque 6 | ¿TE PREOCUPA ALGUIEN? |
| 3 | Bloque 8 | ¿DESPERTASTE DE MADRUGADA? |

Archivo de datos: `estudio/proyectos/video_010/_generacion/plan_bloques_tts.json` (rangos de párrafo exactos, primeras/últimas palabras de cada bloque, para verificación).

### Las nueve pausas

| Pausa | Objetivo del guion | Posición | Tipo |
|---|---|---|---|
| 1 | 3 s | entre bloque 1 y bloque 2 | frontera real entre bloques |
| 2 | 6 s | entre bloque 2 y bloque 3 | frontera real entre bloques |
| 3 | 4 s | entre bloque 3 y bloque 4 | frontera real entre bloques |
| 4 | 9 s | entre bloque 5 y bloque 6 | frontera real entre bloques |
| 5 | 4 s | dentro del bloque 6 (tras el Short 2) | embebida |
| 6 | 9 s | entre bloque 7 y bloque 8 | frontera real entre bloques |
| 7 | 4 s | dentro del bloque 8 (tras el Short 3) | embebida |
| 8 | 10 s | entre bloque 9 y bloque 10 | frontera real entre bloques |
| 9 | 10 s, música con fundido suave | después del último párrafo (cierre, "Amén") | fuera de cualquier bloque — es la cola de cierre del video, no una costura entre bloques de voz |

**Corrección (2026-11-15):** el recuento correcto es **seis pausas en frontera real entre bloques (1, 2, 3, 4, 6, 8), dos internas dentro de un bloque (5 y 7) y una de cierre musical (9)** — la versión anterior de este documento decía por error "siete" en este párrafo; la tabla de arriba ya estaba correcta. Las pausas 5 y 7 caen *dentro* de un bloque (6 y 8, justo después del Short 2 y del Short 3) porque el párrafo inmediatamente anterior era el propio Short y no convenía partir justo ahí. La pausa 9 no es una costura de bloques: es el cierre musical del video completo (música sola con fundido), y se construye en el montaje final, no en la generación de voz.

### Cómo se evitará duplicar el silencio en las seis uniones entre bloques

Igual método que el Video 9: ElevenLabs no garantiza silencio digital puro en los bordes de cada bloque — puede dejar algo de "aire natural" (respiración, decaimiento de la voz) antes de llegar al silencio real. Antes de insertar la pausa objetivo de cada frontera, se medirá con `silencedetect` el silencio real que ya existe al final del bloque anterior y al inicio del siguiente, y solo se añadirá la diferencia necesaria para alcanzar el objetivo del guion — nunca el objetivo completo "a ciegas" sobre un borde que ya trae su propio aire. Esto es lo que evita contar dos veces el mismo silencio. Las seis fronteras con pausa real (1, 2, 3, 4, 6, 8) se verificarán así una por una.

### Cómo se medirán y completarán las dos pausas internas de 4 segundos (tras el Short 2 y el Short 3)

Las pausas 5 y 7 no son una costura entre dos archivos de audio — están dentro del mismo bloque (6 y 8), en el punto exacto donde termina el "Amén." del Short correspondiente y empieza la frase siguiente. El modelo de voz no garantiza ninguna duración concreta en ese punto (solo la pausa natural de una puntuación fuerte, normalmente bastante menor a 4 s, como ya se vio en Mateo 11 en el Video 9). El método, aplicado en el montaje, una vez generados los bloques 6 y 8, será:

1. Ubicar por alineación de ElevenLabs el carácter exacto donde termina "Amén." y el carácter donde empieza la primera palabra de la frase siguiente, dentro del propio archivo del bloque.
2. Medir con `silencedetect` (resolución fina, en banda específica si hace falta distinguir voz real de aire/ruido de fondo, mismo criterio ya usado para los Shorts del Video 9) la duración real de silencio que el modelo dejó entre esos dos puntos.
3. Si ese silencio real es menor a 4,0 s (lo esperado), **insertar silencio puro adicional** hasta completar exactamente 4,0 s, cortando el archivo del bloque en el punto donde termina el audio real de "Amén." e insertando ahí el remanente antes de continuar con el resto del bloque — no se vuelve a generar audio nuevo para esto. Si por alguna razón el silencio real ya fuera de 4,0 s o más, se recorta al objetivo en vez de añadir nada.
4. Se verifica después, sobre el bloque ya editado, que la pausa quede en 4,0 s y que no se haya cortado ninguna sílaba del "Amén." ni de la palabra siguiente — mismo tipo de verificación ya aplicada a los cortes de los Shorts del Video 9.

Esto es más estricto que el criterio usado en el Video 9 para sus pausas embebidas (3 y 8), donde se dejó la pausa tal como la generó el modelo sin completarla a un objetivo exacto; aquí sí se completa a los 4,0 s pedidos por el guion.

---

## 3. Plan de muestra y costo (separado del presupuesto del lote completo)

**Objetivo:** escuchar apertura, lectura bíblica completa, cierre calmado y una unión real entre bloques con pausa — mismo requisito que el Video 9.

| Fragmento | Contenido | Caracteres |
|---|---|---:|
| **Muestra 1 — Apertura** | Bloque 1 completo ("Ya apagaste la luz…" hasta "…Ni se dormirá el que te guarda».") | 308 |
| **Muestra 2 — Lectura bíblica completa** | Bloque 2 completo: "Escuchemos ahora el salmo completo" + los 8 versículos del Salmo 121 (RVR1909) | 541 |
| **Muestra 3 — Cierre** | Últimos 5 párrafos del bloque 11, desde "Cuida a quien amo, Señor…" hasta "…Amén." | 514 |

**Total de la muestra: 1.363 caracteres.**

Las Muestras 1 y 2 son, cada una, un **bloque completo e idéntico** al que se enviaría en el lote — no un fragmento recortado de él. Al ser bloques enteros y consecutivos (bloque 1 → pausa 1 → bloque 2), escucharlos uno después del otro **es** la unión real pedida: se oye la frontera exacta donde cae la pausa 1 (3 s), sin necesidad de generar un cuarto fragmento aparte. La Muestra 3 toma solo el tramo final del bloque 11 (no el bloque completo), para enfocar el juicio en el cierre calmado; usará `previous_text` real (el párrafo inmediatamente anterior dentro del mismo bloque) para que la prosodia de entrada no suene aislada, aunque no empiece exactamente al inicio de su bloque.

**Corrección de conteo (2026-11-15):** la Muestra 3 son 5 párrafos unidos por doble salto de línea (4 separadores × 2 caracteres = 8 caracteres adicionales): **522 caracteres**, no 514. Total real de la muestra: **1.371 caracteres**, no 1.363. La diferencia es solo de conteo, no de contenido — ya generada con el valor correcto (ver resultado real abajo).

### Costo de la muestra (tarifa oficial de cada modelo, igual criterio que el presupuesto del lote)

| Si se prueba con… | Costo de la muestra (1.371 car.) |
|---|---:|
| `eleven_flash_v2_5` (0,276 créditos/carácter) | ≈ 378 créditos |
| `eleven_v4` (1 crédito/carácter, tarifa oficial) | ≈ 1.371 créditos |

### Decisión de voz para esta muestra — excepción de alcance Video 10

Orlando autorizó únicamente la muestra, con **`eleven_v4`, voz El Faraón (`8mBRP99B2Ng2QwsJMFQl`), y los ajustes exactos del Video 9** (`stability 0.5`, `similarity_boost 0.75`, `speed 1`), registrada como **excepción de este video** — en el momento de generarla, `canal.json` todavía describía `eleven_flash_v2_5` como baseline del canal (lo actualizó minutos después, ver actualización arriba), igual criterio que la decisión equivalente del Video 9.

### Resultado real de la generación de la muestra

| Fragmento | Caracteres | Texto alineado idéntico al enviado |
|---|---:|---|
| Muestra 1 — Apertura | 308 | sí |
| Muestra 2 — Lectura bíblica completa | 541 | sí |
| Muestra 3 — Cierre (con `previous_text` real del párrafo anterior) | 522 | sí |

Consumo medido por el contador de suscripción (antes/después, estable): **604 créditos para 1.371 caracteres** (0,4406 créditos/carácter real observado — cercano al 0,4125 ya visto en el Video 9, confirma que no hay garantía de que la tarifa oficial de 1/carácter sea la que realmente se cobre).

### Revisión del bloque 1 — regenerado (2026-11-16)

Tras aprobar la muestra, Orlando pidió el cambio de texto de la sección anterior. Se regeneró **únicamente el bloque 1** (337 caracteres nuevos) con `eleven_v4`, voz El Faraón, los mismos ajustes (`stability 0.5`/`similarity_boost 0.75`/`speed 1`). Para esta fecha (2026-11-16), esta configuración ya era la predeterminada de `canal.json` (actualizada el 2026-11-14) — no una excepción. Texto alineado idéntico al enviado. Consumo medido por el contador de suscripción (antes/después, estable): **148 créditos para 337 caracteres** (0,4392 créditos/carácter, consistente con las demás mediciones de este video). Se unió con la lectura bíblica ya grabada (`muestra2_lectura_biblica.mp3`, sin regenerar): se midió el silencio real ya presente en ambos bordes (≈0,219 s al final del nuevo bloque 1, ≈0,105 s al inicio de la lectura) y se añadió solo la diferencia (2,6755 s) para llegar al objetivo de 3,0 s de la pausa 1 — verificado después con `silencedetect`: **2,97 s reales** en la unión, dentro de tolerancia. Archivo: `estudio/proyectos/video_010/_generacion/muestra/video_010_muestra_apertura_rev02_mas_salmo121.mp3` (67,42 s).

### Presupuesto del lote completo (11 bloques, 15.555 caracteres — incluye la revisión del bloque 1)

| Si se genera con… | Caracteres | Tarifa usada | Créditos estimados |
|---|---:|---|---:|
| `eleven_flash_v2_5` (ya no es la opción predeterminada, ver actualización arriba) | 15.555 | 0,276/carácter (medida, confiable) | ≈ 4.293 |
| `eleven_v4` | 15.555 | 1/carácter (tarifa oficial publicada) | **≈ 15.555** |
| *Referencia sin garantía* | 15.526 | 0,4125/carácter (único dato observado en el Video 9, texto distinto) | ≈ 6.404 |

### Costo adicional si se reutilizan los bloques aprobados de la muestra

A diferencia del Video 9 (donde la muestra siempre se consideró aparte y todo el lote se regeneraba completo), aquí las Muestras 1 y 2 son bloques completos: **los audios de los bloques 1 (ya en su texto vigente, regenerado el 2026-11-16) y 2 (878 caracteres en total) no se regenerarán** al autorizar el lote — se reutilizarán directamente, siempre que la llamada use exactamente los mismos parámetros (mismo modelo/ajustes, y sin `previous_text`/`next_text` en sus bordes, porque ambos lados son pausas reales). Eso deja, tras reutilizar:

| Si se genera con… | Caracteres restantes del lote (15.555 − 878) | Costo del lote restante |
|---|---:|---:|
| `eleven_flash_v2_5` | 14.677 | ≈ 4.051 créditos |
| `eleven_v4` | 14.677 | ≈ 14.677 créditos |

Ya gastado hasta ahora, de forma real y medida (no estimada), independientemente de lo anterior: **604 créditos** (muestra original de 1.371 caracteres) + **148 créditos** (regeneración del bloque 1, 337 caracteres) = **752 créditos**. Ambos en `eleven_v4`, la configuración ahora predeterminada del canal. Esto ya se gastó y no se recupera ni se resta del presupuesto del lote; se informa aparte para que Orlando tenga el gasto acumulado real de este video.

La Muestra 3 (cierre) no es un bloque completo, así que no se puede reutilizar igual: sus 514 caracteres se generan una vez para la muestra y, si se aprueba, se vuelven a generar dentro del bloque 11 normal del lote — mismo criterio que el Video 9 para fragmentos parciales.

### Dónde se guardarán los audios y el manifiesto (para reanudar sin regenerar)

- Audios de muestra: `estudio/proyectos/video_010/_generacion/muestra/` (un `.mp3` + `.alignment.json` + `.payload_enviado.json` por fragmento, mismo patrón que `video_009/_generacion/muestra_v4/`).
- Audios del lote: `estudio/proyectos/video_010/_generacion/audio/bloques/{1..11}.mp3` + `.alignment.json` + `.payload_enviado.json`, con `resultado_generacion.json` registrando consumo real y qué bloques se reutilizaron de la muestra (sin volver a cobrarlos).
- Manifiesto de esta decisión: `estudio/proyectos/video_010/estado.json`, con el mismo criterio de registro que `video_009/estado.json`.

Si el trabajo se interrumpe, el siguiente paso puede reanudar leyendo esos archivos — ningún bloque ya generado y verificado se regenerará sin necesidad.

---

## 4. Observación de pronunciación (no bloquea el plan)

El Salmo 121 completo está en Reina-Valera 1909: conjugaciones como "vendrá", "dormirá", "adormecerá" son español estándar, sin riesgo real de pronunciación. El único punto a vigilar en la muestra es el mismo que en el Video 9: el registro litúrgico con comillas « » puede sonar ligeramente distinto en tono al resto de la narración — la Muestra 2 cubre exactamente ese fragmento para poder juzgarlo antes de generar el lote completo. No se modificó ninguna palabra del guion.

---

**Actualización final:** la elección de voz quedó resuelta el 2026-11-14 (`eleven_v4` predeterminado del canal). La muestra se generó y se aprobó (con la revisión del bloque 1 incluida). **Sigue pendiente únicamente la autorización expresa de Orlando para generar el lote completo de 11 bloques.**

---

## 5. Lote completo generado y ensamblado (2026-11-17)

Orlando aprobó la transición de la apertura al Salmo 121 y autorizó generar los 9 bloques restantes (3–11) con `eleven_v4` y la configuración de El Faraón vigente en `canal.json` (ya no una excepción), reutilizando los bloques 1 y 2 ya aprobados.

### Generación

9 llamadas únicas (una por bloque), leyendo modelo/voz/ajustes/formato directamente de `canal.json`. `previous_text`/`next_text` solo en las 4 junturas de continuación directa (4→5, 6→7, 8→9, 10→11); omitidos en las junturas con pausa real. Texto alineado idéntico al enviado en los 9 bloques. Consumo real medido por el contador de suscripción, estable: **6.457 créditos para 14.677 caracteres** (0,43994 créditos/carácter).

### Corrección de las dos pausas internas de 4 s (tras el Short 2 y el Short 3)

| Pausa | Bloque | Silencio que dejó el modelo | Corrección aplicada | Medido en el resultado |
|---|---|---:|---|---:|
| 5 | 6 | 1,24068 s | Cortado en el fin real de la voz, re-empalmado con un clip de silencio puro de 4,000 s | 4,00333 s |
| 7 | 8 | 1,21379 s | Mismo método | 4,00095 s |

Ubicado por alineación el carácter exacto donde termina "Amén." y donde empieza la palabra siguiente dentro de cada archivo; medido con `silencedetect` fino el silencio real; como ambos quedaban muy por debajo del objetivo, se cortó cada archivo en el fin real de la voz y se volvieron a unir sus dos partes con un clip de silencio puro de exactamente 4,000 s entre medio — sin generar audio nuevo.

### Ensamblado de los 11 bloques

Las 6 pausas reales entre bloques se calcularon igual que la pausa 1 (sección 3): se midió el silencio natural ya presente en los bordes de los bloques adyacentes y se añadió solo la diferencia necesaria para llegar al objetivo del guion. Verificado después sobre el archivo completo ya ensamblado:

| Pausa | Entre bloques | Objetivo | Medido |
|---|---|---:|---:|
| 1 | 1–2 | 3 s | 2,97388 s |
| 2 | 2–3 | 6 s | 5,98372 s |
| 3 | 3–4 | 4 s | 3,97476 s |
| 4 | 5–6 | 9 s | 8,97388 s |
| 6 | 7–8 | 9 s | 8,94909 s |
| 8 | 9–10 | 10 s | 9,97764 s |

Las 6 quedaron dentro de ±0,05 s del objetivo. Los bloques 4→5, 6→7, 8→9 y 10→11 se concatenaron sin pausa (continuación directa, tal como indica el guion).

### Verificación de palabras completas en cada unión

Las 11 alineaciones de bloque confirmaron `texto_identico_al_enviado: true` — cada bloque empieza y termina exactamente en el primer/último carácter de su primer/último párrafo, por lo que ninguna palabra puede quedar cortada *dentro* de un bloque. Se revisaron además, una por una, las primeras y últimas palabras de los 11 bloques:

| Bloque | Primeras palabras | Últimas palabras |
|---|---|---|
| 1 | "Ya apagaste la luz," | "el que te guarda"»." |
| 2 | "Escuchemos ahora el salmo" | "ahora y para siempre»." |
| 3 | "Señor, aquí estoy. Tú" | "Ayúdame a descansar. Amén." |
| 4 | "Tal vez ya sabes" | "para decirlo con honestidad." |
| 5 | "A veces el temor" | "mientras llega el día." |
| 6 | "¿Hay alguien que te" | "que su voz importa." |
| 7 | "Cuando mi preocupación me" | "esté en mis manos." |
| 8 | "¿Te despertaste de madrugada" | "silencio después de decirlas." |
| 9 | "Dejo que mis manos" | "o escuchando en silencio." |
| 10 | "Volvamos un momento a" | "todavía me cuesta entender." |
| 11 | "El día de hoy" | "nombre de Jesús. Amén." |

Ninguna cortada a mitad. En las 6 uniones con pausa real no se recortó ningún archivo (solo se insertó silencio), así que el contenido de voz de ambos lados queda intacto por construcción; en las 2 pausas internas (5 y 7) se verificó que "Amén." y la palabra siguiente quedan completos en ambos lados del corte.

### Resultado

**`video_010_narracion_completa_sin_musica_v1.mp3`** — **1.140,297 s (19:00,30)**, decodificación completa sin errores. Pausa 9 (cierre musical con fundido) no incluida — se añadirá en el montaje audiovisual; la narración termina en el "Amén." final del bloque 11. Archivo de datos: `estudio/proyectos/video_010/_generacion/montaje/plan_ensamblado.json`.

### Gasto total acumulado del Video 10

| Concepto | Caracteres | Créditos reales |
|---|---:|---:|
| Muestra (apertura + Salmo + cierre) | 1.371 | 604 |
| Revisión del bloque 1 | 337 | 148 |
| Lote (bloques 3–11) | 14.677 | 6.457 |
| **Total** | **16.385** | **7.209** |

Todo en `eleven_v4`, la configuración ahora predeterminada del canal.

**Me detengo aquí** para que Orlando revise la narración completa antes de pasar al montaje audiovisual.

---

## 6. Corrección de las pausas 5 y 7 — v2 (2026-11-17)

Orlando escuchó v1 y reportó dos cortes: 7:01–7:05 (pausa 5, bloque 6) con "Amén" cortado al final y "Señor" con el ataque cortado; 11:37–11:41 (pausa 7, bloque 8), el mismo defecto.

**Verificación en los originales, antes de gastar nada:** se analizaron con `silencedetect` en banda fina (-40dB y -45dB, duración 0,02–0,03s) los MP3 originales sin editar de los bloques 6 y 8. "Amén." y la palabra siguiente están completos y limpios en **ambos originales**. El defecto no venía de ElevenLabs — lo introdujo el corte de v1, que usaba un umbral (-35dB/0,05s) que llamaba "silencio" a un punto todavía ~0,06s dentro de la cola de decaimiento de "Amén.". **No se gastó ningún crédito adicional**, no hizo falta regenerar nada.

**Método de la corrección:** en vez de cortar en el borde del habla detectado, se cortó en el **centro de la pausa natural** (medida con el umbral más estricto, -45dB/0,02s, dejando ~0,5s de margen real a cada lado) y se insertó ahí únicamente el silencio adicional que faltaba para llegar a 4,0s:

| Pausa | Bloque | Silencio natural real | Punto de corte usado | Silencio adicional insertado | Medido en el resultado final |
|---|---|---:|---:|---:|---:|
| 5 | 6 | 1,13351 s | 28,826 s | 2,86649 s | **4,04048 s** |
| 7 | 8 | 1,12011 s | 28,053 s | 2,87989 s | **4,02844 s** |

**Verificación a velocidad normal sobre el MP3 final v2:** se revisó con `silencedetect` en banda fina (-45dB/0,02s) el tramo inmediatamente antes y después de cada pausa, ya en el archivo ensamblado: en ambos casos la voz anterior decae de forma natural y limpia antes del silencio, y la voz siguiente arranca de forma natural justo después, sin ningún indicio de corte abrupto. Las 6 pausas reales entre bloques y los bloques 1, 2, 3, 4, 5, 7, 9, 10 y 11 no se tocaron — idénticos a v1.

**Resultado:** `video_010_narracion_completa_sin_musica_v2.mp3` — 1.140,506 s (19:00,51), decodificación limpia. Más dos clips breves de verificación (voz antes y después de cada pausa corregida):
- `estudio/proyectos/video_010/_generacion/montaje/clips_verificacion/video_010_correccion_pausa5_bloque6.mp3`
- `estudio/proyectos/video_010/_generacion/montaje/clips_verificacion/video_010_correccion_pausa7_bloque8.mp3`

`video_010_narracion_completa_sin_musica_v1.mp3` se conserva como histórico (contenía el defecto) — no usar para el montaje.

**Me detengo aquí.** El montaje audiovisual queda pendiente de la revisión de Orlando de esta v2.
