import si from 'systeminformation'
import { runPowerShell } from './powershell'
import type { SystemInfo, CPUInfo, RAMInfo, GPUInfo, OSInfo, MotherboardInfo, RAMSlot } from '../../shared/types/hardware.types'

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

const SI_TIMEOUT = 15000

export async function getOSActivation(): Promise<boolean> {
  try {
    const script = `
      $status = Get-CimInstance -ClassName SoftwareLicensingProduct | Where-Object { $_.PartialProductKey -ne $null }
      if ($status) { Write-Output "Activated" } else { Write-Output "NotActivated" }
    `
    const result = await runPowerShell(script)
    return result === 'Activated'
  } catch {
    return false
  }
}

export async function getSystemInfo(): Promise<SystemInfo> {
  const [system, os, activated] = await Promise.all([
    withTimeout(si.system(), SI_TIMEOUT, 'system'),
    withTimeout(si.osInfo(), SI_TIMEOUT, 'osInfo'),
    getOSActivation()
  ])

  const motherboard = await getMotherboardInfo()

  return {
    hostname: os.hostname,
    model: system.model,
    serial: system.serial,
    manufacturer: system.manufacturer,
    os: {
      platform: os.platform,
      distro: os.distro,
      release: os.release,
      kernel: os.kernel,
      arch: os.arch,
      hostname: os.hostname,
      activated
    },
    motherboard
  }
}

export async function getMotherboardInfo(): Promise<MotherboardInfo> {
  const [system, bios] = await Promise.all([
    withTimeout(si.system(), SI_TIMEOUT, 'system'),
    withTimeout(si.bios(), SI_TIMEOUT, 'bios')
  ])

  return {
    manufacturer: system.manufacturer,
    model: system.model,
    version: system.version,
    serial: system.serial,
    biosVersion: bios.version,
    biosDate: bios.releaseDate
  }
}

export async function getCPUInfo(): Promise<CPUInfo> {
  const [cpu, currentLoad] = await Promise.all([
    withTimeout(si.cpu(), SI_TIMEOUT, 'cpu'),
    withTimeout(si.currentLoad(), SI_TIMEOUT, 'currentLoad')
  ])

  let temp: number | null = null
  try {
    const temps = await withTimeout(si.cpuTemperature(), SI_TIMEOUT, 'cpuTemperature')
    temp = temps.main ?? null
  } catch {
    temp = null
  }

  return {
    manufacturer: cpu.manufacturer,
    brand: cpu.brand,
    cores: cpu.cores,
    physicalCores: cpu.physicalCores,
    speed: cpu.speed,
    speedMax: cpu.speedMax,
    speedMin: cpu.speedMin,
    usage: Math.round(currentLoad.currentLoad * 100) / 100,
    temperature: temp
  }
}

export async function getRAMInfo(): Promise<RAMInfo> {
  const [mem, memLayout] = await Promise.all([
    withTimeout(si.mem(), SI_TIMEOUT, 'mem'),
    withTimeout(si.memLayout(), SI_TIMEOUT, 'memLayout')
  ])

  const slots: RAMSlot[] = memLayout.map((slot) => ({
    bank: slot.bank ?? 'Unknown',
    type: slot.type ?? 'Unknown',
    size: slot.size,
    speed: slot.clockSpeed ?? 0,
    manufacturer: slot.manufacturer ?? 'Unknown',
    partNum: slot.partNum ?? '',
    serialNum: slot.serialNum ?? ''
  }))

  return {
    total: mem.total,
    used: mem.used,
    free: mem.free,
    usagePercent: Math.round((mem.used / mem.total) * 100 * 100) / 100,
    slots
  }
}

