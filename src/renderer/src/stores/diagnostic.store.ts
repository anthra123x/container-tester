import { create } from 'zustand'
import type { Diagnostic, DiagnosticResult, AutoDiagnosticPhase, SystemInfo } from '../../../shared/types/diagnostic.types'
import type { TestStatus, DiagnosticStatus } from '../../../shared/types/diagnostic.types'
import type { CPUInfo, RAMInfo, GPUInfo, StorageInfo, BatteryInfo, SensorInfo, WifiInfo } from '../../../shared/types/hardware.types'

export interface FullSystemSpecs {
  cpu: CPUInfo | null
  ram: RAMInfo | null
  gpu: GPUInfo | null
  storage: StorageInfo[]
  battery: BatteryInfo | null
  sensors: SensorInfo | null
  wifi: WifiInfo | null
}

interface DiagnosticState {
  currentDiagnostic: Diagnostic | null
  isRunning: boolean
  currentPhase: string
  phases: AutoDiagnosticPhase[]
  systemInfo: SystemInfo | null
  systemSpecs: FullSystemSpecs | null
  specsModalOpen: boolean
  setSystemInfo: (info: SystemInfo) => void
  setSystemSpecs: (specs: FullSystemSpecs) => void
  setSpecsModalOpen: (open: boolean) => void
  startDiagnostic: () => void
  updatePhase: (phaseId: string, status: TestStatus, results?: DiagnosticResult[], label?: string, description?: string) => void
  completeDiagnostic: (status: DiagnosticStatus, summary: string) => void
  reset: () => void
}

const initialPhases: AutoDiagnosticPhase[] = [
  { id: 'system', label: 'Información del Sistema', description: 'Recopilando datos del equipo', status: 'PENDING', results: [] },
  { id: 'cpu', label: 'Diagnóstico de CPU', description: 'Verificando el procesador', status: 'PENDING', results: [] },
  { id: 'ram', label: 'Diagnóstico de RAM', description: 'Analizando la memoria', status: 'PENDING', results: [] },
  { id: 'gpu', label: 'Diagnóstico de GPU', description: 'Verificando la tarjeta gráfica', status: 'PENDING', results: [] },
  { id: 'storage', label: 'Almacenamiento', description: 'Verificando discos y SMART', status: 'PENDING', results: [] },
  { id: 'battery', label: 'Batería', description: 'Analizando estado de la batería', status: 'PENDING', results: [] },
  { id: 'sensors', label: 'Temperaturas', description: 'Monitoreando sensores térmicos', status: 'PENDING', results: [] },
  { id: 'network', label: 'Red', description: 'Probando conectividad de red', status: 'PENDING', results: [] },
]

export const useDiagnosticStore = create<DiagnosticState>((set) => ({
  currentDiagnostic: null,
  isRunning: false,
  currentPhase: '',
  phases: initialPhases,
  systemInfo: null,
  systemSpecs: null,
  specsModalOpen: false,

  setSystemInfo: (info) => set({ systemInfo: info }),
  setSystemSpecs: (specs) => set({ systemSpecs: specs }),
  setSpecsModalOpen: (open) => set({ specsModalOpen: open }),

  startDiagnostic: () => set({
    isRunning: true,
    currentPhase: 'system',
    phases: initialPhases.map(p => ({ ...p, status: 'PENDING' as TestStatus })),
    currentDiagnostic: null,
  }),

  updatePhase: (phaseId, status, results, label?, description?) => set((state) => ({
    phases: state.phases.map(p =>
      p.id === phaseId ? { ...p, status, results: results || p.results, ...(label && { label }), ...(description && { description }) } : p
    ),
    currentPhase: phaseId,
  })),

  completeDiagnostic: (status, summary) => set((state) => {
    const allResults = state.phases.flatMap(p => p.results)
    const manualTests = state.currentDiagnostic?.manualTests || []
    return {
      isRunning: false,
      currentPhase: '',
      currentDiagnostic: {
        id: crypto.randomUUID(),
        deviceId: state.systemInfo?.serial || '',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        status,
        summary,
        results: allResults,
        manualTests,
      },
    }
  }),

  reset: () => set({
    currentDiagnostic: null,
    isRunning: false,
    currentPhase: '',
    phases: initialPhases,
  }),
}))
