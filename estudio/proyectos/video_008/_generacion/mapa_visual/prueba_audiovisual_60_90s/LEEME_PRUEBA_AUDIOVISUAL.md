# Video 8 — Prueba audiovisual (77,02s): narración v3 + música + reencuadres suaves

**Estado:** para revisión de Orlando, antes del render completo.
**Fecha:** 2026-10-29
**Archivo:** `video_008_prueba_audiovisual_60_90s.mp4` — 1920×1080, 30fps, h264/aac, 77,02s. SHA-256: `00516c343b65877f60eacfd19f079362557a7732182943196d8c28decf54087e`.

## Qué contiene

En vez de un fragmento continuo desde el segundo 0, se reunieron **fragmentos representativos alrededor de las 5 transiciones** entre las 6 escenas aprobadas (como autorizaste) — es la forma más directa de juzgar cómo se ven los cambios de escena, ya que cada imagen se sostiene varios minutos en el video real y un tramo continuo desde el inicio solo mostraría una o dos escenas.

| Tramo | Transición | Punto de corte (narración v3) | Duración | Nota |
|---|---|---|---:|---|
| T1 | Dormitorio → Pastor | 4:01,92 (frontera bloque 2/3) | 14s | Corte visual durante narración continua, sin pausa de por medio |
| T2 | Pastor → Aguas tranquilas | 7:43,09–7:50,09 (pausa P03, 7s) | 21s | Incluye la pausa completa — el cambio de escena ocurre durante el silencio, con el corte justo al iniciar la pausa |
| T3 | Aguas tranquilas → Sendero | 15:36,67 (frontera bloque 8/9) | 14s | Corte visual durante narración continua |
| T4 | Sendero → Valle | 21:28,43 (frontera bloque 11/12) | 14s | Corte visual durante narración continua |
| T5 | Valle → Mesa sencilla | 26:53,81 (frontera bloque 14/15) | 14s | Corte visual durante narración continua |

Cada tramo tiene ~7s antes y ~7s después del punto de corte (T2 tiene 7s antes + los 7s completos de la pausa + 7s después, para mostrar la pausa entera).

## Reencuadres suaves aplicados

Cada sub-segmento usa el método de "tomas con reencuadre" aprobado: zoom del 3,5% (dentro del rango 3–4% acordado) sobre la imagen fija de esa escena, con partículas del preset "noche" del canal (82, periodo 24s) superpuestas.

**Importante sobre el zoom en esta prueba:** para poder juzgarlo en un clip de 7s, el zoom completa su recorrido total DENTRO de esos 7s (modo "recorrido completo" del renderizador, ya usado en el Video 7 con el mismo propósito). En el video final, esa misma imagen se sostiene varios minutos, así que el mismo 3,5% de zoom se repartirá mucho más lento y se sentirá más sutil que aquí — este clip exagera la velocidad del movimiento a propósito, para poder evaluarlo.

## Música

`touching_moment.mp3` (Wayne Jones), la pista propuesta por rotación del canal. Se midió su sonoridad real (−17,0 LUFS, coincide con el valor registrado en `canal.json`) y se calculó la ganancia de normalización necesaria para llegar, tras aplicar el ducking de −23dB del perfil nocturno, a los −33,5 LUFS objetivo de la cama aprobada. El ducking es plano: −23dB tanto bajo la voz como en la pausa (regla del perfil nocturno — la música no sube en los silencios), igual que en el Video 7.

## Narración

Extraída directamente de `video_008_narracion_completa_sin_musica_con_pausas_v3.mp3` (la aprobada), sin modificar.

## Qué falta decidir

1. Si el ritmo del zoom (recordando que aquí está acelerado a propósito para poder verlo) se siente bien encaminado para el video completo.
2. Si las 6 escenas y sus transiciones funcionan en la narrativa del video.
3. Nivel de la música — se calculó siguiendo la regla del canal, pero conviene confirmarlo al oído.
4. Tras tu aprobación, se arma el mapa completo de tomas (todas las repeticiones de cada escena a lo largo de sus bloques) y se procede al render completo del video largo.

**No se ha hecho el render completo. No se ha tocado la narración aprobada ni ninguna escena.**
