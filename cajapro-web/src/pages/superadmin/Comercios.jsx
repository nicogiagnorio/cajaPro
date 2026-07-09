import { useState, useEffect, useMemo } from 'react'
import {
  Building2, Plus, Pencil, Search, ChevronDown, ChevronUp,
  Users, ToggleLeft, ToggleRight, CheckCircle2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { traducirError } from '../../lib/errores'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

const MODULOS_LISTA = [
  { key: 'ventas',   label: 'Punto de Venta' },
  { key: 'caja',     label: 'Caja'           },
  { key: 'compras',  label: 'Compras'        },
  { key: 'gastos',   label: 'Gastos'         },
  { key: 'clientes', label: 'Clientes'       },
  { key: 'turnos',   label: 'Turnos'         },
  { key: 'reportes', label: 'Reportes'       },
]

function fmtFecha(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(iso))
}

export default function Comercios() {
  const [comercios,      setComercio]      = useState([])
  const [cargando,       setCargando]      = useState(true)
  const [busqueda,       setBusqueda]      = useState('')
  const [expandido,      setExpandido]     = useState(null)
  const [usuariosMap,    setUsuariosMap]   = useState({})
  const [cargandoUsers,  setCargandoUsers] = useState(null)
  const [error,          setError]         = useState('')
  const [togglingMod,    setTogglingMod]   = useState(null)

  // Modal crear/editar
  const [modal,     setModal]     = useState(false)
  const [editando,  setEditando]  = useState(null)
  const [form,      setForm]      = useState({ nombre: '', domicilio: '', cuit: '', email: '', telefono: '' })
  const [guardando, setGuardando] = useState(false)
  const [errModal,  setErrModal]  = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const { data, error: e } = await supabase
      .from('comercios')
      .select('id, nombre, domicilio, telefono, email, cuit, rubro, activo, modulos, created_at')
      .order('created_at', { ascending: false })
    if (e) setError(traducirError(e))
    setComercio(data ?? [])
    setCargando(false)
  }

  async function cargarUsuarios(comercioId) {
    if (usuariosMap[comercioId]) return
    setCargandoUsers(comercioId)
    const { data } = await supabase
      .from('usuarios')
      .select('id, nombre, email, rol, activo')
      .eq('comercio_id', comercioId)
      .order('nombre')
    setUsuariosMap((prev) => ({ ...prev, [comercioId]: data ?? [] }))
    setCargandoUsers(null)
  }

  function toggleExpandido(id) {
    if (expandido === id) {
      setExpandido(null)
    } else {
      setExpandido(id)
      cargarUsuarios(id)
    }
  }

  async function toggleActivo(comercio) {
    const { error: e } = await supabase
      .from('comercios')
      .update({ activo: !comercio.activo })
      .eq('id', comercio.id)
    if (!e) setComercio((prev) => prev.map((c) => c.id === comercio.id ? { ...c, activo: !c.activo } : c))
  }

  async function toggleModulo(comercio, key) {
    const tk = `${comercio.id}-${key}`
    setTogglingMod(tk)
    const modulos = { ...(comercio.modulos ?? {}), [key]: !(comercio.modulos?.[key] ?? true) }
    const { error: e } = await supabase
      .from('comercios')
      .update({ modulos })
      .eq('id', comercio.id)
    if (!e) setComercio((prev) => prev.map((c) => c.id === comercio.id ? { ...c, modulos } : c))
    setTogglingMod(null)
  }

  function abrirCrear() {
    setEditando(null)
    setForm({ nombre: '', domicilio: '', cuit: '', email: '', telefono: '' })
    setErrModal('')
    setModal(true)
  }

  function abrirEditar(c) {
    setEditando(c)
    setForm({ nombre: c.nombre ?? '', domicilio: c.domicilio ?? '', cuit: c.cuit ?? '', email: c.email ?? '', telefono: c.telefono ?? '' })
    setErrModal('')
    setModal(true)
  }

  async function guardar() {
    if (!form.nombre.trim()) { setErrModal('El nombre del comercio es requerido.'); return }
    setGuardando(true)
    setErrModal('')
    if (editando) {
      const { error: e } = await supabase.from('comercios').update(form).eq('id', editando.id)
      if (e) { setErrModal(traducirError(e)); setGuardando(false); return }
      setComercio((prev) => prev.map((c) => c.id === editando.id ? { ...c, ...form } : c))
    } else {
      const { data, error: e } = await supabase.from('comercios').insert({ ...form, activo: true }).select().single()
      if (e) { setErrModal(traducirError(e)); setGuardando(false); return }
      setComercio((prev) => [data, ...prev])
    }
    setGuardando(false)
    setModal(false)
  }

  const filtrados = useMemo(
    () => comercios.filter((c) =>
      !busqueda || c.nombre?.toLowerCase().includes(busqueda.toLowerCase())
    ),
    [comercios, busqueda]
  )

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-violet-500" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Comercios</h1>
          <p className="text-sm text-slate-500 mt-0.5">{comercios.length} registrados</p>
        </div>
        <Button onClick={abrirCrear}>
          <Plus size={16} className="mr-1.5" /> Nuevo
        </Button>
      </div>

      {/* Busqueda */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar comercio..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
        />
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Lista */}
      <div className="space-y-3">
        {filtrados.map((comercio) => {
          const abierto = expandido === comercio.id
          return (
            <div key={comercio.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {/* Fila principal */}
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Building2 size={18} className="text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{comercio.nombre}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {[comercio.rubro, comercio.domicilio].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                  comercio.activo
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {comercio.activo ? 'Activo' : 'Inactivo'}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => abrirEditar(comercio)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => toggleExpandido(comercio.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                    title={abierto ? 'Cerrar' : 'Ver detalle'}
                  >
                    {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Panel expandido */}
              {abierto && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">

                  {/* Estado + fecha */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-xs text-slate-400">
                      Creado: <span className="text-slate-600">{fmtFecha(comercio.created_at)}</span>
                    </p>
                    {comercio.email && (
                      <p className="text-xs text-slate-400">
                        Email: <span className="text-slate-600">{comercio.email}</span>
                      </p>
                    )}
                    {comercio.cuit && (
                      <p className="text-xs text-slate-400">
                        CUIT: <span className="text-slate-600">{comercio.cuit}</span>
                      </p>
                    )}
                  </div>

                  {/* Toggle activo */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Estado del comercio</span>
                    <button
                      onClick={() => toggleActivo(comercio)}
                      className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                        comercio.activo ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {comercio.activo
                        ? <ToggleRight size={22} className="text-emerald-500" />
                        : <ToggleLeft size={22} />
                      }
                      {comercio.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>

                  {/* Módulos */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Módulos habilitados
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {MODULOS_LISTA.map(({ key, label }) => {
                        const activo = comercio.modulos?.[key] !== false
                        const tk = `${comercio.id}-${key}`
                        return (
                          <button
                            key={key}
                            disabled={togglingMod === tk}
                            onClick={() => toggleModulo(comercio, key)}
                            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                              activo
                                ? 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            {activo ? <CheckCircle2 size={12} /> : <span className="w-3 h-3 rounded-full border border-slate-300" />}
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Usuarios */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Users size={12} /> Usuarios
                    </p>
                    {cargandoUsers === comercio.id ? (
                      <Spinner size="sm" className="text-violet-400" />
                    ) : (
                      <div className="space-y-1.5">
                        {(usuariosMap[comercio.id] ?? []).length === 0 ? (
                          <p className="text-xs text-slate-400">Sin usuarios registrados</p>
                        ) : (
                          (usuariosMap[comercio.id] ?? []).map((u) => (
                            <div key={u.id} className="flex items-center gap-3 text-sm">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-slate-500">
                                  {u.nombre?.[0]?.toUpperCase() ?? '?'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-slate-800 font-medium truncate block">{u.nombre}</span>
                                <span className="text-xs text-slate-400">{u.email}</span>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                u.rol === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {u.rol}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                u.activo ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {u.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filtrados.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Building2 size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No hay comercios registrados</p>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      <Modal
        abierto={modal}
        onCerrar={() => setModal(false)}
        titulo={editando ? 'Editar comercio' : 'Nuevo comercio'}
      >
        <div className="space-y-3">
          <Input
            label="Nombre del comercio *"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            placeholder="Kiosco Don Pedro"
          />
          <Input
            label="Rubro"
            value={form.domicilio}
            onChange={(e) => setForm((f) => ({ ...f, domicilio: e.target.value }))}
            placeholder="Calle Falsa 123, Rosario"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="CUIT"
              value={form.cuit}
              onChange={(e) => setForm((f) => ({ ...f, cuit: e.target.value }))}
              placeholder="20-12345678-9"
            />
            <Input
              label="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              placeholder="341 555-1234"
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="comercio@email.com"
          />
          {errModal && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {errModal}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button variante="secundario" className="flex-1" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" cargando={guardando} onClick={guardar}>
              {editando ? 'Guardar cambios' : 'Crear comercio'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
