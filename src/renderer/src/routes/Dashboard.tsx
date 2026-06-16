import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Battery,
  Play,
  FileText,
  Monitor,
  Activity,
} from 'lucide-react'
import { useDiagnosticStore } from '../stores/diagnostic.store'
import { MetricCard } from '../components/diagnostic/MetricCard'
import { Button } from '../components/shared/Button'
import { useEffect, useState } from 'react'

export function Dashboard() {
  const navigate = useNavigate()
  const systemInfo = useDiagnosticStore((s) => s.systemInfo)
  const currentDiagnostic = useDiagnosticStore((s) => s.currentDiagnostic)
  const [dateTime, setDateTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const metrics = [
    {
      icon: <Cpu className="w-5 h-5" />,
      label: 'CPU',
      value: systemInfo?.model?.slice(0, 30) || '—',
      status: 'success' as const,
    },
    {
      icon: <MemoryStick className="w-5 h-5" />,
      label: 'RAM',
      value: '—',
      status: 'success' as const,
    },
    {
      icon: <HardDrive className="w-5 h-5" />,
      label: 'Disco',
      value: '—',
      status: 'success' as const,
    },
    {
      icon: <Battery className="w-5 h-5" />,
      label: 'Batería',
      value: '—',
      status: 'warning' as const,
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

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <Monitor className="w-7 h-7 text-primary-500" />
              <div>
                <h1 className="text-2xl font-bold text-primary-800">
                  {systemInfo?.hostname || 'Container Diagnostic Suite'}
                </h1>
                <p className="text-sm text-neutral-700">
                  {systemInfo?.manufacturer} {systemInfo?.model} • {systemInfo?.serial}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-neutral-700 font-medium">
                {dateTime.toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="text-xs text-neutral-700">
                {dateTime.toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </p>
            </div>
          </div>
          <div className="w-16 h-1 bg-primary-500 rounded-full mt-3" />
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
          <Button
            variant="outline"
            size="lg"
            icon={<FileText className="w-5 h-5" />}
            onClick={() => navigate('/reports')}
          >
            Ver Último Reporte
          </Button>
        </motion.div>

        {currentDiagnostic && (
          <motion.div
            variants={item}
            className="bg-white rounded-xl border border-neutral-200 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-primary-500" />
                <h3 className="font-semibold text-primary-800">Último Diagnóstico</h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${
                lastDiagStatus === 'success' ? 'bg-success' : lastDiagStatus === 'warning' ? 'bg-warning' : 'bg-danger'
              }`}>
                {currentDiagnostic.status}
              </span>
            </div>
            <p className="text-sm text-neutral-700">
              {currentDiagnostic.completedAt
                ? new Date(currentDiagnostic.completedAt).toLocaleString('es-MX')
                : '—'}
            </p>
            <p className="text-sm text-neutral-700 mt-1">{currentDiagnostic.summary}</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
