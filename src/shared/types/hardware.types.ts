export interface SystemInfo {
  hostname: string
  model: string
  serial: string
  manufacturer: string
  os: OSInfo
  motherboard: MotherboardInfo
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
}

export interface RAMInfo {
  total: number
  used: number
  free: number
  usagePercent: number
  slots: RAMSlot[]
}

export interface RAMSlot {
  bank: string
  type: string
  size: number
  speed: number
  manufacturer: string
  partNum: string
  serialNum: string
}

export interface GPUInfo {
  model: string
  vendor: string
  vram: number
  driverVersion: string
  temperature: number | null
  usage: number
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

export interface NetworkInfo {
  wifi: WifiInfo
  bluetooth: BluetoothInfo
  ethernet: EthernetInfo
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
