import { useState, useEffect, useMemo } from 'react'
import { Plus, CreditCard, CheckCircle2, Clock, Search, Pencil, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

const TIPOS = [
  { value: 'implementacion',  label: 'Implementación' },
  { value: 'abono_mensual',   label: 'Abono mensual'  },
  { value: 'mejora',          label: 'Mejora / Add-on' },
]

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
  comercio_id: '',
  tipo: 'abono_mensual',
  monto: '',
  fecha: new Date().toISOString().slice(0, 10),
  observacion: '',
  estado: 'pagado',
  fecha_pago: new Date().toISOString().slice(0, 10),
  medio_pago: '',
  comprobante: '',
}

export default function Cobros() {
  const [cobros,     setCobros]     = useState([])
  const [comercios,  setComercio]   = useState([])
  const [cargando,   setCargando]   = useState(true)
  const [error,      setError]      = useState('')
  const [busqueda,   setBusqueda]   = useState('')
  const [filtroEst,  setFiltroEst]  = useState('todos')

  const [modal,     setModal]     = useState(false)
  const [editando,  setEditando]  = useState(null)
  const [form,      setForm]      = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [errModal,  setErrModal]  = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const [{ data: c, error: ec }, { data: com }] = await Promise.all([
      supabase
        .from('cajapro_cobros')
        .select('*, comercios(nombre)')
        .order('fecha', { ascending: false }),
      supabase.from('comercios').select('id, nombre').eq('activo', true).order('nombre'),
    ])
    if (ec) setError(traducirError(ec))
    setCobros(c ?? [])
    setComercio(com ?? [])
    setCargando(false)
  }

  function abrirCrear() {
    setEditando(null)
    setForm(FORM_VACIO)
    setErrModal('')
    setModal(true)
  }

  function abrirEditar(c) {
    setEditando(c)
    setForm({
      comercio_id: c.comercio_id ?? '',
      tipo:        c.tipo,
      monto:       String(c.monto),
      fecha:       c.fecha ?? FORM_VACIO.fecha,
      observacion: c.observacion ?? '',
      estado:      c.estado,
      fecha_pago:  c.fecha_pago ?? '',
      medio_pago:  c.medio_pago ?? '',
      comprobante: c.comprobante ?? '',
    })
    setErrModal('')
    setModal(true)
  }

  async function guardar() {
    if (!form.comercio_id) { setErrModal('Seleccioná un comercio.'); return }
    if (!form.monto || isNaN(Number(form.monto))) { setErrModal('Ingresá un monto válido.'); return }
    setGuardando(true)
    setErrModal('')

    const payload = {
      comercio_id:  form.comercio_id,
      tipo:         form.tipo,
      monto:        Number(form.monto),
      fecha:        form.fecha,
      observacion:  form.observacion || null,
      estado:       form.estado,
      fecha_pago:   form.estado === 'pagado' ? (form.fecha_pago || null) : null,
      medio_pago:   form.estado === 'pagado' ? (form.medio_pago || null) : null,
      comprobante:  form.estado === 'pagado' ? (form.comprobante || null) : null,
    }

    if (editando) {
      const { error: e } = await supabase.from('cajapro_cobros').update(payload).eq('id', editando.id)
      if (e) { setErrModal(traducirError(e)); setGuardando(false); return }
    } else {
      const { error: e } = await supabase.from('cajapro_cobros').insert(payload)
      if (e) { setErrModal(traducirError(e)); setGuardando(false); return }
    }
    setGuardando(false)
    setModal(false)
    cargar()
  }

  async function marcarPagado(cobro) {
    const { error: e } = await supabase
      .from('cajapro_cobros')
      .update({ estado: 'pagado', fecha_pago: new Date().toISOString().slice(0, 10) })
      .eq('id', cobro.id)
    if (!e) setCobros((prev) =>
      prev.map((c) => c.id === cobro.id ? { ...c, estado: 'pagado', fecha_pago: new Date().toISOString().slice(0, 10) } : c)
    )
  }

  const filtrados = useMemo(() => cobros.filter((c) => {
    const matchBusqueda = !busqueda || c.comercios?.nombre?.toLowerCase().includes(busqueda.toLowerCase())
    const matchEst = filtroEst === 'todos' || c.estado === filtroEst
    return matchBusqueda && matchEst
  }), [cobros, busqueda, filtroEst])

  const totalFiltrado = filtrados.reduce((s, c) => s + Number(c.monto), 0)

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-violet-500" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cobros</h1>
          <p className="text-sm text-slate-500 mt-0.5">{cobros.length} registros</p>
        </div>
        <Button onClick={abrirCrear}>
          <Plus size={16} className="mr-1.5" /> Registrar cobro
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por comercio..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          />
        </div>
        <div className="relative">
          <select
            value={filtroEst}
            onChange={(e) => setFiltroEst(e.target.value)}
            className="appearance-none pl-4 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            <option value="todos">Todos</option>
            <option value="pagado">Pagados</option>
            <option value="pendiente">Pendientes</option>
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {filtrados.length > 0 && (
        <p className="text-xs text-slate-500 mb-3">
          Mostrando {filtrados.length} cobro{filtrados.length !== 1 ? 's' : ''} · Total: <strong>{ars(totalFiltrado)}</strong>
        </p>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {filtrados.map((cobro) => (
          <div key={cobro.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              cobro.estado === 'pagado' ? 'bg-emerald-100' : 'bg-amber-100'
            }`}>
              {cobro.estado === 'pagado'
                ? <CheckCircle2 size={17} className="text-emerald-600" />
                : <Clock size={17} className="text-amber-600" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm truncate">
                {cobro.comercios?.nombre ?? '—'}
              </p>
              <p className="text-xs text-slate-400">
                {TIPOS.find((t) => t.value === cobro.tipo)?.label ?? cobro.tipo}
                {' · '}
                {fmtFecha(cobro.fecha)}
                {cobro.observacion && <> · <span className="italic">{cobro.observacion}</span></>}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-slate-900">{ars(cobro.monto)}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                cobro.estado === 'pagado'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {cobro.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {cobro.estado === 'pendiente' && (
                <button
                  onClick={() => marcarPagado(cobro)}
                  title="Marcar como pagado"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                >
                  <CheckCircle2 size={15} />
                </button>
              )}
              <button
                onClick={() => abrirEditar(cobro)}
                title="Editar"
                className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
              >
                <Pencil size={14} />
              </button>
            </div>
          </div>
        ))}

        {filtrados.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <CreditCard size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No hay cobros registrados</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        abierto={modal}
        onCerrar={() => setModal(false)}
        titulo={editando ? 'Editar cobro' : 'Registrar cobro'}
      >
        <div className="space-y-3">
          {/* Comercio */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Comercio *</label>
            <div className="relative">
              <select
                value={form.comercio_id}
                onChange={(e) => setForm((f) => ({ ...f, comercio_id: e.target.value }))}
                className="w-full appearance-none pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="">Seleccioná un comercio</option>
                {comercios.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <div className="relative">
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                  className="w-full appearance-none pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
              <div className="relative">
                <select
                  value={form.estado}
                  onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                  className="w-full appearance-none pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  <option value="pagado">Pagado</option>
                  <option value="pendiente">Pendiente</option>
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monto (ARS) *"
              type="number"
              value={form.monto}
              onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
              placeholder="5000"
            />
            <Input
              label="Fecha"
              type="date"
              value={form.fecha}
              onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
            />
          </div>

          {form.estado === 'pagado' && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Fecha de pago"
                type="date"
                value={form.fecha_pago}
                onChange={(e) => setForm((f) => ({ ...f, fecha_pago: e.target.value }))}
              />
              <Input
                label="Medio de pago"
                value={form.medio_pago}
                onChange={(e) => setForm((f) => ({ ...f, medio_pago: e.target.value }))}
                placeholder="Transferencia, efectivo..."
              />
            </div>
          )}

          <Input
            label="Observación"
            value={form.observacion}
            onChange={(e) => setForm((f) => ({ ...f, observacion: e.target.value }))}
            placeholder="Notas opcionales"
          />

          {errModal && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {errModal}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variante="secundario" className="flex-1" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" cargando={guardando} onClick={guardar}>
              {editando ? 'Guardar' : 'Registrar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
