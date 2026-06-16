import { motion } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  status: 'success' | 'warning' | 'danger'
  trend?: { value: number }[]
  onClick?: () => void
}

const statusDots = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

export function MetricCard({ icon, label, value, status, trend, onClick }: MetricCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(30,58,95,0.12)' }}
      onClick={onClick}
      className="bg-white rounded-xl p-5 border border-neutral-200 cursor-pointer transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-lg bg-primary-50 text-primary-500">
          {icon}
        </div>
        <span className={`w-3 h-3 rounded-full mt-1 ${statusDots[status]}`} />
      </div>
      <p className="text-sm text-neutral-700 font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-primary-800">{value}</p>
      {trend && trend.length > 0 && (
        <div className="mt-3 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="#1E3A5F"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  )
}
