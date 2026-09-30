# Video 7 — Plan técnico previo a TTS

**Fecha:** 29 de septiembre de 2026  
**Guion canónico:** `VIDEO_007_GUION_APROBADO.md`  
**Estado:** guion aprobado; preflight técnico pendiente; no autorizado para generación completa  
**Fuentes rectoras:** `SISTEMA_ACTIVO_ORACIONES_BIBLICAS_DIARIAS.md` v2.2 y `VIDEO_TEMPLATE_ORACIONES_BIBLICAS_DIARIAS.md` v3

## 1. Resumen confirmado

- 24 bloques editoriales semánticos.
- 5.190 palabras narradas.
- 31.483 caracteres narrados aproximados, excluyendo encabezados y marcas de producción.
- 10 pausas importantes propuestas; sus duraciones todavía no están aprobadas.
- 3 Shorts marcados con límites limpios.
- Objetivo: 50–55 minutos.
- No se autoriza todavía música, clips, montaje ni render.

## 2. Estimación preliminar de créditos

La estimación debe confirmarse con el modelo real, la vía de generación y cualquier multiplicador de la voz:

| Escenario | Guion completo, antes de correcciones |
|---|---:|
| API Flash/Turbo v2.5 a 0,5 créditos por carácter | aproximadamente 15.742 créditos |
| Multilingual v2 o generación a 1 crédito por carácter | aproximadamente 31.483 créditos |
| Voz con multiplicador | multiplicar el valor anterior por la tarifa real |

No se debe presentar ninguna de estas cifras como costo definitivo hasta que Claude identifique el modelo, el método de generación y el multiplicador de la voz configurada.

## 3. Datos que Claude debe recuperar antes de cualquier llamada TTS

1. Voz exacta usada en la narración canónica anterior y su `voice_id`.
2. Modelo exacto y su `model_id`.
3. `stability`, `similarity_boost`, `style`, `use_speaker_boost`, velocidad y cualquier semilla o parámetro adicional.
4. Formato de salida, frecuencia, tasa de bits y normalización prevista.
5. Método real de facturación: web o API; créditos por carácter; multiplicador de la voz.
6. Estado de los scripts de generación, persistencia, recuperación y ensamblaje.
7. Lugar persistente donde se guardarán originales, manifiesto, revisiones y maestro aprobado.

No se copiarán valores de `DECISIONES_CERRADAS_ORACIONES_BIBLICAS_DIARIAS_v1.2_ARCHIVO.md`. Si falta un valor, debe declararse como desconocido y detenerse antes de generar.

## 4. Preflight obligatorio del texto

Claude debe producir, sin llamar a ElevenLabs:

- extracción del texto realmente facturable, sin encabezados ni instrucciones entre corchetes;
- conteo de caracteres y palabras por bloque;
- hash del texto completo y de cada bloque;
- validación de los 24 bloques, 10 pausas y 3 pares de marcadores de Shorts;
- confirmación de que ninguna cita, oración, frase o Short queda dividido;
- detección de bloques demasiado largos o cortos y propuesta de ajuste, sin modificar el guion;
- estimación de duración basada en la muestra posterior, no solamente en palabras por minuto asumidas;
- presupuesto de créditos para muestras, generación completa y reserva de correcciones.

## 5. Muestras recomendadas

Propuesta inicial, sujeta al conteo exacto de Claude:

| Muestra | Contenido | Qué valida |
|---|---|---|
| A | Bloque 01 completo | Gancho, velocidad inicial, volumen y estabilidad de la apertura |
| B | Bloque 07 completo | Cita bíblica, tono pastoral y Short 2 |
| C | Bloques 10 y 11 completos, generados por separado y unidos | Cambio entre Palabra y oración; continuidad real entre bloques |
| D | Bloque 24 completo | Ritmo calmado, finales de palabras y cierre |

Volumen orientativo: alrededor de 5.600 caracteres. Estimación preliminar: cerca de 2.800 créditos con API Flash/Turbo o 5.600 a un crédito por carácter, antes de cualquier multiplicador.

