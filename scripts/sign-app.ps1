# Container Diagnostic Suite
# Script de preparación para firma digital del ejecutable
# 
# REQUISITOS:
#   1. Certificado de firma de código (Code Signing Certificate)
#   2. Windows SDK con signtool.exe instalado
#   3. Ejecutar como Administrador
#
# USO:
#   .\sign-app.ps1 -CertificatePath "C:\ruta\certificado.pfx" -CertificatePassword "password"
#
# NOTA: Este script es una plantilla. Reemplaza las rutas con tus valores reales.

param(
  [Parameter(Mandatory = $true)]
  [string]$CertificatePath,

  [Parameter(Mandatory = $false)]
  [string]$CertificatePassword = "",

  [Parameter(Mandatory = $false)]
  [string]$TimestampServer = "http://timestamp.digicert.com",

  [Parameter(Mandatory = $false)]
  [string]$AppPath = "..\dist\win-unpacked\Container Diagnostic Suite.exe"
)

# Buscar signtool.exe
$signtoolPaths = @(
  "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe",
  "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x86\signtool.exe",
  "${env:ProgramFiles}\Microsoft SDKs\Windows\v7.1\Bin\signtool.exe"
)

$signtool = $null
foreach ($pattern in $signtoolPaths) {
  $found = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($found) {
    $signtool = $found.FullName
    break
  }
}

if (-not $signtool) {
  Write-Error "signtool.exe no encontrado. Instala Windows SDK."
  exit 1
}

Write-Host "=== Firma Digital - Container Diagnostic Suite ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Herramienta: $signtool"
Write-Host "Certificado: $CertificatePath"
Write-Host "Servidor timestamp: $TimestampServer"
Write-Host "Aplicación: $AppPath"
Write-Host ""

if (-not (Test-Path $AppPath)) {
  Write-Error "No se encuentra: $AppPath. Ejecuta 'npm run pack' primero."
  exit 1
}

$argsList = @(
  "sign",
  "/fd", "sha256",
  "/a",
  "/f", "`"$CertificatePath`""
)

if ($CertificatePassword) {
  $argsList += @("/p", $CertificatePassword)
}

$argsList += @(
  "/tr", $TimestampServer,
  "/td", "sha256",
  "`"$AppPath`""
)

Write-Host "Ejecutando: $signtool $($argsList -join ' ')" -ForegroundColor Yellow
Write-Host ""

# En un entorno real, se ejecutaría:
# & $signtool $argsList

Write-Host "⚠️  Ejecución desactivada - Reemplaza los parámetros y elimina esta línea para firmar." -ForegroundColor Red
Write-Host ""
Write-Host "Comando completo:" -ForegroundColor Cyan
Write-Host "  & '$signtool' sign /fd sha256 /a /f `"$CertificatePath`" /p `"$CertificatePassword`" /tr $TimestampServer /td sha256 `"$AppPath`"" -ForegroundColor Gray
