import si from 'systeminformation'
import { runPowerShellWithRetry } from './powershell'
import type { SystemInfo, CPUInfo, RAMInfo, GPUInfo, MotherboardInfo, RAMSlot } from '../../shared/types/hardware.types'

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

const SI_TIMEOUT = 15000

export async function getOSActivation(): Promise<boolean> {
  const result = await runPowerShellWithRetry<string>(
    '$status = Get-CimInstance -ClassName SoftwareLicensingProduct | Where-Object { $_.PartialProductKey -ne $null }; if ($status) { Write-Output "Activated" } else { Write-Output "NotActivated" }',
    (r) => r
  )
  return result === 'Activated'
}

async function getOSWindowsEdition(): Promise<string | null> {
  return runPowerShellWithRetry<string>(
    '$os = Get-CimInstance Win32_OperatingSystem; Write-Output "$($os.Caption) $($os.BuildNumber)"',
    (r) => r
  )
}

async function isSecureBootEnabled(): Promise<boolean | null> {
  try {
    const result = await runPowerShellWithRetry<string>(
      'Confirm-SecureBootUEFI -ErrorAction SilentlyContinue; if ($?) { $r = $LASTEXITCODE; Write-Output $r } else { Write-Output "null" }',
      (r) => r
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
    JSON.parse
  )
}

async function getVirtualizationInfo(): Promise<{ supported: boolean | null; enabled: boolean | null; hypervisorPresent: boolean | null }> {
  try {
    const cpu = await si.cpu()
    const hasVirt = cpu.virtualization || (cpu.flags?.some(f => ['vmx', 'svm'].includes(f.toLowerCase())) ?? false)
    const [hvResult, enabledResult] = await Promise.all([
      runPowerShellWithRetry<string>(
        'Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue | Select-Object -ExpandProperty HypervisorPresent',
        (r) => r
      ),
      runPowerShellWithRetry<string>(
        '(Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1).VirtualizationFirmwareEnabled',
        (r) => r
      )
    ])
    return {
      supported: hasVirt,
      enabled: enabledResult === 'True' ? true : enabledResult === 'False' ? false : null,
      hypervisorPresent: hvResult === 'True' ? true : hvResult === 'False' ? false : null
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
    }
  )
}

async function getUptime(): Promise<{ seconds: number; days: number; hours: number; minutes: number }> {
  const time = await withTimeout(si.time(), SI_TIMEOUT, 'time')
  const uptimeSec = time.uptime ?? 0
  return {
    seconds: uptimeSec,
    days: Math.floor(uptimeSec / 86400),
    hours: Math.floor((uptimeSec % 86400) / 3600),
    minutes: Math.floor((uptimeSec % 3600) / 60),
  }
}

export async function getSystemInfo(): Promise<SystemInfo> {
  const [system, os, activated, edition, secureBoot, tpm, virt, powerPlan, uptime] = await Promise.all([
    withTimeout(si.system(), SI_TIMEOUT, 'system'),
    withTimeout(si.osInfo(), SI_TIMEOUT, 'osInfo'),
    getOSActivation(),
    getOSWindowsEdition(),
    isSecureBootEnabled(),
    getTPMInfo(),
    getVirtualizationInfo(),
    getPowerPlan(),
    getUptime()
  ])

  const motherboard = await getMotherboardInfo()

  return {
    hostname: os.hostname,
    model: system.model,
    serial: system.serial,
    manufacturer: system.manufacturer,
    os: {
      platform: os.platform,
      distro: os.distro,
      release: os.release,
      kernel: os.kernel,
      arch: os.arch,
      hostname: os.hostname,
      activated
    },
    motherboard,
    extraSystem: {
      edition,
      secureBoot,
      tpm,
      virtualization: virt,
      powerPlan,
      uptime
    }
  }
}

export async function getMotherboardInfo(): Promise<MotherboardInfo> {
  const [system, bios] = await Promise.all([
    withTimeout(si.system(), SI_TIMEOUT, 'system'),
    withTimeout(si.bios(), SI_TIMEOUT, 'bios')
  ])

  return {
    manufacturer: system.manufacturer,
    model: system.model,
    version: system.version,
    serial: system.serial,
    biosVersion: bios.version,
    biosDate: bios.releaseDate
  }
}

export async function getCPUInfo(): Promise<CPUInfo> {
  const [cpu, currentLoad] = await Promise.all([
    withTimeout(si.cpu(), SI_TIMEOUT, 'cpu'),
    withTimeout(si.currentLoad(), SI_TIMEOUT, 'currentLoad')
  ])

  let temp: number | null = null
  let coreTemps: number[] = []
  try {
    const temps = await withTimeout(si.cpuTemperature(), SI_TIMEOUT, 'cpuTemperature')
    temp = temps.main ?? null
    coreTemps = temps.cores ?? []
  } catch { }

  const perCoreLoad = currentLoad.cpus?.map(c => Math.round(c.load * 100) / 100) ?? []
  const cache = cpu.cache ?? null

  return {
    manufacturer: cpu.manufacturer,
    brand: cpu.brand,
    cores: cpu.cores,
    physicalCores: cpu.physicalCores,
    speed: cpu.speed,
    speedMax: cpu.speedMax,
    speedMin: cpu.speedMin,
    usage: Math.round(currentLoad.currentLoad * 100) / 100,
    temperature: temp,
    voltage: cpu.voltage ? parseFloat(cpu.voltage) : null,
    coreTemps,
    perCoreLoad,
    cacheL1d: cache?.l1d ?? null,
    cacheL1i: cache?.l1i ?? null,
    cacheL2: cache?.l2 ?? null,
    cacheL3: cache?.l3 ?? null,
    contextSwitches: currentLoad.ctxSwitches ?? null,
    interrupts: currentLoad.interrupts ?? null,
    processCount: currentLoad.processes ?? null,
  }
}

export async function getRAMInfo(): Promise<RAMInfo> {
  const [mem, memLayout] = await Promise.all([
    withTimeout(si.mem(), SI_TIMEOUT, 'mem'),
    withTimeout(si.memLayout(), SI_TIMEOUT, 'memLayout')
  ])

  const slots: RAMSlot[] = memLayout.map((slot) => ({
    bank: slot.bank ?? 'Unknown',
    type: slot.type ?? 'Unknown',
    size: slot.size,
    speed: slot.clockSpeed ?? 0,
    manufacturer: slot.manufacturer ?? 'Unknown',
    partNum: slot.partNum ?? '',
    serialNum: slot.serialNum ?? '',
    formFactor: slot.formFactor ?? null,
    timings: slot.CAS ?? null,
  }))

  return {
    total: mem.total,
    used: mem.used,
    free: mem.free,
    usagePercent: Math.round((mem.used / mem.total) * 100 * 100) / 100,
    slots,
    swapTotal: mem.swaptotal ?? null,
    swapUsed: mem.swapused ?? null,
  }
}

export async function getGPUInfo(): Promise<GPUInfo> {
  const graphics = await withTimeout(si.graphics(), SI_TIMEOUT, 'graphics')

  if (graphics.controllers.length === 0) {
    return { model: 'No detectada', vendor: 'N/A', vram: 0, driverVersion: 'N/A', temperature: null, usage: 0 }
  }

  const primary = graphics.controllers[0]

  return {
    model: primary.model,
    vendor: primary.vendor,
    vram: primary.vram ?? 0,
    driverVersion: primary.driverVersion ?? 'N/A',
    temperature: primary.temperatureGpu ?? null,
    usage: primary.utilizationGpu ?? 0,
    coreClock: primary.clockCore ?? null,
    memoryClock: primary.clockMemory ?? null,
    powerDraw: primary.powerDraw ?? null,
    fanSpeed: primary.fanSpeed ?? null,
    driverDate: primary.driverDate ?? null,
  }
}
