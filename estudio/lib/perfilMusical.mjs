/**
 * La regla musical del perfil nocturno, comprobada antes de generar nada.
 *
 * Escribir una decision en un archivo de configuracion no la protege: basta que
 * alguien ajuste un numero "solo para probar" y se quede. Por eso la regla no
 * vive solo en canal.json — se valida en el momento de usarla, y si no se
 * cumple no se genera cama ninguna.
 *
 * La regla, aprobada el 2026-08-22 tras una prueba A/B: en el perfil nocturno
 * la musica NO sube cuando calla la voz. Quien pone un video de media hora para
 * dormirse no deberia notar ningun cambio de volumen, y la subida anterior de
 * 7,5 dB caia justo en el momento de mas silencio, que es cuando mas se nota.
 */

/** Perfiles donde el volumen de la cama tiene que ser plano de principio a fin. */
const PERFILES_SIN_SUBIDA = new Set(['noche']);

export function validarPerfilMusical(canal, pilar) {
  const problemas = [];
  const notas = [];
  const preset = canal.render?.presets?.[pilar];
  if (!preset) {
    problemas.push(`No hay preset de render para el pilar "${pilar}"`);
    return { problemas, notas };
  }

  const m = preset.musica ?? {};
  if (PERFILES_SIN_SUBIDA.has(pilar)) {
    if (m.en_interludio_db !== m.bajo_voz_db) {
      problemas.push(
        `El perfil "${pilar}" tiene la cama a ${m.bajo_voz_db} dB bajo la voz y ` +
        `${m.en_interludio_db} dB en los interludios. En este perfil no puede subir: ` +
        'los dos valores tienen que ser el mismo.'
      );
    } else {
      notas.push(`cama plana a ${m.bajo_voz_db} dB, sin subida en los interludios`);
    }
  }

  const bib = canal.musica?.biblioteca ?? [];
  if (m.fuente === 'biblioteca' && bib.length === 0) {
    problemas.push(`El perfil "${pilar}" pide musica de biblioteca y la biblioteca esta vacia`);
  }

  return { problemas, notas };
}

/**
 * Pista que le toca a un proyecto.
 *
 * Un proyecto puede nombrar la suya; si no dice nada se reparte por orden sobre
 * la biblioteca, para que los videos seguidos no repitan pieza. Rotar no es un
 * capricho: escuchar la misma cama en cada video la convierte en la firma del
 * canal, y aqui la firma es la voz.
 */
export function pistaDelProyecto({ canal, proyecto, indice = 0 }) {
  const bib = canal.musica?.biblioteca ?? [];
  if (bib.length === 0) throw new Error('La biblioteca musical esta vacia');

  const pedida = proyecto?.plan?.musica;
  if (pedida) {
    const encontrada = bib.find((x) => x.archivo === pedida || x.titulo === pedida);
    if (!encontrada) {
      throw new Error(
        `El plan pide la pista "${pedida}", que no esta en la biblioteca. ` +
        `Disponibles: ${bib.map((x) => x.archivo).join(', ')}`
      );
    }
    return { ...encontrada, motivo: 'la pide el plan del proyecto' };
  }

  const elegida = bib[((indice % bib.length) + bib.length) % bib.length];
  return { ...elegida, motivo: `rotacion por orden (${indice % bib.length + 1} de ${bib.length})` };
}
