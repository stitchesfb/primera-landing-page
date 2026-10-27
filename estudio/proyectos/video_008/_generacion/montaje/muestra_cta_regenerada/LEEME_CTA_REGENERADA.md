# Video 8 — CTA del bloque 4 regenerada (stability 0,60 / speed 0,85) con pausas, para aprobación

**Estado:** para escuchar y aprobar. **No se tocó `4.mp3` ni ningún otro bloque. No se reemplazó nada en la narración ensamblada (`_v2.mp3`). El CTA anterior (velocidad original, generado junto al resto del bloque 4) sigue intacto.**
**Fecha:** 2026-10-27

## Qué se generó

Una sola llamada a ElevenLabs, sin reintentos, **solo con el párrafo de la invitación a suscribirse** (no el bloque 4 completo):

> "Si esta oración te acompaña, puedes suscribirte a Oraciones Bíblicas Diarias para encontrar otras oraciones basadas en la Biblia. Ahora seguimos presentando nuestras cargas ante Dios."

| Parámetro | Valor |
|---|---|
| `voice_id` | `8mBRP99B2Ng2QwsJMFQl` (sin cambio) |
| `model_id` | `eleven_v4` (sin cambio) |
| `stability` | **0,60** (antes 0,50) |
| `similarity_boost` | 0,75 (sin cambio) |
| `speed` | **0,85** (antes 1,00) |
| `output_format` | `mp3_44100_128` (sin cambio) |

**Verificación técnica:** el texto alineado que devolvió la API coincide carácter por carácter con el texto enviado (183 caracteres). Decodificación limpia. Duración resultante: 11,81s (la versión anterior a velocidad 1,00 duraba 11,23s — el parámetro `speed` de ElevenLabs no escala la duración de forma lineal como lo haría un cambio de velocidad de reproducción; el efecto real en el ritmo percibido se evalúa escuchando, no por la duración).

**Costo:** la tarifa publicada de `eleven_v4` (1 crédito/carácter) estima 183 créditos para esta llamada. El historial de la cuenta registró un cambio de 81 caracteres para este ítem, y la foto de créditos antes/después de la llamada no mostró cambio — ambas lecturas son ruido ya documentado en este proyecto (el cargo individual por llamada no es confiable; solo el total acumulado de una secuencia larga lo es). Se guarda como referencia, no como cargo garantizado. History ID: `uxejB7kjZjh5KDDLl4Nm`.

Archivos guardados en `estudio/proyectos/video_008/_generacion/audio/regeneracion_cta_bloque4/`: `cta_regenerada.mp3`, su alineación, el payload enviado y el ítem de historial crudo.

## Cómo se armó la muestra con pausas

Se buscó, en el propio `4.mp3` original (sin tocar), el silencio natural que la voz ya deja entre frases en ese punto:

- Entre el final de "...una palabra que nos anima a seguir." y el inicio de la CTA original: **0,96s** de pausa natural ya existente.
- Entre el final de la CTA original y el inicio de "Padre, mi vida necesita tu dirección...": **0,88s** de pausa natural ya existente.

Para llegar a ~1,5s de pausa total en cada unión, **descontando ese silencio natural**, se completó con silencio generado:

| Unión | Silencio natural ya presente | Silencio añadido | Total |
|---|---:|---:|---:|
| Antes de la CTA | 0,96s | 0,54s | 1,50s |
| Después de la CTA | 0,88s | 0,62s | 1,50s |

Los fragmentos de contexto (`seg1_antes_original.mp3`, `seg3_despues_original.mp3`) se extrajeron de `4.mp3` incluyendo ese silencio natural, **sin modificar nada de su contenido ni velocidad** — son el audio original tal cual. Solo el silencio añadido (0,54s y 0,62s) es generado matemáticamente.

## Qué contiene el archivo entregado

`video_008_muestra_CTA_regenerada_con_pausas.mp3` — **34,40s**, en este orden:

1. ~11,0s de contexto anterior, original, sin tocar (incluye su 0,96s de pausa natural al final).
2. 0,54s de silencio añadido.
3. La CTA regenerada completa (11,81s, stability 0,60 / speed 0,85).
4. 0,62s de silencio añadido.
5. ~10,5s de contexto posterior, original, sin tocar (incluye su 0,88s de pausa natural al inicio).

**Verificación:** decodificación completa sin errores. SHA-256: `f5701f4c734e6a41bf0a3e9628c9215b5033030fff546eba4bfb1983e6ac16b0`.

## Qué falta decidir

- Si el ritmo/tono de la CTA regenerada ya suena sereno y acorde al resto, y las uniones (con la pausa de ~1,5s) se sienten naturales.
- Si conviene ajustar aún más `speed` (hay margen hasta 0,70) o `stability`, o si ya está lista para integrarse.

**Esta regeneración todavía NO se incorporó a la narración completa** (`video_008_narracion_completa_sin_musica_con_pausas_v2.mp3`). Esa es la siguiente tarea, pendiente de tu aprobación de esta muestra.
