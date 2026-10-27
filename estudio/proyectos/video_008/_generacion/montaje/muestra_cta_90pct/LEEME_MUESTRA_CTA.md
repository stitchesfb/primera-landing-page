# Video 8 — Muestra de la invitación a suscribirse (bloque 4) al 90 % de velocidad

**Estado:** para escuchar y aprobar. **No se aplicó ningún cambio a la narración completa. No se llamó a ElevenLabs. No se regeneró voz. No se tocó la velocidad del resto de la narración.**
**Fecha:** 2026-10-27

## Qué reportó Orlando

"El resto está bien. Solo la invitación a suscribirse, entre 6:55 y 7:07 de la narración v2, suena más rápida y energética." Esa frase pertenece al **bloque 4** (el primero generado en `eleven_v4`), dentro del tramo: *"Si esta oración te acompaña, puedes suscribirte a Oraciones Bíblicas Diarias para encontrar otras oraciones basadas en la Biblia. Ahora seguimos presentando nuestras cargas ante Dios."*

## Cómo se localizaron los límites

Como pediste, los límites no se tomaron de los tiempos aproximados que diste, sino escuchando (vía la alineación por carácter del propio bloque 4) dónde terminan e inician las frases completas alrededor del pasaje:

| Tramo | Texto | Tiempo local en `4.mp3` | Tiempo global en la narración v2 |
|---|---|---|---|
| Antes (sin tocar) | "Que podamos reconocer también lo que sí está presente: una oportunidad, una mano cercana, el alimento de hoy, una palabra que nos anima a seguir." | 44,64s – 54,64s (10,0s) | 6:44,52 – 6:54,52 |
| **CTA (al 90 %)** | "Si esta oración te acompaña, puedes suscribirte a Oraciones Bíblicas Diarias para encontrar otras oraciones basadas en la Biblia. Ahora seguimos presentando nuestras cargas ante Dios." | 55,6s – 66,8s (11,2s a velocidad original) | 6:55,48 – 7:06,68 |
| Después (sin tocar) | "Padre, mi vida necesita tu dirección. Quiero trabajar y cuidar lo que me has confiado sin convertir cada resultado en la medida de mi valor." | 67,68s – 77,28s (9,6s) | 7:07,56 – 7:17,56 |

Los tiempos globales confirman que el tramo señalado por Orlando (6:55 a 7:07) es exactamente la frase de la invitación a suscribirse — los límites reales coinciden con lo escuchado.

## Qué contiene la muestra

`video_008_muestra_CTA_90pct.mp3` — un solo archivo, continuo, de **32,08s**:

1. **~10s antes** (frase completa anterior), **a velocidad original**, sin tocar.
2. **La invitación a suscribirse completa**, extraída primero a velocidad original y **luego ralentizada al 90 %** con `atempo=0.9` (conserva el tono — no suena más grave, solo más lenta). Pasa de 11,23s a 12,46s.
3. **~9.6s después** (frase completa siguiente), **a velocidad original**, sin tocar.

El archivo fuente usado fue `4.mp3` (el bloque original, sin modificar). No se generó audio nuevo: es el mismo audio existente, recortado y, solo en el tramo de la CTA, reproducido más lento.

**Verificación:** decodificación completa sin errores. SHA-256: `e06d647c92e69cc242359b711f8916c1843fbc569538d6a002e270cdea21f55e`.

## Qué falta decidir

- Si al escuchar la muestra el ritmo de la CTA ya suena comparable al resto, la corrección sería: ralentizar únicamente ese tramo (no todo el bloque 4, no los demás bloques) al aplicarla a la narración completa.
- Si todavía no convence (por ejemplo, las uniones suenan abruptas, o el tono sigue sintiéndose distinto más allá de la velocidad), indícalo para ajustar antes de aplicar nada al archivo completo.

**Esta corrección todavía NO se aplicó al archivo ensamblado completo** (`video_008_narracion_completa_sin_musica_con_pausas_v2.mp3`). Esa es la siguiente tarea, pendiente de tu aprobación de esta muestra.
