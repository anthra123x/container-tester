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
  hoursUsed: number | null
  health: number | null
  reallocatedSectors?: number | null
  pendingSectors?: number | null
  crcErrors?: number | null
  ssdWear?: number | null
  totalWritesGB?: number | null
  totalReadsGB?: number | null
  partitionCount?: number | null
  isBootDrive?: boolean
  nvmePcieLanes?: string | null
  formFactor?: string | null
  serialNumber?: string | null
  firmware?: string | null
}

export interface BatteryInfo {
  hasBattery: boolean
  isCharging: boolean
  designCapacity: number | null
  currentCapacity: number | null
  maxCapacity: number | null
  wearLevel: number | null
  cycleCount: number | null
  voltage: number | null
  temperature: number | null
  health: number | null
  chemistry?: string | null
  manufactureDate?: string | null
  serialNumber?: string | null
  chargeRate?: number | null
  dischargeRate?: number | null
  estimatedRuntime?: number | null
  designVoltage?: number | null
  lowCapacityWarning?: number | null
}

export interface SensorInfo {
  cpu: {
    main: number | null
    cores: number[]
    max: number | null
    packageTemp: number | null
  }
  gpu: {
    temperature: number | null
    hotspotTemp: number | null
    memoryTemp: number | null
    coreClock: number | null
    memoryClock: number | null
    fanSpeed: number | null
    fanPercent: number | null
    powerDraw: number | null
  }
  storage: { device: string; temperature: number | null }[]
  motherboard: {
    temp: number | null
    chipsetTemp: number | null
    voltageRails: { name: string; voltage: number | null }[]
  }
  fans: { name: string; rpm: number | null; percentage: number | null }[]
}

export interface WifiInfo {
  networks: {
    ssid: string
    bssid: string
    mode: string
    channel: number
    frequency: number
    signalLevel: number | null
    quality: number | null
    security: string
    wpaFlags: string
    rsnFlags: string
  }[]
  interfaces: {
    id: string
    iface: string
    model: string
    vendor: string
    mac: string
  }[]
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
