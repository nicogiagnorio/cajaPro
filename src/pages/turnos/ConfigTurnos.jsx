import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, ExternalLink, Unlink, RefreshCw, Copy, Check } from 'lucide-react'
import { googleCal } from '../../lib/googleCal'
import Button from '../../components/ui/Button'

function CopiarBoton({ texto }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    try { await navigator.clipboard.writeText(texto) } catch { }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }
  return (
    <button onClick={copiar} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="Copiar">
      {copiado ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  )
}

export default function ConfigTurnos() {
  const [cfg,        setCfg]        = useState(null)
  const [calendarios,setCalendarios]= useState([])
  const [form, setForm]             = useState({ client_id: '', client_secret: '', calendar_id: '' })
  const [guardando,  setGuardando]  = useState(false)
  const [conectando, setConectando] = useState(false)
  const [cargando,   setCargando]   = useState(true)
  const [mensaje,    setMensaje]    = useState(null)  // { tipo: 'ok'|'error', texto }

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const res = await googleCal.cargarConfig()
    if (res.ok && res.data) {
      setCfg(res.data)
      setForm(p => ({
        ...p,
        client_id:     res.data.client_id     ?? '',
        client_secret: res.data.client_secret ?? '',
        calendar_id:   res.data.calendar_id   ?? '',
      }))
      // Si ya está conectado, cargar calendarios
      if (res.data.conectado) {
        const calRes = await googleCal.listarCalendarios()
        if (calRes.ok) setCalendarios(calRes.data)
      }
    }
    setCargando(false)
  }

  async function guardarCredenciales(e) {
    e.preventDefault()
    setGuardando(true)
    const res = await googleCal.guardarConfig({
      client_id:     form.client_id.trim(),
      client_secret: form.client_secret.trim(),
      calendar_id:   form.calendar_id,
    })
    setGuardando(false)
    if (res.ok) {
      setCfg(res.data)
      setMensaje({ tipo: 'ok', texto: 'Credenciales guardadas.' })
    } else {
      setMensaje({ tipo: 'error', texto: res.error })
    }
    setTimeout(() => setMensaje(null), 3000)
  }

  async function conectar() {
    setConectando(true)
    setMensaje(null)
    const res = await googleCal.iniciarOAuth()
    setConectando(false)
    if (res.ok) {
      setMensaje({ tipo: 'ok', texto: res.mensaje })
      cargar()
    } else {
      setMensaje({ tipo: 'error', texto: res.error })
    }
  }

  async function desconectar() {
    if (!confirm('¿Desconectar Google Calendar? Los eventos ya creados permanecen en tu calendario.')) return
    await googleCal.desconectar()
    setCfg(p => ({ ...p, conectado: false, access_token: undefined, refresh_token: undefined }))
    setCalendarios([])
    setMensaje({ tipo: 'ok', texto: 'Google Calendar desconectado.' })
    setTimeout(() => setMensaje(null), 3000)
  }

  async function guardarCalendario(calId) {
    setForm(p => ({ ...p, calendar_id: calId }))
    await googleCal.guardarConfig({ calendar_id: calId })
    setMensaje({ tipo: 'ok', texto: 'Calendario guardado.' })
    setTimeout(() => setMensaje(null), 2000)
  }

  function abrirConsola() {
    googleCal.abrirUrl('https://console.cloud.google.com/apis/credentials')
  }

  if (cargando) {
    return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  const conectado = cfg?.conectado && cfg?.access_token

  return (
    <div className="max-w-xl mx-auto space-y-5">

      {/* Mensaje feedback */}
      {mensaje && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
          mensaje.tipo === 'ok'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {mensaje.tipo === 'ok' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {mensaje.texto}
        </div>
      )}

      {/* Estado de conexión */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-800">Google Calendar</p>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            conectado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {conectado ? '● Conectado' : '○ Desconectado'}
          </span>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800 space-y-1">
          <p className="font-semibold">Cómo configurarlo (solo una vez):</p>
          <p>1. Abrí <button onClick={abrirConsola} className="underline font-medium inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink size={10} /></button></p>
          <p>2. Creá un proyecto → Habilitá "Google Calendar API"</p>
          <p>3. Credenciales → Crear → OAuth 2.0 → Aplicación de escritorio</p>
          <p>4. Copiá el Client ID y Client Secret acá abajo</p>
        </div>

        {/* Formulario de credenciales */}
        <form onSubmit={guardarCredenciales} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Client ID</label>
            <input
              value={form.client_id}
              onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}
              placeholder="xxxx.apps.googleusercontent.com"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Client Secret</label>
            <input
              type="password"
              value={form.client_secret}
              onChange={e => setForm(p => ({ ...p, client_secret: e.target.value }))}
              placeholder="GOCSPX-…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 font-mono text-xs"
            />
          </div>
          <Button type="submit" cargando={guardando} variante="secundario" className="w-full">
            Guardar credenciales
          </Button>
        </form>

        {/* Botón conectar / desconectar */}
        {cfg?.client_id && (
          conectado
            ? (
              <button
                onClick={desconectar}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
              >
                <Unlink size={14} /> Desconectar Google Calendar
              </button>
            )
            : (
              <Button onClick={conectar} cargando={conectando} className="w-full">
                {conectando ? 'Esperando autorización…' : 'Conectar con Google Calendar'}
              </Button>
            )
        )}
      </div>

      {/* Selección de calendario (una vez conectado) */}
      {conectado && calendarios.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <p className="font-semibold text-slate-800 text-sm">Calendario donde sincronizar turnos</p>
          <div className="space-y-2">
            {calendarios.map(cal => (
              <button
                key={cal.id}
                onClick={() => guardarCalendario(cal.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-colors ${
                  (form.calendar_id || 'primary') === cal.id
                    ? 'border-blue-400 bg-blue-50 text-blue-800'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color ?? '#3B82F6' }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{cal.nombre}</p>
                  {cal.principal && <p className="text-xs text-slate-400">Calendario principal</p>}
                </div>
                {(form.calendar_id || 'primary') === cal.id && <CheckCircle2 size={15} className="text-blue-500 flex-shrink-0" />}
              </button>
            ))}
          </div>
          <button
            onClick={async () => {
              const res = await googleCal.listarCalendarios()
              if (res.ok) setCalendarios(res.data)
            }}
            className="text-xs text-slate-400 hover:text-blue-500 flex items-center gap-1 transition-colors"
          >
            <RefreshCw size={11} /> Actualizar lista
          </button>
        </div>
      )}

      {/* Link de reservas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <p className="font-semibold text-slate-800 text-sm">Link de reservas para clientes</p>
        <p className="text-xs text-slate-500">
          Compartí este link con tus clientes para que puedan ver tu disponibilidad y coordinar turnos por WhatsApp.
          El módulo Web (próximamente) agregará una página de reservas en línea automática.
        </p>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Número de WhatsApp</label>
          <div className="flex gap-2">
            <input
              value={form.whatsapp ?? ''}
              onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
              placeholder="5491112345678 (con código de país, sin +)"
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <Button
              onClick={async () => {
                await googleCal.guardarConfig({ whatsapp: form.whatsapp })
                setMensaje({ tipo: 'ok', texto: 'Guardado.' })
                setTimeout(() => setMensaje(null), 2000)
              }}
              variante="secundario"
              className="flex-shrink-0"
            >
              Guardar
            </Button>
          </div>

          {form.whatsapp && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-slate-500">Link generado para compartir:</p>
              <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-xs font-mono text-slate-600 flex-1 truncate">
                  {`https://wa.me/${form.whatsapp}?text=Hola!+Quiero+reservar+un+turno`}
                </span>
                <CopiarBoton texto={`https://wa.me/${form.whatsapp}?text=Hola!+Quiero+reservar+un+turno`} />
                <button
                  onClick={() => googleCal.abrirUrl(`https://wa.me/${form.whatsapp}?text=Hola!+Quiero+reservar+un+turno`)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 transition-colors"
                  title="Abrir"
                >
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

