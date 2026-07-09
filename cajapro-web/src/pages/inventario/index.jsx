import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { ruta: '/app/inventario/productos',  etiqueta: 'Productos'         },
  { ruta: '/app/inventario/categorias', etiqueta: 'Categorías'        },
  { ruta: '/app/inventario/proveedores',etiqueta: 'Proveedores'       },
  { ruta: '/app/inventario/importar-exportar', etiqueta: 'Importar / Exportar' },
]

export default function Inventario() {
  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Inventario</h1>

        <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto scrollbar-hide">
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

        <Outlet />
      </div>
    </div>
  )
}
