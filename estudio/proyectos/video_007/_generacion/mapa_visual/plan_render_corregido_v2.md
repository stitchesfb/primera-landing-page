# Video 7 — Plan corregido de render del video largo (v2)

**Estado:** `plan_render_pendiente_aprobacion` — **no se ha renderizado nada con este plan.**
**Fecha:** 2026-10-18

## 0. Qué pasó con el intento anterior

El primer intento (v1) redujo el mapa de ~189 tomas a solo **28 segmentos de 11–246 segundos**, cada uno con un único movimiento Ken Burns continuo. Esto reintroducía exactamente el problema que la revisión 04 corrigió: movimiento casi imperceptible por estar repartido en tomas demasiado largas. **Quedó rechazado y detenido** antes de terminar — el render se interrumpió en el segmento 12 de 28 (se mataron los procesos `node`/`ffmpeg` en ejecución). Los 12 archivos parciales generados se movieron a `segmentos_RECHAZADOS_tomas_largas/` en el scratchpad de la sesión, marcados con un `RECHAZADO.md` explícito — nunca se comprometieron al repositorio, así que no hay nada que limpiar ahí.

**Se conserva de ese intento:**
- Las 3 correcciones documentales (189 tomas exactas, PIX6 en 22/24 no en 6, N7/N14/N15 como repetición consecutiva deliberada) — ya comiteadas, siguen vigentes.
- La importación y validación de N1–N16 — ya comiteada, sigue vigente.
- El audio preparado (narración desde 90,000s hasta el final + música en bucle al mismo nivel ya aprobado): verificado en **−33,5 LUFS exacto**, idéntico al de la revisión 04. Las fuentes (`narracion_revision_03_sin_musica.mp3`, `alone_with_my_thoughts.mp3`) se confirmaron sin cambios (`git status` limpio). Este audio queda reutilizable para el render corregido.

## 1. Plan de tomas corregido — resumen

| Métrica | Valor |
|---|---|
| **Total de tomas** | **187** (1 toma puente para la cola del bloque 1 + 186 en los bloques 2–24) — técnicamente equivalente a las ~189 del mapa original |
| Duración mínima | 11,41s (la toma puente, única excepción breve por ser un enlace de transición, no una toma narrativa) |
| Duración máxima | 16,30s |
| Duración promedio | 15,06s |
| Tomas fuera del rango 10–20s | 0 (ninguna necesitó la excepción de 25s) |

Los primeros 90,000s de la revisión 04 se reutilizan **exactamente como están** (mismo archivo, sin recortar ni re-renderizar) — no se tocan en este plan. Lo nuevo empieza en 90,000s con una toma puente de 11,41s (continúa el recurso `IMG4`/lago con el que cierra la revisión 04, antes de entrar al bloque 2) y sigue hasta el final (2906,910s).

## 2. Distribución de tomas por bloque

| Bloque | Duración del bloque | Recurso(s) | Tomas |
|---|---:|---|---:|
| 1 (cola) | 11,41s | IMG4 (puente, continúa la revisión 04) | 1 |
| 2 | 92,8s | N1 | 6 |
| 3 | 91,5s | N2 | 6 |
| 4 | 83,4s | N3 | 6 |
| 5 | 92,3s | N4 | 6 |
| 6 | 163,0s | IMG3 (5) + N5 (5) | 10 |
| 7 | 101,5s | N6 | 7 |
| 8 | 157,6s | N7 | 11 |
| 9 | 150,3s | N7 (5) + N8 (6) | 11 |
| 10 | 142,4s | N6 | 9 |
| 11 | 105,3s | N9 | 7 |
| 12 | 148,3s | N10 | 10 |
| 13 | 95,2s | N11 | 6 |
| 14 | 98,0s | N12 | 7 |
| 15 | 150,4s | N13 | 10 |
| 16 | 94,5s | N14 | 6 |
| 17 | 151,9s | N14 | 10 |
| 18 | 152,8s | N1 | 10 |
| 19 | 96,0s | HUM13 | 6 |
| 20 | 132,2s | N15 | 9 |
| 21 | 106,2s | N15 | 7 |
| 22 | 168,0s | IMG2 (5) + PIX6 (6) | 11 |
| 23 | 153,9s | N16 | 10 |
| 24 | 78,3s | IMG4 (2) + PIX6 (3) | 5 |
| **Total** | | | **187** |

Los bloques 8→9 (N7), 16→17 (N14) y 20→21 (N15) mantienen la continuidad deliberada: la misma imagen aparece en ambos bloques, pero **cada bloque tiene sus propias tomas independientes** (sin un plano único de 2+ minutos) — la continuidad es de recurso, no de toma.

