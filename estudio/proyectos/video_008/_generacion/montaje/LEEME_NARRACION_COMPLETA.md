# Video 8 — Narración completa sin música, con pausas propuestas (para revisión)

**Archivo vigente:** `video_008_narracion_completa_sin_musica_con_pausas_v3.mp3` (ver sección "Corrección 2026-10-28" abajo: el CTA del bloque 4 se eliminó por completo).
**Archivos anteriores, conservados sin tocar:** `..._v2.mp3` (bloque 4 con el párrafo de CTA, voz original a speed 1,00) y `..._v1.mp3` (defecto de corte en P02/P10, histórico). Ninguno de los dos se usa para avanzar, se dejan como referencia.
**Estado:** para revisión auditiva final de Orlando. **Las duraciones de pausa siguen siendo una propuesta, no están aprobadas.**
**Fecha:** 2026-10-25 (v1) / 2026-10-27 (v2, corregido) / 2026-10-28 (v3, CTA eliminado)
**Duración total v3:** 2.166,44s (36:06) — 12,04s menos que v1/v2 (2.178,48s / 36:18), por la eliminación completa del párrafo del CTA en el bloque 4.
**SHA-256 v3:** `48b78ccd42c4914eb24b6305961c29333983c9d551e57d60725050a9887c56c7`
**SHA-256 v2:** `ed8b7b4d6e0f3cd2e7b350347aa655bed091f6c35a26c0b00490c726b8acc1a6`
**SHA-256 v1 (sin tocar):** `2a014c316cd217d518dbf4f6d48a773c6c3fd040946b18464c81dc5600c21d62`

## Corrección 2026-10-28 — eliminado el párrafo del CTA en el bloque 4

Orlando probó varias configuraciones para la invitación a suscribirse ("Si esta oración te acompaña...") sin quedar conforme con el tono. En la última muestra (CTA v2 al 80% de velocidad), reportó que el tramo desde el segundo 27 hasta el final sonaba mejor. Se identificó ese tramo con precisión: es exactamente `seg3_despues_original.mp3`, el audio **original sin ningún procesamiento** de "Padre, mi vida necesita tu dirección..." — **no contiene la invitación a suscribirse**.

Como el tramo que gustó no incluye el CTA, se siguió la instrucción de Orlando: **se eliminó todo el párrafo del CTA** (incluida "Ahora seguimos presentando nuestras cargas ante Dios") y se unió "...una palabra que nos anima a seguir." directamente con "Padre, mi vida necesita tu dirección...", con una pausa natural de ~0,78s (medida acústicamente, no por tiempos etiquetados) entre ambas, consistente con las pausas de párrafo que la propia voz usa en el resto de este bloque.

El bloque 4 editado (`4_sin_cta.mp3`, sin tocar el `4.mp3` original) está documentado en `estudio/proyectos/video_008/_generacion/audio/bloque4_cta_eliminada/LEEME_BLOQUE4_SIN_CTA.md`. Ningún otro bloque ni ninguna de las 10 pausas P01–P10 cambiaron — mismos puntos de corte corregidos de la v2.

Las tres CTAs generadas (original a speed 1,00; v2 config. verificada a speed 0,91; v2 al 80% con atempo) se conservan todas, sin usarse en la narración final.

## Corrección 2026-10-27 — punto de inserción de P02 (y P10) movido

Orlando reportó que en 3:29 la palabra "días" sonaba cortada ("día"), con la "s" apareciendo después del silencio en 3:34. Verificado: **cierto, era un error real.**

**Causa encontrada:** el punto de corte de P02 se había calculado contando caracteres en un documento distinto (el plan técnico) y trasladando esa cuenta a la alineación del audio real. Esa cuenta quedó 2 caracteres corta: el corte caía exactamente entre la "a" y la "s" de "días" (verificado directamente en la alineación del bloque 2: carácter 1093 = "a", carácter 1094 = "s" — el corte usaba el índice 1094, justo en medio). Se repitió la revisión de **todos los 9 cortes internos** (no solo P02) buscando directamente, dentro de la propia alineación de cada bloque, el texto exacto que debe terminar justo antes de cada pausa — un método más confiable porque usa el audio real, no una cuenta de caracteres de otro documento. Resultado:

| Pausa | Bloque | Estado |
|---|---|---|
| P01 | 2 | Ya estaba correcto — sin cambios |
| **P02** | 2 | **Corregido**: el corte se movió de 88,051s a 88,341s dentro del bloque 2 (0,29s más tarde), ahora cae justo después de "días." y antes del silencio, nunca en medio de la palabra |
| P04 | 6 | Ya estaba correcto — sin cambios |
| P05 | 8 | Ya estaba correcto — sin cambios |
| P06 | 11 | Ya estaba correcto — sin cambios |
| P07 | 14 | Ya estaba correcto — sin cambios |
| P08 | 16 | Ya estaba correcto — sin cambios |
| P09 | 18 | Ya estaba correcto — sin cambios |
| **P10** | 19 | **Corregido** (encontrado al revisar los demás, como pediste): el corte caía en medio de "Pastor" ("Pa" | "stor"), se movió de 76,6s a 77,4s dentro del bloque 19, ahora cae justo después de "Pastor." |

Los archivos fuente (`1.mp3` … `19.mp3`, sus `.alignment.json`) **no se tocaron** — son los originales. Solo se recalculó dónde cortarlos al ensamblar la narración completa, y se generó `..._v2.mp3` como un archivo nuevo, sin sobrescribir el v1.

