/**
 * etiquetas.js — Labels dinamicos segun tipo de perfil del comercio.
 */

const LABELS = {
  cliente: {
    singular:    'cliente',
    plural:      'clientes',
    titulo:      'Clientes',
    nuevo:       'Nuevo cliente',
    editar:      'Editar cliente',
    historial:   'Compras',
    sinRegistros:'No hay clientes todavia. Crea el primero.',
    buscador:    'Buscar por nombre, telefono, email o DNI...',
    sinHistorial:'Sin compras registradas todavia',
    ultimosN:    (n) => `Ultimas ${n} compras`,
    conteo:      (n) => `${n} ${n === 1 ? 'cliente' : 'clientes'}`,
  },
  paciente: {
    singular:    'paciente',
    plural:      'pacientes',
    titulo:      'Pacientes',
    nuevo:       'Nuevo paciente',
    editar:      'Editar paciente',
    historial:   'Consultas',
    sinRegistros:'No hay pacientes todavia. Crea el primero.',
    buscador:    'Buscar por nombre, telefono, email o DNI...',
    sinHistorial:'Sin consultas registradas todavia',
    ultimosN:    (n) => `Ultimas ${n} consultas`,
    conteo:      (n) => `${n} ${n === 1 ? 'paciente' : 'pacientes'}`,
  },
}

export function makeLabels(tipoPerfil) {
  return LABELS[tipoPerfil] ?? LABELS.cliente
}
