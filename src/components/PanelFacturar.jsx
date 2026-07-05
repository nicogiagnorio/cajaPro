/**
 * PanelFacturar — Componente compartido para emitir CAE vía ARCA
 * Reutilizado en: HistorialVentas, NuevaVenta (post-cobro)
 */
import { useState } from 'react'
import { FileCheck, Loader2, AlertCircle, ReceiptText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { arca } from '../lib/arca'

const DOC_TIPOS = [
  { value: '99', label: 'Consumidor Final' },
  { value: '96', label: 'DNI'              },
  { value: '80', label: 'CUIT'             },
]

export default function PanelFacturar({ venta, onExito, onCancelar, ivaItems }) {
  const [docTipo, setDocTipo] = useState('99')
  const [docNro,  setDocNro]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function emitir() {
    setLoading(true); setError('')
    const res = await arca.solicitarCAE({
      ventaId: venta.id,
      total:   venta.total,
      docTipo: parseInt(docTipo),
      docNro:  docNro ? parseInt(docNro.replace(/\D/g, '')) : 0,
      ...(ivaItems ? { ivaItems } : {}),
    })
    if (res.ok) {
      const { error: errUpdate } = await supabase.from('ventas').update({
        cae:             res.cae,
        cae_vencimiento: res.caeVencimiento,
        tipo_factura:    res.tipoFactura,
        nro_factura:     res.nroFactura,
        punto_venta:     res.puntoVenta,
      }).eq('id', venta.id)
      if (errUpdate) {
        setError('CAE obtenido pero no se pudo guardar en la base de datos: ' + errUpdate.message)
        setLoading(false)
        return
      }
      onExito({
        cae:            res.cae,
        caeVencimiento: res.caeVencimiento,
        tipoFactura:    res.tipoFactura,
        nroFactura:     res.nroFactura,
        puntoVenta:     res.puntoVenta,
      })
    } else {
      setError(res.error)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
        <ReceiptText size={13} className="text-violet-500" /> Emitir factura ARCA
      </p>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Tipo documento</label>
          <select value={docTipo} onChange={e => setDocTipo(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200">
            {DOC_TIPOS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>

        {docTipo !== '99' && (
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Nro. documento</label>
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

        {onCancelar && (
          <button onClick={onCancelar} disabled={loading}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Cancelar
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
