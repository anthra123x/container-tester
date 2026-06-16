import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Loader2, Check, X } from 'lucide-react'
import { useState } from 'react'
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

export function ProgressCard({ phase, index }: ProgressCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isActive = phase.status === 'RUNNING'
  const isDone = phase.status === 'PASS' || phase.status === 'FAIL' || phase.status === 'WARN'

  const progress = isDone ? 100 : isActive ? 60 : 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-xl border border-neutral-200 overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-neutral-50 transition-colors"
      >
        <div className="flex-shrink-0">
          {statusIcon[phase.status]}
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold text-primary-800">{phase.label}</p>
          <p className="text-sm text-neutral-700">{phase.description}</p>
        </div>
        <div className="flex items-center gap-3">
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
                <div key={result.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700">{result.testName}</span>
                    <span className="font-medium">{result.value || '—'}</span>
                  </div>
                  {result.observations && (
                    <p className="text-xs text-danger mt-0.5 ml-0">{result.observations}</p>
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
