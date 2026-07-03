import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import { runRepair } from '../services/repair.service'
import type { RepairTool } from '../../shared/types/repair.types'

export function registerRepairIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.REPAIR_RUN, async (_, tool: RepairTool) => {
    try {
      await runRepair(tool)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Error desconocido' }
    }
  })
}
