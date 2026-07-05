import { createHashRouter, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Registro from './pages/Registro'
import RecuperarPassword from './pages/RecuperarPassword'
import Dashboard from './pages/Dashboard'
import GestionUsuarios from './pages/usuarios/GestionUsuarios'
import Inventario from './pages/inventario/index'
import Productos from './pages/inventario/Productos'
import Categorias from './pages/inventario/Categorias'
import Proveedores from './pages/inventario/Proveedores'
import ImportarExportar from './pages/inventario/ImportarExportar'
import Ventas from './pages/ventas/index'
import NuevaVenta from './pages/ventas/NuevaVenta'
import VentaRapida from './pages/ventas/VentaRapida'
import HistorialVentas from './pages/ventas/HistorialVentas'
import Compras from './pages/compras/index'
import CompraDetallada from './pages/compras/CompraDetallada'
import CompraRapida from './pages/compras/CompraRapida'
import HistorialCompras from './pages/compras/HistorialCompras'
import Gastos from './pages/gastos/index'
import NuevoGasto from './pages/gastos/NuevoGasto'
import HistorialGastos from './pages/gastos/HistorialGastos'
import CategoriasGastos from './pages/gastos/CategoriasGastos'
import Caja from './pages/caja/index'
import Clientes from './pages/clientes/index'
import Reportes from './pages/reportes/index'
import Configuracion from './pages/configuracion/index'
import Turnos from './pages/turnos/index'
import CalendarioSemanal from './pages/turnos/CalendarioSemanal'
import Profesionales from './pages/turnos/Profesionales'
import NuevoTurno from './pages/turnos/NuevoTurno'
import ConfigTurnos from './pages/turnos/ConfigTurnos'
import AdminDashboard from './pages/admin/index'
import AdminNegocios from './pages/admin/Negocios'
import AdminUsuarios from './pages/admin/Usuarios'
import AdminAjustes from './pages/admin/Ajustes'
import AdminCobros from './pages/admin/Cobros'
import AdminGastosPropios from './pages/admin/GastosPropios'
import AdminFinanzas from './pages/admin/Finanzas'
import RutaProtegida from './components/RutaProtegida'
import RutaAdmin from './components/RutaAdmin'
import RutaSuperAdmin from './components/RutaSuperAdmin'
import LayoutApp from './components/layouts/LayoutApp'
import LayoutAdmin from './components/layouts/LayoutAdmin'

export const router = createHashRouter([
  { path: '/login',              element: <Login /> },
  { path: '/registro',           element: <Registro /> },
  { path: '/recuperar-password', element: <RecuperarPassword /> },
  {
    path: '/app',
    element: (
      <RutaProtegida>
        <LayoutApp />
      </RutaProtegida>
    ),
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      {
        path: 'inventario',
        element: <Inventario />,
        children: [
          { index: true, element: <Navigate to="/app/inventario/productos" replace /> },
          { path: 'productos',   element: <Productos /> },
          { path: 'categorias',  element: <Categorias /> },
          { path: 'proveedores', element: <Proveedores /> },
          { path: 'importar',    element: <ImportarExportar /> },
        ],
      },
      {
        path: 'ventas',
        element: <Ventas />,
        children: [
          { index: true, element: <Navigate to="/app/ventas/caja" replace /> },
          { path: 'caja',      element: <NuevaVenta /> },
          { path: 'rapida',    element: <VentaRapida /> },
          { path: 'historial', element: <HistorialVentas /> },
        ],
      },
      {
        path: 'compras',
        element: <Compras />,
        children: [
          { index: true, element: <Navigate to="/app/compras/historial" replace /> },
          { path: 'detallada', element: <CompraDetallada /> },
          { path: 'rapida',    element: <CompraRapida /> },
          { path: 'historial', element: <HistorialCompras /> },
        ],
      },
      {
        path: 'gastos',
        element: <Gastos />,
        children: [
          { index: true, element: <Navigate to="/app/gastos/nuevo" replace /> },
          { path: 'nuevo',      element: <NuevoGasto /> },
          { path: 'historial',  element: <HistorialGastos /> },
          { path: 'categorias', element: <CategoriasGastos /> },
        ],
      },
      {
        path: 'turnos',
        element: <Turnos />,
        children: [
          { index: true, element: <Navigate to="/app/turnos/calendario" replace /> },
          { path: 'calendario',    element: <CalendarioSemanal /> },
          { path: 'profesionales', element: <Profesionales /> },
          { path: 'nuevo',         element: <NuevoTurno /> },
          { path: 'configuracion', element: <ConfigTurnos /> },
        ],
      },
      { path: 'caja',      element: <Caja /> },
      { path: 'clientes',  element: <Clientes /> },
      { path: 'reportes',  element: <Reportes /> },
      {
        path: 'usuarios',
        element: (
          <RutaAdmin>
            <GestionUsuarios />
          </RutaAdmin>
        ),
      },
      {
        path: 'configuracion',
        element: (
          <RutaAdmin>
            <Configuracion />
          </RutaAdmin>
        ),
      },
    ],
  },
  {
    path: '/admin',
    element: (
      <RutaSuperAdmin>
        <LayoutAdmin />
      </RutaSuperAdmin>
    ),
    children: [
      { index: true,              element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard',        element: <AdminDashboard />    },
      { path: 'negocios',         element: <AdminNegocios />     },
      { path: 'usuarios',         element: <AdminUsuarios />     },
      { path: 'ajustes',          element: <AdminAjustes />      },
      { path: 'cobros',           element: <AdminCobros />       },
      { path: 'gastos-propios',   element: <AdminGastosPropios />},
      { path: 'finanzas',         element: <AdminFinanzas />     },
    ],
  },
  { path: "*",  element: <Navigate to="/app/dashboard" replace /> },
])
