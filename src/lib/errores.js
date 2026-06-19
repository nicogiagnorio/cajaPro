/**
 * errores.js — Traduce mensajes de error de Supabase/PostgreSQL al espanol.
 */

export function traducirError(error) {
  if (!error) return 'Error desconocido.'
  const msg = typeof error === 'string'
    ? error
    : (error.message ?? error.details ?? error.hint ?? String(error))

  // Schema / columna faltante
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

  // Desbordamiento numerico
  if (msg.includes('numeric field overflow') || msg.includes('out of range') || msg.includes('overflow')) {
    return 'El valor ingresado es demasiado grande para ese campo.'
  }

  // Clave duplicada
  if (msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('already exists')) {
    return 'Ya existe un registro con esos datos.'
  }

  // Campo obligatorio (NOT NULL)
  if (msg.includes('null value') && msg.includes('not-null')) {
    const match = msg.match(/column "(\w+)"/)
    const col = match?.[1]
    return col
      ? `El campo "${col}" es obligatorio y no puede estar vacio.`
      : 'Hay campos obligatorios vacios.'
  }

  // Clave foranea
  if (msg.includes('foreign key constraint') || msg.includes('violates foreign key')) {
    return 'El elemento relacionado no existe o fue eliminado.'
  }

  // Permisos / RLS
  if (msg.includes('row-level security') || msg.includes('permission denied') || msg.includes('RLS')) {
    return 'Sin permisos para realizar esta operacion. Verifica tu rol de usuario.'
  }

  // Sesion expirada
  if (msg.toLowerCase().includes('jwt') || msg.includes('token is expired') || msg.includes('invalid token')) {
    return 'Tu sesion expiro. Vuelve a iniciar sesion.'
  }

  // Sin conexion / red
  if (
    msg.includes('fetch') ||
    msg.toLowerCase().includes('network') ||
    msg.includes('Failed to fetch') ||
    msg.includes('ERR_INTERNET')
  ) {
    return 'Sin conexion. Verifica tu internet e intenta nuevamente.'
  }

  // Valor demasiado largo
  if (msg.includes('value too long') || msg.includes('character varying')) {
    return 'El texto ingresado es demasiado largo para este campo.'
  }

  // Constraint de check
  if (msg.includes('check constraint') || msg.includes('violates check')) {
    return 'El valor ingresado no es valido para este campo.'
  }

  // Error generico de PostgREST
  if (msg.includes('PGRST')) {
    const code = msg.match(/PGRST\d+/)?.[0] ?? 'desconocido'
    return 'Error de base de datos (' + code + '). Intenta nuevamente.'
  }

  // Tabla no encontrada
  if (msg.includes('relation') && msg.includes('does not exist')) {
    return 'La tabla requerida no existe. Verifica que las migraciones esten aplicadas.'
  }

  // Fallback
  return msg
}
