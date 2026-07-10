import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
import {
  ChevronDown, ChevronRight, XCircle, RefreshCw,
  FileCheck, FileX, Loader2, AlertCircle, CheckCircle2,
  ReceiptText, CalendarDays, BarChart3, Upload, Plus, Trash2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { arca } from '../../lib/arca'
import { useAuth } from '../../context/AuthContext'
import { traducirError } from '../../lib/errores'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'

// ── Helpers ──────────────────────────────────────────────────────────────────

const METODOS = {
  efectivo:         'Efectivo',
  tarjeta_debito:   'Débito',
  tarjeta_credito:  'Crédito',
  transferencia:    'Transferencia',
  otro:             'Otro',
}

const DOC_TIPOS = [
  { value: '99', label: 'Consumidor Final' },
  { value: '96', label: 'DNI' },
  { value: '80', label: 'CUIT' },
]

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

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function rangoDia(fechaStr) {
  // Sin sufijo Z → se interpreta como hora LOCAL; toISOString() convierte a UTC
  const desde = new Date(`${fechaStr}T00:00:00`)
  const hasta = new Date(`${fechaStr}T23:59:59.999`)
  return { desde: desde.toISOString(), hasta: hasta.toISOString() }
}

// ── Paneles ARCA (facturar + NC) ──────────────────────────────────────────────

function PanelFacturar({ venta, onExito, onCancelar }) {
  const [docTipo,  setDocTipo]  = useState('99')
  const [docNro,   setDocNro]   = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function emitir() {
    setLoading(true); setError('')
    const res = await arca.solicitarCAE({
      ventaId: venta.id, total: venta.total,
      docTipo: parseInt(docTipo),
      docNro:  docNro ? parseInt(docNro.replace(/\D/g, '')) : 0,
    })
    if (res.ok) {
      const { error: errDB } = await supabase.from('ventas').update({
        cae: res.cae, cae_vencimiento: res.caeVencimiento,
        tipo_factura: res.tipoFactura, nro_factura: res.nroFactura, punto_venta: res.puntoVenta,
      }).eq('id', venta.id)
      if (errDB) { setError(`ARCA emitió el CAE (${res.cae}) pero no se pudo guardar. Anotá el CAE y contactá soporte.`); setLoading(false); return }
      onExito({ cae: res.cae, cae_vencimiento: res.caeVencimiento, tipo_factura: res.tipoFactura, nro_factura: res.nroFactura, punto_venta: res.puntoVenta })
    } else { setError(res.error) }
    setLoading(false)
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-200">
      <p className="text-xs font-semibold text-slate-700 mb-2.5 flex items-center gap-1.5">
        <ReceiptText size={13} className="text-violet-500" /> Facturar en ARCA
      </p>
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-medium">Tipo documento</label>
          <select value={docTipo} onChange={e => setDocTipo(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200">
            {DOC_TIPOS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        {docTipo !== '99' && (
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-medium">Nro. documento</label>
            <input value={docNro} onChange={e => setDocNro(e.target.value)}
              placeholder={docTipo === '80' ? 'CUIT sin guiones' : 'DNI'}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 w-36 focus:outline-none focus:ring-2 focus:ring-violet-200" />
          </div>
        )}
        <button onClick={emitir} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-60 transition-colors">
          {loading ? <Loader2 size={12} className="animate-spin" /> : <FileCheck size={12} />}
          {loading ? 'Emitiendo…' : 'Emitir factura'}
        </button>
        <button onClick={onCancelar} disabled={loading} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
      </div>
      {error && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" /><span>{error}</span>
        </div>
      )}
    </div>
  )
}

function PanelNC({ venta, onExito, onCancelar }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function emitir() {
    if (!confirm(
      `¿Emitir NC por ${ars(venta.total)}?\nEstá anulando la Factura ${venta.tipo_factura} #${String(venta.nro_factura).padStart(8, '0')} ante ARCA.`
    )) return
    setLoading(true); setError('')
    const res = await arca.solicitarNC({
      facturaOriginal: { tipo_factura: venta.tipo_factura, nro_factura: venta.nro_factura, punto_venta: venta.punto_venta },
      total: venta.total,
    })
    if (res.ok) {
      const { error: errDB } = await supabase.from('ventas').update({
        nc_cae: res.cae, nc_nro_factura: res.nroNC,
        nc_tipo_factura: res.tipoNC, nc_punto_venta: res.puntoVenta,
        nc_vencimiento: res.caeVencimiento, nc_fecha: new Date().toISOString(),
      }).eq('id', venta.id)
      if (errDB) { setError(`ARCA emitió la NC (CAE: ${res.cae}) pero no se pudo guardar. Anotá el CAE y contactá soporte.`); setLoading(false); return }
      onExito({ nc_cae: res.cae, nc_nro_factura: res.nroNC, nc_tipo_factura: res.tipoNC, nc_vencimiento: res.caeVencimiento })
    } else { setError(res.error) }
    setLoading(false)
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-200">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-2">
        <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5"><FileX size={13} />Generar Nota de Crédito</p>
        <p className="text-xs text-amber-700">
          La NC anulará la Factura {venta.tipo_factura} #{String(venta.nro_factura).padStart(8, '0')} por <strong>{ars(venta.total)}</strong>. No reversible.
        </p>
        <div className="flex gap-2">
          <button onClick={emitir} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-60 transition-colors">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <FileX size={12} />}
            {loading ? 'Emitiendo…' : 'Confirmar y emitir NC'}
          </button>
          <button onClick={onCancelar} disabled={loading} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
        </div>
      </div>
      {error && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" /><span>{error}</span>
        </div>
      )}
    </div>
  )
}

// ── Componente de tabla de ventas ─────────────────────────────────────────────

function TablaVentas({ ventas, onCancelar, onActualizar }) {
  const [expandida,    setExpandida]    = useState(null)
  const [items,        setItems]        = useState({})
  const [cargandoItem, setCargandoItem] = useState(null)
  const [cancelando,   setCancelando]   = useState(null)
  const [arcaPanel,    setArcaPanel]    = useState({})

  async function toggleDetalle(venta) {
    if (expandida === venta.id) { setExpandida(null); return }
    setExpandida(venta.id)
    if (venta.tipo === 'rapida' || venta.tipo === 'importada' || items[venta.id]) return
    setCargandoItem(venta.id)
    const { data } = await supabase.from('ventas_items')
      .select('id, nombre_producto, cantidad, precio_unitario, subtotal')
      .eq('venta_id', venta.id).order('nombre_producto')
    setItems(p => ({ ...p, [venta.id]: data ?? [] }))
    setCargandoItem(null)
  }

  async function cancelar(venta) {
    if (!confirm(`¿Cancelar la venta #${venta.numero ?? venta.id.slice(0, 8)}?`)) return
    setCancelando(venta.id)
    const { error } = await supabase.from('ventas').update({ estado: 'cancelada' }).eq('id', venta.id)
    setCancelando(null)
    if (error) { alert(traducirError(error)); return }
    onActualizar(venta.id, { estado: 'cancelada' })
  }

  if (ventas.length === 0) {
    return <p className="text-center text-slate-400 text-sm py-10">Sin ventas para este día.</p>
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="w-8 px-4 py-3" />
            <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">#</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Hora</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Pago</th>
            <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Total</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Estado</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Factura</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ventas.map(venta => (
            <Fragment key={venta.id}>
              <tr
                className={`hover:bg-slate-50 transition-colors cursor-pointer ${venta.estado === 'cancelada' ? 'opacity-50' : ''}`}
                onClick={() => toggleDetalle(venta)}>
                <td className="px-4 py-3 text-slate-400">
                  {expandida === venta.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </td>
                <td className="px-4 py-3 font-mono text-slate-600 text-xs">
                  {venta.numero ? `#${venta.numero}` : `…${venta.id.slice(-5)}`}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                  {new Date(venta.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{METODOS[venta.metodo_pago] ?? venta.metodo_pago}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">{ars(venta.total)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    venta.estado === 'completada' ? 'bg-emerald-100 text-emerald-700'
                    : venta.estado === 'cancelada' ? 'bg-red-100 text-red-600'
                    : 'bg-amber-100 text-amber-700'
                  }`}>{venta.estado}</span>
                </td>
                <td className="px-4 py-3">
                  {venta.nc_cae ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">
                      <FileX size={10} />NC {venta.nc_tipo_factura} #{String(venta.nc_nro_factura ?? 0).padStart(8, '0')}
                    </span>
                  ) : venta.cae ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-100 text-violet-700"
                      title={`CAE: ${venta.cae}`}>
                      <FileCheck size={10} />Fac.&nbsp;{venta.tipo_factura} #{String(venta.nro_factura ?? 0).padStart(8, '0')}
                    </span>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                  {venta.estado === 'completada' && (
                    <button onClick={() => cancelar(venta)} disabled={cancelando === venta.id}
                      className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                      <XCircle size={15} />
                    </button>
                  )}
                </td>
              </tr>

              {expandida === venta.id && (
                <tr key={`d-${venta.id}`}>
                  <td colSpan={8} className="px-8 py-4 bg-slate-50 border-b border-slate-100">
                    {(venta.tipo === 'rapida' || venta.tipo === 'importada') ? (
                      <p className="text-xs text-slate-600">
                        <span className="text-slate-400 mr-2">Descripción:</span>{venta.notas ?? '—'}
                      </p>
                    ) : cargandoItem === venta.id ? (
                      <Spinner size="sm" className="text-blue-400" />
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-400">
                            <th className="text-left pb-2 font-semibold">Producto</th>
                            <th className="text-right pb-2 font-semibold">P. unit.</th>
                            <th className="text-right pb-2 font-semibold">Cant.</th>
                            <th className="text-right pb-2 font-semibold">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(items[venta.id] ?? []).map(it => (
                            <tr key={it.id}>
                              <td className="py-1.5 text-slate-700">{it.nombre_producto}</td>
                              <td className="py-1.5 text-right text-slate-500">{ars(it.precio_unitario)}</td>
                              <td className="py-1.5 text-right text-slate-500">{it.cantidad}</td>
                              <td className="py-1.5 text-right font-medium text-slate-700">{ars(it.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {venta.cae && (
                      <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500 space-y-0.5">
                        <p className="font-semibold text-slate-600">Factura {venta.tipo_factura} #{String(venta.nro_factura ?? 0).padStart(8,'0')}</p>
                        <p><span className="text-slate-400">CAE:</span> <span className="font-mono">{venta.cae}</span></p>
                        {venta.cae_vencimiento && <p><span className="text-slate-400">Vto.:</span> {venta.cae_vencimiento}</p>}
                      </div>
                    )}
                    {venta.nc_cae && (
                      <div className="mt-3 pt-3 border-t border-slate-200 text-xs space-y-0.5">
                        <p className="flex items-center gap-1 text-red-600 font-semibold">
                          <CheckCircle2 size={12} />NC emitida — Nota de Crédito {venta.nc_tipo_factura} #{String(venta.nc_nro_factura ?? 0).padStart(8,'0')}
                        </p>
                        <p className="text-slate-500"><span className="text-slate-400">CAE-NC:</span> <span className="font-mono">{venta.nc_cae}</span></p>
                      </div>
                    )}

                    {venta.estado === 'completada' && (
                      <>
                        {arcaPanel[venta.id] === 'facturar' && (
                          <PanelFacturar venta={venta}
                            onExito={d => { onActualizar(venta.id, d); setArcaPanel(p => ({ ...p, [venta.id]: null })) }}
                            onCancelar={() => setArcaPanel(p => ({ ...p, [venta.id]: null }))} />
                        )}
                        {arcaPanel[venta.id] === 'nc' && (
                          <PanelNC venta={venta}
                            onExito={d => { onActualizar(venta.id, d); setArcaPanel(p => ({ ...p, [venta.id]: null })) }}
                            onCancelar={() => setArcaPanel(p => ({ ...p, [venta.id]: null }))} />
                        )}
                        {!arcaPanel[venta.id] && (
                          <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2 flex-wrap">
                            {!venta.cae && !venta.nc_cae && (
                              <button onClick={() => setArcaPanel(p => ({ ...p, [venta.id]: 'facturar' }))}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors">
                                <FileCheck size={12} />Facturar en ARCA
                              </button>
                            )}
                            {venta.cae && !venta.nc_cae && (
                              <button onClick={() => setArcaPanel(p => ({ ...p, [venta.id]: 'nc' }))}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
                                <FileX size={12} />Generar NC
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Tab 1: Vista por día ──────────────────────────────────────────────────────

function TabDia() {
  const [fecha,    setFecha]    = useState(hoyISO())
  const [ventas,   setVentas]   = useState([])
  const [cargando, setCargando] = useState(false)

  const cargar = useCallback(async (f) => {
    setCargando(true)
    const { desde, hasta } = rangoDia(f)
    const { data } = await supabase.from('ventas')
      .select(`
        id, numero, fecha, total, subtotal, descuento,
        metodo_pago, estado, tipo, notas,
        cae, cae_vencimiento, tipo_factura, nro_factura, punto_venta,
        nc_cae, nc_nro_factura, nc_tipo_factura, nc_vencimiento,
        usuarios(nombre)
      `)
      .gte('fecha', desde).lte('fecha', hasta)
      .order('fecha', { ascending: false })
    setVentas(data ?? [])
    setCargando(false)
  }, [])

  useEffect(() => { cargar(fecha) }, [fecha, cargar])

  function actualizarVenta(id, cambios) {
    setVentas(prev => prev.map(v => v.id === id ? { ...v, ...cambios } : v))
  }

  const completadas = ventas.filter(v => v.estado === 'completada')
  const totalDia    = completadas.reduce((s, v) => s + Number(v.total), 0)
  const facturadas  = completadas.filter(v => v.cae && !v.nc_cae).length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <CalendarDays size={15} className="text-slate-400" />
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="text-sm font-medium text-slate-700 focus:outline-none bg-transparent"
          />
        </div>
        <button onClick={() => cargar(fecha)}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-colors shadow-sm">
          <RefreshCw size={14} />
        </button>

        {!cargando && completadas.length > 0 && (
          <div className="flex gap-3 ml-auto">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 text-center">
              <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wide">Total del día</p>
              <p className="text-base font-bold text-blue-700">{ars(totalDia)}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-center">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Ventas</p>
              <p className="text-base font-bold text-slate-700">{completadas.length}</p>
            </div>
            <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-2 text-center">
              <p className="text-[10px] text-violet-500 font-semibold uppercase tracking-wide">Facturadas</p>
              <p className="text-base font-bold text-violet-700">{facturadas}</p>
            </div>
          </div>
        )}
      </div>

      {cargando ? (
        <div className="flex justify-center py-16"><Spinner size="lg" className="text-blue-500" /></div>
      ) : (
        <TablaVentas ventas={ventas} onActualizar={actualizarVenta} />
      )}
    </div>
  )
}

// ── Tab 2: Importar ventas anteriores ────────────────────────────────────────

const FORM_VACIO = {
  fecha:         hoyISO(),
  hora:          '12:00',
  total:         '',
  metodo_pago:   'efectivo',
  notas:         '',
  facturada:     null,
  tipo_factura:  'C',
  nro_factura:   '',
  punto_venta:   '1',
  cae:           '',
}

function TabImportar() {
  const { perfil } = useAuth()
  const [form,       setForm]       = useState(FORM_VACIO)
  const [pendientes, setPendientes] = useState([])
  const [guardando,  setGuardando]  = useState(false)
  const [exito,      setExito]      = useState(0)
  const [error,      setError]      = useState('')

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function agregarAPendientes() {
    if (!form.total || isNaN(parseFloat(form.total)) || parseFloat(form.total) <= 0) {
      setError('Ingresá un monto válido.'); return
    }
    if (form.facturada === null) {
      setError('Indicá si la venta fue facturada o no.'); return
    }
    if (form.facturada && !form.tipo_factura) {
      setError('Indicá el tipo de factura.'); return
    }
    setError('')
    setPendientes(p => [...p, { ...form, _key: Date.now() }])
    setForm(p => ({ ...p, total: '', notas: '', nro_factura: '', cae: '' }))
  }

  function quitar(key) {
    setPendientes(p => p.filter(x => x._key !== key))
  }

  async function importarTodo() {
    if (pendientes.length === 0) return
    setGuardando(true); setError('')
    const filas = pendientes.map(f => ({
      comercio_id: perfil.comercio_id,
      usuario_id:  perfil.id,
      subtotal:    parseFloat(f.total),
      descuento:   0,
      total:       parseFloat(f.total),
      metodo_pago: f.metodo_pago,
      estado:      'completada',
      tipo:        'rapida',
      notas:       f.notas || '[Importada]',
      fecha:       `${f.fecha}T${f.hora}:00`,
      cae:             f.facturada && f.cae          ? f.cae          : null,
      tipo_factura:    f.facturada && f.tipo_factura ? f.tipo_factura : null,
      nro_factura:     f.facturada && f.nro_factura  ? parseInt(f.nro_factura) : null,
      punto_venta:     f.facturada && f.punto_venta  ? parseInt(f.punto_venta) : null,
    }))
    const { error: err } = await supabase.from('ventas').insert(filas)
    if (err) { setError(err.message); setGuardando(false); return }
    setExito(pendientes.length)
    setPendientes([])
    setTimeout(() => setExito(0), 4000)
    setGuardando(false)
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {exito > 0 && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
          <CheckCircle2 size={16} />{exito} venta{exito !== 1 ? 's' : ''} importada{exito !== 1 ? 's' : ''} correctamente.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
          <Upload size={15} className="text-blue-500" />Agregar venta histórica
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label className="text-xs font-medium text-slate-500">Fecha *</label>
            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Hora</label>
            <input type="time" value={form.hora} onChange={e => set('hora', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Total *</label>
            <input type="number" step="0.01" min="0" value={form.total} onChange={e => set('total', e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Método de pago</label>
            <select value={form.metodo_pago} onChange={e => set('metodo_pago', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
              {Object.entries(METODOS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Descripción / notas</label>
          <input value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Producto o descripción de la venta"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">¿Fue facturada electrónicamente (ARCA/AFIP)? *</label>
          <div className="flex gap-2">
            {[{ v: true, l: 'Sí, tiene factura electrónica', cls: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
              { v: false, l: 'No, sin factura electrónica', cls: 'border-slate-300 bg-slate-50 text-slate-700' }
            ].map(({ v, l, cls }) => (
              <button key={String(v)} type="button" onClick={() => set('facturada', v)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium border-2 transition-all ${
                  form.facturada === v ? cls : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                }`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {form.facturada === true && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-violet-700">Datos de la factura electrónica (opcionales pero recomendados)</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Tipo</label>
                <select value={form.tipo_factura} onChange={e => set('tipo_factura', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 bg-white">
                  {['A','B','C'].map(t => <option key={t} value={t}>Factura {t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Punto de venta</label>
                <input type="number" value={form.punto_venta} onChange={e => set('punto_venta', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Nro. comprobante</label>
                <input type="number" value={form.nro_factura} onChange={e => set('nro_factura', e.target.value)}
                  placeholder="Ej: 1"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200" />
              </div>
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="text-xs font-medium text-slate-500">CAE</label>
                <input value={form.cae} onChange={e => set('cae', e.target.value)} placeholder="Código de 14 dígitos"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 font-mono text-xs" />
              </div>
            </div>
          </div>
        )}
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle size={12} />{error}
          </p>
        )}
        <button onClick={agregarAPendientes}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          <Plus size={15} />Agregar a la lista
        </button>
      </div>

      {pendientes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">
              {pendientes.length} venta{pendientes.length !== 1 ? 's' : ''} listas para importar
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {pendientes.map(f => (
              <div key={f._key} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{ars(parseFloat(f.total))}</span>
                    <span className="text-xs text-slate-400">{f.fecha} {f.hora}</span>
                    <span className="text-xs text-slate-500">{METODOS[f.metodo_pago]}</span>
                    {f.notas && <span className="text-xs text-slate-400 truncate max-w-[200px]">{f.notas}</span>}
                    {f.facturada ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
                        <FileCheck size={10} />Fac. {f.tipo_factura}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Sin factura
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => quitar(f._key)}
                  className="p-1.5 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
            <Button onClick={importarTodo} cargando={guardando} variante="exito">
              Importar {pendientes.length} venta{pendientes.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab 3: Gráficos por mes ───────────────────────────────────────────────────

function BarraDoble({ label, totalFact, totalSinFact, maxTotal }) {
  const pctFact    = maxTotal > 0 ? (totalFact    / maxTotal) * 100 : 0
  const pctSinFact = maxTotal > 0 ? (totalSinFact / maxTotal) * 100 : 0
  const total      = totalFact + totalSinFact
  return (
    <div className="group relative flex items-end gap-0.5 flex-1">
      {total > 0 && (
        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 text-center space-y-0.5">
          <p className="font-semibold capitalize">{label}</p>
          <p className="text-emerald-300">Facturado: {ars(totalFact)}</p>
          <p className="text-slate-300">Sin facturar: {ars(totalSinFact)}</p>
          <p className="text-white font-bold">Total: {ars(total)}</p>
        </div>
      )}
      <div className="flex-1 flex flex-col justify-end" style={{ height: '160px' }}>
        <div className="w-full rounded-t bg-emerald-500 group-hover:bg-emerald-400 transition-colors"
          style={{ height: `${pctFact}%`, minHeight: totalFact > 0 ? '3px' : '0' }} />
      </div>
      <div className="flex-1 flex flex-col justify-end" style={{ height: '160px' }}>
        <div className="w-full rounded-t bg-slate-300 group-hover:bg-slate-400 transition-colors"
          style={{ height: `${pctSinFact}%`, minHeight: totalSinFact > 0 ? '3px' : '0' }} />
      </div>
    </div>
  )
}

function TabGraficos() {
  const { perfil } = useAuth()
  const [datos,    setDatos]    = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!perfil?.comercio_id) return
    async function cargar() {
      setCargando(true)
      const desde = new Date()
      desde.setMonth(desde.getMonth() - 23)
      desde.setDate(1)
      const { data } = await supabase.from('ventas')
        .select('fecha, total, cae, nc_cae')
        .eq('comercio_id', perfil.comercio_id)
        .eq('estado', 'completada')
        .gte('fecha', desde.toISOString())
        .order('fecha', { ascending: true })
      setDatos(data ?? [])
      setCargando(false)
    }
    cargar()
  }, [perfil?.comercio_id])

  const mesesData = useMemo(() => {
    const map = {}
    for (const v of datos) {
      const d    = new Date(v.fecha)
      const ym   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const lbl  = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
      if (!map[ym]) map[ym] = { ym, label: lbl, facturadas: 0, noFacturadas: 0, ncEmitidas: 0 }
      const monto = Number(v.total)
      if (v.cae && !v.nc_cae) map[ym].facturadas    += monto
      else if (v.nc_cae)       map[ym].ncEmitidas    += monto
      else                     map[ym].noFacturadas   += monto
    }
    return Object.values(map).sort((a, b) => a.ym.localeCompare(b.ym))
  }, [datos])

  const maxTotal        = useMemo(() => Math.max(...mesesData.map(m => m.facturadas + m.noFacturadas + m.ncEmitidas), 1), [mesesData])
  const totalGlobal     = useMemo(() => datos.reduce((s, v) => s + Number(v.total), 0), [datos])
  const totalFacturadas = useMemo(() => datos.filter(v => v.cae && !v.nc_cae).reduce((s, v) => s + Number(v.total), 0), [datos])
  const totalNoFact     = useMemo(() => datos.filter(v => !v.cae).reduce((s, v) => s + Number(v.total), 0), [datos])
  const pctFacturado    = totalGlobal > 0 ? (totalFacturadas / totalGlobal) * 100 : 0

  if (cargando) return <div className="flex justify-center py-16"><Spinner size="lg" className="text-blue-500" /></div>
  if (mesesData.length === 0) return <p className="text-center text-slate-400 text-sm py-16">Sin datos de ventas para mostrar.</p>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total período', valor: totalGlobal,       color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-100'    },
          { label: 'Facturadas',    valor: totalFacturadas,    color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-100' },
          { label: 'Sin facturar',  valor: totalNoFact,        color: 'text-slate-700',   bg: 'bg-slate-50',    border: 'border-slate-200'   },
          { label: '% Facturado',   valor: `${pctFacturado.toFixed(0)}%`, color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-100' },
        ].map(({ label, valor, color, bg, border }) => (
          <div key={label} className={`${bg} border ${border} rounded-2xl p-4`}>
            <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{typeof valor === 'number' ? ars(valor) : valor}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Ventas por mes</h2>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" />Facturadas</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-300 inline-block" />Sin factura</span>
          </div>
        </div>
        <div className="flex items-end gap-1" style={{ height: '160px' }}>
          {mesesData.map(m => (
            <BarraDoble key={m.ym} label={m.label} totalFact={m.facturadas} totalSinFact={m.noFacturadas + m.ncEmitidas} maxTotal={maxTotal} />
          ))}
        </div>
        <div className="flex gap-1 mt-2">
          {mesesData.map(m => (
            <div key={m.ym} className="flex-1 text-center">
              <span className="text-[9px] text-slate-400 capitalize">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Detalle mensual</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mes</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-emerald-600 uppercase tracking-wide">Facturadas</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sin factura</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-blue-600 uppercase tracking-wide">Total</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">% fac.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...mesesData].reverse().map(m => {
              const total = m.facturadas + m.noFacturadas + m.ncEmitidas
              const pct   = total > 0 ? (m.facturadas / total) * 100 : 0
              return (
                <tr key={m.ym} className="hover:bg-slate-50">
                  <td className="px-5 py-3 capitalize font-medium text-slate-700">{m.label}</td>
                  <td className="px-5 py-3 text-right text-emerald-700 font-medium">{ars(m.facturadas)}</td>
                  <td className="px-5 py-3 text-right text-slate-500">{ars(m.noFacturadas + m.ncEmitidas)}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-800">{ars(total)}</td>
                  <td className="px-5 py-3 text-right text-slate-400 text-xs">{pct.toFixed(0)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'dia',      label: 'Por día',  icono: CalendarDays },
  { id: 'importar', label: 'Importar', icono: Upload       },
  { id: 'graficos', label: 'Gráficos', icono: BarChart3    },
]

export default function HistorialVentas() {
  const [tab, setTab] = useState('dia')

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex gap-0.5 bg-slate-100 p-1 rounded-xl mb-4 flex-shrink-0 w-fit">
        {TABS.map(({ id, label, icono: Icono }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <Icono size={13} />{label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto pb-4">
        {tab === 'dia'      && <TabDia />}
        {tab === 'importar' && <TabImportar />}
        {tab === 'graficos' && <TabGraficos />}
      </div>
    </div>
  )
}
