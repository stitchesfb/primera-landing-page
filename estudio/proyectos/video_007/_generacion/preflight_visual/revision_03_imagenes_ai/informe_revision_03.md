# Video 7 — Prueba audiovisual de 90 segundos, revisión 03 (imágenes aprobadas + Ken Burns)

**Estado:** `prueba_audiovisual_90s_revision_03_pendiente_aprobacion`
**Fecha:** 2026-10-08
**Archivo:** `preflight_visual/revision_03_imagenes_ai/prueba_audiovisual_90s_revision_03_pendiente_aprobacion.mp4`

Esta prueba es independiente de la `revision_02` (clips de video de Pexels/Pixabay, que quedó a medio construir y no se entrega aquí). Por instrucción explícita del usuario, **no se usó ningún candidato humano de Pexels ni ningún clip de video anterior** — únicamente las 4 imágenes aprobadas.

## 1. Imágenes de origen — integridad

Las 4 imágenes se recibieron en `video_007_escenas_ai.zip`, se extrajeron en un directorio aislado y **no se modificaron en ningún momento** (solo se leyeron para generar las animaciones). Hashes SHA-256 registrados antes y después de todo el proceso — idénticos:

| Archivo | Dimensiones | SHA-256 |
|---|---|---|
| `escena_01_mujer_preocupada.png` | 1672×941 | `e7f9e74a80f37718083b53d55212d3f54b1899597eb48202ca5153342c44820d` |
| `escena_02_mujer_orando.png` | 1672×941 | `ab1446cb19d8352d2385a54d77992300e35921cc73173e10f0c1732e2c79a9a6` |
| `escena_03_biblia_abierta.png` | 1672×941 | `0eefcde2f508b52429fd51ba2c80b1d970ce11da3411e14ef5a1db262fc32fdf` |
| `escena_04_lago_nocturno.png` | 1672×941 | `933a148c53e1b3522a9d86f83ae713400beb2191e89993dd8c637b6f6d5a4484` |

Copias intactas conservadas en `escenas_originales/`.

Revisión visual de cada imagen: sin deformidades visibles en rostro, manos, Biblia, luna ni paisaje; sin texto, partículas ni efectos sobrenaturales; las tres escenas de interior comparten el mismo dormitorio/lámpara/ventana (consistencia visual entre tomas).

## 2. Sincronización con las frases reales (no con intervalos mecánicos)

Se recalcularon los tiempos exactos de los límites de frase en `narracion_revision_03_sin_musica.mp3` (bloque 1) a partir de la alineación real de ElevenLabs (`audio/bloques/1.alignment.json`), con la misma herramienta usada para los Shorts y la pausa aprobada (`lib_local/mapaAlineacion.mjs`).

**Nota técnica:** en el proceso se encontró y corrigió otro caso del mismo tipo de desajuste ya conocido en esa librería: en el bloque 1, el salto de párrafo "\n\n" **no** se colapsa a un solo carácter en la alineación de ElevenLabs (sí ocurre en otros bloques). La función intentaba forzar ese colapso antes de probar la coincidencia directa, lo cual rompía el cálculo para este bloque. Se corrigió para que primero intente la coincidencia directa y solo recurra al colapso si esta falla. Se verificó que el punto de corte de la pausa 1 ya aprobado (60.1865s) se reproduce exactamente igual con la función corregida — ningún valor previamente aprobado cambió.

| Tramo | Rango ajustado a frase real | Duración | Texto de la narración en ese tramo |
|---|---|---:|---|
| Escena 1 | 0,000s – 25,461s | 25,461s | "Si el miedo no te deja dormir esta noche... En este momento, no tienes que resolverlo todo." |
| Escena 2 | 25,461s – 60,1865s | 34,726s | "Puedes respirar lentamente... Padre, aquí estoy... Amén." |
| Pausa aprobada | 60,1865s – 64,1865s | 4,000s | (silencio digital, pausa importante 1 ya aprobada) |
| Escena 3 | 64,1865s – 79,198s | 15,012s | "Ahora, sin apresurarte... delante de Dios con sinceridad." |
| Escena 4 | 79,198s – 90,000s | 10,802s | "Si tu corazón está acelerado, Dios lo sabe..." |

Los cortes de 25,461s y 79,198s se ajustaron unos segundos respecto a los "~0:25" y "~1:19" propuestos para caer exactamente en el final de una frase real, tal como pediste.

## 3. Animación (Ken Burns) por escena

Técnica: zoom lineal muy lento hacia un punto focal fijo (sin ida y vuelta, sin inversión), que produce de forma implícita un desplazamiento suave hacia ese punto — sin capas ni parallax (una sola imagen plana por escena, sin separación artificial de planos).

