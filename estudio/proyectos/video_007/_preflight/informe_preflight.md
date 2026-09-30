# Video 7 — Preflight corregido (sin llamadas a ElevenLabs, sin gasto)

**Fecha de esta corrección:** 30 de septiembre de 2026
**Guion auditado:** `VIDEO_007_GUION_APROBADO.md` (SHA-256 `3120b42b4143b56a4cb27325d64e32b70055e36e429c998ea2dd5887c38d9dd1`) — **no se tocó el texto del guion en ningún momento**.
**Fuentes rectoras:** `SISTEMA_ACTIVO_ORACIONES_BIBLICAS_DIARIAS.md` **v2.2** y `VIDEO_TEMPLATE_ORACIONES_BIBLICAS_DIARIAS.md` **v3**, ya reemplazadas en el repositorio (ver §0).
**Estado:** preflight corregido. **No se ha llamado a ElevenLabs, no se ha generado audio, no se ha gastado nada.**

---

## 0. Documentos rectores reemplazados

`estudio/docs/SISTEMA_ACTIVO_ORACIONES_BIBLICAS_DIARIAS.md` y `estudio/docs/VIDEO_TEMPLATE_ORACIONES_BIBLICAS_DIARIAS.md` se sobrescribieron **en el mismo path** (no se borró y volvió a crear el archivo), así que git los registra como `modified`, no como `deleted`+`added`, y conservan su historial completo. Verificados byte a byte idénticos a los que adjuntaste. Ahora dicen v2.2 y v3 respectivamente.

## 9. ¿Hubo commit y push? — aclaración exacta

Sí. La secuencia real fue:

1. Entregué el preflight anterior y dije **"nada se ha commiteado"** — eso era cierto en ese momento.
2. Un hook de este entorno (`stop-hook-git-check.sh`) exigió después commitear cualquier cambio pendiente antes de terminar el turno. Por eso, **en un mensaje posterior**, sí hice commit y push.

**Commit:** `d06886a` — *"video_007: preflight del guion aprobado (sin ElevenLabs, sin gasto)"*, en la rama `claude/animated-videos-oraciones-diarias-66hr1i`, ya empujado al remoto. Archivos exactos de ese commit:

```
estudio/proyectos/video_007/VIDEO_007_GUION_APROBADO.md
estudio/proyectos/video_007/VIDEO_007_PLAN_TECNICO_PRE_TTS.md
estudio/proyectos/video_007/_preflight/demo_resumption.mjs
estudio/proyectos/video_007/_preflight/informe_preflight.md
estudio/proyectos/video_007/_preflight/manifiesto_bloques.json
estudio/proyectos/video_007/_preflight/narration_extraida.txt
```

No hubo contradicción: la primera frase describía el estado antes del hook, la segunda parte del mismo turno describía el estado después. Lo dejo explícito para que no quede ambigüedad.

---

## Corrección crítica: unidad de persistencia = BLOQUE TTS, no párrafo

Tenías razón — 101 solicitudes TTS habría repetido exactamente el problema de Video 6. Rehice el manifiesto, los hashes y la demostración de reanudación con el **bloque TTS** como unidad principal; los párrafos ahora son metadato subordinado dentro de cada bloque (para saber dónde cae cada Short y cada pausa), nunca la unidad que se envía a la API.

### 1–3. Mapa de bloques TTS, caracteres/palabras y total facturable

Partí de los 24 bloques editoriales del guion, tal como pediste, y solo hice **un ajuste**, justificado abajo. Resultado: **23 bloques TTS**.

