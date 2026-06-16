import { useState, useEffect, useRef } from 'react'
import { useIpc } from './useIpc'
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels'

export interface LiveMetrics {
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
  cpu: { usage: 0, temperature: null, speed: 0 },
  ram: { total: 0, used: 0, free: 0, usagePercent: 0 },
  storage: { usagePercent: 0, freeGB: 0, totalGB: 0 },
  battery: { hasBattery: false, isCharging: false, health: null, wearLevel: null, cycleCount: null },
  uptime: { days: 0, hours: 0, minutes: 0 },
}

export function useLiveMetrics(intervalMs = 3000) {
  const [metrics, setMetrics] = useState<LiveMetrics>(emptyMetrics)
  const [connected, setConnected] = useState(false)
  const { invoke } = useIpc()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    let timer: ReturnType<typeof setInterval>

    const poll = async () => {
      try {
        const data = await invoke(IPC_CHANNELS.GET_LIVE_METRICS)
        if (data && mountedRef.current) {
          setMetrics(data)
          setConnected(true)
        }
      } catch {
        if (mountedRef.current) {
          setConnected(false)
        }
      }
    }

    poll()
    timer = setInterval(poll, intervalMs)

    return () => {
      mountedRef.current = false
      clearInterval(timer)
    }
  }, [intervalMs, invoke])

  return { metrics, connected }
}
