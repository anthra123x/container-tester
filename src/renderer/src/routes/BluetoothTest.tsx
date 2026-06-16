import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bluetooth, Check, X, Search, RefreshCw } from 'lucide-react'
import { Button } from '../components/shared/Button'
import { useIpc } from '../hooks/useIpc'
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels'

export function BluetoothTest() {
  const [adapterPresent, setAdapterPresent] = useState(false)
  const [adapterName, setAdapterName] = useState('')
  const [devices, setDevices] = useState<any[]>([])
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<'PASS' | 'FAIL' | null>(null)
  const { invoke } = useIpc()

  const loadBt = useCallback(async () => {
    setScanning(true)
    try {
      const data = await invoke(IPC_CHANNELS.NETWORK_GET_BLUETOOTH)
      if (data) {
        if (data.adapterPresent != null) setAdapterPresent(data.adapterPresent)
        if (data.adapterName) setAdapterName(data.adapterName)
        if (data.devices) setDevices(data.devices)
      }
    } catch {
    } finally {
      setScanning(false)
    }
  }, [invoke])

  useEffect(() => { loadBt() }, [])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Bluetooth className="w-6 h-6 text-primary-500" />
          <h2 className="text-xl font-bold text-primary-800">Prueba de Bluetooth</h2>
        </div>
        <p className="text-sm text-neutral-700">
          Verifique el adaptador Bluetooth y busque dispositivos cercanos.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-5 mb-6">
        <h3 className="font-semibold text-primary-800 mb-3">Adaptador Bluetooth</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-700">Adaptador</span>
            <span className="font-medium text-primary-800">{adapterName || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-700">Presente</span>
            <span className={`font-medium ${adapterPresent ? 'text-success' : 'text-danger'}`}>
              {adapterPresent ? 'Sí' : 'No'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-primary-800">Dispositivos</h3>
          <Button
            variant="secondary"
            size="sm"
            loading={scanning}
            icon={<Search className="w-4 h-4" />}
            onClick={loadBt}
          >
            Escanear
          </Button>
        </div>

        {scanning && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        )}

        {!scanning && devices.length === 0 && (
          <p className="text-sm text-neutral-400 text-center py-4">
            No se encontraron dispositivos Bluetooth.
          </p>
        )}

        {!scanning && devices.length > 0 && (
          <div className="space-y-2">
            {devices.map((dev: any) => (
              <div key={dev.address || dev.name} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                <div className="flex items-center gap-3">
                  <Bluetooth className="w-4 h-4 text-primary-500" />
                  <div>
                    <p className="text-sm font-medium text-primary-800">{dev.name}</p>
                    <p className="text-xs text-neutral-700 font-mono">{dev.address || ''}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {dev.paired && (
                    <span className="text-xs px-2 py-0.5 rounded bg-primary-50 text-primary-500 font-medium">
                      Vinculado
                    </span>
                  )}
                  {dev.connected && (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-50 text-success font-medium">
                      Conectado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {result && (
        <div className={`mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium ${
          result === 'PASS' ? 'bg-success' : 'bg-danger'
        }`}>
          {result === 'PASS' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {result === 'PASS' ? 'Bluetooth aprobado' : 'Bluetooth no aprobado'}
        </div>
      )}

      <div className="flex gap-4">
        <Button variant="danger" icon={<X className="w-4 h-4" />} onClick={() => setResult('FAIL')}>
          Marcar como Falló
        </Button>
        <Button icon={<Check className="w-4 h-4" />} onClick={() => setResult('PASS')}>
          Marcar como Aprobado
        </Button>
      </div>
    </div>
  )
}
