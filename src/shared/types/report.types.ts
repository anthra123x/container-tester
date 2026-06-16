export interface ReportData {
  deviceName: string
  model: string
  serialNumber: string
  manufacturer: string
  osInfo: string
  diagnosticDate: string
  technician: string
  status: string
  hardwareResults: ReportSectionItem[]
  storageResults: ReportSectionItem[]
  batteryResults: ReportSectionItem[]
  manualTestResults: ReportSectionItem[]
  observations: string
}

export interface ReportSectionItem {
  name: string
  value: string
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP'
}

export interface PDFOptions {
  outputPath: string
  data: ReportData
}
