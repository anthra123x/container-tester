import { getDb, saveDb } from './connection'

export async function initializeDatabase(): Promise<void> {
  const db = await getDb()

  db.run('PRAGMA foreign_keys = ON')

  db.run(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      model TEXT,
      serial_number TEXT UNIQUE,
      manufacturer TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS diagnostics (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(id),
      started_at DATETIME NOT NULL,
      completed_at DATETIME,
      status TEXT NOT NULL CHECK(status IN ('APROBADO','APROBADO_CON_OBSERVACIONES','REQUIERE_REPARACION','NO_APROBADO')),
      summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS diagnostic_results (
      id TEXT PRIMARY KEY,
      diagnostic_id TEXT NOT NULL REFERENCES diagnostics(id),
      category TEXT NOT NULL,
      test_name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('PASS','FAIL','WARN','SKIP')),
      value TEXT,
      details TEXT,
      observations TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS manual_tests (
      id TEXT PRIMARY KEY,
      diagnostic_id TEXT NOT NULL REFERENCES diagnostics(id),
      test_type TEXT NOT NULL,
      result TEXT NOT NULL CHECK(result IN ('PASS','FAIL','WARN')),
      details TEXT,
      observations TEXT,
      technician TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      diagnostic_id TEXT NOT NULL REFERENCES diagnostics(id),
      file_path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS observations (
      id TEXT PRIMARY KEY,
      diagnostic_id TEXT NOT NULL REFERENCES diagnostics(id),
      notes TEXT NOT NULL,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run('CREATE INDEX IF NOT EXISTS idx_diagnostics_device ON diagnostics(device_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_diagnostics_status ON diagnostics(status)')
  db.run('CREATE INDEX IF NOT EXISTS idx_diagnostic_results_diag ON diagnostic_results(diagnostic_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_reports_diagnostic ON reports(diagnostic_id)')

  saveDb()
}

export { getDb } from './connection'
