# Video 9 — Las 7 escenas aprobadas y el render completo

**Estado:** master entregado para revisión de Orlando. **No se ha publicado nada.**
**Fecha:** 2026-11-08

## Mapa de escenas (ubicadas por el inicio real de cada sección en la narración v1)

| Escena | Archivo | Sección del guion | Inicio | Fin | Duración |
|---|---|---|---:|---:|---:|
| E1 | E_cansancio.png | 1. Cuando todos descansan... | 0:00,00 | 2:10,36 | 2:10,36 |
| E2 | E_biblia_abierta.png | 2. La invitación de Jesús | 2:10,36 | 5:01,55 | 2:51,19 |
| E03 | VIDEO_009_03_CUIDAR_DE_OTROS.png | 3. Cuando cuidar de todos te deja sin fuerzas | 5:01,55 | 9:39,20 | 4:37,65 |
| E04 | VIDEO_009_04_CULPA_AL_DESCANSAR.png | 4. La culpa que aparece cuando te detienes | 9:39,20 | 14:23,84 | 4:44,63 |
| E05 | VIDEO_009_05_MANSEDUMBRE.png | 5. Aprender de un corazón manso y humilde | 14:23,84 | 19:09,98 | 4:46,15 |
| E06 | VIDEO_009_06_ENTREGAR_LO_PENDIENTE.png | 6. Lo que queda pendiente puede ser encomendado | 19:09,98 | 24:12,28 | 5:02,30 |
| E07 | VIDEO_009_07_DEJAR_TERMINAR_EL_DIA.png | 7. Dejar que termine el día | 24:12,28 | 27:34,91 | 3:22,63 |

Las fronteras de secciones 2, 5, 6 y 7 caen exactamente en un cambio de bloque TTS (ya verificado acústicamente en tareas anteriores). Las de las secciones 3 y 4 caen a mitad de un bloque (dentro del bloque 4 y del bloque 6 respectivamente); se ubicaron localizando el carácter exacto donde empieza el primer párrafo de esa sección en la alineación de ElevenLabs de ese bloque, igual método usado en todo este proyecto.

## Tratamiento visual — una sola rampa de zoom por imagen, luego encuadre fijo

Por pedido expreso de Orlando: en cada imagen el zoom sube **una sola vez** hasta su encuadre final (mismos valores ya aprobados en la prueba de Mateo: +3,5% en 23,06s) y después se **mantiene fijo en ese encuadre** hasta el cambio de escena — sin reiniciar ni seguir avanzando.

**Cómo se evita el costo de zoompan en todo el video:** cada escena se construye en dos partes — una *rampa* corta (23,06s, con zoompan real) y un *sostenido* (el resto de la escena, de 1,8 a 4,7 minutos según la escena) que es **el último fotograma exacto de la rampa, congelado** — sin ningún cálculo de zoompan, igual de barato que el baseline `imagen_fija_particulas` del canal. Las dos partes se unen sin fundido porque son literalmente el mismo encuadre en el mismo instante: no hay salto. Esto es lo que mantiene acotado el costo de render (DECISIONES_CERRADAS #14 sigue vigente: nunca zoompan calculado sobre los ~27 minutos completos).

Fundidos cruzados entre escenas: **1,4s** entre E1→E2 (cae dentro de la pausa 1, ya aprobado en la prueba de Mateo) y **1,0s** en las otras 5 transiciones (dentro del rango aprobado 0,75-1,5s).

## Audio

- **Narración:** `video_009_narracion_completa_sin_musica_v1.mp3` íntegra, sin tocar (sha256 `c4f523363dfa0c8d29248b727309ce2d866b31aff419e855ff642dbe7a55b778`).
- **Música:** `one_step_closer.mp3`, misma mezcla aprobada en la prueba de Mateo (ducking plano -23dB bajo voz e interludio), ahora con el fundido de apertura real (4s, `canal.json`) en el minuto 0 y un fundido de cierre simétrico (4s) al final real del video — ninguno de los dos aplicaba en la prueba de 90s porque esa ventana no cubría ni el inicio ni el final reales.
- **Partículas:** preset "noche" (82, periodo 24s), igual que siempre.

## Verificación técnica

- Decodificación completa sin errores.
- Duración: 1654,933s (objetivo 1654,909s — diferencia de 0,024s, cuantización normal de codificación).
- Resolución 1920×1080, 30fps, h264/aac.
- Se revisaron por fotograma: el inicio (0,5s), las 6 transiciones de escena y el cierre (últimos 0,5s) — cada una muestra la escena correcta, sin cuadros negros ni corrupción, con el fundido visible en curso en los puntos de transición capturados a mitad del cruce.
- Sin silencio digital absoluto en los primeros ni últimos 2 segundos de audio.
- `video_007` y `video_008` verificados intactos. `canal.json` no se modificó.

## Pendiente

1. Aprobación de Orlando del master completo.
2. Los 3 Shorts del Video 9 — se entregan aparte, no forman parte de esta entrega.
3. Miniatura: ya recibida (`VIDEO_009_MINIATURA.jpg`, en `_generacion/publicacion/`), separada del render; no requiere más trabajo de esta sesión salvo que Orlando pida ajustes.
