# Video 8 — Escenas aprobadas (sustituyen los 6 briefs anteriores)

**Estado:** 4 de 6 escenas recibidas, verificadas y persistidas. **Pendientes: "pastor con ovejas" y "sendero".**
**Fecha:** 2026-10-29

## Esta selección sustituye los briefs anteriores

Orlando generó y aprobó en ChatGPT una hoja de contacto con 6 escenas distintas a las propuestas en `BRIEFS_6_IMAGENES.md` (que pedían evitar símbolos literales del salmo). Esta nueva selección **reemplaza** esos 6 briefs para el Video 8 — incluye imaginería literal (pastor con ovejas, valle) por decisión explícita del creador. No se regenera nada por diferencia con los briefs anteriores.

Las 6 escenas aprobadas:

1. Dormitorio nocturno
2. Pastor con ovejas — **pendiente de recibir**
3. Aguas tranquilas
4. Sendero — **pendiente de recibir**
5. Valle
6. Mesa sencilla

## Origen de los 5 archivos recibidos y resolución de duplicados

Se recibieron 5 archivos (selección incompleta, con un dormitorio duplicado), identificados y verificados:

| Archivo recibido | Contenido | Resolución |
|---|---|---|
| `images/2.webp` | Dormitorio nocturno — **sin marca de número** | **Conservado** → `E1_dormitorio_nocturno.png` |
| `images/3.webp` | Mesa con pan, copa, vela, aceitunas y vista a la ventana | **Conservado** → `E6_mesa_sencilla.png` |
| `images/4.webp` | Valle con río, luna y montañas | **Conservado** → `E5_valle.png` |
| `images/5.webp` | Arroyo entre piedras y flores, luna reflejada en el agua | **Conservado** → `E3_aguas_tranquilas.png` |
| `images/6.webp` | Dormitorio nocturno — **con una marca "1" visible en la esquina superior izquierda**, y un tapiz enmarcado en la pared que no aparece en `2.webp` | **Descartado**, por instrucción explícita ("conserva solo el dormitorio final sin número") |

Las 4 imágenes conservadas se convirtieron de WebP a PNG sin pérdida adicional (mismo contenido, solo cambio de contenedor) y se guardaron en `originales/`, a 1672×941 — mismo estándar que N1–N16 del Video 7.

## Verificación de recorte vertical (9:16), individual y sin exigir centrado

Se probó un recorte vertical (529×941) para cada una de las 4 imágenes, desplazado según dónde cae el punto de interés real — no centrado por defecto:

| Imagen | Resultado | Qué se pierde en el recorte |
|---|---|---|
| `E1_dormitorio_nocturno` | **Funciona bien.** Ventana, luna y colinas completas, cama en primer plano. | La lámpara y el velador (quedan fuera, a la izquierda). |
| `E3_aguas_tranquilas` | **Funciona muy bien** — quizás mejor que el horizontal: luna, reflejo y arroyo quedan alineados verticalmente. | Vegetación lateral (poca pérdida de interés). |
| `E5_valle` | **Funciona bien.** Luna, río serpenteante y primer plano rocoso conservados. | Montañas laterales (no afecta el punto focal). |
| `E6_mesa_sencilla` | **Funciona, con una pérdida real:** pan, copa y vista a la luna se conservan, pero **la vela y el cuenco de aceitunas quedan fuera** del encuadre (están más a la derecha de lo que el recorte vertical permite sin perder el pan). | Vela y aceitunas — a confirmar si es aceptable o si se prefiere un recorte alternativo centrado en la vela en vez del pan. |

Previsualizaciones del recorte: `pruebas_recorte_vertical/`.

## Pendiente antes de la prueba audiovisual de 60–90s

Faltan 2 de las 6 escenas (**pastor con ovejas**, **sendero**) — Orlando las enviará. Hasta tenerlas no se puede completar el mapa de escenas ni construir la prueba audiovisual, porque faltaría cobertura visual para los bloques 3–4 (Short 1) y 9–11 (Short 2).
