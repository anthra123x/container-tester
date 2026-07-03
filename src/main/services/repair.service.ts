import { BrowserWindow } from 'electron'
import { writeFileSync, existsSync, unlinkSync, readFileSync } from 'fs'
import { join } from 'path'
import { runPowerShell } from './powershell'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import type { RepairTool, RepairProgress, RepairStage } from '../../shared/types/repair.types'

function sendProgress(progress: RepairProgress) {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
  if (win && !win.isDestroyed()) {
    win.webContents.send(IPC_CHANNELS.REPAIR_PROGRESS, progress)
  }
}

function repairCommand(tool: RepairTool): string {
  switch (tool) {
    case 'sfc': return 'sfc /scannow 2>&1'
    case 'dism': return 'DISM /Online /Cleanup-Image /RestoreHealth 2>&1'
    case 'chkdsk': return 'chkdsk C: /scan 2>&1'
  }
}

function toolLabel(tool: RepairTool): string {
  switch (tool) {
    case 'sfc': return 'SFC /scannow'
    case 'dism': return 'DISM /RestoreHealth'
    case 'chkdsk': return 'chkdsk /scan'
  }
}

export async function runRepair(tool: RepairTool): Promise<void> {
  const tmpDir = process.env.TEMP || process.env.TMP || 'C:\\Temp'
  const timestamp = Date.now()
  const logFile = join(tmpDir, `repair_log_${tool}_${timestamp}.txt`)
  const resultFile = join(tmpDir, `repair_result_${tool}_${timestamp}.json`)
  const scriptFile = join(tmpDir, `repair_${tool}_${timestamp}.ps1`)

  const escapedLogFile = logFile.replace(/\\/g, '\\\\')
  const escapedResultFile = resultFile.replace(/\\/g, '\\\\')
  const cmd = repairCommand(tool)
  const label = toolLabel(tool)

  const mainScript = `
$logFile = '${escapedLogFile}'
$resultFile = '${escapedResultFile}'
Remove-Item $logFile -ErrorAction SilentlyContinue
Remove-Item $resultFile -ErrorAction SilentlyContinue

function Write-Log { param($line)
  Add-Content -Path $logFile -Value "$(Get-Date -Format 'HH:mm:ss')|$line"
}

Write-Log "INIT:Iniciando ${label}..."

$output = ${cmd}
$trimmed = ($output | Out-String).Trim()
$output | ForEach-Object { Write-Log $_ }

$success = $LASTEXITCODE -eq 0

@{
  tool = '${tool}'
  success = $success
  output = $trimmed
  exitCode = $LASTEXITCODE
} | ConvertTo-Json -Compress | Set-Content -Path $resultFile

Write-Log "DONE:Finalizado (exit code: $LASTEXITCODE)"
`

  writeFileSync(scriptFile, mainScript, 'utf8')

  const wrapperScript = `
try {
  $p = Start-Process -FilePath "powershell.exe" -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${scriptFile.replace(/\\/g, '\\\\')}"' -Wait -Verb RunAs -PassThru -NoNewWindow -ErrorAction Stop
  Write-Output "EXIT:$($p.ExitCode)"
} catch {
  Write-Output "ERROR:$($_.Exception.Message)"
}
`

  sendProgress({ tool, stage: 'INIT', message: `Iniciando ${label}...`, logLines: [] })

  const pollTimer = setInterval(() => {
    try {
      if (!existsSync(logFile)) return
      const content = readFileSync(logFile, 'utf8')
      const lines = content.split('\n').filter(l => l.trim())
      const lastLine = lines[lines.length - 1] || ''
      const msg = lastLine.includes('|') ? lastLine.split('|').slice(1).join('|') : lastLine
      let stage: RepairStage = 'RUNNING'
      if (lastLine.includes('|DONE:')) stage = 'COMPLETE'
      else if (lastLine.includes('|INIT:')) stage = 'INIT'
      sendProgress({ tool, stage, message: msg, logLines: lines })
    } catch {}
  }, 1500)

  try {
    const result = await runPowerShell(wrapperScript, 600000)

    await new Promise(resolve => setTimeout(resolve, 1000))

    let finalOutput = ''
    let success = true
    let exitCode = 0

    if (existsSync(resultFile)) {
      try {
        const parsed = JSON.parse(readFileSync(resultFile, 'utf8'))
        finalOutput = parsed.output || ''
        success = parsed.success !== false
        exitCode = parsed.exitCode || 0
      } catch {}
    }

    let allLines: string[] = []
    if (existsSync(logFile)) {
      allLines = readFileSync(logFile, 'utf8').split('\n').filter(l => l.trim())
    }
    if (finalOutput) {
      const outputLines = finalOutput.split('\n').filter(l => l.trim())
      for (const ol of outputLines) {
        if (!allLines.some(l => l.includes(ol))) {
          allLines.push(ol)
        }
      }
    }

    if (result && result.startsWith('ERROR:')) {
      const errMsg = result.replace('ERROR:', '')
      sendProgress({ tool, stage: 'ERROR', message: `Error: ${errMsg}`, logLines: allLines })
      return
    }

    sendProgress({
      tool,
      stage: 'COMPLETE',
      message: success
        ? `${label} completado exitosamente`
        : `${label} reportó problemas (exit code: ${exitCode})`,
      logLines: allLines,
      progress: 100,
    })
  } catch (err: any) {
    sendProgress({ tool, stage: 'ERROR', message: `Error: ${err.message}`, logLines: [] })
  } finally {
    clearInterval(pollTimer)
    setTimeout(() => {
      for (const f of [scriptFile, logFile, resultFile]) {
        try { unlinkSync(f) } catch {}
      }
    }, 5000)
  }
}
