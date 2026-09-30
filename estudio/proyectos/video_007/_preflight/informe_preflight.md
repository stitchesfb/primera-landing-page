# Video 7 — Informe de preflight (sin llamadas a ElevenLabs, sin gasto)

**Fecha del informe:** 30 de septiembre de 2026
**Guion auditado:** `VIDEO_007_GUION_APROBADO.md` (SHA-256 `3120b42b4143b56a4cb27325d64e32b70055e36e429c998ea2dd5887c38d9dd1`)
**Plan técnico:** `VIDEO_007_PLAN_TECNICO_PRE_TTS.md` (SHA-256 `7c7d6d6f99f9c437627ce85fc4c3f4f4da17444f1d753eb0561e74a035566ca3`)
**Estado:** preflight completo. **No se ha llamado a ElevenLabs, no se ha generado audio, no se ha gastado nada.**

---

## 1. Discrepancia de versión encontrada (no corregida por iniciativa propia)

El plan técnico declara como fuentes rectoras `SISTEMA_ACTIVO_ORACIONES_BIBLICAS_DIARIAS.md v2.2` y `VIDEO_TEMPLATE_ORACIONES_BIBLICAS_DIARIAS.md v3`. Lo que realmente hay en el repositorio (releí ambos completos, tal como pedía la instrucción) es:

- `SISTEMA_ACTIVO_ORACIONES_BIBLICAS_DIARIAS.md` → **versión 2.1** (la última que incorporé yo mismo, con la regla de Shorts planificados).
- `VIDEO_TEMPLATE_ORACIONES_BIBLICAS_DIARIAS.md` → sin número de versión explícito en el encabezado (misma plantilla de 14 secciones que incorporé junto con la 2.1).

No existe una v2.2 ni una v3 en `estudio/docs/`. No inventé ni adelanté esas versiones — si hay una actualización pendiente que aún no me has enviado, dímelo y la incorporo igual que las anteriores. Mientras tanto, trabajé sobre la 2.1, que es la única fuente real disponible y no contradice nada de lo que pide el guion o el plan técnico.

`estudio/docs/archivo/DECISIONES_CERRADAS_ORACIONES_BIBLICAS_DIARIAS_v1.2_ARCHIVO.md` no se tocó (no se leyó como fuente de valores, solo se confirmó que sigue archivado).

## 2. Archivos incorporados

Sin sobrescribir nada ajeno — `narration.txt`, `edit_plan.json` y `estado.json` (el esqueleto que ya existía) quedan intactos:

```
estudio/proyectos/video_007/VIDEO_007_GUION_APROBADO.md          (nuevo)
estudio/proyectos/video_007/VIDEO_007_PLAN_TECNICO_PRE_TTS.md    (nuevo)
estudio/proyectos/video_007/_preflight/manifiesto_bloques.json   (nuevo)
estudio/proyectos/video_007/_preflight/narration_extraida.txt    (nuevo)
estudio/proyectos/video_007/_preflight/demo_resumption.mjs       (nuevo)
estudio/proyectos/video_007/_preflight/informe_preflight.md      (este archivo)
```

**Nota deliberada:** no escribí el texto extraído dentro de `narration.txt` (el archivo que de verdad lee `cli.mjs voz` para generar audio). Lo dejé en `_preflight/narration_extraida.txt` para tu revisión. Copiarlo a `narration.txt` es un paso de producción que dejo para cuando autorices avanzar, no algo que se deba hacer solo por hacer el preflight.

## 3. Voz, modelo y ajustes — lo que se pudo confirmar y lo que no

Auditado contra `estudio/canal.json`, `estudio/lib/elevenlabs.mjs`, `estudio/cli.mjs` y el contenido real de `estudio/proyectos/video_006/` (no contra el documento archivado).

