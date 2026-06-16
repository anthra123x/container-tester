import { useState, useCallback } from 'react'
import { useIpc } from './useIpc'
import { useDiagnosticStore } from '../stores/diagnostic.store'
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels'
import type { TestStatus, DiagnosticStatus, AutoDiagnosticPhase } from '../../../shared/types/diagnostic.types'

const BATCH_SIZE = 2

const PHASE_IDS = ['system', 'cpu', 'ram', 'gpu', 'storage', 'battery', 'sensors', 'network']

export function useDiagnostic() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { invoke } = useIpc()
  const store = useDiagnosticStore()

  const runDiagnostic = useCallback(async () => {
    setLoading(true)
    setError(null)
    store.startDiagnostic()

    try {
      for (const phaseId of PHASE_IDS) {
        store.updatePhase(phaseId, 'RUNNING')
      }

      for (let i = 0; i < PHASE_IDS.length; i += BATCH_SIZE) {
        const batch = PHASE_IDS.slice(i, i + BATCH_SIZE)
        await Promise.all(
          batch.map((phaseId) =>
            invoke(IPC_CHANNELS.DIAGNOSTIC_RUN_PHASE, phaseId)
              .then((phase: AutoDiagnosticPhase) => {
                store.updatePhase(phaseId, phase.status, phase.results, phase.label, phase.description)
              })
              .catch((err: any) => {
                store.updatePhase(phaseId, 'FAIL', [
                  { id: phaseId, category: 'HARDWARE' as const, testName: phaseId, status: 'FAIL' as TestStatus, value: err?.message || 'Error' },
                ])
              })
          )
        )
        await new Promise((r) => setTimeout(r, 100))
      }

      const finalStatus: DiagnosticStatus = store.phases.every((p) => p.status === 'PASS')
        ? 'APROBADO'
        : store.phases.some((p) => p.status === 'FAIL')
          ? 'NO_APROBADO'
          : 'APROBADO_CON_OBSERVACIONES'

      store.completeDiagnostic(finalStatus, 'Diagnóstico automático completado')

      const saved = store.currentDiagnostic
      if (saved) {
        try {
          await invoke(IPC_CHANNELS.DB_SAVE_DIAGNOSTIC, saved)
        } catch {
          console.warn('Failed to save diagnostic to database')
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Error ejecutando diagnóstico')
    } finally {
      setLoading(false)
    }
  }, [invoke, store])

  const getInfo = useCallback(async () => {
    try {
      const info = await invoke(IPC_CHANNELS.GET_SYSTEM_INFO)
      store.setSystemInfo(info)
      return info
    } catch (err: any) {
      setError(err?.message || 'Error obteniendo información del sistema')
      return null
    }
  }, [invoke, store])

  return { loading, error, runDiagnostic, getInfo }
}
