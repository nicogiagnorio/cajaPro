import { useState, useEffect, useCallback } from 'react'
import {
  Lock, Unlock, TrendingUp, RefreshCw,
  CreditCard, Banknote, ArrowRightLeft, MoreHorizontal,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'

function ars(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 2,
  }).format(n ?? 0)
}

function formatFecha(iso) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

const METODOS = [
  { key: 'efectivo',        label: 'Efectivo',     icono: Banknote,       color: 'text-emerald-600' },
  { key: 'tarjeta_debito',  label: 'Debito',        icono: CreditCard,     color: 'text-blue-600'    },
  { key: 'tarjeta_credito', label: 'Credito',       icono: CreditCard,     color: 'text-purple-600'  },
  { key: 'transferencia',   label: 'Transferencia', icono: ArrowRightLeft, color: 'text-amber-600'   },
  { key: 'otro',            label: 'Otro',          icono: MoreHorizontal, color: 'text-slate-500'   },
]

export default function Caja() {
  const { perfil } = useAuth()
  const [cargando,    setCargando]    = useState(true)
  const [cajaAbierta, setCajaAbierta] = useState(null)
  const [resumen,     setResumen]     = useState(null)
  const [historial,   setHistorial]   = useState([])
  const [error,       setError]       = useState('')

  const cargarResumen = useCallback(async (caja) => {
    const { data: ventas } = await supabase
      .from('ventas')
      .select('total, metodo_pago')
      .eq('comercio_id', caja.comercio_id)
      .eq('estado', 'completada')
      .gte('fecha', caja.fecha_apertura)
    const r = { efectivo: 0, tarjeta_debito: 0, tarjeta_credito: 0, transferencia: 0, otro: 0, total: 0, cantidad: 0 }
    for (const v of ventas ?? []) {
      r[v.metodo_pago] = (r[v.metodo_pago] ?? 0) + Number(v.total)
      r.total   += Number(v.total)
      r.cantidad += 1
    }
    setResumen(r)
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    const [{ data: cajas, error: e1 }, { data: hist }] = await Promise.all([
      supabase
        .from('cierres_caja')
        .select('*')
        .eq('comercio_id', perfil.comercio_id)
        .eq('estado', 'abierto')
        .order('fecha_apertura', { ascending: false })
        .limit(1),
      supabase
        .from('cierres_caja')
        .select('id, fecha_apertura, fecha_cierre, fondo_inicial, total_ventas, cantidad_ventas, efectivo_contado, diferencia')
        .eq('comercio_id', perfil.comercio_id)
        .eq('estado', 'cerrado')
        .order('fecha_cierre', { ascending: false })
        .limit(15),
    ])
    if (e1) setError(traducirError(e1))
    const abierta = cajas?.[0] ?? null
    setCajaAbierta(abierta)
    setHistorial(hist ?? [])
    if (abierta) await cargarResumen(abierta)
    setCargando(false)
  }, [cargarResumen])

  useEffect(() => { cargar() }, [cargar])

  if (cargando) {
    return <div className="flex justify-center py-16"><Spinner size="lg" className="text-blue-500" /></div>
  }

  return (
    <div className="h-full overflow-y-auto pb-6 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}
      {cajaAbierta
        ? <PanelCajaAbierta
            caja={cajaAbierta}
            resumen={resumen}
            perfil={perfil}
            onActualizar={() => cargarResumen(cajaAbierta)}
            onCerrar={cargar}
            setError={setError}
          />
        : <PanelCajaCerrada perfil={perfil} onAbrir={cargar} setError={setError} />
      }
      {historial.length > 0 && <HistorialCierres historial={historial} />}
    </div>
  )
}

// ── Sin caja abierta ─────────────────────────────────────────
function PanelCajaCerrada({ perfil, onAbrir, setError }) {
  const [fondo,      setFondo]      = useState('')
  const [procesando, setProcesando] = useState(false)

  async function abrir() {
    setError('')
    setProcesando(true)
    const { error: e } = await supabase.from('cierres_caja').insert({
      comercio_id:         perfil.comercio_id,
      usuario_apertura_id: perfil.id,
      fondo_inicial:       parseFloat(fondo) || 0,
      estado:              'abierto',
    })
    if (e) { setError(traducirError(e)); setProcesando(false); return }
    setFondo('')
    await onAbrir()
    setProcesando(false)
  }

  return (
    <div className="flex items-start justify-center pt-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 w-full max-w-sm shadow-sm text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-slate-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Caja cerrada</h2>
        <p className="text-sm text-slate-400 mb-6">Abri la caja para comenzar el turno.</p>
        <div className="text-left mb-5">
          <label className="block text-sm font-medium text-slate-700 mb-1">Fondo inicial</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
            <input
              type="number" min="0" step="0.01" placeholder="0.00"
              value={fondo} onChange={e => setFondo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && abrir()}
              className="w-full pl-7 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">Efectivo disponible al iniciar el turno (puede ser 0).</p>
        </div>
        <Button onClick={abrir} cargando={procesando} variante="exito" className="w-full">
          <Unlock size={16} /> Abrir caja
        </Button>
      </div>
    </div>
  )
}

