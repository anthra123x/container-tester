import { ipcMain, BrowserWindow } from 'electron'
import { join } from 'path'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import { runPowerShell } from '../services/powershell'

let screenTestWindow: BrowserWindow | null = null
let usbMonitorInterval: ReturnType<typeof setInterval> | null = null
let lastUsbDevices: string[] = []

function createScreenTestWindow(): BrowserWindow {
  const win = new BrowserWindow({
    fullscreen: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000']
  const html = `<!DOCTYPE html>
<html><body style="margin:0;overflow:hidden;background:${colors[0]}">
<script>
let idx = 0; const cols = ${JSON.stringify(colors)};
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { window.close(); return; }
  if (e.key === ' ' || e.key === 'ArrowRight') {
    idx = (idx + 1) % cols.length;
    document.body.style.background = cols[idx];
  }
  if (e.key === 'ArrowLeft') {
    idx = (idx - 1 + cols.length) % cols.length;
    document.body.style.background = cols[idx];
  }
});
document.addEventListener('click', () => { idx = (idx + 1) % cols.length; document.body.style.background = cols[idx]; });
document.addEventListener('contextmenu', (e) => { e.preventDefault(); window.close(); });
<\/script></body></html>`

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  return win
}

export function registerManualTestsIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.MANUAL_SCREEN_TEST, async (): Promise<void> => {
    if (screenTestWindow && !screenTestWindow.isDestroyed()) {
      screenTestWindow.close()
    }
    screenTestWindow = createScreenTestWindow()
    screenTestWindow.on('closed', () => {
      screenTestWindow = null
    })
  })

  ipcMain.handle(IPC_CHANNELS.MANUAL_KEYBOARD_TEST, async (): Promise<void> => {
    const mainWin = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (mainWin) {
      mainWin.webContents.send(IPC_CHANNELS.MANUAL_KEYBOARD_TEST, { action: 'start' })
    }
  })

  ipcMain.handle(IPC_CHANNELS.MANUAL_TOUCHPAD_TEST, async (): Promise<void> => {
    const mainWin = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (mainWin) {
      mainWin.webContents.send(IPC_CHANNELS.MANUAL_TOUCHPAD_TEST, { action: 'start' })
    }
  })

  ipcMain.handle(IPC_CHANNELS.MANUAL_MIC_RECORD, async (): Promise<string> => {
    const outputFile = join(__dirname, '../../temp/mic-recording.wav')
    const escapedPath = outputFile.replace(/\\/g, '\\\\')
    const script = [
      'Add-Type -AssemblyName System.Windows.Forms',
      '$capture = New-Object System.Media.SoundPlayer',
      '$tempFile = "' + escapedPath + '"',
      '',
      '$mci = @\"',
      '  using System.Runtime.InteropServices;',
      '  public class MCI {',
      '    [DllImport("winmm.dll")]',
      '    public static extern int mciSendString(string lpstrCommand, string lpstrReturnString, int uReturnLength, int hwndCallback);',
      '  }',
      '@\"',
      'Add-Type -TypeDefinition $mci',
      '',
      '[MCI]::mciSendString("open new type waveaudio alias capture", "", 0, 0)',
      '[MCI]::mciSendString("record capture", "", 0, 0)',
      'Start-Sleep -Seconds 5',
      '[MCI]::mciSendString("save capture " + [char]34 + $tempFile + [char]34, "", 0, 0)',
      '[MCI]::mciSendString("close capture", "", 0, 0)',
      '',
      'if (Test-Path $tempFile) { Write-Output "OK" } else { Write-Output "FAIL" }'
    ].join('\n')
    return runPowerShell(script)
  })

  ipcMain.handle(IPC_CHANNELS.MANUAL_AUDIO_PLAY, async (_event, frequency?: number, duration?: number): Promise<void> => {
    const freq = frequency ?? 440
    const dur = duration ?? 2000
    const script = `
      [System.Console]::Beep(${freq}, ${dur})
      Write-Output "OK"
    `
    await runPowerShell(script)
  })

  ipcMain.handle(IPC_CHANNELS.MANUAL_USB_MONITOR_START, async (): Promise<void> => {
    if (usbMonitorInterval) return

    const getUsbDevices = async (): Promise<string[]> => {
      const script = `
        Get-PnpDevice -Class USB | Where-Object { $_.Status -eq 'OK' } | ForEach-Object { $_.FriendlyName }
      `
      const result = await runPowerShell(script)
      return result.split('\n').filter(Boolean).map(s => s.trim())
    }

    lastUsbDevices = await getUsbDevices()

    usbMonitorInterval = setInterval(async () => {
      const currentDevices = await getUsbDevices()
      const mainWin = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]

      const added = currentDevices.filter(d => !lastUsbDevices.includes(d))
      const removed = lastUsbDevices.filter(d => !currentDevices.includes(d))

      if (added.length > 0 || removed.length > 0) {
        lastUsbDevices = currentDevices
        if (mainWin && !mainWin.isDestroyed()) {
          mainWin.webContents.send(IPC_CHANNELS.MANUAL_USB_EVENT, {
            added,
            removed,
            devices: currentDevices
          })
        }
      }
    }, 2000)
  })

  ipcMain.handle(IPC_CHANNELS.MANUAL_USB_MONITOR_STOP, async (): Promise<void> => {
    if (usbMonitorInterval) {
      clearInterval(usbMonitorInterval)
      usbMonitorInterval = null
    }
  })
}
