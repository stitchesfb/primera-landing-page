# Sonrisa Imperial — Landing Page

Landing page de una sola pantalla para la clínica dental **Sonrisa Imperial**.
Objetivo único: que el visitante agende una cita.

HTML, CSS y JavaScript puros. Sin build, sin dependencias, sin framework.

## Estructura

```
index.html        Toda la página (hero, tratamientos, clínica, formulario, footer)
css/styles.css    Estilos
js/main.js        Validación del formulario y envío por WhatsApp
img/clinica.svg   Ilustración del hero
```

## Ver en local

Abre `index.html` en el navegador, o levanta un servidor estático:

```bash
python3 -m http.server 8000   # http://localhost:8000
```

## Qué personalizar antes de publicar

| Dato | Dónde |
| --- | --- |
| Número de WhatsApp | `js/main.js` → constante `WHATSAPP` (solo dígitos, con código de país) |
| Teléfono y enlaces `tel:` / `wa.me` | `index.html` |
| Dirección y horarios | `index.html` (hero, sección *Agendar* y footer) |
| Cifras del panel (años, pacientes, calificación) | `index.html`, bloque `.stats` |
| Testimonio | `index.html`, bloque `.quote` |
| Colores | `css/styles.css` → variables `--brand`, `--accent` |
| Imagen del hero | `img/clinica.svg`. Para usar una foto real, reemplaza el `<img>` de `.hero-figure` en `index.html`; el marco de arco lo aplica el CSS, así que cualquier foto vertical encaja |

## Cómo funciona el formulario

No hay backend. Al enviar, el formulario valida los campos y abre WhatsApp con
el mensaje ya redactado (nombre, teléfono, día, horario y motivo), listo para
que el paciente lo envíe y la clínica confirme.

Si más adelante quieres que las solicitudes lleguen por correo o a un CRM,
solo hay que reemplazar el bloque de envío al final de `js/main.js` por un
`fetch()` al endpoint correspondiente.

## Publicar

Es un sitio estático: sirve cualquier hosting (GitHub Pages, Netlify, Vercel,
Cloudflare Pages). Basta con subir la carpeta tal cual.
