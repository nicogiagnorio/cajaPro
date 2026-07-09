import { useState, useEffect, useMemo } from 'react'
import { Plus, Wallet, Pencil, Trash2, ChevronDown, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

const CATEGORIAS = [
  { value: 'suscripciones',   label: 'Suscripciones'   },
  { value: 'infraestructura', label: 'Infraestructura' },
  { value: 'marketing',       label: 'Marketing'       },
  { value: 'otros',           label: 'Otros'           },
]

const COLORES = {
  suscripciones:   'bg-blue-100 text-blue-700',
  infraestructura: 'bg-violet-100 text-violet-700',
  marketing:       'bg-pink-100 text-pink-700',
  otros:           'bg-slate-100 text-slate-600',
}

function ars(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n ?? 0)
}

function fmtFecha(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(iso + 'T00:00:00'))
}

const FORM_VACIO = {
  descripcion: '',
  monto: '',
  categoria: 'suscripciones',
  fecha: new Date().toISOString().slice(0, 10),
  metodo_pago: '',
}

export default function GastosPropios() {
  const [gastos,    setGastos]    = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [error,     setError]     = useState('')
  const [busqueda,  setBusqueda]  = useState('')
  const [filtrocat, setFiltrocat] = useState('todas')

  const [modal,     setModal]     = useState(false)
  const [editando,  setEditando]  = useState(null)
  const [form,      setForm]      = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [errModal,  setErrModal]  = useState('')

  const [confirmarElim, setConfirmarElim] = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const { data, error: e } = await supabase
      .from('cajapro_gastos')
      .select('*')
      .order('fecha', { ascending: false })
    if (e) setError(traducirError(e))
    setGastos(data ?? [])
    setCargando(false)
  }

  function abrirCrear() {
    setEditando(null)
    setForm(FORM_VACIO)
    setErrModal('')
    setModal(true)
  }

  function abrirEditar(g) {
    setEditando(g)
    setForm({
      descripcion: g.descripcion,
      monto:       String(g.monto),
      categoria:   g.categoria,
      fecha:       g.fecha ?? FORM_VACIO.fecha,
      metodo_pago: g.metodo_pago ?? '',
    })
    setErrModal('')
    setModal(true)
  }

  async function guardar() {
    if (!form.descripcion.trim()) { setErrModal('Ingresá una descripción.'); return }
    if (!form.monto || isNaN(Number(form.monto))) { setErrModal('Ingresá un monto válido.'); return }
    setGuardando(true)
    setErrModal('')

    const payload = {
      descripcion: form.descripcion,
      monto:       Number(form.monto),
      categoria:   form.categoria,
      fecha:       form.fecha,
      metodo_pago: form.metodo_pago || null,
    }

    if (editando) {
      const { error: e } = await supabase.from('cajapro_gastos').update(payload).eq('id', editando.id)
      if (e) { setErrModal(traducirError(e)); setGuardando(false); return }
      setGastos((prev) => prev.map((g) => g.id === editando.id ? { ...g, ...payload } : g))
    } else {
      const { data, error: e } = await supabase.from('cajapro_gastos').insert(payload).select().single()
      if (e) { setErrModal(traducirError(e)); setGuardando(false); return }
      setGastos((prev) => [data, ...prev])
    }
    setGuardando(false)
    setModal(false)
  }

  async function eliminar() {
    if (!confirmarElim) return
    const { error: e } = await supabase.from('cajapro_gastos').delete().eq('id', confirmarElim.id)
    if (!e) setGastos((prev) => prev.filter((g) => g.id !== confirmarElim.id))
    setConfirmarElim(null)
  }

  const filtrados = useMemo(() => gastos.filter((g) => {
    const matchB = !busqueda || g.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
    const matchC = filtrocat === 'todas' || g.categoria === filtrocat
    return matchB && matchC
  }), [gastos, busqueda, filtrocat])

  const totalFiltrado = filtrados.reduce((s, g) => s + Number(g.monto), 0)

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-violet-500" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gastos propios</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gastos operativos de CajaPro</p>
        </div>
        <Button onClick={abrirCrear}>
          <Plus size={16} className="mr-1.5" /> Nuevo gasto
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar gasto..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          />
        </div>
        <div className="relative">
          <select
            value={filtrocat}
            onChange={(e) => setFiltrocat(e.target.value)}
            className="appearance-none pl-4 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            <option value="todas">Todas las categorías</option>
            {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {filtrados.length > 0 && (
        <p className="text-xs text-slate-500 mb-3">
          {filtrados.length} gasto{filtrados.length !== 1 ? 's' : ''} · Total: <strong>{ars(totalFiltrado)}</strong>
        </p>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {filtrados.map((g) => (
          <div key={g.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Wallet size={17} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm truncate">{g.descripcion}</p>
              <p className="text-xs text-slate-400">
                {fmtFecha(g.fecha)}
                {g.metodo_pago && <> · {g.metodo_pago}</>}
              </p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${COLORES[g.categoria] ?? 'bg-slate-100 text-slate-600'}`}>
              {CATEGORIAS.find((c) => c.value === g.categoria)?.label ?? g.categoria}
            </span>
            <p className="font-bold text-slate-900 flex-shrink-0">{ars(g.monto)}</p>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => abrirEditar(g)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => setConfirmarElim(g)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {filtrados.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Wallet size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No hay gastos registrados</p>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      <Modal
        abierto={modal}
        onCerrar={() => setModal(false)}
        titulo={editando ? 'Editar gasto' : 'Nuevo gasto'}
      >
        <div className="space-y-3">
          <Input
            label="Descripción *"
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            placeholder="Supabase Pro, dominio, etc."
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monto (ARS) *"
              type="number"
              value={form.monto}
              onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
              placeholder="1500"
            />
            <Input
              label="Fecha"
              type="date"
              value={form.fecha}
              onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
              <div className="relative">
                <select
                  value={form.categoria}
                  onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                  className="w-full appearance-none pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <Input
              label="Medio de pago"
              value={form.metodo_pago}
              onChange={(e) => setForm((f) => ({ ...f, metodo_pago: e.target.value }))}
              placeholder="Tarjeta, débito..."
            />
          </div>
          {errModal && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{errModal}</div>
          )}
          <div className="flex gap-2 pt-1">
            <Button variante="secundario" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button className="flex-1" cargando={guardando} onClick={guardar}>
              {editando ? 'Guardar' : 'Agregar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmar eliminación */}
      <Modal
        abierto={!!confirmarElim}
        onCerrar={() => setConfirmarElim(null)}
        titulo="Eliminar gasto"
      >
        <p className="text-sm text-slate-600 mb-5">
          ¿Eliminás <strong>{confirmarElim?.descripcion}</strong>? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-2">
          <Button variante="secundario" className="flex-1" onClick={() => setConfirmarElim(null)}>Cancelar</Button>
          <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={eliminar}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}
