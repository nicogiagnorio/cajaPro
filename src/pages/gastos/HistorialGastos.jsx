import { useState, useEffect, useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'

function ars(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 2,
  }).format(n)
}

function formatFecha(iso) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(iso + 'T00:00:00'))
}

function mesActual() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

function rangoMes(ym) {
  const [y, m] = ym.split('-').map(Number)
  const desde  = `${y}-${String(m).padStart(2, '0')}-01`
  const ultimo = new Date(y, m, 0).getDate()
  const hasta  = `${y}-${String(m).padStart(2, '0')}-${ultimo}`
  return { desde, hasta }
}

// Últimos 13 meses para el selector
function mesesDisponibles() {
  const meses = []
  const hoy   = new Date()
  for (let i = 0; i < 13; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    meses.push({ ym, label })
  }
  return meses
}

export default function HistorialGastos() {
  const { perfil } = useAuth()

  const [gastos,     setGastos]     = useState([])
  const [categorias, setCategorias] = useState([])
  const [cargando,   setCargando]   = useState(true)
  const [mes,        setMes]        = useState(mesActual())
  const [filtroCateg,setFiltroCateg]= useState('')
  const [eliminando, setEliminando] = useState(null)

  const meses = useMemo(() => mesesDisponibles(), [])

  useEffect(() => { cargar() }, [mes])

  useEffect(() => {
    supabase
      .from('categorias_gastos')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => setCategorias(data ?? []))
  }, [])

  async function cargar() {
    setCargando(true)
    const { desde, hasta } = rangoMes(mes)
    const { data } = await supabase
      .from('gastos')
      .select('id, descripcion, monto, fecha, comprobante, notas, categorias_gastos(id, nombre), usuarios(nombre)')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    setGastos(data ?? [])
    setCargando(false)
  }

  async function eliminarGasto(gasto) {
    if (!confirm(`¿Eliminar el gasto "${gasto.descripcion}"?`)) return
    setEliminando(gasto.id)
    await supabase.from('gastos').delete().eq('id', gasto.id)
    setGastos(prev => prev.filter(g => g.id !== gasto.id))
    setEliminando(null)
  }

  const gastosFiltrados = useMemo(() => {
    if (!filtroCateg) return gastos
    return gastos.filter(g => g.categorias_gastos?.id === filtroCateg)
  }, [gastos, filtroCateg])

  const totalFiltrado = useMemo(
    () => gastosFiltrados.reduce((s, g) => s + Number(g.monto), 0),
    [gastosFiltrados]
  )

  return (
    <div className="space-y-4 pb-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={mes}
          onChange={e => setMes(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {meses.map(({ ym, label }) => (
            <option key={ym} value={ym}>{label}</option>
          ))}
        </select>

        <select
          value={filtroCateg}
          onChange={e => setFiltroCateg(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>

        <div className="ml-auto text-right">
          <p className="text-xs text-slate-400">{gastosFiltrados.length} registros</p>
          <p className="text-lg font-bold text-slate-800">{ars(totalFiltrado)}</p>
        </div>
      </div>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-blue-500" />
        </div>
      ) : gastosFiltrados.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-16">
          No hay gastos registrados en este período.
        </p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Fecha</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Descripción</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Categoría</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Comprobante</th>
                <th className="text-right px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Monto</th>
                {perfil?.rol === 'admin' && <th className="px-5 py-3.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gastosFiltrados.map(g => (
                <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                    {formatFecha(g.fecha)}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-800">{g.descripcion}</p>
                    {g.notas && <p className="text-xs text-slate-400 mt-0.5">{g.notas}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    {g.categorias_gastos?.nombre ? (
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        {g.categorias_gastos.nombre}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs font-mono">
                    {g.comprobante ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-slate-800">
                    {ars(g.monto)}
                  </td>
                  {perfil?.rol === 'admin' && (
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => eliminarGasto(g)}
                        disabled={eliminando === g.id}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Eliminar gasto"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={perfil?.rol === 'admin' ? 4 : 4} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Total del período
                </td>
                <td className="px-5 py-3 text-right font-bold text-slate-900">
                  {ars(totalFiltrado)}
                </td>
                {perfil?.rol === 'admin' && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
