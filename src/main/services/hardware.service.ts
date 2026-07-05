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
  const [cpu, currentLoad, cpuTemp] = await Promise.allSettled([
    si.cpu(),
    si.currentLoad(),
    si.cpuTemperature()
  ])

  const cpuVal = cpu.status === 'fulfilled' ? cpu.value : { manufacturer: '', brand: '', cores: 0, physicalCores: 0, speed: 0, speedMax: 0, voltage: null }
  const loadVal = currentLoad.status === 'fulfilled' ? currentLoad.value : { currentLoad: 0 }
  const tempVal = cpuTemp.status === 'fulfilled' ? cpuTemp.value : { main: null }

  return {
    manufacturer: cpuVal.manufacturer,
    brand: cpuVal.brand,
    cores: cpuVal.cores,
    physicalCores: cpuVal.physicalCores,
    speed: cpuVal.speed,
    speedMax: cpuVal.speedMax,
    usage: Math.round(loadVal.currentLoad * 100) / 100,
    voltage: cpuVal.voltage ? parseFloat(cpuVal.voltage) : null,
    temperature: tempVal.main ?? null
  }
}

export async function getRAMDetail(): Promise<RAMDetail> {
  const [mem, memLayout] = await Promise.allSettled([
    si.mem(),
    si.memLayout()
  ])

  const memVal = mem.status === 'fulfilled' ? mem.value : { total: 1, used: 0, available: 0 }
  const layoutVal = memLayout.status === 'fulfilled' ? memLayout.value : []

  const slots: RAMSlot[] = layoutVal.map((slot, index) => ({
    slot: `Slot ${index + 1}`,
    type: slot.type || 'Unknown',
    sizeGB: Math.round((slot.size / (1024 * 1024 * 1024)) * 100) / 100,
    speed: slot.clockSpeed || 0,
    manufacturer: slot.manufacturer || 'Unknown',
    formFactor: slot.formFactor || 'Unknown'
  }))

  return {
    totalGB: Math.round((memVal.total / (1024 * 1024 * 1024)) * 100) / 100,
    usedGB: Math.round((memVal.used / (1024 * 1024 * 1024)) * 100) / 100,
    availableGB: Math.round((memVal.available / (1024 * 1024 * 1024)) * 100) / 100,
    usagePercent: Math.round(memVal.used / memVal.total * 10000) / 100,
    slots
  }
}

export async function getGPUDetail(): Promise<GPUDetail> {
  const graphics = await si.graphics().catch(() => ({ controllers: [] }))

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
