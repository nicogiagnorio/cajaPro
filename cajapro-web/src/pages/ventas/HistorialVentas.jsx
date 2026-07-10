import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
import {
  ChevronDown, ChevronRight, XCircle, RefreshCw,
  CalendarDays, BarChart3, Upload, Plus, Trash2, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { traducirError } from '../../lib/errores'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'

const METODOS = {
  efectivo:         'Efectivo',
  tarjeta_debito:   'Débito',
  tarjeta_credito:  'Crédito',
  transferencia:    'Transferencia',
  otro:             'Otro',
}

function ars(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 2,
  }).format(n ?? 0)
}

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function rangoDia(fechaStr) {
  const desde = new Date(`${fechaStr}T00:00:00`)
  const hasta = new Date(`${fechaStr}T23:59:59.999`)
  return { desde: desde.toISOString(), hasta: hasta.toISOString() }
}

// ── Componente de tabla de ventas ─────────────────────────────────────────────

function TablaVentas({ ventas, onCancelar, onActualizar }) {
  const [expandida,    setExpandida]    = useState(null)
  const [items,        setItems]        = useState({})
  const [cargandoItem, setCargandoItem] = useState(null)
  const [cancelando,   setCancelando]   = useState(null)

  async function toggleDetalle(venta) {
    if (expandida === venta.id) { setExpandida(null); return }
    setExpandida(venta.id)
    if (venta.tipo === 'rapida' || venta.tipo === 'importada' || items[venta.id]) return
    setCargandoItem(venta.id)
    const { data } = await supabase.from('ventas_items')
      .select('id, nombre_producto, cantidad, precio_unitario, subtotal')
      .eq('venta_id', venta.id).order('nombre_producto')
    setItems(p => ({ ...p, [venta.id]: data ?? [] }))
    setCargandoItem(null)
  }

  async function cancelar(venta) {
    if (!confirm(`¿Cancelar la venta #${venta.numero ?? venta.id.slice(0, 8)}?`)) return
    setCancelando(venta.id)
    const { error } = await supabase.from('ventas').update({ estado: 'cancelada' }).eq('id', venta.id)
    setCancelando(null)
    if (error) { alert(traducirError(error)); return }
    onActualizar(venta.id, { estado: 'cancelada' })
  }

  if (ventas.length === 0) {
    return <p className="text-center text-slate-400 text-sm py-10">Sin ventas para este día.</p>
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
      <table className="w-full text-sm min-w-[560px]">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="w-8 px-4 py-3" />
            <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">#</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Hora</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Pago</th>
            <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Total</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Estado</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ventas.map(venta => (
            <Fragment key={venta.id}>
              <tr
                className={`hover:bg-slate-50 transition-colors cursor-pointer ${venta.estado === 'cancelada' ? 'opacity-50' : ''}`}
                onClick={() => toggleDetalle(venta)}>
                <td className="px-4 py-3 text-slate-400">
                  {expandida === venta.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </td>
                <td className="px-4 py-3 font-mono text-slate-600 text-xs">
                  {venta.numero ? `#${venta.numero}` : `…${venta.id.slice(-5)}`}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                  {new Date(venta.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{METODOS[venta.metodo_pago] ?? venta.metodo_pago}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">{ars(venta.total)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    venta.estado === 'completada' ? 'bg-emerald-100 text-emerald-700'
                    : venta.estado === 'cancelada' ? 'bg-red-100 text-red-600'
                    : 'bg-amber-100 text-amber-700'
                  }`}>{venta.estado}</span>
                </td>
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                  {venta.estado === 'completada' && (
                    <button onClick={() => cancelar(venta)} disabled={cancelando === venta.id}
                      className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                      <XCircle size={15} />
                    </button>
                  )}
                </td>
              </tr>

              {expandida === venta.id && (
                <tr key={`d-${venta.id}`}>
                  <td colSpan={7} className="px-8 py-4 bg-slate-50 border-b border-slate-100">
                    {(venta.tipo === 'rapida' || venta.tipo === 'importada') ? (
                      <p className="text-xs text-slate-600">
                        <span className="text-slate-400 mr-2">Descripción:</span>{venta.notas ?? '—'}
                      </p>
                    ) : cargandoItem === venta.id ? (
                      <Spinner size="sm" className="text-blue-400" />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs min-w-[400px]">
                          <thead>
                            <tr className="text-slate-400">
                              <th className="text-left pb-2 font-semibold">Producto</th>
                              <th className="text-right pb-2 font-semibold">P. unit.</th>
                              <th className="text-right pb-2 font-semibold">Cant.</th>
                              <th className="text-right pb-2 font-semibold">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(items[venta.id] ?? []).map(it => (
                              <tr key={it.id}>
                                <td className="py-1.5 text-slate-700">{it.nombre_producto}</td>
                                <td className="py-1.5 text-right text-slate-500">{ars(it.precio_unitario)}</td>
                                <td className="py-1.5 text-right text-slate-500">{it.cantidad}</td>
                                <td className="py-1.5 text-right font-medium text-slate-700">{ars(it.subtotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Tab 1: Vista por día ──────────────────────────────────────────────────────

function TabDia() {
  const [fecha,    setFecha]    = useState(hoyISO())
  const [ventas,   setVentas]   = useState([])
  const [cargando, setCargando] = useState(false)

  const cargar = useCallback(async (f) => {
    setCargando(true)
    const { desde, hasta } = rangoDia(f)
    const { data } = await supabase.from('ventas')
      .select(`
        id, numero, fecha, total, subtotal, descuento,
        metodo_pago, estado, tipo, notas,
        usuarios(nombre)
      `)
      .gte('fecha', desde).lte('fecha', hasta)
      .order('fecha', { ascending: false })
    setVentas(data ?? [])
    setCargando(false)
  }, [])

  useEffect(() => { cargar(fecha) }, [fecha, cargar])

  function actualizarVenta(id, cambios) {
    setVentas(prev => prev.map(v => v.id === id ? { ...v, ...cambios } : v))
  }

  const completadas = ventas.filter(v => v.estado === 'completada')
  const totalDia    = completadas.reduce((s, v) => s + Number(v.total), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <CalendarDays size={15} className="text-slate-400" />
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="text-sm font-medium text-slate-700 focus:outline-none bg-transparent"
          />
        </div>
        <button onClick={() => cargar(fecha)}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-colors shadow-sm">
          <RefreshCw size={14} />
        </button>

        {!cargando && completadas.length > 0 && (
          <div className="flex gap-3 ml-0 sm:ml-auto">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 text-center">
              <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wide">Total del día</p>
              <p className="text-base font-bold text-blue-700">{ars(totalDia)}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-center">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Ventas</p>
              <p className="text-base font-bold text-slate-700">{completadas.length}</p>
            </div>
          </div>
        )}
      </div>

      {cargando ? (
        <div className="flex justify-center py-16"><Spinner size="lg" className="text-blue-500" /></div>
      ) : (
        <TablaVentas ventas={ventas} onActualizar={actualizarVenta} />
      )}
    </div>
  )
}

// ── Tab 2: Importar ventas anteriores ────────────────────────────────────────

const FORM_VACIO = {
  fecha:         hoyISO(),
  hora:          '12:00',
  total:         '',
  metodo_pago:   'efectivo',
  notas:         '',
}

function TabImportar() {
  const { perfil } = useAuth()
  const [form,       setForm]       = useState(FORM_VACIO)
  const [pendientes, setPendientes] = useState([])
  const [guardando,  setGuardando]  = useState(false)
  const [exito,      setExito]      = useState(0)
  const [error,      setError]      = useState('')

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function agregarAPendientes() {
    if (!form.total || isNaN(parseFloat(form.total)) || parseFloat(form.total) <= 0) {
      setError('Ingresá un monto válido.'); return
    }
    setError('')
    setPendientes(p => [...p, { ...form, _key: Date.now() }])
    setForm(p => ({ ...p, total: '', notas: '' }))
  }

  function quitar(key) {
    setPendientes(p => p.filter(x => x._key !== key))
  }

  async function importarTodo() {
    if (pendientes.length === 0) return
    setGuardando(true); setError('')
    const filas = pendientes.map(f => ({
      comercio_id: perfil.comercio_id,
      usuario_id:  perfil.id,
      subtotal:    parseFloat(f.total),
      descuento:   0,
      total:       parseFloat(f.total),
      metodo_pago: f.metodo_pago,
      estado:      'completada',
      tipo:        'rapida',
      notas:       f.notas || '[Importada]',
      fecha:       `${f.fecha}T${f.hora}:00`,
    }))
    const { error: err } = await supabase.from('ventas').insert(filas)
    if (err) { setError(err.message); setGuardando(false); return }
    setExito(pendientes.length)
    setPendientes([])
    setTimeout(() => setExito(0), 4000)
    setGuardando(false)
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {exito > 0 && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
          <CheckCircle2 size={16} />{exito} venta{exito !== 1 ? 's' : ''} importada{exito !== 1 ? 's' : ''} correctamente.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
          <Upload size={15} className="text-blue-500" />Agregar venta histórica
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label className="text-xs font-medium text-slate-500">Fecha *</label>
            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Hora</label>
            <input type="time" value={form.hora} onChange={e => set('hora', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Total *</label>
            <input type="number" step="0.01" min="0" value={form.total} onChange={e => set('total', e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Método de pago</label>
            <select value={form.metodo_pago} onChange={e => set('metodo_pago', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
              {Object.entries(METODOS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Descripción / notas</label>
          <input value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Producto o descripción de la venta"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle size={12} />{error}
          </p>
        )}
        <button onClick={agregarAPendientes}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          <Plus size={15} />Agregar a la lista
        </button>
      </div>

      {pendientes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">
              {pendientes.length} venta{pendientes.length !== 1 ? 's' : ''} listas para importar
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {pendientes.map(f => (
              <div key={f._key} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{ars(parseFloat(f.total))}</span>
                    <span className="text-xs text-slate-400">{f.fecha} {f.hora}</span>
                    <span className="text-xs text-slate-500">{METODOS[f.metodo_pago]}</span>
                    {f.notas && <span className="text-xs text-slate-400 truncate max-w-[200px]">{f.notas}</span>}
                  </div>
                </div>
                <button onClick={() => quitar(f._key)}
                  className="p-1.5 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
            <Button onClick={importarTodo} cargando={guardando} variante="exito">
              Importar {pendientes.length} venta{pendientes.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab 3: Gráficos por mes ───────────────────────────────────────────────────

function BarraMes({ label, total, maxTotal }) {
  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0
  return (
    <div className="group relative flex flex-col items-center justify-end flex-1" style={{ height: '160px' }}>
      {total > 0 && (
        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 text-center capitalize">
          {label}<br />{ars(total)}
        </div>
      )}
      <div className="w-full flex flex-col justify-end flex-1">
        <div className="w-full rounded-t bg-blue-500 group-hover:bg-blue-600 transition-colors"
          style={{ height: `${pct}%`, minHeight: total > 0 ? '3px' : '0' }} />
      </div>
    </div>
  )
}

function TabGraficos() {
  const { perfil } = useAuth()
  const [datos,    setDatos]    = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!perfil?.comercio_id) return
    async function cargar() {
      setCargando(true)
      const desde = new Date()
      desde.setMonth(desde.getMonth() - 11)
      desde.setDate(1)
      const { data } = await supabase.from('ventas')
        .select('fecha, total')
        .eq('comercio_id', perfil.comercio_id)
        .eq('estado', 'completada')
        .gte('fecha', desde.toISOString())
        .order('fecha', { ascending: true })
      setDatos(data ?? [])
      setCargando(false)
    }
    cargar()
  }, [perfil?.comercio_id])

  const mesesData = useMemo(() => {
    const map = {}
    for (const v of datos) {
      const d    = new Date(v.fecha)
      const ym   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const lbl  = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
      if (!map[ym]) map[ym] = { ym, label: lbl, total: 0 }
      map[ym].total += Number(v.total)
    }
    return Object.values(map).sort((a, b) => a.ym.localeCompare(b.ym))
  }, [datos])

  const maxTotal    = useMemo(() => Math.max(...mesesData.map(m => m.total), 1), [mesesData])
  const totalGlobal = useMemo(() => datos.reduce((s, v) => s + Number(v.total), 0), [datos])
  const promedioMes = mesesData.length > 0 ? totalGlobal / mesesData.length : 0

  if (cargando) return <div className="flex justify-center py-16"><Spinner size="lg" className="text-blue-500" /></div>
  if (mesesData.length === 0) return <p className="text-center text-slate-400 text-sm py-16">Sin datos de ventas para mostrar.</p>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 mb-1">Total período</p>
          <p className="text-xl font-bold text-blue-700">{ars(totalGlobal)}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 mb-1">Promedio mensual</p>
          <p className="text-xl font-bold text-slate-700">{ars(promedioMes)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Ventas por mes</h2>
        <div className="flex items-end gap-1.5" style={{ height: '160px' }}>
          {mesesData.map(m => (
            <BarraMes key={m.ym} label={m.label} total={m.total} maxTotal={maxTotal} />
          ))}
        </div>
        <div className="flex gap-1.5 mt-2">
          {mesesData.map(m => (
            <div key={m.ym} className="flex-1 text-center">
              <span className="text-[9px] text-slate-400 capitalize">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'dia',      label: 'Por día',  icono: CalendarDays },
  { id: 'importar', label: 'Importar', icono: Upload       },
  { id: 'graficos', label: 'Gráficos', icono: BarChart3    },
]

export default function HistorialVentas() {
  const [tab, setTab] = useState('dia')

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex gap-0.5 bg-slate-100 p-1 rounded-xl mb-4 flex-shrink-0 w-fit overflow-x-auto scrollbar-hide">
        {TABS.map(({ id, label, icono: Icono }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <Icono size={13} />{label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto pb-4">
        {tab === 'dia'      && <TabDia />}
        {tab === 'importar' && <TabImportar />}
        {tab === 'graficos' && <TabGraficos />}
      </div>
    </div>
  )
}
