import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import type { Diagnostic } from '../../shared/types/diagnostic.types'
import {
  createDiagnostic,
  addDiagnosticResult,
  addManualTest
} from '../database/repositories/diagnostic.repo'

export function registerDatabaseIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.DB_SAVE_DIAGNOSTIC, async (_event, diagnostic: Diagnostic): Promise<string> => {
    const id = diagnostic.id
    const deviceId = diagnostic.deviceId || 'unknown'

    await createDiagnostic({
      id,
      deviceId,
      startedAt: diagnostic.startedAt,
      completedAt: diagnostic.completedAt || new Date().toISOString(),
      status: diagnostic.status,
      summary: diagnostic.summary || null
    })

    for (const result of diagnostic.results) {
      await addDiagnosticResult({
        id: result.id || randomUUID(),
        diagnosticId: id,
        category: result.category,
        testName: result.testName,
        status: result.status as 'PASS' | 'FAIL' | 'WARN' | 'SKIP',
        value: result.value || null,
        details: result.details ? JSON.stringify(result.details) : null,
        observations: result.observations || null
      })
    }

    for (const test of diagnostic.manualTests) {
      await addManualTest({
        id: test.id || randomUUID(),
        diagnosticId: id,
        testType: test.testType,
        result: test.result as 'PASS' | 'FAIL' | 'WARN',
        details: test.details ? JSON.stringify(test.details) : null,
        observations: test.observations || null,
        technician: null
      })
    }

    return id
  })
}
