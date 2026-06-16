import { motion, AnimatePresence } from 'framer-motion'
import { X, Cpu, MemoryStick, Monitor, HardDrive, Battery, Thermometer, Wifi, CircuitBoard, Info, Fan, Zap, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useDiagnosticStore } from '../../stores/diagnostic.store'
import { useIpc } from '../../hooks/useIpc'
import { IPC_CHANNELS } from '../../../../shared/constants/ipc-channels'

function formatBytes(bytes: number): string {
  if (!bytes) return '—'
  const gb = bytes / 1073741824
  return `${gb.toFixed(2)} GB`
}

function formatVRAM(vram: number): string {
  if (!vram) return '—'
  const gb = vram / 1073741824
  return `${gb.toFixed(1)} GB`
}

function SpecRow({ label, value, icon }: { label: string; value: string | number | null | undefined; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-1 border-b border-primary-100/30 last:border-0 group hover:bg-white/40 transition-colors rounded">
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-primary-400/60 shrink-0">{icon}</span>}
        <span className="text-xs text-neutral-500 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <span className="text-sm font-semibold text-primary-900 text-right max-w-[55%] truncate" title={String(value ?? '')}>
        {value ?? <span className="text-neutral-300 italic">—</span>}
      </span>
    </div>
  )
}

function SpecSection({ title, icon, gradient, children }: { title: string; icon: React.ReactNode; gradient: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-4 border ${gradient} shadow-sm`}
    >
      <div className="flex items-center gap-2.5 mb-3 pb-2 border-b border-white/30">
        <div className="text-primary-600">{icon}</div>
        <h3 className="font-bold text-primary-900 text-xs uppercase tracking-widest">{title}</h3>
      </div>
      <div className="space-y-0.5">{children}</div>
    </motion.div>
  )
}

function SkeletonSection() {
  return (
    <div className="rounded-xl p-4 bg-neutral-50/50 border border-neutral-100 animate-pulse">
      <div className="h-4 w-24 bg-neutral-200 rounded mb-3" />
      <div className="space-y-2">
        <div className="h-3 bg-neutral-100 rounded w-full" />
        <div className="h-3 bg-neutral-100 rounded w-3/4" />
        <div className="h-3 bg-neutral-100 rounded w-5/6" />
      </div>
    </div>
  )
}

export function SystemSpecsModal() {
  const systemInfo = useDiagnosticStore((s) => s.systemInfo)
  const systemSpecs = useDiagnosticStore((s) => s.systemSpecs)
  const specsModalOpen = useDiagnosticStore((s) => s.specsModalOpen)
  const setSystemSpecs = useDiagnosticStore((s) => s.setSystemSpecs)
  const setSpecsModalOpen = useDiagnosticStore((s) => s.setSpecsModalOpen)
  const { invoke } = useIpc()
  const loading = !systemSpecs && specsModalOpen
  const [refreshing, setRefreshing] = useState(false)

  const refreshSpecs = async () => {
    setRefreshing(true)
    try {
      const specs = await invoke(IPC_CHANNELS.GET_SYSTEM_SPECS)
      if (specs) setSystemSpecs(specs)
    } catch { }
    setRefreshing(false)
  }

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
        transition={{ duration: 0.1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={() => setSpecsModalOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl shadow-primary-900/10 border border-neutral-200/50 max-w-3xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200/50 bg-gradient-to-r from-primary-50/50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/10 rounded-lg">
                <Info className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-primary-900">Especificaciones del Equipo</h2>
                <p className="text-xs text-neutral-500">{systemInfo?.hostname || 'Cargando...'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={refreshSpecs}
                disabled={refreshing}
                className={`p-2 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-all hover:scale-105 active:scale-95 ${refreshing ? 'animate-spin' : ''}`}
                title="Actualizar datos"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSpecsModalOpen(false)}
                className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-all hover:scale-105 active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-6 py-5 overflow-y-auto space-y-4 scroll-smooth">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SkeletonSection />
                <SkeletonSection />
                <SkeletonSection />
                <SkeletonSection />
                <div className="md:col-span-2"><SkeletonSection /></div>
              </div>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-5 text-white shadow-lg shadow-primary-500/20"
                >
                  <p className="text-2xl font-bold tracking-tight">{systemInfo?.hostname || 'Equipo'}</p>
                  <p className="text-sm text-primary-100 mt-1">
                    {[systemInfo?.manufacturer, systemInfo?.model].filter(Boolean).join(' ')}
                    {systemInfo?.serial ? ` • ${systemInfo.serial}` : ''}
                  </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {os && (
                    <SpecSection title="Sistema Operativo" icon={<CircuitBoard className="w-4 h-4" />} gradient="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border-blue-100/50">
                      <SpecRow label="Sistema" value={`${os.distro} ${os.release}`} />
                      <SpecRow label="Kernel" value={os.kernel} />
                      <SpecRow label="Arquitectura" value={os.arch} />
                      <SpecRow label="Hostname" value={os.hostname} />
                      <SpecRow label="Activación" value={os.activated ? 'Activado' : 'No activado'} />
                    </SpecSection>
                  )}

                  {mb && (
                    <SpecSection title="Placa Base" icon={<CircuitBoard className="w-4 h-4" />} gradient="bg-gradient-to-br from-emerald-50/80 to-teal-50/80 border-emerald-100/50">
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
                    <SpecSection title="CPU" icon={<Cpu className="w-4 h-4" />} gradient="bg-gradient-to-br from-amber-50/80 to-orange-50/80 border-amber-100/50">
                      <SpecRow label="Modelo" value={`${cpu.manufacturer} ${cpu.brand}`} />
                      <SpecRow label="Núcleos" value={`${cpu.physicalCores} fís / ${cpu.cores} lóg`} />
                      <SpecRow label="Velocidad" value={`${cpu.speed} GHz`} />
                      <SpecRow label="Vel. Máx" value={cpu.speedMax ? `${cpu.speedMax} GHz` : null} />
                      <SpecRow label="Uso" value={cpu.usage != null ? `${cpu.usage}%` : null} />
                      <SpecRow label="Temperatura" value={cpu.temperature != null ? `${cpu.temperature}°C` : null} />
                    </SpecSection>
                  )}

                  {ram && (
                    <SpecSection title="RAM" icon={<MemoryStick className="w-4 h-4" />} gradient="bg-gradient-to-br from-purple-50/80 to-fuchsia-50/80 border-purple-100/50">
                      <SpecRow label="Total" value={formatBytes(ram.total)} />
                      <SpecRow label="En uso" value={formatBytes(ram.used)} />
                      <SpecRow label="Disponible" value={formatBytes(ram.free)} />
                      <SpecRow label="Uso" value={`${ram.usagePercent}%`} />
                      {ram.slots?.map((slot, i) => slot.size > 0 && (
                        <SpecRow key={i} label={slot.bank} value={`${formatBytes(slot.size)} ${slot.type} @ ${slot.speed} MHz`} />
                      ))}
                    </SpecSection>
                  )}
                </div>

                {gpu && (
                  <SpecSection title="GPU" icon={<Monitor className="w-4 h-4" />} gradient="bg-gradient-to-br from-rose-50/80 to-pink-50/80 border-rose-100/50">
                    <SpecRow label="Modelo" value={`${gpu.vendor} ${gpu.model}`} />
                    <SpecRow label="VRAM" value={formatVRAM(gpu.vram)} />
                    <SpecRow label="Driver" value={gpu.driverVersion} />
                    <SpecRow label="Uso" value={gpu.usage != null ? `${gpu.usage}%` : null} />
                    <SpecRow label="Temperatura" value={gpu.temperature != null ? `${gpu.temperature}°C` : null} />
                  </SpecSection>
                )}

                {storage.length > 0 && (
                  <SpecSection title="Almacenamiento" icon={<HardDrive className="w-4 h-4" />} gradient="bg-gradient-to-br from-cyan-50/80 to-sky-50/80 border-cyan-100/50">
                    <div className="space-y-3">
                      {storage.map((disk, i) => (
                        <div key={i} className={`${i > 0 ? 'pt-3 border-t border-cyan-100/50' : ''}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-primary-700 uppercase tracking-wider">{disk.device}</span>
                            {disk.isBootDrive && <span className="text-[10px] bg-primary-500/10 text-primary-600 px-1.5 py-0.5 rounded-full font-semibold">SISTEMA</span>}
                            <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-full">{disk.type}</span>
                          </div>
                          <SpecRow label="Capacidad" value={formatBytes(disk.size)} />
                          <SpecRow label="Uso" value={disk.usagePercent != null ? `${disk.usagePercent}%` : null} />
                          <SpecRow label="SMART" value={disk.smartStatus} />
                          <SpecRow label="Temperatura" value={disk.temperature != null ? `${disk.temperature}°C` : null} />
                          {disk.hoursUsed != null && <SpecRow label="Horas" value={`${disk.hoursUsed.toLocaleString()} h`} />}
                        </div>
                      ))}
                    </div>
                  </SpecSection>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {battery && battery.hasBattery && (
                    <SpecSection title="Batería" icon={<Battery className="w-4 h-4" />} gradient="bg-gradient-to-br from-green-50/80 to-emerald-50/80 border-green-100/50">
                      <SpecRow label="Estado" value={battery.isCharging ? 'Cargando' : 'Descargando'} />
                      <SpecRow label="Capacidad diseño" value={battery.designCapacity != null ? `${battery.designCapacity} mAh` : null} />
                      <SpecRow label="Capacidad actual" value={battery.currentCapacity != null ? `${battery.currentCapacity} mAh` : null} />
                      <SpecRow label="Desgaste" value={battery.wearLevel != null ? `${battery.wearLevel}%` : null} />
                      <SpecRow label="Salud" value={battery.health != null ? `${battery.health}%` : null} />
                      <SpecRow label="Ciclos" value={battery.cycleCount} />
                      <SpecRow label="Voltaje" value={battery.voltage != null ? `${battery.voltage} V` : null} />
                    </SpecSection>
                  )}

                  {wifi && (
                    <SpecSection title="Red Wi-Fi" icon={<Wifi className="w-4 h-4" />} gradient="bg-gradient-to-br from-violet-50/80 to-purple-50/80 border-violet-100/50">
                      {wifi.interfaces?.length > 0 ? (
                        wifi.interfaces.map((iface, i) => (
                          <div key={i}>
                            <SpecRow label="Adaptador" value={iface.model || iface.iface} />
                            <SpecRow label="MAC" value={iface.mac} />
                          </div>
                        ))
                      ) : (
                        <SpecRow label="Adaptador" value="No detectado" />
                      )}
                      {wifi.networks?.length > 0 && (
                        <>
                          <SpecRow label="Redes" value={`${wifi.networks.length} disponibles`} />
                          <SpecRow label="Señal" value={wifi.networks[0].signalLevel != null ? `${wifi.networks[0].signalLevel} dBm` : null} />
                          <SpecRow label="SSID" value={wifi.networks[0].ssid} />
                        </>
                      )}
                    </SpecSection>
                  )}
                </div>

                {sensors && (
                  <SpecSection title="Sensores" icon={<Thermometer className="w-4 h-4" />} gradient="bg-gradient-to-br from-slate-50/80 to-gray-50/80 border-slate-200/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <h4 className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold mb-1">CPU</h4>
                        <SpecRow label="Temp" value={sensors.cpu?.main != null ? `${sensors.cpu.main}°C` : null} icon={<Thermometer className="w-3 h-3" />} />
                        <SpecRow label="Máx" value={sensors.cpu?.max != null ? `${sensors.cpu.max}°C` : null} />
                      </div>
                      <div>
                        <h4 className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold mb-1">GPU</h4>
                        <SpecRow label="Temp" value={sensors.gpu?.temperature != null ? `${sensors.gpu.temperature}°C` : null} icon={<Thermometer className="w-3 h-3" />} />
                        {sensors.gpu?.fanSpeed != null && <SpecRow label="Ventilador" value={`${sensors.gpu.fanSpeed} RPM`} icon={<Fan className="w-3 h-3" />} />}
                        {sensors.gpu?.powerDraw != null && <SpecRow label="Consumo" value={`${sensors.gpu.powerDraw.toFixed(1)} W`} icon={<Zap className="w-3 h-3" />} />}
                      </div>
                    </div>
                    {sensors.storage?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <h4 className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold mb-1">Almacenamiento</h4>
                        {sensors.storage.map((s, i) => (
                          <SpecRow key={i} label={s.device} value={s.temperature != null ? `${s.temperature}°C` : null} />
                        ))}
                      </div>
                    )}
                    {sensors.fans?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <h4 className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold mb-1">Ventiladores</h4>
                        {sensors.fans.map((f, i) => (
                          <SpecRow key={i} label={f.name} value={f.rpm != null ? `${f.rpm} RPM` : f.percentage != null ? `${f.percentage}%` : null} icon={<Fan className="w-3 h-3" />} />
                        ))}
                      </div>
                    )}
                  </SpecSection>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
