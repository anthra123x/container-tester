import { createHash } from 'crypto'
import { writeFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { BrowserWindow } from 'electron'
import { runPowerShell, runPowerShellWithRetry } from './powershell'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import type { WindowsActivationStatus, OfficeActivationStatus, ActivationStatus } from '../../shared/types/activation.types'

const MAS_URLS = [
  'https://raw.githubusercontent.com/massgravel/Microsoft-Activation-Scripts/694976cd35c9601ce280d7b8fc920f257c97b627/MAS/All-In-One-Version-KL/MAS_AIO.cmd',
  'https://dev.azure.com/massgrave/Microsoft-Activation-Scripts/_apis/git/repositories/Microsoft-Activation-Scripts/items?path=/MAS/All-In-One-Version-KL/MAS_AIO.cmd&versionType=Commit&version=694976cd35c9601ce280d7b8fc920f257c97b627',
  'https://git.activated.win/Microsoft-Activation-Scripts/plain/MAS/All-In-One-Version-KL/MAS_AIO.cmd?id=694976cd35c9601ce280d7b8fc920f257c97b627',
]

const MAS_EXPECTED_HASH = 'D94B1ABCBA24D26C5FBE114A15B53A558684D74A1ACCFF79BBB2407BE7102A89'

function sendProgress(progress: number, message: string, stage: 'DOWNLOADING' | 'VERIFYING' | 'EXECUTING' | 'COMPLETE' | 'ERROR') {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
  if (win && !win.isDestroyed()) {
    win.webContents.send(IPC_CHANNELS.ACTIVATION_PROGRESS, { stage, message, progress })
  }
}

export async function getWindowsActivationStatus(): Promise<WindowsActivationStatus | null> {
  const script = `
$lics = Get-CimInstance -ClassName SoftwareLicensingProduct -ErrorAction SilentlyContinue | Where-Object { $_.PartialProductKey -ne $null }
$os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue

$result = @{
  activated = $false
  licenseStatus = ''
  productName = ''
  productId = ''
  partialProductKey = $null
  licenseChannel = ''
  vlActivationType = ''
  evaluationEndDate = $null
  gracePeriodRemaining = $null
  tokenSource = $null
  edition = ''
}

if ($os) {
  $result.edition = $os.Caption
}

if ($lics) {
  $first = $lics | Select-Object -First 1

  $statusText = switch ($first.LicenseStatus) {
    0 { 'Sin licencia' }
    1 { 'Activado' }
    2 { 'Grace period' }
    3 { 'Extended grace' }
    4 { 'No genuino' }
    5 { 'Evaluación' }
    6 { 'Notificaciones' }
    default { "Estado $($first.LicenseStatus)" }
  }

  $vlType = switch ($first.VLActivationType) {
    0 { 'None' }
    1 { 'KMS' }
    2 { 'Token' }
    3 { 'KMS+Token' }
    default { "Unknown ($($first.VLActivationType))" }
  }

  $result.activated = ($first.LicenseStatus -eq 1)
  $result.licenseStatus = $statusText
  $result.productName = $first.Name
  $result.productId = $first.ProductID
  $result.partialProductKey = $first.PartialProductKey
  $result.licenseChannel = $first.ProductKeyChannel
  $result.vlActivationType = $vlType
  $result.tokenSource = $first.TokenSource

  if (-not $result.activated) {
    $result.gracePeriodRemaining = $first.GracePeriodRemaining
    $result.evaluationEndDate = $first.GracePeriodRemaining
  }
}

$result | ConvertTo-Json -Compress
`

  try {
    const raw = await runPowerShell(script, 10000)
    if (!raw || raw === 'null') return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function getOfficeActivationStatus(): Promise<OfficeActivationStatus | null> {
  const script = `
$result = @{
  installed = $false
  version = ''
  activated = $false
  productKey = $null
  productName = $null
  licenseStatus = ''
}

$officeReg = Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Office\\ClickToRun\\Configuration" -ErrorAction SilentlyContinue
if (-not $officeReg) {
  $officeReg = Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Office\\16.0\\Common\\InstallRoot" -ErrorAction SilentlyContinue
}

if ($officeReg) {
  $result.installed = $true
  if ($officeReg.VersionToReport) {
    $result.version = $officeReg.VersionToReport
  } elseif ($officeReg.Version) {
    $result.version = $officeReg.Version
  } else {
    $result.version = "Microsoft 365 / Office 2019+"
  }

  $ospPaths = @(
    "$env:ProgramFiles\\Microsoft Office\\Office16\\OSPP.VBS",
    "$env:ProgramFiles (x86)\\Microsoft Office\\Office16\\OSPP.VBS",
    "$env:ProgramFiles\\Microsoft Office\\Office15\\OSPP.VBS",
    "$env:ProgramFiles (x86)\\Microsoft Office\\Office15\\OSPP.VBS"
  )

  $ospPath = $null
  foreach ($p in $ospPaths) {
    if (Test-Path $p) { $ospPath = $p; break }
  }

  if ($ospPath) {
    try {
      $ospOut = cscript "$ospPath" /dstatus 2>&1
      $licLine = $ospOut | Select-String "LICENSE STATUS:"
      $pkLine = $ospOut | Select-String "Partial Product Key:"
      $nameLine = $ospOut | Select-String "Product Name:"

      if ($licLine) {
        $status = "$licLine".Replace("LICENSE STATUS:", "").Trim()
        $result.licenseStatus = $status
        $result.activated = ($status -eq "--LICENSED--")
      }
      if ($pkLine) { $result.productKey = "$pkLine".Replace("Partial Product Key:", "").Trim() }
      if ($nameLine) { $result.productName = "$nameLine".Replace("Product Name:", "").Trim() }
    } catch {
      $result.licenseStatus = "Unknown"
    }
  }
}

$result | ConvertTo-Json -Compress
`

  try {
    const raw = await runPowerShell(script, 15000)
    if (!raw || raw === 'null') return { installed: false, version: '', activated: false, productKey: null, productName: null, licenseStatus: '' }
    return JSON.parse(raw)
  } catch {
    return { installed: false, version: '', activated: false, productKey: null, productName: null, licenseStatus: '' }
  }
}

export async function getActivationStatus(): Promise<ActivationStatus> {
  const [windows, office] = await Promise.allSettled([
    getWindowsActivationStatus(),
    getOfficeActivationStatus(),
  ])

  return {
    windows: windows.status === 'fulfilled' ? windows.value : null,
    office: office.status === 'fulfilled' ? office.value : null,
    error: null,
  }
}

async function downloadFile(url: string, timeout = 15000): Promise<string> {
  const https = require('https')
  return new Promise<string>((resolve, reject) => {
    https.get(url, { timeout }, (res: any) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      let data = ''
      res.on('data', (chunk: string) => { data += chunk })
      res.on('end', () => resolve(data))
    }).on('error', reject)
  })
}

export async function downloadAndRunMAS(target: 'windows' | 'office' | 'both'): Promise<void> {
  const tmpDir = process.env.TEMP || process.env.TMP || 'C:\\Temp'
  const filePath = join(tmpDir, `MAS_AIO_${Date.now()}.cmd`)

  sendProgress(0, 'Descargando script de activación...', 'DOWNLOADING')

  let scriptContent: string | null = null
  let lastError: string = ''

  for (const url of MAS_URLS) {
    try {
      scriptContent = await downloadFile(url)
      if (scriptContent) break
    } catch (err: any) {
      lastError = err.message
      continue
    }
  }

  if (!scriptContent) {
    sendProgress(0, `Error: No se pudo descargar (${lastError})`, 'ERROR')
    throw new Error(`Failed to download MAS script: ${lastError}`)
  }

  sendProgress(50, 'Verificando integridad del script...', 'VERIFYING')

  const hash = createHash('sha256').update(scriptContent, 'utf8').digest('hex').toUpperCase()
  if (hash !== MAS_EXPECTED_HASH) {
    sendProgress(0, `Error de integridad: hash no coincide`, 'ERROR')
    throw new Error(`MAS hash mismatch: expected ${MAS_EXPECTED_HASH}, got ${hash}`)
  }

  sendProgress(75, 'Ejecutando script de activación...', 'EXECUTING')

  const wrappedContent = `@::: ${Date.now()}\r\n${scriptContent}`
  writeFileSync(filePath, wrappedContent, 'utf8')

  if (!existsSync(filePath)) {
    sendProgress(0, 'Error: No se pudo crear el archivo temporal', 'ERROR')
    throw new Error('Failed to create temp file')
  }

  const argsMap: Record<string, string> = {
    windows: '/windows',
    office: '/office',
    both: '',
  }

  const arg = argsMap[target]
  const masArgs = arg ? `-el -qedit ${arg}` : '-el -qedit'
  const psScript = `
try {
  $p = Start-Process -FilePath "$env:SystemRoot\\system32\\cmd.exe" -ArgumentList '/c """"${filePath.replace(/\\/g, '\\\\')}"" ${masArgs}""' -Wait -Verb RunAs -PassThru -ErrorAction Stop
  Write-Output "EXIT:$($p.ExitCode)"
} catch {
  Write-Output "ERROR:$($_.Exception.Message)"
}
`

  try {
    const result = await runPowerShell(psScript, 120000)
    if (result && result.startsWith('ERROR:')) {
      const errMsg = result.replace('ERROR:', '')
      sendProgress(0, `Error: ${errMsg}`, 'ERROR')
      throw new Error(errMsg)
    }
  } catch (err: any) {
    if (!err.message?.includes('timed out')) {
      sendProgress(0, `Error durante la ejecución: ${err.message}`, 'ERROR')
      throw err
    }
  } finally {
    try { unlinkSync(filePath) } catch {}
  }

  sendProgress(100, 'Proceso completado.', 'COMPLETE')
}
