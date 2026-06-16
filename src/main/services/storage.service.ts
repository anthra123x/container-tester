import si from 'systeminformation'
import { runPowerShellWithRetry, runPowerShellJson } from './powershell'

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
  reallocatedSectors: number | null
  pendingSectors: number | null
  crcErrors: number | null
  ssdWear: number | null
  totalWritesGB: number | null
  totalReadsGB: number | null
  partitionCount: number | null
  isBootDrive: boolean
  nvmePcieLanes: string | null
  formFactor: string | null
  serialNumber: string | null
  firmware: string | null
}

function convertBytes(bytes: number): number {
  return Math.round((bytes / (1024 * 1024 * 1024)) * 100) / 100
}

interface PSPhysicalDisk {
  DeviceID?: string
  FriendlyName?: string
  MediaType?: string
  BusType?: string
  HealthStatus?: string
  PhysicalLocation?: string
  Manufacturer?: string
  SerialNumber?: string
  FirmwareVersion?: string
  Size?: number
  OperationalStatus?: string | string[]
}

interface PSSMARTData {
  ReallocatedSectorCount?: number
  PendingSectorCount?: number
  CRCCount?: number
  WearLevel?: number
  PowerOnHours?: number
  MediaWear?: number
  Temperature?: number
  ReadGB?: number
  WriteGB?: number
}

interface PSDriveIO {
  reads?: number
  writes?: number
}

async function getDiskSMARTDetailed(deviceIndex: number): Promise<PSSMARTData | null> {
  const script = `
    $disk = Get-PhysicalDisk -DeviceNumber ${deviceIndex} -ErrorAction SilentlyContinue
    if (-not $disk) { return "null" }
    $result = [PSCustomObject]@{
      ReallocatedSectorCount = try {
        ($disk | Get-PhysicalDisk | Get-StorageReliabilityCounter | Select-Object -ExpandProperty ReadErrorsUncorrected -ErrorAction SilentlyContinue)
      } catch { $null }
      PendingSectorCount = try {
        ($disk | Get-PhysicalDisk | Get-StorageReliabilityCounter | Select-Object -ExpandProperty StaleReadRetries -ErrorAction SilentlyContinue)
      } catch { $null }
      PowerOnHours = try {
        ($disk | Get-PhysicalDisk | Get-StorageReliabilityCounter | Select-Object -ExpandProperty PowerOnHours -ErrorAction SilentlyContinue)
      } catch { $null }
      Temperature = try {
        ($disk | Select-Object -ExpandProperty Temperature -ErrorAction SilentlyContinue)
      } catch { $null }
      WearLevel = try {
        ($disk | Get-PhysicalDisk | Get-StorageReliabilityCounter | Select-Object -ExpandProperty Wear -ErrorAction SilentlyContinue)
      } catch { $null }
    }
    $result | ConvertTo-Json -Compress
  `
  return runPowerShellWithRetry<PSSMARTData>(script, JSON.parse)
}

async function getDiskIOStats(deviceIndex: number): Promise<{ readsGB: number | null; writesGB: number | null }> {
  const script = `
    $drive = Get-CimInstance Win32_DiskDrive -Filter "Index = ${deviceIndex}" -ErrorAction SilentlyContinue
    if (-not $drive) { return "null" }
    $reads = [math]::Round($drive.TotalSectors * $drive.BytesPerSector / 1GB, 2)
    $writes = try {
      $perf = Get-CimInstance Win32_PerfRawData_PerfDisk_PhysicalDisk -Filter "Name LIKE '${deviceIndex}:%'" -ErrorAction SilentlyContinue
      if ($perf) { [math]::Round($perf.DiskWriteBytesPerSec / 1GB, 2) } else { $null }
    } catch { $null }
    return "{ ""ReadGB"": $reads, ""WriteGB"": $writes }"
  `
  const result = await runPowerShellWithRetry<{ readsGB: number | null; writesGB: number | null }>(
    script,
    JSON.parse
  )
  return result ?? { readsGB: null, writesGB: null }
}

