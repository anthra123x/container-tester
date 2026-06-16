import { motion, AnimatePresence } from 'framer-motion'
import { X, Cpu, MemoryStick, Monitor, HardDrive, Battery, Thermometer, Wifi, CircuitBoard, Info } from 'lucide-react'
import { useDiagnosticStore } from '../../stores/diagnostic.store'

function formatBytes(bytes: number): string {
  if (!bytes) return '—'
  const gb = bytes / 1073741824
  return `${gb.toFixed(2)} GB`
}

function SpecRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-neutral-100 last:border-0">
      <span className="text-sm text-neutral-600">{label}</span>
      <span className="text-sm font-medium text-primary-800 text-right max-w-[60%] truncate" title={String(value ?? '')}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function SpecSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-neutral-50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-primary-500">{icon}</div>
        <h3 className="font-semibold text-primary-800 text-sm uppercase tracking-wide">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  )
}

export function SystemSpecsModal() {
  const systemInfo = useDiagnosticStore((s) => s.systemInfo)
  const systemSpecs = useDiagnosticStore((s) => s.systemSpecs)
  const specsModalOpen = useDiagnosticStore((s) => s.specsModalOpen)
  const setSpecsModalOpen = useDiagnosticStore((s) => s.setSpecsModalOpen)

  if (!specsModalOpen) return null

  const cpu = systemSpecs?.cpu
  const ram = systemSpecs?.ram
  const gpu = systemSpecs?.gpu
  const storage = systemSpecs?.storage ?? []
  const battery = systemSpecs?.battery
  const sensors = systemSpecs?.sensors
  const wifi = systemSpecs?.wifi
  const os = systemInfo?.os
  const mb = systemInfo?.motherboard

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={() => setSpecsModalOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-5 border-b border-neutral-200">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-bold text-primary-800">Especificaciones del Equipo</h2>
            </div>
            <button
              onClick={() => setSpecsModalOpen(false)}
              className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-4">
            <div className="bg-primary-50 rounded-lg p-4 -mt-1">
              <p className="text-lg font-bold text-primary-800">{systemInfo?.hostname || '—'}</p>
              <p className="text-sm text-neutral-600">
                {[systemInfo?.manufacturer, systemInfo?.model].filter(Boolean).join(' ')} {systemInfo?.serial ? `• ${systemInfo.serial}` : ''}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {os && (
                <SpecSection title="Sistema Operativo" icon={<CircuitBoard className="w-4 h-4" />}>
                  <SpecRow label="Sistema" value={`${os.distro} ${os.release}`} />
                  <SpecRow label="Kernel" value={os.kernel} />
                  <SpecRow label="Arquitectura" value={os.arch} />
                  <SpecRow label="Hostname" value={os.hostname} />
                  <SpecRow label="Activación" value={os.activated ? 'Sí' : 'No'} />
                </SpecSection>
              )}

              {mb && (
                <SpecSection title="Placa Base" icon={<CircuitBoard className="w-4 h-4" />}>
                  <SpecRow label="Fabricante" value={mb.manufacturer} />
                  <SpecRow label="Modelo" value={mb.model} />
                  <SpecRow label="Versión" value={mb.version} />
                  <SpecRow label="Serial" value={mb.serial} />
                  <SpecRow label="BIOS" value={mb.biosVersion} />
                  <SpecRow label="Fecha BIOS" value={mb.biosDate} />
                </SpecSection>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cpu && (
                <SpecSection title="CPU" icon={<Cpu className="w-4 h-4" />}>
                  <SpecRow label="Modelo" value={`${cpu.manufacturer} ${cpu.brand}`} />
                  <SpecRow label="Núcleos" value={`${cpu.physicalCores} físicos / ${cpu.cores} lógicos`} />
                  <SpecRow label="Velocidad" value={`${cpu.speed} GHz`} />
                  <SpecRow label="Vel. Máxima" value={cpu.speedMax ? `${cpu.speedMax} GHz` : null} />
                  <SpecRow label="Uso" value={cpu.usage != null ? `${cpu.usage}%` : null} />
                  <SpecRow label="Temperatura" value={cpu.temperature != null ? `${cpu.temperature}°C` : null} />
                </SpecSection>
              )}

              {ram && (
                <SpecSection title="RAM" icon={<MemoryStick className="w-4 h-4" />}>
                  <SpecRow label="Total" value={formatBytes(ram.total)} />
                  <SpecRow label="En uso" value={formatBytes(ram.used)} />
                  <SpecRow label="Disponible" value={formatBytes(ram.free)} />
                  <SpecRow label="Uso" value={`${ram.usagePercent}%`} />
                  {ram.slots.map((slot, i) => (
                    <SpecRow key={i} label={`Slot ${slot.bank}`} value={`${formatBytes(slot.size)} ${slot.type} @ ${slot.speed} MHz`} />
                  ))}
                </SpecSection>
              )}
            </div>

            {gpu && (
              <SpecSection title="GPU" icon={<Monitor className="w-4 h-4" />}>
                <SpecRow label="Modelo" value={gpu.model} />
                <SpecRow label="Fabricante" value={gpu.vendor} />
                <SpecRow label="VRAM" value={`${gpu.vram} MB`} />
                <SpecRow label="Driver" value={gpu.driverVersion} />
                <SpecRow label="Uso" value={gpu.usage != null ? `${gpu.usage}%` : null} />
                <SpecRow label="Temperatura" value={gpu.temperature != null ? `${gpu.temperature}°C` : null} />
              </SpecSection>
            )}

            {storage.length > 0 && (
              <SpecSection title="Almacenamiento" icon={<HardDrive className="w-4 h-4" />}>
                {storage.map((disk, i) => (
                  <div key={i} className={i > 0 ? 'mt-2 pt-2 border-t border-neutral-200' : ''}>
                    <SpecRow label="Dispositivo" value={disk.device} />
                    <SpecRow label="Tipo" value={disk.type} />
                    <SpecRow label="Interfaz" value={disk.interfaceType} />
                    <SpecRow label="Capacidad" value={formatBytes(disk.size)} />
                    <SpecRow label="Usado" value={`${disk.usagePercent}%`} />
                    <SpecRow label="SMART" value={disk.smartStatus} />
                    <SpecRow label="Temperatura" value={disk.temperature != null ? `${disk.temperature}°C` : null} />
                  </div>
                ))}
              </SpecSection>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {battery && (
                <SpecSection title="Batería" icon={<Battery className="w-4 h-4" />}>
                  {battery.hasBattery ? (
                    <>
                      <SpecRow label="Estado" value={battery.isCharging ? 'Cargando' : 'No cargando'} />
                      <SpecRow label="Capacidad diseño" value={`${battery.designCapacity} mAh`} />
                      <SpecRow label="Capacidad actual" value={`${battery.currentCapacity} mAh`} />
                      <SpecRow label="Desgaste" value={`${battery.wearLevel}%`} />
                      <SpecRow label="Salud" value={`${battery.health}%`} />
                      <SpecRow label="Ciclos" value={battery.cycleCount} />
                      <SpecRow label="Voltaje" value={battery.voltage ? `${battery.voltage} V` : null} />
                    </>
                  ) : (
                    <SpecRow label="Estado" value="No detectada" />
                  )}
                </SpecSection>
              )}

              {sensors && (
                <SpecSection title="Sensores" icon={<Thermometer className="w-4 h-4" />}>
                  <SpecRow label="CPU Temp" value={sensors.cpuTemperature != null ? `${sensors.cpuTemperature}°C` : null} />
                  <SpecRow label="GPU Temp" value={sensors.gpuTemperature != null ? `${sensors.gpuTemperature}°C` : null} />
                  <SpecRow label="Almac. Temp" value={sensors.storageTemperature != null ? `${sensors.storageTemperature}°C` : null} />
                  <SpecRow label="Voltaje CPU" value={sensors.cpuVoltage != null ? `${sensors.cpuVoltage} V` : null} />
                  <SpecRow label="Ventilador" value={sensors.fanSpeed != null ? `${sensors.fanSpeed} RPM` : null} />
                </SpecSection>
              )}
            </div>

            {wifi && (
              <SpecSection title="Red Wi-Fi" icon={<Wifi className="w-4 h-4" />}>
                <SpecRow label="Adaptador" value={wifi.adapterPresent ? wifi.adapterName : 'No presente'} />
                <SpecRow label="Estado" value={wifi.connected ? 'Conectado' : 'Desconectado'} />
                <SpecRow label="SSID" value={wifi.ssid || '—'} />
                <SpecRow label="Señal" value={wifi.signalStrength ? `${wifi.signalStrength}%` : null} />
              </SpecSection>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
