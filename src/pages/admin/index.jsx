import { useEffect, useState } from 'react'
import { Building2, Users, AlertTriangle, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Spinner from '../../components/ui/Spinner'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats]       = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => { cargarStats() }, [])

  async function cargarStats() {
    setCargando(true)
    try {
      if (!window.adminAPI?.estadisticas) throw new Error('API no disponible')
      const res = await window.adminAPI.estadisticas()
      if (!res.ok) { setError(res.error); return }
      setStats(res)
    } catch {
      setError('No se pudo conectar con el cliente admin. Configurá las credenciales en Ajustes.')
    } finally {
      setCargando(false)
    }
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle size={20} className="text-amber-600" />
            <h2 className="font-semibold text-amber-900">Cliente admin no configurado</h2>
          </div>
          <p className="text-sm text-amber-700 mb-4">
            Para usar el panel de administrador necesitás configurar las credenciales de Supabase.
          </p>
          <button
            onClick={() => navigate('/admin/ajustes')}
            className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
          >
            Ir a Ajustes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck size={22} className="text-violet-600" />
          <h1 className="text-2xl font-bold text-slate-900">Panel de administrador</h1>
        </div>
        <p className="text-slate-500 text-sm">Gestión de negocios, usuarios y módulos de CajaPro.</p>
      </div>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-violet-500" />
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div
              onClick={() => navigate('/admin/negocios')}
              className="bg-white rounded-2xl border border-slate-200 p-6 cursor-pointer hover:border-violet-200 hover:shadow-md transition-all group"
            >
              <div className="w-11 h-11 bg-violet-50 rounded-xl flex items-center justify-center mb-4">
                <Building2 size={22} className="text-violet-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{stats?.totalComercios ?? 0}</p>
              <p className="text-sm text-slate-500 group-hover:text-violet-600 transition-colors">Negocios registrados</p>
            </div>

            <div
              onClick={() => navigate('/admin/usuarios')}
              className="bg-white rounded-2xl border border-slate-200 p-6 cursor-pointer hover:border-violet-200 hover:shadow-md transition-all group"
            >
              <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                <Users size={22} className="text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{stats?.totalUsuarios ?? 0}</p>
              <p className="text-sm text-slate-500 group-hover:text-blue-600 transition-colors">Usuarios totales</p>
            </div>
          </div>

          {/* Accesos rápidos */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Acciones rápidas</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/admin/negocios')}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-violet-50 hover:text-violet-700 border border-slate-100 hover:border-violet-200 transition-colors text-left"
              >
                <Building2 size={18} className="text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Agregar negocio</p>
                  <p className="text-xs text-slate-400">Dar de alta un nuevo cliente</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/admin/usuarios')}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-100 hover:border-blue-200 transition-colors text-left"
              >
                <Users size={18} className="text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Agregar usuario</p>
                  <p className="text-xs text-slate-400">Crear empleado en un negocio</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
