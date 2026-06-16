import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Loader2, Check, X, AlertTriangle, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { AutoDiagnosticPhase } from '../../../../shared/types/diagnostic.types'
import { ResultBadge } from './ResultBadge'

interface ProgressCardProps {
  phase: AutoDiagnosticPhase
  index: number
}

const statusIcon = {
  RUNNING: <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />,
  PASS: <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center"><Check className="w-3.5 h-3.5 text-white" /></div>,
  FAIL: <div className="w-5 h-5 rounded-full bg-danger flex items-center justify-center"><X className="w-3.5 h-3.5 text-white" /></div>,
  WARN: <div className="w-5 h-5 rounded-full bg-warning flex items-center justify-center"><Check className="w-3.5 h-3.5 text-white" /></div>,
  PENDING: <div className="w-5 h-5 rounded-full border-2 border-neutral-200" />,
  SKIP: <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center"><X className="w-3 h-3 text-white" /></div>,
}

const borderColor = {
  PASS: 'border-success/20', FAIL: 'border-danger/30', WARN: 'border-warning/30',
  RUNNING: 'border-primary-200', PENDING: 'border-neutral-200', SKIP: 'border-neutral-200',
}

const bgColor = {
  PASS: 'hover:bg-success/[0.02]', FAIL: 'hover:bg-danger/[0.02]', WARN: 'hover:bg-warning/[0.02]',
  RUNNING: 'hover:bg-primary-50/50', PENDING: 'hover:bg-neutral-50', SKIP: 'hover:bg-neutral-50',
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

  const observations = isDone ? getPhaseObservations(phase) : []
  const hasIssues = observations.length > 0

  useEffect(() => {
    if (isDone && hasIssues) setExpanded(true)
  }, [isDone, hasIssues])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.2 }}
      className={`bg-white rounded-xl border shadow-sm ${borderColor[phase.status]} transition-all duration-200`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-4 p-4 transition-colors ${bgColor[phase.status]}`}
      >
        <div className="flex-shrink-0">{statusIcon[phase.status]}</div>
        <div className="flex-1 text-left min-w-0">
          <p className={`font-bold text-sm ${isDone && phase.status !== 'PASS' ? '' : 'text-primary-900'}`}>
            {phase.label}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">{phase.description}</p>
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
                <p className="text-xs text-neutral-400 ml-5">+{observations.length - 2} más</p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isDone && <ResultBadge status={phase.status} size="sm" />}
          {phase.results.length > 0 && (
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.15 }}>
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            </motion.div>
          )}
        </div>
      </button>

      {isActive && (
        <div className="px-4 pb-4 -mt-1">
          <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="h-full w-1/2 bg-gradient-to-r from-primary-300 via-primary-500 to-primary-300 rounded-full"
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
            transition={{ duration: 0.15 }}
            className="border-t border-neutral-100/80"
          >
            <div className="px-4 pb-3 space-y-1">
              {phase.results.map((result) => (
                <div key={result.id} className={`p-2.5 rounded-lg text-sm ${
                  result.status === 'FAIL' ? 'bg-red-50 border border-red-100' : result.status === 'WARN' ? 'bg-orange-50 border border-orange-100' : ''
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-medium ${result.status === 'FAIL' ? 'text-danger' : result.status === 'WARN' ? 'text-warning' : 'text-neutral-600'}`}>
                      {result.testName}
                    </span>
                    <span className={`text-xs font-bold text-right ${result.status === 'FAIL' ? 'text-danger' : result.status === 'WARN' ? 'text-warning' : 'text-primary-800'}`}>
                      {result.value || '—'}
                    </span>
                  </div>
                  {result.observations && (
                    <p className={`text-[11px] mt-1 leading-relaxed ${
                      result.status === 'FAIL' ? 'text-danger/80' : result.status === 'WARN' ? 'text-warning/80' : 'text-neutral-500'
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
