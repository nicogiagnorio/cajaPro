import { useRef, useState, useEffect } from 'react'
import {
  Upload, Trash2, ImageIcon, Building2, Palette, ToggleLeft,
  ChevronDown, Lock,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { traducirError } from '../../lib/errores'
import { TEMAS } from '../../lib/temas'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useForm } from 'react-hook-form'

function SubirImagen({ titulo, descripcion, urlActual, nombreArchivo, onSubida, onEliminar }) {
  const inputRef            = useRef()
  const [preview,  setPreview]   = useState(null)
  const [archivo,  setArchivo]   = useState(null)
  const [subiendo, setSubiendo]  = useState(null)
  const [error,    setError]     = useState('')

  function seleccionar(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setArchivo(file); setError('')
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function confirmar() {
    if (!archivo) return
    setSubiendo('subiendo'); setError('')
    const { error: errUpload } = await onSubida(archivo, nombreArchivo)
    if (errUpload) { setError(errUpload); setSubiendo(null) }
    else {
      setPreview(null); setArchivo(null); setSubiendo('ok')
      setTimeout(() => setSubiendo(null), 2000)
    }
    inputRef.current.value = ''
  }

  function cancelar() {
    setPreview(null); setArchivo(null); setError('')
    inputRef.current.value = ''
  }

  const imagenMostrada = preview ?? urlActual

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-800">{titulo}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{descripcion}</p>
        </div>
        {urlActual && !preview && (
          <button onClick={onEliminar} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div
        className={`relative mb-4 rounded-xl overflow-hidden border-2 border-dashed flex items-center justify-center transition-colors ${
          imagenMostrada ? 'border-transparent bg-slate-50' : 'border-slate-200 bg-slate-50 cursor-pointer hover:border-blue-300'
        }`}
        style={{ minHeight: 140 }}
        onClick={() => !imagenMostrada && inputRef.current?.click()}
      >
        {imagenMostrada ? (
          <img src={imagenMostrada} alt={titulo} className="max-h-36 max-w-full object-contain p-3" />
        ) : (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
            <ImageIcon size={32} />
            <span className="text-sm">Tocá para seleccionar</span>
            <span className="text-xs">PNG, JPG, WEBP — máx. 5 MB</span>
          </div>
        )}
        {preview && (
          <div className="absolute top-2 right-2">
            <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Vista previa</span>
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" className="hidden" onChange={seleccionar} />
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      {preview ? (
        <div className="flex gap-2">
          <Button variante="secundario" className="flex-1" onClick={cancelar}>Cancelar</Button>
          <Button className="flex-1" cargando={subiendo === 'subiendo'} onClick={confirmar}>
            <Upload size={15} /> Subir imagen
          </Button>
        </div>
      ) : (
        <Button variante="secundario" className="w-full" onClick={() => inputRef.current?.click()}>
          {subiendo === 'ok' ? '✓ Imagen actualizada' : urlActual ? 'Cambiar imagen' : 'Seleccionar imagen'}
        </Button>
      )}
    </div>
  )
}

function ConfigAvanzada({ comercio, refrescarComercio }) {
  const [abierto, setAbierto]           = useState(false)
  const [togglingModulo, setTogglingModulo] = useState(null)

  async function cambiarTema(colorTema) {
    const { error } = await supabase.from('comercios').update({ color_tema: colorTema }).eq('id', comercio.id)
    if (error) { alert(traducirError(error)); return }
    await refrescarComercio()
  }

  async function toggleModulo(key, habilitado) {
    setTogglingModulo(key)
    const nuevosModulos = { ...(comercio?.modulos ?? {}), [key]: !habilitado }
    const { error: err } = await supabase.from('comercios').update({ modulos: nuevosModulos }).eq('id', comercio.id)
    if (err) console.error('toggleModulo error:', err.message)
    await refrescarComercio()
    setTogglingModulo(null)
  }

  const MODULOS = [
    { key: 'ventas',   label: 'Punto de Venta', descripcion: 'Venta detallada y venta rápida'              },
    { key: 'caja',     label: 'Caja',            descripcion: 'Apertura, cierre y arqueo de turno'          },
    { key: 'compras',  label: 'Compras',         descripcion: 'Registro de compras a proveedores'           },
    { key: 'gastos',   label: 'Gastos',          descripcion: 'Control de egresos por categoría'            },
    { key: 'clientes', label: 'Clientes',        descripcion: 'Gestión de clientes y sus compras'           },
    { key: 'turnos',   label: 'Turnos',          descripcion: 'Agenda de citas por profesional'             },
    { key: 'reportes', label: 'Reportes',        descripcion: 'Gráficos y análisis de ventas'               },
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setAbierto(a => !a)}
        className="w-full flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
            <ToggleLeft size={15} className="text-slate-500" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-800 text-sm">Configuración avanzada</p>
            <p className="text-xs text-slate-400">Módulos habilitados y color de tema</p>
          </div>
        </div>
        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="border-t border-slate-100 px-5 sm:px-6 py-5 space-y-7">

          <div>
            <div className="flex items-center gap-2 mb-1">
              <ToggleLeft size={15} className="text-slate-400" />
              <h3 className="font-semibold text-slate-800 text-sm">Módulos habilitados</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Los módulos deshabilitados desaparecen del menú. Inventario siempre está activo.
            </p>
            <div className="space-y-2.5">
              {MODULOS.map(({ key, label, descripcion }) => {
                const bloqueado = comercio?.modulos_permitidos?.[key] === false
                const habilitado = !bloqueado && comercio?.modulos?.[key] !== false
                return (
                  <div key={key} className={`flex items-center justify-between py-2 border-b border-slate-100 last:border-0 ${bloqueado ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {bloqueado && <Lock size={13} className="text-slate-400 flex-shrink-0" />}
                      <div>
                        <p className="text-sm font-medium text-slate-700">{label}</p>
                        <p className="text-xs text-slate-400">{bloqueado ? 'Bloqueado por el administrador' : descripcion}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => !bloqueado && toggleModulo(key, habilitado)}
                      disabled={togglingModulo === key || bloqueado}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${
                        habilitado ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    >
                      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${habilitado ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Palette size={15} className="text-slate-400" />
              <h3 className="font-semibold text-slate-800 text-sm">Color del tema</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">Se aplica en el menú y los elementos activos. El cambio es inmediato.</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(TEMAS).map(([key, { nombre, muestra }]) => {
                const seleccionado = (comercio?.color_tema ?? 'azul') === key
                return (
                  <button
                    key={key}
                    onClick={() => cambiarTema(key)}
                    title={nombre}
                    className={`w-10 h-10 rounded-full ${muestra} transition-all ${
                      seleccionado ? 'ring-2 ring-offset-2 ring-slate-500 scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Configuracion() {
  const { perfil, comercio, refrescarComercio } = useAuth()
  const esAdmin = perfil?.rol === 'admin'
  const [errorGuardado, setErrorGuardado] = useState('')

  const { register, handleSubmit, formState: { isSubmitting, isDirty }, reset } = useForm({
    defaultValues: {
      nombre:      comercio?.nombre      ?? '',
      domicilio:   comercio?.domicilio   ?? '',
      telefono:    comercio?.telefono    ?? '',
      email:       comercio?.email       ?? '',
      cuit:        comercio?.cuit        ?? '',
      tipo_perfil: comercio?.tipo_perfil ?? 'cliente',
    },
  })

  async function subirImagen(file, nombreArchivo) {
    const ruta = `${comercio.id}/${nombreArchivo}`
    const { error: errUpload } = await supabase.storage
      .from('imagenes-comercio')
      .upload(ruta, file, { upsert: true, contentType: file.type })
    if (errUpload) return { error: errUpload.message }
    const { data: { publicUrl } } = supabase.storage.from('imagenes-comercio').getPublicUrl(ruta)
    const campo = nombreArchivo === 'logo' ? 'logo_url' : 'banner_url'
    const { error: errUpdate } = await supabase.from('comercios').update({ [campo]: `${publicUrl}?t=${Date.now()}` }).eq('id', comercio.id)
    if (errUpdate) return { error: errUpdate.message }
    await refrescarComercio()
    return {}
  }

  async function eliminarImagen(campo) {
    const nombreArchivo = campo === 'logo_url' ? 'logo' : 'banner'
    await supabase.storage.from('imagenes-comercio').remove([`${comercio.id}/${nombreArchivo}`])
    const { error } = await supabase.from('comercios').update({ [campo]: null }).eq('id', comercio.id)
    if (error) { alert(traducirError(error)); return }
    await refrescarComercio()
  }

  async function guardarDatos(datos) {
    setErrorGuardado('')
    const { error: err } = await supabase
      .from('comercios')
      .update({
        nombre:      datos.nombre.trim(),
        domicilio:   datos.domicilio?.trim()   || null,
        telefono:    datos.telefono?.trim()    || null,
        email:       datos.email?.trim()       || null,
        cuit:        datos.cuit?.trim()        || null,
        tipo_perfil: datos.tipo_perfil         || 'cliente',
      })
      .eq('id', comercio.id)
    if (err) { setErrorGuardado('No se pudo guardar: ' + err.message); return }
    await refrescarComercio()
    reset(datos)
  }

  return (
    <div className="p-3 sm:p-6 max-w-3xl space-y-5 pb-10">
      <div className="flex items-center gap-3 mb-2">
        <Building2 size={20} className="text-slate-500" />
        <h1 className="text-xl font-bold text-slate-900">Configuración del comercio</h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Datos del negocio</h3>
        <form onSubmit={handleSubmit(guardarDatos)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nombre del comercio *"
              placeholder="Ej: Huella Feliz Pet Shop"
              disabled={!esAdmin}
              {...register('nombre', { required: true })}
            />
            <Input
              label="CUIT"
              placeholder="20-12345678-9"
              disabled={!esAdmin}
              {...register('cuit')}
            />
          </div>
          <Input label="Domicilio" placeholder="Av. Siempreviva 742" disabled={!esAdmin} {...register('domicilio')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Teléfono" placeholder="011-4444-5555" disabled={!esAdmin} {...register('telefono')} />
            <Input label="Email" type="email" placeholder="contacto@mitienda.com" disabled={!esAdmin} {...register('email')} />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Tipo de perfil de contacto</p>
            <p className="text-xs text-slate-400 mb-3">
              Define como se llaman los contactos en toda la app y que campos extras estan disponibles.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { value: 'cliente',  label: 'Cliente',  desc: 'Para comercios, ferreterias, tiendas, etc.'      },
                { value: 'paciente', label: 'Paciente', desc: 'Para clinicas, veterinarias, consultorios, etc.' },
              ].map(({ value, label, desc }) => {
                const checked = (comercio?.tipo_perfil ?? 'cliente') === value
                return (
                  <label
                    key={value}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      !esAdmin ? 'opacity-60 cursor-not-allowed' : ''
                    } ${
                      checked
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value={value}
                      disabled={!esAdmin}
                      className="mt-0.5 accent-blue-600"
                      {...register('tipo_perfil')}
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {errorGuardado && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorGuardado}</p>
          )}
          {esAdmin && (
            <Button type="submit" cargando={isSubmitting} disabled={!isDirty} className="w-full">
              Guardar datos
            </Button>
          )}
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SubirImagen
          titulo="Logo del comercio"
          descripcion="Aparece en el menú y en los tickets. PNG o SVG con fondo transparente recomendado."
          urlActual={comercio?.logo_url ?? null}
          nombreArchivo="logo"
          onSubida={(file) => subirImagen(file, 'logo')}
          onEliminar={() => eliminarImagen('logo_url')}
        />
        <SubirImagen
          titulo="Imagen de banner"
          descripcion="Imagen secundaria para cabeceras. Formato horizontal recomendado."
          urlActual={comercio?.banner_url ?? null}
          nombreArchivo="banner"
          onSubida={(file) => subirImagen(file, 'banner')}
          onEliminar={() => eliminarImagen('banner_url')}
        />
      </div>

      {esAdmin && <ConfigAvanzada comercio={comercio} refrescarComercio={refrescarComercio} />}

      {!esAdmin && (
        <p className="text-sm text-slate-400 text-center">
          Solo los administradores pueden modificar la configuracion.
        </p>
      )}
    </div>
  )
}
