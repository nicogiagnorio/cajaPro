import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Spinner from './components/ui/Spinner'

// Guards y layouts — carga inmediata (pequeños, necesarios para auth)
import RutaProtegida from './components/RutaProtegida'
import RutaAdmin from './components/RutaAdmin'
import RutaSuperAdmin from './components/RutaSuperAdmin'
import LayoutApp from './components/layouts/LayoutApp'
import LayoutSuperAdmin from './components/layouts/LayoutSuperAdmin'

// ── Lazy imports — cada módulo carga solo cuando se navega a él ──
const Landing            = lazy(() => import('./pages/Landing'))
const Login              = lazy(() => import('./pages/Login'))
const Registro           = lazy(() => import('./pages/Registro'))
const RecuperarPassword  = lazy(() => import('./pages/RecuperarPassword'))
const ActualizarPassword = lazy(() => import('./pages/ActualizarPassword'))
const Dashboard          = lazy(() => import('./pages/Dashboard'))
const GestionUsuarios    = lazy(() => import('./pages/usuarios/GestionUsuarios'))

const Inventario        = lazy(() => import('./pages/inventario/index'))
const Productos         = lazy(() => import('./pages/inventario/Productos'))
const Categorias        = lazy(() => import('./pages/inventario/Categorias'))
const Proveedores       = lazy(() => import('./pages/inventario/Proveedores'))
const ImportarExportar  = lazy(() => import('./pages/inventario/ImportarExportar'))

const Ventas          = lazy(() => import('./pages/ventas/index'))
const NuevaVenta      = lazy(() => import('./pages/ventas/NuevaVenta'))
const VentaRapida     = lazy(() => import('./pages/ventas/VentaRapida'))
const HistorialVentas = lazy(() => import('./pages/ventas/HistorialVentas'))

const Compras          = lazy(() => import('./pages/compras/index'))
const CompraDetallada  = lazy(() => import('./pages/compras/CompraDetallada'))
const CompraRapida     = lazy(() => import('./pages/compras/CompraRapida'))
const HistorialCompras = lazy(() => import('./pages/compras/HistorialCompras'))

const Gastos           = lazy(() => import('./pages/gastos/index'))
const NuevoGasto       = lazy(() => import('./pages/gastos/NuevoGasto'))
const HistorialGastos  = lazy(() => import('./pages/gastos/HistorialGastos'))
const CategoriasGastos = lazy(() => import('./pages/gastos/CategoriasGastos'))

const Caja          = lazy(() => import('./pages/caja/index'))
const Clientes      = lazy(() => import('./pages/clientes/index'))
const Reportes      = lazy(() => import('./pages/reportes/index'))
const Configuracion = lazy(() => import('./pages/configuracion/index'))

const Turnos            = lazy(() => import('./pages/turnos/index'))
const CalendarioSemanal = lazy(() => import('./pages/turnos/CalendarioSemanal'))
const Profesionales     = lazy(() => import('./pages/turnos/Profesionales'))
const NuevoTurno        = lazy(() => import('./pages/turnos/NuevoTurno'))

const Finanzas      = lazy(() => import('./pages/superadmin/Finanzas'))
const Comercios     = lazy(() => import('./pages/superadmin/Comercios'))
const Cobros        = lazy(() => import('./pages/superadmin/Cobros'))
const GastosPropios = lazy(() => import('./pages/superadmin/GastosPropios'))

// Fallback mientras carga el chunk
function Cargando() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" className="text-blue-400" />
    </div>
  )
}
function S({ children }) {
  return <Suspense fallback={<Cargando />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  // ── Landing pública ──────────────────────────────────────────
  { path: '/',                    element: <S><Landing /></S> },

  // ── Auth ────────────────────────────────────────────────────
  { path: '/login',               element: <S><Login /></S> },
  { path: '/registro',            element: <S><Registro /></S> },
  { path: '/recuperar-password',  element: <S><RecuperarPassword /></S> },
  { path: '/actualizar-password', element: <S><ActualizarPassword /></S> },

  // ── App principal ────────────────────────────────────────────
  {
    path: '/app',
    element: (
      <RutaProtegida>
        <LayoutApp />
      </RutaProtegida>
    ),
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'dashboard', element: <S><Dashboard /></S> },
      {
        path: 'inventario',
        element: <S><Inventario /></S>,
        children: [
          { index: true, element: <Navigate to="/app/inventario/productos" replace /> },
          { path: 'productos',         element: <S><Productos /></S> },
          { path: 'categorias',        element: <S><Categorias /></S> },
          { path: 'proveedores',       element: <S><Proveedores /></S> },
          { path: 'importar-exportar', element: <S><ImportarExportar /></S> },
        ],
      },
      {
        path: 'ventas',
        element: <S><Ventas /></S>,
        children: [
          { index: true, element: <Navigate to="/app/ventas/nueva" replace /> },
          { path: 'nueva',    element: <S><NuevaVenta /></S> },
          { path: 'caja',     element: <S><VentaRapida /></S> },
          { path: 'historial', element: <S><HistorialVentas /></S> },
        ],
      },
      {
        path: 'compras',
        element: <S><Compras /></S>,
        children: [
          { index: true, element: <Navigate to="/app/compras/historial" replace /> },
          { path: 'historial', element: <S><HistorialCompras /></S> },
          { path: 'nueva',     element: <S><CompraDetallada /></S> },
          { path: 'rapida',    element: <S><CompraRapida /></S> },
        ],
      },
      {
        path: 'gastos',
        element: <S><Gastos /></S>,
        children: [
          { index: true, element: <Navigate to="/app/gastos/nuevo" replace /> },
          { path: 'nuevo',      element: <S><NuevoGasto /></S> },
          { path: 'historial',  element: <S><HistorialGastos /></S> },
          { path: 'categorias', element: <S><CategoriasGastos /></S> },
        ],
      },
      {
        path: 'turnos',
        element: <S><Turnos /></S>,
        children: [
          { index: true, element: <Navigate to="/app/turnos/calendario" replace /> },
          { path: 'calendario',    element: <S><CalendarioSemanal /></S> },
          { path: 'profesionales', element: <S><Profesionales /></S> },
          { path: 'nuevo',         element: <S><NuevoTurno /></S> },
        ],
      },
      { path: 'caja',         element: <S><Caja /></S> },
      { path: 'clientes',     element: <S><Clientes /></S> },
      { path: 'reportes',     element: <S><Reportes /></S> },
      {
        path: 'usuarios',
        element: <RutaAdmin><S><GestionUsuarios /></S></RutaAdmin>,
      },
      {
        path: 'configuracion',
        element: <RutaAdmin><S><Configuracion /></S></RutaAdmin>,
      },
    ],
  },

  // ── Panel Superadmin ─────────────────────────────────────────
  {
    path: '/superadmin',
    element: (
      <RutaSuperAdmin>
        <LayoutSuperAdmin />
      </RutaSuperAdmin>
    ),
    children: [
      { index: true, element: <Navigate to="/superadmin/finanzas" replace /> },
      { path: 'finanzas',  element: <S><Finanzas /></S> },
      { path: 'comercios', element: <S><Comercios /></S> },
      { path: 'cobros',    element: <S><Cobros /></S> },
      { path: 'gastos',    element: <S><GastosPropios /></S> },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])
