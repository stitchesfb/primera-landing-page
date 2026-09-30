# Sistema activo — Oraciones Bíblicas Diarias

**Versión:** 2.2  
**Fecha:** 19 de septiembre de 2026  
**Función:** fuente principal para tomar decisiones del canal.  
**Regla central:** conservar lo que funciona, probar una variable a la vez y actualizar el sistema con evidencia.

## 1. Cómo se clasifican las decisiones

| Estado | Qué significa | Cómo puede cambiar |
|---|---|---|
| **Permanente** | Principio doctrinal, ético o de identidad | Solo con aprobación expresa del creador |
| **Baseline activo** | Método actual por defecto | Puede revisarse cuando haya evidencia nueva |
| **Experimento** | Cambio limitado para aprender | Debe indicar alcance, métrica y fecha de revisión |
| **Archivado** | Decisión anterior que ya no gobierna | Se conserva como historial, no como instrucción |

Una decisión antigua no debe impedir aprovechar herramientas o formatos nuevos. La inteligencia artificial puede proponer alternativas a los baselines, pero no puede cambiar por sí sola los principios permanentes ni autorizar gastos.

## 2. Principios permanentes

- El canal ofrece consuelo, oración y esperanza basados en la Biblia.
- El contenido debe ser compatible con la fe adventista del séptimo día sin presentar el canal como portavoz oficial de una denominación.
- No se promete prosperidad, curación, protección física garantizada ni resultados sobrenaturales asegurados.
- No se inventan citas bíblicas. Toda referencia debe verificarse antes de grabar.
- Se habla con empatía a una persona que necesita paz, no como una clase teológica ni como una fórmula automática.
- No se usa material visual, musical o sonoro sin una licencia válida.
- No se compra material, suscripción o licencia sin aprobación previa del creador.
- El creador aprueba el guion final antes de generar la voz o realizar el render definitivo.

## 3. Estrategia activa del canal

### Baseline editorial

Cada video parte de un problema humano concreto y ofrece una respuesta bíblica clara. El grupo temático prioritario es:

- dormir en paz;
- entregar el miedo y la ansiedad nocturna;
- protección y confianza en Dios;
- Salmo 91 y pasajes relacionados.

Esto se mantiene porque los datos recientes muestran que el video largo de Salmo 91 es la referencia más fuerte del canal: CTR aproximado de 5,2 %, retención cercana al 42 %, duración media de 13:42–14:21 y fuerte distribución por recomendaciones de YouTube.

### Audiencia de referencia

- Predominio femenino y alta presencia de personas de 55 años o más.
- Consumo importante tanto en móvil como en televisión.
- La mayoría de las visualizaciones proviene de personas nuevas y no suscritas.

Consecuencia práctica: ritmo sereno, dicción clara, texto grande, contraste alto y una llamada a suscribirse breve y natural.

### Regla de revisión

- Estrategia de videos largos: cada **3 videos largos o 60 días**, lo que ocurra primero.
- Shorts: cada **3 a 5 publicaciones**.
- Herramientas, modelos de voz y flujo técnico: cada **60 a 90 días**.
- Revisión completa del sistema: cada **6 meses**.

## 4. Producción: baselines, no cadenas permanentes

### Guion y voz

- Estructura recomendada: dolor concreto → presencia de Dios → Palabra → oración → entrega → descanso.
- La progresión emocional debe ir de la tensión al reposo sin repetir ideas solo para aumentar la duración.
- La voz, velocidad, estabilidad y pausas actuales son un baseline. Se confirman antes de cada producción importante y pueden cambiar después de una prueba corta.
- Antes de generar todo el audio, producir una muestra breve cuando se cambie voz, modelo, herramienta o puntuación.

### TTS por bloques y control de costos

- No generar una solicitud TTS independiente por cada párrafo. El baseline es agrupar la narración en bloques continuos y semánticamente completos.
- Para un video largo de aproximadamente 45–60 minutos, el punto de partida es **20–30 bloques** de aproximadamente **1.200–2.000 caracteres**. Este rango se confirma mediante una prueba y puede ajustarse; no es un límite permanente.
- Un bloque no debe dividir una frase, cita bíblica, oración completa ni segmento marcado para un Short.
- La apertura debe generarse como un bloque suficientemente continuo para estabilizar ritmo, tono y timbre; no como varias frases breves aisladas.
- Antes de gastar los créditos del audio completo, documentar: cantidad de bloques, caracteres facturables, créditos estimados, duración estimada, voz, modelo, ajustes y método de persistencia.
- La generación completa requiere aprobación expresa del creador después de revisar una prueba que incluya: apertura, lectura o aplicación bíblica, tramo calmado del cierre, al menos una unión entre bloques y las pausas previstas.
- Si un defecto daña una palabra o cambia claramente la voz, se regenera el bloque afectado desde su texto aprobado. No se inicia una cadena indefinida de recortes sobre la palabra.

