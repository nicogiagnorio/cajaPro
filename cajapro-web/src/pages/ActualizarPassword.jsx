import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { traducirError } from '../lib/errores'
import LayoutAuth from '../components/layouts/LayoutAuth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

// El link de recuperacion de Supabase redirige aca con un token en la URL.
// El SDK lo procesa solo y dispara el evento PASSWORD_RECOVERY.
export default function ActualizarPassword() {
  const navigate = useNavigate()
  const [listo, setListo] = useState(false)
  const [exito, setExito] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY') setListo(true)
    })
    // Si la sesion de recuperacion ya estaba activa antes de montar el listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setListo(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function onSubmit({ password }) {
    setErrorGeneral('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setErrorGeneral(traducirError(error))
      return
    }
    setExito(true)
    setTimeout(() => navigate('/login', { replace: true }), 2000)
  }

  if (exito) {
    return (
      <LayoutAuth>
        <div className="text-center py-4">
          <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">¡Contraseña actualizada!</h2>
          <p className="text-slate-500 text-sm">Te llevamos al inicio de sesión...</p>
        </div>
      </LayoutAuth>
    )
  }

  if (!listo) {
    return (
      <LayoutAuth>
        <div className="text-center py-8">
          <Spinner size="lg" className="text-blue-500 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Verificando el link de recuperación...</p>
        </div>
      </LayoutAuth>
    )
  }

  return (
    <LayoutAuth>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Nueva contraseña</h2>
      <p className="text-sm text-slate-500 mb-6">Elegí una nueva contraseña para tu cuenta.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nueva contraseña"
          type="password"
          placeholder="Mín. 8 caracteres"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password', {
            required: 'Ingresá una contraseña',
            minLength: { value: 8, message: 'Mínimo 8 caracteres' },
          })}
        />
        <Input
          label="Confirmar contraseña"
          type="password"
          placeholder="Repetí la contraseña"
          autoComplete="new-password"
          error={errors.confirmar?.message}
          {...register('confirmar', {
            validate: v => v === watch('password') || 'Las contraseñas no coinciden',
          })}
        />

        {errorGeneral && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{errorGeneral}</span>
          </div>
        )}

        <Button type="submit" cargando={isSubmitting} className="w-full">
          Actualizar contraseña
        </Button>
      </form>
    </LayoutAuth>
  )
}
