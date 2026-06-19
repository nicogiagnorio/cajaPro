import { useRef, useState, useEffect } from 'react'
import {
  Upload, Trash2, ImageIcon, Building2, Palette, ToggleLeft, ToggleRight,
  ShieldCheck, FileKey, AlertCircle, CheckCircle2, Loader2, ChevronDown, Lock,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { TEMAS } from '../../lib/temas'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useForm } from 'react-hook-form'
import { arca } from '../../lib/arca'

// ─── Subir imagen ─────────────────────────────────────────────────────────────
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
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
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
            <span className="text-sm">Hacé clic para seleccionar</span>
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

// ─── Sección ARCA ─────────────────────────────────────────────────────────────
function ConfigArca() {
  const [config,     setConfig]     = useState(null)
  const [guardando,  setGuardando]  = useState(false)
  const [verificando,setVerificando]= useState(false)
  const [msgVerif,   setMsgVerif]   = useState(null)
  const [error,      setError]      = useState('')

  useEffect(() => {
    arca.cargarConfig().then(res => {
      if (res.ok && res.data) setConfig(res.data)
      else setConfig({})
    })
  }, [])

  async function seleccionarArchivo(tipo) {
    setError('')
    const res = await arca.seleccionarArchivo(tipo)
    if (!res.ok) return
    setConfig(prev => ({ ...prev, [tipo]: res.contenido }))
  }

  async function guardar(e) {
    e.preventDefault(); setGuardando(true); setError('')
    const res = await arca.guardarConfig(config)
    setGuardando(false)
    if (!res.ok) { setError(res.error); return }
    setConfig(res.data)
  }

  async function verificar() {
    setVerificando(true); setMsgVerif(null)
    const res = await arca.verificarConexion()
    setVerificando(false)
    setMsgVerif({ ok: res.ok, texto: res.ok ? res.mensaje : res.error })
  }

  async function eliminarCert() {
    await arca.eliminarCert()
    setConfig(prev => ({ ...prev, tieneCert: false, tieneKey: false, cert: undefined, key: undefined }))
    setMsgVerif(null)
  }

  if (config === null) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
        <Loader2 size={16} className="animate-spin" /> Cargando configuración ARCA…
      </div>
    )
  }

  const tieneCert = config.tieneCert || config.cert
  const tieneKey  = config.tieneKey  || config.key

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-slate-500" />
        <h3 className="font-semibold text-slate-800">Facturación electrónica ARCA</h3>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 space-y-1">
        <p className="font-semibold">Requisitos previos (gestioná en arca.gob.ar):</p>
        <p>1. Certificado digital — Administrador de Relaciones → Adherir Servicio → wsfe</p>
        <p>2. Punto de Venta Web Services — Habilitalo en Facturación Electrónica</p>
        <p>3. Elegí el tipo de comprobante según tu condición impositiva</p>
      </div>

      <form onSubmit={guardar} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Tipo de comprobante</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 'C', label: 'Factura C', desc: 'Monotributista'       },
              { val: 'B', label: 'Factura B', desc: 'RI → Cons. Final'     },
              { val: 'A', label: 'Factura A', desc: 'RI → Resp. Inscripto' },
            ].map(({ val, label, desc }) => (
              <button
                key={val}
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, tipoFactura: val }))}
                className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                  config.tipoFactura === val
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Punto de Venta</label>
            <input
              type="number" min="1" value={config.puntoVenta ?? ''}
              onChange={e => setConfig(prev => ({ ...prev, puntoVenta: e.target.value }))}
              placeholder="Ej: 1"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">CUIT del emisor</label>
            <input
              type="text" value={config.cuit ?? ''}
              onChange={e => setConfig(prev => ({ ...prev, cuit: e.target.value }))}
              placeholder="20-12345678-9"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Certificados digitales</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button" onClick={() => seleccionarArchivo('cert')}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                tieneCert ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-slate-300 text-slate-500'
              }`}
            >
              <FileKey size={15} />
              {tieneCert ? '✓ Certificado cargado' : 'Cargar certificado (.pem/.crt)'}
            </button>
            <button
              type="button" onClick={() => seleccionarArchivo('key')}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                tieneKey ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-slate-300 text-slate-500'
              }`}
            >
              <FileKey size={15} />
              {tieneKey ? '✓ Clave cargada' : 'Cargar clave privada (.key)'}
            </button>
          </div>
          {(tieneCert || tieneKey) && (
            <button type="button" onClick={eliminarCert} className="text-xs text-red-400 hover:text-red-600 transition-colors">
              Eliminar certificados del disco
            </button>
          )}
        </div>

        <div className="flex items-center justify-between py-2 border-t border-slate-100">
          <div>
            <p className="text-sm font-medium text-slate-700">Ambiente de producción</p>
            <p className="text-xs text-slate-400">
              {config.produccion ? 'Enviando facturas reales a ARCA' : 'Testing (Homologación) — no genera facturas reales'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfig(prev => ({ ...prev, produccion: !prev.produccion }))}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${config.produccion ? 'bg-blue-600' : 'bg-slate-200'}`}
          >
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${config.produccion ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" cargando={guardando} className="flex-1">Guardar configuración ARCA</Button>
          <Button type="button" variante="secundario" cargando={verificando} onClick={verificar} disabled={!tieneCert || !tieneKey} className="flex-1">
            Probar conexión
          </Button>
        </div>

        {msgVerif && (
          <div className={`flex items-start gap-2 text-sm rounded-xl px-3 py-2.5 ${msgVerif.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            {msgVerif.ok ? <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />}
            <span>{msgVerif.texto}</span>
          </div>
        )}
      </form>
    </div>
  )
}

