import si from 'systeminformation'
import { runPowerShellWithRetry } from './powershell'
import { cached } from './service-cache'

const SI_TIMEOUT = 8000
const PS_TIMEOUT = 5000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
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
  chemistry: string | null
  manufactureDate: string | null
  serialNumber: string | null
  chargeRate: number | null
  dischargeRate: number | null
  estimatedRuntime: number | null
  designVoltage: number | null
  lowCapacityWarning: number | null
}

interface PSBatteryData {
  DesignedCapacity?: number
  FullChargedCapacity?: number
  CycleCount?: number
  Temperature?: number
  Voltage?: number
  ManufactureDate?: string
  ManufactureName?: string
  SerialNumber?: string
  Chemistry?: number
  DesignVoltage?: number
  LowCapacityWarning?: number
}

async function getBatteryFullChargedCapacity(): Promise<{ designed: number | null; fullCharged: number | null }> {
  const result = await runPowerShellWithRetry<{ designed: number | null; fullCharged: number | null }>(
    'Get-WmiObject -Namespace root\\wmi -Class BatteryFullChargedCapacity | Select-Object DesignedCapacity,FullChargedCapacity | ConvertTo-Json -Compress',
    (raw) => {
      const parsed = JSON.parse(raw)
      return {
        designed: parsed.DesignedCapacity ?? null,
        fullCharged: parsed.FullChargedCapacity ?? null
      }
    },
    1,
    PS_TIMEOUT
  )
  return result ?? { designed: null, fullCharged: null }
}

async function getBatteryStaticData(): Promise<PSBatteryData | null> {
  return runPowerShellWithRetry<PSBatteryData>(
    `Get-WmiObject -Namespace root\\wmi -Class BatteryStaticData | Select-Object CycleCount,Temperature,Voltage,ManufactureDate,ManufactureName,SerialNumber,Chemistry,DesignedVoltage | ConvertTo-Json -Compress`,
    (raw) => JSON.parse(raw),
    1,
    PS_TIMEOUT
  )
}

async function getBatteryRuntime(): Promise<{ estimatedRuntime: number | null; chargeRate: number | null; dischargeRate: number | null }> {
  const script = `
    $bat = Get-WmiObject -Namespace root\\wmi -Class BatteryStatus -ErrorAction SilentlyContinue
    if (-not $bat) { return "null" }
    $chargeRate = try { [math]::Round($bat.ChargeRate / 1000, 2) } catch { $null }
    $dischargeRate = try { [math]::Round($bat.DischargeRate / 1000, 2) } catch { $null }
    $e = $bat.EstimatedRuntime
    $cr = if ($chargeRate -ne $null) { $chargeRate } else { "null" }
    $dr = if ($dischargeRate -ne $null) { $dischargeRate } else { "null" }
    $er = if ($e -ne $null) { $e } else { "null" }
    return "{ ""EstimatedRuntime"": $er, ""ChargeRate"": $cr, ""DischargeRate"": $dr }"
  `
  const result = await runPowerShellWithRetry<{ estimatedRuntime: number | null; chargeRate: number | null; dischargeRate: number | null }>(
    script, JSON.parse, 1, PS_TIMEOUT
  )
  return result ?? { estimatedRuntime: null, chargeRate: null, dischargeRate: null }
}

async function fetchBatteryInfoRaw(): Promise<BatteryInfo> {
  const [battery, capacity, staticData, runtime] = await Promise.allSettled([
    withTimeout(si.battery(), SI_TIMEOUT, 'battery').catch(() => ({
      hasBattery: false, isCharging: false, maxCapacity: null, currentCapacity: null,
      designedCapacity: null, cycleCount: null, voltage: null, acConnected: false
    })),
    getBatteryFullChargedCapacity(),
    getBatteryStaticData(),
    getBatteryRuntime(),
  ])

  const bat = battery.status === 'fulfilled' ? battery.value
    : { hasBattery: false, isCharging: false, maxCapacity: null, currentCapacity: null,
         designedCapacity: null, cycleCount: null, voltage: null, acConnected: false }
  const cap = capacity.status === 'fulfilled' ? capacity.value : { designed: null, fullCharged: null }
  const sd = staticData.status === 'fulfilled' ? staticData.value : null
  const rt = runtime.status === 'fulfilled' ? runtime.value : { estimatedRuntime: null, chargeRate: null, dischargeRate: null }

  const designCapacity = cap.designed ?? (bat.designedCapacity ?? null)
  const maxCapacity = cap.fullCharged ?? (bat.maxCapacity ?? null)
  const currentCapacity = bat.currentCapacity ?? null
  const cycleCount = sd?.CycleCount ?? (bat.cycleCount ?? null)

  let wearLevel: number | null = null
  if (designCapacity && designCapacity > 0) {
    const effectiveMax = maxCapacity ?? currentCapacity
    if (effectiveMax != null) {
      wearLevel = Math.round(((designCapacity - effectiveMax) / designCapacity) * 10000) / 100
    }
  }

  let health: number | null = null
  if (wearLevel != null) {
    health = Math.max(0, Math.min(100, Math.round((100 - wearLevel) * 100) / 100))
  }

  let chemistry: string | null = null
  if (sd?.Chemistry !== undefined) {
    const chemMap: Record<number, string> = {
      1: 'Other', 2: 'Unknown', 3: 'Lead Acid', 4: 'Nickel Cadmium',
      5: 'Nickel Metal Hydride', 6: 'Lithium Ion', 7: 'Lithium Polymer',
      8: 'Lithium Iron Phosphate', 9: 'Silver Oxide', 10: 'Zinc Air'
    }
    chemistry = chemMap[sd.Chemistry] ?? `Type ${sd.Chemistry}`
  }

  let manufactureDate: string | null = null
  if (sd?.ManufactureDate) {
    const d = sd.ManufactureDate
    if (typeof d === 'number' && d.toString().length === 4) {
      manufactureDate = d.toString()
    } else if (typeof d === 'string') {
      manufactureDate = d
    }
  }

  const temp = sd?.Temperature != null
    ? Math.round((sd.Temperature - 273.15) * 100) / 100
    : null

  return {
    hasBattery: bat.hasBattery,
    isCharging: bat.isCharging ?? bat.acConnected ?? false,
    designCapacity,
    currentCapacity,
    maxCapacity,
    wearLevel,
    cycleCount,
    voltage: sd?.Voltage != null ? Math.round(sd.Voltage / 1000 * 100) / 100 : (bat.voltage ?? null),
    temperature: temp,
    health,
    chemistry,
    manufactureDate,
    serialNumber: sd?.SerialNumber ?? null,
    chargeRate: rt.chargeRate,
    dischargeRate: rt.dischargeRate,
    estimatedRuntime: rt.estimatedRuntime,
    designVoltage: sd?.DesignedVoltage ?? null,
    lowCapacityWarning: sd?.LowCapacityWarning ?? null,
  }
}

export async function getBatteryInfo(): Promise<BatteryInfo> {
  return cached('battery:info', 30000, fetchBatteryInfoRaw)
}
