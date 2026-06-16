import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import type { AutoDiagnosticPhase, TestStatus, DiagnosticResult } from '../../shared/types/diagnostic.types'
import { getSystemInfo, getCPUInfo, getRAMInfo, getGPUInfo, getOSActivation, isSecureBootEnabled, getTPMInfo, getVirtualizationInfo, getPowerPlan, getUptime } from '../services/system-info.service'
import { getStorageInfo } from '../services/storage.service'
import { getBatteryInfo } from '../services/battery.service'
import { getSensorInfo } from '../services/sensor.service'
import { runPowerShellWithRetry } from '../services/powershell'
import si from 'systeminformation'

function result(id: string, category: DiagnosticResult['category'], testName: string, status: TestStatus, value: string, details?: Record<string, unknown>): DiagnosticResult {
  return { id, category, testName, status, value, details }
}

function phaseStatus(results: DiagnosticResult[]): TestStatus {
  if (results.some(r => r.status === 'FAIL')) return 'FAIL'
  if (results.some(r => r.status === 'WARN')) return 'WARN'
  if (results.some(r => r.status === 'RUNNING')) return 'RUNNING'
  if (results.every(r => r.status === 'SKIP')) return 'SKIP'
  if (results.length === 0) return 'SKIP'
  return 'PASS'
}

function detectTypeCategory(id: string): DiagnosticResult['category'] {
  if (id.startsWith('sys-')) return 'OS'
  if (id.startsWith('cpu-') || id.startsWith('ram-') || id.startsWith('gpu-')) return 'HARDWARE'
  if (id.startsWith('disk-') || id.startsWith('smart-')) return 'STORAGE'
  if (id.startsWith('bat-')) return 'BATTERY'
  if (id.startsWith('sensor-')) return 'SENSOR'
  if (id.startsWith('net-') || id.startsWith('ping-') || id.startsWith('dns-')) return 'NETWORK'
  return 'HARDWARE'
}

// ─── PHASE 1: SYSTEM ─────────────────────────────────────────────────────────

async function runSystemPhase(): Promise<AutoDiagnosticPhase> {
  const results: DiagnosticResult[] = []
  try {
    const info = await getSystemInfo()
    results.push(result('sys-hostname', 'OS', 'Hostname', 'PASS', info.hostname))
    results.push(result('sys-model', 'OS', 'Modelo', 'PASS', `${info.manufacturer} ${info.model}`))
    results.push(result('sys-serial', 'OS', 'Serial', 'PASS', info.serial || '—'))
    results.push(result('sys-os', 'OS', 'Sistema Operativo', 'PASS', `${info.os.distro} ${info.os.release} (${info.os.arch})`))
    results.push(result('sys-kernel', 'OS', 'Kernel', 'PASS', info.os.kernel))
    results.push(result('sys-activated', 'OS', 'Activación', info.os.activated ? 'PASS' : 'WARN', info.os.activated ? 'Activado' : 'No activado'))

    const ext = info.extraSystem
    if (ext) {
      if (ext.edition) results.push(result('sys-edition', 'OS', 'Edición de Windows', 'PASS', ext.edition))
      if (ext.uptime) results.push(result('sys-uptime', 'OS', 'Tiempo encendido', 'PASS', `${ext.uptime.days}d ${ext.uptime.hours}h ${ext.uptime.minutes}m`))
      if (ext.powerPlan) results.push(result('sys-powerplan', 'OS', 'Plan de energía', 'PASS', ext.powerPlan))
      if (ext.secureBoot !== null) results.push(result('sys-secureboot', 'OS', 'Secure Boot', ext.secureBoot ? 'PASS' : 'WARN', ext.secureBoot ? 'Activado' : 'Desactivado'))
      if (ext.tpm) results.push(result('sys-tpm', 'OS', 'TPM', ext.tpm.present ? 'PASS' : 'WARN', ext.tpm.present ? `Presente (${ext.tpm.version || 'vN/A'})${ext.tpm.enabled ? ' • Activado' : ' • Desactivado'}` : 'No presente'))
      if (ext.virtualization) results.push(result('sys-virt', 'OS', 'Virtualización', ext.virtualization.enabled ? 'PASS' : ext.virtualization.supported ? 'WARN' : 'FAIL',
        `${ext.virtualization.supported ? 'Soportada' : 'No soportada'}${ext.virtualization.enabled ? ' • Activada' : ''}${ext.virtualization.hypervisorPresent ? ' • Hyper-V activo' : ''}`))
    }
  } catch (err: any) {
    results.push(result('sys-error', 'OS', 'Error del sistema', 'FAIL', err?.message || 'Error'))
  }
  return { id: 'system', label: 'Información del Sistema', description: 'Recopilando información del equipo', status: phaseStatus(results), results }
}

// ─── PHASE 2: CPU ─────────────────────────────────────────────────────────────

