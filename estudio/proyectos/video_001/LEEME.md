# video_001

Carpeta preparada para la primera importación. Sube aquí:

| Archivo | Qué es |
| --- | --- |
| `narration.txt` | El texto **exactamente como se narró**, párrafos separados por una línea en blanco |
| `audio_fuente/01.mp3` … `05.mp3` | Los cinco bloques, numerados en orden |

**No hace falta escribir `edit_plan.json`**: el workflow lo genera solo con
`plan-auto`, deduciendo los límites de bloque de las duraciones del audio.

Cuando esté todo, lanza el workflow *Estudio — Checkpoint 1* con
`modo: importar` y `proyecto: video_001`.

Los MP3 se versionan porque el runner de Actions solo ve lo que hay en el
repositorio. Una vez validada la importación conviene borrarlos, para no
arrastrar ~35 MB por cada video en la historia.
