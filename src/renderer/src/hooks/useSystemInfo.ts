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
    } catch (err: any) {
      setError(err?.message || 'Error obteniendo información del sistema')
    } finally {
      setLoading(false)
    }
  }, [invoke, setSystemInfo])

  const loadSpecs = useCallback(async () => {
    try {
      const specs = await invoke(IPC_CHANNELS.GET_SYSTEM_SPECS)
      setSystemSpecs(specs)
    } catch {
      // best-effort
    }
  }, [invoke, setSystemSpecs])

  useEffect(() => {
    if (!systemInfo) {
      refresh()
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (systemInfo && !useDiagnosticStore.getState().systemSpecs) {
      loadSpecs()
    }
  }, [systemInfo, loadSpecs])

  return { systemInfo, loading, error, refresh, loadSpecs }
}
