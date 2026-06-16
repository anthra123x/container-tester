# Container Diagnostic Suite — v2
# Monitoreo completo de sensores: temperaturas, ventiladores, voltajes
# Uso: powershell -ExecutionPolicy Bypass -File get-sensors.ps1

$result = @{
  Cpu = @{ Temperature = @(); MaxTemperature = $null; PackageTemp = $null; Cores = @() }
  Gpu = @{ Adapters = @(); Temperature = @(); HotspotTemp = $null; FanPercent = $null; FanSpeed = $null; CoreClock = $null; MemoryClock = $null; PowerDraw = $null }
  Motherboard = @{ ThermalZones = @(); ChipsetTemp = $null }
  Disks = @()
  Fans = @()
  Voltages = @()
  TimeStamp = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
}

try {
  # ── CPU Temperatures: múltiples fuentes ──
  # 1. Thermal Zone Information (perf counter)
  $thermal = Get-CimInstance -Namespace 'root/cimv2' -ClassName 'Win32_PerfFormattedData_Counters_ThermalZoneInformation' -ErrorAction SilentlyContinue
  if ($thermal) {
    $cpuTemps = @()
    foreach ($t in $thermal) {
      if ($t.Temperature -and $t.Temperature -gt 0) {
        $tempC = [math]::Round($t.Temperature / 10, 1)
        $cpuTemps += $tempC
        $zoneName = ($t.Name -replace 'ACPI\\ThermalZone\\', '')

        $result.Cpu.Cores += @{
          Zone = $zoneName
          Temperature = $tempC
          Timestamp = (Get-Date -Format 'HH:mm:ss')
        }
      }
    }
    if ($cpuTemps.Count -gt 0) {
      $result.Cpu.Temperature = $cpuTemps
      $result.Cpu.AverageTemp = [math]::Round(($cpuTemps | Measure-Object -Average).Average, 1)
      $result.Cpu.MaxTemperature = ($cpuTemps | Measure-Object -Maximum).Maximum
      $result.Cpu.MinTemperature = ($cpuTemps | Measure-Object -Minimum).Minimum
    }
  }

  # 2. MSAcpi_ThermalZoneTemperature
  $acpiThermal = Get-WmiObject -Namespace 'root/wmi' -Class MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue
  if ($acpiThermal) {
    foreach ($t in $acpiThermal) {
      $temp = [math]::Round(($t.CurrentTemperature - 2731.5) / 10, 1)
      $name = ($t.InstanceName -replace '.*\\', '')
      $result.Motherboard.ThermalZones += @{
        Name = $name
        Temperature_C = $temp
        ActiveTripPoint = $t.ActiveTripPoint
        CriticalTripPoint = if ($t.CriticalTripPoint) { [math]::Round(($t.CriticalTripPoint - 2731.5) / 10, 1) } else { $null }
        PassiveTripPoint = if ($t.PassiveTripPoint) { [math]::Round(($t.PassiveTripPoint - 2731.5) / 10, 1) } else { $null }
      }
      if ($name -match 'PCH|CHIPSET|SB|ICH') {
        $result.Motherboard.ChipsetTemp = $temp
      }
    }
  }
} catch { $result.Errors += "CPU_Thermal: $_" }

try {
  # ── GPU Temperatures ──
  $adapters = Get-WmiObject Win32_VideoController -ErrorAction SilentlyContinue
  if ($adapters) {
    foreach ($a in $adapters) {
      $gpuObj = @{
        Name = $a.Name
        AdapterRAM_GB = if ($a.AdapterRAM) { [math]::Round($a.AdapterRAM / 1GB, 2) } else { $null }
        DriverVersion = $a.DriverVersion
        DriverDate = $a.DriverDate
        CurrentRefreshRate = $a.CurrentRefreshRate
        CurrentHorizontalRes = $a.CurrentHorizontalResolution
        CurrentVerticalRes = $a.CurrentVerticalResolution
        VideoArchitecture = $a.VideoArchitecture
        VideoMemoryType = $a.VideoMemoryType
        Status = $a.Status
        ConfigManagerErrorCode = $a.ConfigManagerErrorCode
      }
      $result.Gpu.Adapters += $gpuObj
    }
  }

  $gpuPerf = Get-CimInstance -Namespace 'root/cimv2' -ClassName 'Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapterMemory' -ErrorAction SilentlyContinue
  if ($gpuPerf) {
    $result.Gpu.LocalUsage_GB = [math]::Round($gpuPerf.LocalUsage / 1GB, 3) if ($gpuPerf.LocalUsage) else $null
    $result.Gpu.DedicatedUsage_GB = [math]::Round($gpuPerf.DedicatedUsage / 1GB, 3) if ($gpuPerf.DedicatedUsage) else $null
    $result.Gpu.SharedUsage_GB = [math]::Round($gpuPerf.SharedUsage / 1GB, 3) if ($gpuPerf.SharedUsage) else $null
  }
} catch { $result.Errors += "GPU: $_" }

