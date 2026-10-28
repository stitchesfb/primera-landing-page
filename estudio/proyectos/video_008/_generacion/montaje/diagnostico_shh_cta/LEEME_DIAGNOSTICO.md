# Video 8 — Diagnóstico del "shh" del segundo 11 + metadatos reales de tu prueba

**Estado:** investigación y propuesta, sin generar nada todavía. **No se llamó a ElevenLabs en esta tarea.**
**Fecha:** 2026-10-28

## 1. Metadatos reales de tu prueba (consultados por API, no supuestos)

Encontré tu prueba en el historial de la cuenta: dos generaciones seguidas (5s de diferencia), con un texto distinto al CTA (un cierre del Salmo 23 con otra invitación a suscribirse), en dos modelos (`eleven_v4` y `eleven_v4_exp`):

| Campo (según la API) | Valor verificado |
|---|---|
| `history_item_id` | `QBgguof2MIEp835fVnH9` (eleven_v4) y `YViOZ7diXpWhId4Gn4DE` (eleven_v4_exp) |
| `stability` | **0,65** |
| `similarity` (= `similarity_boost` en la llamada de generación) | **0,88** |
| `text_boost` | `false` |
| `focus` | `null` |
| `speed` | **no aparece en este objeto de ajustes del historial** |
| "clone strength" | **no existe ningún campo con ese nombre, aquí ni en ningún otro lugar que pude consultar** |

Como el historial no trae `speed` ni nada parecido a "clone strength", consulté también la voz misma (`GET /v1/voices/8mBRP99B2Ng2QwsJMFQl`), que guarda los últimos ajustes usados como configuración por defecto:

```
stability: 0.65
similarity_boost: 0.88
speed: 0.91
style: 0.0
use_speaker_boost: true
```

Esto coincide con `stability`/`similarity` de tu prueba, así que es casi seguro que **0,91 fue la velocidad real que usaste**, aunque ese dato no viene en el objeto de "ajustes" del propio ítem de historial — solo lo pude confirmar mirando el estado actual de la voz.

**Idioma:** confirmado como `es` (español), con locale `es-AR`, pero es un atributo de la VOZ (`fine_tuning.language`, `labels.language`, `verified_languages`), no un parámetro que se envíe en cada generación de `eleven_v4`. No hay nada que ajustar ahí.

**Sobre "Clone Strength":** busqué el término en la referencia oficial de la API de ElevenLabs y en su documentación pública. **No existe ningún parámetro ni control documentado con ese nombre.** El más cercano documentado es `similarity_boost` (llamado "Similarity" o, en versiones antiguas de la interfaz, "Clarity + Similarity Enhancement"). Pero no puedo confirmar que sea lo mismo: si "Clone Strength: Low" fuera equivalente a un `similarity_boost` bajo, 0,88 sería un valor alto, no bajo — así que no es una correspondencia obvia. **Siguiendo tu instrucción de no asumir, no voy a adivinar este campo.** Necesito que me digas en qué pantalla exacta de ElevenLabs viste "Clone Strength" (Voice Settings, Voice Lab / edición de la voz, etc.) para buscar su equivalente real, o que confirmes que generemos solo con los campos que sí pude verificar: `stability` 0,65, `similarity_boost` 0,88, y opcionalmente `speed` 0,91 / `style` 0,0 / `use_speaker_boost` true (estos tres últimos nunca los habíamos usado explícitamente antes).

## 2. El "shh" del segundo 11 — encontrado y explicado

Localicé exactamente dónde cae ese sonido y comparé las tres fuentes por separado, con análisis de energía en frecuencias altas (>3,5 kHz, donde vive un sonido "sh"/"s") en ventanas de 0,05–0,2s:

- **En la CTA recién generada (`cta_regenerada.mp3`), sola:** no hay nada anómalo. Su propio inicio ("Si esta oración...") tiene la "S" normal de esa palabra, donde debe estar — ver `D_inicio_cta_regenerada_0-1.2.mp3`.
- **En el contexto original (`4.mp3`), sin cortar, escuchado de forma continua:** no hay ningún artefacto — es una grabación limpia. Ver `B_contexto_original_4mp3_53.5-57.5.mp3`.
- **Pero al medir con precisión de 0,05s dentro de ese mismo tramo original**, encontré que el sonido de la "S" de la antigua CTA ("Si esta oración...") **empieza a sonar (ya como fricativa, subiendo de volumen) en el segundo 55,45–55,50** del bloque 4 original — **antes** de los 55,6s que usé como punto de corte (ese 55,6s viene del tiempo que la alineación de ElevenLabs *etiqueta* como inicio de la "S", pero el sonido real de una fricativa como la "S" empieza a oírse un poco antes de ese instante etiquetado).

**Conclusión:** el "antes_original" que usé para la muestra (corte en 55,6s) **se quedó con los últimos ~0,10–0,15s de esa "S" que iba a empezar a sonar**, justo en la cola del fragmento "antes", inmediatamente antes del silencio que inserté. Por eso se escucha como un "shh" aislado, flotando justo donde debería haber silencio puro: no es un defecto de la nueva CTA, no es un error de la unión/concatenación en sí — es que **mi punto de corte quedó unos 0,10–0,15s tarde**, dejando un fragmento de la "S" vieja pegado al final del contexto "antes". Ver `E_cola_antes_original_usado_9.5-fin.mp3` (se oye silencio y luego ese fragmento justo al final) y `C_union_muestra_entregada_9.5-13.5.mp3` (el mismo punto, ya dentro de la muestra que te entregué).

**Corrección propuesta para la próxima integración (no aplicada todavía):** mover el corte de "antes_original" de 55,6s a ~55,40–55,45s (antes de que la fricativa empiece a sonar), para que el silencio quede limpio. Esto no requiere generar nada nuevo — es solo un ajuste de dónde cortar el archivo original.

## Archivos de esta investigación

- `B_contexto_original_4mp3_53.5-57.5.mp3` — bloque 4 original, sin cortar, continuo.
- `C_union_muestra_entregada_9.5-13.5.mp3` — el mismo punto dentro de la muestra que ya te entregué (con el "shh").
- `D_inicio_cta_regenerada_0-1.2.mp3` — inicio limpio de la CTA nueva, para contraste.
- `E_cola_antes_original_usado_9.5-fin.mp3` — la cola del fragmento "antes" tal cual se usó, mostrando el fragmento de "S" pegado al final.
- Metadatos crudos de tu prueba: `estudio/proyectos/video_008/_generacion/audio/regeneracion_cta_bloque4/historial_prueba_usuario_*.json` y `voz_detalle_8mBRP99B2Ng2QwsJMFQl.json`.

## Qué falta antes de generar

1. Tu confirmación sobre "Clone Strength": o me dices dónde lo vas a buscar para verificarlo, o apruebas generar solo con los campos confirmados (`stability` 0,65, `similarity_boost` 0,88, y si quieres, `speed` 0,91 / `style` 0,0 / `use_speaker_boost` true).
2. Confirmar si quieres que use el **texto original del CTA** (el mismo de siempre: "Si esta oración te acompaña... ante Dios.") con esta nueva configuración — así lo pediste, lo confirmo aquí para que quede explícito antes de generar.
3. Nada de esto se ha generado todavía. `4.mp3`, la CTA anterior (speed 0,85/stability 0,60) y la narración completa siguen intactos.