### Pausas y continuidad

- Priorizar la puntuación y la respiración natural dentro de los bloques. No añadir una pausa digital después de cada párrafo por defecto.
- Como punto de partida para una oración nocturna larga, usar aproximadamente **8–12 pausas importantes** en total, reservadas para citas, cierres emocionales y transiciones entre grandes secciones.
- El plan debe detectar y evitar pausas importantes demasiado próximas entre sí o junto a un interludio de bloque.
- Las cantidades y duraciones exactas se aprueban con la muestra de audio; no se heredan automáticamente de otro video.

### Persistencia y fuente canónica

- Cada bloque debe conservar: número, texto exacto, audio original, voz, modelo, ajustes, identificador de History cuando exista, hash de texto/configuración y estado de revisión.
- Los bloques y el manifiesto deben guardarse de forma persistente durante la generación, no solamente al terminar. Un reinicio no debe provocar pérdida de trabajo aprobado.
- Si texto, voz, modelo y ajustes no cambiaron, reutilizar el bloque existente en vez de gastar créditos nuevamente.
- Mantener fuentes originales inmutables. Toda reconstrucción parte de esas fuentes, nunca de un maestro ya recortado o recomprimido.
- Usar nombres y estados canónicos claros: `narracion_original`, `narracion_revision_NN` y `narracion_aprobada`. El manifiesto identifica exactamente qué bloques contiene cada versión.

### Control de calidad del audio

- La coincidencia de palabras es necesaria, pero no suficiente. También se revisan continuidad, timbre, velocidad, altura percibida, finales de palabras, residuos vocales y pausas.
- Exportar y escuchar una muestra corta alrededor de **cada unión entre bloques** y de cada pausa importante antes de aprobar el maestro.
- No aplicar recortes globales agresivos por RMS, silencio o alineación de caracteres sin una prueba comparativa aprobada que demuestre que no toca fonemas.
- Decodificar las fuentes una sola vez para el montaje y evitar recomprimir durante correcciones intermedias. El archivo final se codifica después de aprobar el maestro.
- No comenzar música, visuales ni render largo mientras la narración permanezca rechazada.

### Puntos de aprobación de producción

1. Tema, promesa, título, miniatura y pasajes.
2. Estructura del video y Shorts planificados.
3. Guion completo y citas verificadas.
4. Plan de bloques TTS, pausas, costo y persistencia.
5. Muestras TTS y uniones.
6. Narración completa sin música.
7. Prueba audiovisual de 60–90 segundos.
8. Render final y control de calidad.
9. Video largo y paquete de Shorts listos para publicación.

Ninguna etapa costosa comienza si la etapa anterior no está aprobada.

### Música y mezcla

- Música suave, sin cambios bruscos y siempre subordinada a la voz.
- Mantener márgenes cómodos para quienes escuchan con televisión, teléfono o audífonos.
- Cualquier cambio de pista, volumen o dinámica debe verificarse con una muestra antes del render completo.

### Shorts

- Pueden derivarse del video largo, pero deben funcionar por sí solos desde el primer segundo.
- El gancho debe expresar el problema de inmediato.
- No es obligatorio reutilizar exactamente el mismo audio si una adaptación mejora claridad o retención.
- Los Shorts derivados se planifican **antes de cerrar el guion definitivo y antes de generar la narración** del video largo.
- Para cada Short se define previamente: problema o gancho, pasaje o idea bíblica, duración aproximada, relación con el video largo y necesidad de una introducción adaptada.
- Los segmentos aprovechables se integran de forma natural en el guion largo y se marcan como `[INICIO SHORT N]` y `[FIN SHORT N]`.
- Cada segmento debe tener límites limpios de párrafo y pausas suficientes antes y después para poder extraerse sin palabras cortadas ni transiciones abruptas.
- Cuando el audio largo esté aprobado, los Shorts pueden producirse desde el mismo paquete de narración y quedar listos junto con el video largo.

