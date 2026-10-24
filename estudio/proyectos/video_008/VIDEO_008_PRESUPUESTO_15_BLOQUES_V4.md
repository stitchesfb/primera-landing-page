# Video 8 — Presupuesto de los 15 bloques restantes (eleven_v4)

**Estado:** propuesta de presupuesto, **no autoriza gasto**. No se generó ningún audio al preparar este documento.
**Fecha:** 2026-10-24
**Bloques cubiertos:** 3–17 (los bloques 1, 2, 18 y 19 ya están recuperados y confirmados — ver `manifiesto_recuperacion.json`).

## 1. Caracteres por bloque (del plan técnico aprobado)

| Bloque | Caracteres |
|---|---:|
| 03 | 1.700 |
| 04 | 1.679 |
| 05 | 1.466 |
| 06 | 1.498 |
| 07 | 1.486 |
| 08 | 1.800 |
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

Los Shorts 1, 2 y 3 (dentro de los bloques 3, 9 y 12) **no se presupuestan aparte**: el guion aprobado indica explícitamente que no son bloques TTS propios, se extraen del audio ya generado de esos bloques.

## 2. Tarifa — dato real, no inventado, y su límite

El plan técnico aprobado propone una "tarifa prudente histórica de 0,276 créditos/carácter", pero **ese número es específico de `eleven_flash_v2_5`** (así lo registra el propio código del proyecto, `estudio/lib/elevenlabs.mjs`: es el descuento de Flash, obtenido comparando el contador de la cuenta antes/después de llamadas reales). **No aplica a `eleven_v4`**, que es el modelo pedido para estos 15 bloques — aplicarlo igual subestimaría el costo real.

En vez de inventar una tarifa para v4, uso el único dato real disponible de una generación en v4 de este mismo proyecto: el bloque 19 (revisión 04, `WGMbjBfRYJ8TXSXk7RYT`), cuyo propio registro de historial trae el contador de la cuenta antes y después:

```
character_count_change_from: 8597
character_count_change_to:   9194
delta:                        597 créditos
texto del bloque:            1.351 caracteres (según el mapa del plan técnico)
```

`597 / 1.351 = 0,4419 créditos/carácter` — este es el dato observado, no una suposición.

**Advertencia honesta:** es un solo punto de datos (una sola generación), no una muestra estadística. Por eso este presupuesto da un rango, no una cifra única.

## 3. Presupuesto — dos escenarios

| Escenario | Créditos (23.617 car.) | + reserva 15% correcciones | **Total propuesto** |
|---|---:|---:|---:|
| **A — con el dato real del bloque 19** (0,4419 créditos/car.) | 10.436 | 1.565 | **12.002** |
| **B — conservador, sin descuento** (1,0 crédito/car., tarifa base sin multiplicador) | 23.617 | 3.543 | **27.160** |

El costo real probablemente cae entre A y B. Para no comprometer un número sin verificar más, **antes de generar los 15 bloques** recomiendo repetir exactamente lo que ya hizo el bloque 19: generar **un bloque de control adicional en `eleven_v4`** (por ejemplo el bloque 3, el más largo de los 15) y medir su propio `character_count_change` real, confirmando la tarifa antes de comprometer el resto del presupuesto — tal como pide el propio plan técnico aprobado ("Confirmar tarifa y multiplicador antes de llamadas").

## 4. Capacidad de la cuenta (verificado ahora, sin generar nada)

```
Plan: creator
Usados este ciclo: 10.808 créditos
Límite del ciclo:  190.773 créditos
Disponible:        179.965 créditos
Reinicio del ciclo: 2026-11-16
```

Cualquiera de los dos escenarios (12.002 o 27.160 créditos) cabe cómodamente dentro de lo disponible este ciclo — la capacidad de la cuenta no es una restricción aquí, solo el costo en sí.

## 5. Configuración pendiente de confirmar

El plan técnico aprobado pide recuperar del manifiesto canónico de Video 7 (voz, `voice_id`, `model_id`, `stability`, `similarity_boost`, `style`, `use_speaker_boost`, velocidad, formato) — **no están disponibles en los documentos consultados**, tal como el propio plan técnico ya anticipaba ("No están disponibles en los documentos consultados. No inventarlos ni cambiar modelo"). Lo que sí tengo, de los bloques ya recuperados:

- Bloques 1/2/18 (Flash v2.5): `stability:0.65, similarity_boost:0.88, use_speaker_boost:true, style:0, speed:0.91` — pero son ajustes de **Flash v2.5**, no necesariamente los mismos que deben usarse en **v4** para los 15 bloques restantes.
- Bloque 19 (v4): el historial solo confirma `stability:0.5`; Orlando indicó que los valores realmente usados fueron `stability:0,50, similarity_boost:0,75, speed:1,00` — estos son los únicos valores de v4 disponibles hasta ahora para los 15 bloques restantes, pero provienen de lo que Orlando recuerda, no de un registro verificado independientemente.

**No se puede armar un comando de generación completo para los 15 bloques sin que Orlando confirme explícitamente qué `voice_id`/ajustes de v4 usar** — ninguno de los dos documentos aportados los trae, y no corresponde inventarlos.

## 6. Pausas (de la propuesta del plan técnico, pendiente de aprobación auditiva)

P03–P08 (las que caen dentro de los bloques 3–17): propuestas a 7s cada una, "duraciones finales pendientes de aprobación auditiva" — no se asumen como definitivas aquí.

## 7. Qué falta antes de poder generar

1. Confirmar la tarifa real de `eleven_v4` para esta cuenta (recomendado: un bloque de control, no los 15 de una vez).
2. Confirmar `voice_id` y ajustes completos de v4 a usar (no están en los documentos disponibles).
3. Aprobación explícita del presupuesto (uno de los dos escenarios, o el que resulte del bloque de control).
4. Aprobación auditiva final de las duraciones de pausa P03–P08.

**No se generó ningún audio al preparar este presupuesto.**
