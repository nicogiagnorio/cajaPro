import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RutaAdmin({ children }) {
  const { perfil } = useAuth()

  if (perfil?.rol !== 'admin' && perfil?.rol !== 'superadmin') {
    return <Navigate to="/app/dashboard" replace />
  }

  return children
}
