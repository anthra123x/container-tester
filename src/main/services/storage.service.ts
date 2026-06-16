import si from 'systeminformation'
import { execSync } from 'child_process'

export interface StorageInfo {
  device: string
  type: string
  interfaceType: string
  sizeGB: number
  usedGB: number
  availableGB: number
  usagePercent: number
  smartStatus: string
  temperature: number | null
  hoursUsed: number | null
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

function convertBytes(bytes: number): number {
  return Math.round((bytes / (1024 * 1024 * 1024)) * 100) / 100
}

function getSMARTInfo(deviceIndex: number): { smartStatus: string; temperature: number | null; hoursUsed: number | null; health: number | null } {
  try {
    const info = runPowerShell(`Get-PhysicalDisk -DeviceNumber ${deviceIndex} | Select-Object HealthStatus,MediaUsage,Temperature | ConvertTo-Json`)
    if (info) {
      const parsed = JSON.parse(info)
      const healthMap: Record<string, number> = {
        'Healthy': 100,
        'Warning': 70,
        'Unhealthy': 30,
        'Unknown': null as unknown as number
      }
      const usageMap: Record<string, number> = {
        '0': 0,
        '1': 1,
        '3': 2,
        '4': 3,
        '5': 4
      }
      const typeMap: Record<string, string> = {
        '0': 'HDD',
        '1': 'SSD',
        '4': 'NVMe',
        '3': 'SSD'
      }
      return {
        smartStatus: parsed.HealthStatus || 'Unknown',
        temperature: parsed.Temperature !== undefined ? parsed.Temperature : null,
        hoursUsed: parsed.MediaUsage !== undefined ? usageMap[String(parsed.MediaUsage)] ?? null : null,
        health: healthMap[parsed.HealthStatus] ?? null
      }
    }
    const wmi = runPowerShell(`Get-WmiObject Win32_DiskDrive | Select-Object -Index ${deviceIndex} | Select-Object Status,Model | ConvertTo-Json`)
    if (wmi) {
      const parsed = JSON.parse(wmi)
      return {
        smartStatus: parsed.Status || 'Unknown',
        temperature: null,
        hoursUsed: null,
        health: parsed.Status === 'OK' ? 100 : 50
      }
    }
  } catch {
    // fallback
  }
  return { smartStatus: 'Unknown', temperature: null, hoursUsed: null, health: null }
}

export async function getStorageInfo(): Promise<StorageInfo[]> {
  const [diskLayout, fsSize, disksIO] = await Promise.all([
    si.diskLayout(),
    si.fsSize(),
    si.disksIO().catch(() => null)
  ])

  const filesystemMap = new Map<string, { used: number; available: number }>()
  for (const fs of fsSize) {
    const key = fs.fs.toLowerCase()
    if (!filesystemMap.has(key) || (filesystemMap.get(key)?.used ?? 0) < fs.used) {
      filesystemMap.set(key, { used: fs.used, available: fs.size - fs.used })
    }
  }

  const results: StorageInfo[] = []
  for (let index = 0; index < diskLayout.length; index++) {
    const disk = diskLayout[index]
    const deviceName = disk.name || `PhysicalDrive${index}`
    const smart = getSMARTInfo(index)

    let matchedFs = { used: 0, available: 0 }
    const diskIdentifier = disk.device?.toLowerCase() || ''
    for (const [fsPath, fs] of filesystemMap) {
      if (diskIdentifier && fsPath.includes(diskIdentifier)) {
        matchedFs = fs
        break
      }
      if (index === 0 && fsPath.includes('c:')) {
        matchedFs = fs
      }
    }

    let type = 'HDD'
    const interfaceType = disk.interfaceType || 'Unknown'
    if (interfaceType.toUpperCase().includes('NVMe') || (disk.name || '').toLowerCase().includes('nvme')) {
      type = 'NVMe'
    } else if (disk.type === 'SSD' || interfaceType.toUpperCase().includes('SATA') || (disk.name || '').toLowerCase().includes('ssd')) {
      type = 'SSD'
    } else if (disk.type) {
      type = disk.type
    }

    results.push({
      device: deviceName,
      type,
      interfaceType,
      sizeGB: convertBytes(disk.size || 0),
      usedGB: convertBytes(matchedFs.used),
      availableGB: convertBytes(matchedFs.available),
      usagePercent: matchedFs.used + matchedFs.available > 0
        ? Math.round((matchedFs.used / (matchedFs.used + matchedFs.available)) * 10000) / 100
        : 0,
      smartStatus: smart.smartStatus,
      temperature: smart.temperature,
      hoursUsed: smart.hoursUsed,
      health: smart.health
    })
  }

  return results
}