| Bloque TTS | Bloque(s) editorial(es) | Párrafos | Caracteres | Palabras | Marcadores |
|---:|---|---|---:|---:|---|
| 1 | 1 | p1–p2 | 1.151 | 190 | INICIO/FIN SHORT 1, PAUSA 1 |
| 2 | 2 | p3–p5 | 1.161 | 186 | — |
| 3 | 3 | p6–p9 | 1.070 | 184 | — |
| 4 | 4 | p10–p12 | 1.045 | 177 | — |
| 5 | 5 | p13–p16 | 1.125 | 190 | PAUSA 2 |
| 6 | 6 | p17–p20 | 1.216 | 202 | PAUSA 3 |
| 7 | 7 | p21–p23 | 1.158 | 193 | INICIO/FIN SHORT 2 |
| 8 | 8 | p24–p27 | 1.977 | 315 | PAUSA 4 |
| 9 | 9 | p28–p31 | 1.853 | 301 | — |
| 10 | 10 | p32–p35 | 1.095 | 178 | PAUSA 5 |
| 11 | 11 | p36–p39 | 1.172 | 197 | — |
| 12 | 12 | p40–p44 | 1.786 | 291 | — |
| 13 | 13 | p45–p48 | 1.182 | 195 | PAUSA 6 |
| 14 | 14 | p49–p52 | 1.214 | 194 | — |
| 15 | 15 | p53–p57 | 1.827 | 290 | — |
| 16 | 16 | p58–p61 | 1.169 | 189 | PAUSA 7 |
| 17 | 17 | p62–p65 | 1.121 | 177 | — |
| 18 | 18 | p66–p69 | 1.088 | 181 | — |
| 19 | 19 | p70–p72 | 1.094 | 186 | INICIO/FIN SHORT 3 |
| 20 | 20 | p73–p77 | 1.790 | 298 | PAUSA 8 |
| 21 | 21 | p78–p81 | 1.078 | 177 | — |
| 22 | 22 | p82–p87 | 2.062 | 357 | PAUSA 9 |
| **23-24** | **23 + 24 (unidos)** | **p88–p101** | **1.948** | **342** | **PAUSA 10** |

**Total: 23 bloques TTS · 31.382 caracteres · 5.190 palabras.** (Verificado: la suma de los 23 bloques da exactamente el mismo total que la suma de los 101 párrafos — no se perdió ni se duplicó nada al agrupar.)

**El único cambio que propuse:** unir el bloque editorial 23 (1.060 car) con el 24 (888 car) → 1.948 car, justo en el rango. Motivo: el bloque 24 era el único claramente corto (26% bajo el piso de 1.200), es el cierre de la oración, y no hay ninguna pausa ni marcador entre el 23 y el 24 — son temáticamente el mismo tramo de cierre ("En paz me acostaré" → "Cierre y amén"). No dividí ninguna frase, cita ni Short para hacer esta unión: la fusión ocurre exactamente en el límite de párrafo que ya existía entre ambos bloques editoriales.

**Lo que decidí NO tocar, y por qué:** 15 de los 23 bloques quedan fuera del rango 1.200–2.000, pero todos por márgenes modestos (el más corto, bloque 4, un 12,9% bajo el piso; el más largo, bloque 22, un 3,1% sobre el techo). No forcé más fusiones ni dividí el bloque 22 porque:
- Partir el bloque 22 (2.062 car, 6 párrafos) en dos no ayuda: la mitad más equilibrada posible da aproximadamente 1.049 + 1.013 caracteres — **dos bloques todavía más cortos que el problema que se supone que resuelve**. Un bloque 3,1% sobre el techo, dentro de la "flexibilidad" que el propio baseline declara explícitamente, me pareció mejor que crear dos bloques nuevos y más pequeños.
- Fusionar más bloques cortos habría significado cruzar más límites editoriales aprobados por ti sin una razón técnica tan clara como la del 23+24. Preferí la intervención mínima y te lo dejo aquí para que decidas si quieres que fusione algunos más.

Si prefieres que fuerce más bloques hacia el centro del rango (por ejemplo, fusionando 3+4, o 17+18), dímelo y lo rehago — es un cambio de diez minutos porque todo el pipeline de abajo ya está automatizado.

### 4. Confirmación: encabezados, marcadores y notas no se narran

El extractor programático (mismo que usé en el preflight anterior, revisado ahora para agrupar por bloque) descarta explícitamente:
- las 24 líneas `## BLOQUE NN — título`;
- las 16 líneas de marcador entre corchetes (`[INICIO/FIN SHORT N]`, `[PAUSA IMPORTANTE N — ...]`);
- la nota inicial en blockquote ("Las indicaciones entre corchetes son marcas de producción...");
- los separadores `---`;
- toda la sección `## Notas para revisión editorial` y el `**Registro de aprobación editorial:**` final.

Solo se cuentan como texto facturable las líneas de prosa entre esas marcas. El total (31.382 caracteres) es exclusivamente narración.

### 5. Persistencia y reanudación — demostrada por BLOQUE, no por párrafo

