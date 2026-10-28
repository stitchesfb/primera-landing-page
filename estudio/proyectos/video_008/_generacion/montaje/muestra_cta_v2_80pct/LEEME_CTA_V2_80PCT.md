# Video 8 — CTA v2 (config. verificada) ralentizada al 80%, para aprobación

**Estado:** para escuchar y aprobar. **No se llamó a ElevenLabs. No se regeneró voz. No se tocó la velocidad del contexto. No se incorporó nada a la narración completa.**
**Fecha:** 2026-10-28

## Qué se hizo

Se tomó `cta_v2_regenerada.mp3` (la CTA generada con `stability` 0,65, `similarity_boost` 0,88, `clone_strength` 0,0, `speed` 0,91 — la última aprobada) y se ralentizó **solo ella**, al 80% de su velocidad actual, con `atempo=0.8` (conserva el tono — no suena más grave, solo más lenta). Pasa de 11,73s a 14,63s.

El contexto anterior y posterior (`seg1_antes_original_v2.mp3`, `seg3_despues_original.mp3`) se reutilizó tal cual, a velocidad original, sin tocar — son los mismos archivos ya usados y aprobados para la eliminación del residuo de "S".

## Pausas

Se mantuvieron los mismos ~1,5s de pausa total en cada unión que ya se habían calculado (silencio natural del audio original + silencio añadido, sin cambios porque el contexto no cambió):

| Unión | Natural | Añadido | Total |
|---|---:|---:|---:|
| Antes de la CTA | 0,83s | 0,67s | 1,50s |
| Después de la CTA | 0,60s | 0,90s | 1,50s |

## Verificación

Se repitió el mismo análisis de energía en banda alta (>3,5kHz) usado para confirmar la eliminación del residuo de "S": la unión antes→CTA sigue con silencio limpio y continuo (10,1s–11,3s de la muestra), sin ningún artefacto nuevo introducido por el cambio de velocidad. Decodificación completa sin errores.

## Archivo entregado

`video_008_muestra_CTA_v2_80pct_con_pausas.mp3` — **37,43s**:

1. ~10,79s de contexto anterior, velocidad original, sin tocar.
2. 0,67s de silencio.
3. La CTA v2 al 80% de velocidad (14,63s).
4. 0,90s de silencio.
5. ~10,53s de contexto posterior, velocidad original, sin tocar.

SHA-256: `01caad68a2e864d903f403ee6c744916a08f2e8495a3e282d42f0df4bd85a439`.

## Conservado sin tocar

- `cta_v2_regenerada.mp3` (la CTA a velocidad 0,91, sin ralentizar) — se guarda intacta junto a la nueva versión al 80%, `cta_v2_regenerada_80pct.mp3`.
- `4.mp3`, su alineación, la narración completa `_v2.mp3` y las CTAs anteriores.

## Qué falta decidir

Si al 80% el ritmo ya es el buscado, o si hace falta ajustar más (velocidad adicional, o revisar si el ritmo de *generación* `speed` también necesita bajar en una futura llamada, en vez de solo ralentizar en posproducción). Nada de esto se ha aplicado a la narración completa todavía.
