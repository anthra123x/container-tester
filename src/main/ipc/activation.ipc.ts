import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import { getWindowsActivationStatus, getOfficeActivationStatus, downloadAndRunMAS } from '../services/activation.service'

export function registerActivationIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.ACTIVATION_GET_WINDOWS, async () => {
    try {
      return await getWindowsActivationStatus()
    } catch {
      return null
    }
  })

  ipcMain.handle(IPC_CHANNELS.ACTIVATION_GET_OFFICE, async () => {
    try {
      return await getOfficeActivationStatus()
    } catch {
      return null
    }
  })

  ipcMain.handle(IPC_CHANNELS.ACTIVATION_RUN_MAS, async (_event, target: 'windows' | 'office' | 'both') => {
    try {
      await downloadAndRunMAS(target)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error desconocido' }
    }
  })
}
