import { useState, useEffect } from 'react'
import { Download, RefreshCw, X } from 'lucide-react'

/**
 * Banner flotante que aparece cuando hay una nueva versión disponible.
 * Usa window.updaterAPI (expuesto por preload.cjs).
 * En desarrollo (sin Electron) no hace nada.
 */
export default function UpdateBanner() {
  const [estado, setEstado] = useState(null) // 'disponible' | 'descargando' | 'listo'
  const [progreso, setProgreso] = useState(0)
  const [info, setInfo] = useState(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!window.updaterAPI) return

    window.updaterAPI.onDisponible((info) => {
      setInfo(info)
      setEstado('disponible')
    })
    window.updaterAPI.onProgreso((p) => {
      setProgreso(Math.round(p.percent))
      setEstado('descargando')
    })
    window.updaterAPI.onListo(() => {
      setEstado('listo')
    })
  }, [])

  if (!estado || !visible) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
              {estado === 'listo'
                ? <RefreshCw size={18} />
                : <Download size={18} />
              }
            </div>
            <div className="min-w-0">
              {estado === 'disponible' && (
                <>
                  <p className="text-sm font-semibold truncate">
                    Nueva versión disponible {info?.version ? `(v${info.version})` : ''}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Se descargará automáticamente
                  </p>
                </>
              )}
              {estado === 'descargando' && (
                <>
                  <p className="text-sm font-semibold">Descargando actualización...</p>
                  <div className="mt-1.5 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full transition-all"
                      style={{ width: `${progreso}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{progreso}%</p>
                </>
              )}
              {estado === 'listo' && (
                <>
                  <p className="text-sm font-semibold">Actualización lista</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Reiniciá para instalar la nueva versión
                  </p>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => setVisible(false)}
            className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {estado === 'listo' && (
          <button
            onClick={() => window.updaterAPI.instalar()}
            className="mt-3 w-full bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
          >
            Reiniciar y actualizar
          </button>
        )}
      </div>
    </div>
  )
}