async function runCPUPhase(): Promise<AutoDiagnosticPhase> {
  const results: DiagnosticResult[] = []
  try {
    const cpu = await getCPUInfo()

    results.push(result('cpu-brand', 'HARDWARE', 'Procesador', 'PASS', `${cpu.manufacturer} ${cpu.brand}`))
    results.push(result('cpu-cores', 'HARDWARE', 'Núcleos', 'PASS', `${cpu.physicalCores} físicos / ${cpu.cores} lógicos`))
    results.push(result('cpu-speed', 'HARDWARE', 'Velocidad base', 'PASS', `${cpu.speed} GHz`))
    results.push(result('cpu-speed-max', 'HARDWARE', 'Velocidad máxima', 'PASS', `${cpu.speedMax} GHz`))
    results.push(result('cpu-speed-min', 'HARDWARE', 'Velocidad mínima', 'PASS', `${cpu.speedMin} GHz`))

    const throttling = cpu.speedMax > 0 && cpu.speed < cpu.speedMax * 0.5
    results.push(result('cpu-throttling', 'HARDWARE', 'Throttling detectado', throttling ? 'WARN' : 'PASS',
      throttling ? `Sí (${cpu.speed} GHz vs ${cpu.speedMax} GHz máx)` : 'No detectado'))

    let usageStatus: TestStatus = 'PASS'
    if (cpu.usage >= 90) usageStatus = 'FAIL'
    else if (cpu.usage >= 70) usageStatus = 'WARN'
    results.push(result('cpu-usage', 'HARDWARE', 'Uso actual', usageStatus, `${cpu.usage}%`))

    if (cpu.perCoreLoad && cpu.perCoreLoad.length > 0) {
      const maxCore = Math.max(...cpu.perCoreLoad)
      const minCore = Math.min(...cpu.perCoreLoad)
      const coreImbalance = maxCore - minCore > 50
      results.push(result('cpu-core-imbalance', 'HARDWARE', 'Balance entre núcleos', coreImbalance ? 'WARN' : 'PASS',
        `Carga máxima: ${maxCore.toFixed(1)}% / mínima: ${minCore.toFixed(1)}%`))
    }

    if (cpu.temperature !== null) {
      let tempStatus: TestStatus = 'PASS'
      if (cpu.temperature >= 90) tempStatus = 'FAIL'
      else if (cpu.temperature >= 75) tempStatus = 'WARN'
      results.push(result('cpu-temp', 'SENSOR', 'Temperatura CPU', tempStatus, `${cpu.temperature}°C`))
    }
    if (cpu.coreTemps && cpu.coreTemps.length > 0) {
      const maxCoreTemp = Math.max(...cpu.coreTemps)
      const avgCoreTemp = cpu.coreTemps.reduce((a, b) => a + b, 0) / cpu.coreTemps.length
      results.push(result('cpu-temp-cores', 'SENSOR', 'Temperatura por núcleo', 'PASS',
        `Máx: ${maxCoreTemp}°C / Prom: ${avgCoreTemp.toFixed(1)}°C (${cpu.coreTemps.length} núcleos)`))
    }

    if (cpu.voltage != null) {
      let voltStatus: TestStatus = 'PASS'
      if (cpu.voltage > 1.5) voltStatus = 'WARN'
      results.push(result('cpu-voltage', 'HARDWARE', 'Voltaje CPU', voltStatus, `${cpu.voltage.toFixed(3)} V`))
    }

    if (cpu.cacheL1d != null || cpu.cacheL2 != null || cpu.cacheL3 != null) {
      results.push(result('cpu-cache', 'HARDWARE', 'Caché', 'PASS',
        `L1: ${cpu.cacheL1d ? (cpu.cacheL1d / 1024).toFixed(0) + ' KB' : 'N/A'} / L2: ${cpu.cacheL2 ? (cpu.cacheL2 / 1024).toFixed(0) + ' KB' : 'N/A'} / L3: ${cpu.cacheL3 ? (cpu.cacheL3 / 1024 / 1024).toFixed(1) + ' MB' : 'N/A'}`))
    }
    if (cpu.contextSwitches != null) results.push(result('cpu-ctxswitches', 'HARDWARE', 'Cambios de contexto', 'PASS', `${cpu.contextSwitches}/s`))
    if (cpu.processCount != null) results.push(result('cpu-processes', 'HARDWARE', 'Procesos activos', 'PASS', `${cpu.processCount}`))
  } catch (err: any) {
    results.push(result('cpu-error', 'HARDWARE', 'Error CPU', 'FAIL', err?.message || 'Error'))
  }
  return { id: 'cpu', label: 'Diagnóstico de CPU', description: 'Verificando el procesador a fondo', status: phaseStatus(results), results }
}

// ─── PHASE 3: RAM ─────────────────────────────────────────────────────────────

