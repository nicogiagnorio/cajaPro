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

// Acepta email valido o el alias de superadmin "nicolas"
const SUPERADMIN_ALIAS = 'nicolas'
const SUPERADMIN_EMAIL = 'nicolas@cajapro.admin'

const esquema = z.object({
  email: z.string().min(1, 'Ingresa tu email').refine(
    v => v.toLowerCase() === SUPERADMIN_ALIAS || z.string().email().safeParse(v).success,
    'El email no es valido'
  ),
  password: z.string().min(1, 'Ingresa tu contrasena'),
})

const erroresAuth = {
  'Invalid login credentials':  'Email o contrasena incorrectos',
  'Email not confirmed':        'Confirma tu email antes de ingresar',
  'Too many requests':          'Demasiados intentos. Espera unos minutos',
}

export default function Login() {
  const navigate = useNavigate()
  const [errorGeneral, setErrorGeneral] = useState('')

  const { sesion, perfil, esSuperAdmin, cargando } = useAuth()

  // Redirigir solo cuando sesion Y perfil esten cargados
  // (evita race condition donde esSuperAdmin=false porque perfil aun no llego)
  useEffect(() => {
    if (cargando) return
    if (sesion && perfil) {
      navigate(esSuperAdmin ? '/admin' : '/app/dashboard', { replace: true })
    }
  }, [sesion, perfil, esSuperAdmin, cargando, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(esquema) })

  async function onSubmit({ email, password }) {
    setErrorGeneral('')
    const emailFinal = email.toLowerCase() === SUPERADMIN_ALIAS ? SUPERADMIN_EMAIL : email
    const { error } = await supabase.auth.signInWithPassword({ email: emailFinal, password })
    if (error) {
      setErrorGeneral(erroresAuth[error.message] ?? 'Ocurrio un error. Intenta de nuevo.')
    }
  }

  return (
    <LayoutAuth>
      <h2 className="text-xl font-bold text-slate-900 mb-6">Inicia sesion</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="text"
          placeholder="tu@email.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Contrasena"
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
          Olvidaste tu contrasena?
        </Link>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100 text-center">
        <p className="text-sm text-slate-500">
          No tenes cuenta?{' '}
          <Link to="/registro" className="text-blue-600 font-medium hover:underline">
            Registra tu comercio
          </Link>
        </p>
      </div>
    </LayoutAuth>
  )
}
