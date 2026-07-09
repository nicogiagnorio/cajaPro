import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from './ui/Spinner'

export default function RutaProtegida({ children }) {
  const { sesion, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Spinner size="lg" className="text-blue-400" />
      </div>
    )
  }

  if (!sesion) return <Navigate to="/login" replace />

  return children
}
