import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Plus, Minus, X, Search, ShoppingCart,
  CreditCard, CheckCircle2, Banknote, Printer,
  FileText, AlertCircle, ScanBarcode, Tag, Trash2,
  Zap, FileCheck, ReceiptText,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { traducirError } from '../../lib/errores'
import { imprimirTicket } from '../../lib/imprimirTicket'
import { arca } from '../../lib/arca'
import PanelFacturar from '../../components/PanelFacturar'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'

const METODOS_PAGO = [
  { value: 'efectivo',        label: 'Efectivo',      icono: Banknote    },
  { value: 'tarjeta_debito',  label: 'Débito',        icono: CreditCard  },
  { value: 'tarjeta_credito', label: 'Crédito',       icono: CreditCard  },
  { value: 'transferencia',   label: 'Transf.',       icono: CreditCard  },
  { value: 'otro',            label: 'Otro',          icono: CreditCard  },
]

function ars(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 2,
  }).format(n)
}

// Devuelve '#fff' o '#1e293b' según la luminosidad del color de fondo
function contrasteTexto(hex) {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return '#fff'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1e293b' : '#fff'
}

// ── Badge de stock ─────────────────────────────────────────────
function BadgeStock({ prod }) {
  if (prod.stock_actual <= 0)
    return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-600">Sin stock</span>
  if (prod.stock_minimo && prod.stock_actual <= prod.stock_minimo)
    return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">Stock bajo</span>
  return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">{prod.stock_actual} {prod.unidad ?? ''}</span>
}