try {
  # ── Disk Temperatures ──
  $disks = Get-PhysicalDisk -ErrorAction SilentlyContinue
  foreach ($disk in $disks) {
    $diskObj = @{
      Name = $disk.FriendlyName
      Model = $disk.Model
      SerialNumber = $disk.SerialNumber
      MediaType = switch ($disk.MediaType) { 0 {'HDD'}; 3 {'HDD'}; 4 {'SSD'}; 5 {'SCM'}; default {'Unknown'} }
      BusType = switch ($disk.BusType) { 0 {'Unknown'}; 3 {'SAS'}; 5 {'SATA'}; 6 {'NVMe'}; 10 {'NVMe'}; default {"BT_$($disk.BusType)"} }
      Size_GB = if ($disk.Size) { [math]::Round($disk.Size / 1GB, 1) } else { $null }
      HealthStatus = switch ($disk.HealthStatus) { 0 {'Healthy'}; 1 {'Warning'}; 2 {'Unhealthy'}; default {'Unknown'} }
      OperationalStatus = $disk.OperationalStatus -join ', '
    }
    if ($disk.Temperature -and $disk.Temperature -gt 0) {
      $diskObj.Temperature = $disk.Temperature
    }

    $reliability = Get-PhysicalDisk -DeviceNumber $disk.DeviceNumber -ErrorAction SilentlyContinue |
      Get-StorageReliabilityCounter -ErrorAction SilentlyContinue
    if ($reliability) {
      $diskObj.Wear = $reliability.Wear
      $diskObj.PowerOnHours = $reliability.PowerOnHours
      $diskObj.ReadErrorsCorrected = $reliability.ReadErrorsCorrected
      $diskObj.ReadErrorsUncorrected = $reliability.ReadErrorsUncorrected
      $diskObj.StaleReadRetries = $reliability.StaleReadRetries
      $diskObj.FlushLatencyMax = $reliability.FlushLatencyMax
      $diskObj.LoadUnloadCycleCount = $reliability.LoadUnloadCycleCount
      $diskObj.StartStopCycleCount = $reliability.StartStopCycleCount
      $diskObj.TemperatureMax = $reliability.TemperatureMax
    }

    $result.Disks += $diskObj
  }
} catch { $result.Errors += "Disks: $_" }

try {
  # ── Fans (múltiples fuentes) ──
  $fanSources = @(
    @{ Namespace = 'root/wmi'; Class = 'MSAcpi_Fan' },
    @{ Namespace = 'root/wmi'; Class = 'Fan_Info' },
    @{ Namespace = 'root/cimv2'; Class = 'Win32_Fan' }
  )

  foreach ($source in $fanSources) {
    try {
      $fans = Get-WmiObject -Namespace $source.Namespace -Class $source.Class -ErrorAction SilentlyContinue
      if ($fans) {
        foreach ($fan in $fans) {
          $fanObj = @{
            Name = $fan.Name -replace '.*\\',''
            Source = "$($source.Class)@$($source.Namespace)"
          }
          if ($fan.FanSpeed -ne $null -or $fan.Speed -ne $null) {
            $fanObj.RPM = try { [int]($fan.FanSpeed ?? $fan.Speed) } catch { $null }
          }
          if ($fan.FanSpeedPercentage -ne $null) {
            $fanObj.Percentage = try { [int]$fan.FanSpeedPercentage } catch { $null }
          }
          $result.Fans += $fanObj
        }
      }
    } catch { }
  }

  # CPU Fan via Win32_PerfRawData
  try {
    $perfFan = Get-CimInstance -Namespace 'root/cimv2' -ClassName 'Win32_PerfRawData_Counters_FanInformation' -ErrorAction SilentlyContinue
    if ($perfFan) {
      $result.Fans += @{
        Name = 'CPU_Fan_Perf'
        Source = 'Win32_PerfRawData_Counters_FanInformation'
        RPM = $perfFan.FanSpeed
        Percentage = $null
      }
    }
  } catch { }
} catch { $result.Errors += "Fans: $_" }

try {
  # ── Voltage Rails (limitado en WMI estándar) ──
  try {
    $powerSources = Get-WmiObject -Namespace 'root/wmi' -Class MSAcpi_PowerSource -ErrorAction SilentlyContinue
    foreach ($ps in $powerSources) {
      $result.Voltages += @{
        Name = 'PowerSource'
        Voltage_V = if ($ps.Voltage) { [math]::Round($ps.Voltage / 1000, 3) } else { $null }
        RateOfUse_mW = $ps.RateOfUse
        EstimatedTime_min = $ps.EstimatedTime
      }
    }
  } catch { }

  try {
    $proc = Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($proc -and $proc.CurrentVoltage) {
      $result.Voltages += @{
        Name = 'CPU Vcore (WMI)'
        Voltage_V = [math]::Round($proc.CurrentVoltage * 0.1, 3)
        Source = 'Win32_Processor.CurrentVoltage'
      }
    }
  } catch { }
} catch { $result.Errors += "Voltages: $_" }

try {
  # ── Fallback: systeminfo básico ──
  $result.SystemInfoSummary = @{
    ProcessorCount = (Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors
    TotalPhysicalMemory_GB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
  }
} catch { }

$result | ConvertTo-Json -Depth 10 -Compress
