# DECISIONES CERRADAS --- PIPELINE ORACIONES BÍBLICAS DIARIAS

**Versión:** 1.0\
**Fecha base:** 23 de agosto de 2026\
**Canal:** Oraciones Bíblicas Diarias

Este documento es la fuente canónica de decisiones reutilizables ya
probadas, discutidas y aprobadas.

## Regla de control de cambios

No reemplazar estas decisiones por recomendaciones nuevas por iniciativa
propia. Si una propuesta contradice este documento, indicar primero:

> **Esto contradice una decisión cerrada anterior.**

Explicar qué contradice, por qué se propone cambiarlo y esperar
aprobación.

Cuando durante una producción se apruebe una nueva decisión
reutilizable, señalar:

> **ACTUALIZAR DECISIONES CERRADAS**

Las decisiones específicas de un solo video no deben agregarse salvo que
se conviertan en regla general.

## 1. Estrategia editorial

**PROBLEMA HUMANO → RESPUESTA BÍBLICA**

Comenzar por lo que la persona está viviendo y después seleccionar la
respuesta bíblica. El contenido debe cumplir exactamente la promesa de
título y miniatura.

Cluster actual: **ansiedad nocturna + mente acelerada + preocupaciones +
dificultad para dormir + descanso bíblico.**

## 2. Principios bíblicos

-   Contenido cristiano basado en la Biblia.
-   Compatible con principios Adventistas del Séptimo Día sin mencionar
    la denominación.
-   No usar teología de prosperidad.
-   No prometer riqueza, curación garantizada, desaparición de problemas
    ni resultados materiales específicos.
-   No garantizar que "todo estará bien" en el sentido de obtener un
    resultado concreto.
-   Sí hablar bíblicamente de paz, confianza, esperanza, descanso,
    fortaleza, oración, dirección y protección.
-   Las afirmaciones positivas deben tener fundamento bíblico.

## 3. Guion antes de producción

Antes de gastar créditos TTS: completar guion → revisar doctrina →
eliminar redundancias → revisar progresión emocional → estimar duración
→ revisar pronunciación → aprobar → generar TTS.

No rellenar para alcanzar duración.

Progresión nocturna preferida:

**problema → reconocimiento → entrega → Palabra → oración → confianza →
descanso → silencio.**

Conforme avanza: **menos enseñanza → menor densidad verbal → más oración
→ más pausas → descanso.**

## 4. ElevenLabs

-   Narración: ElevenLabs.
-   Preferencia probada: **Flash v2.5** por calidad/costo.
-   Preparar números y referencias bíblicas para pronunciación natural
    en narración.
-   No regenerar TTS por problemas que podían detectarse antes.

## 5. Shorts y TTS

Los Shorts derivados reutilizan `audio.mp3` del largo. **No generar TTS
nuevo** salvo decisión explícita.

## 6. Forced alignment

Autorizado usar ElevenLabs para forced alignment cuando sea necesario.
En pruebas anteriores no generó narración nueva ni gasto de créditos
TTS. Preferir alineación real a timings aproximados.

## 7. Biblioteca musical

En `estudio/assets/music/`:

-   `one_step_closer.mp3` --- One Step Closer --- Aakash Gandhi
-   `alone_with_my_thoughts.mp3` --- No.7 Alone With My Thoughts ---
    Esther Abrami
-   `touching_moment.mp3` --- Touching Moment --- Wayne Jones

No volver a pedir descarga/subida. Están declaradas en `canal.json`.

## 8. Normalización musical

Conservar normalización entre pistas. Referencia usada: aproximadamente
**−33.5 LUFS** para la cama procesada.

## 9. Volumen nocturno

Preset `noche`:

-   **−23 dB bajo voz**
-   **−23 dB en interludios**

La música **NO aumenta cuando calla la voz**. No restaurar −23/−15.5 dB.

## 10. Loop musical

Usar el sistema existente de **recorte de fundidos/silencios + crossfade
de \~4 s**. No usar empalme simple ni reconstruir el sistema sin revisar
la implementación.

## 11. Pausas e interludios

Baseline nocturno: - normales: **2--4 s** - después de
versículos/momentos importantes: **5--7 s** - entre grandes bloques:
**8--12 s**

Música al mismo nivel durante interludios. No acumular música al final
solo para completar duración.

## 12. Visuales nocturnos

**No usar 14--16 imágenes por defecto.**

