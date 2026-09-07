# Video 6 — previews de música (pase 7, solo previews, sin render completo)

Música: `estudio/assets/music/one_step_closer.mp3` ("One Step Closer", Aakash
Gandhi, Biblioteca de audio de YouTube) — única pista, sin combinar.

## Cama musical completa (calculada para los 2998.674286s reales del maestro)

- Región útil de la pista tras recortar sus propios fundidos: 117.9s
  (recorta 1.2s de entrada y 12.9s de salida).
- Crossfade de vuelta: **4.000s exactos**, potencia constante (raíz
  cuadrada), confirmado por `cruceSegundos: 4` devuelto por `camaDesdeArchivo`.
- Periodo de bucle resultante: 113.9s (117.9 − 4). 27 vueltas a lo largo del video.
- Nivel: plano, −23 dB bajo la narración y en los interludios (sin
  ducking, la misma constante en ambos casos).
- Fade-in global: 4s (t=0). Fade-out final: 30s (coincide con
  `edit_plan.json → outro.fade_out`, sobre los 90s finales sin voz reservados
  para música).
- **LUFS sin corregir (ganancia 0dB): −40.9 LUFS.**
- **Ganancia correctiva aplicada: +5.400 dB.**
- **LUFS final medido de la cama terminada: −35.5 LUFS** (coincide
  exactamente con el objetivo pedido).
- Pico verdadero final: −22.8 dBFS (sin clipping).

Datos completos en `datos/resultado_cama_completa.json`.

## Primera unión entre repeticiones (timestamp exacto)

**t = 113.900s** del video (dentro del primer minuto y medio, antes de
cualquier hueco declarado cercano — no hay ducking en juego en esa zona,
el nivel es constante).

## Preview 1 — apertura continua (`previews/preview1_apertura_60s.mp4`)

- 00:00–01:00, 1920x1080, 30fps.
- `frame_inicial_hook_v2_1920x1080.png` desde el primer fotograma.
- "mañana?" (última palabra de la primera pregunta) termina en **4.866s**
  según `alignment.json`. Fundido cruzado de **0.4s** (4.866s→5.266s) hacia
  `frame_inicial_limpio_v1_1920x1080.png`, que se mantiene el resto del
  preview.
- Sin Ken Burns/zoom/paneo/partículas, sin logo/CTA/texto adicional.
- Audio: voz real (`output/audio.mp3`, recorte 0–60s sin recodificar) +
  cama musical real de esa misma ventana, mezcladas con `amix
  normalize=0` (no reparte la ganancia entre pistas).
- Verificado: durante el hook (0–5s) la voz mide −22.7dB de media / −6.7dB
  de pico; la música en la misma ventana mide −45.9dB de media / −26.4dB de
  pico — cerca de 23dB por debajo, ninguna palabra queda opacada.

## Preview 2 — unión del loop musical (`previews/preview2_union_loop_24s.mp4`)

- Ventana 101.9s–125.9s (24.00s), centrada en la costura de 113.9s
  (12s antes / 12s después).
- Audio: voz real + cama real de esa ventana exacta (incluye la costura
  real calculada sobre la cama completa, no una simulación aislada).
- Sin tonos, beeps, rótulos ni cortes artificiales.
- Visual: `frame_inicial_limpio_v1_1920x1080.png` estático durante toda la
  ventana. No hay ninguna transición estructural aprobada y localizada
  todavía para esta zona del video (el plan visual describe el criterio —
  "transición estructural declarada del audio" — pero no fija qué pausa
  concreta activa el cambio a `escena_descanso`; no se asume ninguna).
- Verificado a nivel de medición: −46.3dB de media justo antes de la
  costura, −46.4dB justo después — sin salto de volumen perceptible.

## Preview 3 — apertura con partículas (`previews/preview3_apertura_particulas_20s.mp4`)

Corrección recibida: las partículas luminosas sí deben moverse (único
movimiento ambiental permitido; imágenes 100% estáticas, sin Ken
Burns/zoom/paneo). Se reutilizó el sistema de partículas ya aprobado en
video_005 (`lib/particulas.mjs`, motas de polvo con canal alfa, mismo
método de cierre de bucle), con los parámetros establecidos en
`canal.json` (82 partículas, periodo de bucle de 24s) para la escena
limpia, y una variante de densidad reducida (18 partículas, mismo periodo
y método) solo para la ventana del hook, tal como se pidió.

- **Partículas visibles simultáneamente** (con opacidad ≥0.02, es decir
  fuera de su instante exacto de nacimiento/muerte): ~12–17 de las 18
  durante el hook (densidad baja); ~65–73 de las 82 en la escena limpia
  (densidad normal).
- **Rango de tamaños**: radio base 1.4–4.0 px; con el desenfoque de borde
  incluido (que varía por separado, para simular profundidad), el alcance
  visual real es de ~4.9–8.9 px.
- **Rango de opacidad**: 0 en el instante de nacer/morir hasta un pico por
  partícula de entre 0.185 y 0.635 (nunca las 82 en su pico a la vez).
- **Velocidad de desplazamiento**: deriva lateral dominante de 6.2–17.5
  px/s (según profundidad simulada) con un vaivén senoidal suave
  superpuesto; deriva vertical mínima de solo 0.01–1.18 px/s (flotan, no
  caen ni suben con fuerza) — sin trayectorias largas ni pulsaciones
  fuertes.
- **Método contra saltos/repeticiones evidentes**: cada partícula vive un
  número ENTERO de ciclos dentro del periodo de 24s: su opacidad es
  matemáticamente cero exactamente al nacer y al morir (envolvente
  sin²(πu)), y su posición de nacimiento depende solo de su identidad y del
  número de ciclo (no del tiempo absoluto). Al completar el periodo y
  volver a repetirse, cada partícula reaparece en el mismo punto con la
  misma opacidad nula: el fotograma de cierre coincide con el de apertura,
  así que la costura del bucle no se percibe. Es el mismo método ya medido
  y aprobado en video_005.
- Densidad baja durante el hook: partículas dispersas mayormente sobre las
  zonas oscuras del fondo; ninguna cruza el área central del rostro ni el
  bloque de texto de forma sostenida (son puntos pequeños y de opacidad
  baja, no manchas). Tras el fundido a la escena limpia (mismo instante ya
  aprobado, 4.866s→5.266s), la densidad sube a la normal establecida.
- Audio: exactamente el mismo mix ya aprobado (voz real + cama musical a
  −35.5 LUFS), recortado a 20s sin volver a mezclar nada.
- Verificado: sha256 de `output/audio.mp3` sigue siendo
  `9aac92ef7b6cd3811a54453330082413c1a6fe59357b830eb09a3acf407124f6`
  (sin tocar).

## Confirmaciones pedidas

- **Maestro de voz intacto**: sha256 de `output/audio.mp3` antes y después
  de este pase — idéntico:
  `9aac92ef7b6cd3811a54453330082413c1a6fe59357b830eb09a3acf407124f6`.
  No se recortó, normalizó, recodificó ni se tocaron sus pausas o párrafos;
  todos los recortes de este pase se hicieron sobre copias temporales.
- **No se inició el render completo de los 49:58.67.** Solo se generaron
  los dos previews (60s y 24s) descritos arriba.
