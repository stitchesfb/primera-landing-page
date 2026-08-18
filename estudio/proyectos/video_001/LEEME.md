# video_001

Carpeta preparada para la primera importación. Sube aquí:

| Archivo | Qué es |
| --- | --- |
| `narration.txt` | El texto **exactamente como se narró**, párrafos separados por una línea en blanco |
| `audio_fuente/01.mp3` … `05.mp3` | Los cinco bloques, numerados en orden |

`edit_plan.json` **ya está escrito** con los límites reales del guion final:
bloques que terminan en los párrafos **33, 76, 113 y 159**, sobre un total de
**246**. `plan-auto` no lo toca; solo contrasta sus límites inferidos con
estos y avisa si discrepan.

Si tu `narration.txt` no trocea en exactamente 246 párrafos, la validación
**bloquea** antes de llamar a la API: los límites apuntarían a otro sitio. Los
párrafos se separan por **una línea en blanco**.

Cuando esté todo, lanza el workflow *Estudio — Checkpoint 1* con
`modo: importar` y `proyecto: video_001`.

Los MP3 se versionan porque el runner de Actions solo ve lo que hay en el
repositorio. Una vez validada la importación conviene borrarlos, para no
arrastrar ~35 MB por cada video en la historia.
