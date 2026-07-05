import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Trash2, Pencil, Filter, ReceiptText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'

// ─── Helpers ───────────────────────────────────────────────────
const CATEGORIAS = {
  suscripciones:   { label: 'Suscripciones',   color: 'bg-blue-100 text-blue-700'    },
  infraestructura: { label: 'Infraestructura', color: 'bg-violet-100 text-violet-700'},
  marketing:       { label: 'Marketing',        color: 'bg-pink-100 text-pink-700'   },
  otros:           { label: 'Otros',            color: 'bg-slate-100 text-slate-600' },
}

const METODOS_PAGO = ['Tarjeta de crédito', 'Tarjeta de débito', 'Transferencia', 'Efectivo', 'PayPal', 'Otro']

function ars(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0)
}

function fmtFecha(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso + 'T00:00'))
}

function hoy() { return new Date().toISOString().slice(0, 10) }

// ─── Modal crear / editar gasto ───────────────────────────────
function ModalGasto({ gastoInicial, onGuardar, onCerrar }) {
  const esEdicion = Boolean(gastoInicial)

  const [form, setForm] = useState({
    descripcion: gastoInicial?.descripcion ?? '',
    monto:       gastoInicial?.monto       ?? '',
    categoria:   gastoInicial?.categoria   ?? 'suscripciones',
    fecha:       gastoInicial?.fecha       ?? hoy(),
    metodo_pago: gastoInicial?.metodo_pago ?? 'Tarjeta de crédito',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState('')
  const [exito, setExito]         = useState(false)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.descripcion.trim()) { setError('Ingresá una descripción.'); return }
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0) {
      setError('Ingresá un monto válido mayor a 0.'); return
    }
    setGuardando(true); setError('')

    const payload = {
      descripcion: form.descripcion.trim(),
      monto:       Number(form.monto),
      categoria:   form.categoria,
      fecha:       form.fecha,
      metodo_pago: form.metodo_pago || null,
    }

    const { error: err } = esEdicion
      ? await supabase.from('cajapro_gastos').update(payload).eq('id', gastoInicial.id)
      : await supabase.from('cajapro_gastos').insert(payload)

    setGuardando(false)
    if (err) { setError(traducirError(err)); return }

    setExito(true)
    setTimeout(() => onGuardar(), 900)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <p className="font-bold text-slate-900">{esEdicion ? 'Editar gasto' : 'Registrar gasto'}</p>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {exito ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ReceiptText size={22} className="text-emerald-600" />
            </div>
            <p className="font-semibold text-slate-800">
              {esEdicion ? 'Gasto actualizado correctamente' : 'Gasto registrado'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Descripción *</label>
              <input required value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                placeholder="Ej: Claude Pro, Supabase Pro, dominio cajapro.com..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Categoría *</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CATEGORIAS).map(([val, { label }]) => (
                  <button key={val} type="button" onClick={() => set('categoria', val)}
                    className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                      form.categoria === val ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Monto *</label>
                <input required type="number" min="0.01" step="0.01" value={form.monto} onChange={e => set('monto', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Fecha *</label>
                <input required type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Método de pago</label>
              <select value={form.metodo_pago} onChange={e => set('metodo_pago', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 bg-white">
                {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2">
              <Button type="button" variante="secundario" onClick={onCerrar} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" cargando={guardando} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white">
                {esEdicion ? 'Guardar cambios' : 'Guardar gasto'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Modal confirmación eliminar ───────────────────────────────
function ModalEliminar({ gasto, onConfirmar, onCerrar, eliminando }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <div>
            <p className="font-bold text-slate-900 mb-1">¿Confirmás la eliminación?</p>
            <p className="text-sm text-slate-600">
              <span className="font-medium">{gasto.descripcion}</span>
              {' — '}<span className="font-semibold text-red-600">{ars(gasto.monto)}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variante="secundario" onClick={onCerrar} className="flex-1">
            Cancelar
          </Button>
          <Button
            type="button"
            cargando={eliminando}
            onClick={onConfirmar}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            Sí, eliminar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────
export default function GastosPropios() {
  const [gastos,    setGastos]    = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [modal,     setModal]     = useState(null)  // null | 'nuevo' | gasto (edición)
  const [elimModal, setElimModal] = useState(null)  // null | gasto a eliminar
  const [eliminando,setEliminando]= useState(false)
  const [filtroCat, setFiltroCat] = useState('')
  const [filtroMes, setFiltroMes] = useState(() => new Date().toISOString().slice(0, 7))

  const cargar = useCallback(async () => {
    setCargando(true)
    const { data } = await supabase.from('cajapro_gastos').select('*').order('fecha', { ascending: false })
    setGastos(data ?? [])
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function eliminar() {
    if (!elimModal) return
    setEliminando(true)
    const { error } = await supabase.from('cajapro_gastos').delete().eq('id', elimModal.id)
    setEliminando(false)
    if (error) { alert(traducirError(error)); return }
    setElimModal(null)
    cargar()
  }

  // ── Filtros ───────────────────────────────────────────────────
  const gastosFiltrados = gastos.filter(g => {
    if (filtroCat && g.categoria !== filtroCat) return false
    if (filtroMes && !g.fecha.startsWith(filtroMes)) return false
    return true
  })
  const totalFiltrado = gastosFiltrados.reduce((s, g) => s + Number(g.monto), 0)

  // ── Totales por categoría del mes seleccionado ────────────────
  const gastosMes = gastos.filter(g => g.fecha.startsWith(filtroMes))
  const totalMes  = gastosMes.reduce((s, g) => s + Number(g.monto), 0)

  return (
    <div className="p-8 max-w-5xl mx-auto pb-12 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gastos operativos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gastos propios del negocio CajaPro.</p>
        </div>
        <Button onClick={() => setModal('nuevo')} className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2">
          <Plus size={16} /> Registrar gasto
        </Button>
      </div>

      {/* KPIs por categoría */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(CATEGORIAS).map(([cat, { label, color }]) => {
          const total = gastosMes.filter(g => g.categoria === cat).reduce((s, g) => s + Number(g.monto), 0)
          return (
            <div key={cat} className="bg-white rounded-xl border border-slate-200 p-3">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${color} mb-2`}>{label}</span>
              <p className="text-lg font-bold text-slate-800">{ars(total)}</p>
            </div>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-slate-400" />
        <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200">
          <option value="">Todas las categorías</option>
          {Object.entries(CATEGORIAS).map(([val, { label }]) => <option key={val} value={val}>{label}</option>)}
        </select>
        <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200" />
        <span className="ml-auto text-sm font-semibold text-slate-700">
          Total: <span className="text-violet-600">{ars(totalFiltrado)}</span>
        </span>
      </div>

      {/* Tabla */}
      {cargando ? (
        <div className="flex justify-center py-16"><Spinner size="lg" className="text-violet-500" /></div>
      ) : gastos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center">
          <ReceiptText size={40} className="text-slate-200 mx-auto mb-4" />
          <p className="text-slate-700 font-medium mb-1">Todavía no registraste ningún gasto</p>
          <p className="text-slate-400 text-sm mb-5">Hacé clic en "Registrar gasto" para empezar.</p>
          <Button onClick={() => setModal('nuevo')} className="bg-violet-600 hover:bg-violet-700 text-white mx-auto">
            <Plus size={15} /> Registrar gasto
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {gastosFiltrados.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No hay gastos para los filtros seleccionados.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Descripción</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoría</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Monto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Método</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {gastosFiltrados.map(g => {
                  const cat = CATEGORIAS[g.categoria] ?? { label: g.categoria, color: 'bg-slate-100 text-slate-600' }
                  return (
                    <tr key={g.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtFecha(g.fecha)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{g.descripcion}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cat.color}`}>{cat.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{ars(g.monto)}</td>
                      <td className="px-4 py-3 text-slate-500">{g.metodo_pago ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setModal(g)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setElimModal(g)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{ars(totalFiltrado)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Modal crear / editar */}
      {modal && (
        <ModalGasto
          gastoInicial={modal === 'nuevo' ? null : modal}
          onGuardar={() => { setModal(null); cargar() }}
          onCerrar={() => setModal(null)}
        />
      )}

      {/* Modal confirmar eliminar */}
      {elimModal && (
        <ModalEliminar
          gasto={elimModal}
          eliminando={eliminando}
          onConfirmar={eliminar}
          onCerrar={() => setElimModal(null)}
        />
      )}
    </div>
  )
}
