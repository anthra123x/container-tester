import { useLocation } from 'react-router-dom'
import { useDiagnosticStore } from '../../stores/diagnostic.store'
import { Monitor, Clock, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useIpc } from '../../hooks/useIpc'
import { IPC_CHANNELS } from '../../../../shared/constants/ipc-channels'
import { SystemSpecsModal } from './SystemSpecsModal'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/diagnostic/auto': 'Diagnóstico Automático',
  '/diagnostic/manual': 'Pruebas Manuales',
  '/diagnostic/manual/screen': 'Prueba de Pantalla',
  '/diagnostic/manual/keyboard': 'Prueba de Teclado',
  '/diagnostic/manual/touchpad': 'Prueba de Touchpad',
  '/diagnostic/manual/camera': 'Prueba de Cámara',
  '/diagnostic/manual/mic': 'Prueba de Micrófono',
  '/diagnostic/manual/audio': 'Prueba de Audio',
  '/diagnostic/manual/wifi': 'Prueba de WiFi',
  '/diagnostic/manual/bluetooth': 'Prueba de Bluetooth',
  '/diagnostic/manual/usb': 'Prueba de USB',
  '/benchmark': 'Benchmark',
  '/reports': 'Reportes',
  '/history': 'Historial',
  '/settings': 'Configuración',
}

export function Header() {
  const location = useLocation()
  const systemInfo = useDiagnosticStore((s) => s.systemInfo)
  const setSystemSpecs = useDiagnosticStore((s) => s.setSystemSpecs)
  const setSpecsModalOpen = useDiagnosticStore((s) => s.setSpecsModalOpen)
  const specsModalOpen = useDiagnosticStore((s) => s.specsModalOpen)
  const { invoke } = useIpc()
  const [dateTime, setDateTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  const title = pageTitles[location.pathname] || 'Container Diagnostic Suite'

  const handleDeviceClick = () => {
    setSpecsModalOpen(true)
    if (!useDiagnosticStore.getState().systemSpecs) {
      invoke(IPC_CHANNELS.GET_SYSTEM_SPECS).then((specs) => {
        setSystemSpecs(specs)
      }).catch(() => {})
    }
  }

  const statusDot = systemInfo
    ? 'bg-success'
    : 'bg-neutral-300'

  return (
    <>
      <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-primary-800">{title}</h2>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm text-neutral-700">
            <Clock className="w-4 h-4" />
            <span className="font-mono">
              {dateTime.toLocaleDateString('es-MX', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}{' '}
              {dateTime.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <button
            onClick={handleDeviceClick}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-neutral-50 transition-colors group"
            title="Ver especificaciones del equipo"
          >
            <Monitor className="w-4 h-4 text-neutral-700" />
            <span className="text-sm font-medium text-primary-800">
              {systemInfo?.hostname || systemInfo?.model || 'Equipo no detectado'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
            <span className={`w-2.5 h-2.5 rounded-full ${statusDot} ml-0.5`} />
          </button>
        </div>
      </header>

      <SystemSpecsModal />
    </>
  )
}
