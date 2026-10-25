# Video 8 — Narración completa sin música, con pausas propuestas (para revisión)

**Archivo:** `video_008_narracion_completa_sin_musica_con_pausas.mp3`
**Estado:** para revisión auditiva de Orlando. **Las duraciones de pausa siguen siendo una propuesta, no están aprobadas.**
**Fecha:** 2026-10-25
**Duración total:** 2.178,48s (36:18)
**SHA-256:** `2a014c316cd217d518dbf4f6d48a773c6c3fd040946b18464c81dc5600c21d62`

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

1. Tu revisión auditiva completa (ritmo, pronunciación, las pausas en sus posiciones y duraciones).
2. Aprobación o ajuste de las duraciones de pausa (siguen siendo "propuesta" del plan técnico).
3. Decisión sobre el ritmo de habla (¿se acepta tal cual o se ajusta `speed` para los bloques 3–17 en una futura regeneración, si se decide que hace falta?).
4. Música, visuales y render siguen sin empezar — fuera del alcance de esta tarea.
