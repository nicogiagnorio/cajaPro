import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, ShoppingBag, Zap, Package, CheckCircle2, Clock,
  FileText, CreditCard, AlertTriangle, X, ChevronDown,
  Calendar, ExternalLink,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { traducirError } from '../../lib/errores'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'

const METODOS = {
  efectivo:         'Efectivo',
  transferencia:    'Transferencia',
  cheque:           'Cheque',
  cuenta_corriente: 'Cta. cte.',
  otro:             'Otro',
}

function ars(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 2,
  }).format(n ?? 0)
}

function formatFecha(iso) {
  if (!iso) return '-'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(iso + 'T12:00:00'))
}

function mesActual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function mesesDisponibles() {
  const result = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    result.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return result
}

const MESES = mesesDisponibles()

function BadgeRecepcion({ estado, size = 'sm' }) {
  const cls = size === 'lg'
    ? 'px-2.5 py-1 text-xs gap-1.5'
    : 'px-2 py-0.5 text-xs gap-1'

  if (estado === 'recibida') {
    return (
      <span className={`inline-flex items-center rounded-full font-semibold bg-emerald-100 text-emerald-700 ${cls}`}>
        <CheckCircle2 size={10} /> Recibida
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center rounded-full font-semibold bg-amber-100 text-amber-700 ${cls}`}>
      <Clock size={10} /> Pendiente
    </span>
  )
}

function BadgeFactura({ estado, numero }) {
  if (estado === 'con_factura') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
        <FileText size={10} />
        {numero ? `Fac. ${numero}` : 'Con factura'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
      <FileText size={10} /> Sin factura
    </span>
  )
}

function BadgePago({ estado }) {
  if (estado === 'pagada') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
        <CreditCard size={10} /> Pagada
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
      <CreditCard size={10} /> Pendiente
    </span>
  )
}

function BadgeTipo({ tipo }) {
  if (tipo === 'detallada') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
        <Package size={9} /> Detallada
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
      <Zap size={9} /> Rápida
    </span>
  )
}

function ModalDetalle({ compra, items, cargandoItems, procesando, error, onClose, onMarcarRecibida, onMarcarPagada, onRegistrarFactura }) {
  const [mostrarFactura, setMostrarFactura] = useState(false)
  const [nroFactura, setNroFactura] = useState('')

  function handleRegistrarFactura() {
    if (!nroFactura.trim()) return
    onRegistrarFactura(nroFactura.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-base">
                  {compra.numero ? `Compra #${compra.numero}` : 'Compra'}
                </h2>
                <BadgeTipo tipo={compra.tipo} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatFecha(compra.created_at?.slice(0, 10))}
                {compra.proveedores?.nombre && ` · ${compra.proveedores.nombre}`}
                {METODOS[compra.metodo_pago] && ` · ${METODOS[compra.metodo_pago]}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-5">

          <div className="bg-slate-50 rounded-xl px-5 py-4 flex items-center justify-between">
            <span className="text-slate-500 text-sm">Total</span>
            <span className="text-2xl font-bold text-slate-900">{ars(compra.total)}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <BadgeRecepcion estado={compra.estado_recepcion} size="lg" />
            <BadgeFactura estado={compra.estado_factura} numero={compra.numero_factura} />
            <BadgePago estado={compra.estado_pago} />
          </div>

          {compra.tipo === 'detallada' && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Productos
              </p>
              {cargandoItems ? (
                <div className="flex justify-center py-6">
                  <Spinner size="md" className="text-blue-500" />
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Sin items registrados</p>
              ) : (
                <div className="bg-slate-50 rounded-xl overflow-x-auto">
                  <table className="w-full text-sm min-w-[400px]">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Producto</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Cant.</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">P.Unit.</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id ?? idx} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-2.5 text-slate-700 leading-snug">
                            {item.nombre_producto ?? item.productos?.nombre ?? '-'}
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-600">
                            {item.cantidad}
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-600">
                            {ars(item.precio_unitario)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-800">
                            {ars(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {compra.notas && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Notas</p>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3">{compra.notas}</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-800 leading-snug">{error}</p>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Acciones</p>

            {compra.tipo === 'detallada' && compra.estado_recepcion === 'pendiente' && (
              <button
                onClick={onMarcarRecibida}
                disabled={procesando}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-sm transition-colors disabled:opacity-50 border border-emerald-200"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  Marcar mercaderia como recibida
                </span>
                {procesando ? <Spinner size="sm" className="text-emerald-600" /> : <ChevronDown size={14} className="-rotate-90" />}
              </button>
            )}

            {compra.estado_factura === 'sin_factura' && (
              <div>
                {!mostrarFactura ? (
                  <button
                    onClick={() => setMostrarFactura(true)}
                    disabled={procesando}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 font-medium text-sm transition-colors disabled:opacity-50 border border-violet-200"
                  >
                    <span className="flex items-center gap-2">
                      <FileText size={15} />
                      Registrar número de factura
                    </span>
                    <ChevronDown size={14} className="-rotate-90" />
                  </button>
                ) : (
                  <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 space-y-3">
                    <p className="text-sm font-medium text-violet-800">Número de factura</p>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Ej: 0001-00012345"
                      value={nroFactura}
                      onChange={e => setNroFactura(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRegistrarFactura()}
                      className="w-full text-sm border border-violet-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200 bg-white"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleRegistrarFactura}
                        disabled={procesando || !nroFactura.trim()}
                        className="flex-1 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
                      >
                        {procesando ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => { setMostrarFactura(false); setNroFactura('') }}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {compra.estado_pago === 'pendiente' && (
              <button
                onClick={onMarcarPagada}
                disabled={procesando}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-sm transition-colors disabled:opacity-50 border border-blue-200"
              >
                <span className="flex items-center gap-2">
                  <CreditCard size={15} />
                  Registrar pago
                </span>
                {procesando ? <Spinner size="sm" className="text-blue-600" /> : <ChevronDown size={14} className="-rotate-90" />}
              </button>
            )}

            {compra.estado_recepcion === 'recibida' && compra.estado_pago === 'pagada' && compra.estado_factura === 'con_factura' && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm">
                <CheckCircle2 size={15} />
                <span className="font-medium">Compra completamente gestionada</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HistorialCompras() {
  const { perfil } = useAuth()
  const navigate = useNavigate()

  const [compras, setCompras] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')

  const [filtroMes, setFiltroMes] = useState(mesActual())
  const [filtroRecepcion, setFiltroRecepcion] = useState('todos')
  const [filtroPago, setFiltroPago] = useState('todos')

  const [compraDetalle, setCompraDetalle] = useState(null)
  const [items, setItems] = useState([])
  const [cargandoItems, setCargandoItems] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')

  const cargar = useCallback(async () => {
    if (!perfil?.comercio_id) return
    setCargando(true)
    setErrorCarga('')

    const [year, month] = filtroMes.split('-').map(Number)
    const inicio = `${year}-${String(month).padStart(2, '0')}-01`
    const siguiente = new Date(year, month, 1)
    const fin = `${siguiente.getFullYear()}-${String(siguiente.getMonth() + 1).padStart(2, '0')}-01`

    const { data, error } = await supabase
      .from('compras')
      .select([
        'id', 'created_at', 'tipo', 'total', 'metodo_pago', 'notas', 'numero',
        'estado_recepcion', 'estado_factura', 'numero_factura',
        'estado_pago', 'fecha_pago', 'fecha_recepcion',
        'proveedor_id', 'proveedores(nombre)',
      ].join(', '))
      .eq('comercio_id', perfil.comercio_id)
      .gte('created_at', inicio)
      .lt('created_at', fin)
      .order('created_at', { ascending: false })

    if (error) {
      setErrorCarga(traducirError(error))
    } else {
      setCompras(data ?? [])
    }
    setCargando(false)
  }, [perfil?.comercio_id, filtroMes])

  useEffect(() => { cargar() }, [cargar])

  const kpis = useMemo(() => ({
    total:          compras.reduce((s, c) => s + (c.total || 0), 0),
    cantidad:       compras.length,
    pendientesPago: compras.filter(c => c.estado_pago === 'pendiente').length,
  }), [compras])

  const comprasFiltradas = useMemo(() => compras.filter(c => {
    if (filtroRecepcion !== 'todos' && c.estado_recepcion !== filtroRecepcion) return false
    if (filtroPago !== 'todos' && c.estado_pago !== filtroPago) return false
    return true
  }), [compras, filtroRecepcion, filtroPago])

  async function abrirDetalle(compra) {
    setCompraDetalle(compra)
    setErrorAccion('')
    setItems([])
    if (compra.tipo === 'detallada') {
      setCargandoItems(true)
      const { data } = await supabase
        .from('compras_items')
        .select('*')
        .eq('compra_id', compra.id)
        .order('id')
      setItems(data ?? [])
      setCargandoItems(false)
    }
  }

  function cerrarDetalle() {
    setCompraDetalle(null)
    setItems([])
    setErrorAccion('')
    setProcesando(false)
  }

  function actualizarCompra(cambios) {
    const updated = { ...compraDetalle, ...cambios }
    setCompraDetalle(updated)
    setCompras(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  async function handleMarcarRecibida() {
    if (!compraDetalle) return
    setProcesando(true)
    setErrorAccion('')
    try {
      if (compraDetalle.tipo === 'detallada' && items.length > 0) {
        for (const item of items) {
          const { data: prod, error: eRead } = await supabase
            .from('productos')
            .select('stock_actual')
            .eq('id', item.producto_id)
            .single()
          if (eRead) throw eRead
          if (prod !== null) {
            const { error: eUp } = await supabase
              .from('productos')
              .update({ stock_actual: (prod.stock_actual ?? 0) + item.cantidad })
              .eq('id', item.producto_id)
            if (eUp) throw eUp
          }
        }
      }
      const fechaHoy = new Date().toISOString().slice(0, 10)
      const { error } = await supabase
        .from('compras')
        .update({ estado_recepcion: 'recibida', fecha_recepcion: fechaHoy })
        .eq('id', compraDetalle.id)
      if (error) throw error
      actualizarCompra({ estado_recepcion: 'recibida', fecha_recepcion: fechaHoy })
    } catch (err) {
      setErrorAccion(traducirError(err))
    } finally {
      setProcesando(false)
    }
  }

  async function handleMarcarPagada() {
    if (!compraDetalle) return
    setProcesando(true)
    setErrorAccion('')
    const fechaHoy = new Date().toISOString().slice(0, 10)
    const { error } = await supabase
      .from('compras')
      .update({ estado_pago: 'pagada', fecha_pago: fechaHoy })
      .eq('id', compraDetalle.id)
    if (error) {
      setErrorAccion(traducirError(error))
    } else {
      actualizarCompra({ estado_pago: 'pagada', fecha_pago: fechaHoy })
    }
    setProcesando(false)
  }

  async function handleRegistrarFactura(nroFactura) {
    if (!compraDetalle) return
    setProcesando(true)
    setErrorAccion('')
    const { error } = await supabase
      .from('compras')
      .update({ estado_factura: 'con_factura', numero_factura: nroFactura })
      .eq('id', compraDetalle.id)
    if (error) {
      setErrorAccion(traducirError(error))
    } else {
      actualizarCompra({ estado_factura: 'con_factura', numero_factura: nroFactura })
    }
    setProcesando(false)
  }

  return (
    <div className="h-full flex flex-col gap-5 overflow-hidden">

      <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-4">
        <div className="flex gap-3 flex-1 overflow-x-auto scrollbar-hide">
          <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex-1 min-w-[140px]">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">
              Total del mes
            </p>
            <p className="text-2xl font-bold text-slate-900 truncate">{ars(kpis.total)}</p>
            <p className="text-xs text-slate-400 mt-1">
              {MESES.find(m => m.value === filtroMes)?.label}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 min-w-[120px]">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Compras</p>
            <p className="text-2xl font-bold text-slate-900">{kpis.cantidad}</p>
            <p className="text-xs text-slate-400 mt-1">en el mes</p>
          </div>
          <div className={`rounded-2xl border px-5 py-4 min-w-[130px] ${
            kpis.pendientesPago > 0
              ? 'bg-amber-50 border-amber-200'
              : 'bg-white border-slate-200'
          }`}>
            <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
              kpis.pendientesPago > 0 ? 'text-amber-600' : 'text-slate-400'
            }`}>
              Pago pendiente
            </p>
            <p className={`text-2xl font-bold ${
              kpis.pendientesPago > 0 ? 'text-amber-700' : 'text-slate-900'
            }`}>
              {kpis.pendientesPago}
            </p>
            <p className={`text-xs mt-1 ${
              kpis.pendientesPago > 0 ? 'text-amber-500' : 'text-slate-400'
            }`}>
              {kpis.pendientesPago === 1 ? 'compra' : 'compras'}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/app/compras/rapida')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
          >
            <Zap size={15} className="text-amber-500" />
            Rápida
          </button>
          <button
            onClick={() => navigate('/app/compras/nueva')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            <Plus size={15} />
            Nueva
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 overflow-x-auto scrollbar-hide">
        <div className="relative flex-shrink-0">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={filtroMes}
            onChange={e => setFiltroMes(e.target.value)}
            className="pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white text-slate-700 appearance-none cursor-pointer"
          >
            {MESES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <select
          value={filtroRecepcion}
          onChange={e => setFiltroRecepcion(e.target.value)}
          className="flex-shrink-0 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white text-slate-700 cursor-pointer"
        >
          <option value="todos">Recepción: todas</option>
          <option value="pendiente">Pendiente de recibir</option>
          <option value="recibida">Recibidas</option>
        </select>

        <select
          value={filtroPago}
          onChange={e => setFiltroPago(e.target.value)}
          className="flex-shrink-0 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white text-slate-700 cursor-pointer"
        >
          <option value="todos">Pago: todos</option>
          <option value="pendiente">Pago pendiente</option>
          <option value="pagada">Pagadas</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {errorCarga ? (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error al cargar compras</p>
              <p className="text-xs text-red-600 mt-0.5">{errorCarga}</p>
            </div>
          </div>
        ) : cargando ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-blue-500" />
          </div>
        ) : comprasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <ShoppingBag size={24} className="text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium mb-1">No hay compras</p>
            <p className="text-sm text-slate-400">
              {compras.length > 0
                ? 'Probá con otros filtros'
                : 'Registrá tu primera compra del mes'
              }
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Proveedor / Descripción</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Recepción</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Factura</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pago</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {comprasFiltradas.map((c, idx) => (
                  <tr
                    key={c.id}
                    className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer ${
                      idx % 2 === 0 ? '' : 'bg-slate-50/30'
                    }`}
                    onClick={() => abrirDetalle(c)}
                  >
                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                      {formatFecha(c.created_at?.slice(0, 10))}
                    </td>
                    <td className="px-3 py-3">
                      <BadgeTipo tipo={c.tipo} />
                    </td>
                    <td className="px-3 py-3 max-w-[200px]">
                      <p className="text-slate-800 truncate">
                        {c.proveedores?.nombre ?? (c.notas ? c.notas.slice(0, 40) : '-')}
                      </p>
                      {c.proveedores?.nombre && c.notas && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">{c.notas.slice(0, 40)}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {ars(c.total)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <BadgeRecepcion estado={c.estado_recepcion} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <BadgeFactura estado={c.estado_factura} numero={c.numero_factura} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <BadgePago estado={c.estado_pago} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <ExternalLink size={14} className="text-slate-300 hover:text-slate-500 transition-colors ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {compraDetalle && (
        <ModalDetalle
          compra={compraDetalle}
          items={items}
          cargandoItems={cargandoItems}
          procesando={procesando}
          error={errorAccion}
          onClose={cerrarDetalle}
          onMarcarRecibida={handleMarcarRecibida}
          onMarcarPagada={handleMarcarPagada}
          onRegistrarFactura={handleRegistrarFactura}
        />
      )}
    </div>
  )
}
