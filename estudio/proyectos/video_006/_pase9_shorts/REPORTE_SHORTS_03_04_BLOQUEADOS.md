# Short 3 y Short 4 — bloqueados por falta de pausa natural

Ninguno de los dos se produjo. No se inventó ninguna pausa, no se cortó la
última frase y no se superpuso la tarjeta CTA sobre palabras habladas.

## Short 3 (p80–p84, hook "MIRA LAS AVES DEL CIELO")

- Última palabra del intervalo (p84 "...cuánto valor tenemos delante de
  ti."): termina en **442.9905s**.
- Siguiente palabra pronunciada (p85 "No somos un detalle perdido..."):
  empieza en **442.9905s**.
- **Pausa disponible: 0.000s** — p85 arranca en el mismo instante en que
  termina p84, sin ningún hueco.
- Mínimo requerido: 1.5s. **No se cumple.**

## Short 4 (p224–p230, hook "DIOS YA SABE LO QUE NECESITAS")

- Última palabra del intervalo (p230 "...por qué estamos preocupados, él
  sabe."): termina en **1223.9345s**.
- Siguiente palabra pronunciada (p231 "Antes de que amanezca..."):
  empieza en **1223.9345s**.
- **Pausa disponible: 0.000s** — mismo caso: cero hueco entre p230 y
  p231.
- Mínimo requerido: 1.5s. **No se cumple.**

Ambos valores se calcularon directamente desde `alignment.json` v4 (resta
exacta entre el `fin` de la última palabra del intervalo y el `inicio` de
la primera palabra siguiente), sin redondeos que pudieran ocultar un hueco
real.

## Qué se necesitaría para producirlos

Si el guion permite mover el punto de corte del Short (por ejemplo,
terminar el Short 3 en p83 en vez de p84, o el Short 4 en p229 en vez de
p230) o si hay una pausa natural en otro punto cercano que sí sirva de
espacio para el CTA, puedo recalcular con ese nuevo límite. También es
válido decidir que estos dos Shorts no lleven tarjeta CTA (cierre directo
sin invitación al video completo) si prefieres esa alternativa — pero eso
requiere tu aprobación explícita antes de tocar nada, ya que cambia la
plantilla congelada.
