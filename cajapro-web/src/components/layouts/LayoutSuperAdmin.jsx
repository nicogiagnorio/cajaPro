import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  Building2, CreditCard, Wallet, BarChart3,
  LogOut, ShieldCheck, Menu, X,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { ruta: '/superadmin/finanzas',  etiqueta: 'Finanzas',     icono: BarChart3  },
  { ruta: '/superadmin/comercios', etiqueta: 'Comercios',    icono: Building2  },
  { ruta: '/superadmin/cobros',    etiqueta: 'Cobros',       icono: CreditCard },
  { ruta: '/superadmin/gastos',    etiqueta: 'Gastos propios', icono: Wallet   },
]

export default function LayoutSuperAdmin() {
  const { perfil, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const [menuAbierto, setMenuAbierto] = useState(false)

  async function handleCerrarSesion() {
    await cerrarSesion()
    navigate('/login', { replace: true })
  }

  const iniciales = perfil?.nombre
    ?.split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() ?? '?'

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-100 overflow-hidden">

      {/* ── Sidebar desktop ── */}
      <aside className="hidden md:flex w-60 bg-violet-950 flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-violet-800/50 min-h-[72px] flex items-center gap-2.5">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">CajaPro</p>
            <p className="text-violet-400 text-xs">Superadmin</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ ruta, etiqueta, icono: Icono }) => (
            <NavLink
              key={ruta}
              to={ruta}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'text-violet-300 hover:bg-violet-900 hover:text-white'
                }`
              }
            >
              <Icono size={18} />
              {etiqueta}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-violet-800/50">
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">{iniciales}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{perfil?.nombre}</p>
              <p className="text-xs text-violet-400">Superadmin</p>
            </div>
          </div>
          <button
            onClick={handleCerrarSesion}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-violet-300 hover:bg-violet-900 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Header mobile ── */}
      <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-violet-950 flex-shrink-0">
        <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={14} className="text-white" />
        </div>
        <span className="text-white font-bold tracking-tight">
          CajaPro <span className="text-violet-400 font-normal text-sm">Superadmin</span>
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setMenuAbierto(true)}
          className="text-violet-300 hover:text-white"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* ── Contenido ── */}
      <main className="flex-1 overflow-y-auto pb-4">
        <Outlet />
      </main>

      {/* ── Drawer mobile ── */}
      {menuAbierto && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40 flex items-end"
          onClick={(e) => { if (e.target === e.currentTarget) setMenuAbierto(false) }}
        >
          <div className="bg-violet-950 rounded-t-2xl w-full pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-violet-800/50">
              <p className="font-bold text-white">Navegación</p>
              <button onClick={() => setMenuAbierto(false)} className="text-violet-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="px-3 py-3 space-y-0.5">
              {NAV.map(({ ruta, etiqueta, icono: Icono }) => (
                <NavLink
                  key={ruta}
                  to={ruta}
                  onClick={() => setMenuAbierto(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-violet-600 text-white' : 'text-violet-300 hover:bg-violet-900 hover:text-white'
                    }`
                  }
                >
                  <Icono size={18} />
                  {etiqueta}
                </NavLink>
              ))}
              <div className="border-t border-violet-800/50 pt-2 mt-2">
                <button
                  onClick={handleCerrarSesion}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-violet-900 transition-colors"
                >
                  <LogOut size={18} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
