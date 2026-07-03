import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Battery,
  Play,
  Monitor,
  Activity,
  ArrowRight,
  Shield,
  Gauge,
  FileDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useDiagnosticStore } from '../stores/diagnostic.store'
import { MetricCard } from '../components/diagnostic/MetricCard'
import { Button } from '../components/shared/Button'
import { useSystemInfo } from '../hooks/useSystemInfo'
import { useLiveMetrics } from '../hooks/useLiveMetrics'
import { useIpc } from '../hooks/useIpc'
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels'
import { useMemo, useState, useCallback } from 'react'
import type { ReportData, ReportSectionItem } from '../../../shared/types/report.types'

function formatBytes(bytes: number): string {
  if (!bytes) return '—'
  const gb = bytes / 1073741824
  return `${gb.toFixed(1)} GB`
}

export function Dashboard() {
  const navigate = useNavigate()
  const systemInfo = useDiagnosticStore((s) => s.systemInfo)
  const systemSpecs = useDiagnosticStore((s) => s.systemSpecs)
  const currentDiagnostic = useDiagnosticStore((s) => s.currentDiagnostic)
  useSystemInfo()
  const { metrics: live } = useLiveMetrics(5000)

  const mCpu = systemSpecs?.cpu
  const mRam = systemSpecs?.ram
  const mDisk = systemSpecs?.storage?.[0]

  const metrics = useMemo(() => [
    {
      icon: <Cpu className="w-5 h-5" />,
      label: 'CPU',
      value: live.cpu.usage > 0
        ? `${live.cpu.usage}%`
        : (mCpu?.brand ? `${mCpu.brand}`.slice(0, 24) : '—'),
      subvalue: mCpu
        ? `${mCpu.cores} núcleos | ${live.cpu.speed || mCpu.speed} GHz${live.cpu.temperature != null ? ` | ${live.cpu.temperature}°C` : ''}`
        : null,
      status: live.cpu.usage >= 80 ? 'warning' as const : 'success' as const,
    },
    {
      icon: <MemoryStick className="w-5 h-5" />,
      label: 'RAM',
      value: live.ram.total > 0
        ? `${live.ram.usagePercent}% (${formatBytes(live.ram.used)} / ${formatBytes(live.ram.total)})`
        : (mRam ? formatBytes(mRam.total) : '—'),
      subvalue: mRam && mRam.slots?.[0]?.size > 0
        ? `${mRam.slots[0].type || ''} ${mRam.slots[0].speed ? `@ ${mRam.slots[0].speed} MHz` : ''}`.trim() || null
        : null,
      status: live.ram.usagePercent >= 85 ? 'warning' as const : 'success' as const,
    },
    {
      icon: <HardDrive className="w-5 h-5" />,
      label: 'Disco',
      value: live.storage.totalGB > 0
        ? `${live.storage.usagePercent}% (${live.storage.freeGB} GB libres)`
        : '—',
      subvalue: mDisk
        ? `${mDisk.type || '?'} — ${mDisk.interfaceType || ''} ${mDisk.isBootDrive ? '(Sistema)' : ''}`
        : null,
      status: live.storage.usagePercent >= 90 ? 'danger' as const
        : live.storage.usagePercent >= 75 ? 'warning' as const
        : 'success' as const,
    },
    {
      icon: <Battery className="w-5 h-5" />,
      label: 'Batería',
      value: live.battery.hasBattery
        ? live.battery.isCharging
          ? `Cargando${live.battery.health != null ? ` (${live.battery.health}% salud)` : ''}`
          : `${live.battery.health ?? '—'}% salud`
        : (systemSpecs?.battery?.hasBattery ? 'Conectado' : 'No detectada'),
      subvalue: live.battery.hasBattery
        ? `${live.battery.wearLevel != null ? `Desgaste ${live.battery.wearLevel}%` : ''}${live.battery.cycleCount != null ? ` • ${live.battery.cycleCount} ciclos` : ''}`
        : (systemSpecs?.battery?.hasBattery && !live.battery.hasBattery ? 'Datos no disponibles en vivo' : null),
      status: (live.battery.health ?? 100) < 60 ? 'danger' as const
        : (live.battery.health ?? 100) < 80 ? 'warning' as const
        : 'success' as const,
    },
  ], [live, systemSpecs])

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  const lastDiagStatus = currentDiagnostic?.status === 'APROBADO'
    ? 'success'
    : currentDiagnostic?.status === 'APROBADO_CON_OBSERVACIONES'
    ? 'warning'
    : 'danger'

  const statusColors = { success: 'bg-success/10 text-success border-success/20', warning: 'bg-warning/10 text-warning border-warning/20', danger: 'bg-danger/10 text-danger border-danger/20' }
  const { invoke } = useIpc()
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState<'success' | 'error' | null>(null)

  const handleExport = useCallback(async () => {
    setExporting(true)
    setExportResult(null)
    try {
      const results: ReportSectionItem[] = []
      if (currentDiagnostic) {
        for (const r of currentDiagnostic.results) {
          results.push({
            name: r.testName,
            value: r.value || '—',
            status: r.status === 'PASS' ? 'PASS' : r.status === 'FAIL' ? 'FAIL' : r.status === 'WARN' ? 'WARN' : 'SKIP',
          })
        }
      }

      const data: ReportData = {
        deviceName: systemInfo?.hostname || 'Desconocido',
        model: systemInfo?.model || '—',
        serialNumber: systemInfo?.serial || '—',
        manufacturer: systemInfo?.manufacturer || '—',
        osInfo: systemInfo?.os || '—',
        diagnosticDate: currentDiagnostic?.completedAt || new Date().toISOString(),
        technician: '',
        status: currentDiagnostic?.status || 'NO_APROBADO',
        hardwareResults: results.filter(r => ['CPU', 'GPU', 'RAM', 'Board', 'BIOS'].some(k => r.name.includes(k))),
        storageResults: results.filter(r => r.name.includes('Disco') || r.name.includes('SMART')),
        batteryResults: results.filter(r => r.name.includes('Bater')),
        manualTestResults: currentDiagnostic?.manualTests?.map(m => ({
          name: m.testType,
          value: m.details ? JSON.stringify(m.details) : '—',
          status: m.result === 'PASS' ? 'PASS' : m.result === 'FAIL' ? 'FAIL' : m.result === 'WARN' ? 'WARN' : 'SKIP',
        })) || [],
        observations: currentDiagnostic?.observations || '',
      }

      const result = await invoke(IPC_CHANNELS.REPORT_GENERATE, data)
      if (result?.success) {
        setExportResult('success')
      } else {
        setExportResult('error')
      }
    } catch {
      setExportResult('error')
    } finally {
      setExporting(false)
      setTimeout(() => setExportResult(null), 4000)
    }
  }, [invoke, systemInfo, currentDiagnostic])

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={item}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-lg shadow-primary-500/20">
                <Monitor className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary-900">
                  {systemInfo?.hostname || 'Container Diagnostic Suite'}
                </h1>
                <p className="text-sm text-neutral-500">
                  {[systemInfo?.manufacturer, systemInfo?.model].filter(Boolean).join(' ')}
                  {systemInfo?.serial ? ` • ${systemInfo.serial}` : ''}
                </p>
              </div>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider">
                {new Date().toLocaleDateString('es-MX', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="w-20 h-1 bg-gradient-to-r from-primary-500 to-primary-300 rounded-full mt-4" />
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </motion.div>

        <motion.div variants={item} className="flex gap-4 flex-wrap">
          <Button
            size="lg"
            icon={<Play className="w-5 h-5" />}
            onClick={() => navigate('/diagnostic/auto')}
          >
            Iniciar Diagnóstico Completo
          </Button>
          <Button
            size="lg"
            variant="secondary"
            icon={<Gauge className="w-5 h-5" />}
            onClick={() => navigate('/benchmark')}
          >
            Ejecutar Benchmark
          </Button>
          <Button
            size="lg"
            variant="outline"
            icon={exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Generando...' : 'Exportar Reporte'}
          </Button>
          {exportResult === 'success' && (
            <div className="flex items-center gap-2 text-sm text-success bg-success/10 px-4 py-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              Reporte guardado
            </div>
          )}
          {exportResult === 'error' && (
            <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 px-4 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              Error al guardar
            </div>
          )}
        </motion.div>

        {currentDiagnostic && (
          <motion.div
            variants={item}
            className="bg-white rounded-2xl border border-neutral-200/60 p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-50 rounded-xl">
                  <Activity className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary-900">Último Diagnóstico</h3>
                  <p className="text-xs text-neutral-500">
                    {currentDiagnostic.completedAt
                      ? new Date(currentDiagnostic.completedAt).toLocaleString('es-MX')
                      : '—'}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${statusColors[lastDiagStatus]}`}>
                {currentDiagnostic.status === 'APROBADO' ? 'Aprobado' : currentDiagnostic.status === 'APROBADO_CON_OBSERVACIONES' ? 'Con Observaciones' : 'No Aprobado'}
              </span>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed">{currentDiagnostic.summary}</p>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-neutral-100">
              <Shield className="w-4 h-4 text-neutral-400" />
              <span className="text-xs text-neutral-400">
                {currentDiagnostic.results.filter(r => r.status === 'PASS').length} pruebas pasadas • {currentDiagnostic.results.filter(r => r.status === 'FAIL').length} fallos • {currentDiagnostic.results.filter(r => r.status === 'WARN').length} observaciones
              </span>
            </div>
          </motion.div>
        )}

        {!currentDiagnostic && (
          <motion.div variants={item} className="bg-gradient-to-br from-primary-50/50 to-primary-100/30 rounded-2xl border border-primary-100/40 p-8 text-center">
            <div className="p-4 bg-primary-500/10 rounded-2xl inline-block mb-4">
              <Activity className="w-10 h-10 text-primary-500" />
            </div>
            <h3 className="text-lg font-bold text-primary-800 mb-2">Realiza tu primer diagnóstico</h3>
            <p className="text-sm text-neutral-600 mb-6 max-w-md mx-auto">
              Ejecuta un diagnóstico completo para verificar el estado de todos los componentes de tu equipo.
            </p>
            <Button size="lg" icon={<Play className="w-5 h-5" />} onClick={() => navigate('/diagnostic/auto')}>
              Comenzar <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
