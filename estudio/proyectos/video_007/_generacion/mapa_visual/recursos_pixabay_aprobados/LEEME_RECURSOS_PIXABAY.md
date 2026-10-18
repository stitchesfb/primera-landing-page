# Video 7 — Recursos Pixabay canónicos (PIX2, PIX6)

Copia canónica dentro del repositorio de los dos únicos videos de Pixabay que el
mapa visual aprobado usa (de los 8 verificados originalmente en
`inventario_recursos.md`, sección C). Antes de esta copia, ambos archivos
existían solo en el scratchpad de la sesión (ruta dependiente de sesión,
`/tmp/claude.../pixabay_verificacion/`), lo que hacía que `plan_tomas_v3.json`
no fuera reproducible en otra máquina. Se copian sin recodificar ni modificar
(mismo contenido, solo renombrados para que el nombre identifique el recurso).

## PIX2 — `pix2_10339_milky_way_heaven_starry_sky.mp4`

| Campo | Valor |
|---|---|
| Título Pixabay | Milky Way, Heaven, Starry Sky |
| ID Pixabay | 10339 |
| URL canónica | https://pixabay.com/videos/milky-way-heaven-starry-sky-night-10339/ |
| Licencia | Pixabay Content License ("Free for use") |
| Autor | No identificado en la página de Pixabay (verificado de nuevo en esta tarea) |
| Resolución declarada en Pixabay | 1920×1280 |
| Resolución real del archivo (ffprobe) | 1620×1080 (códec h264) |
| Duración real (ffprobe) | 13,880s |
| SHA-256 | `cf7b1a14b057136129ef9cae724faa26bb8a3515b77deb28c4d597e657ff4e70` |
| Uso en el mapa aprobado | Bloque 23 (junto con N16) |

## PIX6 — `pix6_37697_sky_stars_lake.mp4`

| Campo | Valor |
|---|---|
| Título Pixabay | Sky, Stars, Lake |
| ID Pixabay | 37697 |
| URL canónica | https://pixabay.com/videos/sky-stars-lake-landscape-night-37697/ |
| Licencia | Pixabay Content License ("Free for use") |
| Autor | josefgadermaier |
| Resolución (ffprobe, 4K) | 3840×2160 (códec h264) |
| Duración real (ffprobe) | 6,440s |
| SHA-256 | `2677e1265c82fff9f5a189a18bc07d3b31571f56ed48fbe0c1265c7fcd796e1b` |
| Uso en el mapa aprobado | Bloques 22 y 24 (junto con IMG2 y con IMG4 respectivamente) |

Ambos verificados de nuevo contra la página de Pixabay el 2026-10-18 (URL, licencia,
resolución declarada, autor) además de la verificación original ya registrada en
`inventario_recursos.md`. Los otros 6 videos de Pixabay descartados (#1, #3, #4, #5,
#7, #8) no se usan en el mapa aprobado y no se copian aquí — siguen documentados
solo en `inventario_recursos.md`.
