import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'

const DIAS_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const HORA_CAL_INICIO = 8
const HORA_CAL_FIN    = 21
const PIX_MIN         = 1.5
const SLOT_SNAP       = 30

const ESTADO_CAL = {
  pendiente:  'bg-amber-100 border-amber-300 text-amber-800',
  confirmado: 'bg-blue-100 border-blue-300 text-blue-800',
  completado: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  cancelado:  'bg-red-100 border-red-200 text-red-600 opacity-50',
}

function getLunesDe(fecha) {
  const d = new Date(fecha)
  const dia = d.getDay()
  const diff = dia === 0 ? -6 : 1 - dia
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function fmtFecha(d) {
  return d.toISOString().slice(0, 10)
}

function addMinutes(time, mins) {
  const [h, m] = time.split(':').map(Number)
  const total  = h * 60 + m + mins
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function minsDesdeCal(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return (h - HORA_CAL_INICIO) * 60 + m
}

function MiniCalendar({ profesionalId, comercioId, selectedFecha, selectedHoraInicio, selectedHoraFin, onSlotSelect }) {
  const [semana,   setSemana]   = useState(() => getLunesDe(new Date()))
  const [turnos,   setTurnos]   = useState([])
  const [cargando, setCargando] = useState(false)
  const [hover,    setHover]    = useState(null)

  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semana)
    d.setDate(d.getDate() + i)
    return d
  })

  useEffect(() => {
    if (!profesionalId) { setTurnos([]); return }
    setCargando(true)
    const desde = fmtFecha(diasSemana[0])
    const hasta  = fmtFecha(diasSemana[6])
    supabase.from('turnos')
      .select('id, fecha, hora_inicio, hora_fin, estado, cliente_nombre')
      .eq('profesional_id', profesionalId)
      .eq('comercio_id', comercioId)
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .neq('estado', 'cancelado')
      .order('hora_inicio')
      .then(({ data, error }) => {
        if (error) console.error('turnos:', error.message)
        setTurnos(data ?? [])
        setCargando(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profesionalId, semana, comercioId])

  const alturaTotal  = (HORA_CAL_FIN - HORA_CAL_INICIO) * 60 * PIX_MIN
  const cantidadSemi = (HORA_CAL_FIN - HORA_CAL_INICIO) * 2

  function handleMouseMove(e, diaIdx) {
    if (!profesionalId) return
    const rect   = e.currentTarget.getBoundingClientRect()
    const rawMin = (e.clientY - rect.top) / PIX_MIN
    const snapped = Math.floor(rawMin / SLOT_SNAP) * SLOT_SNAP
    setHover({ diaIdx, minutos: Math.max(0, Math.min(snapped, (HORA_CAL_FIN - HORA_CAL_INICIO) * 60 - SLOT_SNAP)) })
  }

  function handleClick(e, dia) {
    if (!profesionalId) return
    const rect    = e.currentTarget.getBoundingClientRect()
    const rawMin  = (e.clientY - rect.top) / PIX_MIN
    const snapped = Math.floor(rawMin / SLOT_SNAP) * SLOT_SNAP
    const clamped = Math.max(0, Math.min(snapped, (HORA_CAL_FIN - HORA_CAL_INICIO) * 60 - SLOT_SNAP))
    const h       = Math.floor(clamped / 60) + HORA_CAL_INICIO
    const m       = clamped % 60
    onSlotSelect(fmtFecha(dia), `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
  }

  const hoy = fmtFecha(new Date())

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">

      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 bg-slate-50 flex-shrink-0">
        <button
          onClick={() => setSemana(p => { const d = new Date(p); d.setDate(d.getDate() - 7); return d })}
          className="p-1 rounded-md hover:bg-slate-200 text-slate-500 transition-colors"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          onClick={() => setSemana(getLunesDe(new Date()))}
          className="px-2 py-0.5 text-[11px] font-medium text-slate-500 border border-slate-200 rounded hover:bg-slate-100 transition-colors"
        >
          Hoy
        </button>
        <button
          onClick={() => setSemana(p => { const d = new Date(p); d.setDate(d.getDate() + 7); return d })}
          className="p-1 rounded-md hover:bg-slate-200 text-slate-500 transition-colors"
        >
          <ChevronRight size={15} />
        </button>
        <span className="text-[11px] text-slate-500 ml-0.5 truncate">
          {diasSemana[0].toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
          {' — '}
          {diasSemana[6].toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        {cargando && (
          <div className="ml-auto w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        )}
      </div>

      <div className="overflow-y-auto overflow-x-auto" style={{ maxHeight: 520 }}>
        <div className="flex" style={{ minWidth: 400 }}>

          <div className="w-9 flex-shrink-0 border-r border-slate-100 bg-white sticky left-0 z-10">
            <div className="h-9 border-b border-slate-100" />
            <div className="relative" style={{ height: alturaTotal }}>
              {Array.from({ length: HORA_CAL_FIN - HORA_CAL_INICIO }, (_, i) => (
                <div
                  key={i}
                  className="absolute right-1 text-[9px] leading-none text-slate-400"
                  style={{ top: i * 60 * PIX_MIN - 5 }}
                >
                  {String(HORA_CAL_INICIO + i).padStart(2, '0')}
                </div>
              ))}
            </div>
          </div>

          {diasSemana.map((dia, diaIdx) => {
            const fechaStr      = fmtFecha(dia)
            const esHoy         = fechaStr === hoy
            const esSel         = fechaStr === selectedFecha
            const turnosDia     = turnos.filter(t => t.fecha === fechaStr)

            return (
              <div key={fechaStr} className="flex-1 border-r border-slate-100 last:border-r-0" style={{ minWidth: 48 }}>
                <div className={`h-9 flex flex-col items-center justify-center border-b border-slate-100 sticky top-0 z-10
                  ${esSel ? 'bg-blue-50' : esHoy ? 'bg-blue-50/40' : 'bg-white'}`}>
                  <span className={`text-[9px] font-semibold uppercase tracking-wider
                    ${esSel || esHoy ? 'text-blue-500' : 'text-slate-400'}`}>
                    {DIAS_CORTO[diaIdx]}
                  </span>
                  <span className={`text-xs font-bold leading-tight
                    ${esSel ? 'text-blue-600' : esHoy ? 'text-blue-500' : 'text-slate-700'}`}>
                    {dia.getDate()}
                  </span>
                </div>

                <div
                  className={`relative ${profesionalId ? 'cursor-pointer' : 'cursor-default'}`}
                  style={{ height: alturaTotal }}
                  onClick={e => handleClick(e, dia)}
                  onMouseMove={e => handleMouseMove(e, diaIdx)}
                  onMouseLeave={() => setHover(null)}
                >
                  {Array.from({ length: cantidadSemi }, (_, i) => (
                    <div
                      key={i}
                      className={`absolute left-0 right-0 border-t pointer-events-none
                        ${i % 2 === 0 ? 'border-slate-100' : 'border-dashed border-slate-50'}`}
                      style={{ top: i * SLOT_SNAP * PIX_MIN }}
                    />
                  ))}

                  {profesionalId && hover?.diaIdx === diaIdx && (
                    <div
                      className="absolute left-0.5 right-0.5 rounded bg-blue-100/80 border border-blue-300 pointer-events-none z-10"
                      style={{ top: hover.minutos * PIX_MIN, height: SLOT_SNAP * PIX_MIN }}
                    />
                  )}

                  {esSel && selectedHoraInicio && (() => {
                    const ini = minsDesdeCal(selectedHoraInicio)
                    const fin = selectedHoraFin ? minsDesdeCal(selectedHoraFin) : ini + SLOT_SNAP
                    if (ini < 0 || ini >= (HORA_CAL_FIN - HORA_CAL_INICIO) * 60) return null
                    return (
                      <div
                        className="absolute left-0.5 right-0.5 rounded border-2 border-blue-500 bg-blue-200/40 pointer-events-none z-20"
                        style={{ top: ini * PIX_MIN, height: Math.max((fin - ini) * PIX_MIN, SLOT_SNAP * PIX_MIN) }}
                      />
                    )
                  })()}

                  {turnosDia.map(turno => {
                    const ini    = minsDesdeCal(turno.hora_inicio.slice(0, 5))
                    const fin    = minsDesdeCal(turno.hora_fin.slice(0, 5))
                    const top    = ini * PIX_MIN
                    const height = Math.max((fin - ini) * PIX_MIN, 16)
                    return (
                      <div
                        key={turno.id}
                        className={`absolute left-0.5 right-0.5 rounded border-l-2 px-0.5 overflow-hidden z-10 pointer-events-none
                          ${ESTADO_CAL[turno.estado] ?? 'bg-blue-100 border-blue-300'}`}
                        style={{ top, height }}
                      >
                        <p className="text-[8px] font-semibold leading-tight truncate mt-px">
                          {turno.hora_inicio.slice(0, 5)} {turno.cliente_nombre ?? ''}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="px-3 py-1.5 border-t border-slate-100 text-center text-[10px] text-slate-400 flex-shrink-0">
        {profesionalId
          ? 'Tocá un horario libre para pre-completar el formulario'
          : 'Seleccioná un profesional para ver su agenda'}
      </div>
    </div>
  )
}

export default function NuevoTurno() {
  const { perfil }  = useAuth()
  const navigate    = useNavigate()

  const [profesionales, setProfesionales] = useState([])
  const [servicios,     setServicios]     = useState([])
  const [clientes,      setClientes]      = useState([])

  const [form, setForm] = useState({
    profesional_id:   '',
    servicio_id:      '',
    cliente_id:       '',
    cliente_nombre:   '',
    cliente_telefono: '',
    fecha:            new Date().toISOString().slice(0, 10),
    hora_inicio:      '09:00',
    hora_fin:         '09:30',
    notas:            '',
    estado:           'confirmado',
  })

  const [guardando,  setGuardando]  = useState(false)
  const [confirmado, setConfirmado] = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('profesionales').select('id,nombre,color').eq('comercio_id', perfil.comercio_id).eq('activo', true).order('nombre'),
      supabase.from('servicios_turnos').select('id,nombre,duracion_minutos,precio').eq('comercio_id', perfil.comercio_id).eq('activo', true).order('nombre'),
      supabase.from('clientes').select('id,nombre,telefono').eq('comercio_id', perfil.comercio_id).eq('activo', true).order('nombre').limit(200),
    ]).then(([{ data: p }, { data: s }, { data: c }]) => {
      setProfesionales(p ?? [])
      setServicios(s ?? [])
      setClientes(c ?? [])
    })
  }, [perfil.comercio_id])

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  function onServicioChange(servicioId) {
    set('servicio_id', servicioId)
    const serv = servicios.find(s => s.id === servicioId)
    if (serv) set('hora_fin', addMinutes(form.hora_inicio, serv.duracion_minutos))
  }

  function onHoraInicioChange(hora) {
    set('hora_inicio', hora)
    const serv = servicios.find(s => s.id === form.servicio_id)
    if (serv) set('hora_fin', addMinutes(hora, serv.duracion_minutos))
    else      set('hora_fin', addMinutes(hora, 30))
  }

  function onSlotSelect(fecha, hora) {
    set('fecha', fecha)
    onHoraInicioChange(hora)
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    setError('')

    if (form.hora_fin <= form.hora_inicio) {
      setError('La hora de fin debe ser posterior a la de inicio.')
      setGuardando(false)
      return
    }

    const payload = {
      comercio_id:      perfil.comercio_id,
      profesional_id:   form.profesional_id,
      servicio_id:      form.servicio_id      || null,
      cliente_id:       form.cliente_id       || null,
      cliente_nombre:   form.cliente_nombre   || null,
      cliente_telefono: form.cliente_telefono || null,
      fecha:            form.fecha,
      hora_inicio:      form.hora_inicio + ':00',
      hora_fin:         form.hora_fin    + ':00',
      estado:           form.estado,
      notas:            form.notas || null,
    }

    const { error: err } = await supabase.from('turnos').insert(payload)
    setGuardando(false)
    if (err) { setError(traducirError(err)); return }
    setConfirmado(true)
  }

  if (confirmado) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Turno agendado!</h2>
        <p className="text-slate-400 text-sm mb-6">El turno fue registrado correctamente.</p>
        <div className="flex gap-3 justify-center">
          <Button variante="secundario" onClick={() => {
            setConfirmado(false)
            setForm(p => ({ ...p, cliente_nombre: '', cliente_telefono: '', notas: '', cliente_id: '' }))
          }}>
            Nuevo turno
          </Button>
          <Button onClick={() => navigate('/app/turnos/calendario')}>
            Ver calendario
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">

      <div className="flex-1 min-w-0 w-full">
        <MiniCalendar
          profesionalId={form.profesional_id || null}
          comercioId={perfil.comercio_id}
          selectedFecha={form.fecha}
          selectedHoraInicio={form.hora_inicio}
          selectedHoraFin={form.hora_fin}
          onSlotSelect={onSlotSelect}
        />
      </div>

      <div className="w-full lg:w-[360px] flex-shrink-0">
        <form onSubmit={guardar} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <p className="font-semibold text-slate-800 text-base">Nuevo turno</p>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Profesional *</label>
            {profesionales.length === 0 ? (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  No hay profesionales activos. Agregá uno en <strong>Turnos › Profesionales</strong>.
                </p>
              </div>
            ) : (
              <select
                required
                value={form.profesional_id}
                onChange={e => set('profesional_id', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
              >
                <option value="">Seleccioná...</option>
                {profesionales.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Servicio</label>
            <select
              value={form.servicio_id}
              onChange={e => onServicioChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
            >
              <option value="">Sin servicio específico</option>
              {servicios.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nombre} ({s.duracion_minutos} min){s.precio ? ` - $${s.precio}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1 col-span-3 sm:col-span-1">
              <label className="text-xs font-medium text-slate-600">Fecha *</label>
              <input
                required type="date" value={form.fecha}
                onChange={e => set('fecha', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Inicio *</label>
              <input
                required type="time" value={form.hora_inicio}
                onChange={e => onHoraInicioChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Fin *</label>
              <input
                required type="time" value={form.hora_fin}
                onChange={e => set('hora_fin', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Cliente (del sistema)</label>
            <select
              value={form.cliente_id}
              onChange={e => {
                set('cliente_id', e.target.value)
                const cl = clientes.find(c => c.id === e.target.value)
                if (cl) { set('cliente_nombre', cl.nombre); set('cliente_telefono', cl.telefono ?? '') }
              }}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
            >
              <option value="">Sin cliente del sistema / nuevo</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Nombre</label>
              <input
                value={form.cliente_nombre}
                onChange={e => set('cliente_nombre', e.target.value)}
                placeholder="Nombre y apellido"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Teléfono</label>
              <input
                value={form.cliente_telefono}
                onChange={e => set('cliente_telefono', e.target.value)}
                placeholder="11-1234-5678"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Estado inicial</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'confirmado', label: 'Confirmado' },
                { val: 'pendiente',  label: 'Pendiente'  },
              ].map(({ val, label }) => (
                <button
                  key={val} type="button"
                  onClick={() => set('estado', val)}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    form.estado === val
                      ? val === 'confirmado' ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Notas internas</label>
            <textarea
              value={form.notas}
              onChange={e => set('notas', e.target.value)}
              rows={2}
              placeholder="Indicaciones, preferencias del cliente, etc."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <Button type="submit" cargando={guardando} variante="exito" className="w-full">
            Agendar turno
          </Button>
        </form>
      </div>
    </div>
  )
}