La muestra debe incluir las pausas propuestas relacionadas con esos fragmentos. Después de generarla, se medirá la velocidad real de narración para confirmar si el guion alcanza 50–55 minutos.

## 6. Persistencia obligatoria

Antes de generar una muestra, deben existir:

- directorio persistente del Video 7;
- archivo de texto canónico inmutable;
- manifiesto con número, texto, hash, voz, modelo, ajustes, estado y `history_item_id` de cada bloque;
- escritura del audio original inmediatamente después de cada respuesta válida;
- reanudación que salte bloques cuyo texto y configuración no cambiaron;
- estados canónicos `narracion_original`, `narracion_revision_NN` y `narracion_aprobada`;
- registro de errores y créditos estimados/consumidos.

No se aceptará un flujo que conserve todo únicamente en memoria hasta terminar.

## 7. Control de calidad de las muestras

Revisar y reportar:

- palabras completas y pronunciación de nombres bíblicos;
- velocidad, volumen, timbre y altura percibida;
- consistencia entre bloques;
- residuos vocales, barridos o sonidos extraños;
- duración de cada pausa;
- unión 10→11 escuchada con margen antes y después;
- ausencia de recortes automáticos agresivos;
- duración real, palabras por minuto y proyección del video completo.

Después de entregar las muestras y el informe, Claude debe detenerse. La generación de los 24 bloques requiere una nueva aprobación expresa de Orlando.

## 8. Texto exacto para enviar a Claude Code

```text
Vamos a continuar el Video 7 de Oraciones Bíblicas Diarias.

Antes de actuar, lee completos los archivos activos del repositorio:
- SISTEMA_ACTIVO_ORACIONES_BIBLICAS_DIARIAS.md
- VIDEO_TEMPLATE_ORACIONES_BIBLICAS_DIARIAS.md

La antigua Decisiones Cerradas v1.2 está archivada y no gobierna esta producción.

Te adjunto VIDEO_007_GUION_APROBADO.md y VIDEO_007_PLAN_TECNICO_PRE_TTS.md. El guion fue aprobado por Orlando. La generación TTS completa NO está autorizada.

Trabaja primero en modo preflight, sin llamar a ElevenLabs, sin consumir créditos, sin descargar clips, sin añadir música y sin renderizar.

1. Revisa el estado de git y conserva cualquier cambio existente que no pertenezca a esta tarea.
2. Incorpora los dos archivos del Video 7 en la ubicación canónica del proyecto sin sobrescribir fuentes ajenas.
3. Audita el pipeline de Video 6 y recupera del manifiesto canónico la voz, voice_id, model_id, ajustes, formato de audio y método de persistencia realmente usados. No los supongas y no los copies del documento archivado.
4. Extrae del guion solamente el texto narrado. Excluye títulos, notas y marcas entre corchetes.
5. Valida y reporta: 24 bloques, 10 pausas importantes, 3 pares de marcadores de Shorts, palabras y caracteres por bloque, total facturable y hashes.
6. Confirma que ninguna frase, cita, oración completa o segmento de Short se divide. Señala cualquier problema sin modificar el guion.
7. Calcula créditos para las muestras y para el audio completo usando el modelo, la vía API/web y el multiplicador reales. Incluye una reserva separada para correcciones.
8. Diseña y demuestra el método de persistencia y reanudación por bloque: texto, hash, audio original, voz, modelo, ajustes, history_item_id y estado. Un reinicio no debe perder trabajo ni volver a gastar créditos en bloques idénticos.
9. Propón las muestras A–D descritas en el plan técnico. No las generes todavía.
10. Devuélveme un informe claro con hallazgos, riesgos, costo, archivos que crearías/modificarías y comandos previstos.

Detente allí y espera aprobación. No hagas llamadas TTS ni implementes cambios de producción todavía.
```

## 9. Próxima aprobación requerida

Orlando debe revisar el informe de Claude y autorizar expresamente:

1. voz, modelo y ajustes;
2. presupuesto de las muestras;
3. persistencia y recuperación;
4. generación exclusiva de las muestras A–D.

La aprobación de las muestras no autoriza automáticamente la generación completa.
