# Container Diagnostic Suite — v2
# Verifica estado de todos los drivers del sistema con detalle de errores
# Uso: powershell -ExecutionPolicy Bypass -File get-drivers.ps1

$result = @{
  TotalDrivers = 0
  TotalDevices = 0
  ProblemDrivers = @()
  MissingDrivers = @()
  DeviceClasses = @{}
  DriverStats = @{}
  Errors = @()
  TimeStamp = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
}

try {
  # ── Signed Drivers (filtrados con DeviceName no nulo) ──
  $drivers = Get-WmiObject Win32_PnPSignedDriver -ErrorAction SilentlyContinue | Where-Object { $_.DeviceName -ne $null }
  $result.TotalDrivers = $drivers.Count

  $signedCount = 0
  $unsignedCount = 0
  $noDateCount = 0
  $problemCount = 0

  $problemDrivers = $drivers | Where-Object {
    $_.DriverDate -eq $null -or
    $_.DriverVersion -eq $null -or
    $_.IsSigned -eq $false
  }

  foreach ($d in $problemDrivers) {
    $problemCount++
    $driverObj = @{
      DeviceName = $d.DeviceName
      DeviceClass = $d.DeviceClass
      DriverDate = if ($d.DriverDate) { $d.DriverDate.ToString('yyyy-MM-dd') } else { $null }
      DriverVersion = $d.DriverVersion
      IsSigned = $d.IsSigned
      Manufacturer = $d.Manufacturer
      DriverProviderName = $d.DriverProviderName
      DriverKey = $d.DeviceID
      InfName = $d.InfName
      HardwareID = $d.HardwareID -join '; '
      Problem = if (-not $d.DriverDate) { 'Sin fecha de driver' }
                elseif (-not $d.DriverVersion) { 'Sin versión de driver' }
                elseif (-not $d.IsSigned) { 'Driver no firmado' }
                else { 'Desconocido' }
    }
    $result.ProblemDrivers += $driverObj
  }

  # Estadísticas
  $signedCount = ($drivers | Where-Object { $_.IsSigned -eq $true }).Count
  $unsignedCount = ($drivers | Where-Object { $_.IsSigned -eq $false }).Count
  $noDateCount = ($drivers | Where-Object { $_.DriverDate -eq $null }).Count

  $result.DriverStats = @{
    Signed = $signedCount
    Unsigned = $unsignedCount
    NoDriverDate = $noDateCount
    ProblemDrivers = $problemCount
    OkDrivers = $result.TotalDrivers - $problemCount
  }
} catch { $result.Errors += "SignedDrivers: $_" }

