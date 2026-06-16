import { useState, useEffect, useCallback } from 'react'
import { useIpc } from './useIpc'
import { useDiagnosticStore } from '../stores/diagnostic.store'
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels'
import type { SystemInfo } from '../../../shared/types/diagnostic.types'

export function useSystemInfo() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { invoke } = useIpc()
  const systemInfo = useDiagnosticStore((s) => s.systemInfo)
  const setSystemInfo = useDiagnosticStore((s) => s.setSystemInfo)
  const setSystemSpecs = useDiagnosticStore((s) => s.setSystemSpecs)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const info: SystemInfo | null = await invoke(IPC_CHANNELS.GET_SYSTEM_INFO)
      setSystemInfo(info)
      invoke(IPC_CHANNELS.GET_SYSTEM_SPECS).then((specs) => {
        setSystemSpecs(specs)
      }).catch(() => {})
    } catch (err: any) {
      setError(err?.message || 'Error obteniendo información del sistema')
    } finally {
      setLoading(false)
    }
  }, [invoke, setSystemInfo, setSystemSpecs])

  const loadSpecs = useCallback(async () => {
    try {
      const specs = await invoke(IPC_CHANNELS.GET_SYSTEM_SPECS)
      if (specs) setSystemSpecs(specs)
    } catch {
      // best-effort
    }
  }, [invoke, setSystemSpecs])

  useEffect(() => {
    if (!systemInfo) {
      refresh()
    } else {
      setLoading(false)
      if (!useDiagnosticStore.getState().systemSpecs) {
        loadSpecs()
      }
    }
  }, [])

  return { systemInfo, loading, error, refresh, loadSpecs }
}
