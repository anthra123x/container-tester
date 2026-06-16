import { ipcMain } from 'electron'
import si from 'systeminformation'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import { getStorageInfo } from '../services/storage.service'
import { getBatteryInfo } from '../services/battery.service'
import { getSensorInfo } from '../services/sensor.service'
import { getWifiInfo } from '../services/network.service'

export function registerHardwareIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.STORAGE_GET_INFO, async () => {
    try {
      const data = await getStorageInfo()
      const results = data.map((d, i) => ({
        id: `storage-${i}`,
        category: 'STORAGE' as const,
        testName: d.device,
        status: d.smartStatus === 'Ok' || d.smartStatus === 'good' ? 'PASS' as const : 'WARN' as const,
        value: `${d.type} ${(d.size / 1073741824).toFixed(0)} GB - ${(d.usagePercent ?? 0).toFixed(1)}% usado`,
        observations: d.smartStatus === 'Ok' || d.smartStatus === 'good' ? undefined : 'SMART reporta anomalías. Respalde sus datos.'
      }))
      return { results }
    } catch {
      return { results: [{ id: 'storage-error', category: 'STORAGE' as const, testName: 'Error', status: 'FAIL' as const, value: 'No disponible' }] }
    }
  })

  ipcMain.handle(IPC_CHANNELS.BATTERY_GET_INFO, async () => {
    try {
      const data = await getBatteryInfo()
      if (!data.hasBattery) {
        return { results: [{ id: 'battery', category: 'BATTERY' as const, testName: 'Batería', status: 'SKIP' as const, value: 'No detectada' }] }
      }
      const healthStatus = (data.health >= 80 ? 'PASS' : data.health >= 60 ? 'WARN' : 'FAIL') as 'PASS' | 'WARN' | 'FAIL'
      const wearStatus = (data.wearLevel < 20 ? 'PASS' : data.wearLevel < 40 ? 'WARN' : 'FAIL') as 'PASS' | 'WARN' | 'FAIL'
      const results = [
        { id: 'battery-health', category: 'BATTERY' as const, testName: 'Salud', status: healthStatus, value: `${data.health}%`,
          observations: healthStatus === 'FAIL' ? 'Salud de batería crítica. Reemplácela.' : healthStatus === 'WARN' ? 'Salud de batería disminuida.' : undefined },
        { id: 'battery-wear', category: 'BATTERY' as const, testName: 'Desgaste', status: wearStatus, value: `${data.wearLevel}%`,
          observations: wearStatus === 'FAIL' ? 'Desgaste avanzado (>=40%). Reemplace la batería.' : wearStatus === 'WARN' ? 'Desgaste moderado (>=20%).' : undefined },
        { id: 'battery-capacity', category: 'BATTERY' as const, testName: 'Capacidad', status: 'PASS' as const, value: `${data.currentCapacity} / ${data.maxCapacity} mAh` },
      ]
      if (data.cycleCount) {
        const cycleStatus = (data.cycleCount < 500 ? 'PASS' : 'WARN') as 'PASS' | 'WARN'
        results.push({ id: 'battery-cycles', category: 'BATTERY' as const, testName: 'Ciclos', status: cycleStatus, value: `${data.cycleCount}`,
          observations: cycleStatus === 'WARN' ? 'Ciclos de carga elevados (>=500).' : undefined })
      }
      return { results }
    } catch {
      return { results: [{ id: 'battery-error', category: 'BATTERY' as const, testName: 'Error', status: 'FAIL' as const, value: 'No disponible' }] }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SENSOR_GET_TEMPS, async () => {
    try {
      const data = await getSensorInfo()
      const results: any[] = []
      if (data.cpu?.main != null) {
        const status = data.cpu.main < 75 ? 'PASS' : data.cpu.main < 85 ? 'WARN' : 'FAIL'
        results.push({ id: 'sensor-cpu', category: 'SENSOR' as const, testName: 'Temperatura CPU', status, value: `${data.cpu.main}°C`,
          observations: status === 'FAIL' ? 'Temperatura CPU críticamente alta.' : status === 'WARN' ? 'Temperatura CPU elevada.' : undefined })
      }
      if (data.gpu?.temperature != null) {
        const gpuStatus = data.gpu.temperature < 75 ? 'PASS' : data.gpu.temperature < 85 ? 'WARN' : 'FAIL'
        results.push({ id: 'sensor-gpu', category: 'SENSOR' as const, testName: 'Temperatura GPU', status: gpuStatus, value: `${data.gpu.temperature}°C`,
          observations: gpuStatus === 'FAIL' ? 'Temperatura GPU críticamente alta.' : gpuStatus === 'WARN' ? 'Temperatura GPU elevada.' : undefined })
      }
      for (const disk of data.storage) {
        if (disk.temperature != null) {
          results.push({ id: `sensor-disk-${disk.device}`, category: 'SENSOR' as const, testName: `Temp. ${disk.device}`, status: 'PASS' as const, value: `${disk.temperature}°C` })
        }
      }
      if (results.length === 0) {
        results.push({ id: 'sensor-none', category: 'SENSOR' as const, testName: 'Sensores', status: 'SKIP' as const, value: 'No disponibles' })
      }
      return { results }
    } catch {
      return { results: [{ id: 'sensor-error', category: 'SENSOR' as const, testName: 'Error sensores', status: 'FAIL' as const, value: 'No disponible' }] }
    }
  })

  ipcMain.handle(IPC_CHANNELS.NETWORK_GET_WIFI, async () => {
    try {
      const data = await getWifiInfo()
      const results: any[] = []
      const adapterPresent = data.interfaces.length > 0
      results.push({
        id: 'wifi-adapter', category: 'NETWORK' as const, testName: 'Adaptador WiFi',
        status: adapterPresent ? 'PASS' as const : 'WARN' as const,
        value: adapterPresent ? (data.interfaces[0].model || data.interfaces[0].iface) : 'No presente',
        observations: adapterPresent ? undefined : 'No se detectó adaptador WiFi. Verifique controladores o hardware.'
      })
      const connected = data.networks.length > 0
      if (connected) {
        results.push({
          id: 'wifi-connection', category: 'NETWORK' as const, testName: 'Conexión',
          status: 'PASS' as const, value: `SSID: ${data.networks[0].ssid}`
        })
      }
      return { results }
    } catch {
      return { results: [{ id: 'wifi-error', category: 'NETWORK' as const, testName: 'Error WiFi', status: 'FAIL' as const, value: 'No disponible' }] }
    }
  })

  ipcMain.handle(IPC_CHANNELS.NETWORK_GET_BLUETOOTH, async () => {
    try {
      const bt = await si.bluetoothDevices()
      const adapterPresent = bt.length > 0
      const results = [
        { id: 'bt-adapter', category: 'NETWORK' as const, testName: 'Adaptador Bluetooth', status: adapterPresent ? 'PASS' as const : 'SKIP' as const, value: adapterPresent ? bt[0].name : 'No detectado' },
      ]
      for (const dev of bt) {
        results.push({
          id: `bt-device-${dev.address || dev.name}`, category: 'NETWORK' as const, testName: dev.name,
          status: dev.connected ? 'PASS' as const : 'WARN' as const,
          value: `${dev.connected ? 'Conectado' : 'No conectado'}${dev.paired ? ' (vinculado)' : ''}`
        })
      }
      return { results, adapterPresent, adapterName: bt[0]?.name || '', devices: bt.map(d => ({ name: d.name, address: d.address || '', paired: d.paired, connected: d.connected })) }
    } catch {
      return { results: [{ id: 'bt-error', category: 'NETWORK' as const, testName: 'Bluetooth', status: 'SKIP' as const, value: 'No disponible' }], adapterPresent: false, adapterName: '', devices: [] }
    }
  })
}
