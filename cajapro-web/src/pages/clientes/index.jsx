import { useState, useEffect, useMemo } from 'react'
import {
  Plus, Pencil, Search, ChevronDown, ChevronUp,
  UserCircle2, ToggleLeft, ToggleRight, Heart,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { traducirError } from '../../lib/errores'
import { makeLabels } from '../../lib/etiquetas'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

const ESPECIES = [
  { value: 'perro', label: 'Perro' },
  { value: 'gato',  label: 'Gato'  },
  { value: 'ave',   label: 'Ave'   },
  { value: 'otro',  label: 'Otro'  },
]

const METODO_LABEL = {
  efectivo:       'Efectivo',
  tarjeta_debito: 'Debito',
  tarjeta_credito:'Credito',
  transferencia:  'Transf.',
  otro:           'Otro',
}

function ars(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n ?? 0)
}

function fmtFecha(iso) {
  if (!iso) return '-'
  const dateStr = iso.includes('T') ? iso : iso + 'T12:00:00'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(dateStr))
}

function calcularEdad(fechaNac) {
  if (!fechaNac) return null
  const hoy = new Date()
  const nac = new Date(fechaNac + 'T00:00:00')
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad
}

export default function Clientes() {
  const { perfil, comercio } = useAuth()
  const esAdmin = perfil?.rol === 'admin'
  const esPaciente = comercio?.tipo_perfil === 'paciente'
  const esVeterinaria = comercio?.rubro?.toLowerCase()?.includes('veterinaria')
  const L = makeLabels(comercio?.tipo_perfil)

  const [clientes,       setClientes]       = useState([])
  const [cargando,       setCargando]       = useState(true)
  const [busqueda,       setBusqueda]       = useState('')
  const [expandido,      setExpandido]      = useState(null)
  const [ventasCliente,  setVentasCliente]  = useState({})
  const [cargandoVentas, setCargandoVentas] = useState(null)

  const [modalAbierto,   setModal]          = useState(false)
  const [editando,       setEditando]       = useState(null)
  const [errorServer,    setErrorServer]    = useState('')

  const camposBase = {
    nombre: '', telefono: '', email: '', dni: '', notas: '',
  }
  const camposPaciente = {
    fecha_nacimiento: '', obra_social: '', numero_afiliado: '', especie: '',
  }

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { ...camposBase, ...camposPaciente },
  })

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('clientes')
      .select('*, ventas(id, total, fecha, estado)')
      .eq('comercio_id', perfil.comercio_id)
      .order('nombre')
    setClientes(data ?? [])
    setCargando(false)
  }

  const clientesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return clientes
    const q = busqueda.toLowerCase()
    return clientes.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      c.telefono?.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.dni?.includes(q) ||
      c.obra_social?.toLowerCase().includes(q)
    )
  }, [clientes, busqueda])

  function stats(cliente) {
    const ventas = (cliente.ventas ?? []).filter(v => v.estado === 'completada')
    const total  = ventas.reduce((s, v) => s + Number(v.total), 0)
    const ultima = [...ventas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0]
    return { cantidad: ventas.length, total, ultima }
  }

  async function toggleExpandido(cliente) {
    if (expandido === cliente.id) { setExpandido(null); return }
    setExpandido(cliente.id)
    if (ventasCliente[cliente.id]) return

    setCargandoVentas(cliente.id)
    const { data } = await supabase
      .from('ventas')
      .select('id, total, fecha, estado, metodo_pago')
      .eq('cliente_id', cliente.id)
      .eq('estado', 'completada')
      .order('fecha', { ascending: false })
      .limit(20)
    setVentasCliente(prev => ({ ...prev, [cliente.id]: data ?? [] }))
    setCargandoVentas(null)
  }

  function abrirCrear() {
    setEditando(null)
    reset({ ...camposBase, ...camposPaciente })
    setErrorServer('')
    setModal(true)
  }

  function abrirEditar(c) {
    setEditando(c)
    reset({
      nombre:           c.nombre          ?? '',
      telefono:         c.telefono         ?? '',
      email:            c.email            ?? '',
      dni:              c.dni              ?? '',
      notas:            c.notas            ?? '',
      fecha_nacimiento: c.fecha_nacimiento ?? '',
      obra_social:      c.obra_social      ?? '',
      numero_afiliado:  c.numero_afiliado  ?? '',
      especie:          c.especie          ?? '',
    })
    setErrorServer('')
    setModal(true)
  }

  async function onSubmit(datos) {
    setErrorServer('')
    const payload = {
      nombre:   datos.nombre.trim(),
      telefono: datos.telefono?.trim()  || null,
      email:    datos.email?.trim()     || null,
      dni:      datos.dni?.trim()       || null,
      notas:    datos.notas?.trim()     || null,
    }

    if (esPaciente) {
      payload.fecha_nacimiento = datos.fecha_nacimiento || null
      payload.obra_social      = datos.obra_social?.trim()     || null
      payload.numero_afiliado  = datos.numero_afiliado?.trim() || null
      payload.especie          = (esVeterinaria && datos.especie) ? datos.especie : null
    }

    const { error } = editando
      ? await supabase.from('clientes').update(payload).eq('id', editando.id)
      : await supabase.from('clientes').insert({ ...payload, comercio_id: perfil.comercio_id })

    if (error) { setErrorServer(traducirError(error)); return }
    setModal(false)
    cargar()
  }

  async function toggleActivo(c) {
    const nuevoActivo = !c.activo
    const { error } = await supabase.from('clientes').update({ activo: nuevoActivo }).eq('id', c.id)
    if (error) { setErrorServer(traducirError(error)); return }
    setClientes(prev => prev.map(x => x.id === c.id ? { ...x, activo: nuevoActivo } : x))
  }

  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-5 gap-3">
        <div className="relative flex-1 min-w-0 sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={L.buscador}
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <Button onClick={abrirCrear}>
          <Plus size={16} /> {L.nuevo}
        </Button>
      </div>

      <p className="text-xs text-slate-400 mb-3">{L.conteo(clientesFiltrados.length)}</p>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-blue-500" />
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
          <UserCircle2 size={40} />
          <p className="text-sm">{busqueda ? 'Sin resultados' : L.sinRegistros}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {clientesFiltrados.map(c => {
            const { cantidad, total, ultima } = stats(c)
            const abierto = expandido === c.id
            const edad = calcularEdad(c.fecha_nacimiento)

            return (
              <div key={c.id} className={!c.activo ? 'opacity-50' : ''}>
                <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {c.nombre.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-800">{c.nombre}</p>
                      {esPaciente && c.especie && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                          {ESPECIES.find(e => e.value === c.especie)?.label ?? c.especie}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {[
                        c.telefono,
                        c.email,
                        c.dni && `DNI ${c.dni}`,
                        esPaciente && c.obra_social && `OS: ${c.obra_social}`,
                        esPaciente && edad !== null && `${edad} anos`,
                      ].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 sm:hidden">
                      {ars(total)} · {cantidad} {L.historial.toLowerCase()}
                    </p>
                  </div>

                  <div className="hidden sm:flex flex-col items-end text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-slate-800">{ars(total)}</p>
                    <p className="text-xs text-slate-500">
                      {cantidad} {L.historial.toLowerCase()}
                      {ultima && ` · ultima ${fmtFecha(ultima.fecha)}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => abrirEditar(c)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    {esAdmin && (
                      <button
                        onClick={() => toggleActivo(c)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        {c.activo
                          ? <ToggleRight size={18} className="text-emerald-500" />
                          : <ToggleLeft size={18} />}
                      </button>
                    )}
                    <button
                      onClick={() => toggleExpandido(c)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      {abierto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {abierto && (
                  <div className="bg-slate-50 border-t border-slate-100 px-4 sm:px-5 py-4">
                    {cargandoVentas === c.id ? (
                      <div className="flex justify-center py-4">
                        <Spinner size="sm" className="text-blue-500" />
                      </div>
                    ) : (ventasCliente[c.id] ?? []).length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">
                        {L.sinHistorial}
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                          {L.ultimosN(20)}
                        </p>
                        {(ventasCliente[c.id] ?? []).map(v => (
                          <div key={v.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-slate-100">
                            <span className="text-slate-500">{fmtFecha(v.fecha)}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              {METODO_LABEL[v.metodo_pago] ?? v.metodo_pago ?? '-'}
                            </span>
                            <span className="font-semibold text-slate-800">{ars(v.total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModal(false)}
        titulo={editando ? L.editar : L.nuevo}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nombre completo *"
            placeholder="Ej: Maria Gonzalez"
            error={errors.nombre?.message}
            {...register('nombre', { required: 'El nombre es requerido' })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Telefono" placeholder="11 1234-5678" {...register('telefono')} />
            <Input label="DNI" placeholder="12.345.678" {...register('dni')} />
          </div>
          <Input label="Email" type="email" placeholder="contacto@email.com" {...register('email')} />
          <Input label="Notas (opcional)" placeholder="Preferencias, observaciones..." {...register('notas')} />

          {esPaciente && (
            <>
              <hr className="border-slate-100" />
              <div className="flex items-center gap-2">
                <Heart size={14} className="text-rose-400" />
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Datos del paciente
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1.5">Fecha de nacimiento</p>
                  <input
                    type="date"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    {...register('fecha_nacimiento')}
                  />
                </div>
                <Input
                  label="Obra social"
                  placeholder="Ej: OSDE, PAMI..."
                  {...register('obra_social')}
                />
              </div>

              <Input
                label="Numero de afiliado (opcional)"
                placeholder="Ej: 123456789"
                {...register('numero_afiliado')}
              />

              {esVeterinaria && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1.5">Especie</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ESPECIES.map(({ value, label }) => {
                      const checked = watch('especie') === value
                      return (
                        <label
                          key={value}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border-2 cursor-pointer text-xs font-semibold transition-colors ${
                            checked
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            value={value}
                            className="sr-only"
                            {...register('especie')}
                          />
                          {label}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {errorServer && <p className="text-sm text-red-500">{errorServer}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="button" variante="secundario" className="flex-1" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" cargando={isSubmitting} className="flex-1">
              {editando ? 'Guardar cambios' : L.nuevo}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
