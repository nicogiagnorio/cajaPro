import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Users, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'

// ─── Helpers ───────────────────────────────────────────────────
function ars(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0)
}

function mesLabel(yyyymm) {
  const [y, m] = yyyymm.split('-')
  return new Intl.DateTimeFormat('es-AR', { month: 'short', year: '2-digit' }).format(new Date(Number(y), Number(m) - 1, 1))
}

function ultimos6Meses() {
  const meses = []
  const hoy = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return meses
}

// ─── Gráfico de barras CSS ─────────────────────────────────────
function BarChart({ datos, maxVal }) {
  return (
    <div className="flex items-end gap-2 h-40">
      {datos.map(({ mes, ingresos, gastos }) => {
        const altIng  = maxVal > 0 ? Math.round((ingresos / maxVal) * 140) : 0
        const altGast = maxVal > 0 ? Math.round((gastos   / maxVal) * 140) : 0
        return (
          <div key={mes} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end gap-0.5 justify-center" style={{ height: 140 }}>
              <div
                title={`Ingresos: ${ars(ingresos)}`}
                style={{ height: altIng || 2 }}
                className="flex-1 rounded-t bg-violet-400 transition-all hover:bg-violet-500 cursor-default"
              />
              <div
                title={`Gastos: ${ars(gastos)}`}
                style={{ height: altGast || 2 }}
                className="flex-1 rounded-t bg-red-300 transition-all hover:bg-red-400 cursor-default"
              />
            </div>
            <span className="text-[10px] text-slate-400">{mesLabel(mes)}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Dashboard financiero ─────────────────────────────────────
export default function Finanzas() {
  const [cobros,    setCobros]    = useState([])
  const [gastos,    setGastos]    = useState([])
  const [comercios, setComercio]  = useState([])
  const [cargando,  setCargando]  = useState(true)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const [{ data: cob }, { data: gast }, { data: com }] = await Promise.all([
        supabase.from('cajapro_cobros').select('*').order('fecha'),
        supabase.from('cajapro_gastos').select('*').order('fecha'),
        supabase.from('comercios').select('id, nombre, activo').order('nombre'),
      ])
      setCobros(cob ?? [])
      setGastos(gast ?? [])
      setComercio(com ?? [])
      setCargando(false)
    }
    cargar()
  }, [])

  if (cargando) {
    return <div className="flex justify-center py-32"><Spinner size="lg" className="text-violet-500" /></div>
  }

  // ── Cálculos del mes actual ────────────────────────────────────
  const meActual = new Date().toISOString().slice(0, 7)

  const cobrosMes    = cobros.filter(c => c.fecha.startsWith(meActual) && c.estado === 'pagado')
  const gastosMes    = gastos.filter(g => g.fecha.startsWith(meActual))
  const totalCobrado = cobrosMes.reduce((s, c) => s + Number(c.monto), 0)
  const totalGastado = gastosMes.reduce((s, g) => s + Number(g.monto), 0)
  const gananciaNeta = totalCobrado - totalGastado
  const pendienteTotal = cobros.filter(c => c.estado === 'pendiente').reduce((s, c) => s + Number(c.monto), 0)

  // ── Comercios activos vs inactivos ─────────────────────────────
  const activosCant   = comercios.filter(c => c.activo).length
  const inactivosCant = comercios.filter(c => !c.activo).length

  // ── Últimos 6 meses para el gráfico ───────────────────────────
  const meses6 = ultimos6Meses()
  const datosMeses = meses6.map(mes => ({
    mes,
    ingresos: cobros.filter(c => c.fecha.startsWith(mes) && c.estado === 'pagado').reduce((s, c) => s + Number(c.monto), 0),
    gastos:   gastos.filter(g => g.fecha.startsWith(mes)).reduce((s, g) => s + Number(g.monto), 0),
  }))
  const maxVal = Math.max(...datosMeses.flatMap(d => [d.ingresos, d.gastos]), 1)

  // ── Pendientes por comercio ────────────────────────────────────
  const pendientesPorComercio = comercios
    .map(com => ({
      ...com,
      deuda: cobros
        .filter(c => c.comercio_id === com.id && c.estado === 'pendiente')
        .reduce((s, c) => s + Number(c.monto), 0),
    }))
    .filter(com => com.deuda > 0)
    .sort((a, b) => b.deuda - a.deuda)

  return (
    <div className="p-8 max-w-5xl mx-auto pb-12 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Finanzas CajaPro</h1>
        <p className="text-slate-500 text-sm mt-0.5">Dashboard de ingresos, gastos y rentabilidad del negocio.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Cobrado este mes', valor: ars(totalCobrado),
            color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100',
            Icono: DollarSign,
          },
          {
            label: 'Gastado este mes', valor: ars(totalGastado),
            color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100',
            Icono: TrendingDown,
          },
          {
            label: 'Ganancia neta', valor: ars(gananciaNeta),
            color: gananciaNeta >= 0 ? 'text-emerald-600' : 'text-red-600',
            bg: gananciaNeta >= 0 ? 'bg-emerald-50' : 'bg-red-50',
            border: gananciaNeta >= 0 ? 'border-emerald-100' : 'border-red-100',
            Icono: TrendingUp,
          },
          {
            label: 'Deuda pendiente', valor: ars(pendienteTotal),
            color: pendienteTotal > 0 ? 'text-orange-600' : 'text-slate-500',
            bg: pendienteTotal > 0 ? 'bg-orange-50' : 'bg-slate-50',
            border: pendienteTotal > 0 ? 'border-orange-100' : 'border-slate-100',
            Icono: AlertCircle,
          },
        ].map(({ label, valor, color, bg, border, Icono }) => (
          <div key={label} className={`${bg} border ${border} rounded-2xl p-5`}>
            <div className="flex items-center gap-2 mb-2">
              <Icono size={15} className={color} />
              <p className="text-xs text-slate-500">{label}</p>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{valor}</p>
          </div>
        ))}
      </div>

      {/* Comercios activos */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={22} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-900">{activosCant}</p>
            <p className="text-sm text-slate-500">Comercios activos</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users size={22} className="text-slate-400" />
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-900">{inactivosCant}</p>
            <p className="text-sm text-slate-500">Comercios inactivos</p>
          </div>
        </div>
      </div>

      {/* Gráfico últimos 6 meses */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-slate-800">Ingresos vs gastos — últimos 6 meses</h2>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-400 inline-block" />Ingresos</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-300 inline-block" />Gastos</span>
          </div>
        </div>
        <BarChart datos={datosMeses} maxVal={maxVal} />
        {/* Tabla resumen */}
        <div className="mt-6 grid grid-cols-6 gap-2 text-xs text-center">
          {datosMeses.map(({ mes, ingresos, gastos }) => {
            const neto = ingresos - gastos
            return (
              <div key={mes} className="space-y-1">
                <p className="font-semibold text-slate-600">{mesLabel(mes)}</p>
                <p className="text-violet-600">{ars(ingresos)}</p>
                <p className="text-red-500">{ars(gastos)}</p>
                <p className={`font-bold ${neto >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{ars(neto)}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Cobros pendientes por comercio */}
      {pendientesPorComercio.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-orange-50">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertCircle size={16} className="text-orange-500" />
              Deudas pendientes por comercio
            </h2>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {pendientesPorComercio.map(com => (
                <tr key={com.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-6 py-3 font-medium text-slate-800">{com.nombre}</td>
                  <td className="px-6 py-3 text-right font-bold text-orange-600">{ars(com.deuda)}</td>
                </tr>
              ))}
              <tr className="bg-orange-50 border-t border-orange-100">
                <td className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Total pendiente</td>
                <td className="px-6 py-3 text-right font-bold text-orange-700">{ars(pendienteTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
