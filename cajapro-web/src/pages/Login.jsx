import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import LayoutAuth from '../components/layouts/LayoutAuth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

const esquema = z.object({
  email:    z.string().email('El email no es válido'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
})

const erroresAuth = {
  'Invalid login credentials':  'Email o contraseña incorrectos',
  'Email not confirmed':        'Confirmá tu email antes de ingresar',
  'Too many requests':          'Demasiados intentos. Esperá unos minutos',
}

export default function Login() {
  const navigate = useNavigate()
  const [errorGeneral, setErrorGeneral] = useState('')

  const { sesion, perfil, cargando } = useAuth()

  useEffect(() => {
    if (cargando) return
    if (sesion && perfil) {
      navigate('/app/dashboard', { replace: true })
    }
  }, [sesion, perfil, cargando, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(esquema) })

  async function onSubmit({ email, password }) {
    setErrorGeneral('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setErrorGeneral(erroresAuth[error.message] ?? 'Ocurrió un error. Intentá de nuevo.')
    }
  }

  return (
    <LayoutAuth>
      <h2 className="text-xl font-bold text-slate-900 mb-6">Iniciá sesión</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="tu@email.com"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Contraseña"
          type="password"
          placeholder="..."
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        {errorGeneral && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {errorGeneral}
          </div>
        )}

        <Button
          type="submit"
          cargando={isSubmitting}
          className="w-full mt-2"
        >
          Ingresar
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Link
          to="/recuperar-password"
          className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100 text-center">
        <p className="text-sm text-slate-500">
          ¿No tenés cuenta?{' '}
          <Link to="/registro" className="text-blue-600 font-medium hover:underline">
            Registrá tu comercio
          </Link>
        </p>
      </div>
    </LayoutAuth>
  )
}