async function runRAMPhase(): Promise<AutoDiagnosticPhase> {
  const results: DiagnosticResult[] = []
  try {
    const ram = await getRAMInfo()

    const totalGB = ram.total / 1073741824
    const freeGB = ram.free / 1073741824
    const usedGB = ram.used / 1073741824

    results.push(result('ram-total', 'HARDWARE', 'Memoria total', 'PASS', `${totalGB.toFixed(2)} GB`))

    let usageStatus: TestStatus = 'PASS'
    if (ram.usagePercent >= 90) usageStatus = 'FAIL'
    else if (ram.usagePercent >= 70) usageStatus = 'WARN'
    results.push(result('ram-usage', 'HARDWARE', 'Uso de memoria', usageStatus, `${ram.usagePercent}% (${usedGB.toFixed(2)} GB usados)`))

    let freeStatus: TestStatus = 'PASS'
    if (freeGB < 1) freeStatus = 'FAIL'
    else if (freeGB < 2.5) freeStatus = 'WARN'
    results.push(result('ram-free', 'HARDWARE', 'Memoria libre', freeStatus, `${freeGB.toFixed(2)} GB`))

    const populated = ram.slots.filter(s => s.size > 0)
    results.push(result('ram-slots', 'HARDWARE', 'Módulos', 'PASS', `${populated.length} de ${ram.slots.length} slots ocupados`))

    const formFactors = new Set(populated.map(s => s.formFactor).filter(Boolean))
    if (formFactors.size > 0) {
      results.push(result('ram-formfactor', 'HARDWARE', 'Factor de forma', 'PASS', [...formFactors].join(', ')))
    }

    const types = new Set(populated.map(s => s.type).filter(t => t !== 'Unknown'))
    if (types.size > 0) {
      const typeArr = [...types]
      results.push(result('ram-type', 'HARDWARE', 'Tipo de memoria', 'PASS', typeArr.join(', ')))
    }

    const speeds = populated.filter(s => s.speed > 0)
    const uniqueSpeeds = new Set(speeds.map(s => s.speed))
    if (speeds.length > 1 && uniqueSpeeds.size > 1) {
      results.push(result('ram-speed-mismatch', 'HARDWARE', 'Velocidades mixtas', 'WARN',
        [...uniqueSpeeds].map(s => `${s} MHz`).join(', ')))
    }

    for (const slot of populated) {
      const speedInfo = slot.speed > 0 ? ` @ ${slot.speed} MHz` : ''
      const timingInfo = slot.timings ? ` • CL${slot.timings}` : ''
      const manuf = slot.manufacturer !== 'Unknown' ? ` • ${slot.manufacturer}` : ''
      results.push(result(`ram-slot-${slot.bank}`, 'HARDWARE', `Slot ${slot.bank}`, 'PASS',
        `${(slot.size / 1073741824).toFixed(0)} GB ${slot.type}${speedInfo}${timingInfo}${manuf}`,
        { partNum: slot.partNum, serial: slot.serialNum }))
    }

    if (ram.swapTotal != null) {
      const swapGB = ram.swapTotal / 1073741824
      const swapUsedGB = (ram.swapUsed ?? 0) / 1073741824
      let swapStatus: TestStatus = 'PASS'
      if (swapUsedGB > swapGB * 0.8) swapStatus = 'WARN'
      results.push(result('ram-swap', 'HARDWARE', 'Archivo de paginación', swapStatus,
        `${swapUsedGB.toFixed(1)} GB / ${swapGB.toFixed(1)} GB usados`))
    }
  } catch (err: any) {
    results.push(result('ram-error', 'HARDWARE', 'Error RAM', 'FAIL', err?.message || 'Error'))
  }
  return { id: 'ram', label: 'Diagnóstico de RAM', description: 'Analizando la memoria a fondo', status: phaseStatus(results), results }
}

// ─── PHASE 4: GPU ─────────────────────────────────────────────────────────────

async function runGPUPhase(): Promise<AutoDiagnosticPhase> {
  const results: DiagnosticResult[] = []
  try {
    const gpu = await getGPUInfo()

    const vramGB = gpu.vram > 0 ? (gpu.vram / 1024).toFixed(1) : '0'
    results.push(result('gpu-model', 'HARDWARE', 'Tarjeta gráfica', 'PASS', `${gpu.vendor} ${gpu.model}`))
    results.push(result('gpu-vram', 'HARDWARE', 'VRAM', 'PASS', `${vramGB} GB`))
    results.push(result('gpu-driver', 'HARDWARE', 'Controlador', 'PASS', gpu.driverVersion))

    if (gpu.driverDate) results.push(result('gpu-driver-date', 'HARDWARE', 'Fecha del controlador', 'PASS', gpu.driverDate))

    if (gpu.coreClock != null) results.push(result('gpu-core-clock', 'HARDWARE', 'Frecuencia núcleo', 'PASS', `${gpu.coreClock} MHz`))
    if (gpu.memoryClock != null) results.push(result('gpu-mem-clock', 'HARDWARE', 'Frecuencia memoria', 'PASS', `${gpu.memoryClock} MHz`))

    if (gpu.usage > 0) {
      let usageStatus: TestStatus = 'PASS'
      if (gpu.usage > 95) usageStatus = 'FAIL'
      else if (gpu.usage > 80) usageStatus = 'WARN'
      results.push(result('gpu-usage', 'HARDWARE', 'Uso GPU', usageStatus, `${gpu.usage}%`))
    }

    if (gpu.temperature !== null) {
      let tempStatus: TestStatus = 'PASS'
      if (gpu.temperature >= 90) tempStatus = 'FAIL'
      else if (gpu.temperature >= 75) tempStatus = 'WARN'
      results.push(result('gpu-temp', 'SENSOR', 'Temperatura GPU', tempStatus, `${gpu.temperature}°C`))
    }

    if (gpu.fanSpeed != null) results.push(result('gpu-fan', 'SENSOR', 'Ventilador GPU', 'PASS', `${gpu.fanSpeed} RPM`))
    if (gpu.powerDraw != null) results.push(result('gpu-power', 'HARDWARE', 'Consumo GPU', 'PASS', `${gpu.powerDraw.toFixed(1)} W`))

    const gpuDetails = await si.graphics()
    if (gpuDetails.displays && gpuDetails.displays.length > 0) {
      const displays = gpuDetails.displays.map(d => `${d.model || d.main ? 'Principal' : ''} (${d.resolutionx}x${d.resolutiony} @ ${d.currentRefreshRate}Hz)`)
      results.push(result('gpu-displays', 'HARDWARE', 'Pantallas conectadas', 'PASS', displays.join(' | ')))
    }

    const pciInfo = await runPowerShellWithRetry<string>(
      `Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | Select-Object -First 1 | Select-Object AdapterRAM,CurrentHorizontalResolution,CurrentVerticalResolution,CurrentRefreshRate,DriverDate,VideoModeDescription | ConvertTo-Json -Compress`,
      (r) => r
    )
    if (pciInfo) {
      try {
        const pci = JSON.parse(pciInfo)
        if (pci.AdapterRAM) results.push(result('gpu-vram-detailed', 'HARDWARE', 'VRAM (WMI)', 'PASS', `${(pci.AdapterRAM / 1073741824).toFixed(1)} GB`))
        if (pci.VideoModeDescription) results.push(result('gpu-videomode', 'HARDWARE', 'Modo de video', 'PASS', pci.VideoModeDescription))
      } catch { }
    }
  } catch (err: any) {
    results.push(result('gpu-error', 'HARDWARE', 'Error GPU', 'FAIL', err?.message || 'Error'))
  }
  return { id: 'gpu', label: 'Diagnóstico de GPU', description: 'Verificando la tarjeta gráfica', status: phaseStatus(results), results }
}

