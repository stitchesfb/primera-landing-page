# Informe de validación — audio_candidato_final_v4.mp3

video_006 · "Oraciones Bíblicas Diarias" · pase 6 (ensamblaje final del candidato v4)

## 1. Origen y método de ensamblaje

- Fuente base: manifiesto exacto de `audio_candidato_v3.mp3` (25 posiciones ya
  aprobadas en pases anteriores + 517 originales sin tocar).
- Se aplicaron ÚNICAMENTE las 21 posiciones aprobadas en este pase (15
  reparaciones locales del pase 4 + p123 + p168 + los tramos continuos
  p130-131, p312 y p414 del pase 5).
- Ensamblaje desde archivos fuente individuales, NO sobre un candidato ya
  codificado. Una sola codificación final (`ffmpeg -f concat ... -c:a
  libmp3lame -b:a 192k`, una única invocación).
- Ninguna llamada a ElevenLabs durante este pase.
- `edit_plan.json` / `narration.txt` sin ninguna modificación.

## 2. Corrección aplicada durante el ensamblaje

El primer ensamblaje insertaba el tramo continuo p130-131 como un bloque de
audio único e ininterrumpido. Al verificar el patrón de 114 pausas contra
`edit_plan.json` se detectó que la pausa original de **6 segundos declarada
entre p130 y p131** no estaba presente (el audio continuo generado por
ElevenLabs es habla ininterrumpida, sin esa pausa). Se corrigió partiendo el
tramo exactamente en el límite ya validado (9.253 s, inicio real de
"Mientras") e insertando ahí el silencio real declarado (6 s, sin
fundidos). El resto del ensamblaje no se tocó. Esta es la única corrección
aplicada tras el primer intento.

## 3. Validación de palabras

- **4868/4868 palabras**, en el mismo orden que `narration.txt`, sin
  omisiones ni duplicaciones (verificado token a token contra las 542
  líneas del guion).
- **542 párrafos** presentes.
- Reconstrucción de `alignment_v4.json` a partir de:
  - Las 521 posiciones sin cambios → tiempos locales reutilizados tal cual
    de `alignment_v3.json` (mismo archivo fuente, mismo hash).
  - Las 21 posiciones cambiadas → tiempos locales reconstruidos desde la
    alineación por carácter real de cada fuente nueva (regeneraciones y
    tramos), con el mismo método de ancla de alineación usado en todo el
    proyecto. Los 15 recortes locales no necesitaron datos nuevos: el
    recorte solo quitó cola de silencio posterior a la última palabra, las
    palabras en sí y sus tiempos locales siguen siendo los de v3.

## 4. Pausas (114)

- `114/114` huecos declarados presentes y en su posición: 20 dentro del
  bloque p6-p129, 92 dentro del bloque p132-p542, 1 embebido en el
  preroll p1-p5 (ya lo traía desde su aprobación previa) y 1 reconstruido
  manualmente entre p130 y p131 (ver §2).
- Patrón de pausas del `edit_plan.json` original: intacto, sin ninguna
  pausa añadida, quitada ni de duración distinta a la declarada.

## 5. Silencios no declarados

Barrido completo con `silencedetect` (-40dB, ≥1.5s) sobre el archivo final:
116 eventos de silencio detectados.

- 114 corresponden exactamente a los huecos declarados.
- 1 corresponde al cierre musical final (90 s de silencio tras el fin de la
  narración en 2908.70s — reservado para música, sin música añadida en
  este pase).
- 1 evento sin explicar: **1.60 s dentro de p464** ("El afán no puede
  gobernar el futuro."), entre 2578.80s y 2580.40s. Verificado: es un
  residuo de cola preexistente en el audio **original sin tocar** (mismo
  patrón sistémico descrito en pases anteriores — el mismo residuo de
  1.603s, con el mismo valor exacto de duración, ya está presente en
  `audio_candidato_v3.mp3` en el punto equivalente). p464 no forma parte de
  las 21 posiciones aprobadas para este pase, así que **no se tocó**, en
  cumplimiento de la protección explícita del resto del audio. Se deja
  documentado para una futura ronda de reparación si Orlando lo confirma
  por oído.

## 6. Codificación

Una sola codificación final a mp3 (`libmp3lame`, 192 kbps) a partir de
piezas PCM sin pérdida adicional. Ningún tramo se recodificó dos veces.

## 7. Duración final

**2998.674286 s = 49:58.67** (medida directamente sobre
`audio_candidato_final_v4.mp3`, no estimada).

## 8. Verificaciones puntuales

- **"Amén" (p542)**: única aparición en el guion, palabra completa, ocupa
  0.604s de los 0.6037s del segmento declarado (sin corte), volumen pico
  -4.8dB (con voz audible, no silencio).
- **p312** ("noche," / "recuérdanos"): usa el tramo continuo aprobado con
  las dos ráfagas vocales eliminadas y los 400ms de separación limpia
  insertados en el pase anterior (ya escuchado y aprobado por Orlando en
  `p311-312-313_completo.mp3`). Verificado de nuevo aquí: ambas palabras
  completas en la alineación reconstruida, sin solape con la región
  excisionada.
- **Uniones externas de los 3 tramos continuos** (p129→p130, p130→silencio,
  silencio→p131, p131→p132, p311→p312, p312→p313, p413→p414, p414→p415):
  analizadas a nivel de muestra (±60ms alrededor de cada corte). Ningún
  salto de amplitud anómalo en el punto exacto de empalme — todas las
  transiciones son progresiones suaves de forma de onda, sin clics ni
  discontinuidades.

## 9. Manifiesto de fuentes (`manifiesto_fuentes_hashes_v4.csv`)

- 542 filas, `sha256` de cada archivo fuente real utilizado.
- Comparado contra un manifiesto de v3 reconstruido de forma independiente
  (mismas 25 fuentes que v3 usó, sin ninguno de los cambios de este pase):
  **exactamente 21 posiciones difieren de v3** — 20, 123, 130, 131, 168,
  169, 184, 190, 274, 312, 325, 335, 366, 414, 427, 432, 466, 497, 504,
  526, 541 — y coinciden EXACTAMENTE con la lista aprobada, ni una más ni
  una menos.
- Las **521 posiciones restantes tienen hash idéntico a v3** (mismo
  archivo fuente, byte a byte).
- Las 4 tomas aisladas fallidas (`parrafos_regen_pase4/130.mp3`,
  `131.mp3`, `312.mp3`, `414.mp3`) **no aparecen en ninguna fila** del
  manifiesto v4.

## 10. Conclusión

El candidato v4 cumple todas las condiciones solicitadas: 21 posiciones
aprobadas aplicadas exactamente como se especificó, 521 posiciones
intactas, patrón de 114 pausas completo, una sola codificación final,
palabras 4868/4868 sin omisiones ni duplicaciones, sin clics en las
uniones de los tramos continuos. El único hallazgo (residuo de 1.6s en
p464) es preexistente en v3 y queda fuera del alcance de este pase.

**Este candidato no reemplaza al maestro anterior ni está marcado como
aprobado.** La aprobación final queda pendiente de que Orlando lo
escuche.
