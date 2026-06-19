import { useState, useEffect, useMemo, useRef } from 'react'
import {
  TrendingUp, TrendingDown, ShoppingCart, CreditCard, Wallet, Minus,
  ShoppingBag, CalendarDays, ChevronDown, Check, FileCheck, FileX,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { traducirError } from '../../lib/errores'
import Spinner from '../../components/ui/Spinner'

// ── Helpers ───────────────────────────────────────────────────

function ars(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n ?? 0)
}

function pct(actual, anterior) {
  if (!anterior || anterior === 0) return null
  return ((actual - anterior) / anterior) * 100
}

function mesActual() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

function mesesDisponibles(cantidad = 24) {
  const meses = []
  const hoy = new Date()
  for (let i = 0; i < cantidad; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    meses.push({ ym, label })
  }
  return meses
}

function rangoMes(ym) {
  const [y, m] = ym.split('-').map(Number)
  return {
    desde:      new Date(y, m - 1, 1).toISOString(),
    hasta:      new Date(y, m, 0, 23, 59, 59, 999).toISOString(),
    desdeDate:  `${y}-${String(m).padStart(2, '0')}-01`,
    hastaDate:  `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}`,
    diasEnMes:  new Date(y, m, 0).getDate(),
  }
}

function mesAnterior(ym) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function ymDeTimestamp(fechaStr) {
  const d = new Date(fechaStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const METODOS = {
  efectivo: 'Efectivo', tarjeta_debito: 'Debito',
  tarjeta_credito: 'Credito', transferencia: 'Transf.', otro: 'Otro',
}
const COLOR_DONUT = {
  efectivo: '#10b981', tarjeta_debito: '#3b82f6',
  tarjeta_credito: '#8b5cf6', transferencia: '#06b6d4', otro: '#94a3b8',
}

// ── Componentes visuales ──────────────────────────────────────

function Delta({ actual, anterior }) {
  const diff = pct(actual, anterior)
  if (diff === null) return null
  const positivo = diff >= 0
  const Icono = diff === 0 ? Minus : positivo ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
      diff === 0 ? 'text-slate-400' : positivo ? 'text-emerald-600' : 'text-red-500'
    }`}>
      <Icono size={12} />{Math.abs(diff).toFixed(0)}%
    </span>
  )
}

function Card({ label, valor, sub, color, bg, icono: Icono, actual, anterior, mostrarDelta = true }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>
          <Icono size={18} className={color} />
        </div>
        {mostrarDelta && <Delta actual={actual} anterior={anterior} />}
      </div>
      <p className="text-xs text-slate-500 font-medium mb-0.5">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{valor}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  )
}

function Seccion({ titulo, subtitulo, children, derecha }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-baseline justify-between gap-2 mb-5">
        <div className="flex items-baseline gap-2">
          <h2 className="font-semibold text-slate-800">{titulo}</h2>
          {subtitulo && <span className="text-xs text-slate-400">{subtitulo}</span>}
        </div>
        {derecha}
      </div>
      {children}
    </div>
  )
}

function Donut({ porciones, total }) {
  if (!porciones.length) return null
  let acum = 0
  const segmentos = porciones.map(p => {
    const desde = acum; const hasta = acum + p.pct; acum = hasta
    return `${p.color} ${desde.toFixed(2)}% ${hasta.toFixed(2)}%`
  })
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative flex-shrink-0 w-32 h-32">
        <div className="w-32 h-32 rounded-full" style={{ background: `conic-gradient(${segmentos.join(', ')})` }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-slate-400 leading-none">total</span>
            <span className="text-xs font-bold text-slate-800 leading-tight">{ars(total)}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-2.5 w-full">
        {porciones.map(p => (
          <div key={p.metodo} className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-sm text-slate-600 flex-1">{METODOS[p.metodo] ?? p.metodo}</span>
            <span className="text-xs text-slate-400">{p.pct.toFixed(0)}%</span>
            <span className="text-sm font-semibold text-slate-800 w-24 text-right">{ars(p.total)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarraDia({ dias, ventasPorDia, maxDia, promedioMes }) {
  return (
    <div>
      <div className="flex items-end gap-[2px] h-44">
        {Array.from({ length: dias }, (_, i) => i + 1).map(dia => {
          const val = ventasPorDia[dia] ?? 0
          const alto = val > 0 ? Math.max((val / maxDia) * 100, 3) : 0
          const esHoy = dia === new Date().getDate() && maxDia > 0
          return (
            <div key={dia} className="flex-1 flex flex-col items-center justify-end group relative">
              {val > 0 && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                  Dia {dia}<br />{ars(val)}
                </div>
              )}
              <div className={`w-full rounded-t transition-colors ${
                val > 0 ? esHoy ? 'bg-blue-400 group-hover:bg-blue-500' : 'bg-blue-500 group-hover:bg-blue-600' : 'bg-slate-100'
              }`} style={{ height: `${alto}%` }} />
            </div>
          )
        })}
      </div>
      {promedioMes > 0 && (
        <div className="relative h-0 -mt-px pointer-events-none">
          <div className="absolute left-0 right-0 border-t border-dashed border-orange-400 opacity-60"
            style={{ bottom: `${(promedioMes / maxDia) * 176}px` }} />
        </div>
      )}
      <div className="flex justify-between text-[10px] text-slate-400 mt-2 px-px">
        {Array.from({ length: dias }, (_, i) => i + 1).filter(d => d === 1 || d % 5 === 0).map(d => (
          <span key={d} style={{ flex: 'none' }}>{d}</span>
        ))}
      </div>
    </div>
  )
}

function BarraMes({ mesesData, ventasPorMes, colorClass = 'bg-blue-500 group-hover:bg-blue-600' }) {
  const max = Math.max(...mesesData.map(m => ventasPorMes[m.ym] ?? 0), 1)
  return (
    <div>
      <div className="flex items-end gap-1.5 h-44">
        {mesesData.map(({ ym, label }) => {
          const val = ventasPorMes[ym] ?? 0
          const alto = val > 0 ? Math.max((val / max) * 100, 3) : 0
          return (
            <div key={ym} className="flex-1 flex flex-col items-center justify-end group relative">
              {val > 0 && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 capitalize">
                  {label}<br />{ars(val)}
                </div>
              )}
              <div className={`w-full rounded-t transition-colors ${val > 0 ? colorClass : 'bg-slate-100'}`}
                style={{ height: `${alto}%` }} />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1.5 mt-2">
        {mesesData.map(({ ym, label }) => (
          <div key={ym} className="flex-1 text-[9px] text-slate-400 text-center truncate capitalize">
            {label.split(' ')[0].slice(0, 3)}
          </div>
        ))}
      </div>
    </div>
  )
}

function BarraHora({ ventasPorHora }) {
  const max = Math.max(...Object.values(ventasPorHora), 1)
  const horas = Array.from({ length: 24 }, (_, i) => i)
  return (
    <div>
      <div className="flex items-end gap-[2px] h-28">
        {horas.map(h => {
          const val = ventasPorHora[h] ?? 0
          const alto = val > 0 ? Math.max((val / max) * 100, 5) : 0
          return (
            <div key={h} className="flex-1 flex flex-col items-center justify-end group relative">
              {val > 0 && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                  {String(h).padStart(2, '0')}:00 -- {val} {val === 1 ? 'venta' : 'ventas'}
                </div>
              )}
              <div className={`w-full rounded-t transition-colors ${val > 0 ? 'bg-violet-500 group-hover:bg-violet-600' : 'bg-slate-100'}`}
                style={{ height: `${alto}%` }} />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-2">
        {[0, 6, 12, 18, 23].map(h => <span key={h}>{String(h).padStart(2, '0')}:00</span>)}
      </div>
    </div>
  )
}

// ── Dropdown filtro de meses ──────────────────────────────────

function FiltroMeses({ meses, selMeses, sinFiltro, onToggleMes, onSinFiltro }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const label = sinFiltro
    ? 'Todos los periodos'
    : selMeses.length === 1
      ? (meses.find(m => m.ym === selMeses[0])?.label ?? selMeses[0])
      : `${selMeses.length} meses`

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 pl-3 pr-2.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 transition-colors shadow-sm capitalize"
      >
        <CalendarDays size={15} className="text-slate-400 flex-shrink-0" />
        <span className="max-w-[160px] truncate">{label}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-30 overflow-hidden">
          <div
            onClick={() => { onSinFiltro(); setOpen(false) }}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-slate-100 ${
              sinFiltro ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
              sinFiltro ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
            }`}>
              {sinFiltro && <Check size={10} className="text-white" />}
            </div>
            <span className="text-sm font-semibold">Sin filtro (ver todo)</span>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {meses.map(({ ym, label: lbl }) => {
              const sel = selMeses.includes(ym)
              return (
                <div
                  key={ym}
                  onClick={() => onToggleMes(ym)}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors capitalize ${
                    sel ? 'bg-blue-50/60 text-blue-700' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    sel ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                  }`}>
                    {sel && <Check size={10} className="text-white" />}
                  </div>
                  <span className="text-sm">{lbl}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Seccion facturacion ARCA ──────────────────────────────────

function SeccionArca({ ventasBruto, totalBruto }) {
  const facturadas = useMemo(() => ventasBruto.filter(v => v.cae), [ventasBruto])
  const sinFactura  = useMemo(() => ventasBruto.filter(v => !v.cae), [ventasBruto])
  const totalFact   = useMemo(() => facturadas.reduce((s, v) => s + Number(v.total), 0), [facturadas])
  const totalSinFact= useMemo(() => sinFactura.reduce((s, v) => s + Number(v.total), 0), [sinFactura])
  const pctFact     = totalBruto > 0 ? (totalFact / totalBruto) * 100 : 0

  if (ventasBruto.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-baseline gap-2 mb-5">
        <h2 className="font-semibold text-slate-800">Facturacion ARCA</h2>
        <span className="text-xs text-slate-400">ventas con y sin CAE</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <div className="flex items-center gap-2 mb-2">
            <FileCheck size={16} className="text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">Con factura electronica</span>
          </div>
          <p className="text-xl font-bold text-emerald-700">{ars(totalFact)}</p>
          <p className="text-xs text-emerald-600 mt-0.5">{facturadas.length} {facturadas.length === 1 ? 'venta' : 'ventas'}</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <FileX size={16} className="text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">Sin factura electronica</span>
          </div>
          <p className="text-xl font-bold text-slate-700">{ars(totalSinFact)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{sinFactura.length} {sinFactura.length === 1 ? 'venta' : 'ventas'}</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Facturado</span>
          <span className="font-semibold text-slate-700">{pctFact.toFixed(0)}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${pctFact}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>{ars(totalFact)} facturado</span>
          <span>{ars(totalSinFact)} sin facturar</span>
        </div>
      </div>
    </div>
  )
}

// ── Pagina principal ──────────────────────────────────────────

export default function Reportes() {
  const meses = useMemo(() => mesesDisponibles(24), [])

  const [selMeses,  setSelMeses]  = useState([mesActual()])
  const [sinFiltro, setSinFiltro] = useState(false)
  const [vistaFactura, setVistaFactura] = useState('todas')

  const [ventasBruto,  setVentasBruto]  = useState([])
  const [ventasAnt,    setVentasAnt]    = useState([])
  const [compras,      setCompras]      = useState([])
  const [comprasAnt,   setComprasAnt]   = useState([])
  const [gastos,       setGastos]       = useState([])
  const [gastosAnt,    setGastosAnt]    = useState([])
  const [items,        setItems]        = useState([])
  const [cargando,     setCargando]     = useState(true)
  const [errorCarga,   setErrorCarga]   = useState('')

  const ventas = useMemo(() => {
    if (vistaFactura === 'facturadas')    return ventasBruto.filter(v => v.cae)
    if (vistaFactura === 'no_facturadas') return ventasBruto.filter(v => !v.cae)
    return ventasBruto
  }, [ventasBruto, vistaFactura])

  const selKey = sinFiltro ? '__todo__' : selMeses.slice().sort().join(',')

  useEffect(() => { cargar() }, [selKey]) // eslint-disable-line react-hooks/exhaustive-deps

  async function cargar() {
    if (!sinFiltro && selMeses.length === 0) return
    setCargando(true)
    setErrorCarga('')

    const soloUnMes = !sinFiltro && selMeses.length === 1

    let desde = null, hasta = null, desdeDate = null, hastaDate = null
    if (!sinFiltro) {
      const sorted = [...selMeses].sort()
      ;({ desde, hasta } = rangoMes(sorted[0]))
      const ultimo = rangoMes(sorted[sorted.length - 1])
      hasta = ultimo.hasta
      desdeDate = rangoMes(sorted[0]).desdeDate
      hastaDate = ultimo.hastaDate
    }

    let qV = supabase.from('ventas').select('id, total, tipo, metodo_pago, fecha, cae').eq('estado', 'completada')
    let qG = supabase.from('gastos').select('monto, fecha, categorias_gastos(nombre)')
    let qC = supabase.from('compras').select('id, total, fecha').eq('estado', 'completada')

    if (desde) { qV = qV.gte('fecha', desde).lte('fecha', hasta) }
    if (desdeDate) {
      qG = qG.gte('fecha', desdeDate).lte('fecha', hastaDate)
      qC = qC.gte('fecha', desdeDate).lte('fecha', hastaDate)
    }

    const promesas = [qV, qG, qC]

    if (soloUnMes) {
      const antYm = mesAnterior(selMeses[0])
      const { desde: dA, hasta: hA, desdeDate: ddA, hastaDate: hdA } = rangoMes(antYm)
      promesas.push(
        supabase.from('ventas').select('id, total').eq('estado', 'completada').gte('fecha', dA).lte('fecha', hA),
        supabase.from('gastos').select('monto').gte('fecha', ddA).lte('fecha', hdA),
        supabase.from('compras').select('total').eq('estado', 'completada').gte('fecha', ddA).lte('fecha', hdA),
      )
    }

    const resultados = await Promise.all(promesas)
    const primerError = resultados.find(r => r.error)?.error
    if (primerError) { setErrorCarga(traducirError(primerError)); setCargando(false); return }

    let ventasData  = resultados[0].data ?? []
    let gastosData  = resultados[1].data ?? []
    let comprasData = resultados[2].data ?? []

    if (!sinFiltro && selMeses.length > 1) {
      ventasData  = ventasData.filter(v => selMeses.includes(ymDeTimestamp(v.fecha)))
      gastosData  = gastosData.filter(g => g.fecha && selMeses.includes(g.fecha.slice(0, 7)))
      comprasData = comprasData.filter(c => c.fecha && selMeses.includes(c.fecha.slice(0, 7)))
    }

    setVentasBruto(ventasData)
    setGastos(gastosData)
    setCompras(comprasData)

    if (soloUnMes) {
      setVentasAnt(resultados[3].data ?? [])
      setGastosAnt(resultados[4].data ?? [])
      setComprasAnt(resultados[5].data ?? [])
    } else {
      setVentasAnt([]); setGastosAnt([]); setComprasAnt([])
    }

    const idsDetalladas = ventasData.filter(v => v.tipo === 'detallada').map(v => v.id)
    if (idsDetalladas.length > 0) {
      const { data: it } = await supabase.from('ventas_items')
        .select('nombre_producto, cantidad, subtotal').in('venta_id', idsDetalladas)
      setItems(it ?? [])
    } else {
      setItems([])
    }

    setCargando(false)
  }

  // ── Handlers del filtro ────────────────────────────────────

  function handleToggleMes(ym) {
    setSinFiltro(false)
    setSelMeses(prev => {
      const nuevo = prev.includes(ym) ? prev.filter(m => m !== ym) : [...prev, ym]
      if (nuevo.length === 0) { setSinFiltro(true); return prev }
      return nuevo
    })
  }

  function handleSinFiltro() {
    setSinFiltro(true)
    setSelMeses([])
  }

  // ── Metricas ───────────────────────────────────────────────

  const totalVentas     = useMemo(() => ventas.reduce((s, v) => s + Number(v.total), 0), [ventas])
  const totalBruto      = useMemo(() => ventasBruto.reduce((s, v) => s + Number(v.total), 0), [ventasBruto])
  const totalGastos     = useMemo(() => gastos.reduce((s, g) => s + Number(g.monto), 0), [gastos])
  const totalCompras    = useMemo(() => compras.reduce((s, c) => s + Number(c.total), 0), [compras])
  const totalVentasAnt  = useMemo(() => ventasAnt.reduce((s, v) => s + Number(v.total), 0), [ventasAnt])
  const totalGastosAnt  = useMemo(() => gastosAnt.reduce((s, g) => s + Number(g.monto), 0), [gastosAnt])
  const totalComprasAnt = useMemo(() => comprasAnt.reduce((s, c) => s + Number(c.total), 0), [comprasAnt])
  const ticketProm      = ventas.length > 0 ? totalVentas / ventas.length : 0
  const ticketPromAnt   = ventasAnt.length > 0 ? totalVentasAnt / ventasAnt.length : 0
  const resultado       = totalVentas - totalGastos
  const resultadoAnt    = totalVentasAnt - totalGastosAnt
  const mostrarDelta    = !sinFiltro && selMeses.length === 1

  // ── Graficos de ventas ─────────────────────────────────────

  const soloUnMes = !sinFiltro && selMeses.length === 1
  const { diasEnMes } = soloUnMes ? rangoMes(selMeses[0]) : { diasEnMes: 0 }

  const ventasPorDia = useMemo(() => {
    const m = {}
    for (const v of ventas) { const d = new Date(v.fecha).getDate(); m[d] = (m[d] ?? 0) + Number(v.total) }
    return m
  }, [ventas])

  const maxDia = Math.max(...Object.values(ventasPorDia), 1)
  const promedioMes = ventas.length > 0
    ? Object.values(ventasPorDia).reduce((a, b) => a + b, 0) / Object.keys(ventasPorDia).length : 0

  const ventasPorMes = useMemo(() => {
    const m = {}
    for (const v of ventas) { const ym = ymDeTimestamp(v.fecha); m[ym] = (m[ym] ?? 0) + Number(v.total) }
    return m
  }, [ventas])

  const comprasPorMes = useMemo(() => {
    const m = {}
    for (const c of compras) {
      const ym = c.fecha?.slice(0, 7)
      if (ym) m[ym] = (m[ym] ?? 0) + Number(c.total)
    }
    return m
  }, [compras])

  const mesesParaGrafico = useMemo(() => {
    if (soloUnMes) return []
    if (!sinFiltro && selMeses.length > 1) return meses.filter(m => selMeses.includes(m.ym)).reverse()
    const conDatos = new Set([...Object.keys(ventasPorMes), ...Object.keys(comprasPorMes)])
    return meses.filter(m => conDatos.has(m.ym)).reverse()
  }, [soloUnMes, sinFiltro, selMeses, meses, ventasPorMes, comprasPorMes])

  const ventasPorHora = useMemo(() => {
    const m = {}
    for (const v of ventas) { const h = new Date(v.fecha).getHours(); m[h] = (m[h] ?? 0) + 1 }
    return m
  }, [ventas])

  // ── Top productos ──────────────────────────────────────────

  const topProductos = useMemo(() => {
    const m = {}
    for (const it of items) {
      if (!m[it.nombre_producto]) m[it.nombre_producto] = { cantidad: 0, subtotal: 0 }
      m[it.nombre_producto].cantidad += Number(it.cantidad)
      m[it.nombre_producto].subtotal += Number(it.subtotal)
    }
    return Object.entries(m).map(([nombre, v]) => ({ nombre, ...v }))
      .sort((a, b) => b.subtotal - a.subtotal).slice(0, 10)
  }, [items])
  const maxProducto = Math.max(...topProductos.map(p => p.subtotal), 1)

  // ── Donut metodos de pago ──────────────────────────────────

  const porMetodo = useMemo(() => {
    const m = {}
    for (const v of ventas) m[v.metodo_pago] = (m[v.metodo_pago] ?? 0) + Number(v.total)
    return Object.entries(m)
      .map(([metodo, total]) => ({ metodo, total, color: COLOR_DONUT[metodo] ?? '#94a3b8', pct: totalVentas > 0 ? (total / totalVentas) * 100 : 0 }))
      .sort((a, b) => b.total - a.total)
  }, [ventas, totalVentas])

  // ── Gastos por categoria ───────────────────────────────────

  const porCategoria = useMemo(() => {
    const m = {}
    for (const g of gastos) {
      const nombre = g.categorias_gastos?.nombre ?? 'Sin categoria'
      m[nombre] = (m[nombre] ?? 0) + Number(g.monto)
    }
    return Object.entries(m).map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total)
  }, [gastos])
  const maxCategoria = Math.max(...porCategoria.map(c => c.total), 1)

  // ── Label periodo ──────────────────────────────────────────

  const labelPeriodo = useMemo(() => {
    if (sinFiltro) return 'Todos los periodos'
    if (selMeses.length === 1) return meses.find(m => m.ym === selMeses[0])?.label ?? selMeses[0]
    return `${selMeses.length} meses seleccionados`
  }, [sinFiltro, selMeses, meses])

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5 pb-10 overflow-y-auto h-full">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reportes</h1>
          <p className="text-xs text-slate-400 mt-0.5 capitalize">{labelPeriodo}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-xl text-sm gap-0.5">
            {[
              { value: 'todas',         label: 'Todas'      },
              { value: 'facturadas',    label: 'Con factura'},
              { value: 'no_facturadas', label: 'Sin factura'},
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setVistaFactura(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  vistaFactura === value ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <FiltroMeses
            meses={meses}
            selMeses={selMeses}
            sinFiltro={sinFiltro}
            onToggleMes={handleToggleMes}
            onSinFiltro={handleSinFiltro}
          />
        </div>
      </div>

      {errorCarga && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">
          <strong>Error al cargar:</strong> {errorCarga}
        </div>
      )}

      {cargando ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-blue-500" />
        </div>
      ) : !errorCarga && (
        <>
          {/* Cards resumen */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card label="Ventas" valor={ars(totalVentas)}
              sub={`${ventas.length} transacciones`} color="text-blue-600" bg="bg-blue-50" icono={ShoppingCart}
              actual={totalVentas} anterior={totalVentasAnt} mostrarDelta={mostrarDelta} />
            <Card label="Ticket promedio" valor={ars(ticketProm)}
              sub="por venta" color="text-violet-600" bg="bg-violet-50" icono={TrendingUp}
              actual={ticketProm} anterior={ticketPromAnt} mostrarDelta={mostrarDelta} />
            <Card label="Compras" valor={ars(totalCompras)}
              sub={`${compras.length} registros`} color="text-indigo-600" bg="bg-indigo-50" icono={ShoppingBag}
              actual={totalCompras} anterior={totalComprasAnt} mostrarDelta={mostrarDelta} />
            <Card label="Gastos" valor={ars(totalGastos)}
              sub={`${gastos.length} registros`} color="text-amber-600" bg="bg-amber-50" icono={Wallet}
              actual={totalGastos} anterior={totalGastosAnt} mostrarDelta={mostrarDelta} />
            <Card
              label={resultado >= 0 ? 'Resultado' : 'Deficit'}
              valor={ars(Math.abs(resultado))}
              sub={resultado >= 0 ? 'ingresos netos' : 'perdida del periodo'}
              color={resultado >= 0 ? 'text-emerald-600' : 'text-red-600'}
              bg={resultado >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
              icono={CreditCard}
              actual={resultado} anterior={resultadoAnt} mostrarDelta={mostrarDelta} />
          </div>

          {/* Ventas por dia / por mes */}
          {soloUnMes ? (
            <Seccion titulo="Ventas por dia" subtitulo={promedioMes > 0 ? `promedio ${ars(promedioMes)}/dia activo` : undefined}>
              {ventas.length === 0
                ? <p className="text-sm text-slate-400 text-center py-8">Sin ventas en este periodo.</p>
                : <BarraDia dias={diasEnMes} ventasPorDia={ventasPorDia} maxDia={maxDia} promedioMes={promedioMes} />
              }
            </Seccion>
          ) : mesesParaGrafico.length > 0 ? (
            <Seccion titulo="Ventas por mes">
              <BarraMes mesesData={mesesParaGrafico} ventasPorMes={ventasPorMes} />
            </Seccion>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Seccion titulo="Metodos de pago">
              {porMetodo.length === 0
                ? <p className="text-sm text-slate-400 text-center py-8">Sin ventas en este periodo.</p>
                : <Donut porciones={porMetodo} total={totalVentas} />
              }
            </Seccion>

            <Seccion titulo="Actividad por hora" subtitulo="cantidad de ventas">
              {ventas.length === 0
                ? <p className="text-sm text-slate-400 text-center py-8">Sin ventas en este periodo.</p>
                : <BarraHora ventasPorHora={ventasPorHora} />
              }
            </Seccion>
          </div>

          {ventasBruto.length > 0 && (
            <SeccionArca ventasBruto={ventasBruto} totalBruto={totalBruto} />
          )}

          <Seccion titulo="Top 10 productos" subtitulo="por monto vendido">
            {topProductos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400">Sin ventas detalladas en este periodo.</p>
                {ventas.filter(v => v.tipo === 'rapida').length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    {ventas.filter(v => v.tipo === 'rapida').length} venta(s) rapida(s) registrada(s) (sin items de producto).
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {topProductos.map((p, i) => {
                  const pctAncho = (p.subtotal / maxProducto) * 100
                  return (
                    <div key={p.nombre} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-300 w-5 text-right flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <span className="text-sm text-slate-700 truncate">{p.nombre}</span>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-xs text-slate-400">{p.cantidad} ud.</span>
                            <span className="text-sm font-semibold text-slate-900 w-24 text-right">{ars(p.subtotal)}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pctAncho}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Seccion>

          {!soloUnMes && mesesParaGrafico.length > 0 && compras.length > 0 && (
            <Seccion titulo="Compras por mes">
              <BarraMes
                mesesData={mesesParaGrafico}
                ventasPorMes={comprasPorMes}
                colorClass="bg-indigo-500 group-hover:bg-indigo-600"
              />
            </Seccion>
          )}

          <Seccion titulo="Gastos por categoria">
            {porCategoria.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Sin gastos en este periodo.</p>
            ) : (
              <div className="space-y-3.5">
                {porCategoria.map(({ nombre, total }) => {
                  const pctAncho = (total / maxCategoria) * 100
                  const pctTot = totalGastos > 0 ? (total / totalGastos) * 100 : 0
                  return (
                    <div key={nombre}>
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <span className="text-sm text-slate-700 flex-1">{nombre}</span>
                        <span className="text-xs text-slate-400">{pctTot.toFixed(0)}%</span>
                        <span className="text-sm font-semibold text-slate-900 w-24 text-right">{ars(total)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pctAncho}%` }} />
                      </div>
                    </div>
                  )
                })}
                <div className="pt-3 border-t border-slate-100 flex justify-between text-sm font-bold text-slate-900">
                  <span>Total gastos</span><span>{ars(totalGastos)}</span>
                </div>
              </div>
            )}
          </Seccion>
        </>
      )}
    </div>
  )
}