// ─── PHASE 5: STORAGE ─────────────────────────────────────────────────────────

async function runStoragePhase(): Promise<AutoDiagnosticPhase> {
  const results: DiagnosticResult[] = []
  try {
    const disks = await si.diskLayout()
    const fsSize = await si.fsSize()
    const disksIO = await si.disksIO().catch(() => null)

    for (let i = 0; i < disks.length; i++) {
      const disk = disks[i]
      const fs = fsSize.find(f => f.fs.includes(disk.device) || disk.device.includes(f.fs.substring(0, 3)))
      const deviceId = disk.name || `PhysicalDrive${i}`
      const isBoot = i === 0 || (disk.device || '').toLowerCase().includes('c:')

      results.push(result(`disk-${i}`, 'STORAGE', `${isBoot ? '(Sistema) ' : ''}${deviceId}`, 'PASS',
        `${disk.type || 'HDD'} • ${(disk.size / 1073741824).toFixed(0)} GB`))

      if (fs) {
        let usageStatus: TestStatus = 'PASS'
        if (fs.use >= 95) usageStatus = 'FAIL'
        else if (fs.use >= 80) usageStatus = 'WARN'
        results.push(result(`disk-usage-${i}`, 'STORAGE', `Uso (${disk.device || deviceId})`, usageStatus,
          `${fs.use.toFixed(1)}% (${(fs.used / 1073741824).toFixed(1)} GB / ${(fs.size / 1073741824).toFixed(1)} GB)`))
      }

      if (disk.smartStatus && disk.smartStatus === 'Ok' || disk.smartStatus === 'good') {
        results.push(result(`disk-smart-${i}`, 'STORAGE', `SMART (${deviceId})`, 'PASS', 'Saludable'))
      } else if (disk.smartStatus && disk.smartStatus !== 'N/A') {
        results.push(result(`disk-smart-${i}`, 'STORAGE', `SMART (${deviceId})`, 'WARN', disk.smartStatus))
      }

      if (disk.temperature !== null && disk.temperature > 0) {
        let tempStatus: TestStatus = 'PASS'
        if (disk.temperature >= 60) tempStatus = 'FAIL'
        else if (disk.temperature >= 50) tempStatus = 'WARN'
        results.push(result(`disk-temp-${i}`, 'SENSOR', `Temperatura (${deviceId})`, tempStatus, `${disk.temperature}°C`))
      }

      const smartDetail = await runPowerShellWithRetry<string>(
        `Get-PhysicalDisk -DeviceNumber ${i} -ErrorAction SilentlyContinue | Get-StorageReliabilityCounter | Select-Object ReadErrorsCorrected,ReadErrorsUncorrected,StaleReadRetries,Wear,PowerOnHours | ConvertTo-Json -Compress`,
        (r) => r
      )
      if (smartDetail && smartDetail !== 'null') {
        try {
          const smart = JSON.parse(smartDetail)
          if (smart.Wear !== null && smart.Wear !== undefined) {
            const wear = Math.round(smart.Wear * 100) / 100
            let wearStatus: TestStatus = 'PASS'
            if (wear >= 90) wearStatus = 'FAIL'
            else if (wear >= 70) wearStatus = 'WARN'
            results.push(result(`disk-wear-${i}`, 'STORAGE', `Desgaste SSD (${deviceId})`, wearStatus,
              `${wear}%`))
          }
          if (smart.PowerOnHours !== null && smart.PowerOnHours !== undefined) {
            const poh = parseInt(smart.PowerOnHours)
            if (poh > 0) {
              let pohStatus: TestStatus = 'PASS'
              if (poh > 50000) pohStatus = 'FAIL'
              else if (poh > 30000) pohStatus = 'WARN'
              results.push(result(`disk-hours-${i}`, 'STORAGE', `Horas encendido (${deviceId})`, pohStatus,
                `${poh.toLocaleString()} horas (${Math.round(poh / 24)} días)`))
            }
          }
        } catch { }
      }
    }

    if (disksIO) {
      results.push(result('disk-io-r', 'STORAGE', 'Lectura (I/O)', 'PASS',
        `${(disksIO.rIO / 1073741824).toFixed(1)} GB total`))
      results.push(result('disk-io-w', 'STORAGE', 'Escritura (I/O)', 'PASS',
        `${(disksIO.wIO / 1073741824).toFixed(1)} GB total`))
    }

    for (const disk of disks) {
      if (disk.interfaceType) {
        const idx = disks.indexOf(disk)
        results.push(result(`disk-iface-${idx}`, 'STORAGE', `Interfaz (${disk.name || '?'})`, 'PASS',
          `${disk.interfaceType}${disk.formFactor ? ` • ${disk.formFactor}` : ''}`))
      }
    }
  } catch (err: any) {
    results.push(result('disk-error', 'STORAGE', 'Error de almacenamiento', 'FAIL', err?.message || 'Error'))
  }
  return { id: 'storage', label: 'Diagnóstico de Almacenamiento', description: 'Analizando discos y SMART en detalle', status: phaseStatus(results), results }
}