try {
  # ── PnP Entities (dispositivos con problemas) ──
  $allDevices = Get-WmiObject Win32_PnPEntity -ErrorAction SilentlyContinue
  $result.TotalDevices = $allDevices.Count

  # Clasificar por clase
  $classGroups = $allDevices | Group-Object { $_.ClassGuid } -ErrorAction SilentlyContinue
  foreach ($group in $classGroups) {
    $className = try {
      $cls = Get-WmiObject -Namespace 'root/cimv2' -Class Win32_SystemDriver -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -eq $group.Name } | Select-Object -First 1
      if (-not $cls) { $group.Name } else { $cls.DisplayName }
    } catch { $group.Name }
    $result.DeviceClasses[$className] = $group.Count
  }

  $problemDevices = $allDevices | Where-Object {
    $_.ConfigManagerErrorCode -ne $null -and $_.ConfigManagerErrorCode -ne 0
  }

  foreach ($d in $problemDevices) {
    $errorCode = $d.ConfigManagerErrorCode
    $errorDesc = switch ($errorCode) {
      1 { 'Dispositivo no configurado correctamente' }
      2 { 'No se pudo cargar el driver' }
      3 { 'Driver corrupto' }
      4 { 'No se pudo iniciar' }
      5 { 'Fallo en la asignación de recursos' }
      6 { 'No se pudo cargar el driver' }
      7 { 'No se pudieron cargar los filtros' }
      8 { 'No se encontró el driver' }
      9 { 'No hay información del registro' }
      10 { 'Dispositivo no puede iniciar' }
      11 { 'Fallo en el driver' }
      12 { 'Sin recursos suficientes' }
      13 { 'No se encontró el driver' }
      14 { 'Requiere reinicio del sistema' }
      15 { 'ROM BIOS conflict' }
      16 { 'Dispositivo no detectado' }
      17 { 'Reinstalar driver' }
      18 { 'Reinstalar driver' }
      19 { 'Registro dañado' }
      20 { 'Fallo en el registro' }
      21 { 'Sistema removed el dispositivo' }
      22 { 'Dispositivo deshabilitado' }
      23 { 'Dispositivo no presente' }
      24 { 'Dispositivo no presente' }
      25 { 'Dispositivo no presente' }
      26 { 'Dispositivo no configurado' }
      27 { 'No hay drivers compatibles' }
      28 { 'Driver no instalado' }
      29 { 'Firmware deshabilitado' }
      30 { 'IRQ conflict' }
      31 { 'Driver falló al cargar (secundario)' }
      32 { 'Driver deshabilitado por otro servicio' }
      33 { 'BIOS conflict detectado' }
      34 { 'No se puede determinar recursos' }
      35 { 'No hay drivers disponibles' }
      36 { 'Dispositivo requiere firmware' }
      37 { 'No se pudo configurar el driver' }
      38 { 'Dispositivo no disponible' }
      39 { 'Driver corrupto o memoria insuficiente' }
      40 { 'No hay información del servicio' }
      41 { 'Windows no puede acceder al dispositivo' }
      42 { 'No hay drivers compatibles' }
      43 { 'Driver reportó fallo de hardware' }
      44 { 'Aplicación o sistema operativo cerró el dispositivo' }
      45 { 'Dispositivo no conectado' }
      46 { 'No hay acceso al dispositivo' }
      47 { 'No se pudo cargar el driver' }
      48 { 'No se puede iniciar: software bloqueado' }
      49 { 'No se puede iniciar: tamaño de registro excedido' }
      default { "Error desconocido ($errorCode)" }
    }

    $missingObj = @{
      DeviceName = $d.Name
      DeviceID = $d.DeviceID
      DeviceClass = $d.ClassGuid
      PNPClass = $d.PNPClass
      Manufacturer = $d.Manufacturer
      ErrorCode = $errorCode
      ErrorDescription = $errorDesc
      HardwareID = $d.HardwareID -join '; '
      Service = $d.Service
      Status = $d.Status
      ConfigManagerErrorCode = $errorCode
      ConfigManagerUserConfig = $d.ConfigManagerUserConfig
      Problem = $errorDesc
      Severity = if ($errorCode -in @(1, 10, 14, 18, 22, 28, 31, 43)) { 'HIGH' }
                 elseif ($errorCode -in @(12, 21, 24, 29, 32, 33, 41)) { 'MEDIUM' }
                 else { 'LOW' }
    }
    $result.MissingDrivers += $missingObj
  }

  # Estadísticas de dispositivos con problemas
  $highCount = ($result.MissingDrivers | Where-Object { $_.Severity -eq 'HIGH' }).Count
  $medCount = ($result.MissingDrivers | Where-Object { $_.Severity -eq 'MEDIUM' }).Count
  $lowCount = ($result.MissingDrivers | Where-Object { $_.Severity -eq 'LOW' }).Count

  $result.DeviceProblemSummary = @{
    TotalProblemDevices = $result.MissingDrivers.Count
    HighSeverity = $highCount
    MediumSeverity = $medCount
    LowSeverity = $lowCount
    HealthyDevices = $result.TotalDevices - $result.MissingDrivers.Count
  }
} catch { $result.Errors += "PnPEntities: $_" }

try {
  # ── Servicios de drivers ──
  $driverServices = Get-WmiObject Win32_SystemDriver -ErrorAction SilentlyContinue |
    Where-Object { $_.State -ne 'Running' -and $_.StartMode -eq 'Auto' -and $_.ServiceType -eq 'KernelDriver' }
  if ($driverServices) {
    $result.StoppedCriticalServices = foreach ($s in $driverServices) {
      @{
        Name = $s.Name
        DisplayName = $s.DisplayName
        State = $s.State
        StartMode = $s.StartMode
        ServiceType = $s.ServiceType
        PathName = $s.PathName
      }
    }
  }
} catch { $result.Errors += "DriverServices: $_" }

try {
  # ── Drivers de video ──
  $videoControllers = Get-WmiObject Win32_VideoController -ErrorAction SilentlyContinue
  $result.VideoControllers = @()
  foreach ($vc in $videoControllers) {
    $result.VideoControllers += @{
      Name = $vc.Name
      DriverVersion = $vc.DriverVersion
      DriverDate = $vc.DriverDate
      Status = $vc.Status
      VideoProcessor = $vc.VideoProcessor
      VideoArchitecture = switch ($vc.VideoArchitecture) {
        1 {'Other'}; 2 {'Unknown'}; 3 {'CGA'}; 4 {'EGA'}; 5 {'VGA'}
        6 {'SVGA'}; 7 {'MDA'}; 8 {'HGC'}; 9 {'MCGA'}
        10 {'8514A'}; 11 {'XGA'}; 12 {'LinVideo8'}; 13 {'XVGA'}
        default {"Arch_$($vc.VideoArchitecture)"}
      }
      AdapterRAM_GB = if ($vc.AdapterRAM) { [math]::Round($vc.AdapterRAM / 1GB, 2) } else { $null }
      InstalledDisplayDrivers = $vc.InstalledDisplayDrivers
      DriverProvider = $vc.DriverProvider
    }
  }
} catch { $result.Errors += "Video: $_" }

try {
  # ── Dispositivos ocultos ──
  $hidden = Get-WmiObject Win32_PnPEntity -ErrorAction SilentlyContinue |
    Where-Object { $_.ConfigManagerErrorCode -ne $null -and $_.ConfigManagerErrorCode -ne 0 -and $_.Status -eq 'Unknown' }
  $result.HiddenProblemDevices = $hidden.Count
} catch { }

$result | ConvertTo-Json -Depth 10 -Compress
