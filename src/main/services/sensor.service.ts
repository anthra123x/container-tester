import si from 'systeminformation'
import { runPowerShell } from './powershell'
import { cached } from './service-cache'

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

async function getMotherboardAndFanSensors(): Promise<{
  motherboardTemp: number | null; chipsetTemp: number | null; voltageRails: VoltageRail[]; fans: FanInfo[]
}> {
  const script = `
$result = @{}
$result.motherboardTemp = $null
$result.chipsetTemp = $null
$result.voltageRails = @()
$result.fans = @()

# Thermal zones
$zones = Get-WmiObject -Namespace root\\wmi -Class MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue
$allTemps = @()
if ($zones) {
  foreach ($s in $zones) {
    $tempC = [math]::Round(($s.CurrentTemperature - 2731.5) / 10, 1)
    $allTemps += @{ Name = "$($s.InstanceName)"; TempC = $tempC }
    $nameLower = "$($s.InstanceName)".ToLower()
    if ($nameLower -match "cpu|processor") { $result.chipsetTemp = $tempC }
    elseif ($nameLower -match "pch|chipset") { $result.chipsetTemp = $tempC }
    elseif ($result.motherboardTemp -eq $null) { $result.motherboardTemp = $tempC }
  }
}
if ($result.chipsetTemp -eq $null -and $result.motherboardTemp -ne $null) { $result.chipsetTemp = $result.motherboardTemp }

# Fans
$fans = Get-WmiObject -Namespace root\\wmi -Class MSAcpi_Fan -ErrorAction SilentlyContinue
if ($fans) {
  foreach ($f in $fans) {
    $result.fans += @{
      Name = "$($f.InstanceName)" -replace '.*\\\\',''
      RPM = try { [int]$f.FanSpeed } catch { $null }
      Percentage = try { [int]$f.FanSpeedPercentage } catch { $null }
    }
  }
} else {
  $cpuFan = Get-WmiObject -Namespace root\\cimv2 -Class Win32_Fan -ErrorAction SilentlyContinue
  if ($cpuFan) {
    foreach ($f in $cpuFan) {
      $result.fans += @{ Name = "$($f.Name)"; RPM = try { [int]$f.DesiredSpeed } catch { $null }; Percentage = $null }
    }
  }
}

# Voltage rails (best-effort, rarely available)
try {
  $cpuVoltage = try { [math]::Round((Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1).CurrentVoltage * 0.1, 2) } catch { $null }
  if ($cpuVoltage) { $result.voltageRails += @{ Name = "Vcore (CPU)"; Voltage = $cpuVoltage } }
} catch {}

$result | ConvertTo-Json -Compress -Depth 3
`
  const defaults = { motherboardTemp: null, chipsetTemp: null, voltageRails: [] as VoltageRail[], fans: [] as FanInfo[] }
  try {
    const raw = await runPowerShell(script, PS_TIMEOUT)
    if (!raw || raw === 'null') return defaults
    const parsed = JSON.parse(raw)
    return {
      motherboardTemp: parsed.motherboardTemp ?? null,
      chipsetTemp: parsed.chipsetTemp ?? null,
      voltageRails: Array.isArray(parsed.voltageRails) ? parsed.voltageRails.filter((r: any) => r.Voltage != null) : [],
      fans: Array.isArray(parsed.fans) ? parsed.fans : [],
    }
  } catch {
    return defaults
  }
}

async function fetchSensorInfo(): Promise<SensorInfo> {
  const [cpuTemp, diskLayout, mbAndFans] = await Promise.allSettled([
    withTimeout(si.cpuTemperature(), SI_TIMEOUT, 'cpuTemperature'),
    withTimeout(si.diskLayout(), SI_TIMEOUT, 'diskLayout'),
    getMotherboardAndFanSensors(),
  ])

  const cpuTempVal = cpuTemp.status === 'fulfilled' ? cpuTemp.value : { main: null, cores: [], max: null, package: null }
  const diskLayoutVal = diskLayout.status === 'fulfilled' ? diskLayout.value : []
  const mfVal = mbAndFans.status === 'fulfilled' ? mbAndFans.value : { motherboardTemp: null, chipsetTemp: null, voltageRails: [], fans: [] }

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
      temperature: null, hotspotTemp: null, memoryTemp: null,
      coreClock: null, memoryClock: null, fanSpeed: null, fanPercent: null, powerDraw: null
    },
    storage: storageTemps,
    motherboard: {
      temp: mfVal.motherboardTemp,
      chipsetTemp: mfVal.chipsetTemp,
      voltageRails: mfVal.voltageRails
    },
    fans: mfVal.fans
  }
}

export async function getSensorInfo(): Promise<SensorInfo> {
  return cached('sensor:info', 30000, fetchSensorInfo)
}
