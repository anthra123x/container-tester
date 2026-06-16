import { motion, AnimatePresence } from 'framer-motion'
import { Play, ArrowRight, Activity } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
  const { isRunning, phases, currentDiagnostic } = useDiagnosticStore()
  const { runDiagnostic, loading } = useDiagnostic()

  const nonSkipped = phases.filter(p => p.status !== 'SKIP')
  const allPassed = nonSkipped.length > 0 && nonSkipped.every(p => p.status === 'PASS')
  const hasFailures = phases.some(p => p.status === 'FAIL')
  const isComplete = !isRunning && phases.some(p => p.status !== 'PENDING')
  const badgeStatus = currentDiagnostic ? statusMap[currentDiagnostic.status] ?? 'PASS' : 'PASS'

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
            <div className="p-6 rounded-full bg-primary-50 mb-6">
              <Activity className="w-16 h-16 text-primary-500" />
            </div>
            <h2 className="text-2xl font-bold text-primary-800 mb-2">Diagnóstico Automático</h2>
            <p className="text-neutral-700 text-center max-w-md mb-8">
              Esta prueba analizará el hardware del equipo: CPU, RAM, almacenamiento,
              batería, sensores de temperatura y conectividad de red.
            </p>
            <Button
              size="lg"
              loading={loading}
              icon={<Play className="w-5 h-5" />}
              onClick={runDiagnostic}
            >
              Iniciar Diagnóstico Completo
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
              <Activity className="w-6 h-6 text-primary-500 animate-pulse" />
              <h2 className="text-xl font-bold text-primary-800">Ejecutando Diagnóstico...</h2>
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
            <div className="bg-white rounded-xl border border-neutral-200 p-6 text-center">
              <div className={`inline-flex p-4 rounded-full mb-4 ${
                allPassed ? 'bg-green-50' : hasFailures ? 'bg-red-50' : 'bg-orange-50'
              }`}>
                <Activity className={`w-12 h-12 ${
                  allPassed ? 'text-success' : hasFailures ? 'text-danger' : 'text-warning'
                }`} />
              </div>
              <h2 className="text-2xl font-bold text-primary-800 mb-2">
                Diagnóstico {allPassed ? 'Completado' : 'Finalizado'}
              </h2>
              <div className="flex justify-center mb-4">
                <ResultBadge status={badgeStatus} size="lg" />
              </div>
              <p className="text-neutral-700 max-w-md mx-auto">
                {currentDiagnostic.summary}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-primary-800">Resultados por Fase</h3>
              {phases.map((phase, i) => (
                <ProgressCard key={phase.id} phase={phase} index={i} />
              ))}
            </div>

            <div className="flex gap-4 justify-center pt-4">
              <Button
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={() => navigate('/diagnostic/manual')}
              >
                Ir a Pruebas Manuales
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
