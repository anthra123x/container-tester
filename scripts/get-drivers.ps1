# Container Diagnostic Suite
# Verifica estado de drivers del sistema
# Uso: powershell -ExecutionPolicy Bypass -File get-drivers.ps1

$result = @{
  TotalDrivers = 0
  ProblemDrivers = @()
  MissingDrivers = @()
}

try {
  $drivers = Get-WmiObject Win32_PnPSignedDriver -ErrorAction SilentlyContinue | Where-Object { $_.DeviceName -ne $null }
  $result.TotalDrivers = $drivers.Count

  $problemDrivers = $drivers | Where-Object {
    $_.DriverDate -eq $null -or
    $_.DriverVersion -eq $null -or
    $_.IsSigned -eq $false
  }

  foreach ($d in $problemDrivers) {
    $result.ProblemDrivers += @{
      DeviceName = $d.DeviceName
      DeviceClass = $d.DeviceClass
      DriverDate = $d.DriverDate
      DriverVersion = $d.DriverVersion
      IsSigned = $d.IsSigned
      Manufacturer = $d.Manufacturer
    }
  }

  # Dispositivos sin driver (código de error 28, 31, etc.)
  $problemDevices = Get-WmiObject Win32_PnPEntity -ErrorAction SilentlyContinue | Where-Object {
    $_.ConfigManagerErrorCode -ne $null -and $_.ConfigManagerErrorCode -ne 0
  }

  foreach ($d in $problemDevices) {
    $errorDesc = switch ($d.ConfigManagerErrorCode) {
      1 { 'Dispositivo no configurado correctamente' }
      10 { 'Dispositivo no puede iniciar' }
      12 { 'Sin recursos suficientes' }
      14 { 'Requiere reinicio' }
      18 { 'Reinstalar driver' }
      21 { 'Sistema removed' }
      22 { 'Dispositivo deshabilitado' }
      24 { 'Dispositivo no presente' }
      28 { 'Driver no instalado' }
      29 { 'Firmware deshabilitado' }
      31 { 'Driver falló al cargar' }
      32 { 'Driver deshabilitado por otro' }
      33 { 'BIOS conflict' }
      43 { 'Driver reportó fallo' }
      default { "Error $($d.ConfigManagerErrorCode)" }
    }

    $result.MissingDrivers += @{
      DeviceName = $d.Name
      DeviceID = $d.DeviceID
      ErrorCode = $d.ConfigManagerErrorCode
      ErrorDescription = $errorDesc
    }
  }
} catch {}

$result | ConvertTo-Json -Compress
