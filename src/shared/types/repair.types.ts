export type RepairTool = 'sfc' | 'dism' | 'chkdsk'

export type RepairStage = 'INIT' | 'RUNNING' | 'COMPLETE' | 'ERROR'

export interface RepairProgress {
  tool: RepairTool
  stage: RepairStage
  message: string
  logLines: string[]
  progress?: number
}

export const REPAIR_TOOL_INFO: Record<RepairTool, { label: string; description: string }> = {
  sfc: {
    label: 'SFC /scannow',
    description: 'Verifica la integridad de todos los archivos protegidos del sistema y los reemplaza cuando es necesario',
  },
  dism: {
    label: 'DISM /RestoreHealth',
    description: 'Repara la imagen de Windows, el almacén de componentes y corrige problemas de actualización',
  },
  chkdsk: {
    label: 'chkdsk /scan',
    description: 'Escanea el disco en busca de errores del sistema de archivos y sectores defectuosos',
  },
}
