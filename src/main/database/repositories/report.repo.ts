import { randomUUID } from 'crypto'
import { dbRun, dbGet, dbAll, rowToCamel, rowsToCamel } from '../db-wrapper'

export interface Report {
  id: string
  diagnosticId: string
  filePath: string
  createdAt: string
}

export async function createReport(report: Omit<Report, 'createdAt'>): Promise<Report> {
  const id = report.id || randomUUID()
  const now = new Date().toISOString()
  await dbRun('INSERT INTO reports (id, diagnostic_id, file_path, created_at) VALUES (?, ?, ?, ?)',
    [id, report.diagnosticId, report.filePath, now])
  return { ...report, id, createdAt: now }
}

export async function getReportById(id: string): Promise<Report | undefined> {
  const row = await dbGet<Record<string, unknown>>('SELECT * FROM reports WHERE id = ?', [id])
  return row ? rowToCamel<Report>(row) : undefined
}

export async function getAllReports(): Promise<Report[]> {
  const rows = await dbAll<Record<string, unknown>>('SELECT * FROM reports ORDER BY created_at DESC')
  return rowsToCamel<Report>(rows)
}

export async function deleteReport(id: string): Promise<void> {
  await dbRun('DELETE FROM reports WHERE id = ?', [id])
}
