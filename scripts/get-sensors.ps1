# Container Diagnostic Suite
# Obtiene temperaturas y sensores del sistema
# Uso: powershell -ExecutionPolicy Bypass -File get-sensors.ps1

$result = @{
  Cpu = @{}
  Gpu = @{}
  Motherboard = @{}
  Fans = @()
}

# CPU Temperatura via Win32_PerfFormattedData_Counters_ThermalZoneInformation
try {
  $thermal = Get-CimInstance -Namespace 'root/cimv2' -ClassName 'Win32_PerfFormattedData_Counters_ThermalZoneInformation' -ErrorAction SilentlyContinue
  if ($thermal) {
    $cpuTemps = @()
    foreach ($t in $thermal) {
      if ($t.Temperature -and $t.Temperature -gt 0) {
        $cpuTemps += [math]::Round($t.Temperature / 10, 1)
      }
    }
    if ($cpuTemps.Count -gt 0) {
      $result.Cpu.Temperature = $cpuTemps
      $result.Cpu.MaxTemperature = ($cpuTemps | Measure-Object -Maximum).Maximum
    }
  }
} catch {}

# GPU Temperatura via MSDA
try {
  $gpuTemp = Get-WmiObject -Namespace 'root/wmi' -Class 'Msvm_ComputerSystem' -ErrorAction SilentlyContinue
  # Alternative: check registry or WMI for GPU
  $adapters = Get-WmiObject Win32_VideoController -ErrorAction SilentlyContinue
  if ($adapters) {
    $gpuInfo = @()
    foreach ($a in $adapters) {
      $gpuObj = @{
        Name = $a.Name
        AdapterRAM = $a.AdapterRAM
        DriverVersion = $a.DriverVersion
      }
      $gpuInfo += $gpuObj
    }
    $result.Gpu.Adapters = $gpuInfo
  }
} catch {}

# Temperaturas de discos
try {
  $diskTemps = @()
  $disks = Get-PhysicalDisk -ErrorAction SilentlyContinue
  foreach ($disk in $disks) {
    if ($disk.Temperature -and $disk.Temperature -gt 0) {
      $diskTemps += @{
        Name = $disk.FriendlyName
        Temperature = $disk.Temperature
      }
    }
  }
  if ($diskTemps.Count -gt 0) {
    $result.DiskTemperatures = $diskTemps
  }
} catch {}

# Ventiladores via WMI (limitado)
try {
  $fans = Get-WmiObject -Namespace 'root/wmi' -Class 'Fan_Info' -ErrorAction SilentlyContinue
  if (-not $fans) {
    $fans = Get-WmiObject Win32_Fan -ErrorAction SilentlyContinue
  }
  if ($fans) {
    foreach ($fan in $fans) {
      $result.Fans += @{
        Name = $fan.Name
        Speed = $fan.Speed
      }
    }
  }
} catch {}

$result | ConvertTo-Json -Compress
