import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import type { AutoDiagnosticPhase, TestStatus } from '../../shared/types/diagnostic.types'
import { getSystemInfo, getCPUInfo, getRAMInfo, getGPUInfo } from '../services/system-info.service'
import si from 'systeminformation'

let cancelRequested = false

function getDiagnosticPhases(): Omit<AutoDiagnosticPhase, 'results'>[] {
  return [
    { id: 'system', label: 'Información del Sistema', description: 'Recopilando información del equipo', status: 'PENDING' },
    { id: 'cpu', label: 'Diagnóstico de CPU', description: 'Verificando el procesador', status: 'PENDING' },
    { id: 'ram', label: 'Diagnóstico de RAM', description: 'Analizando la memoria', status: 'PENDING' },
    { id: 'gpu', label: 'Diagnóstico de GPU', description: 'Verificando la tarjeta gráfica', status: 'PENDING' },
    { id: 'storage', label: 'Diagnóstico de Almacenamiento', description: 'Analizando discos', status: 'PENDING' },
    { id: 'battery', label: 'Diagnóstico de Batería', description: 'Verificando estado de la batería', status: 'PENDING' },
    { id: 'sensors', label: 'Diagnóstico de Sensores', description: 'Monitoreando sensores', status: 'PENDING' },
    { id: 'network', label: 'Diagnóstico de Red', description: 'Verificando conectividad', status: 'PENDING' }
  ]
}

async function runSystemPhase(): Promise<AutoDiagnosticPhase> {
  const phase = { id: 'system', label: 'Información del Sistema', description: 'Recopilando información del equipo', status: 'RUNNING' as TestStatus, results: [] as any[] }
  try {
    const info = await getSystemInfo()
    phase.results = [
      { id: 'sys-hostname', category: 'HARDWARE' as const, testName: 'Hostname', status: 'PASS' as const, value: info.hostname },
      { id: 'sys-model', category: 'HARDWARE' as const, testName: 'Modelo', status: 'PASS' as const, value: info.model },
      { id: 'sys-manufacturer', category: 'HARDWARE' as const, testName: 'Fabricante', status: 'PASS' as const, value: info.manufacturer }
    ]
    phase.status = 'PASS'
  } catch {
    phase.status = 'FAIL'
  }
  return phase
}

async function runCPUPhase(): Promise<AutoDiagnosticPhase> {
  const phase = { id: 'cpu', label: 'Diagnóstico de CPU', description: 'Verificando el procesador', status: 'RUNNING' as TestStatus, results: [] as any[] }
  try {
    const cpu = await getCPUInfo()

    let usageStatus: TestStatus
    if (cpu.usage < 70) usageStatus = 'PASS'
    else if (cpu.usage < 90) usageStatus = 'WARN'
    else usageStatus = 'FAIL'

    phase.results = [
      { id: 'cpu-brand', category: 'HARDWARE' as const, testName: 'Marca/Modelo', status: 'PASS' as const, value: `${cpu.manufacturer} ${cpu.brand}` },
      { id: 'cpu-cores', category: 'HARDWARE' as const, testName: 'Núcleos', status: 'PASS' as const, value: `${cpu.physicalCores} físicos / ${cpu.cores} lógicos` },
      { id: 'cpu-speed', category: 'HARDWARE' as const, testName: 'Velocidad', status: 'PASS' as const, value: `${cpu.speed} GHz` },
      { id: 'cpu-usage', category: 'HARDWARE' as const, testName: 'Uso actual', status: usageStatus, value: `${cpu.usage}%` }
    ]

    if (cpu.temperature !== null) {
      let tempStatus: TestStatus
      if (cpu.temperature < 75) tempStatus = 'PASS'
      else if (cpu.temperature < 85) tempStatus = 'WARN'
      else tempStatus = 'FAIL'

      phase.results.push({
        id: 'cpu-temp', category: 'SENSOR' as const, testName: 'Temperatura CPU', status: tempStatus, value: `${cpu.temperature}°C`
      })
    }

    phase.status = phase.results.some(r => r.status === 'FAIL') ? 'FAIL'
      : phase.results.some(r => r.status === 'WARN') ? 'WARN'
      : 'PASS'
  } catch {
    phase.status = 'FAIL'
  }
  return phase
}

