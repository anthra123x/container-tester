import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import { execFileSync, spawn } from 'child_process'
import { registerAllIpcHandlers } from './ipc'

// ── Auto-elevation on Windows ──────────────────────────────────
// Checks if running as admin and restarts elevated if not
if (process.platform === 'win32' && app.isPackaged) {
  try {
    execFileSync('net', ['session'], { timeout: 2000, stdio: 'ignore' })
  } catch {
    spawn('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
      `Start-Process -FilePath "${process.execPath}" -Verb RunAs`,
    ], { detached: true, stdio: 'ignore' })
    process.exit(0)
  }
}

let mainWindow: BrowserWindow | null = null

app.disableHardwareAcceleration()

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('main-process-error', err.message)
  }
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    show: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.webContents.on('crashed', () => {
    console.error('Renderer process crashed')
  })

  mainWindow.webContents.on('unresponsive', () => {
    console.warn('Renderer process unresponsive')
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  try {
    await mkdir(join(app.getPath('temp'), 'cds-audio'), { recursive: true })
    registerAllIpcHandlers()
    createWindow()
  } catch (err) {
    console.error('Failed to initialize app:', err)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
