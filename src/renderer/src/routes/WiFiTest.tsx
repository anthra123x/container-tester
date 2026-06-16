import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wifi, Check, X, RefreshCw, Search } from 'lucide-react'
import { Button } from '../components/shared/Button'
import { useIpc } from '../hooks/useIpc'
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels'

export function WiFiTest() {
  const [adapterPresent, setAdapterPresent] = useState(false)
  const [adapterName, setAdapterName] = useState('')
  const [connected, setConnected] = useState(false)
  const [ssid, setSsid] = useState('')
  const [scanning, setScanning] = useState(false)
  const [networks, setNetworks] = useState<string[]>([])
  const [result, setResult] = useState<'PASS' | 'FAIL' | null>(null)
  const { invoke } = useIpc()

  useEffect(() => {
    invoke(IPC_CHANNELS.NETWORK_GET_WIFI).then((data: any) => {
      if (data) {
        if (data.adapterPresent != null) setAdapterPresent(data.adapterPresent)
        if (data.adapterName) setAdapterName(data.adapterName)
        if (data.connected != null) setConnected(data.connected)
        if (data.ssid) setSsid(data.ssid)
        if (data.availableNetworks) setNetworks(data.availableNetworks)
      }
    }).catch(() => {})
  }, [invoke])

  const scanNetworks = useCallback(async () => {
    setScanning(true)
    try {
      const data = await invoke(IPC_CHANNELS.NETWORK_GET_WIFI)
      if (data) {
        if (data.adapterPresent != null) setAdapterPresent(data.adapterPresent)
        if (data.adapterName) setAdapterName(data.adapterName)
        if (data.connected != null) setConnected(data.connected)
        if (data.ssid) setSsid(data.ssid)
        if (data.availableNetworks) setNetworks(data.availableNetworks)
      }
    } catch {
    } finally {
      setScanning(false)
    }
  }, [invoke])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Wifi className="w-6 h-6 text-primary-500" />
          <h2 className="text-xl font-bold text-primary-800">Prueba de WiFi</h2>
        </div>
        <p className="text-sm text-neutral-700">
          Verifique el adaptador WiFi y escanee redes disponibles.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-5 mb-6">
        <h3 className="font-semibold text-primary-800 mb-3">Adaptador WiFi</h3>
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
          <div className="flex justify-between">
            <span className="text-neutral-700">Conectado</span>
            <span className={`font-medium ${connected ? 'text-success' : 'text-neutral-700'}`}>
              {connected ? `Sí (${ssid})` : 'No'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-primary-800">Redes Disponibles</h3>
          <Button
            variant="secondary"
            size="sm"
            loading={scanning}
            icon={<Search className="w-4 h-4" />}
            onClick={scanNetworks}
          >
            Escanear
          </Button>
        </div>

        {networks.length === 0 && !scanning && (
          <p className="text-sm text-neutral-400 text-center py-4">
            No se encontraron redes. Presione "Escanear" para buscar.
          </p>
        )}

        {scanning && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        )}

        {!scanning && networks.length > 0 && (
          <div className="space-y-2">
            {networks.map((net) => (
              <div key={net} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                <div className="flex items-center gap-3">
                  <Wifi className="w-4 h-4 text-primary-500" />
                  <span className="text-sm font-medium text-primary-800">{net}</span>
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
          {result === 'PASS' ? 'WiFi aprobado' : 'WiFi no aprobado'}
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
