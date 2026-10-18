# Video 7 — Mapa visual completo (48:26,91)

**Estado:** `imagenes_N1_N16_aprobadas` (actualizado 2026-10-18; estructura general del mapa aprobada, 16 imágenes nuevas aprobadas e importadas, render completo aún no autorizado)
**Fecha:** 2026-10-15 (mapa original) · actualizado 2026-10-18 (importación N1–N16 + 3 correcciones documentales)
**Fuente de narración:** `montaje/narracion_revision_03_sin_musica.mp3` (`narracion_aprobada`, 2906,91s)
**Base de ritmo visual:** `revision_04_movimiento_particulas` (aprobada definitivamente)

Este documento es un **mapa de planeación**. Las 16 imágenes nuevas (N1–N16) ya fueron generadas, aprobadas por Orlando el 2026-10-18 e importadas sin modificar — ver `imagenes_N1_N16_aprobadas/` (PNG originales, `LEEME_APROBACION.md`, `manifiesto_N1_N16.json`, `SHA256SUMS.txt`, hoja de contacto). No se descargó ningún recurso nuevo de pago y no se renderizó todavía el video largo a calidad final ni los Shorts. La narración, los 24 bloques TTS, la música, las partículas, los Shorts preliminares, las imágenes aprobadas anteriormente y las revisiones anteriores quedan intactos (ver confirmación en la sección 9).

---

## 0. Metodología y cómo leer este mapa

- Los **24 timecodes de bloque** se recalcularon a partir de `manifiesto.json` (duración real de cada bloque TTS) y de las **10 pausas importantes aprobadas** (8 "de frontera" entre bloques + 2 "internas" dentro de los bloques 1 y 24). El total cuadra exacto con los 2906,910s aprobados — ver verificación en la sección 1.
- A nivel de **bloque** se indica el recurso visual principal y, cuando aplica, un segundo recurso para alternar en bloques largos. A nivel de **toma individual** se da una duración aproximada y un conteo estimado de tomas por bloque (p. ej. "≈7 tomas de ~14s"), siguiendo el ritmo aprobado en la revisión 04 — no un timecode exacto para cada corte, porque eso depende de decisiones de montaje fino (dónde cae cada frase exacta dentro del bloque) que se resuelven igual que se hizo para las pruebas de 90s: con la alineación real de ElevenLabs en el momento de cortar, no de antemano.
- **Patrón de movimiento (igual en todo el mapa, salvo que se indique lo contrario):** zoom de 7–8% de cambio de escala total, dirección única sin ida y vuelta, hacia un punto focal fijo que nunca corta ojos, manos ni la Biblia. Reencuadres alternos (plano abierto / plano cerrado) cuando un mismo recurso cubre una sección larga.
- **Transiciones (igual en todo el mapa):** fundido cruzado de 0,75–1s entre dos reencuadres del mismo recurso; fundido cruzado de 1,5–2s entre recursos distintos. Sin pasar por negro, salvo que el guion lo justifique expresamente (no se identificó ningún punto en este guion que lo amerite — todas las pausas son "transición visual tranquila", igual que en las revisiones 03/04).
- **Partículas:** sistema canónico `estudio/lib/particulas.mjs`, preset `noche` (82 partículas, período 24s), superpuesto una sola vez sobre todo el video ya armado — igual que en la revisión 04 aprobada.
- Los recursos se identifican con una clave corta (`IMG1`, `HUM6`, `PIX6`, `N3`…) que remite al inventario (sección 2) y a la lista de imágenes nuevas (sección 5).

---

## 1. Verificación del timeline maestro

Duración de cada bloque tomada de `manifiesto.json` (campo `duracion_segundos`, audio real ya generado y aprobado). Entre bloques se suma 1s (unión normal aprobada) o la pausa importante correspondiente. Las pausas internas (bloque 1: 4s en 60,1865s; bloque 24: 4s en el punto de corte interno) se suman como expansión adicional dentro de su propio bloque, igual que se calculó y verificó para las pruebas de 90s anteriores.

