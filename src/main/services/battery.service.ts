import si from 'systeminformation'
import { runPowerShellJson, runPowerShellWithRetry } from './powershell'

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
  Chemistry?: string
  DesignVoltage?: number
  LowCapacityWarning?: number
}

async function getBatteryFullChargedCapacity(): Promise<{ designed: number | null; fullCharged: number | null }> {
  return runPowerShellWithRetry<{ designed: number | null; fullCharged: number | null }>(
    'Get-WmiObject -Namespace root\\wmi -Class BatteryFullChargedCapacity | Select-Object DesignedCapacity,FullChargedCapacity | ConvertTo-Json -Compress',
    (raw) => {
      const parsed = JSON.parse(raw)
      return {
        designed: parsed.DesignedCapacity ?? null,
        fullCharged: parsed.FullChargedCapacity ?? null
      }
    }
  ) ?? { designed: null, fullCharged: null }
}

async function getBatteryStaticData(): Promise<PSBatteryData | null> {
  return runPowerShellWithRetry<PSBatteryData>(
    `Get-WmiObject -Namespace root\\wmi -Class BatteryStaticData | Select-Object CycleCount,Temperature,Voltage,ManufactureDate,ManufactureName,SerialNumber,Chemistry,DesignedVoltage | ConvertTo-Json -Compress`,
    (raw) => JSON.parse(raw)
  )
}

async function getBatteryRuntime(): Promise<{ estimatedRuntime: number | null; chargeRate: number | null; dischargeRate: number | null }> {
  const script = `
    $bat = Get-WmiObject -Namespace root\\wmi -Class BatteryStatus -ErrorAction SilentlyContinue
    if (-not $bat) { return "null" }
    $chargeRate = try { [math]::Round($bat.ChargeRate / 1000, 2) } catch { $null }
    $dischargeRate = try { [math]::Round($bat.DischargeRate / 1000, 2) } catch { $null }
    $remaining = try { [math]::Round($bat.RemainingCapacity / 1000, 2) } catch { $null }
    return "{ ""EstimatedRuntime"": $($bat.EstimatedRuntime), ""ChargeRate"": $chargeRate, ""DischargeRate"": $dischargeRate }"
  `
  return runPowerShellWithRetry<{ estimatedRuntime: number | null; chargeRate: number | null; dischargeRate: number | null }>(
    script, JSON.parse
  ) ?? { estimatedRuntime: null, chargeRate: null, dischargeRate: null }
}

export async function getBatteryInfo(): Promise<BatteryInfo> {
  const battery = await si.battery()
  const { designed, fullCharged } = await getBatteryFullChargedCapacity()
  const staticData = await getBatteryStaticData()
  const runtime = await getBatteryRuntime()

  const designCapacity = designed ?? (battery.designedCapacity ?? null)
  const maxCapacity = fullCharged ?? (battery.maxCapacity ?? null)
  const currentCapacity = battery.currentCapacity ?? null
  const cycleCount = staticData?.CycleCount ?? (battery.cycleCount ?? null)

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
  if (staticData?.Chemistry !== undefined) {
    const chemMap: Record<number, string> = {
      1: 'Other', 2: 'Unknown', 3: 'Lead Acid', 4: 'Nickel Cadmium',
      5: 'Nickel Metal Hydride', 6: 'Lithium Ion', 7: 'Lithium Polymer',
      8: 'Lithium Iron Phosphate', 9: 'Silver Oxide', 10: 'Zinc Air'
    }
    chemistry = chemMap[staticData.Chemistry] ?? `Type ${staticData.Chemistry}`
  }

  let manufactureDate: string | null = null
  if (staticData?.ManufactureDate) {
    const d = staticData.ManufactureDate
    if (typeof d === 'number' && d.toString().length === 4) {
      manufactureDate = d.toString()
    } else if (typeof d === 'string') {
      manufactureDate = d
    }
  }

  const temp = staticData?.Temperature != null
    ? Math.round((staticData.Temperature - 273.15) * 100) / 100
    : null

  return {
    hasBattery: battery.hasBattery,
    isCharging: battery.isCharging ?? battery.acConnected ?? false,
    designCapacity,
    currentCapacity,
    maxCapacity,
    wearLevel,
    cycleCount,
    voltage: staticData?.Voltage != null ? Math.round(staticData.Voltage / 1000 * 100) / 100 : (battery.voltage ?? null),
    temperature: temp,
    health,
    chemistry,
    manufactureDate,
    serialNumber: staticData?.SerialNumber ?? null,
    chargeRate: runtime.chargeRate,
    dischargeRate: runtime.dischargeRate,
    estimatedRuntime: runtime.estimatedRuntime,
    designVoltage: staticData?.DesignedVoltage ?? null,
    lowCapacityWarning: staticData?.LowCapacityWarning ?? null,
  }
}
