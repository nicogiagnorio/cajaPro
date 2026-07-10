import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, ToggleLeft, ToggleRight, Search, AlertTriangle, PackageX } from 'lucide-react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { traducirError } from '../../lib/errores'
import { validarPrecio, validarStock, soloNumerosKeyDown, soloNumerosPaste } from '../../lib/validaciones'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

const UNIDADES = ['unidad', 'kg', 'g', 'litro', 'ml', 'metro', 'cm', 'pack', 'caja', 'docena']

const ALICUOTAS_IVA = [
  { valor: 0,    label: '0% — Exento' },
  { valor: 2.5,  label: '2.5%' },
  { valor: 5,    label: '5%' },
  { valor: 10.5, label: '10.5%' },
  { valor: 21,   label: '21% (general)' },
  { valor: 27,   label: '27%' },
]

function estadoStock(p) {
  if (p.stock_actual <= 0)
    return { icono: PackageX,      texto: 'Sin stock',  clase: 'bg-red-100 text-red-700' }
  if (p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo)
    return { icono: AlertTriangle, texto: 'Bajo stock', clase: 'bg-amber-100 text-amber-700' }
  return null
}

function formatPrecio(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 2,
  }).format(n)
}

function Advertencia({ children }) {
  if (!children) return null
  return (
    <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 mt-1">
      <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

export default function Productos() {
  const { perfil } = useAuth()

  const [productos,      setProductos]      = useState([])
  const [categorias,     setCategorias]     = useState([])
  const [proveedores,    setProveedores]    = useState([])
  const [cargando,       setCargando]       = useState(true)
  const [modalAbierto,   setModal]          = useState(false)
  const [editando,       setEditando]       = useState(null)
  const [errorServer,    setErrorServer]    = useState('')

  const [busqueda,        setBusqueda]        = useState('')
  const [filtroCateg,     setFiltroCateg]     = useState('')
  const [filtroProveedor, setFiltroProveedor] = useState('')
  const [filtroStock,     setFiltroStock]     = useState('todos')

  const {
    register, handleSubmit, reset, control,
    formState: { errors, isSubmitting },
  } = useForm()

  const [wPrecioVenta, wPrecioCosto, wStockActual, wStockMinimo] = useWatch({
    control,
    name: ['precio_venta', 'precio_costo', 'stock_actual', 'stock_minimo'],
  })

  useEffect(() => { cargarTodo() }, [])

  async function cargarTodo() {
    setCargando(true)
    const [{ data: prods }, { data: cats }, { data: provs }] = await Promise.all([
      supabase
        .from('productos')
        .select('*, categorias(id, nombre), proveedores(id, nombre)')
        .eq('comercio_id', perfil.comercio_id)
        .order('nombre')
        .limit(200),
      supabase.from('categorias').select('id, nombre').eq('comercio_id', perfil.comercio_id).eq('activo', true).order('nombre'),
      supabase.from('proveedores').select('id, nombre').eq('comercio_id', perfil.comercio_id).eq('activo', true).order('nombre'),
    ])
    setProductos(prods   ?? [])
    setCategorias(cats   ?? [])
    setProveedores(provs ?? [])
    setCargando(false)
  }

  const productosFiltrados = useMemo(() => {
    let lista = productos
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      lista = lista.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.codigo_barras?.toLowerCase().includes(q)
      )
    }
    if (filtroCateg)     lista = lista.filter(p => p.categoria_id  === filtroCateg)
    if (filtroProveedor) lista = lista.filter(p => p.proveedor_id  === filtroProveedor)
    if (filtroStock === 'bajo') {
      lista = lista.filter(p => p.stock_actual > 0 && p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo)
    } else if (filtroStock === 'sin') {
      lista = lista.filter(p => p.stock_actual <= 0)
    }
    return lista
  }, [productos, busqueda, filtroCateg, filtroProveedor, filtroStock])

  const contadorAlerts = useMemo(() =>
    productos.filter(p =>
      p.stock_actual <= 0 ||
      (p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo)
    ).length,
  [productos])

  const advertenciaStockBajo = useMemo(() => {
    const actual = parseFloat(wStockActual)
    const minimo = parseFloat(wStockMinimo)
    if (isNaN(actual) || isNaN(minimo) || minimo <= 0) return ''
    if (actual < minimo)
      return `El stock actual (${actual}) ya está por debajo del mínimo configurado (${minimo}). Se generará una alerta de reposición.`
    return ''
  }, [wStockActual, wStockMinimo])

  const advertenciaPerdida = useMemo(() => {
    const venta = parseFloat(wPrecioVenta)
    const costo = parseFloat(wPrecioCosto)
    if (isNaN(venta) || isNaN(costo) || costo <= 0) return ''
    if (costo > venta)
      return `El precio de costo (${formatPrecio(costo)}) es mayor al precio de venta (${formatPrecio(venta)}). Estarías vendiendo a pérdida.`
    return ''
  }, [wPrecioVenta, wPrecioCosto])

  const reglasNumericas = {
    onKeyDown: soloNumerosKeyDown,
    onPaste:   soloNumerosPaste,
  }

  function abrirCrear() {
    setEditando(null)
    reset({
      nombre: '', codigo_barras: '', categoria_id: '', proveedor_id: '',
      precio_venta: '', precio_costo: '', stock_actual: '0',
      stock_minimo: '0', unidad: 'unidad', alicuota_iva: 21, activo: true,
    })
    setErrorServer('')
    setModal(true)
  }

  function abrirEditar(prod) {
    setEditando(prod)
    reset({
      nombre:        prod.nombre,
      codigo_barras: prod.codigo_barras ?? '',
      categoria_id:  prod.categoria_id  ?? '',
      proveedor_id:  prod.proveedor_id  ?? '',
      precio_venta:  prod.precio_venta,
      precio_costo:  prod.precio_costo  ?? '',
      stock_actual:  prod.stock_actual,
      stock_minimo:  prod.stock_minimo  ?? '0',
      unidad:        prod.unidad        ?? 'unidad',
      alicuota_iva:  prod.alicuota_iva  ?? 21,
      activo:        prod.activo,
    })
    setErrorServer('')
    setModal(true)
  }

  async function onSubmit(datos) {
    setErrorServer('')
    const payload = {
      nombre:        datos.nombre.trim(),
      codigo_barras: datos.codigo_barras?.trim() || null,
      categoria_id:  datos.categoria_id  || null,
      proveedor_id:  datos.proveedor_id  || null,
      precio_venta:  parseFloat(datos.precio_venta)  || 0,
      precio_costo:  parseFloat(datos.precio_costo)  || 0,
      stock_actual:  parseFloat(datos.stock_actual)  || 0,
      stock_minimo:  parseFloat(datos.stock_minimo)  || 0,
      unidad:        datos.unidad || 'unidad',
      alicuota_iva:  parseFloat(datos.alicuota_iva)  ?? 21,
      activo:        datos.activo ?? true,
    }

    const { error } = editando
      ? await supabase.from('productos').update(payload).eq('id', editando.id)
      : await supabase.from('productos').insert({ ...payload, comercio_id: perfil.comercio_id })

    if (error) {
      setErrorServer(traducirError(error))
      return
    }
    setModal(false)
    cargarTodo()
  }

  async function toggleActivo(prod) {
    const { error } = await supabase.from('productos').update({ activo: !prod.activo }).eq('id', prod.id)
    if (error) { alert(traducirError(error)); return }
    setProductos(prev => prev.map(p => p.id === prod.id ? { ...p, activo: !p.activo } : p))
  }

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4 sm:items-center">
        <div className="relative flex-1 min-w-0 sm:min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o código de barras..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={filtroCateg}
            onChange={e => setFiltroCateg(e.target.value)}
            className="flex-1 sm:flex-none text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white"
          >
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>

          {proveedores.length > 0 && (
            <select
              value={filtroProveedor}
              onChange={e => setFiltroProveedor(e.target.value)}
              className="flex-1 sm:flex-none text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white"
            >
              <option value="">Todos los proveedores</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          )}

          <select
            value={filtroStock}
            onChange={e => setFiltroStock(e.target.value)}
            className="flex-1 sm:flex-none text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white"
          >
            <option value="todos">Todo el stock</option>
            <option value="bajo">Bajo stock</option>
            <option value="sin">Sin stock</option>
          </select>
        </div>

        <Button onClick={abrirCrear} className="w-full sm:w-auto">
          <Plus size={16} /> Nuevo producto
        </Button>
      </div>

      {contadorAlerts > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-3 mb-4">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>
            <strong>{contadorAlerts}</strong>{' '}
            {contadorAlerts === 1 ? 'producto tiene' : 'productos tienen'} stock bajo o agotado
          </span>
        </div>
      )}

      <p className="text-xs text-slate-400 mb-3">
        {productosFiltrados.length} de {productos.length} productos
      </p>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-blue-500" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Producto</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Categoría</th>
                <th className="text-right px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Stock</th>
                <th className="text-right px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Precio venta</th>
                <th className="text-right px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Costo</th>
                <th className="text-right px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">IVA</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productosFiltrados.map(prod => {
                const alerta = estadoStock(prod)
                return (
                  <tr
                    key={prod.id}
                    className={`hover:bg-slate-50 transition-colors ${!prod.activo ? 'opacity-40' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800">{prod.nombre}</p>
                      {prod.codigo_barras && (
                        <p className="text-xs text-slate-400 font-mono">{prod.codigo_barras}</p>
                      )}
                      {alerta && (
                        <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${alerta.clase}`}>
                          <alerta.icono size={11} />
                          {alerta.texto}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{prod.categorias?.nombre ?? '—'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`font-semibold ${
                        prod.stock_actual <= 0
                          ? 'text-red-600'
                          : prod.stock_minimo > 0 && prod.stock_actual <= prod.stock_minimo
                            ? 'text-amber-600'
                            : 'text-slate-800'
                      }`}>
                        {prod.stock_actual}
                      </span>
                      <span className="text-slate-400 text-xs ml-1">{prod.unidad}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-800">
                      {formatPrecio(prod.precio_venta)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-500">
                      {prod.precio_costo > 0 ? formatPrecio(prod.precio_costo) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                        {prod.alicuota_iva ?? 21}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => abrirEditar(prod)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => toggleActivo(prod)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          {prod.activo
                            ? <ToggleRight size={18} className="text-emerald-500" />
                            : <ToggleLeft  size={18} />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {productosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    {productos.length === 0
                      ? 'No hay productos todavía. Creá el primero.'
                      : 'Ningún producto coincide con los filtros.'
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModal(false)}
        titulo={editando ? 'Editar producto' : 'Nuevo producto'}
        ancho="max-w-2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Identificación</p>
            <div className="space-y-3">
              <Input
                label="Nombre *"
                placeholder="Ej: Coca-Cola 2.25L"
                error={errors.nombre?.message}
                {...register('nombre', { required: 'El nombre es requerido' })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Código de barras"
                  placeholder="7790001234567"
                  {...register('codigo_barras')}
                />
                <Select label="Unidad" {...register('unidad')}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </Select>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Clasificación</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Categoría" {...register('categoria_id')}>
                <option value="">— Sin categoría —</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </Select>
              <Select label="Proveedor" {...register('proveedor_id')}>
                <option value="">— Sin proveedor —</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Precios</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Precio de venta *"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                error={errors.precio_venta?.message}
                {...register('precio_venta', {
                  required: 'El precio es requerido',
                  validate: v => { const r = validarPrecio(v); return r.valido || r.mensaje },
                })}
                {...reglasNumericas}
              />
              <Input
                label="Precio de costo"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                error={errors.precio_costo?.message}
                {...register('precio_costo', {
                  validate: v => {
                    if (!v && v !== 0) return true
                    const r = validarPrecio(v); return r.valido || r.mensaje
                  },
                })}
                {...reglasNumericas}
              />
            </div>
            <Advertencia>{advertenciaPerdida}</Advertencia>
            <div className="mt-3">
              <Select label="Alícuota de IVA (precio incluye IVA)" {...register('alicuota_iva')}>
                {ALICUOTAS_IVA.map(a => (
                  <option key={a.valor} value={a.valor}>{a.label}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Stock</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Stock actual"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                error={errors.stock_actual?.message}
                {...register('stock_actual', {
                  validate: v => { const r = validarStock(v); return r.valido || r.mensaje },
                })}
                {...reglasNumericas}
              />
              <Input
                label="Stock mínimo (alerta)"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                error={errors.stock_minimo?.message}
                {...register('stock_minimo', {
                  validate: v => { const r = validarStock(v); return r.valido || r.mensaje },
                })}
                {...reglasNumericas}
              />
            </div>
            <Advertencia>{advertenciaStockBajo}</Advertencia>
          </div>

          <div className="border-t border-slate-100" />

          <Controller
            name="activo"
            control={control}
            defaultValue={true}
            render={({ field }) => (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Producto activo</p>
                  <p className="text-xs text-slate-400">Los productos inactivos no aparecen en ventas</p>
                </div>
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${field.value ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${field.value ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            )}
          />

          {errorServer && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
              <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{errorServer}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variante="secundario" className="flex-1" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" cargando={isSubmitting} className="flex-1">
              {editando ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