**Total calculado: 2906,910s — idéntico al total aprobado (48:26,91). Diferencia: 0,000s.**

---

## 2. Mapa de los 24 bloques

| Tramo (mm:ss) | Bloque | Idea / frase principal | Emoción | Visual propuesto | Recurso | Movimiento | Tomas (≈dur.) | Transición | Pausa | Short |
|---|---|---|---|---|---|---|---|---|---|---|
| 0:00,000–1:40,410 | 1 | "Si el miedo no te deja dormir... Padre, aquí estoy... Amén." | Preocupación → entrega | Mujer despierta/preocupada → orando (ya aprobado, revisión 04) | **IMG1→IMG2** | Zoom 7,5–8% por toma, foco rostro/manos | 6 tomas (~14–20s, patrón ya aprobado) | 0,875s (mismo recurso) / 1,75s (cambio) | **Sí — Pausa 1 (interna, 60,1865–64,1865s)** | **Sí — Short 1 (0:00–1:00,208)** |
| 1:41,410–3:13,178 | 2 | "La noche suele hacer que las preocupaciones parezcan más grandes... llevarlos ante Dios" | Inquietud → disposición | Mujer con ojos cerrados, respiración, manta | **N1** | Zoom 7%, 2 reencuadres | 6 tomas (~15s) | 0,875 / 1,75s | No | No |
| 3:14,178–4:44,640 | 3 | "Padre celestial... Bajo los hombros. Aflojo las manos." | Vulnerabilidad / acercamiento | Manos entrelazadas sobre el pecho, sin rostro | **N2** | Zoom 7%, estático salvo deriva mínima | 6 tomas (~15s) | 0,875 / 1,75s | No | No |
| 4:45,640–6:06,019 | 4 | "Señor, te entrego lo que ocurrió hoy..." | Entrega | Mano sobre el corazón, mirada baja | **N3** | Zoom 7,5% | 5 tomas (~16s) | 0,875 / 1,75s | **Sí — Pausa 2 (frontera 4-5, 3s, al final)** | No |
| 6:09,019–7:37,339 | 5 | "...entremos en la Palabra. Señor, prepara mi corazón para escuchar." | Apertura / expectativa | Biblia cerrada, mano a punto de abrirla → inicia apertura hacia escena 6 | **N4 → IMG3 (parcial)** | Zoom 7%, pan sutil hacia el libro | 6 tomas (~15s) | 0,875 / 1,75s | **Sí — Pausa 3 (frontera 5-6, 4s, al final)** | No |
| 7:41,339–10:23,324 | 6 | "El que habita al abrigo del Altísimo... bajo unas alas" (Salmo 91) | Refugio / cercanía | Biblia abierta (cita visible) + detalle del salmo marcado | **IMG3 ⟷ N5** (alternando) | Zoom 7–8%, reencuadres alternos entre plano medio y detalle | 11 tomas (~15s) | 0,875 (mismo recurso) / 1,75s (al alternar) | No | No |
| 10:24,324–11:58,396 | 7 | Short 2 — "refugio, no fórmula"; "Diré yo a Jehová... en quien confiaré" | Confianza / decisión | Mujer con leve alivio en el rostro, luz de luna más marcada | **N6** | Zoom 7,5% | 7 tomas (~14s) | 0,875 / 1,75s | No | **Sí — Short 2 (10:24,617–11:14,410)** |
| 12:05,839–14:42,417 | 8 | "...ninguna oscuridad podía separarlos... que la prudencia no se convierta en ansiedad" | Protección realista / sabiduría | Ventana con cortina y luna, interior difuso en primer plano | **N7** | Zoom 7%, pan muy leve hacia la ventana | 10 tomas (~16s) | 0,875 / 1,75s | **Sí — Pausa 4 (frontera 7-8, 4s, al inicio del bloque)** | No |
| 14:43,417–17:12,707 | 9 | "El Guardián de Israel no se adormece ni duerme" (Salmo 121) | Vigilancia / soltar el control | Teléfono apagado en la mesilla + reencuadre de la ventana | **N8 ⟷ N7** | Zoom 7%, alternando detalle/ambiente | 10 tomas (~15s) | 0,875 / 1,75s | No | No |
| 17:13,707–19:32,130 | 10 | "No temas, porque yo estoy contigo" (Isaías 41:10) | Presencia / valor | Mujer con alivio (reencuadre) + ojos cerrándose | **N6 ⟷ HUM6** | Zoom 7,5–8% | 9 tomas (~15s) | 0,875 / 1,75s | **Sí — Pausa 5 (frontera 10-11, 4s, al final)** | No |
| 19:36,130–21:20,385 | 11 | "comienzo entregándote ese miedo que no sé nombrar" | Entrega corporal | Mujer abrazando una almohada contra el pecho | **N9** | Zoom 7% | 7 tomas (~15s) | 0,875 / 1,75s | No | No |
| 21:21,385–23:45,659 | 12 | "Señor, te entrego a mi familia..." | Amor / entrega por otros | Marco con fotos familiares en la mesilla + manos en oración | **N10 ⟷ HUM9** | Zoom 7% | 10 tomas (~14s) | 0,875 / 1,75s | **Sí — Pausa 6 (frontera 12-13, 4s, al final)** | No |
| 23:49,659–25:23,830 | 13 | "Padre, pongo mi hogar delante de ti..." | Gratitud / seguridad | Puerta del dormitorio entornada, luz cálida del pasillo | **N11** | Zoom 7% | 6 tomas (~16s) | 0,875 / 1,75s | No | No |
| 25:24,830–27:01,875 | 14 | "Señor, te entrego mi salud..." | Cuidado / vulnerabilidad corporal | Mano sobre el pecho/abdomen, respiración | **N12** | Zoom 7% | 6 tomas (~16s) | 0,875 / 1,75s | No | No |
| 27:02,875–29:29,239 | 15 | "...algunas personas llegan a esta oración después de recibir una noticia difícil" | Duelo / consuelo | Vela pequeña consumiéndose lentamente | **N13** | Zoom 7%, muy lento (tono solemne) | 10 tomas (~15s) | 0,875 / 1,75s | **Sí — Pausa 7 (frontera 15-16, 4s, al final)** | No |
| 29:33,239–31:06,757 | 16 | "Señor, pongo delante de ti mis finanzas y mi trabajo" | Inquietud práctica → entrega | Reloj analógico (no digital) en la mesilla | **N14** | Zoom 7% | 6 tomas (~15s) | 0,875 / 1,75s | No | No |
| 31:07,757–33:38,640 | 17 | "Padre, te entrego el día de mañana antes de que comience" | Anticipación → soltar | Reencuadre del reloj + manos sobre una Biblia cerrada | **N14 ⟷ HUM13** | Zoom 7–7,5% | 10 tomas (~15s) | 0,875 / 1,75s | No | No |
| 33:39,640–36:11,438 | 18 | "...pensamientos que regresan en círculos... Ayúdame a reconocer cuándo estoy rumiando" | Rumiación → discernimiento | Mujer, ojos abiertos/cerrados alternando + manta (reencuadre de N1) | **HUM6 ⟷ N1** | Zoom 7–8% | 10 tomas (~15s) | 0,875 / 1,75s | No | No |
| 36:12,438–37:47,393 | 19 | Short 3 — "esta noche te entrego aquello que mi mente no puede dejar de repetir" (cita Salmo 4:8) | Entrega final de pensamientos | Manos pasando páginas de la Biblia | **HUM13** | Zoom 7% | 6 tomas (~15s) | 0,875 / 1,75s | No | **Sí — Short 3 (36:12,310–37:10,567)** |
| 37:48,393–39:56,550 | 20 | "...quiero descansar también en quien tú eres... Gracias por..." | Gratitud | Mujer con la manta subida, cuerpo visiblemente más relajado | **N15** | Zoom 7% | 9 tomas (~14s) | 0,875 / 1,75s | **Sí — Pausa 8 (frontera 20-21, 4s, al final)** | No |
| 40:00,550–41:41,722 | 21 | "...permite que tu respiración encuentre un ritmo tranquilo... afloja la frente... baja los hombros" | Relajación física explícita | Reencuadre de N15 + mujer cerrando los ojos (clímax de HUM6) | **N15 ⟷ HUM6** | Zoom 7%, el más lento del video | 7 tomas (~14s) | 0,875 / 1,75s | **Sí — Pausa 9 (frontera 21-22, 5s, al final — la más larga)** | No |
| 41:46,722–44:33,723 | 22 | "Descansa bajo la imagen bíblica del abrigo del Altísimo..." | Paz profunda | Mujer orando ya relajada (reencuadre) + lago y estrellas | **IMG2 (reencuadre) ⟷ PIX6** | Zoom 7%, el lago con deriva casi imperceptible | 11 tomas (~15s) | 0,875 / 1,75s | No | No |
| 44:34,723–47:07,644 | 23 | "En paz me acostaré, y asimismo dormiré" (Salmo 4:8) | Paz / confianza final | Plano amplio de la cama completa + vía láctea/lago | **N16 ⟷ PIX2** | Zoom 7%, el más contemplativo | 10 tomas (~15s) | 0,875 / 1,75s | No | No |
| 47:08,644–48:26,910 | 24 | "Padre celestial, gracias por escuchar esta oración... Puedo descansar en Dios... Amén" | Descanso final | Lago nocturno (cierre, ya aprobado) + reencuadre | **IMG4 ⟷ PIX6** | Zoom 7%, cierre lento | 5 tomas (~16s) | 0,875 / 1,75s | **Sí — Pausa 10 (interna, ≈2900,47–2904,47s, cerca del final)** | No |

