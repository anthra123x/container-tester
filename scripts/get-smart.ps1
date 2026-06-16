# Container Diagnostic Suite — v2
# Obtiene información SMART detallada de los discos con contadores de fiabilidad
# Uso: powershell -ExecutionPolicy Bypass -File get-smart.ps1

$disks = Get-PhysicalDisk -ErrorAction SilentlyContinue | Where-Object { $_.BusType -ne 11 -and $_.BusType -ne 7 -and $_.BusType -ne 0 }
if (-not $disks) {
  $disks = Get-PhysicalDisk -ErrorAction SilentlyContinue
}

$results = @()

foreach ($disk in $disks) {
  $mediaType = switch ($disk.MediaType) {
    0 { 'HDD' }; 3 { 'HDD' }; 4 { 'SSD' }
    5 { 'SCM' }; default { 'Unknown' }
  }
  $busType = switch ($disk.BusType) {
    0 { 'Unknown' }; 3 { 'SAS' }; 5 { 'SATA' }
    6 { 'NVMe' }; 10 { 'NVMe' }; 11 { 'USB' }
    7 { 'File' }; default { "BusType_$($disk.BusType)" }
  }
  $healthStatus = switch ($disk.HealthStatus) {
    0 { 'Healthy' }; 1 { 'Warning' }; 2 { 'Unhealthy' }; default { 'Unknown' }
  }
  $usage = switch ($disk.Usage) {
    0 { 'Unknown' }; 1 { 'Auto-Select' }; 2 { 'Manual-Select' }
    3 { 'Hot Spare' }; 4 { 'Journal' }; 5 { 'Retired' }
    default { "Usage_$($disk.Usage)" }
  }

  $diskInfo = @{
    DeviceId        = $disk.DeviceId
    DeviceNumber    = $disk.DeviceNumber
    FriendlyName    = $disk.FriendlyName
    Model           = $disk.Model
    SerialNumber    = $disk.SerialNumber
    UniqueId        = $disk.UniqueId
    MediaType       = $mediaType
    BusType         = $busType
    Size_GB         = if ($disk.Size) { [math]::Round($disk.Size / 1GB, 2) } else { $null }
    HealthStatus    = $healthStatus
    OperationalStatus = $disk.OperationalStatus -join ', '
    Temperature     = $disk.Temperature
    Usage           = $usage
    PhysicalSectorSize = $disk.PhysicalSectorSize
    LogicalSectorSize  = $disk.LogicalSectorSize
    Manufacturer       = $disk.Manufacturer
    FirmwareVersion    = $disk.FirmwareVersion
    PartNumber         = $disk.PartNumber
    SlotNumber         = $disk.SlotNumber
  }

  try {
    $reliability = Get-PhysicalDisk -DeviceNumber $disk.DeviceNumber -ErrorAction SilentlyContinue |
      Get-StorageReliabilityCounter -ErrorAction SilentlyContinue
    if ($reliability) {
      $diskInfo.Reliability = @{
        Wear                   = $reliability.Wear
        PowerOnHours           = $reliability.PowerOnHours
        ReadErrorsCorrected    = $reliability.ReadErrorsCorrected
        ReadErrorsUncorrected  = $reliability.ReadErrorsUncorrected
        WriteErrorsCorrected   = $reliability.WriteErrorsCorrected
        WriteErrorsUncorrected = $reliability.WriteErrorsUncorrected
        StaleReadRetries       = $reliability.StaleReadRetries
        TotalBytesRead         = if ($reliability.TotalBytesRead) { [math]::Round($reliability.TotalBytesRead / 1TB, 2) } else { $null }
        TotalBytesWritten      = if ($reliability.TotalBytesWritten) { [math]::Round($reliability.TotalBytesWritten / 1TB, 2) } else { $null }
        FlushLatencyMax        = $reliability.FlushLatencyMax
        LoadUnloadCycleCount   = $reliability.LoadUnloadCycleCount
        StartStopCycleCount    = $reliability.StartStopCycleCount
        TemperatureMax         = $reliability.TemperatureMax
        TemperatureMin         = $reliability.TemperatureMin
        ReadLatencyMax         = $reliability.ReadLatencyMax
        WriteLatencyMax        = $reliability.WriteLatencyMax
        WearPercentage         = if ($reliability.Wear -ne $null) { [math]::Round($reliability.Wear * 100, 1) } else { $null }
      }
      if ($reliability.PowerOnHours -gt 0) {
        $poh = $reliability.PowerOnHours
        $diskInfo.Reliability.PowerOnDays = [math]::Round($poh / 24, 1)
        $diskInfo.Reliability.PowerOnYears = [math]::Round($poh / (24 * 365.25), 2)
      }
    }
  } catch { $diskInfo.ReliabilityError = "$_" }

  try {
    $wmiDisk = Get-WmiObject -Namespace 'root\wmi' -Class MSStorageDriver_ATAPISmartData -Filter "InstanceName LIKE '%$($disk.SerialNumber)%'" -ErrorAction SilentlyContinue
    if (-not $wmiDisk) {
      $wmiDisk = Get-WmiObject Win32_DiskDrive | Where-Object {
        $_.SerialNumber -eq $disk.SerialNumber -or $_.Model -eq $disk.Model -or $_.DeviceID -eq "\\\\.\\PHYSICALDRIVE$($disk.DeviceNumber)"
      } | Select-Object -First 1
    }
    if ($wmiDisk) {
      $diskInfo.WMIInfo = @{
        Model              = $wmiDisk.Model
        InterfaceType      = $wmiDisk.InterfaceType
        MediaType          = $wmiDisk.MediaType
        Status             = $wmiDisk.Status
        BytesPerSector     = $wmiDisk.BytesPerSector
        TotalCylinders     = $wmiDisk.TotalCylinders
        TotalHeads         = $wmiDisk.TotalHeads
        TotalSectors       = $wmiDisk.TotalSectors
        TotalTracks        = $wmiDisk.TotalTracks
        TracksPerCylinder  = $wmiDisk.TracksPerCylinder
        SectorsPerTrack    = $wmiDisk.SectorsPerTrack
        Index              = $wmiDisk.Index
        Partitions         = $wmiDisk.Partitions
        SCSIBus            = $wmiDisk.SCSIBus
        SCSILun            = $wmiDisk.SCSILun
        SCSIPort           = $wmiDisk.SCSIPort
        SCSITargetId       = $wmiDisk.SCSITargetId
        PNPDeviceID        = $wmiDisk.PNPDeviceID
      }
    }
  } catch { $diskInfo.WMIError = "$_" }

  try {
    $perfData = Get-CimInstance -Namespace 'root/cimv2' -ClassName 'Win32_PerfFormattedData_PerfDisk_PhysicalDisk' -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -eq "$($disk.DeviceNumber):$($disk.DeviceNumber)" }
    if ($perfData) {
      $diskInfo.Performance = @{
        CurrentDiskQueueLength = $perfData.CurrentDiskQueueLength
        AvgDiskBytesPerRead    = if ($perfData.AvgDiskBytesPerRead) { [math]::Round($perfData.AvgDiskBytesPerRead / 1KB, 2) } else { $null }
        AvgDiskBytesPerWrite   = if ($perfData.AvgDiskBytesPerWrite) { [math]::Round($perfData.AvgDiskBytesPerWrite / 1KB, 2) } else { $null }
        AvgDiskReadQueueLength = $perfData.AvgDiskReadQueueLength
        AvgDiskWriteQueueLength = $perfData.AvgDiskWriteQueueLength
        DiskReadBytesPerSec    = if ($perfData.DiskReadBytesPerSec) { [math]::Round($perfData.DiskReadBytesPerSec / 1MB, 2) } else { $null }
        DiskWriteBytesPerSec   = if ($perfData.DiskWriteBytesPerSec) { [math]::Round($perfData.DiskWriteBytesPerSec / 1MB, 2) } else { $null }
        PercentDiskReadTime    = $perfData.PercentDiskReadTime
        PercentDiskWriteTime   = $perfData.PercentDiskWriteTime
        PercentIdleTime        = $perfData.PercentIdleTime
      }
      $diskInfo.Performance.DiskReadPerSec_MB = if ($perfData.DiskReadBytesPerSec) { [math]::Round($perfData.DiskReadBytesPerSec / 1MB, 2) } else { $null }
      $diskInfo.Performance.DiskWritePerSec_MB = if ($perfData.DiskWriteBytesPerSec) { [math]::Round($perfData.DiskWriteBytesPerSec / 1MB, 2) } else { $null }
    }
  } catch { $diskInfo.PerfError = "$_" }

  # Cálculo de vida estimada para SSD
  if ($mediaType -eq 'SSD' -and $diskInfo.Reliability.Wear -ne $null) {
    $wear = $diskInfo.Reliability.Wear
    $poh = $diskInfo.Reliability.PowerOnHours
    $diskInfo.Endurance = @{
      WearLevel = [math]::Round($wear * 100, 2)
      RemainingLife_pct = [math]::Round((1 - $wear) * 100, 2)
    }
    if ($wear -gt 0 -and $poh -gt 0) {
      $estimatedTotalLife = $poh / $wear
      $remainingHours = $estimatedTotalLife - $poh
      $diskInfo.Endurance.EstimatedTotalLifeHours = [math]::Round($estimatedTotalLife)
      $diskInfo.Endurance.EstimatedRemainingLifeHours = [math]::Round($remainingHours)
      $diskInfo.Endurance.EstimatedRemainingLifeDays = [math]::Round($remainingHours / 24)
    }
  }

  $results += $diskInfo
}

if ($results.Count -eq 0) {
  try {
    $legacyDisks = Get-WmiObject Win32_DiskDrive -ErrorAction SilentlyContinue
    foreach ($disk in $legacyDisks) {
      $results += @{
        DeviceId   = $disk.DeviceID
        Model      = $disk.Model
        SerialNumber = $disk.SerialNumber
        Size_GB    = if ($disk.Size) { [math]::Round($disk.Size / 1GB, 2) } else { $null }
        InterfaceType = $disk.InterfaceType
        MediaType  = $disk.MediaType
        Status     = $disk.Status
        Partitions = $disk.Partitions
        Fallback   = $true
      }
    }
  } catch { }
}

$results | ConvertTo-Json -Depth 10 -Compress
