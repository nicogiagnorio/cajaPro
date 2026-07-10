import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, CheckCircle2, Clock, XCircle, CheckCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { googleCal } from '../../lib/googleCal'
import { traducirError } from '../../lib/errores'
import Spinner from '../../components/ui/Spinner'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const HORA_INICIO = 8
const HORA_FIN    = 21
const SLOT_MIN    = 30

const ESTADO_STYLE = {
  pendiente:  'bg-amber-100 border-amber-400 text-amber-800',
  confirmado: 'bg-blue-100 border-blue-400 text-blue-800',
  completado: 'bg-emerald-100 border-emerald-400 text-emerald-800',
  cancelado:  'bg-red-100 border-red-300 text-red-700 opacity-60',
}

const ESTADO_ICONO = {
  pendiente:  Clock,
  confirmado: CheckCircle2,
  completado: CheckCheck,
  cancelado:  XCircle,
}

function getLunesDeSemanaDe(fecha) {
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

function fmtHora(timeStr) {
  return timeStr?.slice(0, 5) ?? ''
}

function minutosDesde8(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return (h - HORA_INICIO) * 60 + m
}

function duracionMinutos(inicio, fin) {
  const [h1, m1] = inicio.split(':').map(Number)
  const [h2, m2] = fin.split(':').map(Number)
  return (h2 - h1) * 60 + (m2 - m1)
}

export default function CalendarioSemanal() {
  const { perfil } = useAuth()
  const [semana,          setSemana]          = useState(() => getLunesDeSemanaDe(new Date()))
  const [turnos,          setTurnos]          = useState([])
  const [profesionales,   setProfesionales]   = useState([])
  const [filtroProfs,     setFiltroProfs]     = useState([])  // array de IDs; vacío = todos
  const [cargando,        setCargando]        = useState(true)
  const [turnoActivo,     setTurnoActivo]     = useState(null)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)

  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semana)
    d.setDate(d.getDate() + i)
    return d
  })

  const cargar = useCallback(async () => {
    if (!perfil?.comercio_id) return
    setCargando(true)
    const desde = fmtFecha(diasSemana[0])
    const hasta = fmtFecha(diasSemana[6])

    const [{ data: profs }, { data: turnData }] = await Promise.all([
      supabase.from('profesionales')
        .select('id, nombre, color, activo')
        .eq('comercio_id', perfil.comercio_id)
        .eq('activo', true)
        .order('nombre'),
      supabase.from('turnos')
        .select('*, profesionales(nombre, color), servicios_turnos(nombre)')
        .eq('comercio_id', perfil.comercio_id)
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order('hora_inicio'),
    ])

    setProfesionales(profs ?? [])
    setTurnos(turnData ?? [])
    setCargando(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semana, perfil?.comercio_id])

  useEffect(() => { cargar() }, [cargar])

  function semanaAnterior() {
    setSemana(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d })
  }
  function semanaSiguiente() {
    setSemana(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d })
  }
  function irHoy() { setSemana(getLunesDeSemanaDe(new Date())) }

  function toggleProf(id) {
    setFiltroProfs(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const turnosFiltrados = filtroProfs.length > 0
    ? turnos.filter(t => filtroProfs.includes(t.profesional_id))
    : turnos

  const PIXELES_POR_MINUTO = 2
  const alturaTotal = (HORA_FIN - HORA_INICIO) * 60 * PIXELES_POR_MINUTO

  async function cambiarEstado(turno, nuevoEstado) {
    setCambiandoEstado(true)
    const { error: errEstado } = await supabase.from('turnos').update({ estado: nuevoEstado }).eq('id', turno.id)
    if (errEstado) {
      alert(traducirError(errEstado))
      setCambiandoEstado(false)
      return
    }

    if (nuevoEstado === 'confirmado' && !turno.google_event_id) {
      const gcfg = await googleCal.cargarConfig()
      if (gcfg.ok && gcfg.data?.conectado) {
        const res = await googleCal.crearEvento({
          titulo:      `${turno.servicios_turnos?.nombre ?? 'Turno'} — ${turno.cliente_nombre ?? ''}`,
          descripcion: turno.notas ?? '',
          fecha:       turno.fecha,
          horaInicio:  turno.hora_inicio,
          horaFin:     turno.hora_fin,
          color:       turno.profesionales?.color,
        })
        if (res.ok) {
          const { error: errGcal } = await supabase.from('turnos').update({ google_event_id: res.eventId }).eq('id', turno.id)
        if (errGcal) console.error('No se pudo guardar google_event_id:', errGcal.message)
        }
      }
    }

    if (nuevoEstado === 'cancelado' && turno.google_event_id) {
      await googleCal.eliminarEvento(turno.google_event_id)
      const { error: errGcalNull } = await supabase.from('turnos').update({ google_event_id: null }).eq('id', turno.id)
      if (errGcalNull) console.error('No se pudo limpiar google_event_id:', errGcalNull.message)
    }

    setCambiandoEstado(false)
    setTurnoActivo(null)
    cargar()
  }

  const hoy = fmtFecha(new Date())

  const franjas = []
  for (let h = HORA_INICIO; h < HORA_FIN; h++) {
    franjas.push(`${String(h).padStart(2,'0')}:00`)
    franjas.push(`${String(h).padStart(2,'0')}:30`)
  }

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Controles */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <button onClick={semanaAnterior} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button onClick={irHoy} className="px-3 py-1.5 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-700">
            Hoy
          </button>
          <button onClick={semanaSiguiente} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
        <span className="text-sm font-medium text-slate-700">
          {diasSemana[0].toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
          {' — '}
          {diasSemana[6].toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>

        {/* Filtro por profesional — chips multi-seleccionables */}
        {profesionales.length > 1 && (
          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFiltroProfs([])}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                filtroProfs.length === 0
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Todos
            </button>
            {profesionales.map(p => {
              const activo = filtroProfs.includes(p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => toggleProf(p.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    activo ? 'text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                  style={activo ? { backgroundColor: p.color ?? '#3B82F6', borderColor: p.color ?? '#3B82F6' } : {}}
                >
                  {p.nombre}
                </button>
              )
            })}
          </div>
        )}

        <button onClick={cargar} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="Recargar">
          <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Grilla */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-auto">
        {cargando ? (
          <div className="flex justify-center py-16"><Spinner size="lg" className="text-blue-500" /></div>
        ) : (
          <div className="flex min-w-[700px]">
            {/* Eje Y (horas) */}
            <div className="w-14 flex-shrink-0 border-r border-slate-100 relative" style={{ height: alturaTotal + 48 }}>
              <div className="h-12 border-b border-slate-100" />
              {franjas.map((f, i) => (
                <div
                  key={f}
                  className="absolute left-0 right-0 text-right pr-2"
                  style={{ top: 48 + i * SLOT_MIN * PIXELES_POR_MINUTO - 7 }}
                >
                  {f.endsWith(':00') && (
                    <span className="text-[10px] text-slate-400">{f}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Columnas por día */}
            {diasSemana.map((dia, dIdx) => {
              const fechaStr  = fmtFecha(dia)
              const esHoy     = fechaStr === hoy
              const turnosDia = turnosFiltrados.filter(t => t.fecha === fechaStr)

              return (
                <div key={fechaStr} className="flex-1 border-r border-slate-100 last:border-r-0 min-w-[90px]">
                  {/* Cabecera día */}
                  <div className={`h-12 flex flex-col items-center justify-center border-b border-slate-100 sticky top-0 z-10 ${esHoy ? 'bg-blue-50' : 'bg-slate-50'}`}>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${esHoy ? 'text-blue-500' : 'text-slate-400'}`}>
                      {DIAS[dIdx]}
                    </span>
                    <span className={`text-sm font-bold ${esHoy ? 'text-blue-600' : 'text-slate-700'}`}>
                      {dia.getDate()}
                    </span>
                  </div>

                  {/* Slots */}
                  <div className="relative" style={{ height: alturaTotal }}>
                    {franjas.map((f, i) => (
                      <div
                        key={f}
                        className={`absolute left-0 right-0 border-t ${f.endsWith(':00') ? 'border-slate-100' : 'border-dashed border-slate-50'}`}
                        style={{ top: i * SLOT_MIN * PIXELES_POR_MINUTO }}
                      />
                    ))}

                    {turnosDia.map(turno => {
                      const top    = minutosDesde8(turno.hora_inicio) * PIXELES_POR_MINUTO
                      const height = Math.max(duracionMinutos(turno.hora_inicio, turno.hora_fin) * PIXELES_POR_MINUTO, 28)
                      const color  = turno.profesionales?.color ?? '#3B82F6'

                      return (
                        <button
                          key={turno.id}
                          onClick={() => setTurnoActivo(turno)}
                          className={`absolute left-1 right-1 rounded border-l-4 px-1.5 py-0.5 text-left overflow-hidden z-10 hover:brightness-95 transition-all ${ESTADO_STYLE[turno.estado] ?? ''}`}
                          style={{ top, height, borderLeftColor: color }}
                          title={`${fmtHora(turno.hora_inicio)} ${turno.cliente_nombre ?? ''}`}
                        >
                          <p className="text-[10px] font-semibold leading-tight truncate">
                            {fmtHora(turno.hora_inicio)} {turno.cliente_nombre ?? ''}
                          </p>
                          {height >= 36 && (
                            <p className="text-[9px] leading-tight truncate opacity-75">
                              {turno.servicios_turnos?.nombre ?? ''}
                            </p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Panel de detalle */}
      {turnoActivo && (
        <div
          className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center"
          onClick={e => { if (e.target === e.currentTarget) setTurnoActivo(null) }}
        >
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-slate-900 text-base">
                  {turnoActivo.cliente_nombre ?? 'Sin nombre'}
                </p>
                <p className="text-sm text-slate-500">
                  {turnoActivo.profesionales?.nombre ?? ''}
                  {turnoActivo.servicios_turnos?.nombre ? ` · ${turnoActivo.servicios_turnos.nombre}` : ''}
                </p>
              </div>
              <button onClick={() => setTurnoActivo(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XCircle size={18} />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-sm space-y-1">
              <p><span className="text-slate-400 text-xs">Fecha:</span> {new Date(turnoActivo.fecha + 'T00:00').toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })}</p>
              <p><span className="text-slate-400 text-xs">Horario:</span> {fmtHora(turnoActivo.hora_inicio)} — {fmtHora(turnoActivo.hora_fin)}</p>
              {turnoActivo.cliente_telefono && (
                <p><span className="text-slate-400 text-xs">Teléfono:</span> {turnoActivo.cliente_telefono}</p>
              )}
              {turnoActivo.notas && (
                <p><span className="text-slate-400 text-xs">Notas:</span> {turnoActivo.notas}</p>
              )}
              {turnoActivo.google_event_id && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Sincronizado con Google Calendar
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {turnoActivo.estado === 'pendiente' && (
                <button
                  onClick={() => cambiarEstado(turnoActivo, 'confirmado')}
                  disabled={cambiandoEstado}
                  className="w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {cambiandoEstado ? 'Procesando…' : '✓ Confirmar turno'}
                </button>
              )}
              {turnoActivo.estado === 'confirmado' && (
                <button
                  onClick={() => cambiarEstado(turnoActivo, 'completado')}
                  disabled={cambiandoEstado}
                  className="w-full py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {cambiandoEstado ? 'Procesando…' : '✓ Marcar completado'}
                </button>
              )}
              {['pendiente','confirmado'].includes(turnoActivo.estado) && (
                <button
                  onClick={() => cambiarEstado(turnoActivo, 'cancelado')}
                  disabled={cambiandoEstado}
                  className="w-full py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {cambiandoEstado ? 'Procesando…' : '✕ Cancelar turno'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
