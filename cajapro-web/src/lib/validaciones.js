/**
 * validaciones.js — Helpers de validación reutilizables para formularios.
 *
 * Límites según columnas NUMERIC(12,2) y NUMERIC(8,0) en Supabase:
 *   Precio : máximo 9.999.999.999,99  (10 dígitos enteros + 2 decimales)
 *   Stock  : máximo 999.999 unidades  (6 dígitos enteros, sin decimales)
 */

const MAX_PRECIO = 9_999_999_999.99
const MAX_STOCK  = 999_999

function parsearNumero(valor) {
  if (valor === '' || valor === null || valor === undefined) return NaN
  const str = String(valor).trim()
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(str)) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.'))
  }
  if (/^\d+(,\d+)?$/.test(str)) {
    return parseFloat(str.replace(',', '.'))
  }
  return parseFloat(str)
}

export function validarPrecio(valor) {
  const n = typeof valor === 'number' ? valor : parsearNumero(valor)

  if (valor === '' || valor === null || valor === undefined) {
    return { valido: true, mensaje: '' }
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

export function esPrecioValido(valor) {
  return validarPrecio(valor).valido
}

export function esStockValido(valor) {
  return validarStock(valor).valido
}

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
    (e.ctrlKey || e.metaKey)

  if (teclaPermitida) return

  if (!/^[\d,.]$/.test(e.key)) {
    e.preventDefault()
  }
}

export function soloNumerosPaste(e) {
  const pegado = e.clipboardData?.getData('text') ?? ''
  if (!/^[\d.,]+$/.test(pegado.trim())) {
    e.preventDefault()
  }
}
