import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Activity,
  MousePointer2,
  Settings,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/diagnostic/auto', icon: Activity, label: 'Diagnóstico Automático' },
  { to: '/diagnostic/manual', icon: MousePointer2, label: 'Pruebas Manuales' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
]

export function Sidebar() {
  return (
    <aside className="w-60 bg-primary-800 flex flex-col h-full flex-shrink-0">
      <div className="p-5 border-b border-primary-700">
        <h1 className="text-white font-extrabold text-lg tracking-wider">CONTAINER</h1>
        <p className="text-primary-300 text-xs font-medium mt-0.5">Diagnostic Suite</p>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-500 text-white'
                  : 'text-primary-200 hover:bg-primary-700 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-primary-700">
        <p className="text-primary-300 text-xs font-mono">v1.0.0</p>
      </div>
    </aside>
  )
}
