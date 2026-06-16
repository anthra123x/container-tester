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

    const result = await runFullBenchmark((phase, pct) => {
      win?.webContents.send('benchmark:progress', { phase, pct })
    })

    return result
  })
}
