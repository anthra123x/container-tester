import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Activity,
  MousePointer2,
  Settings,
  Monitor,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/diagnostic/auto', icon: Activity, label: 'Diagnóstico Automático' },
  { to: '/diagnostic/manual', icon: MousePointer2, label: 'Pruebas Manuales' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
]

export function Sidebar() {
  return (
    <aside className="w-60 bg-gradient-to-b from-primary-800 to-primary-900 flex flex-col h-full flex-shrink-0">
      <div className="p-5 border-b border-primary-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-500/30 rounded-lg">
            <Monitor className="w-5 h-5 text-primary-200" />
          </div>
          <div>
            <h1 className="text-white font-extrabold text-sm tracking-widest uppercase">Container</h1>
            <p className="text-primary-300 text-[10px] font-medium tracking-wider uppercase">Diagnostic Suite</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-primary-500/40 text-white shadow-sm shadow-primary-900/20 border border-primary-500/20'
                  : 'text-primary-300 hover:bg-primary-700/50 hover:text-primary-100 border border-transparent'
              }`
            }
          >
            <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-primary-700/30">
        <p className="text-primary-400 text-[10px] font-mono tracking-wider">v1.1.0</p>
      </div>
    </aside>
  )
}