Manifiesto reconstruido en `_preflight/manifiesto_bloques.json`: cada una de las 23 entradas es un bloque TTS (`texto_sha256` del bloque completo, `voice_id`, `model_id`, `ajustes_sha256`, `estado`, `history_item_id`, `archivo_audio`), con la lista de párrafos que contiene como **metadato subordinado** (`parrafos_incluidos_metadato`), útil solo para saber dónde cae cada Short/pausa dentro del audio ya generado — nunca como unidad de llamada a la API.

Reescribí y volví a ejecutar la demostración (`_preflight/demo_resumption.mjs`, sin tocar ElevenLabs) con la unidad correcta:

```
bloque TTS 1     : SALTAR   -- texto del bloque, voz, modelo y ajustes identicos; audio del bloque ya presente
bloque TTS 2     : GENERAR  -- el texto del BLOQUE cambio (algun parrafo interno se edito)
bloque TTS 3     : GENERAR  -- sin entrada previa en el manifiesto para este bloque
bloque TTS 23-24 : GENERAR  -- el audio del bloque no existe en disco o esta vacio
```

Punto importante que antes no estaba explícito: si se edita **un solo párrafo** dentro de un bloque de varios, se regenera **todo el bloque** (no ese párrafo suelto) — el hash de identidad es del bloque completo. Es la contrapartida natural de dejar de generar por párrafo: menos peticiones, pero una edición pequeña cuesta el bloque entero. Lo marco para que lo tengas presente al aprobar correcciones puntuales más adelante.

### 6. De dónde sale el "794 caracteres/minuto" — exacto

- **Comando:** `node cli.mjs sonda` (función `cmdSonda` en `estudio/cli.mjs`).
- **Archivo/texto usado:** no un archivo — un texto fijo de calibración de **271 caracteres**, integrado en el propio comando: *"Padre, gracias por este día nuevo y por tu fidelidad constante. Antes de que empiece lo que tengo por delante, quiero ponerlo en tus manos: lo que me ilusiona y también lo que me pesa. Dame paz para lo que no puedo resolver hoy, y diligencia para lo que sí depende de mí."*
- **Duración usada:** la duración real del archivo mp3 generado por esa única llamada (medida con `ffprobe`, no deducida de los timestamps de alineación): `carPorMin = Math.round((TEXTO.length / segundos) * 60)`.
- **¿Incluía pausas digitales o interludios?** **No.** Es un único fragmento de narración cruda de un solo `vozConTiempos()`, sin ningún silencio insertado. 794 car/min es **ritmo de narración pura**, no una duración de video terminado.
- **Velocidad de la narración sola vs. duración final con pausas — por separado:**
  - Narración pura de los 31.382 caracteres del guion completo a 794 car/min: **≈ 39,5 minutos**.
  - Duración final con las 10 pausas (más cualquier intro/outro): **depende de cuánto dure cada pausa**, que el propio SISTEMA_ACTIVO v2.2 dice que se fija con la muestra, no de antemano. Con el patrón de Video 6 (3–6 s por pausa) el total rondaría los 40–41 min — **por debajo del objetivo de 50–55 min**. Sigue siendo el hallazgo más importante de este preflight (ver §"Riesgo de duración" abajo).
- **¿Se midió con la voz/ajustes de Video 7?** Sí — confirmado: `git diff` entre el commit que fijó esta constante (18 de agosto de 2026) y el estado actual de `canal.json` muestra **cero cambios** en el bloque `voz` (mismo `model_id`, `speed: 0.91`, `stability`, `similarity_boost`, `style`, `use_speaker_boost`). No hay evidencia de que la voz o los ajustes hayan cambiado desde entonces.

### 7. De dónde sale la tarifa de 0,276 créditos/carácter — exacto

