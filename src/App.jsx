import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { router } from './router'
import UpdateBanner from './components/UpdateBanner'

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <UpdateBanner />
    </AuthProvider>
  )
}
