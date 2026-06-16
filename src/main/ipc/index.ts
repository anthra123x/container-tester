import { registerSystemIpcHandlers } from './system.ipc'
import { registerDiagnosticsIpcHandlers } from './diagnostics.ipc'
import { registerHardwareIpcHandlers } from './hardware.ipc'
import { registerManualTestsIpcHandlers } from './manual-tests.ipc'
import { registerSettingsIpcHandlers } from './settings.ipc'

export function registerAllIpcHandlers(): void {
  registerSystemIpcHandlers()
  registerDiagnosticsIpcHandlers()
  registerHardwareIpcHandlers()
  registerManualTestsIpcHandlers()
  registerSettingsIpcHandlers()
}
