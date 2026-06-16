import si from 'systeminformation'
import { getBatteryInfo } from './battery.service'

const SI_TIMEOUT = 3000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    ),
  ])
}

export interface LiveMetrics {
  cpu: { usage: number; temperature: number | null; speed: number }
  ram: { total: number; used: number; free: number; usagePercent: number }
  storage: { usagePercent: number; freeGB: number; totalGB: number }
  battery: {
    hasBattery: boolean
    isCharging: boolean
    health: number | null
    wearLevel: number | null
    cycleCount: number | null
  }
  uptime: { days: number; hours: number; minutes: number }
}

export async function getLiveMetrics(): Promise<LiveMetrics> {
  const [currentLoad, mem, cpuTemp, cpu, fsSize, battery, time] = await Promise.allSettled([
    withTimeout(si.currentLoad(), SI_TIMEOUT, 'currentLoad'),
    withTimeout(si.mem(), SI_TIMEOUT, 'mem'),
    withTimeout(si.cpuTemperature(), SI_TIMEOUT, 'cpuTemperature'),
    withTimeout(si.cpu(), SI_TIMEOUT, 'cpu'),
    withTimeout(si.fsSize(), SI_TIMEOUT, 'fsSize'),
    getBatteryInfo(),
    withTimeout(si.time(), SI_TIMEOUT, 'time'),
  ])

  const cl = currentLoad.status === 'fulfilled' ? currentLoad.value : null
  const memVal = mem.status === 'fulfilled' ? mem.value : null
  const temp = cpuTemp.status === 'fulfilled' ? cpuTemp.value : null
  const cpuVal = cpu.status === 'fulfilled' ? cpu.value : null
  const fs = fsSize.status === 'fulfilled' ? fsSize.value : null
  const bat = battery.status === 'fulfilled' ? battery.value : null
  const t = time.status === 'fulfilled' ? time.value : null

  const fsys = Array.isArray(fs) ? fs.find((f: any) => {
    const path = (f.fs ?? '').toLowerCase()
    return path.includes('c:')
  }) : null

  const uptimeSec = t?.uptime ?? 0

  return {
    cpu: {
      usage: cl?.currentLoad != null ? Math.round(cl.currentLoad * 10) / 10 : 0,
      temperature: temp?.main ?? null,
      speed: cpuVal?.speed ?? 0,
    },
    ram: {
      total: memVal?.total ?? 0,
      used: memVal?.used ?? 0,
      free: memVal?.free ?? 0,
      usagePercent: memVal?.total ? Math.round((memVal.used / memVal.total) * 1000) / 10 : 0,
    },
    storage: {
      usagePercent: fsys ? Math.round((fsys.use ?? 0) * 10) / 10 : 0,
      freeGB: fsys ? Math.round(((fsys.size - (fsys.used ?? 0)) / 1073741824) * 10) / 10 : 0,
      totalGB: fsys ? Math.round((fsys.size / 1073741824) * 10) / 10 : 0,
    },
    battery: {
      hasBattery: bat?.hasBattery ?? false,
      isCharging: bat?.isCharging ?? false,
      health: bat?.health ?? null,
      wearLevel: bat?.wearLevel ?? null,
      cycleCount: bat?.cycleCount ?? null,
    },
    uptime: {
      days: Math.floor(uptimeSec / 86400),
      hours: Math.floor((uptimeSec % 86400) / 3600),
      minutes: Math.floor((uptimeSec % 3600) / 60),
    },
  }
}