async function runRAMPhase(): Promise<AutoDiagnosticPhase> {
  const phase = { id: 'ram', label: 'Diagnóstico de RAM', description: 'Analizando la memoria', status: 'RUNNING' as TestStatus, results: [] as any[] }
  try {
    const ram = await getRAMInfo()

    let usageStatus: TestStatus
    if (ram.usagePercent < 70) usageStatus = 'PASS'
    else if (ram.usagePercent < 90) usageStatus = 'WARN'
    else usageStatus = 'FAIL'

    const freeGB = ram.free / 1073741824
    let freeStatus: TestStatus
    if (freeGB >= 4) freeStatus = 'PASS'
    else if (freeGB >= 1.5) freeStatus = 'WARN'
    else freeStatus = 'FAIL'

    const speeds = ram.slots.filter(s => s.speed > 0)
    const uniqueSpeeds = new Set(speeds.map(s => s.speed))
    let mismatchStatus: TestStatus | null = null
    if (speeds.length > 1 && uniqueSpeeds.size > 1) {
      mismatchStatus = 'WARN'
    }

    phase.results = [
      { id: 'ram-total', category: 'HARDWARE' as const, testName: 'Memoria total', status: 'PASS' as const, value: `${(ram.total / 1073741824).toFixed(2)} GB` },
      { id: 'ram-usage', category: 'HARDWARE' as const, testName: 'Uso', status: usageStatus, value: `${ram.usagePercent}%` },
      { id: 'ram-free', category: 'HARDWARE' as const, testName: 'Memoria libre', status: freeStatus, value: `${freeGB.toFixed(2)} GB` },
      { id: 'ram-slots', category: 'HARDWARE' as const, testName: 'Módulos', status: 'PASS' as const, value: `${ram.slots.length} slots` }
    ]

    for (const slot of ram.slots) {
      phase.results.push({
        id: `ram-slot-${slot.bank}`, category: 'HARDWARE' as const, testName: `${slot.bank}`,
        status: 'PASS' as const,
        value: `${slot.size > 0 ? (slot.size / 1073741824).toFixed(0) + ' GB' : 'N/A'} ${slot.type} @ ${slot.speed} MHz`
      })
    }

    if (mismatchStatus) {
      const speedsStr = [...uniqueSpeeds].map(s => `${s} MHz`).join(', ')
      phase.results.push({
        id: 'ram-speed-mismatch', category: 'HARDWARE' as const, testName: 'Velocidades mixtas',
        status: mismatchStatus, value: speedsStr
      })
    }

    phase.status = phase.results.some(r => r.status === 'FAIL') ? 'FAIL'
      : phase.results.some(r => r.status === 'WARN') ? 'WARN'
      : 'PASS'
  } catch {
    phase.status = 'FAIL'
  }
  return phase
}

async function runGPUPhase(): Promise<AutoDiagnosticPhase> {
  const phase = { id: 'gpu', label: 'Diagnóstico de GPU', description: 'Verificando la tarjeta gráfica', status: 'RUNNING' as TestStatus, results: [] as any[] }
  try {
    const gpu = await getGPUInfo()
    phase.results = [
      { id: 'gpu-model', category: 'HARDWARE' as const, testName: 'Modelo', status: 'PASS' as const, value: gpu.model },
      { id: 'gpu-vram', category: 'HARDWARE' as const, testName: 'VRAM', status: 'PASS' as const, value: `${gpu.vram} MB` },
      { id: 'gpu-driver', category: 'HARDWARE' as const, testName: 'Driver', status: 'PASS' as const, value: gpu.driverVersion }
    ]
    phase.status = 'PASS'
  } catch {
    phase.status = 'FAIL'
  }
  return phase
}

async function runStoragePhase(): Promise<AutoDiagnosticPhase> {
  const phase = { id: 'storage', label: 'Diagnóstico de Almacenamiento', description: 'Analizando discos', status: 'RUNNING' as TestStatus, results: [] as any[] }
  try {
    const disks = await si.diskLayout()
    const fsSize = await si.fsSize()

    let hasSmartIssue = false
    for (const disk of disks) {
      const fs = fsSize.find(f => f.fs.includes(disk.device) || disk.device.includes(f.fs.substring(0, 3)))

      phase.results.push({
        id: `disk-${disk.device}`, category: 'STORAGE' as const, testName: `${disk.name}`,
        status: 'PASS' as const,
        value: `${disk.type} - ${(disk.size / 1073741824).toFixed(0)} GB`
      })

      if (disk.smartStatus && disk.smartStatus !== 'Ok' && disk.smartStatus !== 'good') {
        hasSmartIssue = true
        phase.results.push({
          id: `disk-smart-${disk.device}`, category: 'STORAGE' as const, testName: 'SMART',
          status: 'WARN' as const, value: disk.smartStatus
        })
      }

      if (fs) {
        let usageStatus: TestStatus
        if (fs.use < 80) usageStatus = 'PASS'
        else if (fs.use < 95) usageStatus = 'WARN'
        else usageStatus = 'FAIL'

        phase.results.push({
          id: `disk-usage-${disk.device}`, category: 'STORAGE' as const, testName: `Uso ${disk.device}`,
          status: usageStatus,
          value: `${fs.use.toFixed(1)}%`
        })
      }

      if (disk.temperature !== null && disk.temperature > 0) {
        let tempStatus: TestStatus
        if (disk.temperature < 50) tempStatus = 'PASS'
        else if (disk.temperature < 60) tempStatus = 'WARN'
        else tempStatus = 'FAIL'

        phase.results.push({
          id: `disk-temp-${disk.device}`, category: 'SENSOR' as const, testName: 'Temperatura',
          status: tempStatus, value: `${disk.temperature}°C`
        })
      }
    }

    phase.status = phase.results.some(r => r.status === 'FAIL') ? 'FAIL'
      : (phase.results.some(r => r.status === 'WARN') || hasSmartIssue) ? 'WARN'
      : 'PASS'
  } catch {
    phase.status = 'FAIL'
  }
  return phase
}

