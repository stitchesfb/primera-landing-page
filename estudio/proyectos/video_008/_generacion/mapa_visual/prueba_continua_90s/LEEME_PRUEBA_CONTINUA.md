# Video 8 — Prueba continua de 90s desde el inicio (0:00–1:30), tratamiento real del video final

**Estado:** para revisión de Orlando, antes del render completo.
**Fecha:** 2026-11-01
**Archivo:** `video_008_prueba_continua_90s.mp4` — 1920×1080, 30fps, h264/aac, exactamente 90,000s. SHA-256: `c99fa4d6eb789dd8951d5c2c77a58d15bf9149d63864d785a62daeb4652d0964`.

## Corrección de método respecto a la prueba anterior

La prueba de fragmentos (entregada el 2026-10-29) se construyó con **zoompan continuo** (`estudio/lib/renderer.mjs`), que no es el método aprobado. El método aprobado en `edit_plan.json` es **"tomas con reencuadre"**: encuadres fijos (estáticos) de la misma imagen, unidos con fundidos cruzados — explícitamente **no** zoompan continuo, justamente para evitar el costo de render que el zoompan ya demostró en el canal (≈98min para renderizar 33min de video). Esta prueba corrige eso: no hay ningún fotograma animado, cada toma es una imagen fija.

## Qué contiene

Los primeros 90 segundos reales del video (0:00–1:30), que caen enteramente dentro del bloque 1 (0:00–1:55,72), con la escena **E1 — Dormitorio nocturno**. Es un tramo continuo, sin cortes ni fragmentos — el bloque 1 no tiene ninguna pausa, así que la narración suena de corrido del principio al final de la muestra.

**Narración:** extraída directamente de `video_008_narracion_completa_sin_musica_con_pausas_v3.mp3` (0–90s), sin tocar.

**Música:** `touching_moment.mp3`, con su sonoridad real medida (−17,0 LUFS) normalizada para llegar a −33,5 LUFS tras el ducking plano de −23dB. Como esta muestra empieza en el minuto 0 real del video completo, se aplicó también el fundido de entrada de 4s de la música (`canal.json` → `musica.fade_in_s`) — la música no entra a volumen pleno desde el primer fotograma, sube durante los primeros 4s, igual que ocurrirá en el render final.

**Sin saltos de audio:** la voz y la música son una sola pista continua de 90s; los cambios de encuadre visual (las 3 tomas) no afectan el audio en absoluto.

## Tratamiento visual — tomas reales, sin comprimir ni acelerar

Plan de tomas para el bloque 1 completo (115,72s), mostrando aquí solo las primeras que caben en 90s (el bloque seguiría con más tomas después del segundo 90, fuera de esta muestra):

| Toma | Duración | Zoom | Encuadre |
|---|---:|---:|---|
| 1 | 31,0s | 0% (imagen completa) | Encuadre original, sin recorte |
| 2 | 31,0s | 1,5% | Ligero acercamiento hacia la ventana/luna |
| 3 | 30,0s | 3,0% | Acercamiento algo mayor, mismo punto de interés |

Fundidos cruzados de **1,0s** entre tomas consecutivas (dentro del rango 0,75–1,5s aprobado). El zoom avanza de forma progresiva (0% → 1,5% → 3,0%) manteniendo siempre el mismo punto de interés (ventana y luna), para dar la sensación de un acercamiento lento y continuo construido con pasos fijos — no hay ningún fotograma con movimiento de cámara, cada toma es 100% estática.

**Esto es exactamente el tratamiento que tendría este tramo en el render final** — ni la duración de las tomas ni la velocidad del zoom están aceleradas ni comprimidas para la muestra, a diferencia de la prueba de transiciones anterior.

Partículas del preset "noche" (82, periodo 24s) superpuestas, igual que en el render final.

## Qué falta decidir

1. Si el ritmo de las tomas (duración de cada una, 30-31s) y la cantidad de zoom por toma se sienten bien para una oración nocturna.
2. Si el punto de interés elegido (ventana/luna) es el correcto para esta escena.
3. Una vez aprobado este tratamiento para el bloque 1, se replica el mismo método (ajustando focos y duraciones) para las otras 5 escenas antes del render completo.

**No se ha hecho el render completo. No se generó ninguna imagen ni audio nuevo — todo construido a partir de `E1_dormitorio_nocturno.png` y la narración v3 ya existentes.**