// ─── PHASE 6: BATTERY ─────────────────────────────────────────────────────────

async function runBatteryPhase(): Promise<AutoDiagnosticPhase> {
  const results: DiagnosticResult[] = []
  try {
    const battery = await si.battery()
    if (!battery.hasBattery) {
      results.push(result('bat-none', 'BATTERY', 'Batería', 'SKIP', 'No detectada / Equipo de escritorio'))
      return { id: 'battery', label: 'Diagnóstico de Batería', description: 'Verificando estado de la batería', status: 'SKIP', results }
    }

    const wear = battery.maxCapacity && battery.designedCapacity
      ? Math.round((1 - battery.maxCapacity / battery.designedCapacity) * 100) : 0
    const health = Math.max(0, 100 - wear)

    results.push(result('bat-present', 'BATTERY', 'Batería presente', 'PASS', 'Sí'))
    results.push(result('bat-status', 'BATTERY', 'Estado', battery.isCharging ? 'PASS' : 'WARN',
      battery.isCharging ? 'Cargando' : 'Descargando / No cargando'))
    results.push(result('bat-design', 'BATTERY', 'Capacidad de diseño', 'PASS',
      battery.designedCapacity ? `${battery.designedCapacity} mAh` : '—'))
    results.push(result('bat-max', 'BATTERY', 'Capacidad máxima actual', 'PASS',
      battery.maxCapacity ? `${battery.maxCapacity} mAh` : '—'))

    let wearStatus: TestStatus = 'PASS'
    if (wear >= 40) wearStatus = 'FAIL'
    else if (wear >= 20) wearStatus = 'WARN'
    results.push(result('bat-wear', 'BATTERY', 'Desgaste', wearStatus, `${wear}%`))

    let healthStatus: TestStatus = 'PASS'
    if (health < 60) healthStatus = 'FAIL'
    else if (health < 80) healthStatus = 'WARN'
    results.push(result('bat-health', 'BATTERY', 'Salud', healthStatus, `${health}%`))

    if (battery.cycleCount) {
      let cycleStatus: TestStatus = 'PASS'
      if (battery.cycleCount >= 1000) cycleStatus = 'FAIL'
      else if (battery.cycleCount >= 500) cycleStatus = 'WARN'
      results.push(result('bat-cycles', 'BATTERY', 'Ciclos de carga', cycleStatus, `${battery.cycleCount}`))
    }

    if (battery.currentCapacity && battery.maxCapacity && battery.maxCapacity > 0) {
      const currentPercent = Math.round(battery.currentCapacity / battery.maxCapacity * 100)
      results.push(result('bat-charge-level', 'BATTERY', 'Nivel de carga actual', currentPercent > 20 ? 'PASS' : 'WARN',
        `${currentPercent}% (${battery.currentCapacity} mAh / ${battery.maxCapacity} mAh)`))
    }

    const extBattery = await getBatteryInfo()
    if (extBattery.chemistry) results.push(result('bat-chemistry', 'BATTERY', 'Química', 'PASS', extBattery.chemistry))
    if (extBattery.manufactureDate) results.push(result('bat-manufacture', 'BATTERY', 'Fecha de fabricación', 'PASS', extBattery.manufactureDate))
    if (extBattery.serialNumber) results.push(result('bat-serial', 'BATTERY', 'Número de serie', 'PASS', extBattery.serialNumber))

    if (extBattery.temperature !== null) {
      let tempStatus: TestStatus = 'PASS'
      if (extBattery.temperature >= 50) tempStatus = 'FAIL'
      else if (extBattery.temperature >= 40) tempStatus = 'WARN'
      results.push(result('bat-temp', 'SENSOR', 'Temperatura batería', tempStatus, `${extBattery.temperature}°C`))
    }

    if (extBattery.voltage) results.push(result('bat-voltage', 'BATTERY', 'Voltaje', 'PASS', `${extBattery.voltage} V`))
    if (extBattery.chargeRate) results.push(result('bat-charge-rate', 'BATTERY', 'Tasa de carga', 'PASS', `${extBattery.chargeRate} W`))
    if (extBattery.dischargeRate) results.push(result('bat-discharge-rate', 'BATTERY', 'Tasa de descarga', 'PASS', `${extBattery.dischargeRate} W`))
    if (extBattery.estimatedRuntime) {
      const mins = Math.round(extBattery.estimatedRuntime / 60)
      results.push(result('bat-runtime', 'BATTERY', 'Tiempo restante estimado', mins > 30 ? 'PASS' : mins > 10 ? 'WARN' : 'FAIL',
        `${mins} minutos`))
    }
  } catch (err: any) {
    results.push(result('bat-error', 'BATTERY', 'Error batería', 'FAIL', err?.message || 'Error'))
  }
  return { id: 'battery', label: 'Diagnóstico de Batería', description: 'Verificando estado de la batería en detalle', status: phaseStatus(results), results }
}

