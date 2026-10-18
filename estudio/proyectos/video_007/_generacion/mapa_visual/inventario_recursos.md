# Video 7 — Inventario completo de recursos visuales

**Fecha:** 2026-10-15 · actualizado 2026-10-18
**Estado:** `imagenes_N1_N16_aprobadas`

Todos los recursos aquí listados ya fueron verificados (licencia, resolución, duración, inspección visual real de fotograma — no solo texto de la página). Este documento los reúne en un solo lugar para planear el video largo.

---

## A. Las 4 imágenes generadas aprobadas (uso confirmado — revisión 04)

| # | Archivo | Resolución | Orientación | Licencia/origen | Uso aprobado | Croppable 16:9 |
|---|---|---|---|---|---|---|
| 1 | `escena_01_mujer_preocupada.png` | 1672×941 | Horizontal (16:9 casi exacto) | Generada para el canal, uso propio | Apertura — mujer despierta/preocupada (0:00–0:25.461 del tramo aprobado) | Directo, sin recorte |
| 2 | `escena_02_mujer_orando.png` | 1672×941 | Horizontal | Generada para el canal | Mujer orando (0:25.461–1:00.1865) | Directo |
| 3 | `escena_03_biblia_abierta.png` | 1672×941 | Horizontal | Generada para el canal | Biblia abierta (1:04.1865–1:19.198) | Directo |
| 4 | `escena_04_lago_nocturno.png` | 1672×941 | Horizontal | Generada para el canal | Lago nocturno / paz (1:19.198–1:30) | Directo |

**Real/composición/IA:** las 4 son imágenes generadas (IA), revisadas visualmente sin deformidades en rostro, manos, Biblia, luna ni paisaje. Mismo dormitorio/lámpara/ventana consistente entre las escenas 1–3, lo cual es una ventaja para reencuadrar sin romper continuidad, pero también el motivo por el que **no conviene usarlas más de lo ya aprobado** sin generar variantes nuevas (ver sección de política de reutilización).

Ubicación: `estudio/proyectos/video_007/_generacion/preflight_visual/revision_03_imagenes_ai/escenas_originales/`.

---

## B. Candidatos humanos de Pexels (6, 9, 13) — seleccionados, aún no usados en ninguna prueba aprobada

| # | Título | Autor | Resolución fuente | Duración fuente | Licencia | Real/IA | Uso posible | Observación |
|---|---|---|---|---|---|---|---|---|
| 6 | A Woman Closing Her Eyes Trying to Sleep | cottonbro studio (Pexels) | 2732×1440 | 18,72s | Pexels License | Real | Mujer, empezando a calmarse / cerrando los ojos | Dormitorio real, luz cálida tenue, gesto genuino. **Reloj despertador digital iluminado visible en cuadro** (pantalla encendida, no teléfono) — recortar o difuminar esa esquina si se usa. |
| 9 | Man Praying while Kneeling Beside His Bed | Tima Miroshnichenko (Pexels) | 2560×1440 | 24,64s | Pexels License | Real | Oración junto a la cama (secundario) | **Es un hombre**, no la protagonista femenina de la narración — solo sirve como plano secundario de manos/silueta o para un segmento sin rostro visible. Luz más cálida/diurna que nocturna. |
| 13 | Person Reading the Bible | Tima Miroshnichenko (Pexels) | 2560×1440 | 13,88s | Pexels License | Real | Biblia — manos pasando páginas (Libro de Isaías) | Luz cálida de interior, más diurna que nocturna — corregible con gradación de color si se usa. |

**Croppable a 16:9:** los tres ya son 16:9 o casi exacto (2732×1440 = 1,90:1, recorte mínimo); no requieren recorte agresivo.

Ubicación: `estudio/proyectos/video_007/_generacion/preflight_visual/candidatos_humanos/descargas_fuente/` (c06, c09, c13). Índice completo de los 13 candidatos originalmente investigados: `candidatos_humanos/indice_candidatos.json`.

---

## C. Los 8 videos de Pixabay seleccionados por el usuario

