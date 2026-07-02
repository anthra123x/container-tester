export interface DriverInfo {
  deviceName: string
  driverVersion: string
  driverDate: string
  driverProvider: string
  hardwareId: string
  isSigned: boolean
  signer: string | null
  errorCode: number
  errorDescription: string
  deviceClass: string
}

export interface DriverUpdate {
  title: string
  description: string
  driverVersion: string
  isDownloaded: boolean
  kbArticle: string | null
  categories: string[]
}

export interface DriverScanResult {
  drivers: DriverInfo[]
  problematicCount: number
  problematics: DriverInfo[]
  totalCount: number
  error: string | null
}

export interface DriverUpdateResult {
  updates: DriverUpdate[]
  totalCount: number
  error: string | null
}

export interface DriverInstallProgress {
  stage: 'CHECKING' | 'DOWNLOADING' | 'INSTALLING' | 'COMPLETE' | 'ERROR'
  message: string
  progress: number
  needsReboot: boolean
  currentUpdate: string
}
