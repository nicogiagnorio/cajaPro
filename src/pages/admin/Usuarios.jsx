import { useEffect, useState, useMemo } from 'react'
import { Users, Plus, Pencil, ToggleLeft, ToggleRight, KeyRound, Search, Trash2 } from 'lucide-react'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

function badgeRol(rol) {
  const mapa = {
    admin:  { texto: 'Admin',  clase: 'bg-blue-100 text-blue-700'    },
    cajero: { texto: 'Cajero', clase: 'bg-slate-100 text-slate-600'  },
  }
  return mapa[rol] ?? { texto: rol, clase: 'bg-slate-100 text-slate-600' }
}

export default function Usuarios() {
  const [usuarios,  setUsuarios]  = useState([])
  const [negocios,  setNegocios]  = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [busqueda,  setBusqueda]  = useState('')
  const [error,     setError]     = useState('')

  // Modal crear/editar
  const [modal,     setModal]     = useState(false)
  const [editando,  setEditando]  = useState(null)
  const [form,      setForm]      = useState({ nombre: '', email: '', password: '', rol: 'cajero', comercioId: '' })
  const [guardando, setGuardando] = useState(false)
  const [errModal,  setErrModal]  = useState('')

  // Modal resetear password
  const [modalPwd,   setModalPwd]   = useState(null) // { id, authUserId, nombre }
  const [nuevaPwd,   setNuevaPwd]   = useState('')
  const [reseteando, setReseteando] = useState(false)
  const [msgPwd,     setMsgPwd]     = useState('')

  // Modal eliminar usuario
  const [modalEliminar, setModalEliminar] = useState(null) // { id, authUserId, nombre }
  const [eliminando,    setEliminando]    = useState(false)
  const [errEliminar,   setErrEliminar]   = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    try {
      if (!window.adminAPI?.listarUsuarios) throw new Error('API no disponible')
      const [resU, resN] = await Promise.all([
        window.adminAPI.listarUsuarios(),
        window.adminAPI.listarComercios(),
      ])
      if (!resU.ok) { setError(resU.error); return }
      setUsuarios(resU.data ?? [])
      setNegocios(resN.ok ? resN.data : [])
    } catch {
      setError('No se pudo conectar con el cliente admin. Configurá las credenciales en Ajustes.')
    } finally {
      setCargando(false)
    }
  }

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    if (!q) return usuarios
    return usuarios.filter(u =>
      u.nombre?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.comercios?.nombre?.toLowerCase().includes(q)
    )
  }, [usuarios, busqueda])

  function abrirCrear() {
    setEditando(null)
    setForm({ nombre: '', email: '', password: '', rol: 'cajero', comercioId: negocios[0]?.id ?? '' })
    setErrModal('')
    setModal(true)
  }

  function abrirEditar(u) {
    setEditando(u)
    setForm({ nombre: u.nombre ?? '', email: u.email ?? '', password: '', rol: u.rol ?? 'cajero', comercioId: u.comercio_id ?? '' })
    setErrModal('')
    setModal(true)
  }

  async function guardarUsuario() {
    if (!form.nombre.trim())    { setErrModal('El nombre es requerido'); return }
    if (!editando && !form.email.trim())    { setErrModal('El email es requerido'); return }
    if (!editando && !form.password.trim()) { setErrModal('La contraseña es requerida'); return }
    if (!form.comercioId)       { setErrModal('Seleccioná un negocio'); return }
    setGuardando(true)
    setErrModal('')

    if (editando) {
      const res = await window.adminAPI.actualizarUsuario(editando.id, {
        nombre: form.nombre.trim(),
        rol:    form.rol,
      })
      setGuardando(false)
      if (!res.ok) { setErrModal(res.error); return }
    } else {
      const res = await window.adminAPI.crearUsuario({
        nombre:     form.nombre.trim(),
        email:      form.email.trim(),
        password:   form.password,
        rol:        form.rol,
        comercioId: form.comercioId,
      })
      setGuardando(false)
      if (!res.ok) { setErrModal(res.error); return }
    }

    setModal(false)
    cargar()
  }

  async function toggleActivo(u) {
    const res = await window.adminAPI.toggleActivoUsuario(u.id, !u.activo)
    if (!res.ok) return
    setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, activo: !x.activo } : x))
  }

  async function resetearPassword() {
    if (!nuevaPwd.trim() || nuevaPwd.length < 6) { setMsgPwd('La contraseña debe tener al menos 6 caracteres'); return }
    setReseteando(true)
    setMsgPwd('')
    const res = await window.adminAPI.resetearPassword(modalPwd.authUserId, nuevaPwd)
    setReseteando(false)
    if (!res.ok) { setMsgPwd(`Error: ${res.error}`); return }
    setMsgPwd('ok')
    setTimeout(() => { setModalPwd(null); setNuevaPwd(''); setMsgPwd('') }, 1500)
  }

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
          <Users size={20} className="text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900">Usuarios</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar usuario..."
              className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 w-52"
            />
          </div>
          <Button onClick={abrirCrear}>
            <Plus size={16} /> Nuevo usuario
          </Button>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-3">{filtrados.length} usuarios</p>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-blue-500" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
          <Users size={40} />
          <p className="text-sm">{busqueda ? 'Sin resultados' : 'No hay usuarios. Creá el primero.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {filtrados.map(u => {
            const { texto: rolTexto, clase: rolClase } = badgeRol(u.rol)
            return (
              <div key={u.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors ${!u.activo ? 'opacity-60' : ''}`}>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {u.nombre?.charAt(0)?.toUpperCase() ?? '?'}
                </div>

                {/* Datos */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800">{u.nombre}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {u.email ?? '—'} · {u.comercios?.nombre ?? 'Sin negocio'}
                  </p>
                </div>

                {/* Rol badge */}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${rolClase}`}>
                  {rolTexto}
                </span>

                {/* Estado */}
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${u.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </span>

                {/* Acciones */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => abrirEditar(u)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                  {u.auth_user_id && (
                    <button
                      onClick={() => { setModalPwd({ id: u.id, authUserId: u.auth_user_id, nombre: u.nombre }); setNuevaPwd(''); setMsgPwd('') }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      title="Resetear contraseña"
                    >
                      <KeyRound size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => toggleActivo(u)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title={u.activo ? 'Desactivar' : 'Activar'}
                  >
                    {u.activo
                      ? <ToggleRight size={18} className="text-emerald-500" />
                      : <ToggleLeft size={18} />}
                  </button>
                  <button
                    onClick={() => { setModalEliminar({ id: u.id, authUserId: u.auth_user_id, nombre: u.nombre }); setErrEliminar('') }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Eliminar usuario"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal crear/editar usuario */}
      <Modal abierto={modal} onCerrar={() => setModal(false)} titulo={editando ? 'Editar usuario' : 'Nuevo usuario'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Nombre completo *</label>
            <input
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: María González"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {!editando && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="usuario@email.com"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Contraseña *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Rol *</label>
              <select
                value={form.rol}
                onChange={e => setForm(p => ({ ...p, rol: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="admin">Administrador</option>
                <option value="cajero">Cajero</option>
              </select>
            </div>
            {!editando && (
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Negocio *</label>
                <select
                  value={form.comercioId}
                  onChange={e => setForm(p => ({ ...p, comercioId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">— Seleccioná —</option>
                  {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                </select>
              </div>
            )}
          </div>

          {errModal && <p className="text-sm text-red-500">{errModal}</p>}
          <div className="flex gap-3 pt-1">
            <Button variante="secundario" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button className="flex-1" cargando={guardando} onClick={guardarUsuario}>
              {editando ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal eliminar usuario */}
      <Modal
        abierto={!!modalEliminar}
        onCerrar={() => { setModalEliminar(null); setErrEliminar('') }}
        titulo="Eliminar usuario"
      >
        {modalEliminar && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <Trash2 size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700">{modalEliminar.nombre}</p>
                <p className="text-sm text-red-600 mt-1">
                  Se eliminará el usuario y su cuenta de acceso de forma permanente. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            {errEliminar && <p className="text-sm text-red-500">{errEliminar}</p>}
            <div className="flex gap-3">
              <Button
                variante="secundario"
                className="flex-1"
                onClick={() => { setModalEliminar(null); setErrEliminar('') }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                cargando={eliminando}
                onClick={async () => {
                  setEliminando(true)
                  setErrEliminar('')
                  const res = await window.adminAPI.eliminarUsuario(modalEliminar.id, modalEliminar.authUserId)
                  setEliminando(false)
                  if (!res.ok) { setErrEliminar(res.error); return }
                  setModalEliminar(null)
                  cargar()
                }}
              >
                <Trash2 size={15} /> Eliminar definitivamente
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal resetear contraseña */}
      <Modal abierto={!!modalPwd} onCerrar={() => setModalPwd(null)} titulo="Resetear contraseña">
        {modalPwd && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Nueva contraseña para <strong>{modalPwd.nombre}</strong>:
            </p>
            <input
              type="password"
              value={nuevaPwd}
              onChange={e => setNuevaPwd(e.target.value)}
              placeholder="Nueva contraseña (mín. 6 caracteres)"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
            {msgPwd === 'ok' ? (
              <p className="text-sm text-emerald-600 font-medium">¡Contraseña actualizada!</p>
            ) : msgPwd ? (
              <p className="text-sm text-red-500">{msgPwd}</p>
            ) : null}
            <div className="flex gap-3 pt-1">
              <Button variante="secundario" className="flex-1" onClick={() => setModalPwd(null)}>Cancelar</Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600"
                cargando={reseteando}
                onClick={resetearPassword}
              >
                <KeyRound size={15} /> Resetear
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
