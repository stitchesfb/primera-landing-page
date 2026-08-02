/* Sonrisa Imperial — interacciones del landing.
   Único objetivo de la página: que el visitante deje una solicitud de cita. */

(function () {
  'use strict';

  // Número al que llegan las solicitudes (formato internacional, solo dígitos).
  var WHATSAPP = '525555555555';

  /* ---------------------------------------------------------- Año footer */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ------------------------------- Fecha: hoy como mínimo seleccionable */
  var fecha = document.getElementById('fecha');
  if (fecha) {
    var hoy = new Date();
    hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
    fecha.min = hoy.toISOString().slice(0, 10);
  }

  /* ---------------- CTA flotante: se oculta al llegar al formulario ---- */
  var ctaFija = document.querySelector('.cta-fixed');
  var seccionCita = document.getElementById('agendar');
  if (ctaFija && seccionCita && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entradas) {
      ctaFija.classList.toggle('is-hidden', entradas[0].isIntersecting);
    }, { threshold: 0.15 }).observe(seccionCita);
  }

  /* -------------------------------------------------- Validación y envío */
  var form = document.getElementById('form-cita');
  if (!form) return;

  var status = document.getElementById('form-status');

  var reglas = {
    nombre: function (v) {
      if (v.length < 3) return 'Escribe tu nombre completo.';
    },
    telefono: function (v) {
      if (v.replace(/\D/g, '').length < 10) return 'Escribe un teléfono de al menos 10 dígitos.';
    },
    fecha: function (v) {
      if (!v) return 'Elige un día para tu cita.';
    },
    horario: function (v) {
      if (!v) return 'Elige un horario.';
    }
  };

  function mostrarError(campo, mensaje) {
    var salida = form.querySelector('[data-error-for="' + campo.name + '"]');
    if (salida) salida.textContent = mensaje || '';
    campo.classList.toggle('is-invalid', Boolean(mensaje));
    campo.setAttribute('aria-invalid', mensaje ? 'true' : 'false');
  }

  function validarCampo(campo) {
    var regla = reglas[campo.name];
    if (!regla) return true;
    var mensaje = regla(campo.value.trim());
    mostrarError(campo, mensaje);
    return !mensaje;
  }

  // Limpia el error en cuanto el usuario corrige.
  Object.keys(reglas).forEach(function (nombre) {
    var campo = form.elements[nombre];
    if (!campo) return;
    campo.addEventListener('blur', function () { validarCampo(campo); });
    campo.addEventListener('input', function () {
      if (campo.classList.contains('is-invalid')) validarCampo(campo);
    });
  });

  function fechaLegible(valor) {
    var partes = valor.split('-');
    var d = new Date(partes[0], partes[1] - 1, partes[2]);
    return d.toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  form.addEventListener('submit', function (evento) {
    evento.preventDefault();
    if (status) status.textContent = '';

    var primerError = null;
    Object.keys(reglas).forEach(function (nombre) {
      var campo = form.elements[nombre];
      if (campo && !validarCampo(campo) && !primerError) primerError = campo;
    });

    if (primerError) {
      primerError.focus();
      return;
    }

    var datos = {
      nombre: form.elements.nombre.value.trim(),
      telefono: form.elements.telefono.value.trim(),
      fecha: form.elements.fecha.value,
      horario: form.elements.horario.value,
      motivo: form.elements.motivo.value.trim()
    };

    var mensaje =
      'Hola Sonrisa Imperial, quiero agendar una cita.\n\n' +
      'Nombre: ' + datos.nombre + '\n' +
      'Teléfono: ' + datos.telefono + '\n' +
      'Día preferido: ' + fechaLegible(datos.fecha) + '\n' +
      'Horario: ' + datos.horario +
      (datos.motivo ? '\nMotivo: ' + datos.motivo : '');

    window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(mensaje), '_blank');

    if (status) {
      status.textContent = '¡Listo, ' + datos.nombre.split(' ')[0] +
        '! Te confirmamos el horario por WhatsApp.';
    }
    form.reset();
  });
})();
