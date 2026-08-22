# Musica de origen

Pistas descargadas de la Biblioteca de audio de YouTube. Son **material de
origen**, no salida del pipeline: no las genera nada y no se regeneran. Nada
las modifica ni las sobreescribe — quien las use trabaja siempre sobre una
copia temporal.

| archivo | pieza | autor |
|---|---|---|
| `one_step_closer.mp3` | One Step Closer | Aakash Gandhi |
| `alone_with_my_thoughts.mp3` | No.7 Alone With My Thoughts | Esther Abrami |
| `touching_moment.mp3` | Touching Moment | Wayne Jones |

Las tres: mp3 320 kbps, 44,1 kHz, estereo. Duran entre 2:12 y 2:28, bastante
menos que un video nocturno, asi que una cama construida con ellas tendra que
repetirlas; quien lo haga deja constancia en el informe.

Viven aqui, dentro de `estudio/`, y no en la raiz del repositorio: ahi arriba
esta la landing page que publica Vercel, y unos mp3 en `assets/` acabarian
servidos como archivos de la web.

## Aprobadas para el perfil nocturno

Las tres quedan aprobadas como biblioteca de *Oraciones de la Noche* el
2026-08-22. No hace falta usar siempre la misma: un proyecto puede nombrar la
suya en su `edit_plan.json` con `"musica": "<archivo>"`, y si no dice nada se
reparten por orden. Rotar no es un capricho — escuchar la misma cama en cada
video la convierte en la firma del canal, y aqui la firma es la voz.

Como se usan:

- **nivel plano**: -23 dB bajo la narracion y -23 dB en los interludios. La
  cama no sube nunca. Hay una validacion que lo comprueba antes de generar.
- **normalizadas**: cada pista se ajusta a -33,5 LUFS con el ducking puesto.
  Vienen entre -17,0 y -27,7 LUFS, asi que sin igualarlas cambiar de pista
  entre videos cambiaria el volumen del canal.
- **en bucle con cruce**: se recortan los fundidos propios de la pista y la
  vuelta se cruza cuatro segundos.
