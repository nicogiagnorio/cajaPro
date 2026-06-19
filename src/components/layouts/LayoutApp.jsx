import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, Wallet,
  BarChart3, Users, LogOut, Store, ShoppingBag, Settings, Landmark, UserCircle2, Calendar,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getTema } from '../../lib/temas'
import { useStockAlertas } from '../../hooks/useStockAlertas'

const navPrincipal = [
  { ruta: '/app/dashboard',  etiqueta: 'Dashboard',       icono: LayoutDashboard, modulo: null        },
  { ruta: '/app/inventario', etiqueta: 'Inventario',      icono: Package,         modulo: null        },
  { ruta: '/app/ventas',     etiqueta: 'Punto de Venta',  icono: ShoppingCart,    modulo: 'ventas'    },
  { ruta: '/app/caja',       etiqueta: 'Caja',            icono: Landmark,        modulo: 'caja'      },
  { ruta: '/app/compras',    etiqueta: 'Compras',         icono: ShoppingBag,     modulo: 'compras'   },
  { ruta: '/app/gastos',     etiqueta: 'Gastos',          icono: Wallet,          modulo: 'gastos'    },
  { ruta: '/app/clientes',   etiqueta: 'Clientes',        icono: UserCircle2,     modulo: 'clientes'  },
  { ruta: '/app/turnos',    etiqueta: 'Turnos',          icono: Calendar,        modulo: 'turnos'    },
  { ruta: '/app/reportes',   etiqueta: 'Reportes',        icono: BarChart3,       modulo: 'reportes'  },
]

const navAdmin = [
  { ruta: '/app/usuarios',      etiqueta: 'Usuarios',      icono: Users    },
  { ruta: '/app/configuracion', etiqueta: 'Configuración', icono: Settings },
]

export default function LayoutApp() {
  const { perfil, comercio, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const tema = getTema(comercio?.color_tema)
  const { alertas: alertasStock } = useStockAlertas()

  async function handleCerrarSesion() {
    await cerrarSesion()
    navigate('/login', { replace: true })
  }

  const iniciales = perfil?.nombre
    ?.split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase() ?? '?'

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 flex flex-col flex-shrink-0">

        {/* Logo / nombre del comercio */}
        <div className="px-4 py-4 border-b border-slate-700/50 min-h-[72px] flex items-center">
          {comercio?.logo_url ? (
            <img
              src={comercio.logo_url}
              alt={comercio.nombre}
              className="max-h-14 w-auto max-w-[176px] object-contain mx-auto"
            />
          ) : (
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 ${tema.activo} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Store size={16} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg tracking-tight">
                Caja<span className={tema.acento}>Pro</span>
              </span>
            </div>
          )}
        </div>

        {/* Navegación principal */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navPrincipal.filter(({ modulo }) => !modulo || comercio?.modulos?.[modulo] !== false).map(({ ruta, etiqueta, icono: Icono }) => {
            const badge = ruta === '/app/inventario' && alertasStock.length > 0
              ? alertasStock.length
              : null
            return (
              <NavLink
                key={ruta}
                to={ruta}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? `${tema.activo} text-white`
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icono size={18} />
                <span className="flex-1">{etiqueta}</span>
                {badge && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </NavLink>
            )
          })}

          {/* Sección admin */}
          {perfil?.rol === 'admin' && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Administración
                </p>
              </div>
              {navAdmin.map(({ ruta, etiqueta, icono: Icono }) => (
                <NavLink
                  key={ruta}
                  to={ruta}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? `${tema.activo} text-white`
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icono size={18} />
                  {etiqueta}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Usuario + logout */}
        <div className="px-3 py-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className={`w-8 h-8 rounded-full ${tema.avatar} flex items-center justify-center flex-shrink-0`}>
              <span className="text-xs font-bold text-white">{iniciales}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{perfil?.nombre}</p>
              <p className="text-xs text-slate-400 capitalize">{perfil?.rol}</p>
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

      {/* Contenido principal */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
