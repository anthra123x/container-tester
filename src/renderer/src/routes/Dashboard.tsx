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
} from 'lucide-react'
import { useDiagnosticStore } from '../stores/diagnostic.store'
import { MetricCard } from '../components/diagnostic/MetricCard'
import { Button } from '../components/shared/Button'
import { useSystemInfo } from '../hooks/useSystemInfo'

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

  const metrics = [
    {
      icon: <Cpu className="w-5 h-5" />,
      label: 'CPU',
      value: systemSpecs?.cpu ? `${systemSpecs.cpu.brand || '—'}`.slice(0, 28) : '—',
      subvalue: systemSpecs?.cpu ? `${systemSpecs.cpu.cores} núcleos @ ${systemSpecs.cpu.speed} GHz` : null,
      status: (systemSpecs?.cpu?.usage ?? 0) >= 80 ? 'warning' as const : 'success' as const,
    },
    {
      icon: <MemoryStick className="w-5 h-5" />,
      label: 'RAM',
      value: systemSpecs?.ram ? formatBytes(systemSpecs.ram.total) : '—',
      subvalue: systemSpecs?.ram ? `${systemSpecs.ram.usagePercent}% usado` : null,
      status: (systemSpecs?.ram?.usagePercent ?? 0) >= 85 ? 'warning' as const : 'success' as const,
    },
    {
      icon: <HardDrive className="w-5 h-5" />,
      label: 'Disco',
      value: systemSpecs?.storage?.[0] ? formatBytes(systemSpecs.storage[0].size) : '—',
      subvalue: systemSpecs?.storage?.[0] ? `${systemSpecs.storage[0].usagePercent}% usado` : null,
      status: (systemSpecs?.storage?.[0]?.usagePercent ?? 0) >= 90 ? 'danger' as const : 'success' as const,
    },
    {
      icon: <Battery className="w-5 h-5" />,
      label: 'Batería',
      value: systemSpecs?.battery?.hasBattery
        ? systemSpecs.battery.isCharging ? 'Cargando' : `${systemSpecs.battery.health ?? '—'}% salud`
        : 'No detectada',
      subvalue: systemSpecs?.battery?.hasBattery && systemSpecs.battery.cycleCount != null
        ? `${systemSpecs.battery.cycleCount} ciclos`
        : null,
      status: (systemSpecs?.battery?.health ?? 100) < 60 ? 'danger' as const
        : (systemSpecs?.battery?.health ?? 100) < 80 ? 'warning' as const
        : 'success' as const,
    },
  ]

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

        <motion.div variants={item} className="flex gap-4">
          <Button
            size="lg"
            icon={<Play className="w-5 h-5" />}
            onClick={() => navigate('/diagnostic/auto')}
          >
            Iniciar Diagnóstico Completo
          </Button>
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
