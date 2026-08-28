# DECISIONES CERRADAS --- PIPELINE ORACIONES BÍBLICAS DIARIAS

**Versión:** 1.2\
**Fecha base:** 28 de agosto de 2026\
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
-   Voz aprobada para Oraciones Bíblicas Diarias: **El Faraon - Full,
    Clear, Mellow**.
-   Voice ID: `8mBRP99B2Ng2QwsJMFQl`.
-   Ajustes aprobados: `speed 0.91`, `stability 0.65`,
    `similarity_boost 0.88`, `style 0.0`, `speaker_boost on`.
-   Formato aprobado: `mp3_44100_128`.
-   No confundir con Carlos Aguilar (`8MeTTgXVwMEhRVfblXOj`) ni con
    El Faraón - Powerful and Resonant (`9TcPbUAhHnAV8mzFDAWU`).
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

## 27. Autonomía operativa y microaprobaciones

Una vez aprobados el contenido, los segmentos y la composición visual,
el pipeline puede resolver sin pedir aprobación adicional:

-   ajuste de wrapping sin cambiar el sentido;
-   reducción de hooks dentro de los mínimos ya validados;
-   división semántica de subtítulos usando la alineación existente;
-   selección de fotogramas de control y nombres técnicos de archivos;
-   correcciones localizadas y retrocompatibles cubiertas por pruebas;
-   validación, render, commit, push y entrega del artifact después de
    aprobar las muestras visuales.

Debe detenerse solamente ante:

-   audio faltante, corrupto u omitido;
-   regresión en pruebas existentes;
-   imposibilidad de mantener safe zones, tamaños mínimos o contenido
    aprobado;
-   necesidad de TTS nuevo, gasto de créditos o llamada externa no
    necesaria;
-   acción destructiva;
-   cambio doctrinal, editorial o de la promesa del contenido;
-   fallo no localizado del workflow.

No convertir ajustes menores de texto o implementación en rondas de
microaprobación.

## 28. Audio de Shorts derivados

La fuente canónica es el `output/audio.mp3` final y ya aprobado del video
largo.

-   Cada rango contiguo debe extraerse como **una sola pieza continua**.
-   No reconstruir la voz párrafo por párrafo: produce discontinuidades
    audibles similares a detener y reiniciar una cinta.
-   Reiniciar PTS solamente al comienzo de cada tramo completo y
    codificar una sola vez al final del montaje.
-   Un Short multi-tramo puede usar varios rangos continuos y pausas
    declaradas explícitamente.
-   No aplicar fades, silencios ni recodificaciones en límites internos
    de párrafos.
-   Si un empalme entre tramos lo necesita, permitir microfundido de
    5--10 ms solamente en los bordes externos.
-   Validar continuidad auditiva además de duración y cobertura.

## 29. Reutilización de alineación

Si `alignment.json` y `timeline.json` existen, corresponden al audio
canónico y pasan validación, deben reutilizarse.

-   No volver a ejecutar forced alignment durante un render normal.
-   No llamar a ElevenLabs solamente para reconstruir un archivo ya
    alineado.
-   Forced alignment sigue autorizado cuando la alineación falta, está
    desactualizada o es inválida; la llamada externa debe declararse con
    precisión.
-   Distinguir siempre forced alignment de generación TTS, pero no decir
    "no se llamó a ElevenLabs" cuando sí hubo una petición HTTP real.

## 30. Hooks y subtítulos de Shorts

-   Hooks: máximo **2 líneas**, cuerpo mínimo **72**.
-   Subtítulos: máximo **3 líneas**, cuerpo mínimo **60**.
-   Safe zone: **80 px por lado**, validada con libass real.
-   Si un hook no cabe, puede acortarse conservando el mismo problema y
    promesa; si cambia el significado, requiere aprobación.
-   Una frase larga puede dividirse en varios rótulos mediante los
    tiempos reales de palabras, sin eliminar palabras ni alterar el
    audio.
-   Los cortes forzados deben ser opcionales/localizados y no cambiar el
    agrupamiento de otros subtítulos.

## 31. Música para Shorts nocturnos

Baseline aprobado tras los Shorts del Video 5:

-   `one_step_closer.mp3`;
-   normalización aproximada de la cama a **−35.5 LUFS**;
-   **−23 dB bajo voz**;
-   loop/crossfade existente;
-   sin aumento de volumen durante pausas.

No usar un generador de piano/pad, una nota sostenida aislada ni un
fragmento diminuto repetido. Esta referencia es para Shorts nocturnos y
no reemplaza automáticamente la normalización ya documentada para
videos largos.

## 32. Persistencia y entrega técnica

-   Después de pasar pruebas y aprobar muestras, guardar el trabajo con
    commit antes de tareas largas o procesos en segundo plano.
-   Los MP4 finales se entregan mediante artifacts; no se guardan dentro
    del repositorio.
-   No usar `git reset --hard` sin autorización explícita.
-   Un reinicio de contenedor no invalida un commit, workflow o artifact
    ya confirmado en GitHub.

# Regla final

Antes de recomendar algo contradictorio:

> **Esto contradice una decisión cerrada anterior: \[decisión\].**\
> **Razón para considerar el cambio: \[razón\].**

Esperar aprobación.

# Changelog

## v1.2 --- 28 de agosto de 2026

Se incorporaron los aprendizajes aprobados de los Shorts del Video 5:
autonomía sin microaprobaciones, audio continuo por tramo, soporte
multi-tramo, cortes de subtítulos con alineación existente, reutilización
de alignment sin llamadas externas innecesarias, música nocturna de
Shorts y persistencia previa a tareas largas. La versión final v2 de los
tres Shorts fue revisada y aprobada por el usuario.

## v1.1 --- 23 de agosto de 2026

Se documentó la voz y configuración de ElevenLabs aprobada mediante
muestra técnica para Oraciones Bíblicas Diarias.

## v1.0 --- 23 de agosto de 2026

Primera consolidación formal del sistema aprobado.
