import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Clock, ChevronDown, ChevronRight, X, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { traducirError } from '../../lib/errores'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const COLORES = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#F97316','#06B6D4','#EC4899']

const HORARIO_DEFAULT = { inicio: '09:00', fin: '18:00' }

function FormProfesional({ inicial, onGuardar, onCancelar, guardando }) {
  const [form, setForm] = useState(inicial ?? {
    nombre: '', especialidad: '', email: '', telefono: '', color: '#3B82F6',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <form
      onSubmit={e => { e.preventDefault(); onGuardar(form) }}
      className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3"
    >
      <p className="font-semibold text-slate-800 text-sm">{inicial ? 'Editar profesional' : 'Nuevo profesional'}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-slate-500 font-medium">Nombre *</label>
          <input required value={form.nombre} onChange={e => set('nombre', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Ej: Dra. Gómez" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500 font-medium">Especialidad</label>
          <input value={form.especialidad ?? ''} onChange={e => set('especialidad', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Ej: Masajes" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500 font-medium">Email</label>
          <input type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="opcional" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500 font-medium">Teléfono</label>
          <input value={form.telefono ?? ''} onChange={e => set('telefono', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="opcional" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-slate-500 font-medium">Color en el calendario</label>
        <div className="flex gap-2 flex-wrap">
          {COLORES.map(c => (
            <button key={c} type="button" onClick={() => set('color', c)}
              className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variante="secundario" onClick={onCancelar}>Cancelar</Button>
        <Button type="submit" cargando={guardando}>
          <Check size={14} /> {inicial ? 'Guardar cambios' : 'Agregar profesional'}
        </Button>
      </div>
    </form>
  )
}

function HorariosProfesional({ profesionalId }) {
  const semanaVacia = () =>
    DIAS_SEMANA.map((_, i) => ({
      dia:    i,
      activo: false,
      slots:  [{ inicio: HORARIO_DEFAULT.inicio, fin: HORARIO_DEFAULT.fin }],
    }))

  const [semana,    setSemana]    = useState(semanaVacia)
  const [cargando,  setCargando]  = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado,  setGuardado]  = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => { cargar() }, [profesionalId])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('horarios_disponibles')
      .select('*')
      .eq('profesional_id', profesionalId)
      .order('dia_semana')
      .order('hora_inicio')

    setSemana(DIAS_SEMANA.map((_, i) => {
      const regs = (data ?? []).filter(h => h.dia_semana === i)
      if (regs.length === 0) return semanaVacia()[i]
      return {
        dia:    i,
        activo: true,
        slots:  regs.slice(0, 2).map(r => ({
          inicio: r.hora_inicio.slice(0, 5),
          fin:    r.hora_fin.slice(0, 5),
        })),
      }
    }))
    setCargando(false)
  }

  function toggleDia(i) {
    setSemana(prev => prev.map((d, ix) => ix === i ? { ...d, activo: !d.activo } : d))
  }

  function setSlotHora(diaIdx, slotIdx, campo, valor) {
    setSemana(prev => prev.map((d, i) =>
      i !== diaIdx ? d : {
        ...d,
        slots: d.slots.map((s, j) => j !== slotIdx ? s : { ...s, [campo]: valor }),
      }
    ))
  }

  function addSlot(diaIdx) {
    setSemana(prev => prev.map((d, i) => {
      if (i !== diaIdx || d.slots.length >= 2) return d
      const [h, m] = d.slots[0].fin.split(':').map(Number)
      const minutos = h * 60 + m + 60
      const inicio2 = `${String(Math.floor(minutos / 60)).padStart(2,'0')}:${String(minutos % 60).padStart(2,'0')}`
      return { ...d, slots: [...d.slots, { inicio: inicio2, fin: '18:00' }] }
    }))
  }

  function removeSlot(diaIdx) {
    setSemana(prev => prev.map((d, i) =>
      i !== diaIdx ? d : { ...d, slots: [d.slots[0]] }
    ))
  }

  function presetDiasHabiles() {
    setSemana(prev => prev.map(d => ({
      ...d,
      activo: d.dia >= 1 && d.dia <= 5,
      slots:  d.slots.length ? d.slots : [{ ...HORARIO_DEFAULT }],
    })))
  }

  function presetLunesSabado() {
    setSemana(prev => prev.map(d => ({
      ...d,
      activo: d.dia >= 1 && d.dia <= 6,
      slots:  d.slots.length ? d.slots : [{ ...HORARIO_DEFAULT }],
    })))
  }

  function aplicarMismosHorarios() {
    const primero = semana.find(d => d.activo)
    if (!primero) return
    setSemana(prev => prev.map(d =>
      d.activo ? { ...d, slots: primero.slots.map(s => ({ ...s })) } : d
    ))
  }

  async function guardar() {
    for (const d of semana.filter(d => d.activo)) {
      for (let j = 0; j < d.slots.length; j++) {
        const s = d.slots[j]
        if (s.inicio >= s.fin) {
          setError(`${DIAS_SEMANA[d.dia]} — turno ${j + 1}: la hora de inicio debe ser menor a la de fin.`)
          return
        }
      }
      if (d.slots.length === 2) {
        if (d.slots[0].fin > d.slots[1].inicio) {
          setError(`${DIAS_SEMANA[d.dia]}: el 2° turno no puede comenzar antes de que termine el 1°.`)
          return
        }
      }
    }
    setError('')
    setGuardando(true)

    const { error: errDel } = await supabase.from('horarios_disponibles').delete().eq('profesional_id', profesionalId)
    if (errDel) { setError(traducirError(errDel)); setGuardando(false); return }

    const rows = []
    for (const d of semana.filter(d => d.activo)) {
      for (const slot of d.slots) {
        rows.push({
          profesional_id: profesionalId,
          dia_semana:     d.dia,
          hora_inicio:    slot.inicio + ':00',
          hora_fin:       slot.fin    + ':00',
        })
      }
    }

    if (rows.length > 0) {
      const { error: e } = await supabase.from('horarios_disponibles').insert(rows)
      if (e) { setError(traducirError(e)); setGuardando(false); return }
    }

    setGuardando(false)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  if (cargando) {
    return (
      <div className="py-6 flex justify-center">
        <Spinner size="sm" className="text-blue-400" />
      </div>
    )
  }

  const diasActivos = semana.filter(d => d.activo).length

  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
          <Clock size={12} /> Horarios de atención
        </p>
        <div className="ml-auto flex gap-1.5 flex-wrap">
          <button type="button" onClick={presetDiasHabiles}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 font-medium transition-colors">
            Lun–Vie
          </button>
          <button type="button" onClick={presetLunesSabado}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 font-medium transition-colors">
            Lun–Sáb
          </button>
          {diasActivos > 1 && (
            <button type="button" onClick={aplicarMismosHorarios}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-violet-100 hover:text-violet-700 font-medium transition-colors"
              title="Copiar horarios del primer día activo a todos los demás">
              Igualar horas
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {semana.map((d, i) => (
          <div
            key={i}
            className={`flex flex-col sm:flex-row items-start gap-2 sm:gap-3 rounded-xl px-3 py-2.5 transition-all ${
              d.activo
                ? 'bg-blue-50 border border-blue-100'
                : 'bg-slate-50 border border-slate-100'
            }`}
          >
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => toggleDia(i)}
                className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                  d.activo
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white border-slate-300 hover:border-blue-400'
                }`}
              >
                {d.activo && <Check size={11} className="text-white" strokeWidth={3} />}
              </button>

              <span className={`text-sm w-20 font-medium flex-shrink-0 pt-0.5 ${
                d.activo ? 'text-slate-800' : 'text-slate-400'
              }`}>
                {DIAS_SEMANA[i]}
              </span>
            </div>

            {d.activo ? (
              <div className="flex-1 space-y-1.5 min-w-0 w-full">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input type="time" value={d.slots[0].inicio}
                    onChange={e => setSlotHora(i, 0, 'inicio', e.target.value)}
                    className="text-xs border border-blue-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white w-[84px]" />
                  <span className="text-xs text-slate-400 flex-shrink-0">a</span>
                  <input type="time" value={d.slots[0].fin}
                    onChange={e => setSlotHora(i, 0, 'fin', e.target.value)}
                    className="text-xs border border-blue-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white w-[84px]" />
                  {d.slots.length < 2 && (
                    <button type="button" onClick={() => addSlot(i)}
                      className="text-[11px] px-2 py-1 rounded-md bg-slate-200 text-slate-500 hover:bg-blue-100 hover:text-blue-600 font-medium transition-colors flex-shrink-0"
                      title="Agregar corte al mediodía">
                      + corte
                    </button>
                  )}
                </div>

                {d.slots.length > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="w-[84px] flex items-center justify-center">
                      <span className="text-[10px] text-slate-400 italic">luego</span>
                    </div>
                    <input type="time" value={d.slots[1].inicio}
                      onChange={e => setSlotHora(i, 1, 'inicio', e.target.value)}
                      className="text-xs border border-blue-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white w-[84px]" />
                    <span className="text-xs text-slate-400 flex-shrink-0">a</span>
                    <input type="time" value={d.slots[1].fin}
                      onChange={e => setSlotHora(i, 1, 'fin', e.target.value)}
                      className="text-xs border border-blue-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white w-[84px]" />
                    <button type="button" onClick={() => removeSlot(i)}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                      title="Quitar corte">
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-300 italic pt-0.5 flex-1">No trabaja</span>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-slate-400">
          {diasActivos === 0
            ? 'Sin días activos'
            : `${diasActivos} día${diasActivos > 1 ? 's' : ''} configurado${diasActivos > 1 ? 's' : ''}`}
        </p>
        <Button
          onClick={guardar}
          cargando={guardando}
          className={`text-xs py-1.5 px-4 transition-colors ${guardado ? '!bg-emerald-600' : ''}`}
        >
          {guardado ? <><Check size={13} /> Guardado</> : 'Guardar horarios'}
        </Button>
      </div>
    </div>
  )
}

function Servicios({ comercioId }) {
  const [servicios, setServicios] = useState([])
  const [form,      setForm]      = useState({ nombre: '', duracion_minutos: 30, precio: '' })
  const [guardando, setGuardando] = useState(false)
  const [editId,    setEditId]    = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data } = await supabase
      .from('servicios_turnos')
      .select('*')
      .eq('comercio_id', comercioId)
      .eq('activo', true)
      .order('nombre')
    setServicios(data ?? [])
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    const payload = {
      comercio_id:      comercioId,
      nombre:           form.nombre,
      duracion_minutos: parseInt(form.duracion_minutos),
      precio:           form.precio ? parseFloat(form.precio) : null,
    }
    const { error } = editId
      ? await supabase.from('servicios_turnos').update(payload).eq('id', editId)
      : await supabase.from('servicios_turnos').insert(payload)
    setGuardando(false)
    if (error) { alert(traducirError(error)); return }
    setForm({ nombre: '', duracion_minutos: 30, precio: '' })
    setEditId(null)
    cargar()
  }

  async function archivar(id) {
    const { error } = await supabase.from('servicios_turnos').update({ activo: false }).eq('id', id)
    if (error) { alert(traducirError(error)); return }
    setServicios(prev => prev.filter(s => s.id !== id))
  }

  function editar(s) {
    setForm({ nombre: s.nombre, duracion_minutos: s.duracion_minutos, precio: s.precio ?? '' })
    setEditId(s.id)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
      <p className="font-semibold text-slate-800">Servicios</p>

      <div className="space-y-2">
        {servicios.map(s => (
          <div key={s.id} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">{s.nombre}</p>
              <p className="text-xs text-slate-400">{s.duracion_minutos} min{s.precio ? ` · $${s.precio}` : ''}</p>
            </div>
            <button onClick={() => editar(s)} className="text-slate-400 hover:text-blue-500 transition-colors">
              <Edit2 size={14} />
            </button>
            <button onClick={() => archivar(s.id)} className="text-slate-400 hover:text-red-500 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {servicios.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">Sin servicios cargados</p>
        )}
      </div>

      <form onSubmit={guardar} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
        <div className="space-y-1 sm:col-span-1">
          <label className="text-xs text-slate-500 font-medium">Nombre *</label>
          <input required value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Ej: Depilación facial" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500 font-medium">Duración (min)</label>
          <input type="number" min="5" step="5" value={form.duracion_minutos}
            onChange={e => setForm(p => ({ ...p, duracion_minutos: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500 font-medium">Precio</label>
          <input type="number" min="0" step="0.01" value={form.precio}
            onChange={e => setForm(p => ({ ...p, precio: e.target.value }))}
            placeholder="opcional"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <div className="sm:col-span-3 flex gap-2 justify-end">
          {editId && (
            <Button type="button" variante="secundario" onClick={() => { setEditId(null); setForm({ nombre: '', duracion_minutos: 30, precio: '' }) }}>
              Cancelar
            </Button>
          )}
          <Button type="submit" cargando={guardando}>
            <Plus size={14} /> {editId ? 'Actualizar servicio' : 'Agregar servicio'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function Profesionales() {
  const { perfil } = useAuth()
  const [profesionales, setProfesionales] = useState([])
  const [cargando,      setCargando]      = useState(true)
  const [mostrarForm,   setMostrarForm]   = useState(false)
  const [editando,      setEditando]      = useState(null)
  const [guardando,     setGuardando]     = useState(false)
  const [expandido,     setExpandido]     = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('profesionales')
      .select('*')
      .eq('comercio_id', perfil.comercio_id)
      .order('nombre')
    setProfesionales(data ?? [])
    setCargando(false)
  }

  async function guardar(form) {
    setGuardando(true)
    const { error } = editando
      ? await supabase.from('profesionales').update(form).eq('id', editando.id)
      : await supabase.from('profesionales').insert({ ...form, comercio_id: perfil.comercio_id })
    setGuardando(false)
    if (error) { alert(traducirError(error)); return }
    setMostrarForm(false)
    setEditando(null)
    cargar()
  }

  async function toggleActivo(prof) {
    const { error } = await supabase.from('profesionales').update({ activo: !prof.activo }).eq('id', prof.id)
    if (error) { alert(traducirError(error)); return }
    setProfesionales(prev => prev.map(p => p.id === prof.id ? { ...p, activo: !p.activo } : p))
  }

  if (cargando) return <div className="flex justify-center py-16"><Spinner size="lg" className="text-blue-500" /></div>

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex items-center justify-between border-b border-slate-100">
          <p className="font-semibold text-slate-800">Profesionales</p>
          {!mostrarForm && (
            <Button onClick={() => { setMostrarForm(true); setEditando(null) }} variante="secundario" className="text-sm py-1.5">
              <Plus size={14} /> Agregar
            </Button>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          {mostrarForm && (
            <FormProfesional
              inicial={editando}
              onGuardar={guardar}
              onCancelar={() => { setMostrarForm(false); setEditando(null) }}
              guardando={guardando}
            />
          )}

          {profesionales.length === 0 && !mostrarForm && (
            <p className="text-sm text-slate-400 text-center py-6">
              Aún no hay profesionales. Agregá el primero.
            </p>
          )}

          {profesionales.map(prof => (
            <div key={prof.id} className={`rounded-2xl border transition-all ${
              prof.activo ? 'border-slate-200' : 'border-slate-100 opacity-60'
            }`}>
              <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: prof.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{prof.nombre}</p>
                  {prof.especialidad && <p className="text-xs text-slate-400">{prof.especialidad}</p>}
                </div>
                <button
                  onClick={() => toggleActivo(prof)}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                    prof.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {prof.activo ? 'Activo' : 'Inactivo'}
                </button>
                <button
                  onClick={() => { setEditando(prof); setMostrarForm(true) }}
                  className="text-slate-400 hover:text-blue-500 transition-colors"
                  title="Editar datos"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => setExpandido(expandido === prof.id ? null : prof.id)}
                  className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                    expandido === prof.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                  title="Ver / editar horarios"
                >
                  <Clock size={13} />
                  Horarios
                  {expandido === prof.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              </div>

              {expandido === prof.id && (
                <div className="border-t border-slate-100 px-4 sm:px-5 pb-4">
                  <HorariosProfesional profesionalId={prof.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Servicios comercioId={perfil.comercio_id} />
    </div>
  )
}
