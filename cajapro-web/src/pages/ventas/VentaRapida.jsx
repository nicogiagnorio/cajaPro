import { useState, useEffect } from 'react'
import { CheckCircle2, Zap, Printer } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { imprimirTicket } from '../../lib/imprimirTicket'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

const METODOS_PAGO = [
  { value: 'efectivo',        label: 'Efectivo'      },
  { value: 'tarjeta_debito',  label: 'Débito'        },
  { value: 'tarjeta_credito', label: 'Crédito'       },
  { value: 'transferencia',   label: 'Transferencia' },
  { value: 'otro',            label: 'Otro'          },
]

function ars(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 2,
  }).format(n)
}

export default function VentaRapida() {
  const { perfil, comercio } = useAuth()
  const [categorias,  setCategorias]  = useState([])
  const [clientes,    setClientes]    = useState([])
  const [metodoPago,  setMetodoPago]  = useState('efectivo')
  const [confirmada,  setConfirmada]  = useState(null)
  const [errorServer, setErrorServer] = useState('')

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { descripcion: '', monto: '', categoria_id: '', cliente_id: '' } })

  useEffect(() => {
    supabase
      .from('categorias')
      .select('id, nombre')
      .eq('comercio_id', perfil.comercio_id)
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => setCategorias(data ?? []))

    supabase
      .from('clientes')
      .select('id, nombre')
      .eq('comercio_id', perfil.comercio_id)
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => setClientes(data ?? []))
  }, [])

  async function onSubmit(datos) {
    setErrorServer('')
    const monto = parseFloat(datos.monto)

    const { data: ventaGuardada, error } = await supabase
      .from('ventas')
      .insert({
        comercio_id:  perfil.comercio_id,
        usuario_id:   perfil.id,
        tipo:         'rapida',
        subtotal:     monto,
        descuento:    0,
        total:        monto,
        metodo_pago:  metodoPago,
        estado:       'completada',
        notas:        datos.descripcion.trim(),
        categoria_id: datos.categoria_id || null,
        cliente_id:   datos.cliente_id   || null,
      })
      .select('id, numero')
      .single()

    if (error) { setErrorServer(traducirError(error)); return }
    if (!ventaGuardada) { setErrorServer('La venta no se guardó. Revisá la conexión e intentá de nuevo.'); return }

    const clienteSeleccionado = clientes.find(c => c.id === datos.cliente_id)
    setConfirmada({
      numero:        ventaGuardada.numero,
      monto,
      metodoPago,
      descripcion:   datos.descripcion.trim(),
      clienteNombre: clienteSeleccionado?.nombre ?? null,
    })
    reset()
    setMetodoPago('efectivo')
  }

  function nuevaVenta() {
    setConfirmada(null)
    setErrorServer('')
  }

  if (confirmada) {
    return (
      <div className="h-full flex items-center justify-center p-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 max-w-sm w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">¡Venta registrada!</h2>
          {confirmada.numero && (
            <p className="text-slate-400 text-sm mb-1">Ticket #{confirmada.numero}</p>
          )}
          <p className="text-4xl font-bold text-slate-900 my-3">{ars(confirmada.monto)}</p>
          <p className="text-sm text-slate-400 mb-8">
            {METODOS_PAGO.find(m => m.value === confirmada.metodoPago)?.label}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => imprimirTicket({
                comercioNombre:    comercio?.nombre,
                comercioDomicilio: comercio?.domicilio,
                comercioTelefono:  comercio?.telefono,
                comercioCuit:      comercio?.cuit,
                descripcion:       confirmada.descripcion,
                subtotal:          confirmada.monto,
                total:             confirmada.monto,
                metodoPago:        confirmada.metodoPago,
                clienteNombre:     confirmada.clienteNombre,
              })}
              variante="secundario"
              className="w-full"
            >
              <Printer size={15} /> Imprimir ticket
            </Button>
            <Button onClick={nuevaVenta} variante="exito" className="w-full">
              <Zap size={15} /> Nueva venta rápida
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto flex items-start justify-center pt-2 sm:pt-4 pb-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <Zap size={18} className="text-amber-500" />
          <h2 className="font-semibold text-slate-800">Venta rápida</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-1">
            Sin afectar stock
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Descripción *"
            placeholder="Ej: Caramelo, bolsa de nylon, servicio..."
            error={errors.descripcion?.message}
            {...register('descripcion', { required: 'La descripción es requerida' })}
          />
          <Input
            label="Monto *"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            error={errors.monto?.message}
            {...register('monto', {
              required: 'El monto es requerido',
              min: { value: 0.01, message: 'El monto debe ser mayor a 0' },
            })}
          />
          <Select label="Categoría (opcional)" {...register('categoria_id')}>
            <option value="">— Sin categoría —</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Select>

          {clientes.length > 0 && (
            <Select label="Cliente (opcional)" {...register('cliente_id')}>
              <option value="">— Sin cliente —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
          )}

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Medio de pago</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {METODOS_PAGO.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMetodoPago(m.value)}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                    metodoPago === m.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {errorServer && <p className="text-sm text-red-500">{errorServer}</p>}

          <Button type="submit" cargando={isSubmitting} variante="exito" className="w-full mt-2">
            Registrar venta
          </Button>
        </form>
      </div>
    </div>
  )
}
