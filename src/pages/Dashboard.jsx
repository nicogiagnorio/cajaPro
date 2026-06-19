import { Package, ShoppingCart, ShoppingBag, Wallet, BarChart3, Landmark, AlertTriangle, PackageX, ChevronRight, UserCircle2, CalendarDays } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useStockAlertas } from "../hooks/useStockAlertas"

const MODULOS = [
  { icono: Package,      nombre: "Inventario",     descripcion: "Productos, stock, categorias y proveedores",   color: "bg-violet-50 text-violet-600", ruta: "/app/inventario", moduloKey: null       },
  { icono: ShoppingCart, nombre: "Punto de Venta", descripcion: "Registra ventas detalladas o rapidas",         color: "bg-blue-50 text-blue-600",     ruta: "/app/ventas",     moduloKey: "ventas"   },
  { icono: Landmark,     nombre: "Caja",           descripcion: "Apertura, cierre y arqueo de caja diario",     color: "bg-teal-50 text-teal-600",     ruta: "/app/caja",       moduloKey: "caja"     },
  { icono: CalendarDays, nombre: "Turnos",         descripcion: "Agenda, horarios por profesional y servicios", color: "bg-sky-50 text-sky-600",       ruta: "/app/turnos",     moduloKey: "turnos"   },
  { icono: ShoppingBag,  nombre: "Compras",        descripcion: "Recibi mercaderia y registra gastos de compra",color: "bg-indigo-50 text-indigo-600", ruta: "/app/compras",    moduloKey: "compras"  },
  { icono: Wallet,       nombre: "Gastos",         descripcion: "Controla los egresos por categoria",           color: "bg-amber-50 text-amber-600",   ruta: "/app/gastos",     moduloKey: "gastos"   },
  { icono: UserCircle2,  nombre: "Clientes",       descripcion: "Registra clientes y su historial de compras",  color: "bg-rose-50 text-rose-600",     ruta: "/app/clientes",   moduloKey: "clientes" },
  { icono: BarChart3,    nombre: "Reportes",       descripcion: "Ventas, rentabilidad y comparativa de gastos", color: "bg-emerald-50 text-emerald-600",ruta: "/app/reportes",   moduloKey: "reportes" },
]

export default function Dashboard() {
  const { perfil, comercio } = useAuth()
  const navigate   = useNavigate()
  const { alertas, sinStock, bajoStock } = useStockAlertas()

  const nombreCorto = perfil?.nombre?.split(" ")[0] ?? ""

  return (
    <div className="p-8 max-w-4xl mx-auto pb-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Bienvenido, {nombreCorto}!
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Desde aca manejas todo tu comercio en un solo lugar.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <span className={"inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold " + (perfil?.rol === "admin" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600")}>
          {perfil?.rol === "admin" ? "Administrador" : "Cajero"}
        </span>
      </div>

      {alertas.length > 0 && (
        <div className="mb-8 bg-white rounded-2xl border border-amber-200 overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-amber-50 transition-colors"
            onClick={() => navigate("/app/inventario/productos")}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">
                  {alertas.length} {alertas.length === 1 ? "producto necesita" : "productos necesitan"} atencion
                </p>
                <p className="text-xs text-slate-500">
                  {sinStock.length > 0 && sinStock.length + " sin stock"}
                  {sinStock.length > 0 && bajoStock.length > 0 && " / "}
                  {bajoStock.length > 0 && bajoStock.length + " bajo minimo"}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </div>
          <div className="border-t border-amber-100 divide-y divide-slate-50">
            {alertas.slice(0, 5).map(p => {
              const sinStockItem = Number(p.stock_actual) <= 0
              return (
                <div key={p.id} className="flex items-center justify-between px-5 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {sinStockItem
                      ? <PackageX size={14} className="text-red-500 flex-shrink-0" />
                      : <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                    }
                    <span className="text-sm text-slate-700 truncate">{p.nombre}</span>
                    {p.categorias?.nombre && (
                      <span className="text-xs text-slate-400 hidden sm:inline"> {p.categorias.nombre}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                    <span className={"text-sm font-semibold " + (sinStockItem ? "text-red-600" : "text-amber-600")}>
                      {p.stock_actual}
                    </span>
                    <span className="text-xs text-slate-400">{p.unidad}</span>
                    {p.stock_minimo > 0 && (
                      <span className="text-xs text-slate-300">/ min {p.stock_minimo}</span>
                    )}
                  </div>
                </div>
              )
            })}
            {alertas.length > 5 && (
              <div
                className="px-5 py-2.5 text-xs text-amber-600 font-medium cursor-pointer hover:bg-amber-50 transition-colors"
                onClick={() => navigate("/app/inventario/productos")}
              >
                Ver {alertas.length - 5} mas en Inventario
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODULOS
          .filter(({ moduloKey }) => !moduloKey || comercio?.modulos?.[moduloKey] !== false)
          .map(({ icono: Icono, nombre, descripcion, color, ruta }) => (
            <div
              key={nombre}
              onClick={() => navigate(ruta)}
              className="bg-white rounded-2xl border border-slate-200 p-6 overflow-hidden transition-all hover:border-blue-200 hover:shadow-md cursor-pointer group"
            >
              <div className={"w-11 h-11 rounded-xl flex items-center justify-center mb-4 " + color}>
                <Icono size={22} />
              </div>
              <h3 className="font-semibold mb-1 text-slate-900 group-hover:text-blue-700">{nombre}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{descripcion}</p>
            </div>
          ))
        }
      </div>

      <p className="text-center text-xs text-slate-400 mt-10">
        CajaPro v0.6.0
      </p>
    </div>
  )
}
