# Video 9 — Prueba continua de 90s alrededor de la entrada a Mateo 11

**Estado:** para revisión de Orlando, antes de cualquier render completo.
**Fecha:** 2026-11-06
**Archivo:** `video_009_prueba_mateo_90s.mp4` — 1920×1080, 30fps, h264/aac, 90,000s. SHA-256: `c1e9f254dad5e55dfee50f009227a9b3ead0d3fd5c9917e0c53a4e8a1573e2d0`.

## Qué contiene

Ventana continua **60,0s–150,0s** de `video_009_narracion_completa_sin_musica_v1.mp3` (la narración con las 8 pausas, conservada tal cual). Cae justo alrededor de la pausa 1 y la entrada a la cita de Mateo 11:28-30:

- **0:00–1:07,18 de la muestra (escena "cansancio"):** cola del bloque 1.
- **1:07,18–1:10,36 (dentro de la pausa 1):** fundido de cambio de escena.
- **1:10,36–1:30,00 (escena "Biblia abierta"):** inicio del bloque 2 ("En el evangelio según Mateo…" + la cita completa empieza aquí).

## Tratamiento visual — zoom continuo real, no pasos estáticos

A diferencia del método usado en el Video 8 (tomas fijas con pasos de zoom muy separados, que resultó casi imperceptible — observación ya registrada en `SISTEMA_ACTIVO_ORACIONES_BIBLICAS_DIARIAS.md`), esta prueba usa **zoompan continuo real dentro de cada toma**, a la velocidad que se usaría en el montaje final — no acelerado para la muestra:

| Escena | Tomas | Duración por toma | Zoom por toma | Foco |
|---|---|---:|---:|---|
| Cansancio | 3 | ~23,1s | +3,5% continuo | rostro (x 0,40 / y 0,30) |
| Biblia abierta | 1 | 22,8s | +3,0% continuo | el libro abierto (x 0,45 / y 0,68) |

Fundidos cruzados de **1,0s** entre las tomas de una misma escena (dentro del rango aprobado 0,75–1,5s) y de **1,4s** en el cambio de escena, colocado para caer dentro de la pausa 1 (3,18s) — el cambio visual termina justo antes de que vuelva a sonar la voz.

**Por qué esto no reabre el problema de costo que cerró DECISIONES_CERRADAS #14:** ese cierre descartó zoompan continuo sobre **todo el video** (el cálculo por fotograma repetido en 30+ minutos disparaba el render). Aquí cada toma es corta (~23s) y el costo de zoompan queda acotado a esa toma — es el mismo método que ya funcionó en el Video 7 (tomas cortas de zoompan encadenadas con fundidos), solo que con un zoom más tenue (3–3,5%, dentro del rango 3–4% ya aprobado para el perfil nocturno) en vez del 7–8% del Video 7.

## Audio

- **Narración:** extraída tal cual de la v1 aprobada, sin tocar.
- **Música:** `one_step_closer.mp3` (siguiente en la rotación libre del canal, tras `alone_with_my_thoughts` en el Video 7 y `touching_moment` en el Video 8), tomada desde el punto de la propia pista que sonaría en el minuto real de la narración (1:00), no desde el principio — para que la muestra represente fielmente ese instante del video completo. Ducking plano −23dB bajo voz e interludio (regla del perfil nocturno), normalizada a −33,5 LUFS objetivo. Sin fundido de apertura/cierre, porque esta ventana no es ni el inicio ni el final del video.
- **Partículas:** preset "noche" (82, periodo 24s).

## Corrección 2026-11-06: el zoom ya no se reinicia dentro de la misma imagen

Orlando aprobó las partículas, el paso entre imágenes y la velocidad/intensidad del zoom, pero señaló que dentro de la escena 1 se notaba el reinicio del zoom al pasar de una toma a la siguiente (volvía a 1.0 y empezaba de nuevo). La escena 1 pasó de ser 3 tomas independientes (cada una re-zoomeando desde cero) a **un solo segmento continuo**: el zoom sube una sola vez hasta su encuadre final (misma velocidad e intensidad de antes — +3,5% en 23,06s) y luego **se queda fijo en ese encuadre** hasta el cambio a la escena 2, sin reiniciar ni seguir avanzando. La escena 2 no cambió (ya era una sola toma). El fundido de cambio de escena, las partículas y el audio no se tocaron.

`video_009_prueba_mateo_90s.mp4` se regeneró con esta corrección (mismo SHA-256 de archivo nuevo: `cb27a1a06bb0ca0537fd8d283565a6fef28f31ef4475be3d112ceaa4effc72ca`, 90,000s). Para verificar solo el punto corregido sin volver a revisar los 90s completos, se recortó (stream copy, sin recodificar) el tramo 0:14–0:32 de la prueba — justo donde antes se notaba el reinicio —: `clip_correccion/video_009_prueba_mateo_clip_14_32s.mp4` (18,1s).

## Qué falta decidir

1. Si el ritmo del zoom (continuo, ~3-3,5% por toma de ~23s) se siente "lento pero perceptible" como se pidió, sin distraer de la oración.
2. Si el fundido de 1,4s en el cambio de escena, colocado dentro de la pausa 1, se siente natural.
3. Si los focos elegidos (rostro en la escena 1, el libro en la escena 2) son los correctos.
4. Una vez aprobado, se decide si este mismo método (tomas cortas de zoompan continuo, encadenadas) reemplaza el de tomas estáticas del Video 8 para el resto de las escenas del Video 9.

**No se ha hecho ningún render completo. No se generó ninguna imagen nueva — las dos imágenes se usaron tal cual se recibieron.**
