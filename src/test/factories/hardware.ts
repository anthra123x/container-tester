import type { SystemInfo, CPUInfo, RAMInfo, GPUInfo, StorageInfo, BatteryInfo, SensorInfo, WifiInfo } from '../../shared/types/hardware.types'
import type { AutoDiagnosticPhase, Diagnostic } from '../../shared/types/diagnostic.types'

export function mockSystemInfo(overrides?: Partial<SystemInfo>): SystemInfo {
  return {
    hostname: 'TEST-PC',
    model: 'ThinkPad X1 Carbon',
    serial: 'SN-12345-ABCDE',
    manufacturer: 'Lenovo',
    os: {
      platform: 'win32',
      distro: 'Windows 11 Pro',
      release: '10.0.22631',
      kernel: '10.0.22631',
      arch: 'x64',
      hostname: 'TEST-PC',
      activated: true,
    },
    motherboard: {
      manufacturer: 'Lenovo',
      model: '21A1',
      version: 'Rev 1.0',
      serial: 'MB-SN-98765',
      biosVersion: 'N38ET60W',
      biosDate: '2024/01/15',
    },
    extraSystem: {
      edition: 'Pro',
      secureBoot: true,
      tpm: { present: true, version: '2.0', enabled: true },
      virtualization: { supported: true, enabled: true, hypervisorPresent: false },
      powerPlan: 'Balanced',
      uptime: { seconds: 86400, days: 1, hours: 0, minutes: 0 },
    },
    ...overrides,
  }
}

export function mockCpuInfo(overrides?: Partial<CPUInfo>): CPUInfo {
  return {
    manufacturer: 'Intel',
    brand: 'Core i7-13700H',
    cores: 14,
    physicalCores: 6,
    speed: 2.4,
    speedMax: 5.0,
    speedMin: 0.8,
    usage: 23.5,
    temperature: 62,
    voltage: 1.25,
    coreTemps: [61, 63, 60, 62, 61, 64],
    perCoreLoad: [15, 30, 20, 25, 18, 35],
    cacheL1d: 49152,
    cacheL1i: 32768,
    cacheL2: 2097152,
    cacheL3: 25165824,
    contextSwitches: 15000,
    interrupts: 3200,
    processCount: 215,
    ...overrides,
  }
}

export function mockRamInfo(overrides?: Partial<RAMInfo>): RAMInfo {
  return {
    total: 17179869184,
    used: 8589934592,
    free: 8589934592,
    usagePercent: 50,
    slots: [
      { bank: 'Slot 1', type: 'DDR5', size: 8589934592, speed: 4800, manufacturer: 'Samsung', partNum: 'M425R1GB4BB0-CQK', serialNum: 'SN-001', formFactor: 'SO-DIMM', timings: '40-39-39-76' },
      { bank: 'Slot 2', type: 'DDR5', size: 8589934592, speed: 4800, manufacturer: 'Samsung', partNum: 'M425R1GB4BB0-CQK', serialNum: 'SN-002', formFactor: 'SO-DIMM', timings: '40-39-39-76' },
    ],
    swapTotal: 34359738368,
    swapUsed: 0,
    ...overrides,
  }
}

export function mockGpuInfo(overrides?: Partial<GPUInfo>): GPUInfo {
  return {
    model: 'Intel Iris Xe Graphics',
    vendor: 'Intel',
    vram: 1073741824,
    driverVersion: '31.0.101.5333',
    driverDate: '2024/02/10',
    temperature: 48,
    usage: 12,
    coreClock: 1500,
    memoryClock: 2133,
    powerDraw: 15.5,
    fanSpeed: null,
    ...overrides,
  }
}

export function mockStorageInfo(index = 0): StorageInfo {
  const devices: StorageInfo[] = [
    {
      device: 'C:',
      type: 'NVMe',
      interfaceType: 'PCIe 4.0 x4',
      size: 512110190592,
      used: 214748364800,
      available: 297361825792,
      usagePercent: 41.9,
      smartStatus: 'Healthy',
      temperature: 35,
      hoursUsed: 450,
      health: 98,
      reallocatedSectors: 0,
      pendingSectors: 0,
      crcErrors: 0,
      ssdWear: 2,
      totalWritesGB: 3200,
      totalReadsGB: 5100,
      partitionCount: 3,
      isBootDrive: true,
      nvmePcieLanes: 'x4',
      formFactor: 'M.2 2280',
      serialNumber: 'S42NNX0T123456',
      firmware: 'HPS1AG3V',
    },
    {
      device: 'D:',
      type: 'SSD',
      interfaceType: 'SATA III',
      size: 1000204886016,
      used: 536870912000,
      available: 463333974016,
      usagePercent: 53.7,
      smartStatus: 'Healthy',
      temperature: 32,
      hoursUsed: 1200,
      health: 92,
      reallocatedSectors: 5,
      pendingSectors: 0,
      crcErrors: 0,
      ssdWear: 8,
      totalWritesGB: 8900,
      totalReadsGB: 14200,
      partitionCount: 2,
      isBootDrive: false,
      nvmePcieLanes: null,
      formFactor: '2.5"',
      serialNumber: 'Z5D7J3XQ98765',
      firmware: 'R0113D0Q',
    },
  ]
  return devices[index]
}

