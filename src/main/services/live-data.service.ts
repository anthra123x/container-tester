import si from 'systeminformation'
import { getBatteryInfo } from './battery.service'
import { cached } from './service-cache'

const SI_TIMEOUT = 3000

let isFetching = false

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    ),
  ])
}

export interface LiveMetrics {
  restricted: boolean
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

async function fetchLiveMetrics(): Promise<LiveMetrics> {
  if (isFetching) {
    return {
      restricted: false,
      cpu: { usage: 0, temperature: null, speed: 0 },
      ram: { total: 0, used: 0, free: 0, usagePercent: 0 },
      storage: { usagePercent: 0, freeGB: 0, totalGB: 0 },
      battery: { hasBattery: false, isCharging: false, health: null, wearLevel: null, cycleCount: null },
      uptime: { days: 0, hours: 0, minutes: 0 },
    }
  }

  isFetching = true

  try {
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

    const coreResults = [currentLoad, mem, cpuTemp, cpu, fsSize, time]
    const anySuccess = coreResults.some(r => r.status === 'fulfilled')
    const restricted = !anySuccess

    return {
      restricted,
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
  } finally {
    isFetching = false
  }
}

export async function getLiveMetrics(): Promise<LiveMetrics> {
  return cached('live:metrics', 3000, fetchLiveMetrics)
}
