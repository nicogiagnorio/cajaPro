import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { ruta: '/app/ventas/caja',      etiqueta: 'Venta Detallada' },
  { ruta: '/app/ventas/rapida',    etiqueta: 'Venta Rápida'    },
  { ruta: '/app/ventas/historial', etiqueta: 'Historial'       },
]

export default function Ventas() {
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex gap-1 border-b border-slate-200 mb-5 flex-shrink-0">
        {tabs.map(({ ruta, etiqueta }) => (
          <NavLink
            key={ruta}
            to={ruta}
            className={({ isActive }) =>
              `px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`
            }
          >
            {etiqueta}
          </NavLink>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
