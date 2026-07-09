import { forwardRef } from 'react'

const Select = forwardRef(function Select(
  { label, error, children, className = '', ...props },
  ref
) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-700">{label}</label>
      )}
      <select
        ref={ref}
        className={`
          w-full px-3 py-2.5 text-sm rounded-lg border transition-colors
          bg-white text-slate-900
          ${error
            ? 'border-red-400 focus:ring-red-300 focus:border-red-400'
            : 'border-slate-300 focus:ring-blue-200 focus:border-blue-400'
          }
          focus:outline-none focus:ring-2
          disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
})

export default Select
