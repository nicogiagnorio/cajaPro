import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { Calendar, Users, Plus, Settings } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getTema } from '../../lib/temas'

const tabs = [
  { ruta: 'calendario',    etiqueta: 'Calendario',    icono: Calendar },
  { ruta: 'profesionales', etiqueta: 'Profesionales', icono: Users    },
  { ruta: 'nuevo',         etiqueta: 'Nuevo turno',   icono: Plus     },
  { ruta: 'configuracion', etiqueta: 'Configuración', icono: Settings },
]

export default function Turnos() {
  const { comercio } = useAuth()
  const tema = getTema(comercio?.color_tema)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Turnos</h1>
            <p className="text-sm text-slate-400 mt-0.5">Gestión de agenda y citas</p>
          </div>
        </div>
        <nav className="flex gap-1">
          {tabs.map(({ ruta, etiqueta, icono: Icono }) => (
            <NavLink
              key={ruta}
              to={ruta}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? `${tema.activo} text-white`
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`
              }
            >
              <Icono size={15} />
              {etiqueta}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </div>
    </div>
  )
}
