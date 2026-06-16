import { Check, X, AlertTriangle, Loader2 } from 'lucide-react'
import type { TestStatus } from '../../../../shared/types/diagnostic.types'

interface ResultBadgeProps {
  status: TestStatus
  size?: 'sm' | 'md' | 'lg'
}

const config = {
  PASS: { bg: 'bg-success', icon: Check, text: 'APROBADO' },
  FAIL: { bg: 'bg-danger', icon: X, text: 'FALLÓ' },
  WARN: { bg: 'bg-warning', icon: AlertTriangle, text: 'OBSERVACIÓN' },
  PENDING: { bg: 'bg-neutral-200', icon: null, text: 'PENDIENTE' },
  RUNNING: { bg: 'bg-primary-500', icon: null, text: 'EJECUTANDO' },
  SKIP: { bg: 'bg-neutral-200', icon: null, text: 'SALTADO' },
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-3 py-1 text-sm gap-1.5',
  lg: 'px-4 py-1.5 text-base gap-2',
}

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

export function ResultBadge({ status, size = 'md' }: ResultBadgeProps) {
  const cfg = config[status]
  const Icon = cfg.icon
  const showSpinner = status === 'RUNNING'

  return (
    <span className={`inline-flex items-center rounded-full text-white font-medium ${cfg.bg} ${sizeClasses[size]}`}>
      {showSpinner && <Loader2 className={`${iconSizes[size]} animate-spin`} />}
      {Icon && !showSpinner && <Icon className={iconSizes[size]} />}
      {cfg.text}
    </span>
  )
}
