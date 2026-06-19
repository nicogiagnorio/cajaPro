import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, X, Copy, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { traducirError } from '../../lib/errores'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'

const esquemaInvitacion = z.object({
  nombre: z.string().min(2, 'El nombre es requerido'),
  email:  z.string().email('El email no es válido'),
})

function badgeEstado(usuario) {
  if (!usuario.auth_user_id) return { texto: 'Pendiente',  clase: 'bg-amber-100 text-amber-700' }
  if (usuario.activo)        return { texto: 'Activo',     clase: 'bg-emerald-100 text-emerald-700' }
  return                            { texto: 'Inactivo',   clase: 'bg-slate-100 text-slate-500' }
}

export default function GestionUsuarios() {
  const { perfil } = useAuth()
  const [usuarios, setUsuarios]     = useState([])
  const [cargando, setCargando]     = useState(true)
  const [modalAbierto, setModal]    = useState(false)
  const [invitado, setInvitado]     = useState(null) // { nombre, email } tras crear invitación
  const [copiado, setCopiado]       = useState(false)
  const [errores, setErrores]       = useState({})  // { [userId]: mensaje }
  const [errorInvitacion, setErrorInvitacion] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(esquemaInvitacion) })

  useEffect(() => {
    cargarUsuarios()
  }, [])

  async function cargarUsuarios() {
    setCargando(true)
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: true })
    setUsuarios(data ?? [])
    setCargando(false)
  }

  async function crearInvitacion({ nombre, email }) {
    const { error } = await supabase.from('usuarios').insert({
      comercio_id: perfil.comercio_id,
      nombre,
      email,
      rol:    'cajero',
      activo: false,
    })

    if (error) {
      if (error.code === '23505') {
        throw new Error('Ya existe un usuario con ese email en este comercio')
      }
      throw new Error(traducirError(error))
    }

    setInvitado({ nombre, email })
    reset()
    cargarUsuarios()
  }

  async function toggleActivo(usuario) {
    // El admin no puede deshabilitarse a sí mismo
    if (usuario.id === perfil.id) return

    const nuevoEstado = !usuario.activo
    const { error } = await supabase
      .from('usuarios')
      .update({ activo: nuevoEstado })
      .eq('id', usuario.id)

    if (error) {
      setErrores(prev => ({ ...prev, [usuario.id]: traducirError(error) }))
      return
    }
    setUsuarios(prev =>
      prev.map(u => u.id === usuario.id ? { ...u, activo: nuevoEstado } : u)
    )
  }

  async function cambiarRol(usuario) {
    if (usuario.id === perfil.id) return

    const nuevoRol = usuario.rol === 'admin' ? 'cajero' : 'admin'
    const { error } = await supabase
      .from('usuarios')
      .update({ rol: nuevoRol })
      .eq('id', usuario.id)

    if (error) {
      setErrores(prev => ({ ...prev, [usuario.id]: traducirError(error) }))
      return
    }
    setUsuarios(prev =>
      prev.map(u => u.id === usuario.id ? { ...u, rol: nuevoRol } : u)
    )
  }

  function copiarEmail(email) {
    navigator.clipboard.writeText(email)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function cerrarModal() {
    setModal(false)
    setInvitado(null)
    setErrorInvitacion('')
    reset()
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestioná el acceso de tu equipo al comercio
          </p>
        </div>
        <Button onClick={() => setModal(true)}>
          <UserPlus size={16} />
          Invitar cajero
        </Button>
      </div>

      {/* Tabla de usuarios */}
      {cargando ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-blue-500" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                  Usuario
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                  Rol
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                  Estado
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.map(usuario => {
                const badge = badgeEstado(usuario)
                const esSelf = usuario.id === perfil.id

                return (
                  <tr key={usuario.id} className="hover:bg-slate-50 transition-colors">
                    {/* Avatar + nombre + email */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-blue-700">
                            {usuario.nombre?.[0]?.toUpperCase() ?? '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">
                            {usuario.nombre}
                            {esSelf && (
                              <span className="ml-2 text-xs text-slate-400 font-normal">(vos)</span>
                            )}
                          </p>
                          <p className="text-slate-400 text-xs">{usuario.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Rol */}
                    <td className="px-5 py-4">
                      <span className={`
                        inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold
                        ${usuario.rol === 'admin'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                        }
                      `}>
                        {usuario.rol === 'admin' ? 'Admin' : 'Cajero'}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.clase}`}>
                        {badge.texto}
                      </span>
                      {errores[usuario.id] && (
                        <p className="text-red-500 text-xs mt-1">{errores[usuario.id]}</p>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-5 py-4 text-right">
                      {!esSelf && usuario.auth_user_id && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => cambiarRol(usuario)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                          >
                            Hacer {usuario.rol === 'admin' ? 'cajero' : 'admin'}
                          </button>
                          <button
                            onClick={() => toggleActivo(usuario)}
                            className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                              usuario.activo
                                ? 'text-red-600 hover:text-red-800 hover:bg-red-50'
                                : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                            }`}
                          >
                            {usuario.activo ? 'Deshabilitar' : 'Habilitar'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}

              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-400 text-sm">
                    No hay usuarios todavía
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: invitar cajero */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header del modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Invitar cajero</h3>
              <button
                onClick={cerrarModal}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5">
              {invitado ? (
                /* Estado de éxito */
                <div className="text-center py-2">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check size={24} className="text-emerald-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">¡Invitación creada!</h4>
                  <p className="text-sm text-slate-500 mb-4">
                    Pedile a <strong>{invitado.nombre}</strong> que descargue CajaPro
                    y se registre con este email:
                  </p>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                    <span className="text-sm font-medium text-slate-700 flex-1 text-left">
                      {invitado.email}
                    </span>
                    <button
                      onClick={() => copiarEmail(invitado.email)}
                      className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                    >
                      {copiado ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    Al registrarse con ese email, el sistema lo vinculará automáticamente como cajero de tu comercio.
                  </p>
                  <Button
                    variante="secundario"
                    className="mt-5 w-full"
                    onClick={cerrarModal}
                  >
                    Listo
                  </Button>
                </div>
              ) : (
                /* Formulario de invitación */
                <form
                  onSubmit={handleSubmit(async (datos) => {
                    setErrorInvitacion('')
                    try {
                      await crearInvitacion(datos)
                    } catch (e) {
                      setErrorInvitacion(e.message)
                    }
                  })}
                  className="space-y-4"
                >
                  <p className="text-sm text-slate-500">
                    El cajero se registrará en la app con el email que indiques.
                    Una vez que confirme su cuenta, tendrá acceso al comercio.
                  </p>
                  <Input
                    label="Nombre completo"
                    placeholder="Nombre del cajero"
                    error={errors.nombre?.message}
                    {...register('nombre')}
                  />
                  <Input
                    label="Email"
                    type="email"
                    placeholder="cajero@email.com"
                    error={errors.email?.message}
                    {...register('email')}
                  />
                  {errorInvitacion && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5">
                      {errorInvitacion}
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <Button
                      type="button"
                      variante="secundario"
                      className="flex-1"
                      onClick={cerrarModal}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      cargando={isSubmitting}
                      className="flex-1"
                    >
                      Crear invitación
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
