interface StatusIndicatorProps {
  status: 'success' | 'warning' | 'danger' | 'inactive'
  label: string
}

const dotColors = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  inactive: 'bg-neutral-200',
}

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${dotColors[status]}`} />
      <span className="text-sm text-neutral-700">{label}</span>
    </div>
  )
}
