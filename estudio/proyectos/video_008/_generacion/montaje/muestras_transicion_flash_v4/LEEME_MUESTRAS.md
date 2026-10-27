# Video 8 — Muestras A/B de la transición Flash v2.5 → v4 (bloque 2 → bloque 3)

**Estado:** para escuchar y decidir. **No se aplicó ningún cambio global. No se llamó a ElevenLabs. No se regeneró voz.**
**Fecha:** 2026-10-27

## El cambio de ritmo que notó Orlando sí coincide con el cambio de modelo

Orlando reportó que la voz empieza a sonar más rápida y emocionada desde 4:03 de la narración. Verificado con los tiempos reales:

```
Bloque 1 (protegido, revisión previa): 115,722s
Bloque 2 (Flash v2.5, con P01 y P02 de 5s cada una): 116,193s + 10s de pausas
-----------------------------------------------------------------
El bloque 3 (el primero en eleven_v4) empieza en el segundo 241,915 = 4:01,92
```

**El bloque 3 empieza en 4:01,92**, prácticamente en el mismo segundo que Orlando identificó de oído (4:03) — confirma que el cambio percibido coincide con el cambio real de modelo (`eleven_flash_v2_5` → `eleven_v4`) y de ajustes de voz (`stability`/`similarity_boost`/`speed` distintos), no con una deriva gradual dentro de un mismo bloque.

## Las dos muestras

Ambas cubren los mismos ~20s antes de la transición (final del bloque 2, Flash v2.5, sin tocar en ninguna de las dos) + ~40s después (inicio del bloque 3, v4) — tomadas directamente de los archivos originales `2.mp3` y `3.mp3`, no de la narración ya ensamblada.

| Archivo | Qué es | Duración |
|---|---|---:|
| `video_008_muestra_A_velocidad_original.mp3` | Igual que suena ahora: 20s de Flash v2.5 + 40s de v4, ambos a su velocidad original | 60,00s |
| `video_008_muestra_B_v4_al_90pct.mp3` | Los mismos 20s de Flash v2.5 **sin tocar** + los mismos 40s de v4, pero ralentizados al 90% de velocidad (con `atempo=0.9`, que conserva el tono — no se oye más grave, solo más lento) | 64,44s (el tramo de v4 dura más al ir más lento, por eso la muestra completa es más larga) |

En ambas, el corte entre Flash y v4 ocurre justo al segundo 20 (20,00s en la muestra A; también 20,00s en la B, porque la parte de Flash no se tocó).

## Qué decidir al escuchar

- Si al bajar la velocidad de la parte de v4 al 90% (muestra B) el ritmo ya suena comparable al de Flash (muestra A, primeros 20s), probablemente basta con ajustar `speed` en una futura regeneración de los bloques 3–17.
- Si incluso a 90% la v4 sigue sonando más "emocionada"/con una entonación distinta a la de Flash (no solo más rápida), el problema no es solo de velocidad — habría que revisar también `stability`/`similarity_boost` u otro ajuste de interpretación, no solo la velocidad.

Esta decisión queda para Orlando. No se generó ni se propuso todavía ningún cambio de configuración para los bloques 3–17 — eso es un paso aparte, pendiente de esta escucha.
