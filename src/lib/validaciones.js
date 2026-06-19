/**
 * validaciones.js — Helpers de validación reutilizables para formularios.
 *
 * Límites según columnas NUMERIC(12,2) y NUMERIC(8,0) en Supabase:
 *   Precio : máximo 9.999.999.999,99  (10 dígitos enteros + 2 decimales)
 *   Stock  : máximo 999.999 unidades  (6 dígitos enteros, sin decimales)
 */

const MAX_PRECIO = 9_999_999_999.99
const MAX_STOCK  = 999_999

/** Convierte "1.234,56" o "1234.56" a número flotante. */
function parsearNumero(valor) {
  if (valor === '' || valor === null || valor === undefined) return NaN
  const str = String(valor).trim()
  // Si tiene punto como miles y coma decimal → "1.234,56"
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(str)) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.'))
  }
  // Coma como decimal → "1234,56"
  if (/^\d+(,\d+)?$/.test(str)) {
    return parseFloat(str.replace(',', '.'))
  }
  return parseFloat(str)
}

/**
 * Valida un campo de precio (máx 9.999.999.999,99).
 * @param {string|number} valor
 * @returns {{ valido: boolean, mensaje: string }}
 */
export function validarPrecio(valor) {
  const n = typeof valor === 'number' ? valor : parsearNumero(valor)

  if (valor === '' || valor === null || valor === undefined) {
    return { valido: true, mensaje: '' } // campo opcional — quien lo use puede agregar required
  }
  if (isNaN(n)) {
    return { valido: false, mensaje: 'Ingresá un número válido.' }
  }
  if (n < 0) {
    return { valido: false, mensaje: 'El precio no puede ser negativo.' }
  }
  if (n > MAX_PRECIO) {
    return {
      valido: false,
      mensaje: `El valor máximo permitido es $${MAX_PRECIO.toLocaleString('es-AR')}.`,
    }
  }
  return { valido: true, mensaje: '' }
}

/**
 * Valida un campo de stock (entero, máx 999.999).
 * @param {string|number} valor
 * @returns {{ valido: boolean, mensaje: string }}
 */
export function validarStock(valor) {
  const n = typeof valor === 'number' ? valor : parsearNumero(valor)

  if (valor === '' || valor === null || valor === undefined) {
    return { valido: true, mensaje: '' }
  }
  if (isNaN(n)) {
    return { valido: false, mensaje: 'Ingresá un número válido.' }
  }
  if (n < 0) {
    return { valido: false, mensaje: 'El stock no puede ser negativo.' }
  }
  if (!Number.isFinite(n)) {
    return { valido: false, mensaje: 'Valor fuera de rango.' }
  }
  if (n > MAX_STOCK) {
    return {
      valido: false,
      mensaje: `El stock máximo permitido es ${MAX_STOCK.toLocaleString('es-AR')} unidades.`,
    }
  }
  return { valido: true, mensaje: '' }
}

/** Versión booleana directa (para validaciones en tiempo real). */
export function esPrecioValido(valor) {
  return validarPrecio(valor).valido
}

/** Versión booleana directa para stock. */
export function esStockValido(valor) {
  return validarStock(valor).valido
}

/**
 * Filtra teclas inválidas en campos numéricos (solo dígitos, punto, coma, backspace, etc.).
 * Usarlo en onKeyDown del input.
 */
export function soloNumerosKeyDown(e) {
  const teclaPermitida =
    e.key === 'Backspace' ||
    e.key === 'Delete'    ||
    e.key === 'Tab'       ||
    e.key === 'Escape'    ||
    e.key === 'Enter'     ||
    e.key === 'ArrowLeft' ||
    e.key === 'ArrowRight'||
    e.key === 'ArrowUp'   ||
    e.key === 'ArrowDown' ||
    e.key === 'Home'      ||
    e.key === 'End'       ||
    (e.ctrlKey || e.metaKey)  // Ctrl+C, Ctrl+V, etc.

  if (teclaPermitida) return

  if (!/^[\d,.]$/.test(e.key)) {
    e.preventDefault()
  }
}

/**
 * Valida el texto pegado en un campo numérico.
 * Usarlo en onPaste del input.
 */
export function soloNumerosPaste(e) {
  const pegado = e.clipboardData?.getData('text') ?? ''
  if (!/^[\d.,]+$/.test(pegado.trim())) {
    e.preventDefault()
  }
}
