/**
 * arca.cjs — Integración con ARCA (ex-AFIP) para Facturación Electrónica
 *
 * Usa el Web Service WSFE (FECAESolicitar) autenticado via WSAA.
 * Requiere afip.js instalado como dependencia Node del proceso principal de Electron.
 *
 * Tipos de comprobante soportados:
 *   Factura A  → tipo 1   (Responsable Inscripto → Responsable Inscripto)
 *   Factura B  → tipo 6   (Responsable Inscripto → Consumidor Final)
 *   Factura C  → tipo 11  (Monotributista → cualquier destinatario)
 */

'use strict'

const { app } = require('electron')
const path     = require('path')
const fs       = require('fs')

// ─── Rutas de archivos de config ────────────────────────────────────────────
function rutaConfig() {
  return path.join(app.getPath('userData'), 'arca-config.json')
}

function rutaCert() {
  return path.join(app.getPath('userData'), 'arca-cert.pem')
}

function rutaKey() {
  return path.join(app.getPath('userData'), 'arca-key.pem')
}

// ─── Persistencia de configuración ──────────────────────────────────────────
function cargarConfig() {
  try {
    const ruta = rutaConfig()
    if (!fs.existsSync(ruta)) return null
    return JSON.parse(fs.readFileSync(ruta, 'utf8'))
  } catch {
    return null
  }
}

function guardarConfig(config) {
  // Guardar cert y key en archivos separados, el resto en JSON
  const { cert, key, ...resto } = config

  if (cert) fs.writeFileSync(rutaCert(), cert, 'utf8')
  if (key)  fs.writeFileSync(rutaKey(),  key,  'utf8')

  // Si no se pasan cert/key nuevos, mantener los existentes
  const configExistente = cargarConfig() ?? {}
  const nuevaConfig = {
    ...configExistente,
    ...resto,
    tieneCert: cert ? true : (configExistente.tieneCert ?? false),
    tieneKey:  key  ? true : (configExistente.tieneKey  ?? false),
  }

  fs.writeFileSync(rutaConfig(), JSON.stringify(nuevaConfig, null, 2), 'utf8')
  return nuevaConfig
}

function eliminarCertificados() {
  try { fs.unlinkSync(rutaCert()) } catch {}
  try { fs.unlinkSync(rutaKey())  } catch {}
  const config = cargarConfig() ?? {}
  config.tieneCert = false
  config.tieneKey  = false
  fs.writeFileSync(rutaConfig(), JSON.stringify(config, null, 2), 'utf8')
}

// ─── Tipos de comprobante ────────────────────────────────────────────────────
const TIPO_CBTE    = { A: 1,  B: 6,  C: 11 }   // Facturas
const TIPO_CBTE_NC = { A: 3,  B: 8,  C: 13 }   // Notas de Crédito

// ─── IDs de alícuota IVA según AFIP ─────────────────────────────────────────
// https://www.afip.gov.ar/ws/WSFE-V3/wsfe_v3_manual.pdf  — Tabla de alícuotas
const AFIP_IVA_IDS = {
  0:    3,   // Exento / No gravado
  2.5:  9,
  5:    8,
  10.5: 4,
  21:   5,   // General (la más común)
  27:   6,
}

/**
 * Convierte el array ivaItems (del frontend) al formato AFIP.
 * ivaItems = [{ tasa, neto, iva, monto }, ...]
 * Si no se pasa, asume 21% sobre el total.
 */
function buildIvaArray(total, ivaItems) {
  if (ivaItems && ivaItems.length > 0) {
    return {
      impNeto: parseFloat(ivaItems.reduce((s, g) => s + g.neto, 0).toFixed(2)),
      impIVA:  parseFloat(ivaItems.reduce((s, g) => s + g.iva,  0).toFixed(2)),
      iva: ivaItems.map(g => {
        const id = AFIP_IVA_IDS[g.tasa] ?? AFIP_IVA_IDS[21]
        return { Id: id, BaseImp: g.neto, Importe: g.iva }
      }),
    }
  }
  // Fallback: todo al 21%
  const impNeto = parseFloat((total / 1.21).toFixed(2))
  const impIVA  = parseFloat((total - impNeto).toFixed(2))
  return {
    impNeto,
    impIVA,
    iva: [{ Id: 5, BaseImp: impNeto, Importe: impIVA }],
  }
}

// ─── Instancia de Afip (se recrea si cambia config) ─────────────────────────
let _afipInstance  = null
let _afipConfigKey = null

