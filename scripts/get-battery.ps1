# Container Diagnostic Suite — v2
# Obtiene información detallada de la batería con tecnología, química, fabricación
# Uso: powershell -ExecutionPolicy Bypass -File get-battery.ps1

$result = @{
  HasBattery = $false
  InfoSources = @()
  Errors = @()
}

try {
  # ── Método 1: WMI BatteryStaticData (datos de fábrica) ──
  $staticData = Get-WmiObject -Namespace 'root\wmi' -Class BatteryStaticData -ErrorAction SilentlyContinue
  if ($staticData) {
    $result.HasBattery = $true
    $result.InfoSources += 'BatteryStaticData'
    $result.DesignCapacity_mWh = $staticData.DesignedCapacity
    $result.DesignCapacity_Wh = [math]::Round($staticData.DesignedCapacity / 1000, 2) if ($staticData.DesignedCapacity) else $null
    $result.ManufacturerName = $staticData.ManufacturerName
    $result.SerialNumber = $staticData.SerialNumber
    $result.SerialNumberClean = $staticData.SerialNumber -replace '[^a-zA-Z0-9]',''
    $result.Chemistry = switch ($staticData.Chemistry) {
      1 { 'Other' }; 2 { 'Unknown' }; 3 { 'Lead Acid' }
      4 { 'Nickel Cadmium' }; 5 { 'Nickel Metal Hydride' }
      6 { 'Lithium Ion' }; 7 { 'Lithium Polymer' }
      8 { 'Lithium Iron Phosphate' }; 9 { 'Silver Oxide' }
      10 { 'Zinc Air' }; default { "Type $($staticData.Chemistry)" }
    }
    $result.DesignVoltage_V = [math]::Round($staticData.DesignedVoltage / 1000, 3) if ($staticData.DesignedVoltage) else $null
    if ($staticData.ManufactureDate) {
      $dateStr = $staticData.ManufactureDate.ToString()
      $result.ManufactureDate = $dateStr
      try {
        if ($dateStr -match '^\d{4}$') {
          $result.ManufactureYear = [int]$dateStr
          $result.BatteryAgeYears = [math]::Round(((Get-Date) - (Get-Date -Year $result.ManufactureYear -Month 1 -Day 1)).TotalDays / 365.25, 1)
        }
      } catch { }
    }
    if ($staticData.UniqueID) { $result.UniqueID = $staticData.UniqueID }
    if ($staticData.UserTemperature) { $result.UserTemperature_K = $staticData.UserTemperature }
  }
} catch { $result.Errors += "BatteryStaticData: $_" }

try {
  # ── Método 2: BatteryFullChargedCapacity (capacidad actual) ──
  $fullCharged = Get-WmiObject -Namespace 'root\wmi' -Class BatteryFullChargedCapacity -ErrorAction SilentlyContinue
  if ($fullCharged) {
    $result.HasBattery = $true
    if ('BatteryStaticData' -notin $result.InfoSources) { $result.InfoSources += 'BatteryFullChargedCapacity' }
    else { $result.InfoSources += 'BatteryFullChargedCapacity' }
    $result.DesignCapacity_mWh = if (-not $result.ContainsKey('DesignCapacity_mWh')) { $fullCharged.DesignedCapacity } else { $result.DesignCapacity_mWh }
    $result.FullChargedCapacity_mWh = $fullCharged.FullChargedCapacity
    $result.FullChargedCapacity_Wh = [math]::Round($fullCharged.FullChargedCapacity / 1000, 2)
  }
} catch { $result.Errors += "BatteryFullChargedCapacity: $_" }

try {
  # ── Método 3: BatteryStatus (estado en vivo) ──
  $status = Get-WmiObject -Namespace 'root\wmi' -Class BatteryStatus -ErrorAction SilentlyContinue
  if ($status) {
    $result.HasBattery = $true
    $result.InfoSources += 'BatteryStatus'
    $result.CurrentCapacity_mWh = $status.RemainingCapacity
    $result.CurrentCapacity_Wh = [math]::Round($status.RemainingCapacity / 1000, 2) if ($status.RemainingCapacity) else $null
    $result.ChargeRate_mW = $status.ChargeRate
    $result.ChargeRate_W = [math]::Round($status.ChargeRate / 1000, 2) if ($status.ChargeRate) else $null
    $result.DischargeRate_mW = $status.DischargeRate
    $result.DischargeRate_W = [math]::Round($status.DischargeRate / 1000, 2) if ($status.DischargeRate) else $null
    $result.Voltage_mV = $status.Voltage
    $result.Voltage_V = [math]::Round($status.Voltage / 1000, 3) if ($status.Voltage) else $null
    $result.IsCharging = ($status.Charging -eq 1)
    $result.IsDischarging = ($status.Discharging -eq 1)
    $result.CriticalBias = $status.CriticalBias
    $result.CycleCount = $status.CycleCount
    $result.RemainingCapacityPercent = if ($result.FullChargedCapacity_mWh -and $status.RemainingCapacity) {
      [math]::Round($status.RemainingCapacity / $result.FullChargedCapacity_mWh * 100, 1)
    } else { $null }
  }
} catch { $result.Errors += "BatteryStatus: $_" }

