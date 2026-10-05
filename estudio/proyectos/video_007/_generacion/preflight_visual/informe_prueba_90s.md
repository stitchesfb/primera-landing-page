# Video 7 — Prueba audiovisual de 90 segundos

**Estado:** `prueba_audiovisual_90s_pendiente_aprobacion`
**Fecha:** 2026-10-06
**Archivo:** `preflight_visual/prueba_audiovisual_90s_pendiente_aprobacion.mp4`

## Especificaciones técnicas

| Campo | Valor |
|---|---|
| Resolución | 1920×1080 |
| Códec de video | H.264 |
| Framerate | 30 fps |
| Códec de audio | AAC, 160 kbps, 44.100 Hz, estéreo |
| Duración | 90,000 s (exacta) |
| Tamaño | 31,3 MB |

## Fuente de narración

`montaje/narracion_revision_03_sin_musica.mp3` (`narracion_aprobada`) — primeros 90,000s extraídos **sin modificar el archivo original**. Confirmado por `git diff`: cero cambios en la narración aprobada, en los 24 bloques originales, en las revisiones anteriores ni en los audios preliminares de los Shorts.

## Clips usados y segmentos exactos

Los cambios visuales se ajustaron a las frases y pausa reales de la narración (no a intervalos mecánicos):

| Tramo | Duración | Clip | Técnica |
|---|---:|---|---|
| 0:00,000–0:21,800 | 21,80s | Pexels 5370904 "Bright Moon Among Moving Clouds" (9,21s fuente) | Bucle ping-pong (adelante+atrás, sin costuras visibles) |
| 0:21,800–0:46,100 | 24,30s | Pexels 14374617 "Stars on Night Sky" (10,03s fuente, vertical recortada a 16:9) | Bucle ping-pong |
| 0:46,100–1:00,187 | 14,09s | Pexels 4102367 "Moving Clouds in Front of the Moon" (10,03s fuente) | Bucle ping-pong, sin bucle adicional (una vuelta completa) |
| 1:00,187–1:02,187 | 2,00s | Continúa el clip anterior, con fundido a negro | Fundido de salida (`fade=out`) dentro de la pausa 1 |
| 1:02,187–1:04,187 | 2,00s | Mixkit 100830 "Starry Sky with Clouds Drifting By" (6,54s fuente) | Fundido de entrada (`fade=in`) dentro de la pausa 1 |
| 1:04,187–1:30,000 | 25,81s | Continúa Mixkit 100830 | Bucle ping-pong |

La transición "muy suave" pedida para la pausa 1 ocurre **enteramente dentro de los 4s de silencio digital** (1:00,19–1:04,19): 2s de fundido a negro seguidos de 2s de fundido desde negro — nunca durante la voz.

**Técnica de bucle sin costuras:** cada clip corto se extiende reproduciéndolo hacia adelante y luego hacia atrás (ping-pong), de modo que el último fotograma de cada mitad coincide exactamente con el primero de la siguiente — cero cortes visibles, consistente con "transiciones suaves" y "evitar... cambios que distraigan". No se aplicó ninguna detección RMS ni recorte automático agresivo.

Mixkit 39768 (el quinto clip aprobado) quedó disponible en el banco pero no se usó en esta prueba concreta.

## Música

**Pista:** `alone_with_my_thoughts.mp3` ("No.7 Alone With My Thoughts", Esther Abrami) — **solo para esta prueba**, no es aprobación definitiva.

**Nivel aplicado:**
- Sonoridad nativa medida (90s): −27,7 LUFS integrado (coincide exactamente con el valor ya catalogado en `canal.json`).
- Ganancia aplicada: **−5,8 dB** (constante, sin ducking dinámico) para alcanzar `objetivo_lufs: -33.5` de `canal.json`.
- Verificado tras aplicar la ganancia: **−33,5 LUFS** exacto.
- Nivel **plano**: la misma ganancia se mantiene constante bajo la narración y durante la pausa de 4s — no sube en el interludio, conforme a la "REGLA DEL PERFIL NOCTURNO" documentada en `canal.json`.
- Fundido de entrada: 4,0s desde el inicio (`fade_in_s: 4` de `canal.json`).
- Sin sonidos de ambiente adicionales. Sin ducking dinámico ni compresión de la voz.
- Nivel medio de la mezcla final: −22,2 dB (prácticamente idéntico al −22,4 dB de la narración sola) — la voz queda claramente al frente.

## Confirmaciones

- **La voz no fue modificada.** Se extrajeron los primeros 90s de `narracion_revision_03_sin_musica.mp3` sin alterar ni un byte del archivo original ni aplicarle ningún filtro de audio (ni volumen, ni ecualización, ni compresión).
- **No se produjo ningún otro render.** Solo esta prueba de 90s. No se renderizó el video largo completo, no se tocaron los Shorts preliminares, no se generó la miniatura.
- **Sin subtítulos.**
- **Sin compras ni recursos premium.** Los 5 clips usados en el banco son gratuitos, con licencia comercial ya verificada (ver `evidencia_licencias.md`, consultada hoy).
- **Sin IA:** los 5 clips son grabaciones reales (confirmado por descripción y verificación de la página de cada uno).
- Movimientos lentos, transiciones suaves, sin cortes rápidos — cumple con el baseline visual de `SISTEMA_ACTIVO §5`.

## Archivos de este entregable

- `preflight_visual/prueba_audiovisual_90s_pendiente_aprobacion.mp4` — la prueba.
- `preflight_visual/evidencia_licencias.md` — evidencia de licencias con fecha de consulta.
- `preflight_visual/clips_fuente/` — los 5 clips descargados (material de origen, sin modificar).

## Pendiente

Tu aprobación de: el storyboard visual, la pista musical (solo probada aquí, no aprobada para el video completo) y su nivel. Después de tu aprobación, se podría avanzar hacia el render del video largo completo — todavía no autorizado.
