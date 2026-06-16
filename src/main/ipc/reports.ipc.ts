import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import type { Diagnostic, DiagnosticResult } from '../../shared/types/diagnostic.types'
import { getAllDiagnostics, getDiagnosticById } from '../database/repositories/diagnostic.repo'
import { dbAll } from '../database/db-wrapper'
import type { ManualTestResult } from '../../shared/types/diagnostic.types'

export function registerReportsIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.REPORT_LIST, async (): Promise<Diagnostic[]> => {
    const diagnostics = await getAllDiagnostics(100, 0)
    const result: Diagnostic[] = []

    for (const d of diagnostics) {
      const rows = await dbAll<Record<string, unknown>>(
        'SELECT * FROM diagnostic_results WHERE diagnostic_id = ?', [d.id]
      )
      const manualRows = await dbAll<Record<string, unknown>>(
        'SELECT * FROM manual_tests WHERE diagnostic_id = ?', [d.id]
      )
      result.push({
        id: d.id,
        deviceId: d.deviceId,
        startedAt: d.startedAt,
        completedAt: d.completedAt || undefined,
        status: d.status,
        summary: d.summary || undefined,
        results: rows.map(r => ({
          id: r.id as string,
          category: r.category as DiagnosticResult['category'],
          testName: r.test_name as string,
          status: r.status as DiagnosticResult['status'],
          value: (r.value as string) || undefined,
          observations: (r.observations as string) || undefined
        })),
        manualTests: manualRows.map(r => ({
          id: r.id as string,
          testType: r.test_type as ManualTestResult['testType'],
          result: r.result as ManualTestResult['result'],
          details: r.details ? JSON.parse(r.details as string) as Record<string, unknown> : undefined,
          observations: (r.observations as string) || undefined
        }))
      })
    }

    return result.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
  })

  ipcMain.handle(IPC_CHANNELS.REPORT_GET, async (_event, id: string): Promise<Diagnostic | null> => {
    const diagnostic = await getDiagnosticById(id)
    if (!diagnostic) return null

    const manualRows = await dbAll<Record<string, unknown>>(
      'SELECT * FROM manual_tests WHERE diagnostic_id = ?', [id]
    )

    return {
      id: diagnostic.id,
      deviceId: diagnostic.deviceId,
      startedAt: diagnostic.startedAt,
      completedAt: diagnostic.completedAt || undefined,
      status: diagnostic.status,
      summary: diagnostic.summary || undefined,
      results: diagnostic.results.map(r => ({
        id: r.id,
        category: r.category as DiagnosticResult['category'],
        testName: r.testName,
        status: r.status as DiagnosticResult['status'],
        value: r.value || undefined,
        observations: r.observations || undefined
      })),
      manualTests: manualRows.map(r => ({
        id: r.id as string,
        testType: r.test_type as ManualTestResult['testType'],
        result: r.result as ManualTestResult['result'],
        details: r.details ? JSON.parse(r.details as string) as Record<string, unknown> : undefined,
        observations: (r.observations as string) || undefined
      }))
    }
  })
}
