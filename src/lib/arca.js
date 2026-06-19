/**
 * arca.js — Helper React para comunicarse con el proceso principal de Electron
 * via window.arca (expuesto en preload.cjs).
 *
 * Si la app se ejecuta fuera de Electron (p.ej. en dev con solo Vite),
 * las funciones devuelven un error descriptivo en lugar de romper.
 */

function estaEnElectron() {
  return typeof window !== 'undefined' && typeof window.arca !== 'undefined'
}

function errorNoElectron() {
  return { ok: false, error: 'ARCA solo está disponible en la aplicación de escritorio.' }
}

export const arca = {
  cargarConfig: () =>
    estaEnElectron() ? window.arca.cargarConfig() : Promise.resolve(errorNoElectron()),

  guardarConfig: (config) =>
    estaEnElectron() ? window.arca.guardarConfig(config) : Promise.resolve(errorNoElectron()),

  eliminarCert: () =>
    estaEnElectron() ? window.arca.eliminarCert() : Promise.resolve(errorNoElectron()),

  seleccionarArchivo: (tipo) =>
    estaEnElectron() ? window.arca.seleccionarArchivo(tipo) : Promise.resolve(errorNoElectron()),

  verificarConexion: () =>
    estaEnElectron() ? window.arca.verificarConexion() : Promise.resolve(errorNoElectron()),

  solicitarCAE: (datos) =>
    estaEnElectron() ? window.arca.solicitarCAE(datos) : Promise.resolve(errorNoElectron()),

  solicitarNC: (datos) =>
    estaEnElectron() ? window.arca.solicitarNC(datos) : Promise.resolve(errorNoElectron()),
}
