import { useState, useEffect } from 'react'
import { Plus, Pencil, ToggleLeft, ToggleRight, Building2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

const esquema = z.object({
  nombre:    z.string().min(1, 'El nombre es requerido'),
  contacto:  z.string().optional(),
  telefono:  z.string().optional(),
  email:     z.string().optional(),
  direccion: z.string().optional(),
})

export default function Proveedores() {
  const { perfil } = useAuth()
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando]       = useState(true)
  const [modalAbierto, setModal]      = useState(false)
  const [editando, setEditando]       = useState(null)
  const [errorServer, setErrorServer] = useState('')

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(esquema),
  })

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase.from('proveedores').select('*').eq('comercio_id', perfil.comercio_id).order('nombre')
    setProveedores(data ?? [])
    setCargando(false)
  }

  function abrirCrear() {
    setEditando(null)
    reset({ nombre: '', contacto: '', telefono: '', email: '', direccion: '' })
    setErrorServer('')
    setModal(true)
  }

  function abrirEditar(prov) {
    setEditando(prov)
    reset({
      nombre:    prov.nombre,
      contacto:  prov.contacto  ?? '',
      telefono:  prov.telefono  ?? '',
      email:     prov.email     ?? '',
      direccion: prov.direccion ?? '',
    })
    setErrorServer('')
    setModal(true)
  }

  async function onSubmit(datos) {
    setErrorServer('')
    const payload = {
      nombre:    datos.nombre.trim(),
      contacto:  datos.contacto?.trim()  || null,
      telefono:  datos.telefono?.trim()  || null,
      email:     datos.email?.trim()     || null,
      direccion: datos.direccion?.trim() || null,
    }
    const { error } = editando
      ? await supabase.from('proveedores').update(payload).eq('id', editando.id)
      : await supabase.from('proveedores').insert({ ...payload, comercio_id: perfil.comercio_id })

    if (error) { setErrorServer(traducirError(error)); return }
    setModal(false)
    cargar()
  }

  async function toggleActivo(prov) {
    const { error } = await supabase.from('proveedores').update({ activo: !prov.activo }).eq('id', prov.id)
    if (error) { alert(traducirError(error)); return }
    setProveedores(prev => prev.map(p => p.id === prov.id ? { ...p, activo: !p.activo } : p))
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">{proveedores.length} proveedores</p>
        <Button onClick={abrirCrear}>
          <Plus size={16} /> Nuevo proveedor
        </Button>
      </div>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-blue-500" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Proveedor</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Contacto</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Teléfono</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {proveedores.map(prov => (
                <tr key={prov.id} className={`hover:bg-slate-50 transition-colors ${!prov.activo ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Building2 size={15} className="text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{prov.nombre}</p>
                        {prov.email && <p className="text-xs text-slate-400">{prov.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{prov.contacto ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-500">{prov.telefono ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      prov.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {prov.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => abrirEditar(prov)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => toggleActivo(prov)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        {prov.activo
                          ? <ToggleRight size={18} className="text-emerald-500" />
                          : <ToggleLeft size={18} />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {proveedores.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    No hay proveedores todavía. Agregá el primero.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModal(false)}
        titulo={editando ? 'Editar proveedor' : 'Nuevo proveedor'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Nombre *" placeholder="Ej: Distribuidora Norte" error={errors.nombre?.message} {...register('nombre')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Persona de contacto" placeholder="Nombre" {...register('contacto')} />
            <Input label="Teléfono" type="tel" placeholder="11 1234-5678" {...register('telefono')} />
          </div>
          <Input label="Email" type="email" placeholder="contacto@proveedor.com" {...register('email')} />
          <Input label="Dirección" placeholder="Calle y número" {...register('direccion')} />
          {errorServer && <p className="text-sm text-red-500">{errorServer}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variante="secundario" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" cargando={isSubmitting} className="flex-1">
              {editando ? 'Guardar cambios' : 'Crear proveedor'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
