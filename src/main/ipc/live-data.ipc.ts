import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import { getLiveMetrics } from '../services/live-data.service'

export function registerLiveDataIPC(): void {
  ipcMain.handle(IPC_CHANNELS.GET_LIVE_METRICS, async () => {
    try {
      return await getLiveMetrics()
    } catch {
      return null
    }
  })

  ipcMain.handle(IPC_CHANNELS.BENCHMARK_RESULT, async (event) => {
    const { runFullBenchmark } = await import('../services/benchmark.service')
    const win = BrowserWindow.fromWebContents(event.sender)

    function windowAlive(): boolean {
      return win !== null && !win.isDestroyed()
    }

    const result = await runFullBenchmark((_phase, _pct) => {
      if (!windowAlive()) return
      try { win!.webContents.send('benchmark:progress', { phase: _phase, pct: _pct }) } catch {}
    })

    return windowAlive() ? result : null
  })
}
