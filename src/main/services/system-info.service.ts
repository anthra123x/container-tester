import si from 'systeminformation'
import { runPowerShellWithRetry } from './powershell'
import type { SystemInfo, CPUInfo, RAMInfo, GPUInfo, MotherboardInfo, RAMSlot } from '../../shared/types/hardware.types'

const SI_TIMEOUT = 8000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

export async function getOSActivation(): Promise<boolean> {
  const result = await runPowerShellWithRetry<string>(
    '$status = Get-CimInstance -ClassName SoftwareLicensingProduct | Where-Object { $_.PartialProductKey -ne $null }; if ($status) { Write-Output "Activated" } else { Write-Output "NotActivated" }',
    (r) => r, 1, 5000
  )
  return result === 'Activated'
}

async function getOSWindowsEdition(): Promise<string | null> {
  return runPowerShellWithRetry<string>(
    '$os = Get-CimInstance Win32_OperatingSystem; Write-Output "$($os.Caption) $($os.BuildNumber)"',
    (r) => r, 1, 5000
  )
}

async function isSecureBootEnabled(): Promise<boolean | null> {
  try {
    const result = await runPowerShellWithRetry<string>(
      'Confirm-SecureBootUEFI -ErrorAction SilentlyContinue; if ($?) { $r = $LASTEXITCODE; Write-Output $r } else { Write-Output "null" }',
      (r) => r, 1, 5000
    )
    if (result === '0') return false
    if (result === '1') return true
    return null
  } catch { return null }
}

async function getTPMInfo(): Promise<{ present: boolean; version: string | null; enabled: boolean | null } | null> {
  return runPowerShellWithRetry<{ present: boolean; version: string | null; enabled: boolean | null }>(
    `$tpm = Get-CimInstance -Namespace root/cimv2/Security/MicrosoftTpm -ClassName Win32_Tpm -ErrorAction SilentlyContinue
     if (-not $tpm) { return "{""present"": false}" }
     $enabled = try { if ($tpm.IsEnabled_InitialValue -and $tpm.IsEnabled_InitialValue[0] -eq 1) { $true } else { $false } } catch { $null }
     $ver = try { ($tpm.SpecVersion -split ',')[0] } catch { $null }
     return "{""present"": true, ""version"": ""$ver"", ""enabled"": $enabled }"`,
    JSON.parse, 1, 5000
  )
}

async function getVirtualizationInfo(): Promise<{ supported: boolean | null; enabled: boolean | null; hypervisorPresent: boolean | null }> {
  try {
    const cpu = await si.cpu()
    const hasVirt = cpu.virtualization || (cpu.flags?.some(f => ['vmx', 'svm'].includes(f.toLowerCase())) ?? false)
    const [hvResult, enabledResult] = await Promise.allSettled([
      runPowerShellWithRetry<string>(
        'Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue | Select-Object -ExpandProperty HypervisorPresent',
        (r) => r, 1, 5000
      ),
      runPowerShellWithRetry<string>(
        '(Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1).VirtualizationFirmwareEnabled',
        (r) => r, 1, 5000
      )
    ])
    const hv = hvResult.status === 'fulfilled' ? hvResult.value : null
    const en = enabledResult.status === 'fulfilled' ? enabledResult.value : null
    return {
      supported: hasVirt,
      enabled: en === 'True' ? true : en === 'False' ? false : null,
      hypervisorPresent: hv === 'True' ? true : hv === 'False' ? false : null
    }
  } catch {
    return { supported: null, enabled: null, hypervisorPresent: null }
  }
}

