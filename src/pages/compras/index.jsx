import { Outlet } from 'react-router-dom'

export default function Compras() {
  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
