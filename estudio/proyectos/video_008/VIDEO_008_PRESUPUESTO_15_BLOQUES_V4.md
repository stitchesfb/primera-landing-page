# Video 8 — Presupuesto de los 15 bloques restantes (eleven_v4)

**Estado:** presupuesto corregido, **pendiente de tu aprobación. No se ha generado ningún audio.**
**Fecha:** 2026-10-25
**Bloques cubiertos:** 3–17 (los bloques 1, 2, 18 y 19 ya están recuperados y confirmados — ver `manifiesto_recuperacion.json`).

## 1. Configuración aprobada para los bloques 3–17

| Parámetro | Valor |
|---|---|
| `voice_id` | `8mBRP99B2Ng2QwsJMFQl` |
| `model_id` | `eleven_v4` |
| `stability` | 0,50 |
| `similarity_boost` | 0,75 |
| `speed` | 1,00 |
| `output_format` | `mp3_44100_128` |

**Se omiten**, igual que en la prueba aprobada: `style`, `use_speaker_boost`, `seed` y contexto (`previous_text`/`next_text`).

No se requiere otra prueba independiente para confirmar esta configuración — queda tomada como aprobada para los 15 bloques.

## 2. Caracteres por bloque (del plan técnico aprobado)

| Bloque | Caracteres |
|---|---:|
| 03 | 1.700 |
| 04 | 1.679 |
| 05 | 1.466 |
| 06 | 1.498 |
| 07 | 1.486 |
| **08** | **1.800 — el más largo de los 15** |
| 09 | 1.680 |
| 10 | 1.525 |
| 11 | 1.792 |
| 12 | 1.675 |
| 13 | 1.510 |
| 14 | 1.421 |
| 15 | 1.463 |
| 16 | 1.483 |
| 17 | 1.439 |
| **Total** | **23.617** |

(Corrección respecto a la versión anterior de este documento: el bloque más largo es el **08**, 1.800 caracteres, no el 03 como escribí antes — el bloque 03 tiene 1.700. La tabla de caracteres ya estaba correcta; el error estaba solo en el texto que lo acompañaba.)

Los Shorts 1, 2 y 3 no se presupuestan aparte: se extraen del audio ya generado de los bloques 3, 9 y 12, no son bloques TTS propios.

## 3. Tarifa — publicada vs. observada (no se confunden entre sí)

**Tarifa publicada**, consultada directamente en la API (`GET /v1/models`, campo `model_rates` del modelo `eleven_v4`):

```json
{"character_cost_multiplier": 1, "cost_discount_multiplier": 1}
```

Esto significa **1 crédito por carácter, sin descuento** para `eleven_v4` — es el dato oficial de ElevenLabs para esta cuenta, no una estimación. Para comparar: `eleven_flash_v2_5` (el modelo de los bloques 1/2/18) publica `character_cost_multiplier: 0,5` — la mitad de precio, consistente con que v4 es notablemente más caro que Flash.

**Consumo observado** (un solo dato, el bloque 19 ya generado): el propio historial registra `character_count_change_from: 8597 → character_count_change_to: 9194`, delta de 597 créditos. El denominador correcto es **1.356 caracteres** (el texto realmente generado, incluida la frase aprobada "Puede descansar sin recorrer cada posibilidad" — corrección respecto al 1.351 que usé antes, que era el conteo del guion escrito, no el del audio real). Eso da `597 / 1.356 = 0,4403` créditos/carácter — **menos de la mitad** de la tarifa publicada.

**No presento esta cifra observada como garantía.** Es un solo punto de datos, puede reflejar algún descuento de cuenta no visible en `model_rates`, una particularidad de ese envío en concreto, o simplemente ruido del contador. El presupuesto de abajo se arma con la **tarifa publicada** (la confiable); la cifra observada queda solo como referencia de contexto.

## 4. Presupuesto propuesto

| | Créditos |
|---|---:|
| 23.617 caracteres × 1 crédito/carácter (tarifa publicada) | 23.617 |
| + reserva 15% para correcciones | 3.543 |
| **Total propuesto** | **27.160** |

*Referencia de contexto, no parte del presupuesto:* si el consumo real siguiera pareciéndose al del bloque 19 (0,4403 créditos/carácter, sin garantía), el gasto real rondaría los 11.957 créditos — bastante menos. El presupuesto que pido aprobar es el de 27.160, calculado con la tarifa oficial.

## 5. Capacidad de la cuenta

```
Plan: creator
Usados este ciclo: 10.808 créditos (al 2026-10-24)
Límite del ciclo:  190.773 créditos
Reinicio del ciclo: 2026-11-16
```

27.160 créditos caben cómodamente dentro de lo disponible.

## 6. Forma de proceder propuesta — empezar por el bloque 8, no el 3

Con la configuración ya aprobada y sin necesidad de otra prueba, propongo generar primero **un solo bloque real** de los 15 — el **bloque 8** (el más largo, 1.800 caracteres) — guardar su resultado (audio + alineación + metadatos, igual que los 4 ya recuperados) y **comprobar el cargo real** contra el contador de la cuenta antes de continuar con los 14 restantes. Esto confirma la tarifa real de esta cuenta con datos de hoy, no solo con el dato de hace unos días del bloque 19, antes de comprometer el resto del presupuesto.

(En tu mensaje señalas "comenzar por el bloque 3 como parte de los 15 pendientes" — mantengo ese orden si lo prefieres así; la única razón por la que propongo el 8 en su lugar es que, al ser el más largo, da la medición de costo por carácter más estable. Cualquiera de los dos sirve igual como primer bloque de control; dímelo y genero el que prefieras.)

## 7. Qué falta antes de generar

1. **Tu aprobación de este presupuesto** (27.160 créditos).
2. Confirmar si el primer bloque de control es el 3 o el 8.
3. Aprobación auditiva final de las duraciones de pausa P03–P08 (siguen pendientes, "propuesta" en el plan técnico).

**No se ha generado ningún audio.**
