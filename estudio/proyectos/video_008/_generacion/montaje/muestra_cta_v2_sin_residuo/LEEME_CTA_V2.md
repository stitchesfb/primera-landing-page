# Video 8 — CTA del bloque 4, 2ª regeneración (configuración verificada), sin residuo de "S", para aprobación

**Estado:** para escuchar y aprobar. **No se tocó `4.mp3` ni ningún otro bloque. No se reemplazó nada en la narración ensamblada (`_v2.mp3`). La CTA anterior (speed 0,85/stability 0,60) y la original (speed 1,00) siguen intactas.**
**Fecha:** 2026-10-28

## Configuración usada (verificada, no asumida)

Una sola llamada a ElevenLabs, sin reintentos, con el texto original del CTA (183 caracteres):

| Parámetro | Valor | Fuente |
|---|---|---|
| `voice_id` | `8mBRP99B2Ng2QwsJMFQl` | sin cambio |
| `model_id` | `eleven_v4` | sin cambio |
| `language_code` | `es` | confirmado en captura de Orlando + válido para `eleven_v4` (`/v1/models`) |
| `stability` | 0,65 | prueba de Orlando (historial) |
| `similarity_boost` | 0,88 | prueba de Orlando (historial) |
| `clone_strength` | **0,0** | captura de Orlando ("Low") + documentación oficial (rango 0–1, 0=low) |
| `speed` | **0,91** | elegida por Orlando para esta prueba |

No se incluyeron `style` ni `use_speaker_boost`: `eleven_v4` reporta `can_use_style: false` y `can_use_speaker_boost: false` en `/v1/models`, es decir, el modelo no los usa.

**Verificación técnica:** el texto alineado que devolvió la API coincide carácter por carácter con el enviado. Decodificación limpia. Duración: 11,73s. History ID: `rdEARtBAxFAsRxD12Me0`. Costo presupuestado: 183 créditos (tarifa publicada); el delta observado en historial/suscripción no es confiable individualmente, como ya documentado en este proyecto.

Archivos: `estudio/proyectos/video_008/_generacion/audio/regeneracion_cta_bloque4/cta_v2_regenerada.mp3` (+ alineación, payload, historial crudo).

## Eliminación del residuo de "S"

En la integración anterior, el corte de "antes_original" en 55,6s (tiempo que la alineación etiqueta como inicio de la "S" de la CTA vieja) se quedó con los últimos ~0,10-0,15s de esa fricativa, porque el sonido real empieza a oírse un poco antes del tiempo etiquetado.

Esta vez medí con precisión de 0,02s dónde está el silencio verdaderamente limpio en `4.mp3` original:

- La fricativa de la "S" vieja empieza a sonar en el segundo **55,42** (no 55,6). El silencio es limpio hasta **55,40**.
- Se movió el corte de "antes_original" a **55,38s** — dentro de la zona de silencio puro, con margen.
- Verifiqué la cola del nuevo fragmento con el mismo análisis: silencio limpio (sin residuo) desde el 9,92 hasta el final del clip.
- Verifiqué también la muestra ya ensamblada: la pausa completa (de ~10,05s a 11,35s dentro de la muestra) es ahora silencio continuo, sin ningún salto de energía. **El "shh" ya no aparece.**

De paso, revisé con la misma precisión el lado "después": el habla de "Padre, mi vida..." empieza realmente en el segundo 67,40 (no 67,68 como se había estimado con el tiempo etiquetado), y el corte de "después_original" en 66,8s ya estaba a salvo de cualquier residuo de la CTA vieja (que termina limpiamente en 66,76s) — no hizo falta mover ese lado.

## Pausas de integración (recalculadas con los tiempos acústicos reales)

| Unión | Silencio natural ya presente | Silencio añadido | Total |
|---|---:|---:|---:|
| Antes de la CTA | 0,83s (del fin real del habla a 55,38s) | 0,67s | 1,50s |
| Después de la CTA | 0,60s (de 66,8s al inicio real de "Padre") | 0,90s | 1,50s |

Los fragmentos de contexto (`seg1_antes_original_v2.mp3`, `seg3_despues_original.mp3`) son el audio original de `4.mp3` sin modificar, solo recortado en un punto distinto para el lado "antes". Solo el silencio añadido es generado matemáticamente.

## Qué contiene el archivo entregado

`video_008_muestra_CTA_v2_sin_residuo_con_pausas.mp3` — **34,51s**:

1. ~10,79s de contexto anterior original, sin residuo de "S" al final.
2. 0,67s de silencio añadido.
3. La CTA regenerada con la configuración verificada (11,73s).
4. 0,90s de silencio añadido.
5. ~10,53s de contexto posterior original, sin tocar.

**Verificación:** decodificación completa sin errores. SHA-256: `21a6b8a39a1ea94d106e4dcf33c0683ca4e6c379adf1e84554f640023ac1d719`.

## Qué falta decidir

Si el tono/ritmo de esta CTA ya es el buscado y si las uniones (ahora sin el residuo) suenan naturales. **Esta regeneración todavía NO se incorporó a la narración completa** (`_v2.mp3`) — pendiente de tu aprobación.
