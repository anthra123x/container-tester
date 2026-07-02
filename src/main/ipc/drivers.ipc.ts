import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import { scanDrivers, checkDriverUpdates, installDriverUpdates } from '../services/drivers.service'

export function registerDriversIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.DRIVERS_SCAN, async () => {
    try {
      return await scanDrivers()
    } catch {
      return { drivers: [], problematicCount: 0, problematics: [], totalCount: 0, error: 'Error interno' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.DRIVERS_CHECK_UPDATES, async () => {
    try {
      return await checkDriverUpdates()
    } catch {
      return { updates: [], totalCount: 0, error: 'Error interno' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.DRIVERS_INSTALL_UPDATES, async () => {
    try {
      await installDriverUpdates()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error desconocido' }
    }
  })
}