async function getDiskSMARTFallback(deviceIndex: number): Promise<{
  smartStatus: string; temperature: number | null; health: number | null
}> {
  const info = await runPowerShellWithRetry<string>(
    `Get-PhysicalDisk -DeviceNumber ${deviceIndex} | Select-Object HealthStatus,Temperature | ConvertTo-Json -Compress`,
    (r) => r
  )
  if (info) {
    try {
      const parsed = JSON.parse(info)
      const healthMap: Record<string, number> = { Healthy: 100, Warning: 70, Unhealthy: 30 }
      return {
        smartStatus: parsed.HealthStatus || 'Unknown',
        temperature: parsed.Temperature ?? null,
        health: healthMap[parsed.HealthStatus] ?? null
      }
    } catch { }
  }
  const wmi = await runPowerShellWithRetry<string>(
    `Get-WmiObject Win32_DiskDrive | Select-Object -Index ${deviceIndex} | Select-Object Status,Model | ConvertTo-Json -Compress`,
    (r) => r
  )
  if (wmi) {
    try {
      const parsed = JSON.parse(wmi)
      return {
        smartStatus: parsed.Status || 'Unknown',
        temperature: null,
        health: parsed.Status === 'OK' ? 100 : 50
      }
    } catch { }
  }
  return { smartStatus: 'Unknown', temperature: null, health: null }
}

export async function getStorageInfo(): Promise<StorageInfo[]> {
  const [diskLayout, fsSize] = await Promise.allSettled([
    si.diskLayout(),
    si.fsSize()
  ])

  const diskLayoutVal = diskLayout.status === 'fulfilled' ? diskLayout.value : []
  const fsSizeVal = fsSize.status === 'fulfilled' ? fsSize.value : []

  const filesystemMap = new Map<string, { used: number; available: number }>()
  for (const fs of fsSizeVal) {
    const key = (fs.fs ?? '').toLowerCase()
    if (!filesystemMap.has(key) || (filesystemMap.get(key)?.used ?? 0) < fs.used) {
      filesystemMap.set(key, { used: fs.used, available: fs.size - fs.used })
    }
  }

  const results: StorageInfo[] = []
  for (let index = 0; index < diskLayoutVal.length; index++) {
    const disk = diskLayoutVal[index]
    const smartDetail = await getDiskSMARTDetailed(index)
    const ioStats = await getDiskIOStats(index)
    const fallback = await getDiskSMARTFallback(index)

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

    const isBootDrive = index === 0 || (disk.device?.toLowerCase() || '').includes('c:')

    let nvmePcieLanes: string | null = null
    if (type === 'NVMe') {
      try {
        const nvme = await runPowerShellWithRetry<string>(
          `Get-PhysicalDisk -DeviceNumber ${index} | Get-StorageReliabilityCounter | Select-Object * | ConvertTo-Json -Compress`,
          (r) => r
        )
        if (nvme) {
          const parsed = JSON.parse(nvme)
          if (parsed && (parsed.NVMeMaxLanes || parsed.NVMeMaxSpeed)) {
            nvmePcieLanes = `${parsed.NVMeMaxSpeed || '?'} GT/s x${parsed.NVMeMaxLanes || '?'}`
          }
        }
      } catch { }
    }

    results.push({
      device: disk.name || `PhysicalDrive${index}`,
      type,
      interfaceType,
      sizeGB: convertBytes(disk.size || 0),
      usedGB: convertBytes(matchedFs.used),
      availableGB: convertBytes(matchedFs.available),
      usagePercent: matchedFs.used + matchedFs.available > 0
        ? Math.round((matchedFs.used / (matchedFs.used + matchedFs.available)) * 10000) / 100
        : 0,
      smartStatus: fallback.smartStatus,
      temperature: smartDetail?.Temperature ?? fallback.temperature ?? (disk.temperature ?? null),
      hoursUsed: smartDetail?.PowerOnHours ?? null,
      health: fallback.health,
      reallocatedSectors: smartDetail?.ReallocatedSectorCount ?? null,
      pendingSectors: smartDetail?.PendingSectorCount ?? null,
      crcErrors: smartDetail?.CRCCount ?? null,
      ssdWear: smartDetail?.WearLevel ?? null,
      totalWritesGB: ioStats?.writesGB ?? null,
      totalReadsGB: ioStats?.readsGB ?? null,
      partitionCount: null,
      isBootDrive,
      nvmePcieLanes,
      formFactor: disk.formFactor || null,
      serialNumber: disk.serialNum || null,
      firmware: disk.firmwareRevision || null,
    })
  }

  return results
}
