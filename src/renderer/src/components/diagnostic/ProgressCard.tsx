import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Loader2, Check, X, AlertTriangle, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { AutoDiagnosticPhase } from '../../../../shared/types/diagnostic.types'
import { ResultBadge } from './ResultBadge'

interface ProgressCardProps {
  phase: AutoDiagnosticPhase
  index: number
}

const statusIcon = {
  RUNNING: <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />,
  PASS: <Check className="w-5 h-5 text-success" />,
  FAIL: <X className="w-5 h-5 text-danger" />,
  WARN: <Check className="w-5 h-5 text-warning" />,
  PENDING: <div className="w-5 h-5 rounded-full border-2 border-neutral-200" />,
  SKIP: <div className="w-5 h-5 rounded-full bg-neutral-200" />,
}

function getPhaseObservations(phase: AutoDiagnosticPhase): string[] {
  const obs: string[] = []
  for (const r of phase.results) {
    if (r.observations && (r.status === 'FAIL' || r.status === 'WARN')) {
      obs.push(`${r.testName}: ${r.observations}`)
    }
  }
  return obs
}

export function ProgressCard({ phase, index }: ProgressCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isActive = phase.status === 'RUNNING'
  const isDone = phase.status === 'PASS' || phase.status === 'FAIL' || phase.status === 'WARN'

  const progress = isDone ? 100 : isActive ? 60 : 0

  const observations = isDone ? getPhaseObservations(phase) : []
  const hasIssues = observations.length > 0

  useEffect(() => {
    if (isDone && hasIssues) {
      setExpanded(true)
    }
  }, [isDone, hasIssues])

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`bg-white rounded-xl border overflow-hidden ${
        phase.status === 'FAIL' ? 'border-danger/30' : phase.status === 'WARN' ? 'border-warning/30' : 'border-neutral-200'
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-neutral-50 transition-colors"
      >
        <div className="flex-shrink-0">
          {statusIcon[phase.status]}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="font-semibold text-primary-800">{phase.label}</p>
          <p className="text-sm text-neutral-700">{phase.description}</p>
          {hasIssues && (
            <div className="mt-1.5 space-y-0.5">
              {observations.slice(0, 2).map((obs, i) => (
                <p key={i} className="text-xs flex items-start gap-1.5">
                  {phase.status === 'FAIL'
                    ? <AlertCircle className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                  }
                  <span className={phase.status === 'FAIL' ? 'text-danger' : 'text-warning'}>{obs}</span>
                </p>
              ))}
              {observations.length > 2 && (
                <p className="text-xs text-neutral-500 ml-5">+{observations.length - 2} más</p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isDone && <ResultBadge status={phase.status} size="sm" />}
          {phase.results.length > 0 && (
            expanded ? <ChevronUp className="w-4 h-4 text-neutral-700" /> : <ChevronDown className="w-4 h-4 text-neutral-700" />
          )}
        </div>
      </button>

      {isActive && (
        <div className="px-4 pb-4">
          <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '60%' }}
              transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
              className="h-full bg-primary-500 rounded-full"
            />
          </div>
        </div>
      )}

      <AnimatePresence>
        {expanded && phase.results.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-neutral-100"
          >
            <div className="p-4 space-y-2">
              {phase.results.map((result) => (
                <div key={result.id} className={`p-2 rounded-lg ${
                  result.status === 'FAIL' ? 'bg-red-50' : result.status === 'WARN' ? 'bg-orange-50' : ''
                }`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      {result.status === 'FAIL' && <AlertCircle className="w-3.5 h-3.5 text-danger shrink-0" />}
                      {result.status === 'WARN' && <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />}
                      <span className={result.status === 'FAIL' ? 'font-medium text-danger' : result.status === 'WARN' ? 'font-medium text-warning' : 'text-neutral-700'}>{result.testName}</span>
                    </span>
                    <span className="font-medium">{result.value || '—'}</span>
                  </div>
                  {result.observations && (
                    <p className={`text-xs mt-1 ${
                      result.status === 'FAIL' ? 'text-danger' : result.status === 'WARN' ? 'text-warning' : 'text-neutral-700'
                    }`}>
                      {result.observations}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
