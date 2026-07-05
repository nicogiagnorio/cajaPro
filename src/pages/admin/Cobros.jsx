import { useState, useEffect, useCallback } from 'react'
import {
  Plus, X, CheckCircle2, Clock, Filter, DollarSign,
  AlertTriangle, Building2, Users, Pencil, Trash2,
  CreditCard, BadgeCheck, Receipt,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'

// ─── Constantes ────────────────────────────────────────────────
const TIPOS = {
  implementacion: { label: 'Implementación',      color: 'bg-violet-100 text-violet-700' },
  abono_mensual:  { label: 'Abono mensual',       color: 'bg-blue-100 text-blue-700'    },
  mejora:         { label: 'Mejora / Desarrollo', color: 'bg-amber-100 text-amber-700'  },
}

const ESTADOS = {
  pagado:    { label: 'Pagado',    color: 'bg-emerald-100 text-emerald-700', icono: CheckCircle2 },
  pendiente: { label: 'Pendiente', color: 'bg-red-100 text-red-600',         icono: Clock        },
}

const MEDIOS_PAGO = [
  { val: 'efectivo',        label: 'Efectivo'       },
  { val: 'transferencia',   label: 'Transferencia'  },
  { val: 'tarjeta_credito', label: 'Crédito'        },
  { val: 'tarjeta_debito',  label: 'Débito'         },
  { val: 'otro',            label: 'Otro'           },
]

// ─── Helpers ───────────────────────────────────────────────────
function ars(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0)
}

function fmtFecha(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso + 'T00:00'))
}

function hoy() { return new Date().toISOString().slice(0, 10) }

