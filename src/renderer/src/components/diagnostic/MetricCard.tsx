import { motion } from 'framer-motion'

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  subvalue?: string | null
  status: 'success' | 'warning' | 'danger'
  onClick?: () => void
}

const statusConfig = {
  success: { dot: 'bg-success', bg: 'bg-success/10', border: 'border-success/20' },
  warning: { dot: 'bg-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
  danger: { dot: 'bg-danger', bg: 'bg-danger/10', border: 'border-danger/20' },
}

export function MetricCard({ icon, label, value, subvalue, status, onClick }: MetricCardProps) {
  const cfg = statusConfig[status]
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(26,54,93,0.1)' }}
      onClick={onClick}
      className="bg-white rounded-xl p-5 border border-neutral-200/60 cursor-pointer transition-all duration-200 hover:border-neutral-300"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${cfg.bg}`}>
          {icon}
        </div>
        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} ring-2 ring-white`} />
      </div>
      <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xl font-extrabold text-primary-900 truncate">{value}</p>
      {subvalue && <p className="text-xs text-neutral-400 mt-1">{subvalue}</p>}
    </motion.div>
  )
}
