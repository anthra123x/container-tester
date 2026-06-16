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
  const startDiagnostic = useDiagnosticStore((s) => s.startDiagnostic)
  const updatePhase = useDiagnosticStore((s) => s.updatePhase)
  const completeDiagnostic = useDiagnosticStore((s) => s.completeDiagnostic)
  const setSystemInfo = useDiagnosticStore((s) => s.setSystemInfo)

  const runDiagnostic = useCallback(async () => {
    setLoading(true)
    setError(null)
    const st = useDiagnosticStore.getState()
    st.startDiagnostic()

    try {
      for (const phaseId of PHASE_IDS) {
        st.updatePhase(phaseId, 'RUNNING')
      }

      for (let i = 0; i < PHASE_IDS.length; i += BATCH_SIZE) {
        const batch = PHASE_IDS.slice(i, i + BATCH_SIZE)
        await Promise.all(
          batch.map((phaseId) =>
            invoke(IPC_CHANNELS.DIAGNOSTIC_RUN_PHASE, phaseId)
              .then((phase: AutoDiagnosticPhase) => {
                useDiagnosticStore.getState().updatePhase(phaseId, phase.status, phase.results, phase.label, phase.description)
              })
              .catch((err: any) => {
                useDiagnosticStore.getState().updatePhase(phaseId, 'FAIL', [
                  { id: phaseId, category: 'HARDWARE', testName: phaseId, status: 'FAIL' as TestStatus, value: err?.message || 'Error' },
                ])
              })
          )
        )
        await new Promise((r) => setTimeout(r, 100))
      }

      const currentPhases = useDiagnosticStore.getState().phases
      const finalStatus: DiagnosticStatus = currentPhases.every((p) => p.status === 'PASS')
        ? 'APROBADO'
        : currentPhases.some((p) => p.status === 'FAIL')
          ? 'NO_APROBADO'
          : 'APROBADO_CON_OBSERVACIONES'

      const failCount = currentPhases.filter((p) => p.status === 'FAIL').length
      const warnCount = currentPhases.filter((p) => p.status === 'WARN').length
      const summaryParts: string[] = []
      if (failCount > 0) summaryParts.push(`${failCount} fase(s) con FALLO`)
      if (warnCount > 0) summaryParts.push(`${warnCount} fase(s) con OBSERVACIONES`)

      const failReasons: string[] = []
      const warnReasons: string[] = []
      for (const phase of currentPhases) {
        for (const r of phase.results) {
          if (r.status === 'FAIL' && r.observations) failReasons.push(r.observations)
          if (r.status === 'WARN' && r.observations) warnReasons.push(r.observations)
        }
      }

      let summary = ''
      if (failCount > 0 || warnCount > 0) {
        summary = summaryParts.join(', ') + '. '
        if (failReasons.length > 0) summary += `FALLOS: ${failReasons.slice(0, 3).join('; ')}${failReasons.length > 3 ? ` (+${failReasons.length - 3} más)` : ''}. `
        if (warnReasons.length > 0) summary += `OBSERVACIONES: ${warnReasons.slice(0, 3).join('; ')}${warnReasons.length > 3 ? ` (+${warnReasons.length - 3} más)` : ''}. `
      } else if (currentPhases.every(p => p.status === 'PASS')) {
        summary = 'Todos los componentes funcionan correctamente. No se detectaron problemas.'
      } else {
        summary = 'Diagnóstico automático completado.'
      }

      useDiagnosticStore.getState().completeDiagnostic(finalStatus, summary)
    } catch (err: any) {
      setError(err?.message || 'Error ejecutando diagnóstico')
    } finally {
      setLoading(false)
    }
  }, [invoke, startDiagnostic, updatePhase, completeDiagnostic])

  const getInfo = useCallback(async () => {
    try {
      const info = await invoke(IPC_CHANNELS.GET_SYSTEM_INFO)
      useDiagnosticStore.getState().setSystemInfo(info)
      return info
    } catch (err: any) {
      setError(err?.message || 'Error obteniendo información del sistema')
      return null
    }
  }, [invoke])

  return { loading, error, runDiagnostic, getInfo }
}
