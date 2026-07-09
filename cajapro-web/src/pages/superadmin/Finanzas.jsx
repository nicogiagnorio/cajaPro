import { useState, useEffect } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign,
  Building2, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'

function ars(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n ?? 0)
}

function mesLabel(yyyymm) {
  const [y, m] = yyyymm.split('-')
  return new Intl.DateTimeFormat('es-AR', { month: 'short', year: '2-digit' })
    .format(new Date(Number(y), Number(m) - 1, 1))
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

function KPI({ label, valor, sub, color = 'text-slate-900', icono: Icono, iconoBg }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-slate-500">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconoBg}`}>
          <Icono size={18} className="text-white" />
        </div>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{valor}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function Finanzas() {
  const [cobros,    setCobros]    = useState([])
  const [gastos,    setGastos]    = useState([])
  const [comercios, setComercio]  = useState([])
  const [cargando,  setCargando]  = useState(true)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const [{ data: c }, { data: g }, { data: com }] = await Promise.all([
      supabase.from('cajapro_cobros').select('monto, fecha, estado'),
      supabase.from('cajapro_gastos').select('monto, fecha'),
      supabase.from('comercios').select('id, activo').eq('activo', true),
    ])
    setCobros(c ?? [])
    setGastos(g ?? [])
    setComercio(com ?? [])
    setCargando(false)
  }

  const mesHoy = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const meses  = ultimos6Meses()

  const ingresosMes = cobros
    .filter((c) => c.fecha?.startsWith(mesHoy) && c.estado === 'pagado')
    .reduce((s, c) => s + Number(c.monto), 0)

  const gastosMes = gastos
    .filter((g) => g.fecha?.startsWith(mesHoy))
    .reduce((s, g) => s + Number(g.monto), 0)

  const pendientes = cobros.filter((c) => c.estado === 'pendiente')
  const pendientesMonto = pendientes.reduce((s, c) => s + Number(c.monto), 0)

  const datosMeses = meses.map((mes) => ({
    mes,
    ingresos: cobros
      .filter((c) => c.fecha?.startsWith(mes) && c.estado === 'pagado')
      .reduce((s, c) => s + Number(c.monto), 0),
    gastos: gastos
      .filter((g) => g.fecha?.startsWith(mes))
      .reduce((s, g) => s + Number(g.monto), 0),
  }))

  const maxVal = Math.max(...datosMeses.flatMap((d) => [d.ingresos, d.gastos]), 1)

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-violet-500" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Finanzas</h1>
      <p className="text-sm text-slate-500 mb-8">Resumen financiero de CajaPro</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <KPI
          label="Ingresos del mes"
          valor={ars(ingresosMes)}
          sub="cobros pagados"
          color="text-emerald-700"
          icono={TrendingUp}
          iconoBg="bg-emerald-500"
        />
        <KPI
          label="Gastos del mes"
          valor={ars(gastosMes)}
          sub="gastos propios"
          color="text-red-600"
          icono={TrendingDown}
          iconoBg="bg-red-400"
        />
        <KPI
          label="Resultado"
          valor={ars(ingresosMes - gastosMes)}
          sub="ingresos − gastos"
          color={(ingresosMes - gastosMes) >= 0 ? 'text-emerald-700' : 'text-red-600'}
          icono={DollarSign}
          iconoBg={(ingresosMes - gastosMes) >= 0 ? 'bg-violet-500' : 'bg-red-400'}
        />
        <KPI
          label="Comercios activos"
          valor={comercios.length}
          sub="en producción"
          color="text-slate-900"
          icono={Building2}
          iconoBg="bg-slate-700"
        />
      </div>

      {/* Gráfico barras */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-800">Últimos 6 meses</h2>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-violet-400" />
              Ingresos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-red-300" />
              Gastos
            </span>
          </div>
        </div>
        <div className="flex items-end gap-2 h-40">
          {datosMeses.map(({ mes, ingresos, gastos: g }) => {
            const altIng  = Math.round((ingresos / maxVal) * 140) || 2
            const altGast = Math.round((g / maxVal) * 140) || 2
            return (
              <div key={mes} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5 justify-center" style={{ height: 140 }}>
                  <div
                    title={`Ingresos: ${ars(ingresos)}`}
                    style={{ height: altIng }}
                    className="flex-1 rounded-t bg-violet-400 hover:bg-violet-500 transition-colors cursor-default"
                  />
                  <div
                    title={`Gastos: ${ars(g)}`}
                    style={{ height: altGast }}
                    className="flex-1 rounded-t bg-red-300 hover:bg-red-400 transition-colors cursor-default"
                  />
                </div>
                <span className="text-[10px] text-slate-400">{mesLabel(mes)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Cobros pendientes */}
      {pendientes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
            <p className="font-semibold text-slate-800">
              {pendientes.length} cobro{pendientes.length > 1 ? 's' : ''} pendiente{pendientes.length > 1 ? 's' : ''}
              <span className="ml-2 font-normal text-amber-700">{ars(pendientesMonto)}</span>
            </p>
          </div>
          <p className="text-sm text-slate-500">
            Entrá a <strong>Cobros</strong> para registrar los pagos.
          </p>
        </div>
      )}

      {pendientes.length === 0 && cobros.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
          <p className="text-sm font-medium text-emerald-800">Todos los cobros están al día.</p>
        </div>
      )}
    </div>
  )
}