async function getPowerPlan(): Promise<string | null> {
  return runPowerShellWithRetry<string>(
    'powercfg /getactivescheme | Select-String -Pattern "\\{[a-f0-9-]+\\}" | ForEach-Object { $_.Matches[0].Value }',
    (r) => {
      const match = r.match(/\{([a-f0-9-]+)\}/i)
      if (!match) return r
      const planMap: Record<string, string> = {
        '381b4222-f694-41f0-9685-ff5bb260df2f': 'Balanced (Recommended)',
        '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c': 'High Performance',
        'a1841308-3541-4fab-bc81-f71556f20b4a': 'Power Saver',
      }
      return planMap[match[1].toLowerCase()] ?? r
    }, 1, 5000
  )
}

async function getUptime(): Promise<{ seconds: number; days: number; hours: number; minutes: number }> {
  const time = await si.time()
  const uptimeSec = time.uptime ?? 0
  return {
    seconds: uptimeSec,
    days: Math.floor(uptimeSec / 86400),
    hours: Math.floor((uptimeSec % 86400) / 3600),
    minutes: Math.floor((uptimeSec % 3600) / 60),
  }
}

export async function getSystemInfo(): Promise<SystemInfo> {
  const [system, os, motherboard, activated, edition, secureBoot, tpm, virt, powerPlan, uptime] = await Promise.allSettled([
    withTimeout(si.system(), SI_TIMEOUT, 'system'),
    withTimeout(si.osInfo(), SI_TIMEOUT, 'osInfo'),
    getMotherboardInfo(),
    getOSActivation(),
    getOSWindowsEdition(),
    isSecureBootEnabled(),
    getTPMInfo(),
    getVirtualizationInfo(),
    getPowerPlan(),
    getUptime()
  ])

  const systemVal = system.status === 'fulfilled' ? system.value : { manufacturer: '', model: '', serial: '', version: '' }
  const osVal = os.status === 'fulfilled' ? os.value : { hostname: '', platform: '', distro: '', release: '', kernel: '', arch: '' }
  const mbVal = motherboard.status === 'fulfilled' ? motherboard.value : { manufacturer: '', model: '', version: '', serial: '', biosVersion: '', biosDate: '' }

  return {
    hostname: osVal.hostname || '',
    model: systemVal.model || '',
    serial: systemVal.serial || '',
    manufacturer: systemVal.manufacturer || '',
    os: {
      platform: osVal.platform || '',
      distro: osVal.distro || '',
      release: osVal.release || '',
      kernel: osVal.kernel || '',
      arch: osVal.arch || '',
      hostname: osVal.hostname || '',
      activated: activated.status === 'fulfilled' ? activated.value : false
    },
    motherboard: mbVal,
    extraSystem: {
      edition: edition.status === 'fulfilled' ? edition.value : null,
      secureBoot: secureBoot.status === 'fulfilled' ? secureBoot.value : null,
      tpm: tpm.status === 'fulfilled' ? tpm.value : null,
      virtualization: virt.status === 'fulfilled' ? virt.value : null,
      powerPlan: powerPlan.status === 'fulfilled' ? powerPlan.value : null,
      uptime: uptime.status === 'fulfilled' ? uptime.value : { seconds: 0, days: 0, hours: 0, minutes: 0 }
    }
  }
}

export async function getMotherboardInfo(): Promise<MotherboardInfo> {
  const [system, bios] = await Promise.allSettled([
    si.system(),
    si.bios()
  ])

  const sys = system.status === 'fulfilled' ? system.value : { manufacturer: '', model: '', version: '', serial: '' }
  const bio = bios.status === 'fulfilled' ? bios.value : { version: '', releaseDate: '' }

  return {
    manufacturer: sys.manufacturer || '',
    model: sys.model || '',
    version: sys.version || '',
    serial: sys.serial || '',
    biosVersion: bio.version || '',
    biosDate: bio.releaseDate || ''
  }
}