| # | Título | ID | Autor | Resolución real (ffprobe) | Duración real | Orientación | Licencia | Croppable 16:9 | Real / composición / IA |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Ocean, Sea, Waves (luna entre ramas) | 174033 | redzy | 2160×3840 | 7,04s | Vertical | Pixabay Content License | Requiere recorte vertical→horizontal; se pierde gran parte del alto, viable pero ajustado | **Composición digital**: silueta de ramas de aspecto pintado/vectorial, halo de luna aerografiado, textura de agua estilizada — no lee como toma documental de una sola cámara |
| 2 | Milky Way, Heaven, Starry Sky | 10339 | (no identificado en la página) | 1620×1080 | 13,88s | Horizontal (3:2, no 16:9 exacto) | Pixabay Content License | Sí, recorte leve de alto (1080→911px), se pierde poco | **Real** — astrofotografía de larga exposición genuina (montañas, Vía Láctea, reflejo en lago), muy auténtica |
| 3 | Moon, Full Moon, Sea | 144543 | Mohamed_hassan | 1920×1080 | 18,00s | Horizontal | Pixabay Content License | Directo, ya 16:9 | **Composición digital**: luna desproporcionadamente grande y nítida frente a un primer plano oscuro difuso, niebla artificial, silueta de rama pegada — plantilla de "luna superpuesta" |
| 4 | Waterfall, Mountain Stream | 228847 | josefgadermaier | 2160×3840 | 20,40s | Vertical | Pixabay Content License | Requiere recorte vertical→horizontal, viable | **Real** — cascada/bosque genuino, pero **de día** (luz verde brillante) — no sirve para el perfil nocturno sin regradar agresivamente, y aun así es dudoso |
| 5 | Bible, Book, Read, Pray | 70216 | Josh_Malic | 3840×2160 | 23,77s | Horizontal | Pixabay Content License | Directo, ya 16:9 | **Real** — fotografía/video genuino de lentes sobre una Biblia abierta, luz práctica cálida; encaja muy bien con "Biblia en la mesilla" |
| 6 | Sky, Stars, Lake | 37697 | josefgadermaier | 3840×2160 | 6,44s | Horizontal | Pixabay Content License | Directo, ya 16:9 | **Real** — timelapse/larga exposición genuino, Venus/Marte visibles cerca del horizonte, árboles reflejados en el lago — el más fuerte del lote para "paz/naturaleza" |
| 7 | Moon, Full Moon, Sea, Ocean | 148100 | immikhan06 | 1920×1080 | 35,77s | Horizontal | Pixabay Content License | Directo, ya 16:9 | **Composición digital**: misma familia que #3 — luna recortada y pegada sobre rocas oscuras, reflejo demasiado perfecto |
| 8 | Moon, Night, Tree | 37363 | ZAIDoopro | 1920×1080 | 28,40s | Horizontal | Pixabay Content License | Directo, ya 16:9 | **Composición digital**: silueta de rama + luna flotante con halo suave — mismo patrón de plantilla que #1 y #3 |

**Resumen de uso recomendado:** de los 8, solo **#2, #5 y #6** se leen como grabación/fotografía real sin reservas (y #6 ya fue usado en la prueba `revision_02`, pausada). **#1, #3, #7 y #8** son composiciones digitales de "luna pegada" — utilizables como recurso de último respaldo si hace falta metraje nocturno genérico, pero no como ilustración principal de ningún momento específico del guion, y conviene no abusar de ellos (coincide con la política de reutilización, sección E). **#4** queda descartado para el perfil nocturno por ser diurno.

Ninguno de los 8 fue descargado de nuevo en esta tarea — los archivos ya verificados siguen en el scratchpad de la sesión (`pixabay_verificacion/`), no en el repositorio (no se comprometieron porque el enfoque de la revisión 02 quedó pausado).

---

## D. Imágenes nuevas N1–N16 — aprobadas e importadas (2026-10-18)

