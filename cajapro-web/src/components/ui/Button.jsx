import Spinner from './Spinner'

const variantes = {
  primario:   'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
  secundario: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm',
  peligro:    'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  fantasma:   'hover:bg-slate-100 text-slate-600',
  exito:      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
}

export default function Button({
  children,
  variante = 'primario',
  cargando = false,
  className = '',
  ...props
}) {
  return (
    <button
      disabled={cargando || props.disabled}
      className={`
        inline-flex items-center justify-center gap-2
        px-4 py-2.5 rounded-lg text-sm font-medium
        transition-colors duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantes[variante]}
        ${className}
      `}
      {...props}
    >
      {cargando ? <Spinner size="sm" /> : children}
    </button>
  )
}