// ─── Modal crear / editar cobro ────────────────────────────────
function ModalCobro({ cobro, comercios, onGuardar, onCerrar }) {
  const esEdicion  = Boolean(cobro)
  const yaEsPagado = cobro?.estado === 'pagado'

  const [form, setForm] = useState({
    comercio_id: cobro?.comercio_id ?? '',
    tipo:        cobro?.tipo        ?? 'abono_mensual',
    monto:       cobro?.monto       ?? '',
    fecha:       cobro?.fecha       ?? hoy(),
    observacion: cobro?.observacion ?? '',
    estado:      cobro?.estado      ?? 'pendiente',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState('')
  const [exito, setExito]         = useState(false)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.comercio_id) { setError('Seleccioná un comercio.'); return }
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0) {
      setError('Ingresá un monto válido mayor a 0.'); return
    }
    setGuardando(true); setError('')

    const payload = {
      comercio_id: form.comercio_id,
      tipo:        form.tipo,
      monto:       Number(form.monto),
      fecha:       form.fecha,
      observacion: form.observacion || null,
      estado:      form.estado,
    }

    const { error: err } = esEdicion
      ? await supabase.from('cajapro_cobros').update(payload).eq('id', cobro.id)
      : await supabase.from('cajapro_cobros').insert({
          comercio_id: form.comercio_id,
          tipo:        form.tipo,
          monto:       Number(form.monto),
          fecha:       form.fecha,
          observacion: form.observacion || null,
          estado:      form.estado,
        })

    setGuardando(false)
    if (err) { setError(traducirError(err)); return }
    setExito(true)
    setTimeout(() => onGuardar(), 900)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <p className="font-bold text-slate-900">{esEdicion ? 'Editar cobro' : 'Registrar cobro'}</p>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {exito ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={22} className="text-emerald-600" />
            </div>
            <p className="font-semibold text-slate-800">
              {esEdicion ? 'Cobro actualizado correctamente' : 'Cobro registrado'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">

            {/* Aviso cobro pagado */}
            {yaEsPagado && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                Este cobro ya está pagado. Podés corregir cualquier dato si fue un error.
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Comercio *</label>
              <select required value={form.comercio_id} onChange={e => set('comercio_id', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 bg-white">
                <option value="">Seleccioná...</option>
                {comercios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Tipo de cobro *</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(TIPOS).map(([val, { label }]) => (
                  <button key={val} type="button" onClick={() => set('tipo', val)}
                    className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors text-center ${
                      form.tipo === val ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Monto *</label>
                <input required type="number" min="0.01" step="0.01"
                  value={form.monto} onChange={e => set('monto', e.target.value)} placeholder="0"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Fecha *</label>
                <input required type="date"
                  value={form.fecha} onChange={e => set('fecha', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Estado</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ val: 'pendiente', label: 'Pendiente' }, { val: 'pagado', label: 'Pagado' }].map(({ val, label }) => (
                    <button key={val} type="button" onClick={() => set('estado', val)}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        form.estado === val
                          ? val === 'pagado' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Observación</label>
              <textarea value={form.observacion} onChange={e => set('observacion', e.target.value)} rows={2}
                placeholder="Mes de junio, descuento aplicado, etc."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 resize-none" />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2">
              <Button type="button" variante="secundario" onClick={onCerrar} className="flex-1">Cancelar</Button>
              <Button type="submit" cargando={guardando} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white">
                {esEdicion ? 'Guardar cambios' : 'Guardar cobro'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Modal registrar pago ──────────────────────────────────────
function ModalRegistrarPago({ cobro, comercio, onGuardar, onCerrar }) {
  const [form, setForm] = useState({
    fecha_pago:       hoy(),
    medio_pago:       'transferencia',
    comprobante:      '',
    observacion_pago: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState('')
  const [exito, setExito]         = useState(false)
  const [emailInfo, setEmailInfo] = useState(null)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.fecha_pago) { setError('Seleccioná la fecha de pago.'); return }
    setGuardando(true); setError('')

    const { error: err } = await supabase
      .from('cajapro_cobros')
      .update({
        estado:           'pagado',
        fecha_pago:       form.fecha_pago,
        medio_pago:       form.medio_pago,
        comprobante:      form.comprobante  || null,
        observacion_pago: form.observacion_pago || null,
      })
      .eq('id', cobro.id)

    setGuardando(false)
    if (err) { setError(traducirError(err)); return }

    // Enviar email de confirmación
    let emailResultado = null
    if (window.electronAPI?.enviarEmailPago) {
      try {
        const resultado = await window.electronAPI.enviarEmailPago({
          comercioNombre: comercio?.nombre ?? '',
          comercioEmail:  comercio?.email  ?? null,
          tipo:           TIPOS[cobro.tipo]?.label ?? cobro.tipo,
          monto:          cobro.monto,
          fechaPago:      form.fecha_pago,
          medioPago:      MEDIOS_PAGO.find(m => m.val === form.medio_pago)?.label ?? form.medio_pago,
          comprobante:    form.comprobante || null,
        })
        emailResultado = resultado
      } catch (e) {
        emailResultado = { ok: false, error: e.message }
      }
    }

    setExito(true)
    setEmailInfo(emailResultado)
    if (!emailResultado || emailResultado.ok) {
      setTimeout(() => onGuardar(), 2000)
    }
  }

  const tipoLabel = TIPOS[cobro.tipo]?.label ?? cobro.tipo

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-emerald-600" />
            <p className="font-bold text-slate-900">Registrar pago</p>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {exito ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <BadgeCheck size={24} className="text-emerald-600" />
            </div>
            <p className="font-semibold text-slate-800 mb-1">¡Pago registrado!</p>
            {emailInfo === null && (
              <p className="text-sm text-slate-400">Enviando email...</p>
            )}
            {emailInfo?.ok === true && (
              <p className="text-sm text-emerald-600">✓ Email enviado a {comercio?.email}</p>
            )}
            {emailInfo?.ok === false && (
              <div className="mt-3">
                <p className="text-xs text-red-500">Email no enviado: {emailInfo.error}</p>
                <button onClick={onGuardar} className="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-700">
                  Cerrar
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">

            {/* Resumen del cobro */}
            <div className="bg-slate-50 rounded-xl px-4 py-3 space-y-1">
              <p className="text-xs text-slate-500">Cobro</p>
              <p className="font-semibold text-slate-900">{tipoLabel}</p>
              <p className="text-xs text-slate-500">Cliente: <span className="font-medium text-slate-700">{comercio?.nombre ?? '—'}</span></p>
              <p className="text-xs text-slate-500">Monto: <span className="font-bold text-slate-900">{ars(cobro.monto)}</span></p>
            </div>

            {/* Fecha de pago */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Fecha de pago *</label>
              <input required type="date" value={form.fecha_pago} onChange={e => set('fecha_pago', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>

            {/* Medio de pago */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Medio de pago</label>
              <div className="grid grid-cols-3 gap-2">
                {MEDIOS_PAGO.map(({ val, label }) => (
                  <button key={val} type="button" onClick={() => set('medio_pago', val)}
                    className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                      form.medio_pago === val ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Comprobante */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Comprobante / referencia <span className="text-slate-400">(opcional)</span></label>
              <input type="text" value={form.comprobante} onChange={e => set('comprobante', e.target.value)}
                placeholder="Nro. de transferencia, recibo, etc."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>

            {/* Observación */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Observación <span className="text-slate-400">(opcional)</span></label>
              <textarea value={form.observacion_pago} onChange={e => set('observacion_pago', e.target.value)} rows={2}
                placeholder="Notas adicionales sobre el pago..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none" />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2">
              <Button type="button" variante="secundario" onClick={onCerrar} className="flex-1">Cancelar</Button>
              <Button type="submit" cargando={guardando} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                Confirmar pago ✓
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Modal confirmar eliminar ──────────────────────────────────
function ModalEliminar({ cobro, onConfirmar, onCerrar, eliminando }) {
  if (cobro.estado === 'pagado') {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-slate-900 mb-1">No podés eliminar este cobro</p>
              <p className="text-sm text-slate-600">
                No podés eliminar un cobro pagado. Si fue un error, editá la observación para aclararlo.
              </p>
            </div>
          </div>
          <Button type="button" variante="secundario" onClick={onCerrar} className="w-full">Entendido</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <div>
            <p className="font-bold text-slate-900 mb-1">¿Confirmás la eliminación?</p>
            <p className="text-sm text-slate-600">
              <span className="font-medium">{TIPOS[cobro.tipo]?.label ?? cobro.tipo}</span>
              {cobro.comercios?.nombre ? ` — ${cobro.comercios.nombre}` : ''}
              {' · '}<span className="font-semibold text-red-600">{ars(cobro.monto)}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variante="secundario" onClick={onCerrar} className="flex-1">Cancelar</Button>
          <Button type="button" cargando={eliminando} onClick={onConfirmar} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
            Sí, eliminar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────
export default function Cobros() {
  const [cobros,     setCobros]     = useState([])
  const [comercios,  setComercios]  = useState([])
  const [cargando,   setCargando]   = useState(true)
  const [tab,        setTab]        = useState('historial')

  // Modales
  const [modalCobro, setModalCobro] = useState(null)  // null | 'nuevo' | cobro
  const [modalPago,  setModalPago]  = useState(null)  // null | cobro
  const [modalElim,  setModalElim]  = useState(null)  // null | cobro
  const [eliminando, setEliminando] = useState(false)

  // Filtros
  const [filtroCom,  setFiltroCom]  = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEst,  setFiltroEst]  = useState('')
  const [filtroMes,  setFiltroMes]  = useState(() => new Date().toISOString().slice(0, 7))

  const cargar = useCallback(async () => {
    setCargando(true)
    const [{ data: comData }, { data: cobData }] = await Promise.all([
      supabase.from('comercios').select('id, nombre, email, activo').order('nombre'),
      supabase.from('cajapro_cobros')
        .select('*, comercios(id, nombre, email)')
        .order('fecha', { ascending: false }),
    ])
    setComercios(comData ?? [])
    setCobros(cobData ?? [])
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // ── KPIs ──────────────────────────────────────────────────────
  const mesLabel = new Intl.DateTimeFormat('es-AR', { month: 'long' })
    .format(new Date(filtroMes + '-01'))

  const cobrosDelMes   = cobros.filter(c => c.fecha?.startsWith(filtroMes))
  const totalMes       = cobrosDelMes.filter(c => c.estado === 'pagado').reduce((s, c) => s + Number(c.monto), 0)
  const pendienteTotal = cobros.filter(c => c.estado === 'pendiente').reduce((s, c) => s + Number(c.monto), 0)

  // Clientes al día vs con deuda
  const estadoPorComercio = comercios.map(com => {
    const cc       = cobros.filter(c => c.comercio_id === com.id)
    const pendiente = cc.some(c => c.estado === 'pendiente')
    const ultimoAbono = cc
      .filter(c => c.tipo === 'abono_mensual' && c.estado === 'pagado')
      .sort((a, b) => b.fecha.localeCompare(a.fecha))[0]

    let estadoLabel = 'sin cobros'
    let estadoColor = 'bg-slate-100 text-slate-500'
    let proximoVenc = null

    if (ultimoAbono) {
      const fechaUlt = new Date(ultimoAbono.fecha + 'T00:00')
      const prox = new Date(fechaUlt)
      prox.setMonth(prox.getMonth() + 1)
      proximoVenc = prox.toISOString().slice(0, 10)
      if (pendiente) {
        estadoLabel = 'pendiente'; estadoColor = 'bg-red-100 text-red-700'
      } else if (prox < new Date()) {
        estadoLabel = 'vencido'; estadoColor = 'bg-orange-100 text-orange-700'
      } else {
        estadoLabel = 'al día'; estadoColor = 'bg-emerald-100 text-emerald-700'
      }
    } else if (pendiente) {
      estadoLabel = 'pendiente'; estadoColor = 'bg-red-100 text-red-700'
    }

    return { ...com, estadoLabel, estadoColor, ultimoAbono, proximoVenc }
  })

  const clientesAlDia    = estadoPorComercio.filter(c => c.estadoLabel === 'al día').length
  const clientesConDeuda = estadoPorComercio.filter(c => ['pendiente','vencido'].includes(c.estadoLabel)).length

  // ── Historial filtrado ────────────────────────────────────────
  const cobrosHistorial = cobros.filter(c => {
    if (filtroCom  && c.comercio_id !== filtroCom)    return false
    if (filtroTipo && c.tipo !== filtroTipo)           return false
    if (filtroEst  && c.estado !== filtroEst)         return false
    if (filtroMes  && !c.fecha?.startsWith(filtroMes)) return false
    return true
  })
  const totalHistorial = cobrosHistorial
    .filter(c => c.estado === 'pagado')
    .reduce((s, c) => s + Number(c.monto), 0)

  async function eliminar() {
    if (!modalElim) return
    setEliminando(true)
    const { error } = await supabase.from('cajapro_cobros').delete().eq('id', modalElim.id)
    setEliminando(false)
    if (error) { alert(traducirError(error)); return }
    setModalElim(null)
    cargar()
  }

  // Busca el comercio completo para el modal de pago
  function getComercio(comercio_id) {
    return comercios.find(c => c.id === comercio_id) ?? null
  }

  return (
    <div className="p-8 max-w-5xl mx-auto pb-12 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cobros a clientes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestión de abonos, implementaciones y desarrollos.</p>
        </div>
        <Button onClick={() => setModalCobro('nuevo')} className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2">
          <Plus size={16} /> Nuevo cobro
        </Button>
      </div>

      {/* KPIs — 4 tarjetas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: `Cobrado en ${mesLabel}`,
            valor: ars(totalMes),
            color: 'text-violet-600', bg: 'bg-violet-50', Icono: DollarSign,
          },
          {
            label: 'Deuda pendiente',
            valor: ars(pendienteTotal),
            color: pendienteTotal > 0 ? 'text-red-600' : 'text-slate-500',
            bg: pendienteTotal > 0 ? 'bg-red-50' : 'bg-slate-50',
            Icono: AlertTriangle,
          },
          {
            label: 'Clientes al día',
            valor: clientesAlDia,
            color: 'text-emerald-600', bg: 'bg-emerald-50', Icono: Users,
          },
          {
            label: 'Clientes con deuda',
            valor: clientesConDeuda,
            color: clientesConDeuda > 0 ? 'text-red-600' : 'text-slate-500',
            bg: clientesConDeuda > 0 ? 'bg-red-50' : 'bg-slate-50',
            Icono: Building2,
          },
        ].map(({ label, valor, color, bg, Icono }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 border border-slate-100`}>
            <div className="flex items-center gap-2 mb-2">
              <Icono size={15} className={color} />
              <p className="text-xs text-slate-500">{label}</p>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{valor}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { val: 'historial', label: 'Historial de cobros' },
          { val: 'estado',    label: 'Estado por comercio' },
        ].map(({ val, label }) => (
          <button key={val} onClick={() => setTab(val)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === val ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="flex justify-center py-16"><Spinner size="lg" className="text-violet-500" /></div>
      ) : tab === 'historial' ? (

        /* ── Tab: Historial ─────────────────────────────────── */
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-slate-400" />
            <select value={filtroCom} onChange={e => setFiltroCom(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200">
              <option value="">Todos los comercios</option>
              {comercios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200">
              <option value="">Todos los tipos</option>
              {Object.entries(TIPOS).map(([val, { label }]) => <option key={val} value={val}>{label}</option>)}
            </select>
            <select value={filtroEst} onChange={e => setFiltroEst(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200">
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
            </select>
            <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200" />
            <span className="ml-auto text-sm font-semibold text-slate-700">
              Total cobrado: <span className="text-violet-600">{ars(totalHistorial)}</span>
            </span>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {cobros.length === 0 ? (
              <div className="py-20 text-center">
                <Receipt size={40} className="text-slate-200 mx-auto mb-4" />
                <p className="text-slate-700 font-medium mb-1">Todavía no registraste ningún cobro</p>
                <p className="text-slate-400 text-sm mb-5">Hacé clic en "Nuevo cobro" para empezar.</p>
                <Button onClick={() => setModalCobro('nuevo')} className="bg-violet-600 hover:bg-violet-700 text-white mx-auto">
                  <Plus size={15} /> Nuevo cobro
                </Button>
              </div>
            ) : cobrosHistorial.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No hay cobros para los filtros seleccionados.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Monto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Observación</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {cobrosHistorial.map(c => {
                    const tipo   = TIPOS[c.tipo]    ?? { label: c.tipo,   color: 'bg-slate-100 text-slate-600' }
                    const estado = ESTADOS[c.estado] ?? { label: c.estado, color: 'bg-slate-100 text-slate-600', icono: Clock }
                    const EstIcn = estado.icono
                    return (
                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtFecha(c.fecha)}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{c.comercios?.nombre ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tipo.color}`}>{tipo.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{ars(c.monto)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${estado.color}`}>
                            <EstIcn size={10} />{estado.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 max-w-[150px] truncate">
                          {c.observacion_pago ?? c.observacion ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            {c.estado === 'pendiente' && (
                              <button
                                onClick={() => setModalPago(c)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors whitespace-nowrap"
                                title="Registrar pago"
                              >
                                <CreditCard size={12} /> Pagar
                              </button>
                            )}
                            <button
                              onClick={() => setModalCobro(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setModalElim(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      ) : (

        /* ── Tab: Estado por comercio ─────────────────────── */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {estadoPorComercio.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No hay comercios registrados todavía.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Comercio</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado abono</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Último pago</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Próximo venc.</th>
                </tr>
              </thead>
              <tbody>
                {estadoPorComercio.map(com => (
                  <tr key={com.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${com.activo ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                        <span className="font-medium text-slate-800">{com.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${com.estadoColor}`}>
                        {com.estadoLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {com.ultimoAbono
                        ? <>{fmtFecha(com.ultimoAbono.fecha)} · {ars(com.ultimoAbono.monto)}</>
                        : <span className="text-slate-400">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {com.proximoVenc
                        ? fmtFecha(com.proximoVenc)
                        : <span className="text-slate-400">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modales */}
      {modalCobro && (
        <ModalCobro
          cobro={modalCobro === 'nuevo' ? null : modalCobro}
          comercios={comercios}
          onGuardar={() => { setModalCobro(null); cargar() }}
          onCerrar={() => setModalCobro(null)}
        />
      )}

      {modalPago && (
        <ModalRegistrarPago
          cobro={modalPago}
          comercio={getComercio(modalPago.comercio_id)}
          onGuardar={() => { setModalPago(null); cargar() }}
          onCerrar={() => setModalPago(null)}
        />
      )}

      {modalElim && (
        <ModalEliminar
          cobro={modalElim}
          eliminando={eliminando}
          onConfirmar={eliminar}
          onCerrar={() => setModalElim(null)}
        />
      )}
    </div>
  )
}