export function mockBatteryInfo(overrides?: Partial<BatteryInfo>): BatteryInfo {
  return {
    hasBattery: true,
    isCharging: true,
    designCapacity: 57000,
    currentCapacity: 55100,
    maxCapacity: 55350,
    wearLevel: 3,
    cycleCount: 180,
    voltage: 12.8,
    temperature: 28,
    health: 97,
    chemistry: 'Li-Poly',
    manufactureDate: '2023-08-15',
    serialNumber: 'BAT-001-ABC',
    chargeRate: 28.5,
    dischargeRate: null,
    estimatedRuntime: 32400,
    designVoltage: 11.55,
    lowCapacityWarning: 5700,
    ...overrides,
  }
}

export function mockSensorInfo(overrides?: Partial<SensorInfo>): SensorInfo {
  return {
    cpu: { main: 62, cores: [61, 63, 60, 62, 61, 64], max: 68, packageTemp: 63 },
    gpu: { temperature: 48, hotspotTemp: 52, memoryTemp: 44, coreClock: 1500, memoryClock: 2133, fanSpeed: null, fanPercent: null, powerDraw: 15.5 },
    storage: [{ device: 'C:', temperature: 35 }, { device: 'D:', temperature: 32 }],
    motherboard: { temp: 38, chipsetTemp: 42, voltageRails: [{ name: '+12V', voltage: 12.1 }, { name: '+5V', voltage: 5.02 }, { name: 'Vcore', voltage: 1.25 }] },
    fans: [{ name: 'CPU Fan', rpm: 2400, percentage: 45 }],
    ...overrides,
  }
}

export function mockWifiInfo(overrides?: Partial<WifiInfo>): WifiInfo {
  return {
    networks: [
      { ssid: 'HomeWiFi', bssid: 'aa:bb:cc:dd:ee:01', mode: 'Infrastructure', channel: 6, frequency: 2437, signalLevel: -52, quality: 85, security: 'WPA2-Personal', wpaFlags: 'CCMP', rsnFlags: 'CCMP' },
      { ssid: 'NeighborNet', bssid: 'aa:bb:cc:dd:ee:02', mode: 'Infrastructure', channel: 11, frequency: 2462, signalLevel: -75, quality: 45, security: 'WPA2-Personal', wpaFlags: 'CCMP', rsnFlags: 'CCMP' },
    ],
    interfaces: [{ id: '0', iface: 'wlan0', model: 'Intel Wi-Fi 6E AX211', vendor: 'Intel', mac: 'aa:bb:cc:dd:ee:ff' }],
    ...overrides,
  }
}

export function mockPhase(overrides?: Partial<AutoDiagnosticPhase>): AutoDiagnosticPhase {
  return {
    id: 'cpu',
    label: 'Diagnóstico de CPU',
    description: 'Verificando el procesador',
    status: 'PENDING',
    results: [],
    ...overrides,
  }
}

export function mockPhases(): AutoDiagnosticPhase[] {
  return [
    { id: 'system', label: 'Información del Sistema', description: 'Recopilando datos del equipo', status: 'PASS', results: [{ id: 's1', category: 'OS', testName: 'Sistema Operativo', status: 'PASS', value: 'Windows 11 Pro' }] },
    { id: 'cpu', label: 'Diagnóstico de CPU', description: 'Verificando el procesador', status: 'PASS', results: [{ id: 'c1', category: 'HARDWARE', testName: 'Velocidad CPU', status: 'PASS', value: '2.4 GHz' }] },
    { id: 'ram', label: 'Diagnóstico de RAM', description: 'Analizando la memoria', status: 'PASS', results: [{ id: 'r1', category: 'HARDWARE', testName: 'Memoria Total', status: 'PASS', value: '16 GB' }] },
    { id: 'gpu', label: 'Diagnóstico de GPU', description: 'Verificando la tarjeta gráfica', status: 'WARN', results: [{ id: 'g1', category: 'HARDWARE', testName: 'Temperatura GPU', status: 'WARN', value: '82°C', observations: 'Temperatura elevada' }] },
    { id: 'storage', label: 'Almacenamiento', description: 'Verificando discos y SMART', status: 'PASS', results: [{ id: 'st1', category: 'STORAGE', testName: 'Estado SMART', status: 'PASS', value: 'Healthy' }] },
    { id: 'battery', label: 'Batería', description: 'Analizando estado de la batería', status: 'PASS', results: [{ id: 'b1', category: 'BATTERY', testName: 'Salud Batería', status: 'PASS', value: '97%' }] },
    { id: 'sensors', label: 'Temperaturas', description: 'Monitoreando sensores térmicos', status: 'PASS', results: [{ id: 'se1', category: 'SENSOR', testName: 'CPU Temp', status: 'PASS', value: '62°C' }] },
    { id: 'network', label: 'Red', description: 'Probando conectividad de red', status: 'PASS', results: [{ id: 'n1', category: 'NETWORK', testName: 'Ping', status: 'PASS', value: '15 ms' }] },
  ]
}
