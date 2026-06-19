import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'
import LayoutAuth from '../components/layouts/LayoutAuth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

const esquema = z.object({
  email: z.string().email('El email no es válido'),
})

export default function RecuperarPassword() {
  const [enviado, setEnviado] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(esquema) })

  async function onSubmit({ email }) {
    // Siempre mostramos éxito para no revelar si el email existe
    await supabase.auth.resetPasswordForEmail(email)
    setEnviado(true)
  }

  if (enviado) {
    return (
      <LayoutAuth>
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={28} className="text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Revisá tu email</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            Si existe una cuenta con ese email, te enviamos las instrucciones para restablecer tu contraseña.
          </p>
          <Link to="/login" className="text-sm text-blue-600 font-medium hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </LayoutAuth>
    )
  }

  return (
    <LayoutAuth>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Recuperar contraseña</h2>
      <p className="text-sm text-slate-500 mb-6">
        Ingresá tu email y te mandamos el link para restablecerla.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="tu@email.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Button type="submit" cargando={isSubmitting} className="w-full">
          Enviar instrucciones
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link to="/login" className="text-sm text-slate-500 hover:text-slate-700 hover:underline">
          ← Volver al inicio de sesión
        </Link>
      </div>
    </LayoutAuth>
  )
}
