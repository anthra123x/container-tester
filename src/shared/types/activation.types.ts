export interface WindowsActivationStatus {
  activated: boolean
  licenseStatus: string
  productName: string
  productId: string
  partialProductKey: string | null
  licenseChannel: string
  vlActivationType: string
  evaluationEndDate: string | null
  gracePeriodRemaining: number | null
  tokenSource: string | null
  edition: string
}

export interface OfficeActivationStatus {
  installed: boolean
  version: string
  activated: boolean
  productKey: string | null
  productName: string | null
  licenseStatus: string
}

export interface ActivationStatus {
  windows: WindowsActivationStatus | null
  office: OfficeActivationStatus | null
  error: string | null
}

export interface MASProgress {
  stage: 'DOWNLOADING' | 'VERIFYING' | 'EXECUTING' | 'COMPLETE' | 'ERROR'
  message: string
  progress: number
}