- **Fuente:** commit `e8d747f` (18 de agosto de 2026, mensaje: *"Fija las constantes medidas y deja de culpar a la clave de un fallo de red"*).
- **Cómo se midió:** el mismo comando `sonda` generó el texto de 271 caracteres, esperó a que el contador de la suscripción de ElevenLabs se estabilizara, y calculó `creditos_consumidos / caracteres_enviados` directamente del contador real de la cuenta — no una tarifa de lista, una tarifa observada. El commit registra además una segunda confirmación independiente: tres ejecuciones tempranas del pipeline (126 + 271 + 542 = 939 caracteres, 5 peticiones) consumieron 259 créditos en el panel de Analytics, **0,276 créditos/carácter otra vez** — dos vías distintas, mismo número.
- **¿Se observó en Video 6?** **No directamente.** La medición es del 17–18 de agosto de 2026; Video 6 se generó el **1 de septiembre de 2026** (confirmado en `history_manifest.json`), es decir, **dos semanas después**. Es la tarifa que estaba vigente y configurada cuando se generó Video 6, pero no fue remedida específicamente contra el guion de Video 6 en este repositorio (`calibracion.json`, que sí registraría cualquier remedición posterior de `cli.mjs voz`, no está en este contenedor — está en `.gitignore`).
- **¿Corresponde al mismo modelo, vía y voz de Video 7?** Modelo: sí, `eleven_flash_v2_5`, confirmado por `canal.json` y por el propio commit ("la tarifa de API de Flash"). Vía: API (no web) — `sonda` llama al mismo endpoint que usaría la generación real. Voz/ajustes: sin cambios desde la medición (mismo `git diff` de la §6).
- **Multiplicador aplicable:** ninguno documentado en el repositorio más allá de la tarifa ya medida (0,276 ya es el resultado *después* del descuento de Flash vs. Multilingual v2, según el propio commit). No hay indicio de un multiplicador adicional por esta voz específica en el código.

**Conclusión:** es razonablemente aplicable a Video 7 (mismo modelo/voz/vía, sin cambios de configuración desde la medición), pero **no está confirmada contra el guion real de Video 7** — solo contra un texto de calibración genérico de 271 caracteres. Sigue siendo una estimación, no un costo medido para este guion específico.

### 8. Presupuesto corregido

| Concepto | Caracteres | Créditos (a 0,276, tarifa medida — no la asumida del plan técnico) |
|---|---:|---:|
| **Una sola muestra inicial de calibración** (bloque TTS 1, el más pequeño — "Bloque 01 completo") | 1.151 | **≈ 318** |
| Muestra B — bloque TTS 7 ("Bloque 07 completo") | 1.158 | ≈ 320 |
| Muestra C — bloques TTS 10+11 | 2.267 | ≈ 626 |
| Muestra D — bloque TTS **23-24 completo** (ya no solo el antiguo bloque editorial 24, porque ahora es un único bloque TTS) | 1.948 | ≈ 538 |
| **Total de las 4 muestras completas** | **6.524** | **≈ 1.801** |
| Reserva propuesta para correcciones (20%, a definir por ti) | — | ≈ 360 |
| **Total con reserva** | — | **≈ 2.161** |
| Guion completo (23 bloques) | 31.382 | ≈ 8.661 |

Propongo generar **primero solo la muestra inicial** (bloque 1, ≈318 créditos) como calibración de arranque — confirma ritmo real, timbre y continuidad de apertura antes de comprometer el resto del presupuesto de muestras. Ninguna de estas cifras se ha gastado: son estimaciones a partir de la tarifa medida el 17 de agosto, pendientes de confirmación real cuando generes la primera muestra.

---

## Riesgo de duración — se mantiene, ahora con más detalle

Con 794 car/min (narración pura, sin pausas): 31.382 caracteres ≈ 39,5 min de narración. Objetivo: 50–55 min. Para cerrar la diferencia, las 10 pausas importantes tendrían que sumar 10,5–15,5 minutos en total (63–93 s de promedio cada una), muy por encima del patrón de Video 6 (3 s normal / 6 s importante). El propio SISTEMA_ACTIVO v2.2 ahora fija el punto de partida en **8–12 pausas** — el guion ya tiene 10, dentro de ese rango — pero no resuelve el problema de duración por sí solo: **la única forma de saber si el ritmo real narrado se acerca a 794 car/min con esta voz y este guion es escuchar la muestra**. No lo puedo resolver desde aquí sin generar audio.

---

**No se hicieron llamadas a ElevenLabs. No se generó audio. No se modificó el guion. No se gastó ningún crédito.**

Quedo detenido, a la espera de que confirmes: (a) el mapa de 23 bloques TTS del §1–3, o me digas qué otros bloques fusionar/dividir; (b) el presupuesto de la muestra inicial de calibración del §8; y (c) que la tarifa de 0,276 cred/car te parece suficientemente confiable para presupuestar, o si prefieres que espere a una remedición real antes de dar cualquier cifra como definitiva.
