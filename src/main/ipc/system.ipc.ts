import { ipcMain } from 'electron'
import si from 'systeminformation'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import { getCPUInfo, getRAMInfo, getGPUInfo, getSystemInfo, getStorageInfo, getBatteryInfo, getSensorInfo, getWifiInfo } from '../services/system-info.service'
import type { CPUInfo, RAMInfo, GPUInfo, OSInfo, MotherboardInfo, SystemInfo, StorageInfo, BatteryInfo, SensorInfo, WifiInfo } from '../../shared/types/hardware.types'

export function registerSystemIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_SYSTEM_INFO, async (): Promise<SystemInfo> => {
    return getSystemInfo()
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

  ipcMain.handle(IPC_CHANNELS.GET_CPU_INFO, async (): Promise<CPUInfo> => {
    return getCPUInfo()
  })

  ipcMain.handle(IPC_CHANNELS.GET_RAM_INFO, async (): Promise<RAMInfo> => {
    return getRAMInfo()
  })

  ipcMain.handle(IPC_CHANNELS.GET_GPU_INFO, async (): Promise<GPUInfo> => {
    return getGPUInfo()
  })

  ipcMain.handle(IPC_CHANNELS.GET_OS_INFO, async (): Promise<OSInfo> => {
    const osInfo = await si.osInfo()
    return {
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      kernel: osInfo.kernel,
      arch: osInfo.arch,
      hostname: osInfo.hostname,
      activated: true
    }
  })

  ipcMain.handle(IPC_CHANNELS.GET_MOTHERBOARD_INFO, async (): Promise<MotherboardInfo> => {
    const system = await si.system()
    const bios = await si.bios()
    return {
      manufacturer: system.manufacturer,
      model: system.model,
      version: system.version,
      serial: system.serial,
      biosVersion: bios.version,
      biosDate: bios.releaseDate
    }
  })
}
