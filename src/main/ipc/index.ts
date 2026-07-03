import { registerSystemIpcHandlers } from './system.ipc'
import { registerDiagnosticsIpcHandlers } from './diagnostics.ipc'
import { registerHardwareIpcHandlers } from './hardware.ipc'
import { registerManualTestsIpcHandlers } from './manual-tests.ipc'
import { registerSettingsIpcHandlers } from './settings.ipc'
import { registerLiveDataIPC } from './live-data.ipc'
import { registerActivationIpcHandlers } from './activation.ipc'
import { registerDriversIpcHandlers } from './drivers.ipc'
import { registerRepairIpcHandlers } from './repair.ipc'
import { registerReportIpcHandlers } from './report.ipc'

export function registerAllIpcHandlers(): void {
  registerSystemIpcHandlers()
  registerDiagnosticsIpcHandlers()
  registerHardwareIpcHandlers()
  registerManualTestsIpcHandlers()
  registerSettingsIpcHandlers()
  registerLiveDataIPC()
  registerActivationIpcHandlers()
  registerDriversIpcHandlers()
  registerRepairIpcHandlers()
  registerReportIpcHandlers()
}
