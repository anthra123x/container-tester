import { motion, AnimatePresence } from 'framer-motion'
import { Play, ArrowRight, Activity, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { useDiagnosticStore } from '../stores/diagnostic.store'
import { useDiagnostic } from '../hooks/useDiagnostic'
import { ProgressCard } from '../components/diagnostic/ProgressCard'
import { ResultBadge } from '../components/diagnostic/ResultBadge'
import { Button } from '../components/shared/Button'
import type { TestStatus } from '../../../shared/types/diagnostic.types'

const statusMap: Record<string, TestStatus> = {
  APROBADO: 'PASS',
  APROBADO_CON_OBSERVACIONES: 'WARN',
  NO_APROBADO: 'FAIL',
  REQUIERE_REPARACION: 'FAIL',
}

export function AutoDiagnostic() {
  const navigate = useNavigate()
  const { isRunning, phases, currentDiagnostic } = useDiagnosticStore(
    useShallow((s) => ({ isRunning: s.isRunning, phases: s.phases, currentDiagnostic: s.currentDiagnostic }))
  )
  const { runDiagnostic, loading } = useDiagnostic()

  const nonSkipped = phases.filter(p => p.status !== 'SKIP')
  const allPassed = nonSkipped.length > 0 && nonSkipped.every(p => p.status === 'PASS')
  const hasFailures = phases.some(p => p.status === 'FAIL')
  const isComplete = !isRunning && phases.some(p => p.status !== 'PENDING')
  const badgeStatus = currentDiagnostic ? statusMap[currentDiagnostic.status] ?? 'PASS' : 'PASS'

  const summaryIcon = allPassed
    ? { icon: CheckCircle, bg: 'bg-success/10', color: 'text-success' }
    : hasFailures
      ? { icon: XCircle, bg: 'bg-danger/10', color: 'text-danger' }
      : { icon: AlertTriangle, bg: 'bg-warning/10', color: 'text-warning' }
  const SumIcon = summaryIcon.icon

  return (
    <div className="max-w-3xl mx-auto">
      <AnimatePresence mode="wait">
        {!isRunning && !isComplete && (
          <motion.div
            key="start"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100/50 mb-6">
              <Activity className="w-16 h-16 text-primary-500" />
            </div>
            <h2 className="text-2xl font-bold text-primary-900 mb-2">Diagnóstico Automático</h2>
            <p className="text-neutral-500 text-center max-w-md mb-8 leading-relaxed">
              Analiza el hardware del equipo: CPU, RAM, almacenamiento, batería, sensores y conectividad de red.
            </p>
            <Button size="lg" loading={loading} icon={<Play className="w-5 h-5" />} onClick={runDiagnostic}>
              Iniciar Diagnóstico
            </Button>
          </motion.div>
        )}

        {isRunning && (
          <motion.div
            key="running"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4 py-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary-50 rounded-xl">
                <Activity className="w-5 h-5 text-primary-500 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-primary-900">Ejecutando Diagnóstico...</h2>
                <p className="text-xs text-neutral-500">Analizando componentes del equipo</p>
              </div>
            </div>
            {phases.map((phase, i) => (
              <ProgressCard key={phase.id} phase={phase} index={i} />
            ))}
          </motion.div>
        )}

        {isComplete && currentDiagnostic && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 py-6"
          >
            <div className="bg-white rounded-2xl border border-neutral-200/60 p-8 text-center shadow-sm">
              <div className={`inline-flex p-4 rounded-2xl ${summaryIcon.bg} mb-5`}>
                <SumIcon className={`w-12 h-12 ${summaryIcon.color}`} />
              </div>
              <h2 className="text-2xl font-bold text-primary-900 mb-2">
                {allPassed ? 'Diagnóstico Exitoso' : hasFailures ? 'Se Detectaron Fallos' : 'Diagnóstico con Observaciones'}
              </h2>
              <div className="flex justify-center mb-4">
                <ResultBadge status={badgeStatus} size="lg" />
              </div>
              <p className="text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
                {currentDiagnostic.summary}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-primary-500" />
                <h3 className="font-bold text-primary-900 text-sm uppercase tracking-wider">Resultados por Fase</h3>
              </div>
              {phases.map((phase, i) => (
                <ProgressCard key={phase.id} phase={phase} index={i} />
              ))}
            </div>

            <div className="flex gap-4 justify-center pt-4">
              <Button icon={<ArrowRight className="w-4 h-4" />} onClick={() => navigate('/diagnostic/manual')}>
                Ir a Pruebas Manuales
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