// ─── PHASE 7: SENSORS ────────────────────────────────────────────────────────

async function runSensorsPhase(): Promise<AutoDiagnosticPhase> {
  const results: DiagnosticResult[] = []
  try {
    const temps = await si.cpuTemperature()
    const graphics = await si.graphics()
    const disks = await si.diskLayout()

    if (temps.main !== null && temps.main !== -1) {
      let tempStatus: TestStatus = 'PASS'
      if (temps.main >= 90) tempStatus = 'FAIL'
      else if (temps.main >= 75) tempStatus = 'WARN'
      results.push(result('sensor-cpu-temp', 'SENSOR', 'Temperatura CPU (principal)', tempStatus, `${temps.main}°C`))
    }
    if (temps.package !== null && temps.package !== undefined && temps.package !== -1) {
      results.push(result('sensor-cpu-package', 'SENSOR', 'Temperatura CPU (package)', 'PASS', `${temps.package}°C`))
    }
    if (temps.max !== null && temps.max !== undefined) {
      results.push(result('sensor-cpu-max', 'SENSOR', 'CPU máxima registrada', 'PASS', `${temps.max}°C`))
    }
    if (temps.cores && temps.cores.length > 0) {
      const coreStrs = temps.cores.map((c, i) => `Núcleo ${i}: ${c}°C`).join(' • ')
      results.push(result('sensor-cpu-cores', 'SENSOR', 'Temperatura por núcleo', 'PASS', coreStrs))
    }

    if (graphics.controllers && graphics.controllers.length > 0) {
      const gpu = graphics.controllers[0]
      if (gpu.temperatureGpu !== null && gpu.temperatureGpu !== undefined) {
        let gpuTempStatus: TestStatus = 'PASS'
        if (gpu.temperatureGpu >= 90) gpuTempStatus = 'FAIL'
        else if (gpu.temperatureGpu >= 75) gpuTempStatus = 'WARN'
        results.push(result('sensor-gpu-temp', 'SENSOR', 'Temperatura GPU', gpuTempStatus, `${gpu.temperatureGpu}°C`))
      }
      if (gpu.fanSpeed != null) results.push(result('sensor-gpu-fan', 'SENSOR', 'Ventilador GPU', 'PASS', `${gpu.fanSpeed} RPM`))
    }

    for (const disk of disks) {
      if (disk.temperature !== null && disk.temperature > 0) {
        results.push(result(`sensor-disk-temp-${disk.name || '?'}`, 'SENSOR', `Temperatura ${disk.name || '?'}`, 'PASS', `${disk.temperature}°C`))
      }
    }

    const fanInfo = await runPowerShellWithRetry<string>(
      `Get-WmiObject -Namespace root/wmi -Class MSAcpi_Fan -ErrorAction SilentlyContinue |
       ForEach-Object { [PSCustomObject]@{ Name = $_.InstanceName -replace '.*\\\\',''; RPM = try { [int]($_.FanSpeed) } catch { $null }; Percent = try { [int]($_.FanSpeedPercentage) } catch { $null } } } |
       ConvertTo-Json -Compress`,
      (r) => r
    )
    if (fanInfo && fanInfo !== '[]' && fanInfo !== 'null') {
      try {
        const fans = JSON.parse(fanInfo)
        if (Array.isArray(fans) && fans.length > 0) {
          const fanStrs = fans.map((f: any) => `${f.Name}: ${f.RPM ? f.RPM + ' RPM' : f.Percent ? f.Percent + '%' : 'N/A'}`).join(' • ')
          results.push(result('sensor-fans', 'SENSOR', 'Ventiladores del sistema', 'PASS', fanStrs))
        }
      } catch { }
    }

    const thermalZones = await runPowerShellWithRetry<string>(
      `Get-WmiObject -Namespace root/wmi -Class MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue |
       ForEach-Object { [PSCustomObject]@{ Name = $_.InstanceName -replace '.*\\\\',''; TempC = [math]::Round(($_.CurrentTemperature - 2731.5) / 10, 1) } } |
       ConvertTo-Json -Compress`,
      (r) => r
    )
    if (thermalZones && thermalZones !== '[]' && thermalZones !== 'null') {
      try {
        const zones = JSON.parse(thermalZones)
        if (Array.isArray(zones) && zones.length > 0) {
          const zoneStrs = zones.map((z: any) => `${z.Name}: ${z.TempC}°C`).join(' • ')
          results.push(result('sensor-thermal-zones', 'SENSOR', 'Zonas térmicas', 'PASS', zoneStrs))
        }
      } catch { }
    }

    if (results.length === 0) {
      results.push(result('sensor-none', 'SENSOR', 'Sensores', 'SKIP', 'No disponibles'))
    }
  } catch (err: any) {
    results.push(result('sensor-error', 'SENSOR', 'Error sensores', 'FAIL', err?.message || 'Error'))
  }
  return { id: 'sensors', label: 'Diagnóstico de Sensores', description: 'Monitoreando sensores del sistema', status: phaseStatus(results), results }
}

