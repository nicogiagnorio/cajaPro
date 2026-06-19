import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Plus, Minus, X, Search, ShoppingCart,
  CreditCard, CheckCircle2, Banknote, Printer,
  FileText, AlertCircle,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { traducirError } from '../../lib/errores'
import { imprimirTicket } from '../../lib/imprimirTicket'
import { arca } from '../../lib/arca'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'

const METODOS_PAGO = [
  { value: 'efectivo',          label: 'Efectivo'       },
  { value: 'tarjeta_debito',    label: 'Débito'         },
  { value: 'tarjeta_credito',   label: 'Crédito'        },
  { value: 'transferencia',     label: 'Transferencia'  },
  { value: 'otro',              label: 'Otro'           },
]

function ars(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 2,
  }).format(n)
}

export default function NuevaVenta() {
  const { perfil, comercio } = useAuth()

  const [productos,   setProductos]   = useState([])
  const [cargando,    setCargando]    = useState(true)
  const [busqueda,    setBusqueda]    = useState('')
  const [carrito,     setCarrito]     = useState([])
  const [descuento,   setDescuento]   = useState('')
  const [metodoPago,  setMetodoPago]  = useState('efectivo')
  const [efectivoEntregado, setEfectivoEntregado] = useState('')
  const [vendiendo,   setVendiendo]   = useState(false)
  const [confirmada,  setConfirmada]  = useState(null)
  const [error,       setError]       = useState('')
  const [clientes,    setClientes]    = useState([])
  const [clienteId,   setClienteId]   = useState('')

  // ── Estado ARCA ──────────────────────────────────────────────
  const [arcaConfig,     setArcaConfig]     = useState(null)
  const [emitirConArca,  setEmitirConArca]  = useState(false)   // toggle antes de cobrar
  const [docTipo,        setDocTipo]        = useState('99')    // 99=CF, 96=DNI, 80=CUIT
  const [docNro,         setDocNro]         = useState('')
  const [facturaEmitida, setFacturaEmitida] = useState(null)    // { cae, caeVencimiento, … }
  const [errorArca,      setErrorArca]      = useState('')

  const inputRef = useRef(null)

  useEffect(() => { cargarProductos() }, [])
  useEffect(() => {
    arca.cargarConfig().then(res => {
      if (res.ok && res.data) setArcaConfig(res.data)
    })
  }, [])
  useEffect(() => {
    supabase.from('clientes').select('id, nombre').eq('activo', true).order('nombre')
      .then(({ data }) => setClientes(data ?? []))
  }, [])

  async function cargarProductos() {
    setCargando(true)
    const { data } = await supabase
      .from('productos')
      .select('id, nombre, codigo_barras, precio_venta, stock_actual, unidad, alicuota_iva')
      .eq('activo', true)
      .order('nombre')
      .limit(500)
    setProductos(data ?? [])
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
    setCarrito(prev =>
      prev.map(i =>
        i.id === id
          ? { ...i, precio_unitario: precio, subtotal: precio * i.cantidad }
          : i
      )
    )
  }

  function cambiarCantidad(id, val) {
    const cant = parseFloat(val)
    if (isNaN(cant) || cant <= 0) {
      setCarrito(prev => prev.filter(i => i.id !== id))
      return
    }
    setCarrito(prev =>
      prev.map(i =>
        i.id === id
          ? { ...i, cantidad: cant, subtotal: cant * i.precio_unitario }
          : i
      )
    )
  }

  function quitarItem(id) {
    setCarrito(prev => prev.filter(i => i.id !== id))
  }

  const subtotal  = carrito.reduce((s, i) => s + i.subtotal, 0)
  const descNum   = parseFloat(descuento) || 0
  const total     = Math.max(0, subtotal - descNum)

  // Desglose de IVA por alícuota — solo relevante para facturas A/B
  const ivaDesglose = useMemo(() => {
    if (!emitirConArca || arcaConfig?.tipoFactura === 'C' || carrito.length === 0) return []
    // Si hay descuento, aplicarlo proporcionalmente
    const factor = subtotal > 0 ? total / subtotal : 1
    const grupos = {}
    for (const item of carrito) {
      const tasa = item.alicuota_iva ?? 21
      if (!grupos[tasa]) grupos[tasa] = 0
      grupos[tasa] += item.subtotal * factor
    }
    return Object.entries(grupos)
      .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
      .map(([tasa, monto]) => {
        const tasaNum  = parseFloat(tasa)
        const neto     = parseFloat((monto / (1 + tasaNum / 100)).toFixed(2))
        const ivaAmt   = parseFloat((monto - neto).toFixed(2))
        return { tasa: tasaNum, neto, iva: ivaAmt, monto: parseFloat(monto.toFixed(2)) }
      })
  }, [carrito, emitirConArca, arcaConfig, total, subtotal])

  const ivaTotalCalculado = ivaDesglose.reduce((s, g) => s + g.iva, 0)
  const vuelto    = metodoPago === 'efectivo'
    ? Math.max(0, (parseFloat(efectivoEntregado) || 0) - total)
    : null

  function onKeyBusqueda(e) {
    if (e.key !== 'Enter') return
    const q = busqueda.trim().toLowerCase()
    const exacto = productos.find(p => p.codigo_barras?.toLowerCase() === q)
    if (exacto) {
      agregarProducto(exacto)
      setBusqueda('')
    } else if (productosFiltrados.length === 1) {
      agregarProducto(productosFiltrados[0])
      setBusqueda('')
    }
  }

  async function confirmarVenta() {
    if (carrito.length === 0) return
    setVendiendo(true)
    setError('')
    setErrorArca('')

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

    const itemsRows = carrito.map(i => ({
      venta_id:        venta.id,
      producto_id:     i.id,
      nombre_producto: i.nombre,
      precio_unitario: i.precio_unitario,
      cantidad:        i.cantidad,
      subtotal:        i.subtotal,
      alicuota_iva:    i.alicuota_iva ?? 21,
    }))

    const { error: e2 } = await supabase.from('ventas_items').insert(itemsRows)
    if (e2) { setError(traducirError(e2)); setVendiendo(false); return }

    // ── Emitir CAE si el toggle está activo ──────────────────
    let facturaResultado = null
    if (emitirConArca && arcaConfig?.tipoFactura && arcaConfig?.tieneCert) {
      const res = await arca.solicitarCAE({
        ventaId:   venta.id,
        total,
        docTipo:   parseInt(docTipo),
        docNro:    docNro ? parseInt(docNro.replace(/\D/g, '')) : 0,
        ivaItems:  ivaDesglose,
      })
      if (res.ok) {
        facturaResultado = res
        await supabase.from('ventas').update({
          cae:             res.cae,
          cae_vencimiento: res.caeVencimiento,
          tipo_factura:    res.tipoFactura,
          nro_factura:     res.nroFactura,
          punto_venta:     res.puntoVenta,
        }).eq('id', venta.id)
      } else {
        setErrorArca(res.error)
      }
    }

    const clienteSeleccionado = clientes.find(c => c.id === clienteId)
    setConfirmada({
      ventaId:       venta.id,
      numero:        venta.numero,
      subtotal,
      descuento:     descNum,
      total,
      metodoPago,
      vuelto:        vuelto ?? 0,
      items:         [...carrito],
      clienteNombre: clienteSeleccionado?.nombre ?? null,
    })
    if (facturaResultado) setFacturaEmitida(facturaResultado)
    setCarrito([])
    setDescuento('')
    setEfectivoEntregado('')
    setMetodoPago('efectivo')
    setVendiendo(false)
  }

  function nuevaVenta() {
    setConfirmada(null)
    setBusqueda('')
    setClienteId('')
    setFacturaEmitida(null)
    setErrorArca('')
    setDocTipo('99')
    setDocNro('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // ── Pantalla de venta confirmada ──────────────────────────
  if (confirmada) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-sm w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">¡Venta registrada!</h2>
          {confirmada.numero && (
            <p className="text-slate-400 text-sm mb-3">Ticket #{confirmada.numero}</p>
          )}
          <p className="text-4xl font-bold text-slate-900 mb-1">{ars(confirmada.total)}</p>
          <p className="text-sm text-slate-400 mb-2">
            {METODOS_PAGO.find(m => m.value === confirmada.metodoPago)?.label}
          </p>
          {confirmada.metodoPago === 'efectivo' && confirmada.vuelto > 0 && (
            <div className="bg-emerald-50 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
              <span className="text-sm text-emerald-700 font-medium">Vuelto</span>
              <span className="text-lg font-bold text-emerald-700">{ars(confirmada.vuelto)}</span>
            </div>
          )}
          <div className="mb-6" />
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
              <Printer size={16} /> {facturaEmitida ? `Imprimir Factura ${facturaEmitida.tipoFactura}` : 'Imprimir ticket'}
            </Button>

            {/* Factura emitida con éxito */}
            {facturaEmitida && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-left space-y-1">
                <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Factura {facturaEmitida.tipoFactura} emitida
                </p>
                <p className="text-xs text-emerald-700">
                  PV {String(facturaEmitida.puntoVenta).padStart(5,'0')} — N° {String(facturaEmitida.nroFactura).padStart(8,'0')}
                </p>
                <p className="text-xs text-emerald-600 font-mono">CAE: {facturaEmitida.cae}</p>
                <p className="text-xs text-emerald-500">Vence: {facturaEmitida.caeVencimiento}</p>
              </div>
            )}

            {errorArca && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 flex items-start gap-2 text-xs text-red-600">
                <AlertCircle size={13} className="mt-0.5 flex-shrink-0" /> {errorArca}
              </div>
            )}

            <Button onClick={nuevaVenta} className="w-full" variante="exito">
              <ShoppingCart size={16} /> Nueva venta
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Pantalla POS ──────────────────────────────────────────
  return (
    <div className="h-full flex gap-5">
      {/* Panel izquierdo: búsqueda + grilla de productos */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="relative mb-4 flex-shrink-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            autoFocus
            placeholder="Buscar por nombre o escanear código de barras (Enter para agregar)..."
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
                    <span className="text-blue-600 font-bold">{ars(prod.precio_venta)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      prod.stock_actual <= 0
                        ? 'bg-red-100 text-red-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {prod.stock_actual <= 0 ? 'Sin stock' : `${prod.stock_actual} ${prod.unidad}`}
                    </span>
                  </div>
                </button>
              ))}
              {productosFiltrados.length === 0 && (
                <div className="col-span-3 text-center py-12 text-slate-400 text-sm">
                  {productos.length === 0
                    ? 'No hay productos activos en el inventario.'
                    : 'No se encontraron productos con ese criterio.'
                  }
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Panel derecho: carrito + cobro */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Header carrito */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
          <ShoppingCart size={17} className="text-slate-500" />
          <span className="font-semibold text-slate-800 text-sm">
            Carrito
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

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {carrito.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-10">
              Seleccioná productos del panel izquierdo
            </p>
          ) : (
            carrito.map(item => (
              <div key={item.id} className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-start gap-2 mb-2">
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
                {/* Precio editable */}
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs text-slate-400 flex-shrink-0">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.precio_unitario}
                    onChange={e => cambiarPrecio(item.id, e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-md px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-200 text-right"
                    title="Precio unitario (editable)"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}
                      className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
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
                      className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{ars(item.subtotal)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totales + pago */}
        <div className="px-5 py-4 border-t border-slate-100 space-y-3 flex-shrink-0">
          {/* Descuento */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 w-20 flex-shrink-0">Descuento $</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={descuento}
              onChange={e => setDescuento(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Resumen */}
          <div className="space-y-1 text-sm">
            {descNum > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{ars(subtotal)}</span>
              </div>
            )}
            {descNum > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Descuento</span>
                <span>− {ars(descNum)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-900 text-lg">
              <span>Total</span>
              <span>{ars(total)}</span>
            </div>
          </div>

          {/* Desglose IVA — solo para facturas A/B con ARCA activo */}
          {emitirConArca && arcaConfig?.tipoFactura !== 'C' && ivaDesglose.length > 0 && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 space-y-1">
              <p className="text-xs font-semibold text-blue-700 mb-1">Desglose IVA (precio final c/ IVA)</p>
              {ivaDesglose.map(g => (
                <div key={g.tasa} className="flex justify-between text-xs text-blue-700">
                  <span>IVA {g.tasa}% — Neto: {ars(g.neto)}</span>
                  <span className="font-medium">{ars(g.iva)}</span>
                </div>
              ))}
              {ivaDesglose.length > 1 && (
                <div className="flex justify-between text-xs font-semibold text-blue-800 border-t border-blue-200 pt-1 mt-1">
                  <span>Total IVA</span>
                  <span>{ars(ivaTotalCalculado)}</span>
                </div>
              )}
            </div>
          )}

          {/* Cliente (opcional) */}
          {clientes.length > 0 && (
            <select
              value={clienteId}
              onChange={e => setClienteId(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
            >
              <option value="">Cliente (opcional)</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          )}

          {/* Método de pago */}
          <div className="grid grid-cols-3 gap-1.5">
            {METODOS_PAGO.map(m => (
              <button
                key={m.value}
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

          {/* Efectivo entregado → solo si es efectivo */}
          {metodoPago === 'efectivo' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 w-20 flex-shrink-0">
                <Banknote size={13} className="inline mr-1" />
                Entregado
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={ars(total)}
                value={efectivoEntregado}
                onChange={e => setEfectivoEntregado(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          )}

          {/* Vuelto en tiempo real */}
          {metodoPago === 'efectivo' && vuelto !== null && vuelto > 0 && (
            <div className="flex justify-between items-center bg-emerald-50 rounded-lg px-3 py-2">
              <span className="text-xs font-medium text-emerald-700">Vuelto</span>
              <span className="font-bold text-emerald-700">{ars(vuelto)}</span>
            </div>
          )}

          {/* ── Toggle ARCA ── solo si hay config + certificado */}
          {arcaConfig?.tipoFactura && arcaConfig?.tieneCert && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setEmitirConArca(v => !v)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  emitirConArca
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <FileText size={13} />
                  Emitir Factura {arcaConfig.tipoFactura} (ARCA)
                </span>
                <span className={`w-8 h-4 rounded-full transition-colors relative ${emitirConArca ? 'bg-blue-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${emitirConArca ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </span>
              </button>

              {/* Datos del receptor — solo visible si toggle activo */}
              {emitirConArca && (
                <div className="space-y-2 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                  <select
                    value={docTipo}
                    onChange={e => setDocTipo(e.target.value)}
                    className="w-full text-xs border border-blue-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
                  >
                    <option value="99">Sin identificar (Consumidor Final)</option>
                    <option value="96">DNI</option>
                    <option value="80">CUIT</option>
                    <option value="86">CUIL</option>
                  </select>
                  {docTipo !== '99' && (
                    <input
                      type="text"
                      value={docNro}
                      onChange={e => setDocNro(e.target.value)}
                      placeholder={docTipo === '80' ? 'CUIT: 20-12345678-9' : 'Número de documento'}
                      className="w-full text-xs border border-blue-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <Button
            onClick={confirmarVenta}
            cargando={vendiendo}
            disabled={carrito.length === 0}
            variante="exito"
            className="w-full"
          >
            <CreditCard size={16} />
            {carrito.length > 0 ? `Cobrar ${ars(total)}` : 'Cobrar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
