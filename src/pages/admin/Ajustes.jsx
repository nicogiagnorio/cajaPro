import { useEffect, useState } from 'react'
import { Settings2, CheckCircle2, AlertCircle } from 'lucide-react'
import Button from '../../components/ui/Button'

export default function AdminAjustes() {
  const [form,      setForm]      = useState({ supabaseUrl: '', serviceRoleKey: '' })
  const [guardando, setGuardando] = useState(false)
  const [msg,       setMsg]       = useState(null) // { ok, texto }

  useEffect(() => {
    window.adminAPI.cargarConfig().then(res => {
      if (res.ok && res.data) {
        setForm({ supabaseUrl: res.data.supabaseUrl ?? '', serviceRoleKey: res.data.serviceRoleKey ?? '' })
      }
    })
  }, [])

  async function guardar(e) {
    e.preventDefault()
    if (!form.supabaseUrl.trim() || !form.serviceRoleKey.trim()) {
      setMsg({ ok: false, texto: 'Completá ambos campos.' })
      return
    }
    setGuardando(true)
    setMsg(null)
    const res = await window.adminAPI.guardarConfig(form)
    setGuardando(false)
    setMsg(res.ok
      ? { ok: true,  texto: 'Configuración guardada correctamente.' }
      : { ok: false, texto: res.error }
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings2 size={20} className="text-slate-500" />
        <h1 className="text-xl font-bold text-slate-900">Ajustes del panel admin</h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div>
          <h3 className="font-semibold text-slate-800 mb-1">Credenciales de Supabase</h3>
          <p className="text-xs text-slate-500">
            Necesitás el <strong>service_role key</strong> para poder crear usuarios y gestionar la base de datos.
            Encontralo en: Supabase Dashboard → Settings → API.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
          <p className="font-semibold mb-1">Importante</p>
          <p>El service role key bypasea todas las políticas RLS. Esta configuración solo se almacena localmente en este equipo y nunca se envía a terceros.</p>
        </div>

        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">URL del proyecto Supabase</label>
            <input
              type="url"
              value={form.supabaseUrl}
              onChange={e => setForm(p => ({ ...p, supabaseUrl: e.target.value }))}
              placeholder="https://xxxxxxxxxxxx.supabase.co"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Service Role Key</label>
            <textarea
              value={form.serviceRoleKey}
              onChange={e => setForm(p => ({ ...p, serviceRoleKey: e.target.value }))}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 font-mono resize-none"
            />
          </div>

          {msg && (
            <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2.5 ${
              msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              {msg.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              {msg.texto}
            </div>
          )}

          <Button type="submit" cargando={guardando} className="w-full bg-violet-600 hover:bg-violet-700">
            Guardar configuración
          </Button>
        </form>
      </div>
    </div>
  )
}
