import { useState, useEffect } from 'react'
import { CheckCircle2, Wallet } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

function ars(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 2,
  }).format(n)
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

export default function NuevoGasto() {
  const { perfil } = useAuth()
  const [categorias,  setCategorias]  = useState([])
  const [confirmado,  setConfirmado]  = useState(null)
  const [errorServer, setErrorServer] = useState('')

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      descripcion:  '',
      monto:        '',
      categoria_id: '',
      fecha:        hoy(),
      comprobante:  '',
      notas:        '',
    },
  })

  useEffect(() => {
    supabase
      .from('categorias_gastos')
      .select('id, nombre')
      .eq('comercio_id', perfil.comercio_id)
      .eq('activo', true)
      .order('nombre')
      .then(({ data, error }) => {
        if (error) console.error('categorias_gastos:', error.message)
        setCategorias(data ?? [])
      })
  }, [])

  async function onSubmit(datos) {
    setErrorServer('')
    const { error } = await supabase.from('gastos').insert({
      comercio_id:  perfil.comercio_id,
      usuario_id:   perfil.id,
      descripcion:  datos.descripcion.trim(),
      monto:        parseFloat(datos.monto),
      categoria_id: datos.categoria_id || null,
      fecha:        datos.fecha,
      comprobante:  datos.comprobante?.trim() || null,
      notas:        datos.notas?.trim()       || null,
    })

    if (error) { setErrorServer(traducirError(error)); return }

    setConfirmado({ monto: parseFloat(datos.monto), descripcion: datos.descripcion.trim() })
    reset({ descripcion: '', monto: '', categoria_id: '', fecha: hoy(), comprobante: '', notas: '' })
  }

  function nuevoGasto() {
    setConfirmado(null)
    setErrorServer('')
  }

  if (confirmado) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 max-w-sm w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">¡Gasto registrado!</h2>
          <p className="text-sm text-slate-500 mb-1">{confirmado.descripcion}</p>
          <p className="text-4xl font-bold text-slate-900 my-3">{ars(confirmado.monto)}</p>
          <Button onClick={nuevoGasto} variante="primario" className="w-full mt-4">
            <Wallet size={15} /> Registrar otro gasto
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start justify-center pt-2 sm:pt-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 w-full max-w-lg">
        <div className="flex items-center gap-2 mb-6">
          <Wallet size={18} className="text-amber-500" />
          <h2 className="font-semibold text-slate-800">Nuevo gasto</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Descripción *"
            placeholder="Ej: Luz, alquiler, limpieza..."
            error={errors.descripcion?.message}
            {...register('descripcion', { required: 'La descripción es requerida' })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Monto *"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              error={errors.monto?.message}
              {...register('monto', {
                required: 'El monto es requerido',
                min: { value: 0.01, message: 'Debe ser mayor a 0' },
              })}
            />
            <Input
              label="Fecha *"
              type="date"
              error={errors.fecha?.message}
              {...register('fecha', { required: 'La fecha es requerida' })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Categoría (opcional)" {...register('categoria_id')}>
              <option value="">— Sin categoría —</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
            <Input
              label="Comprobante (opcional)"
              placeholder="Nro. de factura o recibo"
              {...register('comprobante')}
            />
          </div>

          <Input
            label="Notas (opcional)"
            placeholder="Información adicional..."
            {...register('notas')}
          />

          {errorServer && <p className="text-sm text-red-500">{errorServer}</p>}

          <Button type="submit" cargando={isSubmitting} className="w-full mt-2">
            Registrar gasto
          </Button>
        </form>
      </div>
    </div>
  )
}