function getAfipInstance(config) {
  const certContent = fs.existsSync(rutaCert()) ? fs.readFileSync(rutaCert(), 'utf8') : null
  const keyContent  = fs.existsSync(rutaKey())  ? fs.readFileSync(rutaKey(),  'utf8') : null

  if (!certContent || !keyContent) {
    throw new Error('Certificado digital o clave privada no configurados. Cargalos en la sección ARCA de Configuración.')
  }

  const cuitLimpio = String(config.cuit).replace(/[-\s]/g, '')
  const configKey  = `${cuitLimpio}|${config.produccion}|${certContent.slice(-20)}`

  if (_afipInstance && _afipConfigKey === configKey) {
    return _afipInstance
  }

  const Afip = require('@afipsdk/afip.js')
  _afipInstance = new Afip({
    CUIT:       parseInt(cuitLimpio),
    cert:       certContent,
    key:        keyContent,
    production: config.produccion === true,
    // Directorio para cachear tokens WSAA (evita re-autenticar en cada llamada)
    res_folder: path.join(app.getPath('userData'), 'arca-tokens'),
    access_token: '',
  })
  _afipConfigKey = configKey
  return _afipInstance
}

// ─── Solicitar CAE ───────────────────────────────────────────────────────────
async function solicitarCAE({ ventaId, total, docTipo, docNro, concepto, ivaItems }) {
  const config = cargarConfig()
  if (!config) throw new Error('ARCA no configurado. Completá la sección ARCA en Configuración.')
  if (!config.tipoFactura) throw new Error('Tipo de factura no configurado.')
  if (!config.puntoVenta)  throw new Error('Punto de venta no configurado.')
  if (!config.cuit)        throw new Error('CUIT no configurado.')

  const afip      = getAfipInstance(config)
  const tipoCbte  = TIPO_CBTE[config.tipoFactura]
  const pventa    = parseInt(config.puntoVenta)

  if (!tipoCbte) throw new Error(`Tipo de factura "${config.tipoFactura}" no válido.`)

  // 1) Obtener último número autorizado
  const ultimoNro  = await afip.electronicBilling.getLastVoucher(pventa, tipoCbte)
  const nroNuevo   = ultimoNro + 1

  // 2) Fecha de hoy como YYYYMMDD
  const hoy   = new Date()
  const fecha = parseInt(
    String(hoy.getFullYear()) +
    String(hoy.getMonth() + 1).padStart(2, '0') +
    String(hoy.getDate()).padStart(2, '0')
  )

  // 3) Calcular IVA
  const esC = config.tipoFactura === 'C'

  // Factura C: monotributista, no discrimina IVA
  // Factura A / B: usar desglose por alícuota si viene del frontend, o 21% por defecto
  let impNeto, impIVA, iva
  if (esC) {
    impNeto = parseFloat(total)
    impIVA  = 0
    iva     = []
  } else {
    const desglose = buildIvaArray(total, ivaItems)
    impNeto = desglose.impNeto
    impIVA  = desglose.impIVA
    iva     = desglose.iva
  }

  const datosFactura = {
    CantReg:    1,
    PtoVta:     pventa,
    CbteTipo:   tipoCbte,
    Concepto:   concepto ?? 1,   // 1=Productos, 2=Servicios, 3=Ambos
    DocTipo:    docTipo  ?? 99,  // 99=Consumidor Final
    DocNro:     docNro   ?? 0,
    CbteDesde:  nroNuevo,
    CbteHasta:  nroNuevo,
    CbteFch:    fecha,
    ImpTotal:   parseFloat(total),
    ImpTotConc: 0,
    ImpNeto:    impNeto,
    ImpOpEx:    0,
    ImpIVA:     impIVA,
    ImpTrib:    0,
    MonId:      'PES',
    MonCotiz:   1,
    Iva:        iva,
  }

  const resultado = await afip.electronicBilling.createVoucher(datosFactura)

  // resultado.CAE, resultado.CAEFchVto (YYYYMMDD como string)
  if (!resultado.CAE) {
    throw new Error(`ARCA no devolvió CAE. Observaciones: ${JSON.stringify(resultado.Obs ?? resultado)}`)
  }

  const caeVto = String(resultado.CAEFchVto)
  const caeVtoFormateado = `${caeVto.slice(0, 4)}-${caeVto.slice(4, 6)}-${caeVto.slice(6, 8)}`

  return {
    cae:           resultado.CAE,
    caeVencimiento: caeVtoFormateado,
    nroFactura:    nroNuevo,
    puntoVenta:    pventa,
    tipoFactura:   config.tipoFactura,
  }
}

