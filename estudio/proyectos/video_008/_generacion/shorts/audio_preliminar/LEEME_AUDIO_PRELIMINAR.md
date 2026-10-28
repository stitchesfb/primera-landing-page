# Video 8 — Audio preliminar de los 3 Shorts (sin música ni visuales)

**Estado:** extraído y verificado, para el plan visual. No se generó voz nueva.
**Fecha:** 2026-10-28

Extraídos directamente de los `.mp3` originales de cada bloque TTS (`3.mp3`, `9.mp3`, `12.mp3`, sin tocar), usando el texto exacto de cada Short (marcadores `[INICIO/FIN SHORT N]` del guion aprobado) localizado en la alineación por carácter de cada bloque.

| Archivo | Bloque origen | Duración | SHA-256 |
|---|---|---:|---|
| `short1_preliminar.mp3` | 3 | 38,95s | `782735548b02e7b1dafc08379d286f13255f6202d52a11ca7f088c6b488451c9` |
| `short2_preliminar.mp3` | 9 | 40,75s | `f8cdc183d2ebdc0aa5ed8e8562cdddcc7a4c66277d4a86a7c34bef333cb5e547` |
| `short3_preliminar.mp3` | 12 | 37,75s | `1b3d9380ab7b44bd4ee40e2d690518baaef3482631b84c811235abb5b4d31409` |

## Verificación (primeras y últimas sílabas, "Amén" completo)

Sin reproducción de audio disponible en esta sesión, se verificó con análisis de energía en ventanas de 0,05s (mismo método usado en todo este proyecto para diagnosticar cortes y residuos):

- **Short 1:** silencio limpio 0–0,30s antes de "¿Estás...", arranque en 0,35–0,40s. "Amén." decae de forma natural y queda en silencio limpio desde 38,55s. Sin palabras cortadas.
- **Short 2:** silencio limpio 0–0,25s antes de "¿No sabes...", arranque en 0,30s. "Amén." decae de forma natural, silencio limpio desde 39,85s (cola generosa, ~0,9s de margen). Sin palabras cortadas.
- **Short 3:** el Short empieza exactamente en el primer carácter del bloque 12 — no hay margen de silencio natural disponible antes de la primera sílaba (la voz arranca casi de inmediato). **Se añadieron 0,3s de silencio digital al inicio** para dar un respiro antes del gancho; no se generó voz nueva, solo un margen editorial, igual de criterio que el usado en todo este proyecto para las pausas. "Amén." decae de forma natural, silencio limpio desde 37,08s. Sin palabras cortadas.

## Conservado sin tocar

`3.mp3`, `9.mp3`, `12.mp3` y sus `.alignment.json` originales. Estos 3 archivos son extracciones nuevas y separadas.

## Qué falta

Música, visuales, subtítulos quemados y render de cada Short — ver `estudio/proyectos/video_008/_generacion/mapa_visual/VIDEO_008_PLAN_VISUAL.md`.
