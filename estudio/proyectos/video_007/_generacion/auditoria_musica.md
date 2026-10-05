# Video 7 — Auditoría de música ambiental

**Fecha:** 2026-10-06

## 1. El canal ya tiene una biblioteca aprobada — no se necesita buscar nada nuevo

`estudio/canal.json` → `musica.biblioteca` define 3 pistas, ya descargadas en `estudio/assets/music/` y **aprobadas para el perfil nocturno ("Oraciones de la Noche") el 2026-08-22** según `estudio/assets/music/LEEME.md`:

| Archivo | Pieza | Autor | Procedencia / licencia | LUFS medido | Duración |
|---|---|---|---|---:|---:|
| `one_step_closer.mp3` | One Step Closer | Aakash Gandhi | Biblioteca de audio de YouTube | −18,0 | 132,0s |
| `alone_with_my_thoughts.mp3` | No.7 Alone With My Thoughts | Esther Abrami | Biblioteca de audio de YouTube | −27,7 | 142,1s |
| `touching_moment.mp3` | Touching Moment | Wayne Jones | Biblioteca de audio de YouTube | −17,0 | 148,2s |

Las tres provienen de la Biblioteca de audio de YouTube (música libre de regalías para uso en videos de YouTube) y están documentadas como material de origen inmutable: no se modifican ni se regeneran nunca.

## 2. Videos anteriores donde se usó cada pista

Busqué referencias en todos los proyectos (`estudio/proyectos/video_*`):

- **`one_step_closer.mp3`** → usada en **video_006** (`_pase7_musica/informe_previews_musica.md`, `_pase8_render/informe_render_final.md`). Cama completa calculada, nivel plano −23 dB bajo voz e interludios, bucle con cruce de 4s, LUFS final −35,5 tras ganancia correctiva de +5,4 dB.
- **`alone_with_my_thoughts.mp3`** → sin uso registrado todavía en ningún proyecto.
- **`touching_moment.mp3`** → sin uso registrado todavía en ningún proyecto.

`video_007/edit_plan.json` todavía no nombra una pista (sigue con su esqueleto inicial vacío).

## 3. ¿Encaja con esta oración nocturna?

Sí. Las tres fueron aprobadas específicamente para este perfil (oración nocturna, "quien pone esto para dormirse"), con la regla de nivel plano ya validada (sin subir en los interludios, para no llamar la atención en el silencio). El Video 7 es exactamente ese perfil.

## 4. Recomendación

Por la regla de rotación del canal (`"rotacion": "libre"`, `"_rotacion"`: *"No hace falta usar siempre la misma... si no dice nada, se reparte por orden"*) y dado que **video_006 ya usó `one_step_closer.mp3`**, la pista que sigue en el orden de la biblioteca — y que todavía no se ha usado en ningún video — es:

**`alone_with_my_thoughts.mp3`** ("No.7 Alone With My Thoughts", Esther Abrami)

Evitar repetir la misma pista en videos consecutivos es justamente el motivo por el que existe la rotación: "escuchar la misma cama en cada video la convierte en la firma del canal, y aquí la firma es la voz."

**No se ha descargado, copiado ni usado ninguna pista todavía** — solo se consultó la biblioteca ya existente y se audita cuál seguiría en la rotación. Falta tu aprobación para fijarla en `video_007/edit_plan.json`.

## 5. Si prefieres otra opción

No fue necesario proponer pistas nuevas: el canal ya tiene una biblioteca aprobada, documentada y con licencia clara (Biblioteca de audio de YouTube) suficiente para este video. Si prefieres `touching_moment.mp3` en su lugar, ambas están igualmente aprobadas y sin uso previo — la elección entre las dos es de preferencia, no de licencia.

## 6. Costo

**0 créditos / $0.** No se descargó, compró ni generó ninguna pista nueva.