---

## 3. Estimación total de tomas

Sumando el conteo por bloque (sección 2): **189 tomas exactas** a lo largo de los 48:26,91 (el total real calculado, no un redondeo — "≈190" solo se usa en prosa como forma redondeada de referirse a la misma cifra). Promedio de ~15s por toma, dentro del rango 10–18s aprobado para contenido humano/bíblico; los pasajes de naturaleza contemplativa como el lago en los bloques 22–24 pueden extenderse a 20–30s, reduciendo ligeramente el conteo real en el montaje fino. Es una estimación de planeación — el montaje fino puede ajustarla ±10% al sincronizar con las frases reales.

## 4. Riesgos técnicos o visuales identificados

1. **Volumen de imágenes nuevas.** 16 imágenes nuevas (sección 5) es manejable, pero cada una debe pasar el mismo control de calidad que las 4 ya aprobadas (sin deformidades en manos/rostro, consistencia de iluminación nocturna, mismo "mundo visual" que las escenas existentes) antes de usarse — ningún control de este tipo se ha hecho todavía porque no se generó nada.
2. **Consistencia de personaje entre IA y recursos reales.** Las escenas generadas muestran a una mujer concreta (mismo rostro/dormitorio); los candidatos humanos de Pexels (6, 9, 13) son personas DISTINTAS (9 es incluso un hombre). Mezclar ambos tipos de recurso en el mismo video es una decisión editorial que el usuario debe confirmar explícitamente — lo señalamos aquí en vez de asumirlo.
3. **Candidato 9 (hombre).** Usado solo como plano secundario de manos/silueta en este mapa (bloques 8 y 12) para minimizar el choque de continuidad; si se prefiere evitarlo del todo, esos dos bloques necesitarían una imagen nueva adicional en su lugar.
4. **Candidato 6 (reloj digital visible).** Si se usa sin recortar esa esquina del encuadre, puede leerse como una pantalla encendida — igual que se señaló en el informe de candidatos originales.
5. **Pixabay de "luna compuesta" (#1, #3, #7, #8).** No se asignaron a ningún bloque de este mapa precisamente por verse como plantilla genérica, no como fotografía documental — quedan solo como respaldo de última instancia, no como ilustración principal.
6. **Bloque 1 ya aprobado — no tocar.** El mapa respeta íntegramente el tramo 0:00–1:40,41 tal como quedó en la revisión 04; cualquier ajuste futuro al resto del video no debe alterar ese tramo.
7. **Carga de generación.** 16 imágenes nuevas, aunque descritas aquí con detalle, representan una tanda de generación y aprobación propia (como la de `video_007_escenas_ai.zip`) antes de poder construir ninguna prueba del resto del video.
8. **Pausa 9 es la más larga (5s, bloques 21-22).** Es el punto de mayor libertad para una transición más marcada (p. ej. hacia el primer uso fuerte de naturaleza en el bloque 22) — ya reflejado en el mapa, pero vale la pena confirmarlo con el usuario antes de construir una prueba de esa zona.

---

## 5. Política de reutilización (ver detalle de imágenes nuevas en el apéndice `imagenes_nuevas_propuestas.md`)

- **Corrección (2026-10-18):** la afirmación original de que "ningún recurso se repite en bloques consecutivos" era incorrecta. Hay **tres repeticiones consecutivas deliberadas**, documentadas como continuidad narrativa intencional (el mismo encuadre acompaña dos bloques seguidos porque la emoción/escena continúa sin corte de set, no porque falte variedad): `N7` en los bloques 8–9 (vigilancia/ventana), `N14` en los bloques 16–17 (reloj, finanzas→mañana) y `N15` en los bloques 20–21 (relajación, gratitud→descanso progresivo). Fuera de esas tres excepciones explícitas, ningún otro recurso se repite en bloques consecutivos.
- Cada recurso reutilizado (fuera de esas tres continuidades) queda separado por varios minutos de otro contenido: `IMG2` aparece en el bloque 1 (~0–2 min) y vuelve a aparecer recién en el bloque 22 (~42 min) — veinte minutos de diferencia. `HUM6` aparece en los bloques 10, 18 y 21 (~17 min, ~34 min, ~40 min) — separado por 7–17 minutos cada vez. **Corrección (2026-10-18):** `PIX6` aparece en los bloques **22 y 24** (~42 min, ~47 min) — no en el bloque 6, que usa `IMG3 ⟷ N5` (Biblia abierta + detalle del Salmo 91).
- Las lunas/estrellas genéricas (Pixabay compuestas) quedan deliberadamente fuera del mapa principal — el guion tiene contenido humano y bíblico específico de sobra para no necesitarlas.
- El inicio aprobado de la revisión 04 (bloque 1 completo) no se modifica.
- **Conteo de imágenes adicionales necesarias:** con los 4 existentes + 3 candidatos humanos + 3 Pixabay reales utilizables (2, 5 como respaldo de Biblia, 6) + **16 imágenes nuevas**, el mapa cubre los 24 bloques sin repetir ningún recurso en bloques consecutivos. Esto cae dentro del rango de 12–20 imágenes nuevas que diste como punto de partida.

---

## 6. Preservación — confirmado

No se modificó la narración canónica, los 24 bloques TTS, la música, los Shorts preliminares, las imágenes aprobadas ni ninguna revisión anterior. La revisión 02 (clips de Pexels/Pixabay) permanece pausada, tal como se indicó, y no se retomó en esta tarea. Verificado con `git diff --stat` antes de comitear (ver sección de commit).

## 7. Pendiente

Tu aprobación de este mapa (o ajustes puntuales de bloque/recurso/emoción) antes de generar cualquiera de las 16 imágenes nuevas propuestas. No se ha renderizado el video largo ni los Shorts.
