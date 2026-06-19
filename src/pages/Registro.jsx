import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { traducirError } from '../lib/errores'
import LayoutAuth from '../components/layouts/LayoutAuth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

const esquema = z.object({
  nombre_comercio: z.string().min(2, 'El nombre del comercio es requerido'),
  rubro:           z.string().optional(),
  domicilio:       z.string().optional(),
  telefono:        z.string().optional(),
  nombre_admin:    z.string().min(2, 'Tu nombre completo es requerido'),
  email:           z.string().email('El email no es válido'),
  password:        z.string().min(8, 'Mínimo 8 caracteres'),
  confirmar_password: z.string(),
}).refine(
  (d) => d.password === d.confirmar_password,
  { message: 'Las contraseñas no coinciden', path: ['confirmar_password'] }
)

const erroresAuth = {
  'User already registered': 'Ya existe una cuenta con ese email',
  'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
}

export default function Registro() {
  const [exito, setExito] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState('')

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(esquema) })

  async function onSubmit(datos) {
    setErrorGeneral('')

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: errorAuth } = await supabase.auth.signUp({
      email: datos.email,
      password: datos.password,
    })

    if (errorAuth) {
      setErrorGeneral(erroresAuth[errorAuth.message] ?? traducirError(errorAuth))
      return
    }

    // 2. Crear el comercio y el usuario admin en una transacción
    const { error: errorRpc } = await supabase.rpc('crear_comercio_con_admin', {
      p_auth_user_id:   authData.user.id,
      p_email:          datos.email,
      p_nombre_admin:   datos.nombre_admin,
      p_nombre_comercio: datos.nombre_comercio,
      p_rubro:          datos.rubro || null,
      p_domicilio:      datos.domicilio || null,
      p_telefono:       datos.telefono || null,
    })

    if (errorRpc) {
      setErrorGeneral(traducirError(errorRpc))
      return
    }

    setExito(true)
  }

  if (exito) {
    return (
      <LayoutAuth>
        <div className="text-center py-4">
          <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">¡Comercio registrado!</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Te enviamos un email a{' '}
            <strong className="text-slate-700">{getValues('email')}</strong>.
            <br />
            Confirmá tu cuenta para poder ingresar.
          </p>
          <Link
            to="/login"
            className="text-sm text-blue-600 font-medium hover:underline"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </LayoutAuth>
    )
  }

  return (
    <LayoutAuth>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Registrá tu comercio</h2>
      <p className="text-sm text-slate-500 mb-6">Empezá gratis. No se requiere tarjeta.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Sección: datos del comercio */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Tu comercio
          </p>
          <div className="space-y-3">
            <Input
              label="Nombre del comercio *"
              placeholder="Ej: Kiosco Don Pedro"
              error={errors.nombre_comercio?.message}
              {...register('nombre_comercio')}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Rubro"
                placeholder="Ej: Kiosco"
                error={errors.rubro?.message}
                {...register('rubro')}
              />
              <Input
                label="Teléfono"
                type="tel"
                placeholder="11 1234-5678"
                error={errors.telefono?.message}
                {...register('telefono')}
              />
            </div>
            <Input
              label="Domicilio"
              placeholder="Calle Falsa 123, Buenos Aires"
              error={errors.domicilio?.message}
              {...register('domicilio')}
            />
          </div>
        </div>

        {/* Separador */}
        <div className="border-t border-slate-100" />

        {/* Sección: datos del administrador */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Tu cuenta de administrador
          </p>
          <div className="space-y-3">
            <Input
              label="Nombre completo *"
              placeholder="Tu nombre y apellido"
              error={errors.nombre_admin?.message}
              {...register('nombre_admin')}
            />
            <Input
              label="Email *"
              type="email"
              placeholder="tu@email.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Contraseña *"
                type="password"
                placeholder="Mín. 8 caracteres"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
              />
              <Input
                label="Confirmar contraseña *"
                type="password"
                placeholder="Repetí la contraseña"
                autoComplete="new-password"
                error={errors.confirmar_password?.message}
                {...register('confirmar_password')}
              />
            </div>
          </div>
        </div>

        {errorGeneral && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {errorGeneral}
          </div>
        )}

        <Button
          type="submit"
          cargando={isSubmitting}
          className="w-full"
        >
          Crear comercio
        </Button>
      </form>

      <div className="mt-6 pt-4 border-t border-slate-100 text-center">
        <p className="text-sm text-slate-500">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </LayoutAuth>
  )
}
