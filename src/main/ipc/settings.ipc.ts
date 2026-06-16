import { ipcMain, dialog, app } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const SETTINGS_FILE = join(app.getPath('userData'), 'cds-settings.json')

interface AppSettings {
  technician?: string
  theme?: 'light' | 'dark'
  outputDir?: string
}

async function loadSettings(): Promise<AppSettings> {
  try {
    const data = await readFile(SETTINGS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

async function saveSettings(settings: AppSettings): Promise<void> {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
}

export function registerSettingsIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (): Promise<AppSettings> => {
    return loadSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, settings: AppSettings): Promise<void> => {
    await saveSettings(settings)
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SELECT_DIR, async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Seleccionar directorio de reportes'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })
}
