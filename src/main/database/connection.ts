import { app } from 'electron'
import { join } from 'path'
import { existsSync, writeFileSync, readFileSync } from 'fs'
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'

let db: SqlJsDatabase | null = null

export async function getDb(): Promise<SqlJsDatabase> {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'cds.db')

  const SQL = await initSqlJs()

  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON')

  return db
}

export function saveDb(): void {
  if (!db) return
  const dbPath = join(app.getPath('userData'), 'cds.db')
  const data = db.export()
  const buffer = Buffer.from(data)
  writeFileSync(dbPath, buffer)
}

export function closeDb(): void {
  if (db) {
    saveDb()
    db.close()
    db = null
  }
}
