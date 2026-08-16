# Estudio — Oraciones Bíblicas Diarias

Pipeline de producción del canal. **Checkpoint 1: todo lo anterior al render.**

Convierte un guion en prosa y un plan de edición en una pista de narración
montada, con subtítulos sincronizados al milisegundo y contabilidad real de
créditos de ElevenLabs.

## Puesta en marcha

```bash
cd estudio
npm install
cp .env.example .env      # y rellena la clave y el voice_id
node cli.mjs voces        # para ver el ID de "El Faraón"
```

## Lo primero: medir, no suponer

```bash
node cli.mjs sonda
```

Genera dos muestras cortas (~130 créditos en total) y mide contra la API dos
cosas que la documentación pública no deja claras:

1. **Cuántos créditos descuenta de verdad Flash v2.5 por carácter.** En la web
   se observó 1:1 (879 caracteres = 879 créditos); varias fuentes afirman que
   por API son 0,5. De esto depende que quepan cuatro o ocho videos al mes.
2. **Si `previous_text` / `next_text` se facturan.** Se usan para que la
   prosodia no se corte entre párrafos. Si se cobraran, generar párrafo a
   párrafo costaría hasta el triple y habría que replantear la segmentación.

Lo medido se guarda en `calibracion.json` y a partir de ahí manda sobre
cualquier supuesto de `canal.json`.

## Flujo

```
estimar → revisar → aprobar-audio → voz
```

| Comando | Gasta créditos | Qué hace |
| --- | --- | --- |
| `estimar <proyecto>` | No | Valida el plan y proyecta duración y créditos |
| `revisar <proyecto>` | No | Informe doctrinal asistido + checklist del manual |
| `aprobar-audio <proyecto>` | No | Marca `APPROVED_FOR_AUDIO` |
| `voz <proyecto>` | **Sí** | Genera, monta la pista y escribe los subtítulos |
| `importar <proyecto>` | No (TTS) | Alinea audio ya existente por forced alignment |
| `estado [proyecto]` | No | Estado de cada proyecto |

`voz` se niega a ejecutarse si el proyecto no está en `APPROVED_FOR_AUDIO`. No
hay bandera para saltárselo. Antes de gastar muestra:

```
Estimated narration:                  24.5 minutes
Estimated ElevenLabs usage:           15.925 credits
Remaining monthly allowance after:    84.075
Proceed? YES/NO:
```

Al terminar compara lo estimado con lo que la API descontó de verdad y ajusta
la calibración para la próxima vez.

## Cómo se escribe un proyecto

```
proyectos/mi_video/
    narration.txt      Prosa pura. Un párrafo = un bloque separado por línea en blanco
    edit_plan.json     Pausas, interludios, cambios de imagen, cierre
    output/            Lo que genera el pipeline
```

**`narration.txt` no lleva ni una marca de edición.** Nada de `[pausa]`,
`[música]` ni corchetes. Es exactamente lo que se narra y nada más, así que no
hay nada que limpiar antes de mandarlo a la API y es imposible que la voz lea
una instrucción por error.

**`edit_plan.json` apunta a los párrafos por número** (1 = primer párrafo):

```json
{
  "pilar": "noche",
  "defaults": { "pause_after_paragraph": 3.0 },
  "events": [
    { "after": 4,  "type": "block_end", "seconds": 10, "block": 1 },
    { "after": 5,  "type": "interlude", "seconds": 6, "note": "tras Salmo 4:8" },
    { "after": 9,  "type": "image", "src": "escena_02.png", "crossfade": 2.5 },
    { "at": "end", "type": "outro", "music_seconds": 25, "fade_out": 8 }
  ]
}
```

El validador comprueba contra `canal.json` que las pausas estén entre 2 y 4 s,
los interludios de bloque entre 8 y 12 s, que haya entre 7 y 9 interludios
estratégicos en un nocturno y que la duración proyectada caiga en la ventana
de 35-40 min. Los errores bloquean; los desvíos de norma solo avisan.

## Audio ya existente

Para los bloques producidos antes de que existiera este pipeline:

```
proyectos/mi_video/audio_fuente/01.mp3  02.mp3  …
```

```bash
node cli.mjs importar mi_video
```

Usa la **forced alignment API** (audio + su transcripción → tiempos) para dar
subtítulos exactos sin regenerar voz: no cuesta créditos de TTS. En este modo
el segmento es el bloque, no el párrafo, porque las pausas internas ya vienen
grabadas; los huecos que añade el pipeline son los interludios entre bloques
declarados en el plan.

## Por qué los subtítulos no se desincronizan

Cada párrafo se genera en su propia llamada y trae tiempos **relativos a su
propio audio**. Como el pipeline conoce el offset absoluto de cada párrafo en
la línea de tiempo, suma y ya está: ningún párrafo hereda el error del
anterior, así que el desfase no se puede acumular.

El montaje ayuda a lo mismo: los mp3 se decodifican a PCM antes de unirlos,
porque concatenar mp3 arrastra el padding del codificador y desplazaría los
subtítulos poco a poco a lo largo de 40 minutos.

## Salida

```
output/
    audio.mp3         Narración montada con sus pausas, interludios y cierre
    subtitles.srt     Subtítulos desde la alineación real
    alignment.json    Cada palabra con su tiempo absoluto
    timeline.json     Lo que consumirá el renderer
    revision.json     Informe doctrinal
```

`timeline.json` es el contrato con la fase de render: dice cuándo suena voz,
cuándo hay música sola, dónde cambia la imagen y dónde empieza el fade final.

## Sobre la revisión doctrinal

`revisar` **no aprueba nada**. Detecta patrones conocidos —teología de
prosperidad, garantías de sanidad o protección, "el universo", declaraciones
mágicas, identificación denominacional— y produce un informe con la frase, la
regla del manual que toca y una reescritura sugerida.

Puede fallar en ambos sentidos: un guion sin marcas puede seguir siendo
problemático. La revisión humana sigue siendo obligatoria; esto solo evita que
se cuelen los descuidos evidentes antes de gastar créditos.

## Pendiente (Checkpoint 2)

El renderer: FFmpeg en una sola pasada con imagen, zoom lento, loop de
partículas pre-renderizado, música con ducking, fades y subtítulos incrustados.
Después, Shorts, miniaturas por familia visual y metadata.
