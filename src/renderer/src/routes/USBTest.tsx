import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Usb, Check, X, Plug, Unplug } from 'lucide-react'
import { Button } from '../components/shared/Button'
import { useIpc } from '../hooks/useIpc'
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels'

interface USBDevice {
  name: string
  detectedAt: string
}

export function USBTest() {
  const [devices, setDevices] = useState<USBDevice[]>([])
  const [detectionCount, setDetectionCount] = useState(0)
  const [result, setResult] = useState<'PASS' | 'FAIL' | null>(null)
  const [monitoring, setMonitoring] = useState(false)
  const { invoke, on } = useIpc()

  useEffect(() => {
    if (!monitoring) return
    const cleanup = on(IPC_CHANNELS.MANUAL_USB_EVENT, (data: any) => {
      if (data?.added) {
        const now = new Date().toLocaleTimeString('es-MX')
        const newDevices = data.added.map((name: string) => ({
          name,
          detectedAt: now
        }))
        setDevices((prev) => [...newDevices, ...prev])
        setDetectionCount((c) => c + data.added.length)
      }
    })
    return () => { cleanup() }
  }, [monitoring, on])

  const startMonitoring = useCallback(async () => {
    try {
      await invoke(IPC_CHANNELS.MANUAL_USB_MONITOR_START)
      setMonitoring(true)
    } catch {}
  }, [invoke])

  const stopMonitoring = useCallback(async () => {
    try {
      await invoke(IPC_CHANNELS.MANUAL_USB_MONITOR_STOP)
    } catch {}
    setMonitoring(false)
  }, [invoke])

  useEffect(() => {
    return () => { stopMonitoring() }
  }, [])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Usb className="w-6 h-6 text-primary-500" />
          <h2 className="text-xl font-bold text-primary-800">Prueba de USB</h2>
        </div>
        <p className="text-sm text-neutral-700">
          Conecte y desconecte un dispositivo USB. El sistema detectará cada
          conexión. Se requiere al menos 1 detección para aprobar.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6 text-center">
        <motion.div
          animate={monitoring ? { scale: [1, 1.05, 1] } : {}}
          transition={monitoring ? { repeat: Infinity, duration: 2 } : {}}
          className="inline-flex p-4 rounded-full bg-primary-50 mb-4"
        >
          <Usb className={`w-12 h-12 ${monitoring ? 'text-primary-500' : 'text-neutral-400'}`} />
        </motion.div>

        <h3 className="text-lg font-bold text-primary-800 mb-2">
          {monitoring ? 'Monitoreando...' : 'Esperando conexión'}
        </h3>

        <p className="text-sm text-neutral-700 mb-2">
          Detecciones: <strong className="text-primary-800">{detectionCount}</strong>
        </p>

        {!monitoring && (
          <Button
            size="lg"
            icon={<Plug className="w-5 h-5" />}
            onClick={startMonitoring}
          >
            Iniciar Monitoreo
          </Button>
        )}

        {monitoring && (
          <Button
            variant="danger"
            size="lg"
            icon={<Unplug className="w-5 h-5" />}
            onClick={stopMonitoring}
          >
            Detener Monitoreo
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-5 mb-6">
        <h3 className="font-semibold text-primary-800 mb-4">Dispositivos Detectados</h3>

        {devices.length === 0 && (
          <p className="text-sm text-neutral-400 text-center py-4">
            No se han detectado dispositivos todavía.
          </p>
        )}

        <AnimatePresence>
          <div className="space-y-2">
            {devices.map((dev, i) => (
              <motion.div
                key={`${dev.name}-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between p-3 rounded-lg bg-green-50"
              >
                <div className="flex items-center gap-3">
                  <Usb className="w-4 h-4 text-success" />
                  <div>
                    <p className="text-sm font-medium text-primary-800">{dev.name}</p>
                  </div>
                </div>
                <span className="text-xs text-neutral-700 font-mono">{dev.detectedAt}</span>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </div>

      {result && (
        <div className={`mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium ${
          result === 'PASS' ? 'bg-success' : 'bg-danger'
        }`}>
          {result === 'PASS' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {result === 'PASS' ? 'USB aprobado' : 'USB no aprobado'}
        </div>
      )}

      <div className="flex gap-4">
        <Button variant="danger" icon={<X className="w-4 h-4" />} onClick={() => setResult('FAIL')}>
          Marcar como Falló
        </Button>
        <Button
          icon={<Check className="w-4 h-4" />}
          onClick={() => setResult('PASS')}
          disabled={detectionCount < 1}
        >
          Marcar como Aprobado ({detectionCount} detecciones)
        </Button>
      </div>
    </div>
  )
}
