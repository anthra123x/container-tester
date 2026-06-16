import { ipcMain } from 'electron'
import si from 'systeminformation'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import { getStorageInfo } from '../services/storage.service'
import { getBatteryInfo } from '../services/battery.service'
import { getSensorInfo } from '../services/sensor.service'
import { getWifiInfo } from '../services/network.service'

export function registerHardwareIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.STORAGE_GET_INFO, async () => {
    const data = await getStorageInfo()
    const results = data.map((d, i) => ({
      id: `storage-${i}`,
      category: 'STORAGE' as const,
      testName: d.device,
      status: d.smartStatus === 'Ok' || d.smartStatus === 'good' ? 'PASS' as const : 'WARN' as const,
      value: `${d.type} ${(d.size / 1073741824).toFixed(0)} GB - ${d.usagePercent.toFixed(1)}% usado`,
      observations: d.smartStatus === 'Ok' || d.smartStatus === 'good' ? undefined : 'SMART reporta anomalías. Respalde sus datos.'
    }))
    return { results }
  })

  ipcMain.handle(IPC_CHANNELS.BATTERY_GET_INFO, async () => {
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
  })

  ipcMain.handle(IPC_CHANNELS.SENSOR_GET_TEMPS, async () => {
    const data = await getSensorInfo()
    const results: any[] = []
    if (data.cpuTemperature != null) {
      const status = data.cpuTemperature < 75 ? 'PASS' : data.cpuTemperature < 85 ? 'WARN' : 'FAIL'
      results.push({ id: 'sensor-cpu', category: 'SENSOR' as const, testName: 'Temperatura CPU', status, value: `${data.cpuTemperature}°C`,
        observations: status === 'FAIL' ? 'Temperatura CPU críticamente alta.' : status === 'WARN' ? 'Temperatura CPU elevada.' : undefined })
    }
    if (results.length === 0) {
      results.push({ id: 'sensor-none', category: 'SENSOR' as const, testName: 'Sensores', status: 'SKIP' as const, value: 'No disponibles' })
    }
    return { results }
  })

  ipcMain.handle(IPC_CHANNELS.NETWORK_GET_WIFI, async () => {
    const data = await getWifiInfo()
    const results: any[] = [
      { id: 'wifi-adapter', category: 'NETWORK' as const, testName: 'Adaptador WiFi', status: data.adapterPresent ? 'PASS' as const : 'WARN' as const, value: data.adapterPresent ? data.adapterName : 'No presente',
        observations: data.adapterPresent ? undefined : 'No se detectó adaptador WiFi. Verifique controladores o hardware.' },
    ]
    if (data.connected) {
      results.push({ id: 'wifi-connection', category: 'NETWORK' as const, testName: 'Conexión', status: 'PASS' as const, value: `SSID: ${data.ssid}` })
    }
    return { results }
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