// ─── Configuración avanzada (ARCA + Módulos + Tema) ──────────────────────────
function ConfigAvanzada({ comercio, refrescarComercio }) {
  const [abierto, setAbierto]           = useState(false)
  const [togglingModulo, setTogglingModulo] = useState(null)

  async function cambiarTema(colorTema) {
    await supabase.from('comercios').update({ color_tema: colorTema }).eq('id', comercio.id)
    await refrescarComercio()
  }

  async function toggleModulo(key, habilitado) {
    setTogglingModulo(key)
    const nuevosModulos = { ...(comercio?.modulos ?? {}), [key]: !habilitado }
    await supabase.from('comercios').update({ modulos: nuevosModulos }).eq('id', comercio.id)
    await refrescarComercio()
    setTogglingModulo(null)
  }

  const MODULOS = [
    { key: 'ventas',   label: 'Punto de Venta', descripcion: 'Venta detallada y venta rápida'              },
    { key: 'caja',     label: 'Caja',            descripcion: 'Apertura, cierre y arqueo de turno'          },
    { key: 'compras',  label: 'Compras',         descripcion: 'Registro de compras a proveedores'           },
    { key: 'gastos',   label: 'Gastos',          descripcion: 'Control de egresos por categoría'            },
    { key: 'clientes', label: 'Clientes',        descripcion: 'Gestión de clientes y sus compras'           },
    { key: 'turnos',   label: 'Turnos',          descripcion: 'Agenda con integración Google Calendar'      },
    { key: 'reportes', label: 'Reportes',        descripcion: 'Gráficos y análisis de ventas'               },
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header colapsable */}
      <button
        onClick={() => setAbierto(a => !a)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
            <ShieldCheck size={15} className="text-slate-500" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-800 text-sm">Configuración avanzada</p>
            <p className="text-xs text-slate-400">ARCA, módulos habilitados y color de tema</p>
          </div>
        </div>
        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {/* Contenido */}
      {abierto && (
        <div className="border-t border-slate-100 px-6 py-5 space-y-7">

          {/* Módulos */}
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

          {/* Color del tema */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Palette size={15} className="text-slate-400" />
              <h3 className="font-semibold text-slate-800 text-sm">Color del tema</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">Se aplica en el sidebar y los elementos activos. El cambio es inmediato.</p>
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

          {/* ARCA */}
          <ConfigArca />
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Configuracion() {
  const { perfil, comercio, refrescarComercio } = useAuth()
  const esAdmin = perfil?.rol === 'admin'

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
    await supabase.from('comercios').update({ [campo]: null }).eq('id', comercio.id)
    await refrescarComercio()
  }

  async function guardarDatos(datos) {
    await supabase
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
    await refrescarComercio()
    reset(datos)
  }

  return (
    <div className="p-6 max-w-3xl space-y-5 pb-10">
      <div className="flex items-center gap-3 mb-2">
        <Building2 size={20} className="text-slate-500" />
        <h1 className="text-xl font-bold text-slate-900">Configuración del comercio</h1>
      </div>

      {/* ── Datos del negocio ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Datos del negocio</h3>
        <form onSubmit={handleSubmit(guardarDatos)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
            <Input label="Teléfono" placeholder="011-4444-5555" disabled={!esAdmin} {...register('telefono')} />
            <Input label="Email" type="email" placeholder="contacto@mitienda.com" disabled={!esAdmin} {...register('email')} />
          </div>

          {/* Tipo de perfil de contacto */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Tipo de perfil de contacto</p>
            <p className="text-xs text-slate-400 mb-3">
              Define como se llaman los contactos en toda la app y que campos extras estan disponibles.
            </p>
            <div className="grid grid-cols-2 gap-3">
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

          {esAdmin && (
            <Button type="submit" cargando={isSubmitting} disabled={!isDirty} className="w-full">
              Guardar datos
            </Button>
          )}
        </form>
      </div>

      {/* Imagenes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SubirImagen
          titulo="Logo del comercio"
          descripcion="Aparece en el sidebar y en los tickets. PNG o SVG con fondo transparente recomendado."
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

      {/* Configuracion avanzada (solo admin) */}
      {esAdmin && <ConfigAvanzada comercio={comercio} refrescarComercio={refrescarComercio} />}

      {!esAdmin && (
        <p className="text-sm text-slate-400 text-center">
          Solo los administradores pueden modificar la configuracion.
        </p>
      )}
    </div>
  )
}
