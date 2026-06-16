import { getDb, saveDb } from './connection'
import type { SqlValue } from 'sql.js'

interface QueryResult {
  columns: string[]
  values: SqlValue[][]
}

export interface DbResult {
  changes: number
}

export async function dbQuery(sql: string, params?: unknown[]): Promise<QueryResult> {
  const db = await getDb()
  const stmt = db.prepare(sql)
  if (params) {
    stmt.bind(params)
  }
  const columns: string[] = stmt.getColumnNames()
  const values: SqlValue[][] = []
  while (stmt.step()) {
    values.push(stmt.get())
  }
  stmt.free()
  return { columns, values }
}

export async function dbRun(sql: string, params?: unknown[]): Promise<DbResult> {
  const db = await getDb()
  db.run(sql, params)
  saveDb()
  return { changes: db.getRowsModified() }
}

export async function dbGet<T>(sql: string, params?: unknown[]): Promise<T | undefined> {
  const db = await getDb()
  const stmt = db.prepare(sql)
  if (params) {
    stmt.bind(params)
  }
  let row: T | undefined
  if (stmt.step()) {
    row = stmt.getAsObject() as T
  }
  stmt.free()
  return row
}

export async function dbAll<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const db = await getDb()
  const stmt = db.prepare(sql)
  if (params) {
    stmt.bind(params)
  }
  const rows: T[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T)
  }
  stmt.free()
  return rows
}

export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

export function rowToCamel<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(row)) {
    result[snakeToCamel(key)] = row[key]
  }
  return result as T
}

export function rowsToCamel<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => rowToCamel<T>(row))
}