// ─── PHASE 8: NETWORK ─────────────────────────────────────────────────────────

async function runNetworkPhase(): Promise<AutoDiagnosticPhase> {
  const results: DiagnosticResult[] = []
  try {
    const nets = await si.networkInterfaces()

    if (nets.length === 0) {
      results.push(result('net-none', 'NETWORK', 'Interfaces de red', 'SKIP', 'Sin interfaces detectadas'))
      return { id: 'network', label: 'Diagnóstico de Red', description: 'Verificando conectividad', status: 'SKIP', results }
    }

    let hasWiredUp = false
    let hasWirelessUp = false

    for (const net of nets) {
      const isUp = net.operstate === 'up'
      const interfaceType = net.type || 'desconocido'
      if (net.type === 'wired' && isUp) hasWiredUp = true
      if (net.type === 'wireless' && isUp) hasWirelessUp = true
      if (net.type === 'virtual') continue

      const ipInfo = net.ip4 ? `${net.ip4}${net.ip6 ? ` / ${net.ip6}` : ''}` : 'Sin IP'
      const linkStr = net.speed ? `${net.speed} Mbps` : ''
      results.push(result(`net-iface-${net.iface}`, 'NETWORK', `${net.iface} (${interfaceType})`,
        isUp ? 'PASS' : 'WARN',
        `${ipInfo} • ${isUp ? 'Activo' : 'Inactivo'}${linkStr ? ` • ${linkStr}` : ''}`))
    }

    const hasUpInterface = nets.some(n => n.operstate === 'up' && n.type !== 'virtual')

    const pingResult = await runPowerShellWithRetry<string>(
      'Test-Connection -ComputerName 8.8.8.8 -Count 2 -Quiet -ErrorAction SilentlyContinue; if ($?) { Write-Output "OK" } else { Write-Output "FAIL" }',
      (r) => r, 1, 10000
    )
    if (pingResult) {
      const pingOk = pingResult.includes('OK') || pingResult.includes('True')
      results.push(result('net-ping', 'NETWORK', 'Ping a Internet (8.8.8.8)', pingOk ? 'PASS' : 'FAIL',
        pingOk ? 'Respuesta OK' : 'Sin respuesta'))

      if (pingOk) {
        const pingLatency = await runPowerShellWithRetry<string>(
          'Test-Connection -ComputerName 8.8.8.8 -Count 2 -ErrorAction SilentlyContinue | Measure-Object -Property ResponseTime -Average | Select-Object -ExpandProperty Average',
          (r) => r, 1, 10000
        )
        if (pingLatency) {
          const latency = Math.round(parseFloat(pingLatency))
          let latencyStatus: TestStatus = 'PASS'
          if (latency >= 200) latencyStatus = 'FAIL'
          else if (latency >= 100) latencyStatus = 'WARN'
          results.push(result('net-latency', 'NETWORK', 'Latencia promedio', latencyStatus, `${latency} ms`))
        }
      }
    }

    const dnsResult = await runPowerShellWithRetry<string>(
      'Resolve-DnsName -Name google.com -Type A -QuickTimeout -ErrorAction SilentlyContinue; if ($?) { Write-Output "OK" } else { Write-Output "FAIL" }',
      (r) => r, 1, 10000
    )
    if (dnsResult) {
      const dnsOk = dnsResult.includes('OK') || dnsResult.includes('True')
      results.push(result('net-dns', 'NETWORK', 'Resolución DNS', dnsOk ? 'PASS' : 'FAIL',
        dnsOk ? 'Funciona (google.com)' : 'Fallo en resolución'))
    }

    const gwResult = await runPowerShellWithRetry<string>(
      'Get-CimInstance Win32_IP4RouteTable -ErrorAction SilentlyContinue | Where-Object { $_.Destination -eq "0.0.0.0" } | Select-Object -First 1 -ExpandProperty NextHop',
      (r) => r
    )
    if (gwResult && gwResult !== 'null') {
      results.push(result('net-gateway', 'NETWORK', 'Puerta de enlace', 'PASS', gwResult))
    }

    const dnsServers = await runPowerShellWithRetry<string>(
      'Get-DnsClientServerAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.ServerAddresses } | Select-Object -First 1 -ExpandProperty ServerAddresses | ConvertTo-Json -Compress',
      (r) => r
    )
    if (dnsServers && dnsServers !== 'null') {
      try {
        const servers = JSON.parse(dnsServers)
        const serverStr = Array.isArray(servers) ? servers.join(', ') : servers
        results.push(result('net-dns-servers', 'NETWORK', 'Servidores DNS configurados', 'PASS', serverStr))
      } catch {
        results.push(result('net-dns-servers', 'NETWORK', 'Servidores DNS configurados', 'PASS', dnsServers))
      }
    }

    const firewall = await runPowerShellWithRetry<string>(
      'Get-NetFirewallProfile -ProfileName Domain,Public,Private -ErrorAction SilentlyContinue | Select-Object Name,Enabled | ConvertTo-Json -Compress',
      (r) => r
    )
    if (firewall && firewall !== 'null') {
      try {
        const profiles = JSON.parse(firewall)
        const profilesArr = Array.isArray(profiles) ? profiles : [profiles]
        const profileStrs = profilesArr.map((p: any) => `${p.Name}: ${p.Enabled ? 'Activo' : 'Inactivo'}`).join(' • ')
        results.push(result('net-firewall', 'NETWORK', 'Firewall de Windows', 'PASS', profileStrs))
      } catch { }
    }

    if (hasWirelessUp) {
      try {
        const wifiNets = await si.wifiNetworks()
        if (wifiNets.length > 0) {
          const signalAvg = wifiNets.reduce((sum, n) => sum + (n.signal_level || 0), 0) / wifiNets.length
          let signalStatus: TestStatus = 'PASS'
          if (signalAvg < -80) signalStatus = 'FAIL'
          else if (signalAvg < -70) signalStatus = 'WARN'
          results.push(result('net-wifi-signal', 'NETWORK', 'Señal WiFi promedio', signalStatus, `${signalAvg.toFixed(0)} dBm (${wifiNets.length} redes)`))

          const connWifi = await runPowerShellWithRetry<string>(
            'netsh wlan show interfaces | Select-String "SSID\\s*:" | ForEach-Object { $_ -replace ".*:\\s*", "" }',
            (r) => r
          )
          if (connWifi && connWifi !== 'NotConnected' && connWifi !== 'null') {
            results.push(result('net-wifi-ssid', 'NETWORK', 'SSID conectado', 'PASS', connWifi))
          }
        }
      } catch { }
    }

    if (!hasUpInterface && results.length > 1) {
      results.push(result('net-no-connectivity', 'NETWORK', 'Conectividad general', 'FAIL', 'Sin conexión activa'))
    }

  } catch (err: any) {
    results.push(result('net-error', 'NETWORK', 'Error de red', 'FAIL', err?.message || 'Error'))
  }
  return { id: 'network', label: 'Diagnóstico de Red', description: 'Verificando conectividad y DNS', status: phaseStatus(results), results }
}