export async function getCPUInfo(): Promise<CPUInfo> {
  const [cpu, currentLoad] = await Promise.allSettled([
    withTimeout(si.cpu(), SI_TIMEOUT, 'cpu'),
    withTimeout(si.currentLoad(), SI_TIMEOUT, 'currentLoad')
  ])

  const cpuVal = cpu.status === 'fulfilled' ? cpu.value : {} as any
  const clVal = currentLoad.status === 'fulfilled' ? currentLoad.value : {} as any

  let temp: number | null = null
  let coreTemps: number[] = []
  try {
    const temps = await si.cpuTemperature()
    temp = temps.main ?? null
    coreTemps = temps.cores ?? []
  } catch { }

  const perCoreLoad = clVal.cpus?.map((c: any) => Math.round(c.load * 100) / 100) ?? []
  const cache = cpuVal.cache ?? null

  return {
    manufacturer: cpuVal.manufacturer || '',
    brand: cpuVal.brand || '',
    cores: cpuVal.cores || 0,
    physicalCores: cpuVal.physicalCores || 0,
    speed: cpuVal.speed || 0,
    speedMax: cpuVal.speedMax || 0,
    speedMin: cpuVal.speedMin || 0,
    usage: Math.round((clVal.currentLoad || 0) * 100) / 100,
    temperature: temp,
    voltage: cpuVal.voltage != null ? parseFloat(String(cpuVal.voltage)) : null,
    coreTemps,
    perCoreLoad,
    cacheL1d: cache?.l1d ?? null,
    cacheL1i: cache?.l1i ?? null,
    cacheL2: cache?.l2 ?? null,
    cacheL3: cache?.l3 ?? null,
    contextSwitches: clVal.ctxSwitches ?? null,
    interrupts: clVal.interrupts ?? null,
    processCount: clVal.processes ?? null,
  }
}

export async function getRAMInfo(): Promise<RAMInfo> {
  const [mem, memLayout] = await Promise.allSettled([
    withTimeout(si.mem(), SI_TIMEOUT, 'mem'),
    withTimeout(si.memLayout(), SI_TIMEOUT, 'memLayout')
  ])

  const memVal = mem.status === 'fulfilled' ? mem.value : { total: 0, used: 0, free: 0, swaptotal: null, swapused: null }
  const memLayoutVal = memLayout.status === 'fulfilled' ? memLayout.value : []

  const slots: RAMSlot[] = memLayoutVal.map((slot: any) => ({
    bank: slot.bank ?? 'Unknown',
    type: slot.type ?? 'Unknown',
    size: slot.size || 0,
    speed: slot.clockSpeed ?? 0,
    manufacturer: slot.manufacturer ?? 'Unknown',
    partNum: slot.partNum ?? '',
    serialNum: slot.serialNum ?? '',
    formFactor: slot.formFactor ?? null,
    timings: slot.CAS ?? null,
  }))

  return {
    total: memVal.total || 0,
    used: memVal.used || 0,
    free: memVal.free || 0,
    usagePercent: memVal.total > 0 ? Math.round((memVal.used / memVal.total) * 100 * 100) / 100 : 0,
    slots,
    swapTotal: memVal.swaptotal ?? null,
    swapUsed: memVal.swapused ?? null,
  }
}

export async function getGPUInfo(): Promise<GPUInfo> {
  const graphics = await withTimeout(si.graphics(), SI_TIMEOUT, 'graphics').catch(() => ({ controllers: [] }))

  if (!graphics.controllers?.length) {
    return { model: 'No detectada', vendor: 'N/A', vram: 0, driverVersion: 'N/A', temperature: null, usage: 0 }
  }

  const primary = graphics.controllers[0]

  return {
    model: primary.model || 'No detectada',
    vendor: primary.vendor || 'N/A',
    vram: primary.vram ?? 0,
    driverVersion: primary.driverVersion || 'N/A',
    temperature: primary.temperatureGpu ?? null,
    usage: primary.utilizationGpu ?? 0,
    coreClock: primary.clockCore ?? null,
    memoryClock: primary.clockMemory ?? null,
    powerDraw: primary.powerDraw ?? null,
    fanSpeed: primary.fanSpeed ?? null,
    driverDate: primary.driverDate ?? null,
  }
}
