import si from 'systeminformation'
import { runPowerShellWithRetry } from './powershell'

const PS_TIMEOUT = 5000
const SI_TIMEOUT = 8000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

export interface FanInfo {
  name: string
  rpm: number | null
  percentage: number | null
}

export interface VoltageRail {
  name: string
  voltage: number | null
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
    voltageRails: VoltageRail[]
  }
  fans: FanInfo[]
}

async function getMotherboardSensors(): Promise<{
  motherboardTemp: number | null; chipsetTemp: number | null; voltageRails: VoltageRail[]
}> {
  const script = `
    $sensors = Get-WmiObject -Namespace root\\wmi -Class MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue
    if ($sensors) {
      $temps = @()
      foreach ($s in $sensors) {
        $temps += [PSCustomObject]@{
          Name = $s.InstanceName
          TempC = [math]::Round(($s.CurrentTemperature - 2731.5) / 10, 1)
        }
      }
      return ($temps | ConvertTo-Json -Compress)
    }
    return "[]"
  `
  const momboScript = `
    $voltages = try {
      Get-WmiObject -Namespace root\\wmi -Class MSAcpi_PowerSource -ErrorAction SilentlyContinue |
        Select-Object Voltage,RateOfUse | ConvertTo-Json -Compress
    } catch { "[]" }
    $voltageRails = @()
    $regPaths = @(
      "HKLM:\\HARDWARE\\DESCRIPTION\\System\\BIOS",
      "HKLM:\\HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0"
    )
    $voltageRails += [PSCustomObject]@{ Name = "Vcore (CPU)"; Voltage = try { (Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty CurrentVoltage) -and 0.1 } catch { $null } }
    $voltageRails += [PSCustomObject]@{ Name = "+12V"; Voltage = try { (Get-WmiObject -Namespace root\\wmi -Class MSAcpi_PowerSource -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Voltage)/1000 } catch { $null } }
    $voltageRails += [PSCustomObject]@{ Name = "DRAM"; Voltage = $null }
    $voltageRails | ConvertTo-Json -Compress
  `
  const [mbResult, vrResult] = await Promise.allSettled([
    runPowerShellWithRetry<string>(script, (r) => r),
    runPowerShellWithRetry<string>(momboScript, (r) => r)
  ])

  const mbString = mbResult.status === 'fulfilled' ? mbResult.value : null
  const vrString = vrResult.status === 'fulfilled' ? vrResult.value : null

  let motherboardTemp: number | null = null
  let chipsetTemp: number | null = null

  if (mbString && mbString !== '[]') {
    try {
      const zones = JSON.parse(mbString)
      if (Array.isArray(zones)) {
        for (const z of zones) {
          const name = (z.Name || '').toLowerCase()
          if (name.includes('cpu') || name.includes('processor')) {
            chipsetTemp = z.TempC ?? null
          } else if (name.includes('pch') || name.includes('chipset')) {
            chipsetTemp = z.TempC ?? null
          } else if (motherboardTemp === null) {
            motherboardTemp = z.TempC ?? null
          }
        }
        if (chipsetTemp === null) {
          chipsetTemp = motherboardTemp
        }
      }
    } catch { }
  }

  let voltageRails: VoltageRail[] = []
  if (vrString) {
    try {
      const parsed = JSON.parse(vrString)
      voltageRails = Array.isArray(parsed) ? parsed : []
    } catch { }
  }

  return { motherboardTemp, chipsetTemp, voltageRails: voltageRails.filter(r => r.Voltage != null) }
}

async function getFanSpeeds(): Promise<FanInfo[]> {
  const script = `
    $fans = Get-WmiObject -Namespace root\\wmi -Class MSAcpi_Fan -ErrorAction SilentlyContinue
    if ($fans) {
      $result = @()
      foreach ($f in $fans) {
        $result += [PSCustomObject]@{
          Name = $f.InstanceName -replace '.*\\\\',''
          RPM = try { [int]($f.FanSpeed) } catch { $null }
          Percentage = try { [int]($f.FanSpeedPercentage) } catch { $null }
        }
      }
      return ($result | ConvertTo-Json -Compress)
    }
    $cpuFan = Get-WmiObject -Namespace root\\cimv2 -Class Win32_Fan -ErrorAction SilentlyContinue
    if ($cpuFan) {
      $result = @()
      foreach ($f in $cpuFan) {
        $result += [PSCustomObject]@{ Name = $f.Name; RPM = try { [int]($f.DesiredSpeed) } catch { $null }; Percentage = $null }
      }
      return ($result | ConvertTo-Json -Compress)
    }
    return "[]"
  `
  const result = await runPowerShellWithRetry<string>(script, (r) => r)
  if (result && result !== '[]') {
    try { return JSON.parse(result) } catch { }
  }
  return []
}

export async function getSensorInfo(): Promise<SensorInfo> {
  const [cpuTemp, diskLayout, mbSensors, fanSpeeds] = await Promise.allSettled([
    withTimeout(si.cpuTemperature(), SI_TIMEOUT, 'cpuTemperature'),
    withTimeout(si.diskLayout(), SI_TIMEOUT, 'diskLayout'),
    getMotherboardSensors(),
    getFanSpeeds()
  ])

  const cpuTempVal = cpuTemp.status === 'fulfilled' ? cpuTemp.value : { main: null, cores: [], max: null, package: null }
  const diskLayoutVal = diskLayout.status === 'fulfilled' ? diskLayout.value : []
  const mbSensorsVal = mbSensors.status === 'fulfilled' ? mbSensors.value : { motherboardTemp: null, chipsetTemp: null, voltageRails: [] }
  const fanSpeedsVal = fanSpeeds.status === 'fulfilled' ? fanSpeeds.value : []

  const storageTemps: { device: string; temperature: number | null }[] = []
  for (const disk of diskLayoutVal) {
    storageTemps.push({
      device: disk.name || 'Unknown',
      temperature: disk.temperature ?? null
    })
  }

  return {
    cpu: {
      main: cpuTempVal.main ?? null,
      cores: cpuTempVal.cores ?? [],
      max: cpuTempVal.max ?? null,
      packageTemp: cpuTempVal.package ?? null
    },
    gpu: {
      temperature: null,
      hotspotTemp: null,
      memoryTemp: null,
      coreClock: null,
      memoryClock: null,
      fanSpeed: null,
      fanPercent: null,
      powerDraw: null
    },
    storage: storageTemps,
    motherboard: {
      temp: mbSensorsVal.motherboardTemp,
      chipsetTemp: mbSensorsVal.chipsetTemp,
      voltageRails: mbSensorsVal.voltageRails
    },
    fans: fanSpeedsVal
  }
}