| Dato | Valor | Fuente | Confirmado |
|---|---|---|---|
| Nombre de la voz | `El Faraon - Full, Clear, Mellow` | `canal.json` | Sí, committeado |
| `model_id` | `eleven_flash_v2_5` | `canal.json` | Sí, committeado |
| `stability` / `similarity_boost` / `style` / `use_speaker_boost` | `0.65` / `0.88` / `0.0` / `true` | `canal.json` | Sí, committeado |
| `speed` | `0.91` | `canal.json` | Sí, committeado |
| Formato de salida | `mp3_44100_128` | `canal.json`, y verificado por `ffprobe` sobre `proyectos/video_006/output/parrafos/001.mp3` (mp3, 44100 Hz, mono, 128 kb/s) | Sí, confirmado empíricamente contra un archivo real |
| `voice_id` (el ID literal, no el nombre) | **desconocido en este contenedor** | Se lee de `ELEVENLABS_VOICE_ID` en `.env`, que está en `.gitignore` y no existe en esta sesión (`.env.example` solo trae la clave vacía) | **No** |
| Créditos/carácter medidos | `0.276` | `canal.json → constantes` (medido el 2026-08-17 contra la API, confirmado por el contador de suscripción y el panel de Analytics: 939 caracteres = 259 créditos en 5 peticiones) | Sí, committeado — **y es la cifra real que hay que usar, no la del plan técnico** |
| Ritmo medido | `794 caracteres/minuto` | `canal.json → constantes` | Sí, committeado, pero con una duda real (ver §5) |
| Tarifa recalibrada específicamente con Video 6 | **desconocida en este contenedor** | Vive en `calibracion.json`, que también está en `.gitignore` y no existe en esta sesión | **No** |

**Conclusión de esta sección:** el `voice_id` real y la calibración específica de Video 6 no están en el repositorio — están, correctamente, solo en el entorno local donde se ejecuta la producción de verdad (fuera de git, por diseño de seguridad). No los supuse ni until los copié de `DECISIONES_CERRADAS...ARCHIVO.md`. Para resolverlos hace falta ejecutar `node cli.mjs voces` (lectura, no genera audio) en una máquina con `.env` configurado — **esa llamada tampoco la hice**, porque el encargo pedía detenerme antes de cualquier llamada a ElevenLabs, incluida una de solo lectura.

## 4. Validación estructural del guion (extracción programática, no manual)

Parseo automático del markdown (script en `_preflight/`, resultados verificados dos veces con reglas distintas para evitar el error de conteo manual que ya ocurrió una vez en este proyecto con un hash):

| Verificación | Resultado |
|---|---|
| Bloques semánticos | **24** ✓ (coincide con el guion) |
| Pausas importantes | **10**, numeradas 1→10 sin huecos ni repetidos ✓ |
| Pares `[INICIO SHORT N]` / `[FIN SHORT N]` | **3 pares**, los 3 correctamente cerrados ✓ |
| Párrafos narrados totales | **101** |
| Caracteres narrados (solo prosa, sin títulos/notas/corchetes) | **31.382** |
| Palabras narradas | **5.190** — coincide exactamente con el resumen del plan técnico |
| Párrafo más largo | 735 caracteres (bloque 8) — muy por debajo del tope de 2.000 car/petición de la API |
| Bloques fuera del rango típico 400–2.200 caracteres | Ninguno |
| Párrafos que no cierran en puntuación de frase completa (indicio de corte) | Ninguno de los 101 |
| Citas bíblicas con comillas desbalanceadas dentro de un párrafo (indicio de cita partida) | Ninguna |

**Nota sobre caracteres:** el plan técnico estima "31.483 caracteres aproximados" — mi conteo exacto da 31.382, una diferencia de 101 caracteres (justo el número de párrafos, probablemente un carácter de más por párrafo en su método de conteo). Uso mi cifra como autoritativa porque sale de extraer y hashear el texto real, no de una aproximación.

### Los 3 Shorts

| Short | Bloque | Párrafo | Caracteres | Palabras | Cita incluida |
|---|---|---|---|---|---|
| 1 | 01 | 1 | 710 | 123 | — |
| 2 | 07 | 21 | 612 | 104 | Salmo 91:1 |
| 3 | 19 | 70 | 664 | 110 | Salmo 4:8 |

Cada Short es un único párrafo autocontenido (sin blancos internos) — límites de párrafo ya limpios por construcción del guion, tal como exige la regla nueva del sistema activo. No se tocó el guion para "arreglar" nada porque no hizo falta.

### Citas bíblicas encontradas (para tu verificación de RVR1960, no la hice yo)

- Salmo 91:1 — bloques 6 y 7 (Short 2)
- Salmo 91:2 — bloque 7
- Isaías 41:10 — bloque 10
- Salmo 4:8 — bloques 19 (Short 3) y 23

## 5. Riesgo real encontrado: la duración puede quedar corta

Con el ritmo **medido** de `canal.json` (794 car/min, no un supuesto):

