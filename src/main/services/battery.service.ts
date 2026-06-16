import si from 'systeminformation'
import { execSync } from 'child_process'

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
}

function runPowerShell(command: string): string {
  try {
    return execSync(`powershell -NoProfile -Command "${command.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      timeout: 10000
    }).trim()
  } catch {
    return ''
  }
}

interface PowerShellResult {
  DesignedCapacity?: number
  FullChargedCapacity?: number
  CycleCount?: number
  Temperature?: number
  Voltage?: number
  ManufactureDate?: string
}

function getBatteryFullChargedCapacity(): { designed: number | null; fullCharged: number | null } {
  try {
    const result = runPowerShell(
      'Get-WmiObject -Namespace root\\wmi -Class BatteryFullChargedCapacity | Select-Object DesignedCapacity,FullChargedCapacity | ConvertTo-Json'
    )
    if (result) {
      const parsed = JSON.parse(result)
      return {
        designed: parsed.DesignedCapacity ?? null,
        fullCharged: parsed.FullChargedCapacity ?? null
      }
    }
  } catch {
    // fallback
  }
  return { designed: null, fullCharged: null }
}

function getBatteryStaticData(): { cycleCount: number | null; temperature: number | null; voltage: number | null } {
  try {
    const result = runPowerShell(
      'Get-WmiObject -Namespace root\\wmi -Class BatteryStaticData | Select-Object CycleCount,Temperature,Voltage | ConvertTo-Json'
    )
    if (result) {
      const parsed = JSON.parse(result)
      return {
        cycleCount: parsed.CycleCount ?? null,
        temperature: parsed.Temperature != null ? Math.round((parsed.Temperature - 273.15) * 100) / 100 : null,
        voltage: parsed.Voltage != null ? Math.round(parsed.Voltage / 1000 * 100) / 100 : null
      }
    }
  } catch {
    // fallback
  }
  return { cycleCount: null, temperature: null, voltage: null }
}

export async function getBatteryInfo(): Promise<BatteryInfo> {
  const battery = await si.battery()

  const { designed, fullCharged } = getBatteryFullChargedCapacity()
  const staticData = getBatteryStaticData()

  const designCapacity = designed ?? (battery.designedCapacity ?? null)
  const maxCapacity = fullCharged ?? (battery.maxCapacity ?? null)
  const currentCapacity = battery.currentCapacity ?? null
  const cycleCount = staticData.cycleCount ?? (battery.cycleCount ?? null)

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

  return {
    hasBattery: battery.hasBattery,
    isCharging: battery.isCharging ?? battery.acConnected ?? false,
    designCapacity,
    currentCapacity,
    maxCapacity,
    wearLevel,
    cycleCount,
    voltage: staticData.voltage ?? (battery.voltage ?? null),
    temperature: staticData.temperature ?? null,
    health
  }
}
