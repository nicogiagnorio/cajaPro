/**
 * googleCal.js — wrapper React para llamar a Google Calendar via Electron IPC.
 * En browser (dev sin Electron) retorna errores controlados para no romper la UI.
 */

const isElectron = typeof window !== 'undefined' && !!window.googleCal

function noDisponible(fn) {
  return async (...args) => {
    if (isElectron) return window.googleCal[fn](...args)
    return { ok: false, error: 'Google Calendar solo disponible en la app de escritorio.' }
  }
}

export const googleCal = {
  cargarConfig:      noDisponible('cargarConfig'),
  guardarConfig:     noDisponible('guardarConfig'),
  iniciarOAuth:      noDisponible('iniciarOAuth'),
  listarCalendarios: noDisponible('listarCalendarios'),
  crearEvento:       noDisponible('crearEvento'),
  actualizarEvento:  noDisponible('actualizarEvento'),
  eliminarEvento:    noDisponible('eliminarEvento'),
  desconectar:       noDisponible('desconectar'),
  abrirUrl:          noDisponible('abrirUrl'),
}