- Narración pura (31.382 caracteres, sin pausas): **≈ 39,5 minutos**.
- Objetivo del guion: **50–55 minutos**.
- Para llegar a 50–55 min, las 10 pausas importantes (más cualquier intro/outro) tendrían que sumar entre **10,5 y 15,5 minutos** (≈629–929 segundos), es decir, un promedio de **63–93 segundos por pausa**.
- Eso es muy por encima del patrón de Video 6 (`edit_plan.json`: pausas normales de 3 s, importantes de 6 s). Si Video 7 usara pausas de ese tamaño, el total rondaría los **40–41 minutos**, muy por debajo del objetivo.

No sé si el ritmo de 794 car/min sigue siendo válido con `speed: 0.91` (no está documentado si la medición del 17 de agosto ya incluía ese ajuste de velocidad) — es exactamente el tipo de duda que solo resuelve una muestra real con la voz. No es un defecto del guion ni algo que deba corregir yo: es la razón por la que el guion mismo (nota editorial #2 y #4) y el plan técnico piden generar una muestra antes de fijar las pausas. Lo marco como el hallazgo más importante de este preflight.

## 6. Créditos — recalculados con la tarifa medida, no con la asumida

El plan técnico usa tarifas asumidas (0,5 o 1 crédito/carácter). El repositorio ya tiene una tarifa **medida**: **0,276 créditos/carácter**. Uso esa.

| Concepto | Caracteres | Créditos estimados (a 0,276) |
|---|---:|---:|
| Guion completo (101 párrafos) | 31.382 | **≈ 8.661** |
| Muestra A — Bloque 01 completo | 1.151 | ≈ 318 |
| Muestra B — Bloque 07 completo | 1.158 | ≈ 320 |
| Muestra C — Bloques 10+11 completos | 2.267 | ≈ 626 |
| Muestra D — Bloque 24 completo | 888 | ≈ 245 |
| **Total de las 4 muestras** | **5.464** | **≈ 1.508** |
| Reserva propuesta para correcciones (20 % del total, a definir por ti) | — | ≈ 1.732 |
| **Total con reserva** | — | **≈ 10.393** |

Esto es una estimación, no un costo definitivo — depende de que `model_id`, la vía de facturación (API vs. web) y el `voice_id` real coincidan con lo medido el 17 de agosto. Si tienes el `calibracion.json` real de Video 6 en la máquina de producción, esa cifra sería aún más precisa que la de `canal.json`.

## 7. Método de persistencia y reanudación — diseñado y demostrado, no implementado en producción

**Hallazgo sobre el pipeline actual:** revisé `cmdVoz` en `cli.mjs` (la función que de verdad llama a ElevenLabs). Genera los párrafos en un solo bucle, todo en memoria, y solo escribe el estado del proyecto (`escribirEstado`) **al final, si todo terminó bien**. No hay manifiesto por párrafo, no hay chequeo de "esto ya se generó, sáltalo", y no hay guardado incremental. La recuperación que se usó en Video 6 (`history_manifest.json`, "recover audio output from ElevenLabs History") fue un **script de rescate hecho después del hecho**, emparejando texto contra el historial de ElevenLabs — no una función incorporada del pipeline. Es decir: **tal como está hoy, un corte a mitad de generación de Video 7 no se recuperaría solo; habría que repetir el rescate manual que se hizo para Video 6**, con el riesgo de que el historial de ElevenLabs no sea fiable indefinidamente.

**Diseño propuesto** (esquema en `_preflight/manifiesto_bloques.json`, ya poblado con los 101 párrafos en estado `"pendiente"`, sin audio):

- Una entrada por párrafo con: `numero`, `bloque`, `texto_sha256`, `caracteres`, `palabras`, `voice_id`, `model_id`, `ajustes_sha256`, `estado` (`pendiente` / `generado` / `aprobado` / `error`), `history_item_id`, `archivo_audio`, `generado_en`.
- El manifiesto se reescribe **después de cada párrafo**, no al final — un corte a mitad de camino pierde como mucho el párrafo que estaba en vuelo.
- Antes de pedir audio a la API: recalcular el hash del texto y de los ajustes de voz. Si coinciden con lo ya persistido, el estado no es `pendiente`/`error`, y el archivo de audio existe con tamaño > 0 → **se salta esa llamada, cero créditos nuevos**. Si algo cambió (texto editado, voz distinta, ajustes distintos, archivo perdido) → se regenera solo ese párrafo.

Lo demostré con datos sintéticos (`_preflight/demo_resumption.mjs`, ejecutado, sin tocar ElevenLabs):

```
parrafo 1: SALTAR   -- texto, voz, modelo y ajustes identicos; audio ya presente
parrafo 2: GENERAR  -- el texto del parrafo cambio desde la ultima generacion
parrafo 3: GENERAR  -- sin entrada previa en el manifiesto
parrafo 4: GENERAR  -- el audio persistido no existe o esta vacio
```

Los cuatro casos (párrafo intacto, párrafo editado, párrafo nunca generado, audio perdido) se comportan como se esperaba. **No integré esta lógica en `cli.mjs` ni en `estudio/lib/`** — eso sería ya un cambio de producción, y el encargo pedía detenerme antes de eso. Si apruebas el diseño, la siguiente sesión la implementa como un comando nuevo (p. ej. `cli.mjs voz-por-bloques`) sin tocar `cmdVoz` existente, para no arriesgar el pipeline que ya funciona para otros proyectos.

## 8. Muestras A–D propuestas (no generadas)

| Muestra | Contenido | Párrafos | Caracteres | Créditos est. | Qué valida |
|---|---|---|---:|---:|---|
| A | Bloque 01 completo | 1–2 | 1.151 | ≈318 | Gancho, velocidad inicial, Short 1 |
| B | Bloque 07 completo | 21–23 | 1.158 | ≈320 | Cita bíblica, tono pastoral, Short 2 |
| C | Bloques 10 y 11, generados por separado y unidos | 32–39 | 2.267 | ≈626 | Continuidad real en la unión Palabra→oración |
| D | Bloque 24 completo | 94–101 | 888 | ≈245 | Ritmo de cierre, finales de palabra |

Coincide con lo que propone el plan técnico. No generé ninguna.

## 9. Comandos que se ejecutarían si apruebas avanzar (ninguno se ejecutó)

```
node cli.mjs voces                    # solo lectura: resuelve el voice_id real desde .env
node cli.mjs sonda                    # mide creditos_por_caracter/caracteres_por_minuto reales contra la API
node cli.mjs estimar video_007        # usa las constantes medidas sobre el texto ya en narration.txt
node cli.mjs voz video_007            # generacion completa -- SOLO tras tu aprobacion expresa de voz/modelo/ajustes y presupuesto
```

Ninguno de estos se ejecutó. `node cli.mjs voces` y `node cli.mjs sonda` no generan audio narrado, pero sí llaman a la API de ElevenLabs — los dejo listados como candidatos para cuando autorices ese primer contacto de solo lectura, no los ejecuté por iniciativa propia.

## 10. Riesgos y hallazgos — resumen

1. **Versión de fuentes rectoras no coincide** (plan pide v2.2/v3, el repo tiene v2.1) — reportado en §1, no corregido por mi cuenta.
2. **`voice_id` real y calibración específica de Video 6 no recuperables desde este contenedor** — viven fuera de git por diseño; hace falta `.env`/`calibracion.json` reales o tu confirmación directa.
3. **Riesgo de duración corta**: con el ritmo medido (794 car/min), la narración sola da ~39,5 min contra un objetivo de 50–55 min; las pausas tendrían que ser mucho más largas que en Video 6 para cerrar la diferencia. Necesita una muestra real para resolverse, no una suposición mía.
4. **El pipeline actual (`cmdVoz`) no tiene reanudación incorporada** — el rescate de Video 6 fue manual y ad hoc. Propongo un diseño nuevo (§7), demostrado pero no implementado en el pipeline compartido.
5. Todo lo demás — 24 bloques, 10 pausas, 3 Shorts, ningún párrafo/cita partido, ningún párrafo sobre el tope de la API — validó limpio.

---

**No se hicieron llamadas a ElevenLabs. No se generó audio. No se descargaron clips. No se añadió música. No se renderizó nada. No se gastó ningún crédito.**

Quedo detenido aquí, a la espera de que autorices: (a) el diseño de persistencia del §7, (b) el presupuesto de las muestras del §6/§8, y (c) confirmar o corregir la discrepancia de versión del §1 — antes de tocar `node cli.mjs voces` o cualquier otra llamada real a ElevenLabs.
