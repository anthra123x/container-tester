import { BrowserWindow } from 'electron'
import { writeFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { runPowerShell } from './powershell'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import type { DriverScanResult, DriverUpdateResult, DriverInstallProgress } from '../../shared/types/drivers.types'

function sendProgress(progress: number, message: string, stage: DriverInstallProgress['stage'], currentUpdate = '', needsReboot = false) {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
  if (win && !win.isDestroyed()) {
    win.webContents.send(IPC_CHANNELS.DRIVERS_PROGRESS, { stage, message, progress, needsReboot, currentUpdate })
  }
}

export async function scanDrivers(): Promise<DriverScanResult> {
  const script = `
$errorCodes = @{}
$errorCodes[0] = "Funcionando correctamente"
$errorCodes[1] = "No configurado correctamente"
$errorCodes[3] = "Controlador dañado"
$errorCodes[9] = "ID de hardware inválido"
$errorCodes[10] = "El dispositivo no puede iniciar"
$errorCodes[12] = "Sin recursos disponibles"
$errorCodes[14] = "No puede funcionar hasta reiniciar"
$errorCodes[18] = "Reinstalar controlador"
$errorCodes[19] = "Registro dañado"
$errorCodes[21] = "Eliminado por el sistema"
$errorCodes[22] = "Dispositivo deshabilitado"
$errorCodes[24] = "Dispositivo no presente"
$errorCodes[28] = "Controladores no instalados"
$errorCodes[29] = "Firmware ausente"
$errorCodes[31] = "Controlador falló al cargar"
$errorCodes[32] = "Solicita actualización"
$errorCodes[33] = "Firmware no válido"
$errorCodes[34] = "No se puede configurar"
$errorCodes[35] = "Firmware no disponible"
$errorCodes[36] = "Conflicto de IRQ"
$errorCodes[37] = "Firmware defectuoso"
$errorCodes[38] = "Requiere reinicio"
$errorCodes[39] = "Controlador dañado"
$errorCodes[40] = "No hay servicio disponible"
$errorCodes[41] = "Controlador no se cargó"
$errorCodes[42] = "No hay servicio"
$errorCodes[43] = "El controlador reportó un fallo"
$errorCodes[44] = "Aplicación bloqueó el dispositivo"
$errorCodes[45] = "No conectado"
$errorCodes[46] = "Fallo de permiso"
$errorCodes[47] = "No se puede usar"
$errorCodes[48] = "Software bloqueó"
$errorCodes[49] = "No puede iniciar por política"

$drivers = Get-CimInstance Win32_PnPSignedDriver -ErrorAction SilentlyContinue | Where-Object { $_.DeviceName -ne $null } | Select-Object DeviceName, DriverVersion, DriverDate, DriverProviderName, HardwareID, IsSigned, Signer, DeviceClass, DeviceID
$entities = Get-CimInstance Win32_PnPEntity -ErrorAction SilentlyContinue | Select-Object Name, ConfigManagerErrorCode, DeviceID

$result = @()
foreach ($driver in $drivers) {
  $errorCode = 0
  $entity = $entities | Where-Object { $_.DeviceID -eq $driver.DeviceID } | Select-Object -First 1
  if ($entity -and $entity.ConfigManagerErrorCode -ne $null) { $errorCode = [int]$entity.ConfigManagerErrorCode }

  $driverDateStr = ""
  if ($driver.DriverDate) {
    try {
      $driverDateStr = [System.Management.ManagementDateTimeConverter]::ToDateTime($driver.DriverDate).ToString("yyyy-MM-dd")
    } catch { $driverDateStr = "$($driver.DriverDate)" }
  }

  $hwId = ""
  if ($driver.HardwareID) {
    $hwId = "$($driver.HardwareID)" -replace '\\s+', ' '
    if ($hwId.Length -gt 200) { $hwId = $hwId.Substring(0, 200) }
  }

  $result += @{
    deviceName = "$($driver.DeviceName)"
    driverVersion = "$($driver.DriverVersion)"
    driverDate = $driverDateStr
    driverProvider = "$($driver.DriverProviderName)"
    hardwareId = $hwId
    isSigned = [bool]($driver.IsSigned -eq $true)
    signer = if ($driver.Signer) { "$($driver.Signer)" } else { $null }
    errorCode = $errorCode
    errorDescription = if ($errorCodes.ContainsKey($errorCode)) { $errorCodes[$errorCode] } else { "Código de error $errorCode" }
    deviceClass = if ($driver.DeviceClass) { "$($driver.DeviceClass)" } else { "Unknown" }
  }
}

$problematics = $result | Where-Object { $_.errorCode -ne 0 }

@{
  drivers = $result
  totalCount = @($result).Count
  problematicCount = @($problematics).Count
  problematics = $problematics
  error = $null
} | ConvertTo-Json -Compress -Depth 3
`

  try {
    const raw = await runPowerShell(script, 30000)
    if (!raw) return { drivers: [], problematicCount: 0, problematics: [], totalCount: 0, error: 'No response' }
    const parsed = JSON.parse(raw)
    return parsed
  } catch (err: any) {
    return { drivers: [], problematicCount: 0, problematics: [], totalCount: 0, error: err?.message || 'Error al escanear' }
  }
}

export async function checkDriverUpdates(): Promise<DriverUpdateResult> {
  const script = `
try {
  $UpdateSession = New-Object -ComObject Microsoft.Update.Session
  $UpdateSearcher = $UpdateSession.CreateUpdateSearcher()
  $SearchResult = $UpdateSearcher.Search("IsInstalled=0 and Type='Driver'")

  $result = @()
  foreach ($update in $SearchResult.Updates) {
    $cats = @()
    if ($update.Categories) {
      foreach ($cat in $update.Categories) { $cats += "$($cat.Name)" }
    }
    $result += @{
      title = "$($update.Title)"
      description = if ($update.Description) { "$($update.Description)" } else { "" }
      driverVersion = if ($update.DriverVersion) { "$($update.DriverVersion)" } else { "" }
      isDownloaded = [bool]($update.IsDownloaded -eq $true)
      kbArticle = if ($update.KBArticleIDs -and $update.KBArticleIDs.Count -gt 0) { "$($update.KBArticleIDs.Item(0))" } else { $null }
      categories = $cats
    }
  }

  @{ updates = $result; totalCount = @($result).Count; error = $null } | ConvertTo-Json -Compress -Depth 3
} catch {
  @{ updates = @(); totalCount = 0; error = "$($_.Exception.Message)" } | ConvertTo-Json -Compress
}
`

  try {
    const raw = await runPowerShell(script, 60000)
    if (!raw) return { updates: [], totalCount: 0, error: 'No response' }
    return JSON.parse(raw)
  } catch (err: any) {
    return { updates: [], totalCount: 0, error: err?.message || 'Error al buscar actualizaciones' }
  }
}

export async function installDriverUpdates(): Promise<void> {
  const psScript = `
try {
  $UpdateSession = New-Object -ComObject Microsoft.Update.Session
  $UpdateSearcher = $UpdateSession.CreateUpdateSearcher()
  Write-Output "CHECKING:Consultando Windows Update para controladores..."
  $SearchResult = $UpdateSearcher.Search("IsInstalled=0 and Type='Driver'")

  if ($SearchResult.Updates.Count -eq 0) {
    Write-Output "COMPLETE:No hay controladores pendientes"
    exit 0
  }

  $UpdatesToDownload = New-Object -ComObject Microsoft.Update.UpdateColl
  foreach ($update in $SearchResult.Updates) {
    $UpdatesToDownload.Add($update) | Out-Null
    Write-Output "UPDATE:Descargando: $($update.Title)"
  }

  $UpdateDownloader = $UpdateSession.CreateUpdateDownloader()
  $UpdateDownloader.Updates = $UpdatesToDownload
  Write-Output "DOWNLOADING:Descargando controladores..."
  $DownloadResult = $UpdateDownloader.Download()

  if ($DownloadResult.ResultCode -eq 2 -or $DownloadResult.ResultCode -eq 3) {
    Write-Output "ERROR:Falló la descarga (código $($DownloadResult.ResultCode))"
    exit 1
  }

  $UpdateInstaller = $UpdateSession.CreateUpdateInstaller()
  $UpdateInstaller.Updates = $UpdatesToDownload
  Write-Output "INSTALLING:Instalando controladores..."
  $InstallResult = $UpdateInstaller.Install()

  $needsReboot = $false
  if ($InstallResult.RebootRequired) { $needsReboot = $true }

  if ($InstallResult.ResultCode -eq 2 -or $InstallResult.ResultCode -eq 3) {
    Write-Output "ERROR:Falló la instalación (código $($InstallResult.ResultCode))"
    exit 1
  }

  if ($needsReboot) {
    Write-Output "COMPLETE:Instalación completada. Se requiere reinicio.|reboot:true"
  } else {
    Write-Output "COMPLETE:Instalación completada exitosamente.|reboot:false"
  }
} catch {
  Write-Output "ERROR:$($_.Exception.Message)"
  exit 1
}
`

  const tmpDir = process.env.TEMP || process.env.TMP || 'C:\\Temp'
  const scriptPath = join(tmpDir, `DrvInstall_${Date.now()}.ps1`)
  writeFileSync(scriptPath, psScript, 'utf8')

  sendProgress(5, 'Iniciando instalación de controladores...', 'CHECKING')

  const runScript = `
try {
  $p = Start-Process -FilePath "powershell.exe" -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${scriptPath.replace(/\\/g, '\\\\')}"' -Wait -Verb RunAs -PassThru -NoNewWindow -ErrorAction Stop

  if ($p.ExitCode -eq 0) {
    Write-Output "DONE"
  } else {
    Write-Output "EXIT:$($p.ExitCode)"
  }
} catch {
  Write-Output "ERROR:$($_.Exception.Message)"
}
`

  try {
    sendProgress(10, 'Ejecutando instalador elevado...', 'DOWNLOADING')

    const result = await runPowerShell(runScript, 180000)

    if (result) {
      if (result.startsWith('ERROR:')) {
        const errMsg = result.replace('ERROR:', '')
        sendProgress(0, `Error: ${errMsg}`, 'ERROR')
        throw new Error(errMsg)
      }
      if (result.startsWith('EXIT:')) {
        sendProgress(0, 'Error durante la instalación', 'ERROR')
        throw new Error('Installation failed')
      }
    }

    sendProgress(100, 'Instalación completada exitosamente', 'COMPLETE')
  } catch (err: any) {
    if (!err.message?.includes('timed out')) {
      sendProgress(0, `Error: ${err.message}`, 'ERROR')
    }
    throw err
  } finally {
    try { unlinkSync(scriptPath) } catch {}
  }
}