// ─── Solicitar NC (Nota de Crédito) ─────────────────────────────────────────
/**
 * Emite una Nota de Crédito electrónica en ARCA referenciando la factura original.
 * @param {object} params
 * @param {object} params.facturaOriginal - { tipo_factura, nro_factura, punto_venta }
 * @param {number} params.total           - Importe total de la NC (igual a la factura original)
 */
async function solicitarNC({ facturaOriginal, total, ivaItems }) {
  const config = cargarConfig()
  if (!config) throw new Error('ARCA no configurado. Completá la sección ARCA en Configuración.')
  if (!config.puntoVenta) throw new Error('Punto de venta no configurado.')
  if (!config.cuit)       throw new Error('CUIT no configurado.')

  const tipoFactura = facturaOriginal.tipo_factura ?? config.tipoFactura
  if (!tipoFactura) throw new Error('Tipo de factura no determinado.')

  const tipoCbteNC   = TIPO_CBTE_NC[tipoFactura]
  const tipoCbteFact = TIPO_CBTE[tipoFactura]

  if (!tipoCbteNC) throw new Error(`No existe tipo de NC para factura "${tipoFactura}".`)

  const afip   = getAfipInstance(config)
  const pventa = parseInt(config.puntoVenta)

  // Último número de NC para este tipo
  const ultimoNro = await afip.electronicBilling.getLastVoucher(pventa, tipoCbteNC)
  const nroNuevo  = ultimoNro + 1

  // Fecha hoy como YYYYMMDD
  const hoy   = new Date()
  const fecha = parseInt(
    String(hoy.getFullYear()) +
    String(hoy.getMonth() + 1).padStart(2, '0') +
    String(hoy.getDate()).padStart(2, '0')
  )

  // IVA (solo facturas A y B discriminan IVA)
  const esC = tipoFactura === 'C'
  let impNeto, impIVA, iva
  if (esC) {
    impNeto = parseFloat(total)
    impIVA  = 0
    iva     = []
  } else {
    const desglose = buildIvaArray(total, ivaItems)
    impNeto = desglose.impNeto
    impIVA  = desglose.impIVA
    iva     = desglose.iva
  }

  const datosNC = {
    CantReg:    1,
    PtoVta:     pventa,
    CbteTipo:   tipoCbteNC,
    Concepto:   1,       // 1 = Productos
    DocTipo:    99,
    DocNro:     0,
    CbteDesde:  nroNuevo,
    CbteHasta:  nroNuevo,
    CbteFch:    fecha,
    ImpTotal:   parseFloat(total),
    ImpTotConc: 0,
    ImpNeto:    impNeto,
    ImpOpEx:    0,
    ImpIVA:     impIVA,
    ImpTrib:    0,
    MonId:      'PES',
    MonCotiz:   1,
    Iva:        iva,
    // Comprobante asociado — la factura original
    CbtesAsoc: [{
      Tipo:   tipoCbteFact,
      PtoVta: parseInt(facturaOriginal.punto_venta),
      Nro:    parseInt(facturaOriginal.nro_factura),
    }],
  }

  const resultado = await afip.electronicBilling.createVoucher(datosNC)

  if (!resultado.CAE) {
    throw new Error(`ARCA no devolvió CAE para la NC. Observaciones: ${JSON.stringify(resultado.Obs ?? resultado)}`)
  }

  const caeVto          = String(resultado.CAEFchVto)
  const caeVtoFormateado = `${caeVto.slice(0, 4)}-${caeVto.slice(4, 6)}-${caeVto.slice(6, 8)}`

  return {
    cae:            resultado.CAE,
    caeVencimiento: caeVtoFormateado,
    nroNC:          nroNuevo,
    puntoVenta:     pventa,
    tipoNC:         tipoFactura,   // A / B / C (de la factura original)
  }
}

// ─── Verificar conexión con ARCA ─────────────────────────────────────────────
async function verificarConexion() {
  const config = cargarConfig()
  if (!config) throw new Error('ARCA no configurado.')

  const afip     = getAfipInstance(config)
  const tipoCbte = TIPO_CBTE[config.tipoFactura ?? 'C']
  const pventa   = parseInt(config.puntoVenta ?? 1)

  const ultimo = await afip.electronicBilling.getLastVoucher(pventa, tipoCbte)
  return {
    ok:      true,
    mensaje: `Conexión exitosa. Último comprobante autorizado en PV ${pventa}: #${ultimo}`,
    ambiente: config.produccion ? 'Producción' : 'Testing (Homologación)',
  }
}

module.exports = {
  cargarConfig,
  guardarConfig,
  eliminarCertificados,
  solicitarCAE,
  solicitarNC,
  verificarConexion,
}