export default function NuevaVenta() {
  const { perfil, comercio } = useAuth()
  const tema = comercio?.color_tema ?? '#2563eb'

  const [productos,         setProductos]         = useState([])
  const [categorias,        setCategorias]        = useState([])
  const [cargando,          setCargando]          = useState(true)
  const [busqueda,          setBusqueda]          = useState('')
  const [categoriaActiva,   setCategoriaActiva]   = useState(null)
  const [carrito,           setCarrito]           = useState([])
  const [descuento,         setDescuento]         = useState('')
  const [tipoDescuento,     setTipoDescuento]     = useState('$')  // '$' | '%'
  const [metodoPago,        setMetodoPago]        = useState('efectivo')
  const [efectivoEntregado, setEfectivoEntregado] = useState('')
  const [vendiendo,         setVendiendo]         = useState(false)
  const [confirmada,        setConfirmada]        = useState(null)
  const [error,             setError]             = useState('')
  const [clientes,          setClientes]          = useState([])
  const [clienteId,         setClienteId]         = useState('')

  // ARCA
  const [arcaConfig,     setArcaConfig]     = useState(null)
  const [facturaEmitida, setFacturaEmitida] = useState(null)
  const [mostrarArca,    setMostrarArca]    = useState(false)
  const [errorArca,      setErrorArca]      = useState('')

  const inputRef = useRef(null)

  useEffect(() => { cargarTodo() }, [])
  useEffect(() => {
    arca.cargarConfig().then(res => { if (res.ok && res.data) setArcaConfig(res.data) })
  }, [])

  async function cargarTodo() {
    setCargando(true)
    const [{ data: prods }, { data: cats }, { data: clis }] = await Promise.all([
      supabase.from('productos')
        .select('id, nombre, codigo_barras, precio_venta, stock_actual, stock_minimo, unidad, alicuota_iva, categoria_id')
        .eq('comercio_id', perfil.comercio_id).eq('activo', true).order('nombre').limit(500),
      supabase.from('categorias').select('id, nombre').eq('comercio_id', perfil.comercio_id).eq('activo', true).order('nombre'),
      supabase.from('clientes').select('id, nombre').eq('comercio_id', perfil.comercio_id).eq('activo', true).order('nombre'),
    ])
    setProductos(prods ?? [])
    setCategorias(cats ?? [])
    setClientes(clis ?? [])
    setCargando(false)
  }

  // ── Filtrado de productos ─────────────────────────────────────
  const productosFiltrados = useMemo(() => {
    let lista = productos
    if (categoriaActiva) lista = lista.filter(p => p.categoria_id === categoriaActiva)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      lista = lista.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.codigo_barras?.toLowerCase().includes(q)
      )
    }
    return lista
  }, [productos, busqueda, categoriaActiva])

  // ── Carrito ───────────────────────────────────────────────────
  function agregarProducto(prod) {
    if (prod.stock_actual <= 0) return
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
        precio_unitario: prod.precio_venta,
        cantidad:        1,
        subtotal:        prod.precio_venta,
        alicuota_iva:    prod.alicuota_iva ?? 21,
      }]
    })
  }

  function cambiarPrecio(id, val) {
    const precio = parseFloat(val)
    if (isNaN(precio) || precio < 0) return
    setCarrito(prev => prev.map(i =>
      i.id === id ? { ...i, precio_unitario: precio, subtotal: precio * i.cantidad } : i
    ))
  }

  function cambiarCantidad(id, delta) {
    setCarrito(prev => prev.flatMap(i => {
      if (i.id !== id) return [i]
      const nueva = i.cantidad + delta
      if (nueva <= 0) return []
      return [{ ...i, cantidad: nueva, subtotal: nueva * i.precio_unitario }]
    }))
  }

  function setCantidadDirecta(id, val) {
    const cant = parseFloat(val)
    if (isNaN(cant) || cant <= 0) { setCarrito(prev => prev.filter(i => i.id !== id)); return }
    setCarrito(prev => prev.map(i =>
      i.id === id ? { ...i, cantidad: cant, subtotal: cant * i.precio_unitario } : i
    ))
  }

  function quitarItem(id) { setCarrito(prev => prev.filter(i => i.id !== id)) }

  function onKeyBusqueda(e) {
    if (e.key !== 'Enter') return
    const q = busqueda.trim().toLowerCase()
    const exacto = productos.find(p => p.codigo_barras?.toLowerCase() === q)
    if (exacto) { agregarProducto(exacto); setBusqueda(''); return }
    if (productosFiltrados.length === 1) { agregarProducto(productosFiltrados[0]); setBusqueda('') }
  }

  // ── Totales ───────────────────────────────────────────────────
  const subtotal = carrito.reduce((s, i) => s + i.subtotal, 0)
  const descNum  = useMemo(() => {
    const v = parseFloat(descuento) || 0
    return tipoDescuento === '%' ? subtotal * v / 100 : v
  }, [descuento, tipoDescuento, subtotal])
  const total  = Math.max(0, subtotal - descNum)
  const vuelto = metodoPago === 'efectivo'
    ? Math.max(0, (parseFloat(efectivoEntregado) || 0) - total)
    : null

  // IVA desglose para ARCA
  const ivaDesglose = useMemo(() => {
    if (!arcaConfig?.tipoFactura || arcaConfig.tipoFactura === 'C' || carrito.length === 0) return []
    const factor = subtotal > 0 ? total / subtotal : 1
    const grupos = {}
    for (const item of carrito) {
      const tasa = item.alicuota_iva ?? 21
      if (!grupos[tasa]) grupos[tasa] = 0
      grupos[tasa] += item.subtotal * factor
    }
    return Object.entries(grupos).sort(([a],[b]) => parseFloat(a)-parseFloat(b)).map(([tasa, monto]) => {
      const tasaNum = parseFloat(tasa)
      const neto    = parseFloat((monto / (1 + tasaNum/100)).toFixed(2))
      const ivaAmt  = parseFloat((monto - neto).toFixed(2))
      return { tasa: tasaNum, neto, iva: ivaAmt, monto: parseFloat(monto.toFixed(2)) }
    })
  }, [carrito, arcaConfig, total, subtotal])

  // ── Confirmar venta ───────────────────────────────────────────
  async function confirmarVenta() {
    if (carrito.length === 0) return
    setVendiendo(true); setError('')

    const { data: venta, error: e1 } = await supabase
      .from('ventas')
      .insert({
        comercio_id: perfil.comercio_id,
        usuario_id:  perfil.id,
        cliente_id:  clienteId || null,
        subtotal,
        descuento:   descNum,
        total,
        metodo_pago: metodoPago,
        estado:      'completada',
        tipo:        'detallada',
      })
      .select('id, numero')
      .single()

    if (e1) { setError(traducirError(e1)); setVendiendo(false); return }

    const { error: e2 } = await supabase.from('ventas_items').insert(
      carrito.map(i => ({
        venta_id:        venta.id,
        producto_id:     i.id,
        nombre_producto: i.nombre,
        precio_unitario: i.precio_unitario,
        cantidad:        i.cantidad,
        subtotal:        i.subtotal,
        alicuota_iva:    i.alicuota_iva ?? 21,
      }))
    )
    if (e2) { setError(traducirError(e2)); setVendiendo(false); return }

    const clienteSeleccionado = clientes.find(c => c.id === clienteId)
    setConfirmada({
      ventaId:       venta.id,
      ventaObj:      { id: venta.id, total },
      numero:        venta.numero,
      subtotal,
      descuento:     descNum,
      total,
      metodoPago,
      vuelto:        vuelto ?? 0,
      items:         [...carrito],
      clienteNombre: clienteSeleccionado?.nombre ?? null,
    })
    setCarrito([])
    setDescuento('')
    setEfectivoEntregado('')
    setMetodoPago('efectivo')
    setVendiendo(false)
  }

  function nuevaVenta() {
    setConfirmada(null); setFacturaEmitida(null)
    setErrorArca(''); setMostrarArca(false)
    setBusqueda(''); setClienteId('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // ── Pantalla post-venta ───────────────────────────────────────
  if (confirmada) {
    const tieneArca = arcaConfig?.tipoFactura && arcaConfig?.tieneCert

    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm w-full max-w-sm p-8 space-y-5">

          {/* Cabecera */}
          <div className="text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">¡Venta registrada!</h2>
            {confirmada.numero && (
              <p className="text-slate-400 text-sm">Ticket #{confirmada.numero}</p>
            )}
          </div>

          {/* Resumen */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between font-bold text-slate-900 text-lg">
              <span>Total cobrado</span>
              <span>{ars(confirmada.total)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Medio de pago</span>
              <span>{METODOS_PAGO.find(m => m.value === confirmada.metodoPago)?.label}</span>
            </div>
            {confirmada.clienteNombre && (
              <div className="flex justify-between text-slate-500">
                <span>Cliente</span>
                <span className="font-medium text-slate-700">{confirmada.clienteNombre}</span>
              </div>
            )}
            {confirmada.metodoPago === 'efectivo' && confirmada.vuelto > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold border-t border-slate-200 pt-2 mt-1">
                <span>Vuelto</span>
                <span>{ars(confirmada.vuelto)}</span>
              </div>
            )}
          </div>

          {/* Factura emitida */}
          {facturaEmitida && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <FileCheck size={13} /> Factura {facturaEmitida.tipoFactura} emitida
              </p>
              <p className="text-xs text-emerald-700">
                PV {String(facturaEmitida.puntoVenta).padStart(5,'0')} — N° {String(facturaEmitida.nroFactura).padStart(8,'0')}
              </p>
              <p className="text-xs font-mono text-emerald-600">CAE: {facturaEmitida.cae}</p>
            </div>
          )}

          {/* ARCA post-cobro — solo si hay config y no se facturó */}
          {tieneArca && !facturaEmitida && (
            <div className="border border-slate-200 rounded-xl p-4">
              {!mostrarArca ? (
                <button
                  onClick={() => setMostrarArca(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-violet-700 hover:text-violet-900 transition-colors"
                >
                  <ReceiptText size={15} />
                  Emitir factura ARCA
                </button>
              ) : (
                <PanelFacturar
                  venta={confirmada.ventaObj}
                  ivaItems={ivaDesglose}
                  onExito={res => { setFacturaEmitida(res); setMostrarArca(false) }}
                  onCancelar={() => {
                    setMostrarArca(false)
                    setErrorArca('Podés facturar desde el historial de ventas más tarde.')
                  }}
                />
              )}
            </div>
          )}

          {errorArca && (
            <p className="text-xs text-slate-400 text-center">{errorArca}</p>
          )}

          {/* Acciones */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => imprimirTicket({
                comercioNombre:    comercio?.nombre,
                comercioDomicilio: comercio?.domicilio,
                comercioTelefono:  comercio?.telefono,
                comercioCuit:      comercio?.cuit,
                numero:            confirmada.numero,
                items:             confirmada.items,
                subtotal:          confirmada.subtotal,
                descuento:         confirmada.descuento,
                total:             confirmada.total,
                metodoPago:        confirmada.metodoPago,
                vuelto:            confirmada.vuelto,
                clienteNombre:     confirmada.clienteNombre,
                cae:               facturaEmitida?.cae,
                caeVencimiento:    facturaEmitida?.caeVencimiento,
                nroFactura:        facturaEmitida?.nroFactura,
                tipoFactura:       facturaEmitida?.tipoFactura,
                puntoVenta:        facturaEmitida?.puntoVenta,
              })}
              variante="secundario"
              className="w-full"
            >
              <Printer size={15} />
              {facturaEmitida ? `Imprimir Factura ${facturaEmitida.tipoFactura}` : 'Imprimir ticket'}
            </Button>

            <Button onClick={nuevaVenta} className="w-full" variante="exito"
              style={{ backgroundColor: tema }}>
              <ShoppingCart size={15} /> Nueva venta
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── POS principal ─────────────────────────────────────────────
  return (
    <div className="h-full flex gap-4 overflow-hidden">

      {/* ── Panel izquierdo: catálogo ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Barra de búsqueda */}
        <div className="relative mb-3 flex-shrink-0">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            autoFocus
            placeholder="Buscar producto o escanear código de barras…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={onKeyBusqueda}
            className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent shadow-sm"
            style={{ '--tw-ring-color': tema + '40' }}
          />
          <ScanBarcode size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
        </div>

        {/* Chips de categoría */}
        {categorias.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto flex-shrink-0 pb-1 scrollbar-hide">
            {[{ id: null, nombre: 'Todos' }, ...categorias].map(cat => {
              const activo = cat.id === null ? !categoriaActiva : categoriaActiva === cat.id
              return (
                <button
                  key={cat.id ?? '__todos'}
                  onClick={() => setCategoriaActiva(cat.id === null ? null : (cat.id === categoriaActiva ? null : cat.id))}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activo
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {cat.nombre}
                </button>
              )
            })}
          </div>
        )}

        {/* Grid de productos */}
        {cargando ? (
          <div className="flex justify-center py-16 flex-1">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {productosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <Tag size={36} className="mb-3 text-slate-200" />
                <p className="text-sm font-medium">
                  {productos.length === 0 ? 'No hay productos activos' : 'Sin resultados'}
                </p>
                {busqueda && (
                  <button onClick={() => setBusqueda('')} className="mt-2 text-xs text-blue-500 hover:underline">
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 pb-4">
                {productosFiltrados.map(prod => {
                  const sinStock = prod.stock_actual <= 0
                  return (
                    <button
                      key={prod.id}
                      onClick={() => agregarProducto(prod)}
                      disabled={sinStock}
                      className={`bg-white border rounded-xl p-4 text-left transition-all group text-sm ${
                        sinStock
                          ? 'border-slate-100 opacity-50 cursor-not-allowed'
                          : 'border-slate-200 hover:shadow-md hover:border-opacity-0 active:scale-95'
                      }`}
                      style={!sinStock ? { '--hover-border': tema } : {}}
                    >
                      {/* Placeholder icono producto */}
                      <div className="w-full aspect-square rounded-lg mb-3 flex items-center justify-center"
                        style={{ backgroundColor: tema + '15' }}>
                        <ShoppingCart size={22} style={{ color: tema + 'aa' }} />
                      </div>

                      <p className="font-semibold text-slate-800 leading-snug mb-1 line-clamp-2 text-sm">
                        {prod.nombre}
                      </p>
                      <p className="font-bold text-base mb-2" style={{ color: tema }}>
                        {ars(prod.precio_venta)}
                      </p>
                      <BadgeStock prod={prod} />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Panel derecho: carrito + cobro ── */}
      <div className="w-[340px] flex-shrink-0 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Header carrito */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
          <ShoppingCart size={16} className="text-slate-400" />
          <span className="font-bold text-slate-800 text-sm">
            Carrito
            {carrito.length > 0 && (
              <span className="ml-1.5 font-normal text-slate-400">({carrito.reduce((s,i) => s + i.cantidad, 0)} items)</span>
            )}
          </span>
          {carrito.length > 0 && (
            <button onClick={() => setCarrito([])}
              className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
              <Trash2 size={12} /> Vaciar
            </button>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 py-10">
              <ShoppingCart size={40} className="mb-3" />
              <p className="text-sm text-center">Seleccioná productos<br/>del catálogo</p>
            </div>
          ) : (
            carrito.map(item => (
              <div key={item.id} className="bg-slate-50 rounded-xl p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <p className="text-sm font-medium text-slate-800 leading-snug flex-1 line-clamp-2">
                    {item.nombre}
                  </p>
                  <button onClick={() => quitarItem(item.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                    <X size={13} />
                  </button>
                </div>

                {/* Precio editable */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">$</span>
                  <input type="number" min="0" step="0.01"
                    value={item.precio_unitario}
                    onChange={e => cambiarPrecio(item.id, e.target.value)}
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 text-right"
                    style={{ '--tw-ring-color': tema + '60' }}
                  />
                </div>

                {/* Cantidad + subtotal */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button onClick={() => cambiarCantidad(item.id, -1)}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                      <Minus size={10} />
                    </button>
                    <input type="number" min="0.001" step="1"
                      value={item.cantidad}
                      onChange={e => setCantidadDirecta(item.id, e.target.value)}
                      className="w-10 text-center text-sm border border-slate-200 rounded-lg py-0.5 focus:outline-none"
                    />
                    <button onClick={() => cambiarCantidad(item.id, +1)}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                      <Plus size={10} />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{ars(item.subtotal)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Totales + cobro ── */}
        <div className="px-4 py-4 border-t border-slate-100 space-y-3 flex-shrink-0">

          {/* Descuento */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 overflow-hidden flex-shrink-0">
              {['$', '%'].map(t => (
                <button key={t} onClick={() => setTipoDescuento(t)}
                  className={`px-2.5 py-1.5 text-xs font-bold transition-all ${
                    tipoDescuento === t ? 'bg-slate-800 text-white' : 'bg-white text-slate-400'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
            <input type="number" min="0" step="0.01" placeholder="Descuento"
              value={descuento} onChange={e => setDescuento(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1"
              style={{ '--tw-ring-color': tema + '60' }}
            />
          </div>

          {/* Resumen totales */}
          <div className="space-y-1 text-sm">
            {descNum > 0 && (
              <>
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span><span>{ars(subtotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Descuento {tipoDescuento === '%' ? `(${parseFloat(descuento)||0}%)` : ''}</span>
                  <span>− {ars(descNum)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-extrabold text-slate-900 text-xl pt-1">
              <span>Total</span>
              <span>{ars(total)}</span>
            </div>
          </div>

          {/* Cliente */}
          {clientes.length > 0 && (
            <select value={clienteId} onChange={e => setClienteId(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-white">
              <option value="">Cliente (opcional)</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          )}

          {/* Método de pago */}
          <div className="grid grid-cols-5 gap-1">
            {METODOS_PAGO.map(m => (
              <button key={m.value} onClick={() => setMetodoPago(m.value)}
                title={m.label}
                className={`py-2 rounded-lg text-[10px] font-semibold transition-all ${
                  metodoPago === m.value ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Efectivo entregado */}
          {metodoPago === 'efectivo' && (
            <div className="flex items-center gap-2">
              <Banknote size={14} className="text-slate-400 flex-shrink-0" />
              <input type="number" min="0" step="0.01"
                placeholder={`Entregado (${ars(total)})`}
                value={efectivoEntregado}
                onChange={e => setEfectivoEntregado(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          )}

          {/* Vuelto */}
          {metodoPago === 'efectivo' && vuelto !== null && vuelto > 0 && (
            <div className="flex justify-between items-center rounded-xl px-3 py-2 font-bold"
              style={{ backgroundColor: tema + '15', color: tema }}>
              <span className="text-sm">Vuelto</span>
              <span>{ars(vuelto)}</span>
            </div>
          )}

          {/* Toggle ARCA */}
          {arcaConfig?.tipoFactura && arcaConfig?.tieneCert && (
            <div className="rounded-lg border border-slate-200 px-3 py-2 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <FileText size={12} /> Factura {arcaConfig.tipoFactura} (ARCA)
              </span>
              <span className="text-slate-400">Disponible post-cobro</span>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Botón cobrar */}
          <Button
            onClick={confirmarVenta}
            cargando={vendiendo}
            disabled={carrito.length === 0}
            className="w-full h-12 text-base font-bold text-white rounded-xl disabled:opacity-40"
            style={{ backgroundColor: carrito.length > 0 ? tema : undefined }}
          >
            <CreditCard size={18} />
            {carrito.length > 0 ? `Cobrar ${ars(total)}` : 'Cobrar'}
          </Button>

          <div className="flex gap-2">
            <button className="flex-1 text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors">
              <Zap size={11} className="inline mr-1" />Venta rápida
            </button>
            <button onClick={() => setCarrito([])} className="flex-1 text-xs text-slate-400 hover:text-red-500 py-1 transition-colors">
              <Trash2 size={11} className="inline mr-1" />Limpiar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
