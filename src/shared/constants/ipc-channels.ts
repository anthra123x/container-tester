export const IPC_CHANNELS = {
  // System info
  GET_SYSTEM_INFO: 'system:get-info',
  GET_SYSTEM_SPECS: 'system:get-specs',
  GET_CPU_INFO: 'system:get-cpu',
  GET_RAM_INFO: 'system:get-ram',
  GET_GPU_INFO: 'system:get-gpu',
  GET_OS_INFO: 'system:get-os',
  GET_MOTHERBOARD_INFO: 'system:get-motherboard',

  // Hardware diagnostics
  DIAGNOSTIC_RUN_AUTO: 'diagnostic:run-auto',
  DIAGNOSTIC_GET_PHASES: 'diagnostic:get-phases',
  DIAGNOSTIC_RUN_PHASE: 'diagnostic:run-phase',
  DIAGNOSTIC_CANCEL: 'diagnostic:cancel',

  // Storage diagnostics
  STORAGE_GET_INFO: 'storage:get-info',
  STORAGE_GET_SMART: 'storage:get-smart',

  // Battery diagnostics
  BATTERY_GET_INFO: 'battery:get-info',

  // Sensor diagnostics
  SENSOR_GET_TEMPS: 'sensor:get-temps',

  // Network diagnostics
  NETWORK_GET_WIFI: 'network:get-wifi',
  NETWORK_GET_BLUETOOTH: 'network:get-bluetooth',

  // Manual tests
  MANUAL_SCREEN_TEST: 'manual:screen-test',
  MANUAL_KEYBOARD_TEST: 'manual:keyboard-test',
  MANUAL_TOUCHPAD_TEST: 'manual:touchpad-test',
  MANUAL_CAMERA_GET: 'manual:camera-get',
  MANUAL_CAMERA_CAPTURE: 'manual:camera-capture',
  MANUAL_MIC_RECORD: 'manual:mic-record',
  MANUAL_MIC_PLAY: 'manual:mic-play',
  MANUAL_AUDIO_PLAY: 'manual:audio-play',
  MANUAL_USB_MONITOR_START: 'manual:usb-monitor-start',
  MANUAL_USB_MONITOR_STOP: 'manual:usb-monitor-stop',
  MANUAL_USB_EVENT: 'manual:usb-event',

  // Reports
  REPORT_GENERATE: 'report:generate',
  REPORT_OPEN: 'report:open',
  REPORT_GET: 'report:get',
  REPORT_LIST: 'report:list',

  // History
  HISTORY_LIST: 'history:list',
  HISTORY_GET: 'history:get',
  HISTORY_SEARCH: 'history:search',
  HISTORY_DELETE: 'history:delete',

  // Database
  DB_GET_DEVICE: 'db:get-device',
  DB_SAVE_DEVICE: 'db:save-device',
  DB_SAVE_DIAGNOSTIC: 'db:save-diagnostic',
  DB_GET_DIAGNOSTIC: 'db:get-diagnostic',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_SELECT_DIR: 'settings:select-dir'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