async function runBatteryPhase(): Promise<AutoDiagnosticPhase> {
  const phase = { id: 'battery', label: 'Diagnóstico de Batería', description: 'Verificando estado de la batería', status: 'RUNNING' as TestStatus, results: [] as any[] }
  try {
    const battery = await si.battery()
    if (!battery.hasBattery) {
      phase.results = [{ id: 'battery-none', category: 'BATTERY' as const, testName: 'Batería', status: 'SKIP' as const, value: 'No detectada' }]
      phase.status = 'SKIP'
    } else {
      const wear = battery.maxCapacity && battery.designedCapacity
        ? Math.round((1 - battery.maxCapacity / battery.designedCapacity) * 100)
        : 0
      const health = Math.max(0, 100 - wear)

      let wearStatus: TestStatus
      if (wear < 20) wearStatus = 'PASS'
      else if (wear < 40) wearStatus = 'WARN'
      else wearStatus = 'FAIL'

      let healthStatus: TestStatus
      if (health >= 80) healthStatus = 'PASS'
      else if (health >= 60) healthStatus = 'WARN'
      else healthStatus = 'FAIL'

      let cyclesStatus: TestStatus | null = null
      if (battery.cycleCount && battery.cycleCount >= 500) {
        cyclesStatus = 'WARN'
      }

      phase.results = [
        { id: 'battery-capacity', category: 'BATTERY' as const, testName: 'Capacidad actual', status: 'PASS' as const, value: `${battery.currentCapacity} / ${battery.maxCapacity} mAh` },
        { id: 'battery-design', category: 'BATTERY' as const, testName: 'Capacidad diseño', status: 'PASS' as const, value: `${battery.designedCapacity} mAh` },
        { id: 'battery-wear', category: 'BATTERY' as const, testName: 'Desgaste', status: wearStatus, value: `${wear}%` },
        { id: 'battery-health', category: 'BATTERY' as const, testName: 'Salud', status: healthStatus, value: `${health}%` },
        { id: 'battery-status', category: 'BATTERY' as const, testName: 'Estado', status: battery.isCharging ? 'PASS' as const : 'WARN' as const, value: battery.isCharging ? 'Cargando' : 'No cargando' }
      ]

      if (battery.cycleCount) {
        phase.results.push({
          id: 'battery-cycles', category: 'BATTERY' as const, testName: 'Ciclos', status: cyclesStatus || 'PASS' as const, value: `${battery.cycleCount}`
        })
      }

      phase.status = phase.results.some(r => r.status === 'FAIL') ? 'FAIL'
        : phase.results.some(r => r.status === 'WARN') ? 'WARN'
        : 'PASS'
    }
  } catch {
    phase.status = 'FAIL'
  }
  return phase
}

async function runSensorsPhase(): Promise<AutoDiagnosticPhase> {
  const phase = { id: 'sensors', label: 'Diagnóstico de Sensores', description: 'Monitoreando sensores', status: 'RUNNING' as TestStatus, results: [] as any[] }
  try {
    const temps = await si.cpuTemperature()
    if (temps.main !== null && temps.main !== -1) {
      let tempStatus: TestStatus
      if (temps.main < 60) tempStatus = 'PASS'
      else if (temps.main < 80) tempStatus = 'WARN'
      else tempStatus = 'FAIL'

      phase.results.push({
        id: 'sensor-cpu-temp', category: 'SENSOR' as const, testName: 'Temperatura CPU',
        status: tempStatus,
        value: `${temps.main}°C`
      })
      if (temps.max !== undefined && temps.max !== null) {
        phase.results.push({
          id: 'sensor-cpu-max', category: 'SENSOR' as const, testName: 'CPU máxima',
          status: 'PASS' as const, value: `${temps.max}°C`
        })
      }
    }
    if (phase.results.length === 0) {
      phase.results = [{ id: 'sensor-none', category: 'SENSOR' as const, testName: 'Sensores', status: 'SKIP' as const, value: 'No disponibles' }]
      phase.status = 'SKIP'
    } else {
      phase.status = phase.results.some(r => r.status === 'FAIL') ? 'FAIL'
        : phase.results.some(r => r.status === 'WARN') ? 'WARN'
        : 'PASS'
    }
  } catch {
    phase.status = 'FAIL'
  }
  return phase
}

