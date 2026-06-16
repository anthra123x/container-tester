# Container Diagnostic Suite
# Obtiene información SMART detallada de los discos
# Uso: powershell -ExecutionPolicy Bypass -File get-smart.ps1

$disks = Get-PhysicalDisk -ErrorAction SilentlyContinue | Where-Object { $_.BusType -ne 'USB' -and $_.BusType -ne 'File' }
$results = @()

foreach ($disk in $disks) {
  $mediaType = switch ($disk.MediaType) {
    0 { 'HDD' }
    3 { 'HDD' }
    4 { 'SSD' }
    5 { 'SCM' }
    default { 'Unknown' }
  }

  $busType = switch ($disk.BusType) {
    0 { 'Unknown' }
    3 { 'SAS' }
    5 { 'SATA' }
    6 { 'NVMe' }
    10 { 'NVMe' }
    default { "BusType_$($disk.BusType)" }
  }

  $healthStatus = switch ($disk.HealthStatus) {
    0 { 'Healthy' }
    1 { 'Warning' }
    2 { 'Unhealthy' }
    default { 'Unknown' }
  }

  $diskInfo = @{
    DeviceId      = $disk.DeviceId
    FriendlyName  = $disk.FriendlyName
    Model         = $disk.Model
    SerialNumber  = $disk.SerialNumber
    MediaType     = $mediaType
    BusType       = $busType
    Size          = $disk.Size
    HealthStatus  = $healthStatus
    OperationalStatus = $disk.OperationalStatus
    Temperature   = $disk.Temperature
    Usage         = $disk.Usage
  }

  # Obtener información SMART adicional
  $smartAttrs = @()
  try {
    $wmiDisk = Get-WmiObject -Namespace 'root\wmi' -Class MSStorageDriver_ATAPISmartData -Filter "InstanceName LIKE '%$($disk.SerialNumber)%'" -ErrorAction SilentlyContinue
    if (-not $wmiDisk) {
      # Try Win32_DiskDrive
      $wmiDisk = Get-WmiObject Win32_DiskDrive | Where-Object { $_.SerialNumber -eq $disk.SerialNumber -or $_.Model -eq $disk.Model } | Select-Object -First 1
    }
  } catch {
    $wmiDisk = $null
  }

  $results += $diskInfo
}

# Convertir a JSON
$results | ConvertTo-Json -Depth 5 -Compress
