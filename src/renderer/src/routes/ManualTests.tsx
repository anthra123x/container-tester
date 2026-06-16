import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Monitor,
  Keyboard,
  Mouse,
  Camera,
  Mic,
  Volume2,
  Wifi,
  Bluetooth,
  Usb,
} from 'lucide-react'

const tests = [
  {
    to: '/diagnostic/manual/screen',
    icon: Monitor,
    title: 'Pantalla',
    description: 'Verificar colores, brillo y píxeles',
    status: 'PENDING' as const,
  },
  {
    to: '/diagnostic/manual/keyboard',
    icon: Keyboard,
    title: 'Teclado',
    description: 'Probar todas las teclas del teclado',
    status: 'PENDING' as const,
  },
  {
    to: '/diagnostic/manual/touchpad',
    icon: Mouse,
    title: 'Touchpad',
    description: 'Verificar clics, desplazamiento y gestos',
    status: 'PENDING' as const,
  },
  {
    to: '/diagnostic/manual/camera',
    icon: Camera,
    title: 'Cámara',
    description: 'Probar captura de video e imagen',
    status: 'PENDING' as const,
  },
  {
    to: '/diagnostic/manual/mic',
    icon: Mic,
    title: 'Micrófono',
    description: 'Grabar y reproducir audio',
    status: 'PENDING' as const,
  },
  {
    to: '/diagnostic/manual/audio',
    icon: Volume2,
    title: 'Audio',
    description: 'Reproducir tono de prueba',
    status: 'PENDING' as const,
  },
  {
    to: '/diagnostic/manual/wifi',
    icon: Wifi,
    title: 'WiFi',
    description: 'Detectar y escanear redes inalámbricas',
    status: 'PENDING' as const,
  },
  {
    to: '/diagnostic/manual/bluetooth',
    icon: Bluetooth,
    title: 'Bluetooth',
    description: 'Detectar dispositivos Bluetooth',
    status: 'PENDING' as const,
  },
  {
    to: '/diagnostic/manual/usb',
    icon: Usb,
    title: 'USB',
    description: 'Probar puertos USB del equipo',
    status: 'PENDING' as const,
  },
]

const statusColors = {
  PASS: 'bg-success',
  FAIL: 'bg-danger',
  WARN: 'bg-warning',
  PENDING: 'bg-neutral-200',
  RUNNING: 'bg-primary-500',
  SKIP: 'bg-neutral-200',
}

export function ManualTests() {
  const navigate = useNavigate()

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-primary-800">Pruebas Manuales</h2>
        <p className="text-sm text-neutral-700 mt-1">
          Seleccione una prueba para iniciar la verificación manual del componente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tests.map((test, i) => {
          const Icon = test.icon
          return (
            <motion.div
              key={test.to}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(30,58,95,0.12)' }}
              onClick={() => navigate(test.to)}
              className="bg-white rounded-xl border border-neutral-200 p-5 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-primary-50 text-primary-500">
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`w-2.5 h-2.5 rounded-full ${statusColors[test.status]}`} />
              </div>
              <h3 className="font-semibold text-primary-800 mb-1">{test.title}</h3>
              <p className="text-sm text-neutral-700">{test.description}</p>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
