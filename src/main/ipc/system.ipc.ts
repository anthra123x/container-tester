import { ipcMain } from 'electron'
import si from 'systeminformation'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import { getCPUInfo, getRAMInfo, getGPUInfo, getSystemInfo } from '../services/system-info.service'
import { getWifiInfo } from '../services/network.service'
import { getStorageInfo } from '../services/storage.service'
import { getBatteryInfo } from '../services/battery.service'
import { getSensorInfo } from '../services/sensor.service'
import type { CPUInfo, RAMInfo, GPUInfo, OSInfo, MotherboardInfo, SystemInfo, StorageInfo, BatteryInfo, SensorInfo, WifiInfo } from '../../shared/types/hardware.types'

const IPC_TIMEOUT = 10000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

export function registerSystemIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_SYSTEM_INFO, async (): Promise<SystemInfo | null> => {
    try {
      return await getSystemInfo()
    } catch {
      return null
    }
  })

  ipcMain.handle(IPC_CHANNELS.GET_SYSTEM_SPECS, async (): Promise<{
    cpu: CPUInfo | null
    ram: RAMInfo | null
    gpu: GPUInfo | null
    storage: StorageInfo[]
    battery: BatteryInfo | null
    sensors: SensorInfo | null
    wifi: WifiInfo | null
  }> => {
    const [cpu, ram, gpu, storage, battery, sensors, wifi] = await Promise.allSettled([
      getCPUInfo(),
      getRAMInfo(),
      getGPUInfo(),
      getStorageInfo(),
      getBatteryInfo(),
      getSensorInfo(),
      getWifiInfo(),
    ])

    return {
      cpu: cpu.status === 'fulfilled' ? cpu.value : null,
      ram: ram.status === 'fulfilled' ? ram.value : null,
      gpu: gpu.status === 'fulfilled' ? gpu.value : null,
      storage: storage.status === 'fulfilled' ? storage.value : [],
      battery: battery.status === 'fulfilled' ? battery.value : null,
      sensors: sensors.status === 'fulfilled' ? sensors.value : null,
      wifi: wifi.status === 'fulfilled' ? wifi.value : null,
    }
  })

  ipcMain.handle(IPC_CHANNELS.GET_CPU_INFO, async (): Promise<CPUInfo | null> => {
    try {
      return await getCPUInfo()
    } catch {
      return null
    }
  })

  ipcMain.handle(IPC_CHANNELS.GET_RAM_INFO, async (): Promise<RAMInfo | null> => {
    try {
      return await getRAMInfo()
    } catch {
      return null
    }
  })

  ipcMain.handle(IPC_CHANNELS.GET_GPU_INFO, async (): Promise<GPUInfo | null> => {
    try {
      return await getGPUInfo()
    } catch {
      return null
    }
  })

  ipcMain.handle(IPC_CHANNELS.GET_OS_INFO, async (): Promise<OSInfo | null> => {
    try {
      const osInfo = await withTimeout(si.osInfo(), IPC_TIMEOUT, 'osInfo')
      return {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        kernel: osInfo.kernel,
        arch: osInfo.arch,
        hostname: osInfo.hostname,
        activated: true
      }
    } catch {
      return null
    }
  })

  ipcMain.handle(IPC_CHANNELS.GET_MOTHERBOARD_INFO, async (): Promise<MotherboardInfo | null> => {
    try {
      const [system, bios] = await Promise.allSettled([
        withTimeout(si.system(), IPC_TIMEOUT, 'system'),
        withTimeout(si.bios(), IPC_TIMEOUT, 'bios')
      ])
      const sys = system.status === 'fulfilled' ? system.value : { manufacturer: '', model: '', version: '', serial: '' }
      const bio = bios.status === 'fulfilled' ? bios.value : { version: '', releaseDate: '' }
      return {
        manufacturer: sys.manufacturer || '',
        model: sys.model || '',
        version: sys.version || '',
        serial: sys.serial || '',
        biosVersion: bio.version || '',
        biosDate: bio.releaseDate || ''
      }
    } catch {
      return null
    }
  })
}