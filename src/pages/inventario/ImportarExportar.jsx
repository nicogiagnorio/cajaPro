import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X, RefreshCw, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'

const UNIDADES = ['unidad', 'kg', 'g', 'litro', 'ml', 'metro', 'cm', 'pack', 'caja', 'docena']

// ── Helpers ────────────────────────────────────────────────────────────────

function descargarXlsx(workbook, filename) {
  const buf  = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], { type: 'application/octet-stream' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function leerXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader  = new FileReader()
    reader.onload = e => {
      const wb   = XLSX.read(e.target.result, { type: 'binary' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      resolve(rows)
    }
    reader.onerror = reject
    reader.readAsBinaryString(file)
  })
}

function num(v, fallback = 0) {
  const n = parseFloat(String(v).replace(',', '.'))
  return isNaN(n) ? fallback : n
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

// ── Productos ──────────────────────────────────────────────────────────────

const COLS_PROD = ['ID', 'Nombre', 'Codigo_Barras', 'Categoria', 'Proveedor', 'Precio_Venta', 'Precio_Costo', 'Stock_Actual', 'Stock_Minimo', 'Unidad', 'Activo']

function plantillaProductos() {
  const ws = XLSX.utils.aoa_to_sheet([
    COLS_PROD,
    ['', 'Alimento Royal Canin 15kg', '7790001234567', 'Alimentos', 'Distribuidora Norte', '28000', '18000', '20', '5', 'unidad', 'SI'],
    ['', 'Arena sanitaria 10kg',       '',              'Higiene',   '',                    '4500',  '2800',  '15', '3', 'unidad', 'SI'],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Productos')
  descargarXlsx(wb, 'plantilla-productos.xlsx')
}

function exportarProductos(productos) {
  const ws = XLSX.utils.json_to_sheet(
    productos.map(p => ({
      ID:            p.id,
      Nombre:        p.nombre,
      Codigo_Barras: p.codigo_barras      ?? '',
      Categoria:     p.categorias?.nombre  ?? '',
      Proveedor:     p.proveedores?.nombre ?? '',
      Precio_Venta:  p.precio_venta,
      Precio_Costo:  p.precio_costo,
      Stock_Actual:  p.stock_actual,
      Stock_Minimo:  p.stock_minimo,
      Unidad:        p.unidad,
      Activo:        p.activo ? 'SI' : 'NO',
    }))
  )
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Productos')
  descargarXlsx(wb, `cajapro-productos-${hoy()}.xlsx`)
}

function parsearFilaProducto(row, catMap, provMap) {
  const errores = []
  const nombre  = String(row['Nombre'] ?? '').trim()
  if (!nombre)                        errores.push('Nombre requerido')
  if (num(row['Precio_Venta']) <= 0)  errores.push('Precio_Venta inválido')

  const unidad = UNIDADES.includes(String(row['Unidad'] ?? '').toLowerCase())
    ? String(row['Unidad']).toLowerCase()
    : 'unidad'

  const payload = {
    nombre,
    codigo_barras: String(row['Codigo_Barras'] ?? '').trim() || null,
    categoria_id:  catMap[String(row['Categoria'] ?? '').toLowerCase()] ?? null,
    proveedor_id:  provMap[String(row['Proveedor'] ?? '').toLowerCase()] ?? null,
    precio_venta:  num(row['Precio_Venta']),
    precio_costo:  num(row['Precio_Costo']),
    stock_actual:  num(row['Stock_Actual']),
    stock_minimo:  num(row['Stock_Minimo']),
    unidad,
    activo: String(row['Activo'] ?? 'SI').toUpperCase().trim() !== 'NO',
  }

  return { errores, payload, id: String(row['ID'] ?? '').trim() }
}

// ── Proveedores ────────────────────────────────────────────────────────────

function plantillaProveedores() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Nombre', 'Contacto', 'Telefono', 'Email', 'Direccion'],
    ['Distribuidora Norte', 'Juan Pérez', '11-4444-5555', 'ventas@dnorte.com', 'Av. San Martín 1234'],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Proveedores')
  descargarXlsx(wb, 'plantilla-proveedores.xlsx')
}

function exportarProveedores(proveedores) {
  const ws = XLSX.utils.json_to_sheet(
    proveedores.map(p => ({
      Nombre:    p.nombre,
      Contacto:  p.contacto  ?? '',
      Telefono:  p.telefono  ?? '',
      Email:     p.email     ?? '',
      Direccion: p.direccion ?? '',
    }))
  )
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Proveedores')
  descargarXlsx(wb, `cajapro-proveedores-${hoy()}.xlsx`)
}

// ── Componente principal ───────────────────────────────────────────────────

export default function ImportarExportar() {
  const { perfil } = useAuth()

  const [datos,    setDatos]    = useState({ productos: [], categorias: [], proveedores: [] })
  const [cargando, setCargando] = useState(true)

  const [previaProds,     setPreviaProds]     = useState(null)
  const [importandoProds, setImportandoProds] = useState(false)
  const [resultProds,     setResultProds]     = useState(null)
  const inputProds = useRef(null)

  const [previaProvs,     setPreviaProvs]     = useState(null)
  const [importandoProvs, setImportandoProvs] = useState(false)
  const [resultProvs,     setResultProvs]     = useState(null)
  const inputProvs = useRef(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const [{ data: prods }, { data: cats }, { data: provs }] = await Promise.all([
      supabase.from('productos').select('*, categorias(nombre), proveedores(nombre)').eq('comercio_id', perfil.comercio_id).order('nombre').limit(2000),
      supabase.from('categorias').select('id, nombre').eq('comercio_id', perfil.comercio_id).eq('activo', true).order('nombre'),
      supabase.from('proveedores').select('id, nombre, contacto, telefono, email, direccion').eq('comercio_id', perfil.comercio_id).eq('activo', true).order('nombre'),
    ])
    setDatos({ productos: prods ?? [], categorias: cats ?? [], proveedores: provs ?? [] })
    setCargando(false)
  }

  // ── Import: Productos ──────────────────────────────────────────────────

  async function onArchivoProductos(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviaProds(null)
    setResultProds(null)

    const rows     = await leerXlsx(file)
    const catMap   = Object.fromEntries(datos.categorias.map(c => [c.nombre.toLowerCase(), c.id]))
    const provMap  = Object.fromEntries(datos.proveedores.map(p => [p.nombre.toLowerCase(), p.id]))
    const idsExistentes = new Set(datos.productos.map(p => p.id))

    const aActualizar = []
    const aCrear      = []
    const invalidas   = []

    rows.forEach((row, i) => {
      const { errores, payload, id } = parsearFilaProducto(row, catMap, provMap)

      if (errores.length > 0) {
        invalidas.push({ fila: i + 2, nombre: String(row['Nombre'] ?? '').trim(), errores })
        return
      }

      if (id && idsExistentes.has(id)) {
        aActualizar.push({ id, ...payload })
      } else {
        aCrear.push({ comercio_id: perfil.comercio_id, ...payload })
      }
    })

    const validas = [
      ...aActualizar.map(r => ({ ...r, _accion: 'actualizar' })),
      ...aCrear.map(r => ({ ...r, _accion: 'crear' })),
    ]

    setPreviaProds({ aActualizar, aCrear, validas, invalidas, total: rows.length })
    e.target.value = ''
  }

  async function confirmarImportProductos() {
    if (!previaProds) return
    setImportandoProds(true)

    const { aActualizar, aCrear } = previaProds
    let ok = 0
    const errores = []

    for (let i = 0; i < aActualizar.length; i += 100) {
      const lote = aActualizar.slice(i, i + 100)
      const { data, error } = await supabase
        .from('productos')
        .upsert(lote, { onConflict: 'id' })
        .select('id')
      if (error) errores.push(traducirError(error))
      else ok += data.length
    }

    for (let i = 0; i < aCrear.length; i += 100) {
      const lote = aCrear.slice(i, i + 100)
      const { data, error } = await supabase
        .from('productos')
        .insert(lote)
        .select('id')
      if (error) errores.push(traducirError(error))
      else ok += data.length
    }

    const actualizados = aActualizar.length
    setResultProds({ ok, actualizados, creados: ok - actualizados, errores })
    setPreviaProds(null)
    setImportandoProds(false)
    if (errores.length === 0) cargar()
  }

  // ── Import: Proveedores ────────────────────────────────────────────────

  async function onArchivoProveedores(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviaProvs(null)
    setResultProvs(null)

    const rows     = await leerXlsx(file)
    const validas  = []
    const invalidas = []

    rows.forEach((row, i) => {
      const nombre = String(row['Nombre'] ?? '').trim()
      if (!nombre) {
        invalidas.push({ fila: i + 2, nombre: '', errores: ['Nombre requerido'] })
        return
      }
      validas.push({
        comercio_id: perfil.comercio_id,
        nombre,
        contacto:    String(row['Contacto']  ?? '').trim() || null,
        telefono:    String(row['Telefono']  ?? '').trim() || null,
        email:       String(row['Email']     ?? '').trim() || null,
        direccion:   String(row['Direccion'] ?? '').trim() || null,
        activo:      true,
      })
    })

    setPreviaProvs({ validas, invalidas, total: rows.length })
    e.target.value = ''
  }

  async function confirmarImportProveedores() {
    if (!previaProvs?.validas?.length) return
    setImportandoProvs(true)
    const { data, error } = await supabase.from('proveedores').insert(previaProvs.validas).select('id')
    if (error) {
      setResultProvs({ ok: 0, errores: [traducirError(error)] })
    } else {
      setResultProvs({ ok: data.length, errores: [] })
      cargar()
    }
    setPreviaProvs(null)
    setImportandoProvs(false)
  }

  if (cargando) {
    return <div className="flex justify-center py-16"><Spinner size="lg" className="text-blue-500" /></div>
  }

  return (
    <div className="space-y-8 pb-8">

      {/* ── PRODUCTOS ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={20} className="text-emerald-600" />
            <div>
              <h3 className="font-semibold text-slate-800">Productos</h3>
              <p className="text-xs text-slate-400">{datos.productos.length} productos en el sistema</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variante="secundario" onClick={plantillaProductos}>
              <FileSpreadsheet size={15} /> Plantilla
            </Button>
            <Button variante="secundario" onClick={() => exportarProductos(datos.productos)}>
              <Download size={15} /> Exportar
            </Button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {resultProds && (
            <div className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${
              resultProds.errores.length === 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {resultProds.errores.length === 0
                ? <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
                : <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
              }
              <div>
                <p className="font-medium">
                  {resultProds.ok} productos procesados correctamente
                </p>
                {resultProds.ok > 0 && (
                  <p className="text-xs mt-0.5">
                    {resultProds.actualizados > 0 && `${resultProds.actualizados} actualizados`}
                    {resultProds.actualizados > 0 && resultProds.creados > 0 && ' · '}
                    {resultProds.creados > 0 && `${resultProds.creados} creados nuevos`}
                  </p>
                )}
                {resultProds.errores.map((e, i) => (
                  <p key={i} className="text-xs mt-1">{e}</p>
                ))}
              </div>
            </div>
          )}

          {!previaProds && (
            <div>
              <input ref={inputProds} type="file" accept=".xlsx,.xls,.csv" onChange={onArchivoProductos} className="hidden" />
              <button
                onClick={() => inputProds.current?.click()}
                className="w-full border-2 border-dashed border-slate-200 rounded-xl py-8 flex flex-col items-center gap-2 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
              >
                <Upload size={24} />
                <span className="text-sm font-medium">Hacer clic para importar Excel</span>
                <span className="text-xs">.xlsx · .xls · .csv</span>
              </button>
              <p className="text-xs text-slate-400 mt-2">
                Si el archivo incluye la columna <strong>ID</strong> con valores existentes, esos productos se actualizan.
                Las filas sin ID o con ID desconocido se crean como nuevos productos.
              </p>
            </div>
          )}

          {previaProds && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap text-sm">
                <span className="text-slate-500">Total leídas: <strong>{previaProds.total}</strong></span>
                {previaProds.aActualizar.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                    <RefreshCw size={13} /> {previaProds.aActualizar.length} a actualizar
                  </span>
                )}
                {previaProds.aCrear.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                    <Plus size={13} /> {previaProds.aCrear.length} a crear
                  </span>
                )}
                {previaProds.invalidas.length > 0 && (
                  <span className="text-red-500 font-medium">
                    {previaProds.invalidas.length} con error
                  </span>
                )}
              </div>

              {previaProds.invalidas.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 space-y-1">
                  <p className="font-semibold mb-1">Filas que no se importarán:</p>
                  {previaProds.invalidas.map((r, i) => (
                    <p key={i}>Fila {r.fila}: {r.nombre || '(sin nombre)'} — {r.errores.join(', ')}</p>
                  ))}
                </div>
              )}

              {previaProds.validas.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Acción</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Precio venta</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previaProds.validas.slice(0, 10).map((r, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2">
                            {r._accion === 'actualizar'
                              ? <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"><RefreshCw size={10} /> Actualizar</span>
                              : <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><Plus size={10} /> Nuevo</span>
                            }
                          </td>
                          <td className="px-4 py-2 text-slate-700">{r.nombre}</td>
                          <td className="px-4 py-2 text-slate-700">${r.precio_venta}</td>
                          <td className="px-4 py-2 text-slate-700">{r.stock_actual}</td>
                        </tr>
                      ))}
                      {previaProds.validas.length > 10 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-slate-400 italic">
                            … y {previaProds.validas.length - 10} más
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-3">
                <Button variante="secundario" onClick={() => { setPreviaProds(null); setResultProds(null) }} className="flex-1">
                  <X size={15} /> Cancelar
                </Button>
                <Button
                  variante="exito"
                  onClick={confirmarImportProductos}
                  cargando={importandoProds}
                  disabled={previaProds.validas.length === 0}
                  className="flex-1"
                >
                  <Upload size={15} />
                  Confirmar {previaProds.validas.length} {previaProds.validas.length === 1 ? 'fila' : 'filas'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── PROVEEDORES ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={20} className="text-emerald-600" />
            <div>
              <h3 className="font-semibold text-slate-800">Proveedores</h3>
              <p className="text-xs text-slate-400">{datos.proveedores.length} proveedores en el sistema</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variante="secundario" onClick={plantillaProveedores}>
              <FileSpreadsheet size={15} /> Plantilla
            </Button>
            <Button variante="secundario" onClick={() => exportarProveedores(datos.proveedores)}>
              <Download size={15} /> Exportar
            </Button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {resultProvs && (
            <div className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${
              resultProvs.errores.length === 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {resultProvs.errores.length === 0
                ? <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
                : <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
              }
              <div>
                <p className="font-medium">{resultProvs.ok} proveedores importados correctamente</p>
                {resultProvs.errores.map((e, i) => <p key={i} className="text-xs mt-1">{e}</p>)}
              </div>
            </div>
          )}

          {!previaProvs && (
            <div>
              <input ref={inputProvs} type="file" accept=".xlsx,.xls,.csv" onChange={onArchivoProveedores} className="hidden" />
              <button
                onClick={() => inputProvs.current?.click()}
                className="w-full border-2 border-dashed border-slate-200 rounded-xl py-8 flex flex-col items-center gap-2 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
              >
                <Upload size={24} />
                <span className="text-sm font-medium">Hacer clic para importar Excel</span>
                <span className="text-xs">.xlsx · .xls · .csv</span>
              </button>
              <p className="text-xs text-slate-400 mt-2">
                Solo se importa la información de contacto. Los productos del proveedor se asignan desde el módulo de Inventario.
              </p>
            </div>
          )}

          {previaProvs && (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-500">Total leídas: <strong>{previaProvs.total}</strong></span>
                <span className="text-emerald-600 font-medium">✓ Válidas: {previaProvs.validas.length}</span>
                {previaProvs.invalidas.length > 0 && (
                  <span className="text-red-500 font-medium">✗ Con error: {previaProvs.invalidas.length}</span>
                )}
              </div>

              {previaProvs.invalidas.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 space-y-1">
                  <p className="font-semibold mb-1">Filas que no se importarán:</p>
                  {previaProvs.invalidas.map((r, i) => (
                    <p key={i}>Fila {r.fila}: {r.nombre || '(sin nombre)'} — {r.errores.join(', ')}</p>
                  ))}
                </div>
              )}

              {previaProvs.validas.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {['Nombre', 'Teléfono', 'Email'].map(l => (
                          <th key={l} className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">{l}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previaProvs.validas.slice(0, 8).map((r, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 text-slate-700">{r.nombre}</td>
                          <td className="px-4 py-2 text-slate-700">{r.telefono ?? '—'}</td>
                          <td className="px-4 py-2 text-slate-700">{r.email ?? '—'}</td>
                        </tr>
                      ))}
                      {previaProvs.validas.length > 8 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-slate-400 italic">… y {previaProvs.validas.length - 8} más</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-3">
                <Button variante="secundario" onClick={() => { setPreviaProvs(null); setResultProvs(null) }} className="flex-1">
                  <X size={15} /> Cancelar
                </Button>
                <Button
                  variante="exito"
                  onClick={confirmarImportProveedores}
                  cargando={importandoProvs}
                  disabled={previaProvs.validas.length === 0}
                  className="flex-1"
                >
                  <Upload size={15} />
                  Importar {previaProvs.validas.length} {previaProvs.validas.length === 1 ? 'fila' : 'filas'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
