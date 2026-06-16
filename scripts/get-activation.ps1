# Container Diagnostic Suite — v2
# Verifica estado de activación de Windows y licencia en detalle
# Uso: powershell -ExecutionPolicy Bypass -File get-activation.ps1

$result = @{
  IsActivated = $false
  LicenseStatus = ''
  ProductName = ''
  ProductId = ''
  EvaluationEndDate = $null
  GracePeriodRemaining = $null
  OSLanguage = ''
  OSLocalization = ''
  OSLatestUpdate = ''
  OSBuild = ''
  OSEdition = ''
  OSMachineType = ''
  OSSystemType = ''
  OEMInfo = @{}
  LicenseChannel = ''
  PartialProductKey = ''
  VLActivationType = ''
  VLActivationTypeEnabled = ''
  TokenSource = ''
  KeyNotFound = ''
  SimpleActivation = ''
}

try {
  $activation = Get-WmiObject -Query "SELECT * FROM SoftwareLicensingProduct WHERE PartialProductKey IS NOT NULL" -ErrorAction SilentlyContinue
  $os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
  $computer = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue

  if ($os) {
    $result.OSLanguage = $os.OSLanguage
    $result.OSLocalization = $os.MUILanguages -join ', '
    $result.OSBuild = $os.BuildNumber
    $result.OSEdition = $os.Caption
    $result.OSSystemType = $os.OSArchitecture
    $result.OSMachineType = $computer.SystemType
    try {
      $result.OSLatestUpdate = (Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 1).InstalledOn.ToString('yyyy-MM-dd')
    } catch { $result.OSLatestUpdate = '' }
    $result.SimpleActivation = (Get-CimInstance -ClassName SoftwareLicensingProduct | Where-Object { $_.PartialProductKey -ne $null }).Count -gt 0
  }

  if ($activation) {
    foreach ($item in $activation) {
      if ($item.LicenseStatus -eq 1) {
        $result.IsActivated = $true
        $result.ProductName = $item.Name
        $result.ProductId = $item.ProductID
        $result.PartialProductKey = $item.PartialProductKey
        $result.LicenseChannel = $item.ProductKeyChannel
        $result.TokenSource = $item.TokenSource

        try {
          $result.VLActivationType = switch ($item.VLActivationType) {
            0 { 'None' }
            1 { 'KMS' }
            2 { 'Token' }
            3 { 'KMS+Token' }
            default { "Unknown ($($item.VLActivationType))" }
          }
        } catch { }

        switch ($item.LicenseStatus) {
          0 { $result.LicenseStatus = 'Sin licencia' }
          1 { $result.LicenseStatus = 'Activado' }
          2 { $result.LicenseStatus = 'Grace period' }
          3 { $result.LicenseStatus = 'Extended grace' }
          4 { $result.LicenseStatus = 'No genuino' }
          5 { $result.LicenseStatus = 'Evaluación' }
          6 { $result.LicenseStatus = 'Notificaciones' }
          default { $result.LicenseStatus = "Estado $($item.LicenseStatus)" }
        }
        break
      }
    }
    if (-not $result.IsActivated) {
      $first = $activation | Select-Object -First 1
      $result.GracePeriodRemaining = try { $first.GracePeriodRemaining } catch { $null }
      $result.EvaluationEndDate = try { $first.GracePeriodRemaining } catch { $null }
    }
  }

  try {
    $oem = Get-CimInstance -Namespace root/cimv2 -ClassName Win32_ComputerSystemProduct -ErrorAction SilentlyContinue
    if ($oem) {
      $result.OEMInfo = @{
        UUID = $oem.UUID
        Vendor = $oem.Vendor
        Version = $oem.Version
        IdentifyingNumber = $oem.IdentifyingNumber
        SKUNumber = $oem.SKUNumber
      }
    }
  } catch { }

  if (-not $result.IsActivated) {
    $licBackup = Get-CimInstance -ClassName SoftwareLicensingProduct -ErrorAction SilentlyContinue |
      Where-Object { $_.LicenseStatus -ne $null -and $_.Name -like '*Windows*' } |
      Select-Object -First 1
    if ($licBackup) {
      $result.LicenseStatus = "Estado: $($licBackup.LicenseStatus)"
      $result.PartialProductKey = $licBackup.PartialProductKey
    }
  }
} catch {
  try {
    $os = Get-WmiObject Win32_OperatingSystem
    if ($os.SerialNumber) {
      $result.ProductId = $os.SerialNumber
      $result.ProductName = $os.Caption
    }
  } catch {}
}

$result | ConvertTo-Json -Depth 5 -Compress
