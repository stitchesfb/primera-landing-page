# Video 8 — Escenas aprobadas (sustituyen los 6 briefs anteriores)

**Estado:** las 6 escenas recibidas, verificadas y persistidas.
**Fecha:** 2026-10-29 (actualizado: completadas E2 y E4)

## Esta selección sustituye los briefs anteriores

Orlando generó y aprobó en ChatGPT una hoja de contacto con 6 escenas distintas a las propuestas en `BRIEFS_6_IMAGENES.md` (que pedían evitar símbolos literales del salmo). Esta nueva selección **reemplaza** esos 6 briefs para el Video 8 — incluye imaginería literal (pastor con ovejas, valle) por decisión explícita del creador. No se regenera nada por diferencia con los briefs anteriores.

Las 6 escenas aprobadas, todas recibidas:

1. Dormitorio nocturno
2. Pastor con ovejas
3. Aguas tranquilas
4. Sendero
5. Valle
6. Mesa sencilla

## Origen de los 5 archivos recibidos y resolución de duplicados

Se recibieron 5 archivos (selección incompleta, con un dormitorio duplicado), identificados y verificados:

| Archivo recibido | Contenido | Resolución |
|---|---|---|
| `images/2.webp` | Dormitorio nocturno — **sin marca de número** | **Conservado** → `E1_dormitorio_nocturno.png` |
| `images/3.webp` | Mesa con pan, copa, vela, aceitunas y vista a la ventana | **Conservado** → `E6_mesa_sencilla.png` |
| `images/4.webp` | Valle con río, luna y montañas | **Conservado** → `E5_valle.png` |
| `images/5.webp` | Arroyo entre piedras y flores, luna reflejada en el agua | **Conservado** → `E3_aguas_tranquilas.png` |
| `images/6.webp` | Dormitorio nocturno — **con una marca "1" visible en la esquina superior izquierda**, y un tapiz enmarcado en la pared que no aparece en `2.webp` | **Descartado**, por instrucción explícita ("conserva solo el dormitorio final sin número") |

Las 4 imágenes conservadas se convirtieron de WebP a PNG sin pérdida adicional (mismo contenido, solo cambio de contenedor) y se guardaron en `originales/`, a 1672×941 — mismo estándar que N1–N16 del Video 7.

## Verificación de recorte vertical (9:16), individual y sin exigir centrado

Se probó un recorte vertical (529×941) para cada imagen, desplazado según dónde cae el punto de interés real — no centrado por defecto:

| Imagen | Resultado | Qué se pierde en el recorte |
|---|---|---|
| `E1_dormitorio_nocturno` | **Funciona bien.** Ventana, luna y colinas completas, cama en primer plano. | La lámpara y el velador (quedan fuera, a la izquierda). |
| `E2_pastor_con_ovejas` | **Funciona bien.** Pastor completo con su cayado, varias ovejas en el borde inferior. | El disco de la luna (solo queda su resplandor, no el disco completo); montañas lejanas. |
| `E3_aguas_tranquilas` | **Funciona muy bien** — quizás mejor que el horizontal: luna, reflejo y arroyo quedan alineados verticalmente. | Vegetación lateral (poca pérdida de interés). |
| `E4_sendero` | **Funciona muy bien.** Sendero completo serpenteando de abajo arriba, luna completa visible. | Montañas laterales (no afecta el punto focal). |
| `E5_valle` | **Funciona bien.** Luna, río serpenteante y primer plano rocoso conservados. | Montañas laterales (no afecta el punto focal). |
| `E6_mesa_sencilla` | **No se necesita versión vertical** — Orlando confirmó que se conserva completa en horizontal; ninguno de los 3 Shorts usa esta escena. | — |

Previsualizaciones del recorte: `pruebas_recorte_vertical/` (E1, E2, E3, E4, E5 — no se generó la de E6 por no ser necesaria).

## Las 6 escenas, completas

Con la llegada de **pastor con ovejas** (E2) y **sendero** (E4), las 6 escenas están completas y persistidas en `originales/`. Se construyó la prueba audiovisual de 60–90s — ver `estudio/proyectos/video_008/_generacion/mapa_visual/prueba_audiovisual_60_90s/`.
