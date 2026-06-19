import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Building2, Users, Settings2, ShieldCheck, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { ruta: '/admin/dashboard', etiqueta: 'Dashboard',  icono: LayoutDashboard },
  { ruta: '/admin/negocios',  etiqueta: 'Negocios',   icono: Building2       },
  { ruta: '/admin/usuarios',  etiqueta: 'Usuarios',   icono: Users           },
  { ruta: '/admin/ajustes',   etiqueta: 'Ajustes',    icono: Settings2       },
]

export default function LayoutAdmin() {
  const { perfil, cerrarSesion } = useAuth()
  const navigate = useNavigate()

  async function handleCerrarSesion() {
    await cerrarSesion()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar admin */}
      <aside className="w-60 bg-slate-950 flex flex-col flex-shrink-0">

        {/* Branding admin */}
        <div className="px-4 py-4 border-b border-slate-800 min-h-[72px] flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">CajaPro</p>
            <p className="text-violet-400 text-xs font-semibold">Panel de Admin</p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ ruta, etiqueta, icono: Icono }) => (
            <NavLink
              key={ruta}
              to={ruta}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icono size={18} />
              {etiqueta}
            </NavLink>
          ))}
        </nav>

        {/* Usuario + logout */}
        <div className="px-3 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">
                {perfil?.nombre?.charAt(0)?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{perfil?.nombre}</p>
              <p className="text-xs text-violet-400">Superadmin</p>
            </div>
          </div>
          <button
            onClick={handleCerrarSesion}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
