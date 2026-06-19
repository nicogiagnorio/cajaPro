/**
 * etiquetas.js — Labels dinamicos segun tipo de perfil del comercio.
 *
 * Uso:
 *   const { comercio } = useAuth()
 *   const L = makeLabels(comercio?.tipo_perfil)
 *   <h1>{L.titulo}</h1>           // "Clientes" o "Pacientes"
 *   <Button>{L.nuevo}</Button>    // "Nuevo cliente" o "Nuevo paciente"
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

/**
 * Retorna el objeto de labels correcto segun tipo_perfil.
 * @param {'cliente'|'paciente'|undefined|null} tipoPerfil
 * @returns {typeof LABELS['cliente']}
 */
export function makeLabels(tipoPerfil) {
  return LABELS[tipoPerfil] ?? LABELS.cliente
}
