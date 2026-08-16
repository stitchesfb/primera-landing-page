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

## La clave de API

Cuatro barreras, en orden de dentro hacia fuera:

1. **`.env` está en `.gitignore`.** No puede llegar a un commit por descuido.
2. **`.env.example` no lleva valores**, solo los nombres de las variables.
3. **La clave vive en un campo privado de clase** (`#apiKey`). No es enumerable,
   así que no aparece en un `console.dir`, un `JSON.stringify` ni el volcado de
   un objeto en una traza de error.
4. **Todo lo que se imprime pasa por `redactar()`**, que sustituye la clave por
   `«ELEVENLABS_API_KEY oculta»` si por cualquier vía acabara dentro de un
   mensaje. Nunca se registra entera: como mucho, los últimos 4 caracteres para
   confirmar cuál se cargó.

`calibracion.json` guarda solo métricas —créditos, ritmo, duraciones, voice_id
y ajustes de voz— y además está en `.gitignore`, así que ni siquiera esas
medidas salen del equipo.

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

### Las 8 comprobaciones obligatorias

`importar` no marca el proyecto como válido hasta que pasan todas:

| Comprobación | Qué verifica |
| --- | --- |
| `audios_presentes` | Están todos los bloques y se mapearon |
| `block_end_coinciden` | Los cortes son límites reales, en orden y sin repetir |
| `parrafos_alineados` | Ningún párrafo queda fuera y todo bloque produjo alineación |
| `sin_subtitulos_en_interludios` | Ningún subtítulo se solapa con música sola |
| `sin_solapes` | Ningún subtítulo empieza antes de que acabe el anterior |
| `subtitulos_dentro_de_narracion` | Ninguno sobrevive al final de la voz |
| `duracion_coincide` | `audio.mp3` y `timeline.json` cuadran (±250 ms) |
| `sin_drift_acumulativo` | El silencio de cola por bloque no crece ni se vuelve negativo |

El informe queda en `output/validacion.json`. Si algo falla, el comando
termina con código 1 y el estado **no** avanza.

## Pruebas

```bash
npm test
```

Verifica sin tocar la API: duraciones por párrafo, offsets absolutos, duración
final de la pista montada, subtítulos fuera de los interludios, ausencia de
solapes, las 8 comprobaciones de importación —inyectando cada fallo por
separado para confirmar que se detectan— y que la revisión doctrinal marca los
patrones prohibidos sin falsos positivos.

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
