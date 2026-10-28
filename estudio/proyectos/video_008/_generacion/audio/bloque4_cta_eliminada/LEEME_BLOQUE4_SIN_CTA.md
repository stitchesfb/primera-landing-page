# Video 8 — Bloque 4 sin el párrafo del CTA (montaje local, sin ElevenLabs)

**Estado:** aplicado, parte de la narración completa v3.
**Fecha:** 2026-10-28

## Por qué

Orlando reportó que en la muestra de la CTA v2 al 80%, el tramo desde el segundo 27 hasta el final sonaba mejor. Se identificó ese tramo con precisión: corresponde exactamente a `seg3_despues_original.mp3` (local `4.mp3` 66,8s–77,28s), es decir **"Padre, mi vida necesita tu dirección. Quiero trabajar y cuidar lo que me has confiado sin convertir cada resultado en la medida de mi valor."** — audio **original, sin ningún procesamiento** (ni regeneración, ni cambio de velocidad). **No incluye la invitación a suscribirse** en absoluto.

Como el tramo que sonó mejor no contiene el CTA, se siguió la instrucción de Orlando: eliminar todo el párrafo del CTA (incluida "Ahora seguimos presentando nuestras cargas ante Dios") y unir naturalmente "...una palabra que nos anima a seguir." con "Padre, mi vida necesita tu dirección...".

## Cómo se hizo

Se usó directamente `4.mp3` (original, sin tocar) y su alineación, con el mismo método de medición acústica ya usado en tareas anteriores (análisis de energía en ventanas de 0,02s, no los tiempos etiquetados por la alineación):

- **Fin real del habla de "...seguir."**: segundo 54,56–54,60 (silencio limpio a partir de ahí).
- **Inicio real del habla de "Padre, mi vida..."**: segundo 55,34–55,36 en el resultado final (ver más abajo) — en el `4.mp3` original esto corresponde al segundo 67,38–67,40.
- Se cortó `4.mp3` en dos partes: **Parte A** (0s a 54,60s, todo lo anterior) y **Parte B** (67,38s al final del bloque, 115,23s) y se unieron con **0,75s de silencio añadido**.
- Se verificó el resultado: la pausa real queda en **0,78s** (medida con filtro de banda ancha, más preciso que el filtro de sibilantes usado para el diagnóstico anterior), consistente con las pausas naturales de párrafo que la propia voz usa en otras partes de este mismo bloque (0,6–0,8s reales, una vez corregido el desfase de la alineación).
- Se verificó que la unión queda sin ningún artefacto: silencio limpio y continuo, sin residuos.

## Archivos

- `4_sin_cta.mp3` — el bloque 4 editado, sin el párrafo del CTA, con la unión natural. Duración: 103,21s (el original `4.mp3` sin editar dura 115,23s).
- `parte_A_hasta_seguir.mp3` y `parte_B_desde_padre.mp3` — las dos piezas usadas, para referencia.

**`4.mp3` y `4.alignment.json` (los originales) no se tocaron.** Este es un archivo nuevo y separado.

## Dónde se usa

Se usó `4_sin_cta.mp3` en lugar de `4.mp3` únicamente al ensamblar `video_008_narracion_completa_sin_musica_con_pausas_v3.mp3`. El resto de bloques y las 10 pausas (P01–P10) no cambiaron — siguen con los mismos puntos de corte corregidos (P02 y P10) de la versión v2. La pausa P03 (7s, frontera bloque 4→bloque 5) sigue intacta, ahora inmediatamente después del final del bloque 4 editado.