try {
  # ── Método 4: Win32_Battery (información estándar) ──
  $win32Battery = Get-WmiObject Win32_Battery -ErrorAction SilentlyContinue
  if ($win32Battery) {
    $result.HasBattery = $true
    $result.InfoSources += 'Win32_Battery'
    $result.BatteryStatus_Win32 = switch ($win32Battery.BatteryStatus) {
      1 { 'Discharging' }; 2 { 'AC Connected' }; 3 { 'Fully Charged' }
      4 { 'Low' }; 5 { 'Critical' }; 6 { 'Charging' }
      7 { 'Charging High' }; 8 { 'Charging Low' }; 9 { 'Charging Critical' }
      10 { 'Undefined' }; 11 { 'Partially Charged' }; default { "Unknown ($($win32Battery.BatteryStatus))" }
    }
    $result.EstimatedChargeRemaining_pct = $win32Battery.EstimatedChargeRemaining
    $result.EstimatedRunTime_min = $win32Battery.EstimatedRunTime
    $result.EstimatedRunTime_hours = if ($win32Battery.EstimatedRunTime -gt 0) {
      [math]::Round($win32Battery.EstimatedRunTime / 60, 1)
    } else { $null }
    $result.ExpectedLife_cycles = $win32Battery.ExpectedLife
    $result.MaxRechargeTime_min = $win32Battery.MaxRechargeTime
    $result.DesignCapacityWin32_mWh = $win32Battery.DesignCapacity
    $result.FullChargeCapacityWin32_mWh = $win32Battery.FullChargeCapacity
    $result.Chemistry = $win32Battery.Chemistry
    $result.SmartBatteryVersion = $win32Battery.SmartBatteryVersion
  }
} catch { $result.Errors += "Win32_Battery: $_" }

try {
  # ── Método 5: powercfg /batteryreport (informe detallado) ──
  $reportPath = "$env:TEMP\battery-report-$(Get-Date -Format yyyyMMddHHmmss).html"
  powercfg /batteryreport /output $reportPath -ErrorAction SilentlyContinue | Out-Null
  if (Test-Path $reportPath) {
    $reportContent = Get-Content $reportPath -Raw -ErrorAction SilentlyContinue
    if ($reportContent) {
      $result.InfoSources += 'powercfg'
      $result.PowerCfgReportPath = $reportPath
      # Extraer datos clave del HTML
      if ($reportContent -match 'DESIGN CAPACITY[^0-9]*([\d,]+)\s*mWh') {
        $result.DesignCapacity_powercfg = [int]($Matches[1] -replace ',','')
      }
      if ($reportContent -match 'FULL CHARGE CAPACITY[^0-9]*([\d,]+)\s*mWh') {
        $result.FullChargeCapacity_powercfg = [int]($Matches[1] -replace ',','')
      }
      if ($reportContent -match 'CYCLE COUNT[^0-9]*([\d,]+)') {
        $result.CycleCount_powercfg = [int]($Matches[1] -replace ',','')
      }
      if ($reportContent -match 'BATTERY SERIAL NUMBER[^0-9]*([^\s<]+)') {
        $result.SerialNumber_powercfg = $Matches[1].Trim()
      }
      if ($reportContent -match 'MANUFACTURER[^a-zA-Z]*([^<]+)') {
        $result.Manufacturer_powercfg = $Matches[1].Trim()
      }
      if ($reportContent -match 'CHEMISTRY[^a-zA-Z]*([^<]+)') {
        $result.Chemistry_powercfg = $Matches[1].Trim()
      }
      if ($reportContent -match 'MANUFACTURE DATE[^0-9]*([^<\n]+)') {
        $result.ManufactureDate_powercfg = $Matches[1].Trim()
      }
    }
  }
} catch { $result.Errors += "powercfg: $_" }

function Get-BestValue($sources, $key) {
  foreach ($s in $sources) { if ($s) { return $s } }
  return $null
}

# Calcular desgaste y salud
$design = Get-BestValue @($result.DesignCapacity_mWh, $result.DesignCapacityWin32_mWh, $result.DesignCapacity_powercfg)
$full = Get-BestValue @($result.FullChargedCapacity_mWh, $result.FullChargeCapacityWin32_mWh, $result.FullChargeCapacity_powercfg)

if ($design -and $design -gt 0 -and $full -and $full -gt 0) {
  $result.WearLevel_pct = [math]::Round((1 - $full / $design) * 100, 2)
  $result.Health_pct = [math]::Round(100 - $result.WearLevel_pct, 2)
  if ($design -gt 0) {
    $result.DesignCapacity_Wh = [math]::Round($design / 1000, 2)
  }
} else {
  $result.WearLevel_pct = $null
  $result.Health_pct = $null
}

$result | ConvertTo-Json -Depth 5 -Compress
