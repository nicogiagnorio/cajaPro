import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Minus, X, Search, Package,
  CheckCircle2, ClipboardList, FileText, CreditCard, AlertTriangle,
  ArrowLeft, Clock,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'

const METODOS_PAGO = [
  { value: 'efectivo',         label: 'Efectivo'      },
  { value: 'transferencia',    label: 'Transferencia' },
  { value: 'cheque',           label: 'Cheque'        },
  { value: 'cuenta_corriente', label: 'Cta. cte.'     },
  { value: 'otro',             label: 'Otro'          },
]

const TIPOS_FACTURA = ['A', 'B', 'C', 'M', 'X']

function ars(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 2,
  }).format(n)
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

export default function CompraDetallada() {
  const { perfil } = useAuth()
  const navigate   = useNavigate()

  // Datos base
  const [productos,   setProductos]   = useState([])
  const [proveedores, setProveedores] = useState([])
  const [cargando,    setCargando]    = useState(true)
  const [busqueda,    setBusqueda]    = useState('')
  const [carrito,     setCarrito]     = useState([])

  // Opciones de la compra
  const [proveedor,   setProveedor]   = useState('')
  const [metodoPago,  setMetodoPago]  = useState('efectivo')

  // Factura del proveedor
  const [facturada,   setFacturada]   = useState(false)
  const [tipoFact,    setTipoFact]    = useState('A')
  const [nroFact,     setNroFact]     = useState('')
  const [fechaFact,   setFechaFact]   = useState(hoy())

  // Estado del pago
  const [pagada,      setPagada]      = useState(true)
  const [fechaPago,   setFechaPago]   = useState(hoy())

  // UI
  const [registrando, setRegistrando] = useState(false)
  const [confirmada,  setConfirmada]  = useState(null)
  const [error,       setError]       = useState('')

  const inputRef = useRef(null)

  useEffect(() => { cargarTodo() }, [])

  async function cargarTodo() {
    setCargando(true)
    const [{ data: prods }, { data: provs }] = await Promise.all([
      supabase
        .from('productos')
        .select('id, nombre, codigo_barras, precio_costo, stock_actual, unidad')
        .eq('activo', true)
        .order('nombre')
        .limit(500),
      supabase
        .from('proveedores')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre'),
    ])
    setProductos(prods  ?? [])
    setProveedores(provs ?? [])
    setCargando(false)
  }

  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productos
    const q = busqueda.toLowerCase()
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.codigo_barras?.toLowerCase().includes(q)
    )
  }, [productos, busqueda])

  function agregarProducto(prod) {
    setCarrito(prev => {
      const idx = prev.findIndex(i => i.id === prod.id)
      if (idx >= 0) {
        return prev.map((i, ix) =>
          ix === idx
            ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario }
            : i
        )
      }
      return [...prev, {
        id:              prod.id,
        nombre:          prod.nombre,
        precio_unitario: prod.precio_costo > 0 ? prod.precio_costo : 0,
        cantidad:        1,
        subtotal:        prod.precio_costo > 0 ? prod.precio_costo : 0,
      }]
    })
  }

  function cambiarCantidad(id, val) {
    const cant = parseFloat(val)
    if (isNaN(cant) || cant <= 0) { setCarrito(prev => prev.filter(i => i.id !== id)); return }
    setCarrito(prev => prev.map(i =>
      i.id === id ? { ...i, cantidad: cant, subtotal: cant * i.precio_unitario } : i
    ))
  }

  function cambiarPrecio(id, val) {
    const precio = parseFloat(val) || 0
    setCarrito(prev => prev.map(i =>
      i.id === id ? { ...i, precio_unitario: precio, subtotal: i.cantidad * precio } : i
    ))
  }

  function quitarItem(id) {
    setCarrito(prev => prev.filter(i => i.id !== id))
  }

  const total = carrito.reduce((s, i) => s + i.subtotal, 0)

  function onKeyBusqueda(e) {
    if (e.key !== 'Enter') return
    const q = busqueda.trim().toLowerCase()
    const exacto = productos.find(p => p.codigo_barras?.toLowerCase() === q)
    if (exacto) { agregarProducto(exacto); setBusqueda('') }
    else if (productosFiltrados.length === 1) { agregarProducto(productosFiltrados[0]); setBusqueda('') }
  }

  function resetearOpciones() {
    setProveedor('')
    setMetodoPago('efectivo')
    setFacturada(false)
    setTipoFact('A')
    setNroFact('')
    setFechaFact(hoy())
    setPagada(true)
    setFechaPago(hoy())
  }

  async function registrarCompra() {
    if (carrito.length === 0) return
    setRegistrando(true)
    setError('')

    const { data: compra, error: e1 } = await supabase
      .from('compras')
      .insert({
        comercio_id:             perfil.comercio_id,
        usuario_id:              perfil.id,
        tipo:                    'detallada',
        proveedor_id:            proveedor || null,
        total,
        metodo_pago:             metodoPago,
        estado:                  'pendiente',
        // Factura proveedor (columnas legacy + nuevas)
        facturada,
        tipo_factura_proveedor:  facturada ? tipoFact : null,
        nro_factura_proveedor:   facturada && nroFact.trim() ? nroFact.trim() : null,
        fecha_factura:           facturada && fechaFact ? fechaFact : null,
        estado_factura:          facturada ? 'con_factura' : 'sin_factura',
        numero_factura:          facturada && nroFact.trim() ? nroFact.trim() : null,
        // Pago (columnas legacy + nuevas)
        pagada,
        fecha_pago:              pagada ? fechaPago : null,
        estado_pago:             pagada ? 'pagada' : 'pendiente',
        // Recepcion — pendiente hasta que el usuario la marque en historial
        estado_recepcion:        'pendiente',
        fecha_recepcion:         null,
      })
      .select('id, numero')
      .single()

    if (e1) { setError(traducirError(e1)); setRegistrando(false); return }

    const items = carrito.map(i => ({
      compra_id:       compra.id,
      producto_id:     i.id,
      nombre_producto: i.nombre,
      cantidad:        i.cantidad,
      precio_unitario: i.precio_unitario,
      subtotal:        i.subtotal,
    }))

    const { error: e2 } = await supabase.from('compras_items').insert(items)
    if (e2) { setError(traducirError(e2)); setRegistrando(false); return }

    setConfirmada({ numero: compra.numero, total, metodoPago, facturada, pagada })
    setCarrito([])
    resetearOpciones()
    setRegistrando(false)
  }

  if (confirmada) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-sm w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Compra registrada</h2>
          {confirmada.numero && (
            <p className="text-slate-400 text-sm mb-3">Compra #{confirmada.numero}</p>
          )}
          <p className="text-4xl font-bold text-slate-900 mb-1">{ars(confirmada.total)}</p>
          <p className="text-sm text-slate-400 mb-4">
            {METODOS_PAGO.find(m => m.value === confirmada.metodoPago)?.label}
          </p>
          <div className="flex justify-center gap-2 mb-4">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
              confirmada.facturada
                ? 'bg-violet-100 text-violet-700'
                : 'bg-slate-100 text-slate-500'
            }`}>
              <FileText size={11} />
              {confirmada.facturada ? 'Con factura' : 'Sin factura'}
            </span>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
              confirmada.pagada
                ? 'bg-blue-100 text-blue-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              <CreditCard size={11} />
              {confirmada.pagada ? 'Pagada' : 'Pago pendiente'}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-left">
            <Clock size={14} className="text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-800 leading-snug">
              El stock se actualiza cuando marques la mercaderia como recibida en el historial.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/app/compras/historial')} variante="secundario" className="flex-1">
              <ArrowLeft size={15} /> Historial
            </Button>
            <Button onClick={() => { setConfirmada(null); setTimeout(() => inputRef.current?.focus(), 50) }} variante="exito" className="flex-1">
              <ClipboardList size={15} /> Nueva
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex gap-5">
      {/* Panel izquierdo: busqueda + grilla */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Boton volver */}
        <button
          onClick={() => navigate('/app/compras/historial')}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-3 self-start transition-colors"
        >
          <ArrowLeft size={14} /> Volver al historial
        </button>

        <div className="relative mb-4 flex-shrink-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            autoFocus
            placeholder="Buscar producto o escanear codigo de barras..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={onKeyBusqueda}
            className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm"
          />
        </div>

        {cargando ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-blue-500" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 pb-3">
              {productosFiltrados.map(prod => (
                <button
                  key={prod.id}
                  onClick={() => agregarProducto(prod)}
                  className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  <p className="font-medium text-slate-800 text-sm leading-snug mb-2 group-hover:text-blue-700 line-clamp-2">
                    {prod.nombre}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 text-xs">
                      Costo: {prod.precio_costo > 0 ? ars(prod.precio_costo) : '-'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex-shrink-0">
                      Stock: {prod.stock_actual} {prod.unidad}
                    </span>
                  </div>
                </button>
              ))}
              {productosFiltrados.length === 0 && (
                <div className="col-span-3 text-center py-12 text-slate-400 text-sm">
                  {productos.length === 0
                    ? 'No hay productos activos en el inventario.'
                    : 'No se encontraron productos.'
                  }
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Panel derecho */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
          <Package size={17} className="text-slate-500" />
          <span className="font-semibold text-slate-800 text-sm">
            Recepcion
            {carrito.length > 0 && (
              <span className="ml-1.5 font-normal text-slate-400">({carrito.length})</span>
            )}
          </span>
          {carrito.length > 0 && (
            <button
              onClick={() => setCarrito([])}
              className="ml-auto text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              Vaciar
            </button>
          )}
        </div>

        {/* Cuerpo scrollable: items + opciones */}
        <div className="flex-1 overflow-y-auto">
          {/* Items */}
          <div className="px-3 py-2 space-y-2">
            {carrito.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">
                Selecciona los productos recibidos
              </p>
            ) : (
              carrito.map(item => (
                <div key={item.id} className="bg-slate-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <p className="text-sm font-medium text-slate-800 leading-snug flex-1 line-clamp-2">
                      {item.nombre}
                    </p>
                    <button
                      onClick={() => quitarItem(item.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-slate-400 mb-1">Cantidad</p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}
                          className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                        >
                          <Minus size={11} />
                        </button>
                        <input
                          type="number"
                          min="0.001"
                          step="1"
                          value={item.cantidad}
                          onChange={e => cambiarCantidad(item.id, e.target.value)}
                          className="w-12 text-center text-sm border border-slate-200 rounded-md py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-200"
                        />
                        <button
                          onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}
                          className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 mb-1">Precio unit. $</p>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.precio_unitario}
                        onChange={e => cambiarPrecio(item.id, e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-200"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <span className="text-sm font-semibold text-slate-800">= {ars(item.subtotal)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Opciones */}
          <div className="border-t border-slate-100">
            {/* Proveedor */}
            <div className="px-4 py-3">
              <select
                value={proveedor}
                onChange={e => setProveedor(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white text-slate-700"
              >
                <option value="">Proveedor (opcional)</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            {/* Factura del proveedor */}
            <div className="border-t border-slate-100 px-4 py-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Factura del proveedor
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={facturada}
                  onChange={e => setFacturada(e.target.checked)}
                  className="rounded text-violet-600 accent-violet-600"
                />
                <span className="text-sm text-slate-700">Tiene factura</span>
              </label>
              {facturada && (
                <div className="space-y-2 pl-1">
                  <div className="flex gap-1 items-center">
                    {TIPOS_FACTURA.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipoFact(t)}
                        className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                          tipoFact === t
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                    <input
                      type="text"
                      placeholder="Nro. factura"
                      value={nroFact}
                      onChange={e => setNroFact(e.target.value)}
                      className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-300 min-w-0"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1">Fecha de la factura</p>
                    <input
                      type="date"
                      value={fechaFact}
                      onChange={e => setFechaFact(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-300"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Estado del pago */}
            <div className="border-t border-slate-100 px-4 py-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Estado del pago
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPagada(true)}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    pagada
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Pagada
                </button>
                <button
                  type="button"
                  onClick={() => setPagada(false)}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    !pagada
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Pendiente
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {METODOS_PAGO.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMetodoPago(m.value)}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      metodoPago === m.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {pagada && (
                <div>
                  <p className="text-[10px] text-slate-400 mb-1">Fecha de pago</p>
                  <input
                    type="date"
                    value={fechaPago}
                    onChange={e => setFechaPago(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-200"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer fijo: total + boton */}
        <div className="px-5 py-4 border-t border-slate-200 space-y-3 flex-shrink-0 bg-white">
          <div className="flex justify-between font-bold text-slate-900 text-lg">
            <span>Total</span>
            <span>{ars(total)}</span>
          </div>
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-800 leading-snug">{error}</p>
            </div>
          )}
          <Button
            onClick={registrarCompra}
            cargando={registrando}
            disabled={carrito.length === 0}
            variante="exito"
            className="w-full"
          >
            <ClipboardList size={16} />
            {carrito.length > 0 ? `Registrar ${ars(total)}` : 'Registrar compra'}
          </Button>
        </div>
      </div>
    </div>
  )
}