## 5. Política visual y de licencias

La imagen estática deja de ser una regla fija. Sigue siendo una opción válida cuando sirve al ambiente de oración, pero también pueden usarse clips con movimiento lento.

### Realidad del material gratuito

- Las bibliotecas gratuitas suelen ofrecer sobre todo clips cortos de naturaleza: cielo nocturno, estrellas, luna, nubes, agua, árboles, montañas, lluvia o luz suave.
- Los clips específicos de Jesús, escenas bíblicas o recreaciones religiosas con frecuencia son de pago o tienen licencias más restrictivas.
- Por ello, el plan visual gratuito no debe depender de encontrar escenas bíblicas o de Jesús.

### Baseline visual económico

- Priorizar clips gratuitos de naturaleza nocturna y contemplativa.
- Se permiten clips cortos repetidos con suavidad, recortes diferentes, velocidad moderada y fundidos, siempre que el resultado no se sienta mecánico.
- El movimiento debe ser lento; evitar estímulos rápidos, cortes frecuentes y efectos que interrumpan la oración.
- Se puede combinar video de naturaleza con una o dos imágenes devocionales propias o correctamente licenciadas.
- Registrar para cada recurso: sitio, autor si aplica, enlace, tipo de licencia y fecha de descarga.
- No usar una imagen o clip de procedencia incierta.

### Material bíblico o de Jesús

- No asumir que es gratuito.
- Si un recurso es de pago, presentarlo como opción separada con precio y licencia; no comprarlo sin autorización.
- Material generado con inteligencia artificial puede evaluarse como alternativa, pero requiere aprobación específica de estilo, coherencia y uso antes de incluirlo.

## 6. Experimento visual del Video 7

**Estado:** experimento aprobado en principio; storyboard y recursos exactos aún por confirmar.

**Hipótesis:** añadir movimiento sereno con clips gratuitos de naturaleza nocturna puede mejorar la permanencia sin distraer de la oración.

**Alcance:** solo el Video 7. No convierte automáticamente todos los videos futuros al mismo formato.

**Diseño recomendado:**

- base visual de clips gratuitos de naturaleza nocturna;
- ritmo de cambios lento y coherente con las secciones del guion;
- reutilización discreta de clips cuando sea necesario;
- sin depender de videos pagados de Jesús o escenas bíblicas;
- prueba de 60–90 segundos antes del montaje completo.

**Comparación principal:** usar como referencia el video largo de Salmo 91.

| Métrica | Referencia aproximada | Qué observar en Video 7 |
|---|---:|---|
| CTR | 5,2 % | Si título y miniatura atraen al público correcto |
| Retención a 30 s | 66 % | Si la apertura y el movimiento sostienen la atención |
| Duración media | 13:42–14:21 | Si el nuevo formato mantiene la sesión de oración |
| Porcentaje visto | 42 % | Si mejora o conserva la profundidad de consumo |
| Tráfico sugerido/recomendado | Muy alto | Si YouTube continúa asociándolo al grupo ganador |

No se debe atribuir todo cambio al movimiento: también influyen tema, título, miniatura, duración y hora de publicación.

## 7. Cómo se toma una decisión nueva

Antes de cambiar un baseline, anotar:

1. Qué problema intenta resolver.
2. Qué variable cambia.
3. En cuántos videos se probará.
4. Qué métrica decidirá si se adopta, ajusta o descarta.
5. Cuándo se revisará.

Resultado posible:

- **Adoptar:** pasa a baseline activo.
- **Ajustar:** se repite con una modificación concreta.
- **Descartar:** vuelve al baseline anterior.
- **Inconcluso:** no hay suficiente información y no se declara ganador.

## 8. Archivo histórico

El documento `DECISIONES_CERRADAS_ORACIONES_BIBLICAS_DIARIAS_v1.2_ARCHIVO.md` se conserva como registro de lo que se había establecido. Ya no es la fuente principal de instrucciones.

## 9. Próxima revisión

- Revisar el experimento visual después de publicar el Video 7 y recopilar datos de 48 horas y 7 días.
- Revisar la estrategia general al completar tres videos largos desde esta versión o el 18 de noviembre de 2026, lo que ocurra primero.
- Revisar todo el sistema el 18 de marzo de 2027.
