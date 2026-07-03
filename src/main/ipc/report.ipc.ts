import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import { generateReport } from '../services/report.service'
import type { ReportData } from '../../shared/types/report.types'

export function registerReportIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.REPORT_GENERATE, async (_, data: ReportData) => {
    try {
      const filePath = await generateReport(data)
      return { success: true, filePath }
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al generar reporte' }
    }
  })
}
