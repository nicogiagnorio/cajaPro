import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { ruta: '/app/gastos/nuevo',      etiqueta: 'Nuevo Gasto'  },
  { ruta: '/app/gastos/historial',  etiqueta: 'Historial'    },
  { ruta: '/app/gastos/categorias', etiqueta: 'Categorías'   },
]

export default function Gastos() {
  return (
    <div className="p-3 sm:p-6 h-full flex flex-col">
      <div className="flex gap-1 border-b border-slate-200 mb-4 sm:mb-5 flex-shrink-0 overflow-x-auto scrollbar-hide">
        {tabs.map(({ ruta, etiqueta }) => (
          <NavLink
            key={ruta}
            to={ruta}
            className={({ isActive }) =>
              `flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
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
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
