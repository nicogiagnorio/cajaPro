export default function LayoutAuth({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-3 shadow-lg">
            <span className="text-3xl">🏪</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Caja<span className="text-blue-400">Pro</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gestión inteligente para tu comercio</p>
        </div>

        {/* Contenido de la página de auth */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