Verificación de la muestra entregada (`video_008_muestra_P02_corregida.mp3`, 14s alrededor del nuevo punto de corte de P02): decodificación limpia, "días." completo antes del silencio.

## Qué contiene

Los 19 bloques en orden (1–19), cada uno con su audio exacto (los 4 ya aprobados — 1, 2, 18, 19 — más los 15 nuevos generados hoy en `eleven_v4`), con las **10 pausas propuestas por el plan técnico** insertadas como silencio real en su posición exacta:

| Pausa | Duración propuesta | Posición real (verificada contra el guion, no supuesta) |
|---|---:|---|
| P01 | 5s | **Dentro** del bloque 2, entre la introducción y "Escuchemos el Salmo veintitrés..." |
| P02 | 5s | **Dentro** del bloque 2, entre el salmo completo y "La primera imagen de este salmo..." |
| P03 | 7s | **Entre** el bloque 4 y el bloque 5 (al final del bloque 4, sin contenido después dentro del mismo bloque) |
| P04 | 7s | **Dentro** del bloque 6, entre "...convertirlo en palabras que hieren" y "El salmo habla también de un alma confortada..." |
| P05 | 7s | **Dentro** del bloque 8, entre "...aprendiendo a recibir tu cuidado" y "El cuidado del Pastor incluye dirección..." |
| P06 | 7s | **Dentro** del bloque 11, entre "...el camino que todavía no veo completo" y "El Salmo veintitrés también reconoce el valle..." |
| P07 | 7s | **Dentro** del bloque 14, entre "...un paso a la vez, bajo tu cuidado" y "La siguiente imagen del salmo es una mesa preparada..." |
| P08 | 7s | **Dentro** del bloque 16, entre "...que aprendamos a cuidarnos con sencillez" y "Padre, recibo este momento de descanso..." |
| P09 | 8s | **Dentro** del bloque 18, entre "...un día a la vez" y "Ahora puedes escuchar sin esforzarte..." |
| P10 | 8s | **Dentro** del bloque 19, entre "...cuidado de mi Pastor" y "Señor, gracias por tu bondad y tu misericordia..." |

**Importante, verificado directamente contra el guion/plan técnico, no asumido:** de las 10 pausas, **9 caen dentro de un único bloque TTS** (en el punto exacto donde el marcador `[PAUSA Pxx]` fue retirado del texto antes de narrar), no entre dos bloques distintos. Solo la P03 es una pausa real de frontera entre bloques. Esto se verificó línea por línea en `VIDEO_008_PLAN_TECNICO_PRE_TTS.md` antes de armar la narración — una primera lectura rápida de la tabla de "Pausas" por bloque sugiere que podrían ser todas de frontera, y no es así.

## Cómo se insertaron las pausas internas

Para los 9 casos de pausa interna, se usó la alineación por carácter de ese bloque (ya verificada en tareas anteriores) para encontrar el tiempo exacto donde terminaba el texto antes del marcador y empezaba el texto después — sin ese marcador, ambos fragmentos quedaron unidos en el audio generado sin ningún hueco (se confirmó: el tiempo de fin de un fragmento coincide exactamente con el tiempo de inicio del siguiente en los 9 casos, sin ninguna pausa natural del motor de voz ahí). Se cortó el audio de ese bloque en ese punto exacto y se insertó el silencio ahí, sin tocar nada del resto del bloque.

Los puntos de corte usados (índice de carácter + tiempo resultante) están en `puntos_de_corte_pausas.json` y `tiempos_corte.json`, en esta misma carpeta, para que se puedan verificar o repetir.

## Verificación técnica

- Decodificación completa del archivo final: **sin errores**.
- Detección de silencios (`silencedetect`, umbral -50dB, mínimo 4s): se encontraron exactamente **10 silencios**, en el orden y las duraciones esperadas (con pequeñas variaciones de hasta ~0,7s por encima de lo insertado en algunos casos — es silencio natural de la propia voz justo antes del corte, no un error de inserción; el silencio insertado en sí es exacto, generado matemáticamente).
- Formato uniforme en los 19 bloques de origen: MP3 mono, 44.100 Hz, 128 kbps — permitió ensamblar sin reconversión de formato.

## Hallazgo a tener en cuenta para la revisión auditiva (no corregido aquí, solo informado)

La duración total de la narración (36:18, de los cuales 68s son pausas = ~35:10 de voz real) resulta **más corta** que la estimación del guion aprobado (43–50 min, calibrada a 100–115 palabras/min). A 4.830 palabras narradas, el ritmo real de `eleven_v4` a velocidad 1,00 con esta voz da **~137 palabras/min** — notablemente más rápido que el rango estimado. Esto es información para tu revisión auditiva, no algo que se haya corregido: según tu instrucción, la reserva del presupuesto no autoriza regeneraciones y cualquier corrección (por ejemplo, bajar `speed` si al escuchar se siente apresurado) se decide después de escuchar.

## Qué falta antes de esto ser definitivo

1. Tu revisión auditiva completa de la v3 (ritmo, pronunciación, las pausas en sus posiciones y duraciones, y la nueva unión en el bloque 4 sin el CTA).
2. Aprobación o ajuste de las duraciones de pausa (siguen siendo "propuesta" del plan técnico).
3. Decisión sobre si el ritmo general de los bloques 3–17 (fuera del bloque 4, ya resuelto) necesita algún ajuste.
4. Música, visuales y render siguen sin empezar — fuera del alcance de esta tarea.
