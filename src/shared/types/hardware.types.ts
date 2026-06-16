export interface SystemInfo {
  hostname: string
  model: string
  serial: string
  manufacturer: string
  os: OSInfo
  motherboard: MotherboardInfo
  extraSystem?: {
    edition: string | null
    secureBoot: boolean | null
    tpm: { present: boolean; version: string | null; enabled: boolean | null } | null
    virtualization: { supported: boolean | null; enabled: boolean | null; hypervisorPresent: boolean | null }
    powerPlan: string | null
    uptime: { seconds: number; days: number; hours: number; minutes: number }
  }
}

export interface OSInfo {
  platform: string
  distro: string
  release: string
  kernel: string
  arch: string
  hostname: string
  activated: boolean
}

export interface MotherboardInfo {
  manufacturer: string
  model: string
  version: string
  serial: string
  biosVersion: string
  biosDate: string
}

export interface CPUInfo {
  manufacturer: string
  brand: string
  cores: number
  physicalCores: number
  speed: number
  speedMax: number
  speedMin: number
  usage: number
  temperature: number | null
  voltage?: number | null
  coreTemps?: number[]
  perCoreLoad?: number[]
  cacheL1d?: number | null
  cacheL1i?: number | null
  cacheL2?: number | null
  cacheL3?: number | null
  contextSwitches?: number | null
  interrupts?: number | null
  processCount?: number | null
}

export interface RAMInfo {
  total: number
  used: number
  free: number
  usagePercent: number
  slots: RAMSlot[]
  swapTotal?: number | null
  swapUsed?: number | null
}

export interface RAMSlot {
  bank: string
  type: string
  size: number
  speed: number
  manufacturer: string
  partNum: string
  serialNum: string
  formFactor?: string | null
  timings?: string | null
}

export interface GPUInfo {
  model: string
  vendor: string
  vram: number
  driverVersion: string
  temperature: number | null
  usage: number
  coreClock?: number | null
  memoryClock?: number | null
  powerDraw?: number | null
  fanSpeed?: number | null
  driverDate?: string | null
}

export interface StorageInfo {
  device: string
  type: string
  interfaceType: string
  size: number
  used: number
  available: number
  usagePercent: number
  smartStatus: string
  temperature: number | null
  hoursUsed: number
  health: number | null
}

export interface BatteryInfo {
  hasBattery: boolean
  isCharging: boolean
  designCapacity: number
  currentCapacity: number
  maxCapacity: number
  wearLevel: number
  cycleCount: number
  voltage: number
  temperature: number | null
  health: number
}

export interface SensorInfo {
  cpuTemperature: number | null
  gpuTemperature: number | null
  storageTemperature: number | null
  cpuVoltage: number | null
  fanSpeed: number | null
}

export interface WifiInfo {
  adapterPresent: boolean
  adapterName: string
  enabled: boolean
  connected: boolean
  ssid: string
  signalStrength: number
  availableNetworks: string[]
}

export interface BluetoothInfo {
  adapterPresent: boolean
  adapterName: string
  enabled: boolean
  connectedDevices: string[]
}

export interface EthernetInfo {
  adapterPresent: boolean
  adapterName: string
  ipAddress: string
  connected: boolean
  speed: number
}