export async function getGPUInfo(): Promise<GPUInfo> {
  const graphics = await withTimeout(si.graphics(), SI_TIMEOUT, 'graphics')

  if (graphics.controllers.length === 0) {
    return {
      model: 'No detectada',
      vendor: 'N/A',
      vram: 0,
      driverVersion: 'N/A',
      temperature: null,
      usage: 0
    }
  }

  const primary = graphics.controllers[0]

  return {
    model: primary.model,
    vendor: primary.vendor,
    vram: primary.vram ?? 0,
    driverVersion: primary.driverVersion ?? 'N/A',
    temperature: primary.temperatureGpu ?? null,
    usage: primary.utilizationGpu ?? 0
  }
}

export async function getStorageInfo(): Promise<import('../../shared/types/hardware.types').StorageInfo[]> {
  const [disks, fsSize] = await Promise.all([
    withTimeout(si.diskLayout(), SI_TIMEOUT, 'diskLayout'),
    withTimeout(si.fsSize(), SI_TIMEOUT, 'fsSize')
  ])

  return disks.map((disk) => {
    const fs = fsSize.find(f =>
      f.fs.includes(disk.device) || disk.device.includes(f.fs.substring(0, 3))
    )
    return {
      device: disk.device,
      type: disk.type,
      interfaceType: disk.interfaceType,
      size: disk.size,
      used: fs?.used ?? 0,
      available: fs?.available ?? 0,
      usagePercent: fs?.use ?? 0,
      smartStatus: disk.smartStatus ?? 'N/A',
      temperature: disk.temperature ?? null,
      hoursUsed: 0,
      health: null
    }
  })
}

export async function getBatteryInfo(): Promise<import('../../shared/types/hardware.types').BatteryInfo> {
  const battery = await withTimeout(si.battery(), SI_TIMEOUT, 'battery')

  const wearLevel = battery.maxCapacity && battery.designedCapacity
    ? Math.round((1 - battery.maxCapacity / battery.designedCapacity) * 100)
    : 0

  const health = Math.max(0, 100 - wearLevel)

  return {
    hasBattery: battery.hasBattery,
    isCharging: battery.isCharging,
    designCapacity: battery.designedCapacity ?? 0,
    currentCapacity: battery.currentCapacity ?? 0,
    maxCapacity: battery.maxCapacity ?? 0,
    wearLevel,
    cycleCount: battery.cycleCount ?? 0,
    voltage: battery.voltage ?? 0,
    temperature: null,
    health
  }
}

export async function getSensorInfo(): Promise<import('../../shared/types/hardware.types').SensorInfo> {
  const temps = await withTimeout(si.cpuTemperature(), SI_TIMEOUT, 'cpuTemperature')

  return {
    cpuTemperature: temps.main ?? null,
    gpuTemperature: null,
    storageTemperature: null,
    cpuVoltage: null,
    fanSpeed: null
  }
}

export async function getWifiInfo(): Promise<import('../../shared/types/hardware.types').WifiInfo> {
  try {
    const nets = await withTimeout(si.networkInterfaces(), SI_TIMEOUT, 'networkInterfaces')
    const wifi = nets.find(n => n.type === 'wireless')

    if (!wifi) {
      return { adapterPresent: false, adapterName: '', enabled: false, connected: false, ssid: '', signalStrength: 0, availableNetworks: [] }
    }

    const script = `
      $wlan = netsh wlan show interfaces | Select-String "SSID\\s*:" | ForEach-Object { $_ -replace ".*:\\s*", "" }
      if ($wlan) { Write-Output $wlan } else { Write-Output "NotConnected" }
    `
    const ssid = await runPowerShell(script)

    return {
      adapterPresent: true,
      adapterName: wifi.iface,
      enabled: wifi.operstate === 'up',
      connected: wifi.operstate === 'up',
      ssid: ssid !== 'NotConnected' ? ssid : '',
      signalStrength: 0,
      availableNetworks: []
    }
  } catch {
    return { adapterPresent: false, adapterName: '', enabled: false, connected: false, ssid: '', signalStrength: 0, availableNetworks: [] }
  }
}
