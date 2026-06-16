import si from 'systeminformation'

export interface CPUDetail {
  manufacturer: string
  brand: string
  cores: number
  physicalCores: number
  speed: number
  speedMax: number
  usage: number
  voltage: number | null
  temperature: number | null
}

export interface RAMSlot {
  slot: string
  type: string
  sizeGB: number
  speed: number
  manufacturer: string
  formFactor: string
}

export interface RAMDetail {
  totalGB: number
  usedGB: number
  availableGB: number
  usagePercent: number
  slots: RAMSlot[]
}

export interface GPUDetail {
  model: string
  vendor: string
  vramGB: number | null
  driverVersion: string | null
  temperature: number | null
  usage: number | null
}

export async function getCPUDetail(): Promise<CPUDetail> {
  const [cpu, currentLoad, cpuTemp] = await Promise.all([
    si.cpu(),
    si.currentLoad(),
    si.cpuTemperature()
  ])

  return {
    manufacturer: cpu.manufacturer,
    brand: cpu.brand,
    cores: cpu.cores,
    physicalCores: cpu.physicalCores,
    speed: cpu.speed,
    speedMax: cpu.speedMax,
    usage: Math.round(currentLoad.currentLoad * 100) / 100,
    voltage: cpu.voltage ? parseFloat(cpu.voltage) : null,
    temperature: cpuTemp.main ?? null
  }
}

export async function getRAMDetail(): Promise<RAMDetail> {
  const [mem, memLayout] = await Promise.all([
    si.mem(),
    si.memLayout()
  ])

  const slots: RAMSlot[] = memLayout.map((slot, index) => ({
    slot: `Slot ${index + 1}`,
    type: slot.type || 'Unknown',
    sizeGB: Math.round((slot.size / (1024 * 1024 * 1024)) * 100) / 100,
    speed: slot.clockSpeed || 0,
    manufacturer: slot.manufacturer || 'Unknown',
    formFactor: slot.formFactor || 'Unknown'
  }))

  return {
    totalGB: Math.round((mem.total / (1024 * 1024 * 1024)) * 100) / 100,
    usedGB: Math.round((mem.used / (1024 * 1024 * 1024)) * 100) / 100,
    availableGB: Math.round((mem.available / (1024 * 1024 * 1024)) * 100) / 100,
    usagePercent: Math.round(mem.used / mem.total * 10000) / 100,
    slots
  }
}

export async function getGPUDetail(): Promise<GPUDetail> {
  const graphics = await si.graphics()

  if (!graphics.controllers || graphics.controllers.length === 0) {
    return {
      model: 'No GPU detected',
      vendor: 'N/A',
      vramGB: null,
      driverVersion: null,
      temperature: null,
      usage: null
    }
  }

  const gpu = graphics.controllers[0]
  return {
    model: gpu.model || 'Unknown',
    vendor: gpu.vendor || 'Unknown',
    vramGB: gpu.vram ? Math.round(gpu.vram * 100) / 100 : null,
    driverVersion: gpu.driverVersion || null,
    temperature: gpu.temperatureGpu ?? null,
    usage: gpu.utilizationGpu ?? null
  }
}
