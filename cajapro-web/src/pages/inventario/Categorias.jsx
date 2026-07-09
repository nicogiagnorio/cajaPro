import { useState, useEffect } from 'react'
import { Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
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
  nombre:      z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
})

export default function Categorias() {
  const { perfil } = useAuth()
  const [categorias, setCategorias] = useState([])
  const [cargando, setCargando]     = useState(true)
  const [modalAbierto, setModal]    = useState(false)
  const [editando, setEditando]     = useState(null)
  const [errorServer, setErrorServer] = useState('')

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(esquema),
  })

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase.from('categorias').select('*').eq('comercio_id', perfil.comercio_id).order('nombre')
    setCategorias(data ?? [])
    setCargando(false)
  }

  function abrirCrear() {
    setEditando(null)
    reset({ nombre: '', descripcion: '' })
    setErrorServer('')
    setModal(true)
  }

  function abrirEditar(cat) {
    setEditando(cat)
    reset({ nombre: cat.nombre, descripcion: cat.descripcion ?? '' })
    setErrorServer('')
    setModal(true)
  }

  async function onSubmit(datos) {
    setErrorServer('')
    const payload = {
      nombre:      datos.nombre.trim(),
      descripcion: datos.descripcion?.trim() || null,
    }
    const { error } = editando
      ? await supabase.from('categorias').update(payload).eq('id', editando.id)
      : await supabase.from('categorias').insert({ ...payload, comercio_id: perfil.comercio_id })

    if (error) { setErrorServer(traducirError(error)); return }
    setModal(false)
    cargar()
  }

  async function toggleActivo(cat) {
    await supabase.from('categorias').update({ activo: !cat.activo }).eq('id', cat.id)
    setCategorias(prev => prev.map(c => c.id === cat.id ? { ...c, activo: !c.activo } : c))
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">{categorias.length} categorías</p>
        <Button onClick={abrirCrear}>
          <Plus size={16} /> Nueva categoría
        </Button>
      </div>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-blue-500" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Nombre</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Descripción</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categorias.map(cat => (
                <tr key={cat.id} className={`hover:bg-slate-50 transition-colors ${!cat.activo ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3.5 font-medium text-slate-800">{cat.nombre}</td>
                  <td className="px-5 py-3.5 text-slate-500">{cat.descripcion ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      cat.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {cat.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => abrirEditar(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => toggleActivo(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        {cat.activo
                          ? <ToggleRight size={18} className="text-emerald-500" />
                          : <ToggleLeft size={18} />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categorias.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-400">
                    No hay categorías todavía. Creá la primera.
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
        titulo={editando ? 'Editar categoría' : 'Nueva categoría'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Nombre *" placeholder="Ej: Bebidas" error={errors.nombre?.message} {...register('nombre')} />
          <Input label="Descripción" placeholder="Opcional" {...register('descripcion')} />
          {errorServer && (
            <p className="text-sm text-red-500">{errorServer}</p>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="button" variante="secundario" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" cargando={isSubmitting} className="flex-1">
              {editando ? 'Guardar cambios' : 'Crear categoría'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