## 3. Variedad dentro de un mismo recurso — reencuadres

Cuando un bloque necesita varias tomas de la misma imagen (la mayoría de los casos), cada toma usa un **reencuadre distinto**, tomado de una paleta corta por imagen (3–5 variantes), para no repetir el mismo plano:

- **Plano abierto**: la escena casi completa, zoom de entrada mínimo.
- **Acercamiento al rostro** (en las imágenes con la mujer): foco en la zona de los ojos/rostro.
- **Detalle de manos**: foco en el gesto de manos cuando la imagen lo permite.
- **Objeto/Biblia/reloj/vela/teléfono**: foco en el elemento específico de la escena.
- **Ventana/luna**: foco en la ventana donde la imagen la incluye.
- Direcciones de zoom alternadas entre tomas consecutivas de la misma imagen (nunca ida y vuelta dentro de una toma, pero la toma siguiente puede zoomear hacia un punto distinto al de la anterior).

Ninguna toma individual supera el 7–8% de cambio de escala — ese rango se aplica **por toma corta**, no repartido en 2 minutos.

## 4. Método técnico para generarlas eficientemente

1. **Una toma = una llamada `zoompan` de ffmpeg** (la misma técnica ya validada en la revisión 04): imagen escalada a 5016×2823, zoom lineal 7–8% hacia un punto focal fijo, salida 1280×720 a 30fps, duración 10–20s. Es exactamente el mismo método que ya funcionó, solo que aplicado 187 veces con la duración correcta en vez de 28 veces con duración incorrecta.
2. **Generación por lote**: un script Node.js itera la lista de 187 tomas (recurso + foco + zoom + duración) y llama a ffmpeg una vez por toma — ya está escrito y probado (es el mismo `construir_segmentos.mjs` de este intento, solo necesita el plan de 187 tomas en vez del de 28 segmentos).
3. **Encadenado por grupos, no en un solo paso.** Encadenar 187 clips en una sola llamada de ffmpeg con 187 entradas y ~186 etapas de `xfade` es un riesgo real: el costo de una cadena de `xfade` encadenada no es lineal con el número de etapas, y una sola llamada así podría tardar mucho más de lo esperado o fallar por complejidad del grafo de filtros. Mitigación: encadenar en **grupos de ~10 tomas** (≈19 grupos), producir 19 clips intermedios, y luego encadenar esos 19 en una segunda pasada. Mismo resultado visual, pero cada llamada individual de ffmpeg queda acotada.
4. **Partículas**: una sola superposición del bucle canónico (82 partículas, 24s) sobre toda la cadena nueva ya armada — sin cambios respecto al intento anterior.
5. **Audio**: ya construido y verificado (narración + música a −33,5 LUFS) — se reutiliza tal cual, sin reconstruir.
6. **Ensamblado final**: revisión 04 (0–90s, intacta) + toma puente + cadena de bloques 2–24, en ese orden, con el audio ya preparado.

## 5. Costo estimado de tiempo y almacenamiento

| Fase | Estimación |
|---|---|
| Generación de las 187 tomas (zoompan individual) | ~40–55 minutos de cómputo (tomas más cortas que antes, pero son muchas más) |
| Encadenado por grupos (19 grupos + unión final) | ~15–30 minutos adicionales (mitigado respecto al riesgo de una cadena única de 187 entradas) |
| Overlay de partículas + mux final | ~5–10 minutos |
| **Total estimado** | **~1 a 1,5 horas de cómputo**, en varias llamadas en segundo plano con puntos de control intermedios (no una sola ejecución de hora y media sin supervisión) |
| Almacenamiento — 187 clips individuales | ~150–200 MB (observado: ~50 KB por segundo de salida a este crf/resolución) |
| Almacenamiento — mezzanine final (silencioso + partículas) | ~300–500 MB |
| **Entrega** | El render de revisión (47:30 aprox. a 720p) muy probablemente **no cabe en un solo archivo** dentro del límite de subida observado en esta sesión (~24–30 MB por archivo) — se entregaría en **varias partes** (posiblemente 8–15, según el crf elegido para la revisión) |

## 6. Pendiente

**No se inicia ningún render nuevo hasta que Orlando apruebe este plan v2** (conteo de tomas, duraciones, distribución por bloque, y el método de encadenado por grupos). Los primeros 90 segundos de la revisión 04 permanecen intactos y no se tocan en ningún escenario. El audio ya preparado queda listo para reutilizarse en cuanto se apruebe.