// ── Caja abierta ─────────────────────────────────────────────
function PanelCajaAbierta({ caja, resumen, perfil, onActualizar, onCerrar, setError }) {
  const [cerrandoUI,      setCerrandoUI]      = useState(false)
  const [efectivoContado, setEfectivoContado] = useState('')
  const [notas,           setNotas]           = useState('')
  const [procesando,      setProcesando]      = useState(false)

  const efectivoEsperado = (caja.fondo_inicial ?? 0) + (resumen?.efectivo ?? 0)
  const diferencia       = (parseFloat(efectivoContado) || 0) - efectivoEsperado

  async function cerrar() {
    setError('')
    setProcesando(true)
    const efectivoC = parseFloat(efectivoContado) || 0
    const { error: e } = await supabase
      .from('cierres_caja')
      .update({
        usuario_cierre_id:   perfil.id,
        fecha_cierre:        new Date().toISOString(),
        total_efectivo:      resumen?.efectivo          ?? 0,
        total_debito:        resumen?.tarjeta_debito    ?? 0,
        total_credito:       resumen?.tarjeta_credito   ?? 0,
        total_transferencia: resumen?.transferencia     ?? 0,
        total_otro:          resumen?.otro              ?? 0,
        total_ventas:        resumen?.total             ?? 0,
        cantidad_ventas:     resumen?.cantidad          ?? 0,
        efectivo_contado:    efectivoC,
        diferencia:          efectivoC - efectivoEsperado,
        notas:               notas.trim() || null,
        estado:              'cerrado',
      })
      .eq('id', caja.id)
    if (e) { setError(traducirError(e)); setProcesando(false); return }
    await onCerrar()
    setProcesando(false)
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div className="xl:col-span-2 space-y-4">

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Unlock size={22} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800">Caja abierta</p>
            <p className="text-sm text-slate-400">Desde {formatFecha(caja.fecha_apertura)}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-slate-400">Fondo inicial</p>
            <p className="font-bold text-slate-800 text-lg">{ars(caja.fondo_inicial)}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700 text-sm">Ventas del turno</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{resumen?.cantidad ?? 0} ventas</span>
              <button
                onClick={onActualizar}
                className="p-1 rounded-md text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                title="Actualizar"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {METODOS.map(({ key, label, icono: Icono, color }) => (
              <div key={key} className="flex items-center gap-3 py-1.5">
                <Icono size={15} className={`flex-shrink-0 ${color}`} />
                <span className="text-sm text-slate-600 flex-1">{label}</span>
                <span className={`font-semibold text-sm ${(resumen?.[key] ?? 0) > 0 ? color : 'text-slate-300'}`}>
                  {ars(resumen?.[key] ?? 0)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 mt-3 pt-3 flex justify-between items-center">
            <span className="font-semibold text-slate-700">Total recaudado</span>
            <span className="text-xl font-bold text-slate-900">{ars(resumen?.total ?? 0)}</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-slate-700">Efectivo esperado en caja</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {ars(caja.fondo_inicial)} fondo + {ars(resumen?.efectivo ?? 0)} en efectivo
            </p>
          </div>
          <p className="text-lg font-bold text-slate-800">{ars(efectivoEsperado)}</p>
        </div>
      </div>

      <div>
        {!cerrandoUI ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-slate-500" />
              <h3 className="font-semibold text-slate-700 text-sm">Acciones del turno</h3>
            </div>
            <Button onClick={() => setCerrandoUI(true)} variante="peligro" className="w-full">
              <Lock size={15} /> Cerrar caja
            </Button>
            <p className="text-xs text-slate-400 text-center mt-3">
              Registra los totales del turno y cierra la caja.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-slate-700 text-sm">Cierre de caja</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Efectivo contado</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                <input
                  type="number" min="0" step="0.01" placeholder="0.00" autoFocus
                  value={efectivoContado} onChange={e => setEfectivoContado(e.target.value)}
                  className="w-full pl-7 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                />
              </div>
            </div>
            {efectivoContado !== '' && (
              <div className={`rounded-xl px-4 py-3 flex justify-between items-center text-sm font-medium ${
                diferencia === 0 ? 'bg-slate-50 text-slate-600' :
                diferencia > 0  ? 'bg-emerald-50 text-emerald-700' :
                                   'bg-red-50 text-red-700'
              }`}>
                <span>{diferencia === 0 ? 'Cuadra exacto' : diferencia > 0 ? 'Sobrante' : 'Faltante'}</span>
                <span className="font-bold">{diferencia >= 0 ? '+' : ''}{ars(diferencia)}</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notas (opcional)</label>
              <textarea rows={2} placeholder="Observaciones del turno..."
                value={notas} onChange={e => setNotas(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setCerrandoUI(false)} variante="secundario" className="flex-1">Cancelar</Button>
              <Button onClick={cerrar} cargando={procesando} variante="peligro" className="flex-1">Confirmar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Historial ────────────────────────────────────────────────
function HistorialCierres({ historial }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Cierres anteriores</h3>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 font-semibold">
              <th className="text-left px-5 py-3">Apertura</th>
              <th className="text-left px-5 py-3">Cierre</th>
              <th className="text-right px-5 py-3">Ventas</th>
              <th className="text-right px-5 py-3">Total</th>
              <th className="text-right px-5 py-3">Diferencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {historial.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{formatFecha(c.fecha_apertura)}</td>
                <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                  {c.fecha_cierre ? formatFecha(c.fecha_cierre) : '---'}
                </td>
                <td className="px-5 py-3 text-right text-slate-600">{c.cantidad_ventas}</td>
                <td className="px-5 py-3 text-right font-semibold text-slate-800">{ars(c.total_ventas)}</td>
                <td className={`px-5 py-3 text-right font-semibold ${
                  c.diferencia == null ? 'text-slate-300' :
                  c.diferencia === 0  ? 'text-slate-400' :
                  c.diferencia > 0    ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {c.diferencia != null
                    ? (c.diferencia >= 0 ? '+' : '') + ars(c.diferencia)
                    : '---'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
