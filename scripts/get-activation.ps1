# Container Diagnostic Suite
# Verifica estado de activación de Windows
# Uso: powershell -ExecutionPolicy Bypass -File get-activation.ps1

$result = @{
  IsActivated = $false
  LicenseStatus = ''
  ProductName = ''
  ProductId = ''
  EvaluationEndDate = $null
  GracePeriodRemaining = $null
}

try {
  $activation = Get-WmiObject -Query "SELECT * FROM SoftwareLicensingProduct WHERE PartialProductKey IS NOT NULL" -ErrorAction SilentlyContinue

  if ($activation) {
    foreach ($item in $activation) {
      if ($item.LicenseStatus -eq 1) {
        $result.IsActivated = $true
        $result.ProductName = $item.Name
        $result.ProductId = $item.ProductID

        switch ($item.LicenseStatus) {
          0 { $result.LicenseStatus = 'Sin licencia' }
          1 { $result.LicenseStatus = 'Activado' }
          2 { $result.LicenseStatus = 'Grace period' }
          3 { $result.LicenseStatus = 'Extended grace' }
          4 { $result.LicenseStatus = 'No geniune' }
          5 { $result.LicenseStatus = 'Evaluation' }
          6 { $result.LicenseStatus = 'Notificaciones' }
          default { $result.LicenseStatus = "Estado $($item.LicenseStatus)" }
        }
        break
      }
    }
  }
} catch {
  # Fallback to simpler check
  try {
    $os = Get-WmiObject Win32_OperatingSystem
    if ($os.SerialNumber) {
      $result.ProductId = $os.SerialNumber
      $result.ProductName = $os.Caption
      # Check via SoftwareLicensingProduct
    }
  } catch {}
}

$result | ConvertTo-Json -Compress
