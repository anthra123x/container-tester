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

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_SELECT_DIR: 'settings:select-dir',

  // Live metrics
  GET_LIVE_METRICS: 'system:live-metrics',

  // Benchmark
  BENCHMARK_RUN_CPU: 'benchmark:run-cpu',
  BENCHMARK_RUN_MEMORY: 'benchmark:run-memory',
  BENCHMARK_RUN_DISK: 'benchmark:run-disk',
  BENCHMARK_RESULT: 'benchmark:result',

  // Activation
  ACTIVATION_GET_WINDOWS: 'activation:get-windows',
  ACTIVATION_GET_OFFICE: 'activation:get-office',
  ACTIVATION_RUN_MAS: 'activation:run-mas',
  ACTIVATION_PROGRESS: 'activation:progress',
  ACTIVATION_COMPLETE: 'activation:complete',

  // Drivers
  DRIVERS_SCAN: 'drivers:scan',
  DRIVERS_CHECK_UPDATES: 'drivers:check-updates',
  DRIVERS_INSTALL_UPDATES: 'drivers:install-updates',
  DRIVERS_PROGRESS: 'drivers:progress',

  // Repair tools
  REPAIR_RUN: 'repair:run',
  REPAIR_PROGRESS: 'repair:progress',

  // Report
  REPORT_GENERATE: 'report:generate',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
