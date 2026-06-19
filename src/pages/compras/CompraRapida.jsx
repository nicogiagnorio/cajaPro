import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Zap, FileText, CreditCard, AlertTriangle, ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

const METODOS_PAGO = [
  { value: 'efectivo',         label: 'Efectivo'      },
  { value: 'transferencia',    label: 'Transferencia' },
  { value: 'cheque',           label: 'Cheque'        },
  { value: 'cuenta_corriente', label: 'Cta. cte.'     },
  { value: 'otro',             label: 'Otro'          },
]

const TIPOS_FACTURA = ['A', 'B', 'C', 'M', 'X']

function ars(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 2,
  }).format(n)
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

export default function CompraRapida() {
  const { perfil } = useAuth()
  const navigate   = useNavigate()

  const [categorias,  setCategorias]  = useState([])
  const [proveedores, setProveedores] = useState([])
  const [confirmada,  setConfirmada]  = useState(null)
  const [errorServer, setErrorServer] = useState('')

  // Pago
  const [metodoPago,  setMetodoPago]  = useState('efectivo')
  const [pagada,      setPagada]      = useState(true)
  const [fechaPago,   setFechaPago]   = useState(hoy())

  // Factura proveedor
  const [facturada,   setFacturada]   = useState(false)
  const [tipoFact,    setTipoFact]    = useState('A')
  const [nroFact,     setNroFact]     = useState('')
  const [fechaFact,   setFechaFact]   = useState(hoy())

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { descripcion: '', monto: '', proveedor_id: '', categoria_id: '' } })

  useEffect(() => {
    Promise.all([
      supabase.from('categorias').select('id, nombre').eq('activo', true).order('nombre'),
      supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre'),
    ]).then(([{ data: cats }, { data: provs }]) => {
      setCategorias(cats   ?? [])
      setProveedores(provs ?? [])
    })
  }, [])

  async function onSubmit(datos) {
    setErrorServer('')
    const monto = parseFloat(datos.monto)

    const { error } = await supabase.from('compras').insert({
      comercio_id:             perfil.comercio_id,
      usuario_id:              perfil.id,
      tipo:                    'rapida',
      total:                   monto,
      metodo_pago:             metodoPago,
      estado:                  'recibida',
      notas:                   datos.descripcion.trim(),
      proveedor_id:            datos.proveedor_id  || null,
      categoria_id:            datos.categoria_id  || null,
      // Factura proveedor (columnas legacy + nuevas)
      facturada,
      tipo_factura_proveedor:  facturada ? tipoFact : null,
      nro_factura_proveedor:   facturada && nroFact.trim() ? nroFact.trim() : null,
      fecha_factura:           facturada && fechaFact ? fechaFact : null,
      estado_factura:          facturada ? 'con_factura' : 'sin_factura',
      numero_factura:          facturada && nroFact.trim() ? nroFact.trim() : null,
      // Pago (columnas legacy + nuevas)
      pagada,
      fecha_pago:              pagada ? fechaPago : null,
      estado_pago:             pagada ? 'pagada' : 'pendiente',
      // Compra rapida = siempre recibida (no afecta stock)
      estado_recepcion:        'recibida',
      fecha_recepcion:         hoy(),
    })

    if (error) { setErrorServer(traducirError(error)); return }

    setConfirmada({ monto, metodoPago, facturada, pagada })
    reset()
    setMetodoPago('efectivo')
    setPagada(true)
    setFechaPago(hoy())
    setFacturada(false)
    setTipoFact('A')
    setNroFact('')
    setFechaFact(hoy())
  }

  if (confirmada) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-sm w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Compra registrada</h2>
          <p className="text-4xl font-bold text-slate-900 my-3">{ars(confirmada.monto)}</p>
          <p className="text-sm text-slate-400 mb-4">
            {METODOS_PAGO.find(m => m.value === confirmada.metodoPago)?.label}
          </p>
          <div className="flex justify-center gap-2 mb-8">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
              confirmada.facturada
                ? 'bg-violet-100 text-violet-700'
                : 'bg-slate-100 text-slate-500'
            }`}>
              <FileText size={11} />
              {confirmada.facturada ? 'Con factura' : 'Sin factura'}
            </span>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
              confirmada.pagada
                ? 'bg-blue-100 text-blue-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              <CreditCard size={11} />
              {confirmada.pagada ? 'Pagada' : 'Pago pendiente'}
            </span>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/app/compras/historial')} variante="secundario" className="flex-1">
              <ArrowLeft size={15} /> Historial
            </Button>
            <Button onClick={() => setConfirmada(null)} variante="exito" className="flex-1">
              <Zap size={15} /> Nueva
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto py-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 w-full max-w-xl mx-auto">

        {/* Boton volver */}
        <button
          onClick={() => navigate('/app/compras/historial')}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-5 transition-colors"
        >
          <ArrowLeft size={14} /> Volver al historial
        </button>

        <div className="flex items-center gap-2 mb-6">
          <Zap size={18} className="text-amber-500" />
          <h2 className="font-semibold text-slate-800">Compra rapida</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-1">
            Sin afectar stock
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Basicos */}
          <Input
            label="Descripcion *"
            placeholder="Ej: Service aire acondicionado, trapo de piso..."
            error={errors.descripcion?.message}
            {...register('descripcion', { required: 'La descripcion es requerida' })}
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
          <div className="grid grid-cols-2 gap-3">
            <Select label="Proveedor (opcional)" {...register('proveedor_id')}>
              <option value="">- Sin proveedor -</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </Select>
            <Select label="Categoria (opcional)" {...register('categoria_id')}>
              <option value="">- Sin categoria -</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
          </div>

          <hr className="border-slate-100" />

          {/* Factura del proveedor */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Factura del proveedor
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={facturada}
                onChange={e => setFacturada(e.target.checked)}
                className="rounded accent-violet-600"
              />
              <span className="text-sm text-slate-700">Tiene factura del proveedor</span>
            </label>
            {facturada && (
              <div className="space-y-3 pl-5 border-l-2 border-violet-100">
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Tipo de comprobante</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {TIPOS_FACTURA.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipoFact(t)}
                        className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${
                          tipoFact === t
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Numero de factura</p>
                    <input
                      type="text"
                      placeholder="Ej: 00012345"
                      value={nroFact}
                      onChange={e => setNroFact(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Fecha de la factura</p>
                    <input
                      type="date"
                      value={fechaFact}
                      onChange={e => setFechaFact(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Estado del pago */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Estado del pago
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPagada(true)}
                className={`py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  pagada
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Pagada
              </button>
              <button
                type="button"
                onClick={() => setPagada(false)}
                className={`py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  !pagada
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Pendiente
              </button>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">
                {pagada ? 'Metodo de pago' : 'Metodo de pago previsto'}
              </p>
              <div className="grid grid-cols-3 gap-2">
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

            {pagada && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1.5">Fecha de pago</p>
                <input
                  type="date"
                  value={fechaPago}
                  onChange={e => setFechaPago(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            )}
          </div>

          {errorServer && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-800 leading-snug">{errorServer}</p>
            </div>
          )}

          <Button type="submit" cargando={isSubmitting} variante="exito" className="w-full mt-2">
            Registrar compra
          </Button>
        </form>
      </div>
    </div>
  )
}
