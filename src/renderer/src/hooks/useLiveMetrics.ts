import { useState, useEffect, useRef } from 'react'
import { useIpc } from './useIpc'
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels'

export interface LiveMetrics {
  restricted: boolean
  cpu: { usage: number; temperature: number | null; speed: number }
  ram: { total: number; used: number; free: number; usagePercent: number }
  storage: { usagePercent: number; freeGB: number; totalGB: number }
  battery: {
    hasBattery: boolean
    isCharging: boolean
    health: number | null
    wearLevel: number | null
    cycleCount: number | null
  }
  uptime: { days: number; hours: number; minutes: number }
}

const emptyMetrics: LiveMetrics = {
  restricted: false,
  cpu: { usage: 0, temperature: null, speed: 0 },
  ram: { total: 0, used: 0, free: 0, usagePercent: 0 },
  storage: { usagePercent: 0, freeGB: 0, totalGB: 0 },
  battery: { hasBattery: false, isCharging: false, health: null, wearLevel: null, cycleCount: null },
  uptime: { days: 0, hours: 0, minutes: 0 },
}

export function useLiveMetrics(intervalMs = 3000) {
  const [metrics, setMetrics] = useState<LiveMetrics>(emptyMetrics)
  const [connected, setConnected] = useState(false)
  const [restricted, setRestricted] = useState(false)
  const { invoke } = useIpc()
  const mountedRef = useRef(true)
  const hiddenRef = useRef(false)

  useEffect(() => {
    const onVisibility = () => {
      hiddenRef.current = document.hidden
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    let timeoutId: ReturnType<typeof setTimeout>

    const poll = async () => {
      if (hiddenRef.current) {
        timeoutId = setTimeout(poll, intervalMs)
        return
      }
      try {
        const data = await invoke(IPC_CHANNELS.GET_LIVE_METRICS)
        if (mountedRef.current) {
          if (data) {
            setMetrics(data)
            setConnected(true)
            setRestricted(data.restricted || false)
          } else {
            setConnected(false)
          }
        }
      } catch {
        if (mountedRef.current) {
          setConnected(false)
        }
      }
      if (mountedRef.current) {
        timeoutId = setTimeout(poll, intervalMs)
      }
    }

    poll()

    return () => {
      mountedRef.current = false
      clearTimeout(timeoutId)
    }
  }, [intervalMs, invoke])

  return { metrics, connected, restricted }
}
