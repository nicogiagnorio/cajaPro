import { useState } from 'react'
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, Wallet,
  BarChart3, Users, LogOut, Store, ShoppingBag, Settings, Landmark,
  UserCircle2, Calendar, Menu, X, ShieldCheck,
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
  { ruta: '/app/turnos',     etiqueta: 'Turnos',          icono: Calendar,        modulo: 'turnos'    },
  { ruta: '/app/reportes',   etiqueta: 'Reportes',        icono: BarChart3,       modulo: 'reportes'  },
]

const navAdmin = [
  { ruta: '/app/usuarios',      etiqueta: 'Usuarios',      icono: Users    },
  { ruta: '/app/configuracion', etiqueta: 'Configuración', icono: Settings },
]

// Accesos directos de la barra inferior en mobile — el resto vive en "Más"
const navMobilePrincipal = ['/app/dashboard', '/app/ventas', '/app/caja', '/app/inventario']

export default function LayoutApp() {
  const { perfil, comercio, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const tema = getTema(comercio?.color_tema)
  const { alertas: alertasStock } = useStockAlertas()
  const [masAbierto, setMasAbierto] = useState(false)

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

  const itemsVisibles = navPrincipal.filter(({ modulo }) => !modulo || comercio?.modulos?.[modulo] !== false)
  const itemsMobilePrincipal = itemsVisibles.filter(i => navMobilePrincipal.includes(i.ruta))
  const itemsMobileMas = itemsVisibles.filter(i => !navMobilePrincipal.includes(i.ruta))
  const badgeInventario = alertasStock.length > 0 ? alertasStock.length : null

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-100 overflow-hidden">

      {/* ── Sidebar (desktop / tablet) ── */}
      <aside className="hidden md:flex w-60 bg-slate-900 flex-col flex-shrink-0">
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

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {itemsVisibles.map(({ ruta, etiqueta, icono: Icono }) => {
            const badge = ruta === '/app/inventario' ? badgeInventario : null
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
          {perfil?.rol === 'superadmin' && (
            <Link
              to="/superadmin"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-violet-400 hover:bg-violet-900/30 hover:text-violet-300 transition-colors mb-1"
            >
              <ShieldCheck size={18} />
              Panel Superadmin
            </Link>
          )}
                    <button
            onClick={handleCerrarSesion}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Header (mobile) ── */}
      <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 flex-shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {comercio?.logo_url ? (
          <img src={comercio.logo_url} alt={comercio.nombre} className="h-8 w-auto max-w-[140px] object-contain" />
        ) : (
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 ${tema.activo} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <Store size={14} className="text-white" />
            </div>
            <span className="text-white font-bold tracking-tight">
              Caja<span className={tema.acento}>Pro</span>
            </span>
          </div>
        )}
        <div className="flex-1" />
        <div className={`w-8 h-8 rounded-full ${tema.avatar} flex items-center justify-center flex-shrink-0`}>
          <span className="text-xs font-bold text-white">{iniciales}</span>
        </div>
      </header>

      {/* ── Contenido principal ── */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* ── Barra inferior (mobile) ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex items-stretch z-30 pb-[env(safe-area-inset-bottom)]"
        style={{ height: 'calc(56px + env(safe-area-inset-bottom))' }}
      >
        {itemsMobilePrincipal.map(({ ruta, etiqueta, icono: Icono }) => {
          const activo = location.pathname.startsWith(ruta)
          const badge = ruta === '/app/inventario' ? badgeInventario : null
          return (
            <NavLink
              key={ruta}
              to={ruta}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
            >
              <span className={`relative flex flex-col items-center gap-0.5 ${activo ? 'text-blue-600' : 'text-slate-400'}`}>
                <Icono size={20} />
                {badge && (
                  <span className="absolute -top-1 -right-2.5 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[15px] text-center leading-tight">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
                <span className="text-[10px] font-medium leading-none">{etiqueta === 'Punto de Venta' ? 'Ventas' : etiqueta}</span>
              </span>
            </NavLink>
          )
        })}
        <button
          onClick={() => setMasAbierto(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-400"
        >
          <Menu size={20} />
          <span className="text-[10px] font-medium leading-none">Más</span>
        </button>
      </nav>

      {/* ── Hoja "Más" (mobile) ── */}
      {masAbierto && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 flex items-end"
          onClick={(e) => { if (e.target === e.currentTarget) setMasAbierto(false) }}
        >
          <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <p className="font-bold text-slate-900">Más opciones</p>
              <button onClick={() => setMasAbierto(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="px-3 py-2">
              {itemsMobileMas.map(({ ruta, etiqueta, icono: Icono }) => {
                const badge = ruta === '/app/inventario' ? badgeInventario : null
                return (
                  <NavLink
                    key={ruta}
                    to={ruta}
                    onClick={() => setMasAbierto(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                      }`
                    }
                  >
                    <Icono size={19} />
                    <span className="flex-1">{etiqueta}</span>
                    {badge && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </NavLink>
                )
              })}

              {perfil?.rol === 'admin' && (
                <>
                  <div className="pt-3 pb-1 px-3">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Administración
                    </p>
                  </div>
                  {navAdmin.map(({ ruta, etiqueta, icono: Icono }) => (
                    <NavLink
                      key={ruta}
                      to={ruta}
                      onClick={() => setMasAbierto(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                        }`
                      }
                    >
                      <Icono size={19} />
                      {etiqueta}
                    </NavLink>
                  ))}
                </>
              )}

              <div className="border-t border-slate-100 mt-2 pt-2">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className={`w-8 h-8 rounded-full ${tema.avatar} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-xs font-bold text-white">{iniciales}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{perfil?.nombre}</p>
                    <p className="text-xs text-slate-400 capitalize">{perfil?.rol}</p>
                  </div>
                </div>
                {perfil?.rol === 'superadmin' && (
                  <Link
                    to="/superadmin"
                    onClick={() => setMasAbierto(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors"
                  >
                    <ShieldCheck size={19} />
                    Panel Superadmin
                  </Link>
                )}
                                <button
                  onClick={handleCerrarSesion}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={19} />
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
