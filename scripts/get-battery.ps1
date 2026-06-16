# Container Diagnostic Suite
# Obtiene información detallada de la batería
# Uso: powershell -ExecutionPolicy Bypass -File get-battery.ps1

$result = @{
  HasBattery = $false
}

# Método 1: WMI - BatteryStaticData (capacidad de diseño)
try {
  $staticData = Get-WmiObject -Namespace 'root\wmi' -Class BatteryStaticData -ErrorAction SilentlyContinue
  if ($staticData) {
    $result.HasBattery = $true
    $result.DesignCapacity = $staticData.DesignedCapacity
    $result.ManufacturerName = $staticData.ManufacturerName
    $result.SerialNumber = $staticData.SerialNumber
    $result.Chemistry = $staticData.Chemistry
    $result.DesignVoltage = $staticData.DesignedVoltage
  }
} catch {
  # No battery data available
}

# Método 2: WMI - BatteryFullChargedCapacity (capacidad actual máxima)
try {
  $fullCharged = Get-WmiObject -Namespace 'root\wmi' -Class BatteryFullChargedCapacity -ErrorAction SilentlyContinue
  if ($fullCharged) {
    $result.HasBattery = $true
    $result.FullChargedCapacity = $fullCharged.FullChargedCapacity
  }
} catch {}

# Método 3: WMI - BatteryStatus (estado actual)
try {
  $status = Get-WmiObject -Namespace 'root\wmi' -Class BatteryStatus -ErrorAction SilentlyContinue
  if ($status) {
    $result.HasBattery = $true
    $result.CurrentCapacity = $status.RemainingCapacity
    $result.ChargeRate = $status.ChargeRate
    $result.DischargeRate = $status.DischargeRate
    $result.Voltage = $status.Voltage
    $result.IsCharging = ($status.Charging -eq 1)
    $result.IsDischarging = ($status.Discharging -eq 1)
    $result.CriticalBias = $status.CriticalBias
    $result.CycleCount = $status.CycleCount
  }
} catch {}

# Método 4: Win32_Battery (información estándar)
try {
  $win32Battery = Get-WmiObject Win32_Battery -ErrorAction SilentlyContinue
  if ($win32Battery) {
    $result.HasBattery = $true
    $result.BNS = if ($result.HasBattery -eq $true) { $result.BNS = $null }
    $result.BatteryStatus = $win32Battery.BatteryStatus
    $result.EstimatedChargeRemaining = $win32Battery.EstimatedChargeRemaining
    $result.EstimatedRunTime = $win32Battery.EstimatedRunTime
    $result.ExpectedLife = $win32Battery.ExpectedLife
    $result.MaxRechargeTime = $win32Battery.MaxRechargeTime
    $result.DesignCapacityWin32 = $win32Battery.DesignCapacity
    $result.FullChargeCapacity = $win32Battery.FullChargeCapacity
    $result.Chemistry = $win32Battery.Chemistry
  }
} catch {}

# Calcular salud y desgaste
if ($result.DesignCapacity -and $result.FullChargedCapacity) {
  $result.WearLevel = [math]::Round((1 - $result.FullChargedCapacity / $result.DesignCapacity) * 100, 1)
} elseif ($result.DesignCapacityWin32 -and $result.FullChargeCapacity) {
  $result.WearLevel = [math]::Round((1 - $result.FullChargeCapacity / $result.DesignCapacityWin32) * 100, 1)
} else {
  $result.WearLevel = $null
}

$result | ConvertTo-Json -Compress