Baseline: **UNA imagen principal de alta calidad**. Excepcionalmente
**2--3 máximo** con razón narrativa clara.

## 13. Partículas

Partículas/motas blancas flotantes suaves aprobadas para estilo
nocturno. Los números exactos usados anteriormente no son regla
universal.

## 14. Zoom / Ken Burns nocturno

El zoom anterior fue casi imperceptible y `zoompan` elevó mucho el
tiempo de render. Para el siguiente largo nocturno:

**imagen fija + partículas, SIN zoompan continuo.**

## 15. Videos de mañana

Las reglas visuales nocturnas no son universales. En mañana pueden tener
sentido Ken Burns, movimiento lateral o más cambios visuales.

## 16. Tiempo de render

Un largo de \~33 min tardó \~98 min en una producción anterior.
Optimizar por **calidad perceptible / costo computacional**. Validar
fotogramas/muestras antes del render largo.

## 17. Shorts --- formato

-   **1080×1920, 9:16**
-   escena diseñada verticalmente
-   safe zone **80 px por lado**
-   validación real con libass

## 18. Fix off-by-one

`envolver()` compara contra `anchoSeguro - 2`. Mantener validador
estricto; no reemplazar por tolerancia.

## 19. Hooks de Shorts

Problema comprensible inmediatamente. Hooks probados: - **¿NO PUEDES
DORMIR?** - **¿TU MENTE NO SE DETIENE?**

Hook desde frame 0, \~2 s, sin fade-in de entrada y separado
espacialmente de subtítulos.

## 20. Aprendizajes iniciales de Shorts

Señal provisional: **problema concreto \> formulación abstracta** para
detener swipe. "¿NO PUEDES DORMIR?" rindió mejor en Stayed to watch que
"¿TU MENTE NO SE DETIENE?". No convertir todavía en ley absoluta.

## 21. Papel de Shorts

**descubrimiento → espectadores nuevos → suscriptores → largos**

También son laboratorio de hooks, problemas, lenguaje y temas. Pensar en
2--5 momentos extraíbles al escribir un largo, sin convertirlo en
colección de Shorts.

## 22. Investigación de demanda

Investigación de YouTube con \~26 capturas más capturas adicionales:
autocomplete, resultados recientes, vistas, antigüedad, velocidad
aproximada, duración, títulos, miniaturas, competencia y formato.

Oportunidad actual: **dificultad para dormir +
mente/preocupaciones/ansiedad + respuesta bíblica**, por encima de
"oración de la noche" genérica.

## 23. Cluster actual de largos

### Video #1 --- primero

**¿No Puedes Dormir? Calma Tu Mente y Entrega Tus Preocupaciones a Dios
\| Filipenses 4** - Base: Filipenses 4:6-7 - Objetivo: \~48--55 min -
Miniatura de trabajo: **¿NO PUEDES DORMIR?**

### Video #2 --- después de terminar #1

**Salmo 91 para Dormir en Paz \| Oración de Protección para Soltar el
Miedo Esta Noche** - 55--70 min - Miniatura: **DUERME SIN MIEDO** -
SALMO 91 secundario

### Video #3

**Oración para la Ansiedad Antes de Dormir \| Calma Tu Mente y Descansa
en Dios** - 45--60 min - Miniatura: **CALMA TU MENTE**

## 24. Cierre nocturno

No despertar al espectador con CTA energético. CTA discreto, si se usa,
antes del tramo profundamente calmado. Final: **menos voz → más pausas →
música → descanso.**

## 25. Pipeline / Claude Code

Existe pipeline desarrollado y probado. Antes de crear algo nuevo:
**inspeccionar → reutilizar → modificar solo lo necesario.** Ya existen
validaciones de sincronización, duración, subtítulos, safe zones,
música, perfil nocturno, Shorts y hooks.

## 26. Publicación YouTube

Revisar: - Category: **People & Blogs** - Language: **Spanish** -
Audience: **Not made for kids** - Playlist nocturna: **Oraciones de la
Noche \| Oraciones para Dormir** - Related video de Shorts al largo
cuando corresponda - opción de contenido alterado/sintético/AI según lo
realmente utilizado

# Regla final

Antes de recomendar algo contradictorio:

> **Esto contradice una decisión cerrada anterior: \[decisión\].**\
> **Razón para considerar el cambio: \[razón\].**

Esperar aprobación.

# Changelog

## v1.0 --- 23 de agosto de 2026

Primera consolidación formal del sistema aprobado.
