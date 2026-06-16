import si from 'systeminformation'

export interface SensorInfo {
  cpu: CPUTemp
  gpu: GPUTemp
  storage: StorageTemp[]
}

export interface CPUTemp {
  main: number | null
  cores: number[]
  max: number | null
}

export interface GPUTemp {
  temperature: number | null
  coreClock: number | null
  memoryClock: number | null
}

export interface StorageTemp {
  device: string
  temperature: number | null
}

export async function getSensorInfo(): Promise<SensorInfo> {
  const [cpuTemp, graphics, diskLayout] = await Promise.all([
    si.cpuTemperature(),
    si.graphics(),
    si.diskLayout()
  ])

  const gpuController = graphics.controllers && graphics.controllers.length > 0
    ? graphics.controllers[0]
    : null

  const storageTemps: StorageTemp[] = []
  for (const disk of diskLayout) {
    storageTemps.push({
      device: disk.name || 'Unknown',
      temperature: disk.temperature ?? null
    })
  }

  return {
    cpu: {
      main: cpuTemp.main ?? null,
      cores: cpuTemp.cores ?? [],
      max: cpuTemp.max ?? null
    },
    gpu: {
      temperature: gpuController?.temperatureGpu ?? null,
      coreClock: gpuController?.clockCore ?? null,
      memoryClock: gpuController?.clockMemory ?? null
    },
    storage: storageTemps
  }
}