// ─── REGISTER HANDLERS ────────────────────────────────────────────────────────

export function registerDiagnosticsIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.DIAGNOSTIC_GET_PHASES, async (): Promise<Omit<AutoDiagnosticPhase, 'results'>[]> => {
    return [
      { id: 'system', label: 'Información del Sistema', description: 'Recopilando información del equipo', status: 'PENDING' },
      { id: 'cpu', label: 'Diagnóstico de CPU', description: 'Verificando el procesador a fondo', status: 'PENDING' },
      { id: 'ram', label: 'Diagnóstico de RAM', description: 'Analizando la memoria a fondo', status: 'PENDING' },
      { id: 'gpu', label: 'Diagnóstico de GPU', description: 'Verificando la tarjeta gráfica', status: 'PENDING' },
      { id: 'storage', label: 'Diagnóstico de Almacenamiento', description: 'Analizando discos y SMART en detalle', status: 'PENDING' },
      { id: 'battery', label: 'Diagnóstico de Batería', description: 'Verificando estado de la batería en detalle', status: 'PENDING' },
      { id: 'sensors', label: 'Diagnóstico de Sensores', description: 'Monitoreando sensores térmicos', status: 'PENDING' },
      { id: 'network', label: 'Diagnóstico de Red', description: 'Verificando conectividad y DNS', status: 'PENDING' },
    ]
  })

  ipcMain.handle(IPC_CHANNELS.DIAGNOSTIC_RUN_AUTO, async (): Promise<AutoDiagnosticPhase[]> => {
    const runners = [
      runSystemPhase, runCPUPhase, runRAMPhase, runGPUPhase,
      runStoragePhase, runBatteryPhase, runSensorsPhase, runNetworkPhase
    ]
    const results = await Promise.allSettled(runners.map((r) => r()))
    return results.map((r) =>
      r.status === 'fulfilled' ? r.value : {
        id: 'error', label: 'Error', description: 'Fase fallida', status: 'FAIL' as TestStatus,
        results: [{
          id: 'error', category: 'HARDWARE' as const, testName: 'Error', status: 'FAIL' as TestStatus,
          value: r.reason?.message || 'Error desconocido'
        }]
      }
    )
  })

  ipcMain.handle(IPC_CHANNELS.DIAGNOSTIC_RUN_PHASE, async (_event, phaseId: string): Promise<AutoDiagnosticPhase> => {
    const phaseRunners: Record<string, () => Promise<AutoDiagnosticPhase>> = {
      system: runSystemPhase, cpu: runCPUPhase, ram: runRAMPhase,
      gpu: runGPUPhase, storage: runStoragePhase, battery: runBatteryPhase,
      sensors: runSensorsPhase, network: runNetworkPhase
    }
    const runner = phaseRunners[phaseId]
    if (!runner) throw new Error(`Unknown phase: ${phaseId}`)
    return runner()
  })

  ipcMain.handle(IPC_CHANNELS.DIAGNOSTIC_CANCEL, async (): Promise<void> => { })
}
