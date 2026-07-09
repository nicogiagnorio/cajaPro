/**
 * errores.js — Traduce mensajes de error de Supabase/PostgreSQL al espanol.
 */

export function traducirError(error) {
  if (!error) return 'Error desconocido.'
  const msg = typeof error === 'string'
    ? error
    : (error.message ?? error.details ?? error.hint ?? String(error))

  // Mensajes vacíos, sin info útil o mal serializados (p.ej. "{}", "[object Object]")
  // — nunca mostrar eso crudo en pantalla.
  if (!msg || msg === '{}' || msg === '[object Object]') {
    return 'Ocurrió un error inesperado en el servidor. Probá de nuevo en unos minutos.'
  }

  if (msg.toLowerCase().includes('sending confirmation') || msg.toLowerCase().includes('sending email') || msg.toLowerCase().includes('confirmation email')) {
    return 'No se pudo enviar el email de confirmación. Puede ser un límite temporal de envíos del servidor — probá de nuevo en unos minutos.'
  }

  if (
    msg.includes('schema cache') ||
    msg.includes('Could not find') ||
    (msg.includes('column') && msg.includes('does not exist'))
  ) {
    const colMatch = msg.match(/['"](\w+)['"]\s+column|column\s+['"](\w+)['"]/)
    const col = colMatch?.[1] ?? colMatch?.[2] ?? null
    return col
      ? `Error de esquema: la columna "${col}" no existe. Ejecuta la migracion SQL pendiente en Supabase.`
      : 'Error de esquema: hay columnas faltantes. Ejecuta la migracion SQL pendiente en Supabase.'
  }

  if (msg.includes('numeric field overflow') || msg.includes('out of range') || msg.includes('overflow')) {
    return 'El valor ingresado es demasiado grande para ese campo.'
  }

  if (msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('already exists')) {
    return 'Ya existe un registro con esos datos.'
  }

  if (msg.includes('null value') && msg.includes('not-null')) {
    const match = msg.match(/column "(\w+)"/)
    const col = match?.[1]
    return col
      ? `El campo "${col}" es obligatorio y no puede estar vacio.`
      : 'Hay campos obligatorios vacios.'
  }

  if (msg.includes('foreign key constraint') || msg.includes('violates foreign key')) {
    return 'El elemento relacionado no existe o fue eliminado.'
  }

  if (msg.includes('row-level security') || msg.includes('permission denied') || msg.includes('RLS')) {
    return 'Sin permisos para realizar esta operacion. Verifica tu rol de usuario.'
  }

  if (msg.toLowerCase().includes('jwt') || msg.includes('token is expired') || msg.includes('invalid token')) {
    return 'Tu sesion expiro. Vuelve a iniciar sesion.'
  }

  if (
    msg.includes('fetch') ||
    msg.toLowerCase().includes('network') ||
    msg.includes('Failed to fetch') ||
    msg.includes('ERR_INTERNET') ||
    msg.includes('Load failed') ||
    msg.includes('load failed') ||
    msg.includes('NetworkError') ||
    msg.includes('The Internet connection appears to be offline')
  ) {
    return 'Sin conexion. Verifica tu internet e intenta nuevamente.'
  }

  if (msg.includes('value too long') || msg.includes('character varying')) {
    return 'El texto ingresado es demasiado largo para este campo.'
  }

  if (msg.includes('check constraint') || msg.includes('violates check')) {
    return 'El valor ingresado no es valido para este campo.'
  }

  if (msg.includes('PGRST')) {
    const code = msg.match(/PGRST\d+/)?.[0] ?? 'desconocido'
    return 'Error de base de datos (' + code + '). Intenta nuevamente.'
  }

  if (msg.includes('relation') && msg.includes('does not exist')) {
    return 'La tabla requerida no existe. Verifica que las migraciones esten aplicadas.'
  }

  return msg
}