async function runNetworkPhase(): Promise<AutoDiagnosticPhase> {
  const phase = { id: 'network', label: 'Diagnóstico de Red', description: 'Verificando conectividad', status: 'RUNNING' as TestStatus, results: [] as any[] }
  try {
    const nets = await si.networkInterfaces()
    if (nets.length === 0) {
      phase.results = [{ id: 'net-none', category: 'NETWORK' as const, testName: 'Red', status: 'SKIP' as const, value: 'Sin interfaces' }]
      phase.status = 'SKIP'
    } else {
      let hasUp = false
      for (const net of nets) {
        const status = net.operstate === 'up' ? 'PASS' as const : 'WARN' as const
        if (net.operstate === 'up') hasUp = true
        phase.results.push({
          id: `net-${net.iface}`, category: 'NETWORK' as const, testName: `${net.iface} (${net.type})`,
          status,
          value: `${net.ip4 || 'Sin IP'} - ${net.operstate === 'up' ? 'Activo' : 'Inactivo'}`
        })
      }
      if (nets.some(n => n.type === 'wireless')) {
        try {
          const wifiNetworks = await si.wifiNetworks()
          if (wifiNetworks.length > 0) {
            const signalAvg = wifiNetworks.reduce((sum, n) => sum + (n.signal_level || 0), 0) / wifiNetworks.length
            let signalStatus: TestStatus
            if (signalAvg >= -70) signalStatus = 'PASS'
            else if (signalAvg >= -80) signalStatus = 'WARN'
            else signalStatus = 'FAIL'

            phase.results.push({
              id: 'net-wifi-signal', category: 'NETWORK' as const, testName: 'Redes WiFi disponibles',
              status: signalStatus, value: `${wifiNetworks.length} redes, señal media: ${signalAvg.toFixed(0)} dBm`
            })
          }
        } catch {
          // signal info not available
        }
      }
      phase.status = hasUp ? 'PASS' : 'WARN'
    }
  } catch {
    phase.status = 'FAIL'
  }
  return phase
}

export function registerDiagnosticsIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.DIAGNOSTIC_GET_PHASES, async (): Promise<Omit<AutoDiagnosticPhase, 'results'>[]> => {
    return getDiagnosticPhases()
  })

  ipcMain.handle(IPC_CHANNELS.DIAGNOSTIC_RUN_AUTO, async (): Promise<AutoDiagnosticPhase[]> => {
    cancelRequested = false

    const runners = [
      runSystemPhase, runCPUPhase, runRAMPhase, runGPUPhase,
      runStoragePhase, runBatteryPhase, runSensorsPhase, runNetworkPhase
    ]

    const results = await Promise.allSettled(runners.map((r) => r()))
    return results.map((r) =>
      r.status === 'fulfilled' ? r.value : {
        id: 'error',
        label: 'Error',
        description: 'Fase fallida',
        status: 'FAIL' as TestStatus,
        results: [{ id: 'error', category: 'HARDWARE' as const, testName: 'Error', status: 'FAIL' as const, value: r.reason?.message || 'Error desconocido' }],
      }
    )
  })

  ipcMain.handle(IPC_CHANNELS.DIAGNOSTIC_RUN_PHASE, async (_event, phaseId: string): Promise<AutoDiagnosticPhase> => {
    const phaseRunners: Record<string, () => Promise<AutoDiagnosticPhase>> = {
      system: runSystemPhase,
      cpu: runCPUPhase,
      ram: runRAMPhase,
      gpu: runGPUPhase,
      storage: runStoragePhase,
      battery: runBatteryPhase,
      sensors: runSensorsPhase,
      network: runNetworkPhase
    }
    const runner = phaseRunners[phaseId]
    if (!runner) {
      throw new Error(`Unknown phase: ${phaseId}`)
    }
    return runner()
  })

  ipcMain.handle(IPC_CHANNELS.DIAGNOSTIC_CANCEL, async (): Promise<void> => {
    cancelRequested = true
  })
}
