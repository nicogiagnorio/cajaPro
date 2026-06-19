import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'

function addMinutes(time, mins) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`
}

export default function NuevoTurno() {
  const { perfil } = useAuth()
  const navigate = useNavigate()

  const [profesionales, setProfesionales] = useState([])
  const [servicios,     setServicios]     = useState([])
  const [clientes,      setClientes]      = useState([])

  const [form, setForm] = useState({
    profesional_id:  '',
    servicio_id:     '',
    cliente_id:      '',
    cliente_nombre:  '',
    cliente_telefono:'',
    fecha:           new Date().toISOString().slice(0,10),
    hora_inicio:     '09:00',
    hora_fin:        '09:30',
    notas:           '',
    estado:          'confirmado',
  })

  const [guardando,  setGuardando]  = useState(false)
  const [confirmado, setConfirmado] = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('profesionales').select('id,nombre,color').eq('comercio_id', perfil.comercio_id).eq('activo', true).order('nombre'),
      supabase.from('servicios_turnos').select('id,nombre,duracion_minutos,precio').eq('comercio_id', perfil.comercio_id).eq('activo', true).order('nombre'),
      supabase.from('clientes').select('id,nombre,telefono').eq('activo', true).order('nombre').limit(200),
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
    if (serv) {
      set('hora_fin', addMinutes(form.hora_inicio, serv.duracion_minutos))
    }
  }

  function onHoraInicioChange(hora) {
    set('hora_inicio', hora)
    const serv = servicios.find(s => s.id === form.servicio_id)
    if (serv) {
      set('hora_fin', addMinutes(hora, serv.duracion_minutos))
    }
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
      servicio_id:      form.servicio_id || null,
      cliente_id:       form.cliente_id  || null,
      cliente_nombre:   form.cliente_nombre  || null,
      cliente_telefono: form.cliente_telefono || null,
      fecha:            form.fecha,
      hora_inicio:      form.hora_inicio + ':00',
      hora_fin:         form.hora_fin   + ':00',
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
          <Button variante="secundario" onClick={() => { setConfirmado(false); setForm(p => ({ ...p, cliente_nombre:'', cliente_telefono:'', notas:'', cliente_id:'' })) }}>
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
    <div className="max-w-lg mx-auto">
      <form onSubmit={guardar} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <p className="font-semibold text-slate-800 text-base">Nuevo turno</p>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Profesional *</label>
          {profesionales.length === 0 ? (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                No hay profesionales activos. Agregá uno en <strong>Turnos Profesionales</strong>.
              </p>
            </div>
          ) : (
            <select required value={form.profesional_id} onChange={e => set('profesional_id', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
              <option value="">Seleccioná...</option>
              {profesionales.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Servicio</label>
          <select value={form.servicio_id} onChange={e => onServicioChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
            <option value="">Sin servicio especifico</option>
            {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.duracion_minutos} min){s.precio ? ` - $${s.precio}` : ''}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1 col-span-3 sm:col-span-1">
            <label className="text-xs font-medium text-slate-600">Fecha *</label>
            <input required type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Inicio *</label>
            <input required type="time" value={form.hora_inicio} onChange={e => onHoraInicioChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Fin *</label>
            <input required type="time" value={form.hora_fin} onChange={e => set('hora_fin', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Cliente (del sistema)</label>
          <select value={form.cliente_id} onChange={e => {
              set('cliente_id', e.target.value)
              const cl = clientes.find(c => c.id === e.target.value)
              if (cl) { set('cliente_nombre', cl.nombre); set('cliente_telefono', cl.telefono ?? '') }
            }}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
            <option value="">Sin cliente del sistema / nuevo</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Nombre del cliente</label>
            <input value={form.cliente_nombre} onChange={e => set('cliente_nombre', e.target.value)}
              placeholder="Nombre y apellido"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Telefono</label>
            <input value={form.cliente_telefono} onChange={e => set('cliente_telefono', e.target.value)}
              placeholder="Ej: 11-1234-5678"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Estado inicial</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: 'confirmado', label: 'Confirmado' },
              { val: 'pendiente',  label: 'Pendiente' },
            ].map(({ val, label }) => (
              <button key={val} type="button"
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
          <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={2}
            placeholder="Indicaciones, preferencias del cliente, etc."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <Button type="submit" cargando={guardando} variante="exito" className="w-full">
          Agendar turno
        </Button>
      </form>
    </div>
  )
}