Generadas, aprobadas visual y editorialmente por Orlando el 2026-10-18, importadas **sin modificar, reencodificar ni renombrar**. Verificación: 16/16 PNG, hashes SHA-256 coinciden con `SHA256SUMS.txt` (16/16 OK).

| ID | Archivo | Dimensión | Bloque(s) | Short | Uso |
|---|---|---|---|---|---|
| N1 | `N1_mujer_aquietandose.png` | 1672×941 | 2, 18 | — | Mujer empezando a aquietarse |
| N2 | `N2_manos_entrelazadas_pecho.png` | 1672×941 | 3 | — | Manos entrelazadas sobre el pecho (versión corregida y aprobada) |
| N3 | `N3_mano_sobre_corazon.png` | 1672×941 | 4 | — | Mano sobre el corazón |
| N4 | `N4_biblia_cerrada_antes_de_abrir.png` | 1672×941 | 5 | — | Biblia cerrada, antes de abrir |
| N5 | `N5_biblia_abierta_salmo_91.png` | 1672×941 | 6 | — | Biblia abierta, Salmo 91 |
| N6 | `N6_mujer_alivio_sutil.png` | 1672×941 | 7, 10 | **Short 2** | Mujer con alivio sutil — base visual prevista para el Short 2 (aún no renderizado) |
| N7 | `N7_ventana_cortina_luna.png` | 1672×941 | 8, 9 | — | Ventana con cortina y luna — repetición consecutiva deliberada |
| N8 | `N8_telefono_apagado_boca_abajo.png` | 1672×941 | 9 | — | Teléfono apagado boca abajo |
| N9 | `N9_mujer_abrazando_almohada.png` | 1671×941 | 11 | — | Mujer abrazando una almohada |
| N10 | `N10_marco_familiar_desenfocado.png` | 1672×941 | 12 | — | Marco familiar desenfocado |
| N11 | `N11_puerta_entornada_luz_calida.png` | 1672×941 | 13 | — | Puerta entornada, luz cálida |
| N12 | `N12_mano_pecho_abdomen.png` | 1672×941 | 14 | — | Mano sobre el pecho/abdomen |
| N13 | `N13_vela_pequena.png` | 1672×941 | 15 | — | Vela pequeña |
| N14 | `N14_reloj_analogico.png` | 1672×941 | 16, 17 | — | Reloj analógico — repetición consecutiva deliberada |
| N15 | `N15_mujer_relajacion_intermedia.png` | 1672×941 | 20, 21 | — | Mujer, relajación intermedia — repetición consecutiva deliberada |
| N16 | `N16_plano_amplio_cama.png` | 1672×941 | 23 | — | Plano amplio de la cama |

**Nota de dimensión:** N9 mide 1671×941 (1px más angosta que el resto) — diferencia trivial, no afecta el encuadre 16:9 ni requiere corrección.

**Estilo verificado:** mujer latina adulta con apariencia realista, continuidad visual nocturna, paleta azul con luz cálida moderada, sin texto incrustado, sin logotipos, sin deformidades visibles, sin representación de Jesús — consistente con el estilo aprobado en la revisión 04 y las 4 imágenes originales.

Ubicación: `estudio/proyectos/video_007/_generacion/mapa_visual/imagenes_N1_N16_aprobadas/`.

---

## E. Resumen numérico

| Categoría | Cantidad | Listos para 16:9 directo | Requieren recorte | Reales | Composición digital / IA |
|---|---:|---:|---:|---:|---:|
| Imágenes generadas aprobadas (originales) | 4 | 4 | 0 | 0 (son IA, sin deformidades) | 4 (IA) |
| Imágenes nuevas aprobadas (N1–N16) | 16 | 16 | 0 | 0 (son IA, sin deformidades) | 16 (IA) |
| Candidatos humanos Pexels | 3 | 3 (recorte mínimo) | 0 | 3 | 0 |
| Pixabay | 8 | 5 | 3 (1, 4, y 2 con recorte leve) | 3 (#2, #5, #6) | 4 (#1, #3, #7, #8) |
| **Total recursos disponibles** | **31** | | | | |
