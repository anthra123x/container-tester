import si from 'systeminformation'
import { runPowerShell } from './powershell'
import { cached } from './service-cache'

const SI_TIMEOUT = 8000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

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

async function getSingleDiskInfo(index: number): Promise<{
  smartStatus: string; temperature: number | null; health: number | null
  powerOnHours: number | null; reallocatedSectors: number | null
  pendingSectors: number | null; crcErrors: number | null
  wearLevel: number | null; readsGB: number | null; writesGB: number | null
  nvmeLanes: string | null
}> {
  const script = `
$idx = ${index}
$result = @{}
$result.smartStatus = "Unknown"
$result.health = $null
$result.temperature = $null
$result.powerOnHours = $null
$result.reallocatedSectors = $null
$result.pendingSectors = $null
$result.crcErrors = $null
$result.wearLevel = $null
$result.readsGB = $null
$result.writesGB = $null
$result.nvmeLanes = $null

$disk = Get-PhysicalDisk -DeviceNumber $idx -ErrorAction SilentlyContinue
if ($disk) {
  $result.smartStatus = if ($disk.HealthStatus) { "$($disk.HealthStatus)" } else { "Unknown" }
  $result.temperature = if ($disk.Temperature -ne $null) { [int]$disk.Temperature } else { $null }

  $healthMap = @{ "Healthy" = 100; "Warning" = 70; "Unhealthy" = 30 }
  $result.health = if ($healthMap.ContainsKey($result.smartStatus)) { $healthMap[$result.smartStatus] } else { $null }

  $reliability = $disk | Get-PhysicalDisk | Get-StorageReliabilityCounter -ErrorAction SilentlyContinue
  if ($reliability) {
    $result.powerOnHours = try { [int]$reliability.PowerOnHours } catch { $null }
    $result.reallocatedSectors = try { [long]$reliability.ReadErrorsUncorrected } catch { $null }
    $result.pendingSectors = try { [long]$reliability.StaleReadRetries } catch { $null }
    $result.wearLevel = try { [int]$reliability.Wear } catch { $null }
    if ($reliability.NVMeMaxLanes -or $reliability.NVMeMaxSpeed) {
      $result.nvmeLanes = "$($reliability.NVMeMaxSpeed) GT/s x$($reliability.NVMeMaxLanes)"
    }
  }
}

$wmi = Get-CimInstance Win32_DiskDrive -Filter "Index = $idx" -ErrorAction SilentlyContinue
if ($wmi) {
  $result.readsGB = try { [math]::Round($wmi.TotalSectors * $wmi.BytesPerSector / 1GB, 2) } catch { $null }
  if (-not $disk) {
    $result.smartStatus = "$($wmi.Status)"
    $result.health = if ($wmi.Status -eq "OK") { 100 } else { 50 }
  }
}

$result | ConvertTo-Json -Compress
`
  try {
    const raw = await runPowerShell(script, 8000)
    if (!raw || raw === 'null') return defaultDiskInfo()
    return { ...defaultDiskInfo(), ...JSON.parse(raw) }
  } catch {
    return defaultDiskInfo()
  }
}

function defaultDiskInfo() {
  return {
    smartStatus: 'Unknown', temperature: null, health: null,
    powerOnHours: null, reallocatedSectors: null, pendingSectors: null,
    crcErrors: null, wearLevel: null, readsGB: null, writesGB: null,
    nvmeLanes: null,
  }
}

async function fetchStorageInfo(): Promise<StorageInfo[]> {
  const [diskLayout, fsSize] = await Promise.allSettled([
    withTimeout(si.diskLayout(), SI_TIMEOUT, 'diskLayout'),
    withTimeout(si.fsSize(), SI_TIMEOUT, 'fsSize')
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

  const diskPromises = diskLayoutVal.map(async (disk: any, index: number) => {
    const info = await getSingleDiskInfo(index)

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

    return {
      device: disk.name || `PhysicalDrive${index}`,
      type,
      interfaceType,
      sizeGB: convertBytes(disk.size || 0),
      usedGB: convertBytes(matchedFs.used),
      availableGB: convertBytes(matchedFs.available),
      usagePercent: matchedFs.used + matchedFs.available > 0
        ? Math.round((matchedFs.used / (matchedFs.used + matchedFs.available)) * 10000) / 100
        : 0,
      smartStatus: info.smartStatus,
      temperature: info.temperature ?? (disk.temperature ?? null),
      hoursUsed: info.powerOnHours ?? null,
      health: info.health ?? null,
      reallocatedSectors: info.reallocatedSectors ?? null,
      pendingSectors: info.pendingSectors ?? null,
      crcErrors: info.crcErrors ?? null,
      ssdWear: info.wearLevel ?? null,
      totalWritesGB: info.writesGB ?? null,
      totalReadsGB: info.readsGB ?? null,
      partitionCount: null,
      isBootDrive: index === 0,
      nvmePcieLanes: info.nvmeLanes ?? null,
      formFactor: disk.formFactor || null,
      serialNumber: disk.serialNum || null,
      firmware: disk.firmwareRevision || null,
    }
  })

  const settled = await Promise.allSettled(diskPromises)
  return settled
    .filter(r => r.status === 'fulfilled')
    .map(r => (r as PromiseFulfilledResult<StorageInfo>).value)
}

export async function getStorageInfo(): Promise<StorageInfo[]> {
  return cached('storage:info', 30000, fetchStorageInfo)
}
