import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import type { Diagnostic } from '../../shared/types/diagnostic.types'
import { getAllDiagnostics, searchDiagnostics, getDiagnosticById } from '../database/repositories/diagnostic.repo'
import { dbRun } from '../database/db-wrapper'

export function registerHistoryIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.HISTORY_LIST, async (): Promise<Diagnostic[]> => {
    return (await getAllDiagnostics()) as unknown as Diagnostic[]
  })

  ipcMain.handle(IPC_CHANNELS.HISTORY_SEARCH, async (_event, query: string): Promise<Diagnostic[]> => {
    return (await searchDiagnostics(query)) as unknown as Diagnostic[]
  })

  ipcMain.handle(IPC_CHANNELS.HISTORY_GET, async (_event, id: string): Promise<Diagnostic | null> => {
    const result = await getDiagnosticById(id)
    return (result as unknown as Diagnostic) || null
  })

  ipcMain.handle(IPC_CHANNELS.HISTORY_DELETE, async (_event, id: string): Promise<boolean> => {
    const result = await dbRun('DELETE FROM diagnostics WHERE id = ?', [id])
    return result.changes > 0
  })
}