| Escena | Duración de animación (incluye fundidos) | Zoom | Punto focal | Motivo del punto focal |
|---|---:|---|---|---|
| 1 — mujer preocupada | 26,461s | 1,000 → 1,045 (4,5%) | Rostro/mano en la mejilla | Centra la preocupación en su expresión |
| 2 — mujer orando | 38,726s | 1,000 → 1,040 (4,0%) | Manos juntas / rostro | Acompaña el gesto de oración sin moverse hacia la ventana |
| 3 — Biblia abierta | 19,012s | 1,000 → 1,035 (3,5%) | Libro abierto / mano | Guía la mirada hacia el texto, no hacia la lámpara |
| 4 — lago nocturno | 11,802s | 1,000 → 1,030 (3,0%) | Luna y su reflejo en el agua | Punto de mayor luz/calma de la imagen |

Todos los zooms están dentro del rango 3–5% pedido. Ningún movimiento se invierte ni acelera/ralentiza de forma perceptible (velocidad de zoom constante y lineal en cada escena).

## 4. Transiciones

Fundidos cruzados (disolución directa imagen-a-imagen, **sin pasar por negro** en ningún momento) de 2,0s cada uno, centrados en los cortes de frase:

- **24,461s–26,461s:** escena 1 → escena 2 (durante la narración, no en silencio).
- **61,1865s–63,1865s:** escena 2 → escena 3, **enteramente dentro de los 4s de la pausa aprobada** (60,1865–64,1865s), con 1s de margen silencioso antes y después del fundido — transición visual tranquila durante el silencio, sin fundido a negro.
- **78,198s–80,198s:** escena 3 → escena 4 (durante la narración).

Verificado visualmente (fotogramas en el punto medio de cada transición): disolución limpia, sin bordes duros, sin parpadeo, sin pasar por un fotograma negro.

## 5. Audio — sin cambios respecto a la prueba anterior

- Se reutilizó el **mismo archivo de mezcla** ya construido (narración + `alone_with_my_thoughts.mp3`, mismos niveles: música a −33,5 LUFS objetivo, voz sin tocar, fundido de entrada de música de 4s) — es el mismo audio binario de la primera prueba de 90s, no una regeneración. Así la comparación entre pruebas es puramente visual, como pediste.
- La narración proviene de `narracion_revision_03_sin_musica.mp3` (`narracion_aprobada`); **no se llamó a ElevenLabs y no se modificó ni un byte de la voz.**
- Sin subtítulos, sin sonidos ambientales adicionales.
- Audio presente y estable en las 6 ventanas de 15s que cubren todo el clip (incluida la que contiene la pausa de 4s); media entre −21,8 y −22,5 dB en todas.

## 6. Especificaciones técnicas del entregable

| Campo | Valor |
|---|---|
| Contenedor | MP4 |
| Códec de video | H.264, perfil **Main**, nivel **4.0** |
| Formato de píxel | yuv420p |
| Resolución | 1280×720 |
| Framerate | 30 fps constantes |
| Códec de audio | AAC-LC, estéreo, 44.100 Hz |
| `faststart` | Sí (verificado: `moov` antes de `mdat`) |
| Duración | 90,000s exactos |
| Tamaño | 16,4 MB (< 24 MiB pedidos) |
| Decodificación completa | Verificada (`ffmpeg -v error -i ... -f null -`), sin errores |

## 7. Confirmaciones

- Las 4 imágenes originales permanecen intactas (hashes verificados antes/después).
- No se usaron candidatos humanos de Pexels ni clips de video de la revisión anterior.
- No se modificó la narración aprobada ni se llamó a ElevenLabs.
- No se renderizó el video largo ni los Shorts.
- Sin partículas, rayos, texto ni efectos "sobrenaturales" añadidos — solo zoom/encuadre sobre las imágenes tal como se recibieron.
- Sin parallax simulado (una sola capa plana por escena).
- Sin fundidos prolongados a negro en ningún punto, incluida la pausa.

## 8. Archivos de este entregable

- `prueba_audiovisual_90s_revision_03_pendiente_aprobacion.mp4` — la prueba.
- `escenas_originales/` — las 4 imágenes aprobadas, intactas.
- `verificacion/frame_0010_mujer_preocupada.jpg`, `frame_0040_mujer_orando.jpg`, `frame_0075_biblia.jpg` — fotogramas de comprobación.
- `informe_revision_03.md` — este informe.

## 9. Pendiente

Tu aprobación visual de esta versión frente a la `revision_02` (clips de video) y la prueba original (naturaleza genérica, rechazada). No se ha renderizado nada más allá de esta prueba de 90s.
