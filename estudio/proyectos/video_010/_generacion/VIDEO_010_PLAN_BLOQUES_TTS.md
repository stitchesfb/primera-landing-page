# Video 10 — Plan de bloques TTS, voz y muestra (para revisión de Orlando)

**Estado:** plan para revisión. **No se ha generado ningún audio ni gastado ningún crédito de ElevenLabs en esta tarea.**
**Fecha:** 2026-11-15
**Guion fuente:** `VIDEO_010_GUION_COMPLETO_REV01.md` (paquete editorial aprobado por Orlando; su aprobación reemplaza el estado "pendiente de revisión" del encabezado del propio guion).
**Se respeta:** `estudio/docs/SISTEMA_ACTIVO_ORACIONES_BIBLICAS_DIARIAS.md` (§4 Producción) y `estudio/docs/VIDEO_TEMPLATE_ORACIONES_BIBLICAS_DIARIAS.md`.
**Prioridad para este proyecto (indicada por Orlando):** ante cualquier conflicto entre lo realmente usado en el Video 9 y una decisión cerrada, se presenta la diferencia para que decida — ver sección 1.

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
| 1 | 1 | 308 | 1 | — | apertura | — |
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

**Total: 11 bloques, 62 párrafos, 15.526 caracteres.** Máximo por bloque: 1.971 (bloque 4). Mínimo: 308 (bloque 1, la apertura, deliberadamente sola) — el bloque 2 (541 caracteres) es el Salmo 121 completo, aislado por el mismo motivo que la cita bíblica del Video 9.

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

Siete de las nueve pausas caen en una frontera real entre bloques (no requieren nada especial). Las pausas 5 y 7 caen *dentro* de un bloque (6 y 8) porque el párrafo inmediatamente anterior era el Short correspondiente y no convenía partir justo ahí — mismo criterio que las pausas 3 y 8 del Video 9: se generan como una doble línea en blanco dentro del texto enviado a ElevenLabs, y el silencio real se mide y ajusta en el montaje, no se asume de la puntuación. La pausa 9 no es una costura de bloques: es el cierre musical del video completo (música sola con fundido), y se construye en el montaje final, no en la generación de voz.

### Cómo se evitará duplicar el silencio en las uniones

Igual método que el Video 9: ElevenLabs no garantiza silencio digital puro en los bordes de cada bloque — puede dejar algo de "aire natural" (respiración, decaimiento de la voz) antes de llegar al silencio real. Antes de insertar la pausa objetivo de cada frontera, se medirá con `silencedetect` el silencio real que ya existe al final del bloque anterior y al inicio del siguiente, y solo se añadirá la diferencia necesaria para alcanzar el objetivo del guion — nunca el objetivo completo "a ciegas" sobre un borde que ya trae su propio aire. Esto es lo que evita contar dos veces el mismo silencio. Las fronteras con pausa real (1, 2, 3, 4, 6, 8) se verificarán así una por una; las dos embebidas (5, 7) se dejarán como las genere el propio modelo dentro de su bloque, igual que las pausas 3 y 8 del Video 9.

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

### Costo de la muestra (tarifa oficial de cada modelo, igual criterio que el presupuesto del lote)

| Si se prueba con… | Costo de la muestra (1.363 car.) |
|---|---:|
| `eleven_flash_v2_5` (0,276 créditos/carácter, recomendado) | **≈ 376 créditos** |
| `eleven_v4` (1 crédito/carácter, tarifa oficial) | **≈ 1.363 créditos** |

### Presupuesto del lote completo (11 bloques, 15.526 caracteres)

| Si se genera con… | Caracteres | Tarifa usada | Créditos estimados |
|---|---:|---|---:|
| `eleven_flash_v2_5` (recomendado) | 15.526 | 0,276/carácter (medida, confiable) | **≈ 4.285** |
| `eleven_v4` | 15.526 | 1/carácter (tarifa oficial publicada) | **≈ 15.526** |
| *Referencia sin garantía* | 15.526 | 0,4125/carácter (único dato observado en el Video 9, texto distinto) | ≈ 6.404 |

### Costo adicional si se reutilizan los bloques aprobados de la muestra

A diferencia del Video 9 (donde la muestra siempre se consideró aparte y todo el lote se regeneraba completo), aquí las Muestras 1 y 2 son bloques completos: **si Orlando aprueba la muestra, los audios de los bloques 1 y 2 (849 caracteres en total) no se regenerarán** — se reutilizará directamente el archivo ya generado y aprobado, siempre que la llamada de muestra use exactamente los mismos parámetros que usaría el lote (mismo modelo/ajustes, y sin `previous_text`/`next_text` en los bordes de los bloques 1 y 2, porque ambos lados son pausas reales — pausa de apertura antes del bloque 1, pausa 1 y pausa 2 después). Eso deja, tras reutilizar:

| Si se genera con… | Caracteres restantes del lote (15.526 − 849) | Costo del lote restante | Costo combinado real (muestra + lote restante) | Costo si no se reutilizara nada (muestra + lote completo) |
|---|---:|---:|---:|---:|
| `eleven_flash_v2_5` | 14.677 | ≈ 4.051 créditos | **≈ 4.427 créditos** | ≈ 4.661 créditos |
| `eleven_v4` | 14.677 | ≈ 14.677 créditos | **≈ 16.040 créditos** | ≈ 16.889 créditos |

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

**Me detengo aquí.** Falta la autorización de Orlando sobre: (a) qué configuración de voz usar (Flash v2.5 por defecto, según la prioridad indicada para este proyecto, o v4 como alternativa explícita) y (b) generar la muestra de 1.363 caracteres. El lote completo se decide después de escuchar y aprobar esa muestra.
