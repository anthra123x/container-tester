export type DiagnosticStatus = 'APROBADO' | 'APROBADO_CON_OBSERVACIONES' | 'REQUIERE_REPARACION' | 'NO_APROBADO'

export type TestStatus = 'PASS' | 'FAIL' | 'WARN' | 'SKIP' | 'PENDING' | 'RUNNING'

export type TestCategory =
  | 'HARDWARE'
  | 'OS'
  | 'STORAGE'
  | 'BATTERY'
  | 'SENSOR'
  | 'NETWORK'
  | 'SCREEN'
  | 'KEYBOARD'
  | 'TOUCHPAD'
  | 'CAMERA'
  | 'MICROPHONE'
  | 'AUDIO'
  | 'WIFI'
  | 'BLUETOOTH'
  | 'USB'

export interface DiagnosticResult {
  id: string
  category: TestCategory
  testName: string
  status: TestStatus
  value?: string
  details?: Record<string, unknown>
  observations?: string
}

export interface Diagnostic {
  id: string
  deviceId: string
  startedAt: string
  completedAt?: string
  status: DiagnosticStatus
  summary?: string
  results: DiagnosticResult[]
  manualTests: ManualTestResult[]
  observations?: string
}

export interface ManualTestResult {
  id: string
  testType: TestCategory
  result: TestStatus
  details?: Record<string, unknown>
  observations?: string
}

export interface Device {
  id: string
  name: string
  model: string
  serialNumber: string
  manufacturer: string
  createdAt: string
  updatedAt: string
}

export interface Report {
  id: string
  diagnosticId: string
  filePath: string
  createdAt: string
}

export interface AutoDiagnosticPhase {
  id: string
  label: string
  description: string
  status: TestStatus
  results: DiagnosticResult[]
}
