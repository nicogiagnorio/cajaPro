import { useEffect, useState } from 'react'
import { Building2, Plus, Pencil, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Users, Search } from 'lucide-react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

const MODULOS_LISTA = [
  { key: 'ventas',   label: 'Punto de Venta'  },
  { key: 'caja',     label: 'Caja'             },
  { key: 'compras',  label: 'Compras'          },
  { key: 'gastos',   label: 'Gastos'           },
  { key: 'clientes', label: 'Clientes'         },
  { key: 'turnos',   label: 'Turnos'           },
  { key: 'reportes', label: 'Reportes'         },
]

function fmtFecha(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
}

export default function Negocios() {
  const [negocios,      setNegocios]      = useState([])
  const [cargando,      setCargando]      = useState(true)
  const [busqueda,      setBusqueda]      = useState('')
  const [expandido,     setExpandido]     = useState(null) // id del negocio expandido
  const [usuariosMap,   setUsuariosMap]   = useState({})   // { comercioId: [usuarios] }
  const [cargandoUsers, setCargandoUsers] = useState(null)
  const [error,         setError]         = useState('')

  // Modal crear/editar
  const [modal,     setModal]     = useState(false)
  const [editando,  setEditando]  = useState(null)
  const [form,      setForm]      = useState({ nombre: '', domicilio: '', cuit: '', email: '', telefono: '' })
  const [guardando, setGuardando] = useState(false)
  const [errModal,  setErrModal]  = useState('')

  // Toggle de módulos
  const [togglingMod, setTogglingMod] = useState(null) // `${comercioId}-${key}`

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const res = await window.adminAPI.listarComercios()
    if (!res.ok) { setError(res.error); setCargando(false); return }
    setNegocios(res.data)
    setCargando(false)
  }

  async function toggleExpandido(negocio) {
    if (expandido === negocio.id) { setExpandido(null); return }
    setExpandido(negocio.id)
    if (usuariosMap[negocio.id]) return
    setCargandoUsers(negocio.id)
    const res = await window.adminAPI.listarUsuariosComercio(negocio.id)
    setUsuariosMap(prev => ({ ...prev, [negocio.id]: res.ok ? res.data : [] }))
    setCargandoUsers(null)
  }

  function abrirCrear() {
    setEditando(null)
    setForm({ nombre: '', domicilio: '', cuit: '', email: '', telefono: '' })
    setErrModal('')
    setModal(true)
  }

  function abrirEditar(n) {
    setEditando(n)
    setForm({ nombre: n.nombre ?? '', domicilio: n.domicilio ?? '', cuit: n.cuit ?? '', email: n.email ?? '', telefono: n.telefono ?? '' })
    setErrModal('')
    setModal(true)
  }

  async function guardarNegocio() {
    if (!form.nombre.trim()) { setErrModal('El nombre es requerido'); return }
    setGuardando(true)
    setErrModal('')
    const datos = {
      nombre:    form.nombre.trim(),
      domicilio: form.domicilio.trim()  || null,
      cuit:      form.cuit.trim()       || null,
      email:     form.email.trim()      || null,
      telefono:  form.telefono.trim()   || null,
    }
    const res = editando
      ? await window.adminAPI.actualizarComercio(editando.id, datos)
      : await window.adminAPI.crearComercio(datos)
    setGuardando(false)
    if (!res.ok) { setErrModal(res.error); return }
    setModal(false)
    cargar()
  }

  async function toggleActivo(negocio) {
    const res = await window.adminAPI.toggleActivoComercio(negocio.id, !negocio.activo)
    if (!res.ok) return
    setNegocios(prev => prev.map(n => n.id === negocio.id ? { ...n, activo: !n.activo } : n))
  }

  async function toggleModuloPermitido(negocio, key) {
    const tkKey = `${negocio.id}-${key}`
    setTogglingMod(tkKey)
    const actual    = negocio.modulos_permitidos ?? {}
    const permitido = actual[key] !== false // si no está o es true → permitido
    const nuevo     = { ...actual, [key]: !permitido }
    const res = await window.adminAPI.actualizarModulosPermitidos(negocio.id, nuevo)
    if (res.ok) {
      setNegocios(prev => prev.map(n =>
        n.id === negocio.id ? { ...n, modulos_permitidos: nuevo } : n
      ))
    }
    setTogglingMod(null)
  }

  const filtrados = negocios.filter(n =>
    !busqueda.trim() ||
    n.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    n.cuit?.includes(busqueda)
  )

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm">{error}</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-violet-600" />
          <h1 className="text-xl font-bold text-slate-900">Negocios</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar negocio..."
              className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 w-52"
            />
          </div>
          <Button onClick={abrirCrear} className="bg-violet-600 hover:bg-violet-700">
            <Plus size={16} /> Nuevo negocio
          </Button>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-3">{filtrados.length} negocios</p>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-violet-500" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
          <Building2 size={40} />
          <p className="text-sm">{busqueda ? 'Sin resultados' : 'No hay negocios registrados. Creá el primero.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {filtrados.map(n => {
            const abierto   = expandido === n.id
            const nUsuarios = usuariosMap[n.id]?.length ?? '—'

            return (
              <div key={n.id} className={!n.activo ? 'opacity-60' : ''}>
                {/* Fila principal */}
                <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-violet-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{n.nombre}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {[n.cuit && `CUIT ${n.cuit}`, n.email, `Alta ${fmtFecha(n.created_at)}`].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  {/* Badges de módulos activos */}
                  <div className="hidden md:flex items-center gap-1 flex-wrap max-w-[200px]">
                    {MODULOS_LISTA.map(({ key, label }) => {
                      const permitido = n.modulos_permitidos?.[key] !== false
                      const activo    = n.modulos?.[key] !== false
                      if (!permitido) return (
                        <span key={key} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 line-through">{label}</span>
                      )
                      if (!activo) return null
                      return (
                        <span key={key} className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">{label}</span>
                      )
                    })}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => abrirEditar(n)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => toggleActivo(n)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                      {n.activo
                        ? <ToggleRight size={18} className="text-emerald-500" />
                        : <ToggleLeft size={18} />}
                    </button>
                    <button onClick={() => toggleExpandido(n)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                      {abierto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {/* Panel expandido */}
                {abierto && (
                  <div className="bg-slate-50 border-t border-slate-100 px-5 py-5 space-y-5">

                    {/* Módulos permitidos */}
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Módulos habilitados por admin</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {MODULOS_LISTA.map(({ key, label }) => {
                          const permitido = n.modulos_permitidos?.[key] !== false
                          const tkKey     = `${n.id}-${key}`
                          return (
                            <button
                              key={key}
                              disabled={togglingMod === tkKey}
                              onClick={() => toggleModuloPermitido(n, key)}
                              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-colors disabled:opacity-60 disabled:cursor-wait ${
                                permitido
                                  ? 'bg-white border-violet-200 text-violet-700 hover:border-violet-400'
                                  : 'bg-slate-100 border-slate-200 text-slate-400 hover:border-slate-300'
                              }`}
                            >
                              <span className="font-medium">{label}</span>
                              {permitido
                                ? <ToggleRight size={16} className="text-violet-500 flex-shrink-0" />
                                : <ToggleLeft size={16} className="flex-shrink-0" />}
                            </button>
                          )
                        })}
                      </div>
                      <p className="text-xs text-slate-400 mt-2">Los módulos desactivados aquí quedan bloqueados para el comercio.</p>
                    </div>

                    {/* Usuarios del negocio */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Users size={14} className="text-slate-400" />
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuarios</p>
                        {cargandoUsers !== n.id && (
                          <span className="text-xs text-slate-400">({typeof nUsuarios === 'number' ? nUsuarios : '?'})</span>
                        )}
                      </div>
                      {cargandoUsers === n.id ? (
                        <Spinner size="sm" className="text-violet-500" />
                      ) : (usuariosMap[n.id] ?? []).length === 0 ? (
                        <p className="text-xs text-slate-400">Sin usuarios registrados</p>
                      ) : (
                        <div className="space-y-1.5">
                          {(usuariosMap[n.id] ?? []).map(u => (
                            <div key={u.id} className={`flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100 ${!u.activo ? 'opacity-50' : ''}`}>
                              <div>
                                <p className="text-sm font-medium text-slate-700">{u.nombre}</p>
                                <p className="text-xs text-slate-400">{u.email} · <span className="capitalize">{u.rol}</span></p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                !u.activo ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {u.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal crear/editar */}
      <Modal abierto={modal} onCerrar={() => setModal(false)} titulo={editando ? 'Editar negocio' : 'Nuevo negocio'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Nombre *</label>
            <input
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Panadería La Estrella"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">CUIT</label>
              <input
                value={form.cuit}
                onChange={e => setForm(p => ({ ...p, cuit: e.target.value }))}
                placeholder="20-12345678-9"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Teléfono</label>
              <input
                value={form.telefono}
                onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                placeholder="011-4444-5555"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Domicilio</label>
            <input
              value={form.domicilio}
              onChange={e => setForm(p => ({ ...p, domicilio: e.target.value }))}
              placeholder="Av. Siempreviva 742"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="contacto@negocio.com"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>
          {errModal && <p className="text-sm text-red-500">{errModal}</p>}
          <div className="flex gap-3 pt-1">
            <Button variante="secundario" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button
              className="flex-1 bg-violet-600 hover:bg-violet-700"
              cargando={guardando}
              onClick={guardarNegocio}
            >
              {editando ? 'Guardar cambios' : 'Crear negocio'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
