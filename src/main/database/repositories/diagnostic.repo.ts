import { randomUUID } from 'crypto'
import { dbRun, dbGet, dbAll, rowToCamel, rowsToCamel } from '../db-wrapper'

export interface Diagnostic {
  id: string
  deviceId: string
  startedAt: string
  completedAt: string | null
  status: 'APROBADO' | 'APROBADO_CON_OBSERVACIONES' | 'REQUIERE_REPARACION' | 'NO_APROBADO'
  summary: string | null
  createdAt: string
}

export interface DiagnosticResult {
  id: string
  diagnosticId: string
  category: string
  testName: string
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP'
  value: string | null
  details: string | null
  observations: string | null
  createdAt: string
}

export interface ManualTest {
  id: string
  diagnosticId: string
  testType: string
  result: 'PASS' | 'FAIL' | 'WARN'
  details: string | null
  observations: string | null
  technician: string | null
  createdAt: string
}

export async function createDiagnostic(diagnostic: Omit<Diagnostic, 'createdAt'>): Promise<Diagnostic> {
  const id = diagnostic.id || randomUUID()
  const now = new Date().toISOString()
  await dbRun(
    'INSERT INTO diagnostics (id, device_id, started_at, completed_at, status, summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, diagnostic.deviceId, diagnostic.startedAt, diagnostic.completedAt, diagnostic.status, diagnostic.summary, now]
  )
  return { ...diagnostic, id, createdAt: now }
}

export async function updateDiagnosticStatus(id: string, status: Diagnostic['status'], summary: string | null): Promise<void> {
  const now = new Date().toISOString()
  await dbRun('UPDATE diagnostics SET status = ?, summary = ?, completed_at = ? WHERE id = ?',
    [status, summary, now, id])
}

export async function addDiagnosticResult(result: Omit<DiagnosticResult, 'createdAt'>): Promise<void> {
  const id = result.id || randomUUID()
  const now = new Date().toISOString()
  await dbRun(
    'INSERT INTO diagnostic_results (id, diagnostic_id, category, test_name, status, value, details, observations, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, result.diagnosticId, result.category, result.testName, result.status, result.value, result.details, result.observations, now]
  )
}

export async function addManualTest(test: Omit<ManualTest, 'createdAt'>): Promise<void> {
  const id = test.id || randomUUID()
  const now = new Date().toISOString()
  await dbRun(
    'INSERT INTO manual_tests (id, diagnostic_id, test_type, result, details, observations, technician, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, test.diagnosticId, test.testType, test.result, test.details, test.observations, test.technician, now]
  )
}

export async function getDiagnosticById(id: string): Promise<(Diagnostic & { results: DiagnosticResult[] }) | undefined> {
  const diagRow = await dbGet<Record<string, unknown>>('SELECT * FROM diagnostics WHERE id = ?', [id])
  if (!diagRow) return undefined
  const resultRows = await dbAll<Record<string, unknown>>('SELECT * FROM diagnostic_results WHERE diagnostic_id = ?', [id])
  return {
    ...rowToCamel<Diagnostic>(diagRow),
    results: rowsToCamel<DiagnosticResult>(resultRows)
  }
}

export async function getAllDiagnostics(limit = 50, offset = 0): Promise<Diagnostic[]> {
  const rows = await dbAll<Record<string, unknown>>('SELECT * FROM diagnostics ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset])
  return rowsToCamel<Diagnostic>(rows)
}

export async function searchDiagnostics(query: string): Promise<Diagnostic[]> {
  const searchTerm = `%${query}%`
  const rows = await dbAll<Record<string, unknown>>(
    `SELECT d.* FROM diagnostics d
     LEFT JOIN devices dev ON d.device_id = dev.id
     WHERE d.id LIKE ? OR d.summary LIKE ? OR dev.name LIKE ? OR dev.serial_number LIKE ?
     ORDER BY d.created_at DESC LIMIT 50`,
    [searchTerm, searchTerm, searchTerm, searchTerm]
  )
  return rowsToCamel<Diagnostic>(rows)
}
