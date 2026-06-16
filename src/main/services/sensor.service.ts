import si from 'systeminformation'
import { runPowerShellWithRetry } from './powershell'

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
  const [mbResult, vrResult] = await Promise.all([
    runPowerShellWithRetry<string>(script, (r) => r),
    runPowerShellWithRetry<string>(momboScript, (r) => r)
  ])

  let motherboardTemp: number | null = null
  let chipsetTemp: number | null = null

  if (mbResult && mbResult !== '[]') {
    try {
      const zones = JSON.parse(mbResult)
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
  if (vrResult) {
    try {
      voltageRails = JSON.parse(vrResult)
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
  const [cpuTemp, graphics, diskLayout, mbSensors, fanSpeeds] = await Promise.all([
    si.cpuTemperature(),
    si.graphics(),
    si.diskLayout(),
    getMotherboardSensors(),
    getFanSpeeds()
  ])

  const gpuController = graphics.controllers && graphics.controllers.length > 0
    ? graphics.controllers[0]
    : null

  const storageTemps: { device: string; temperature: number | null }[] = []
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
      max: cpuTemp.max ?? null,
      packageTemp: cpuTemp.package ?? null
    },
    gpu: {
      temperature: gpuController?.temperatureGpu ?? null,
      hotspotTemp: null,
      memoryTemp: null,
      coreClock: gpuController?.clockCore ?? null,
      memoryClock: gpuController?.clockMemory ?? null,
      fanSpeed: null,
      fanPercent: null,
      powerDraw: gpuController?.powerDraw ?? null
    },
    storage: storageTemps,
    motherboard: {
      temp: mbSensors.motherboardTemp,
      chipsetTemp: mbSensors.chipsetTemp,
      voltageRails: mbSensors.voltageRails
    },
    fans: fanSpeeds
  }
}
