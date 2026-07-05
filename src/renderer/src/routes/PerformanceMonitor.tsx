import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Activity, Cpu, MemoryStick, HardDrive, Thermometer, Clock, AlertTriangle } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { useLiveMetrics, type LiveMetrics } from '../hooks/useLiveMetrics'

interface ChartPoint {
  time: string
  cpu: number
  ram: number
  disk: number
  temp: number | null
}

function useLiveMetricsHistory(maxSamples = 60) {
  const { metrics, connected, restricted } = useLiveMetrics(5000)
  const [history, setHistory] = useState<ChartPoint[]>([])

  useEffect(() => {
    const point: ChartPoint = {
      time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      cpu: metrics.cpu.usage,
      ram: metrics.ram.usagePercent,
      disk: metrics.storage.usagePercent,
      temp: metrics.cpu.temperature,
    }

    setHistory(prev => {
      const next = [...prev, point]
      if (next.length > maxSamples) return next.slice(next.length - maxSamples)
      return next
    })
  }, [metrics, maxSamples])

  return { history, connected, restricted }
}

function ChartCard({
  title,
  icon: Icon,
  color,
  dataKey,
  data,
  unit = '%',
  domain = [0, 100],
  colorHex,
}: {
  title: string
  icon: typeof Cpu
  color: string
  dataKey: string
  data: ChartPoint[]
  unit?: string
  domain?: [number, number]
  colorHex: string
}) {
  const currentValue = data.length > 0 ? data[data.length - 1][dataKey as keyof ChartPoint] : 0
  const avgValue = data.length > 0
    ? Math.round(data.reduce((sum, p) => sum + ((p[dataKey as keyof ChartPoint] as number) || 0), 0) / data.length)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-neutral-200/60 overflow-hidden shadow-sm"
    >
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-primary-900">{title}</h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span>Avg: <strong className="text-primary-700">{avgValue}{unit}</strong></span>
            <span>Now: <strong className={colorHex}>{currentValue}{unit}</strong></span>
          </div>
        </div>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={domain}
              tick={{ fontSize: 9, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}${unit}`}
              width={36}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
              formatter={(value: number) => [`${value}${unit}`, title]}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={colorHex}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

export function PerformanceMonitor() {
  const { history, connected, restricted } = useLiveMetricsHistory(60)

  const cpuAvg = useMemo(() => {
    if (history.length === 0) return 0
    return Math.round(history.reduce((s, p) => s + p.cpu, 0) / history.length)
  }, [history])

  const ramAvg = useMemo(() => {
    if (history.length === 0) return 0
    return Math.round(history.reduce((s, p) => s + p.ram, 0) / history.length)
  }, [history])

  const diskAvg = useMemo(() => {
    if (history.length === 0) return 0
    return Math.round(history.reduce((s, p) => s + p.disk, 0) / history.length)
  }, [history])

  const latest = history[history.length - 1]
  const hasTemp = latest?.temp != null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-primary-900">Monitor de Rendimiento</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Métricas en tiempo real con historial de los últimos 5 minutos
        </p>
      </div>

      {restricted && (
        <div className="bg-danger/5 border border-danger/10 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-danger/10 shrink-0">
            <AlertTriangle className="w-4 h-4 text-danger" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-primary-900 mb-0.5">Permisos insuficientes</h4>
            <p className="text-xs text-neutral-600">
              No se pueden obtener las métricas del sistema. La aplicación necesita ejecutarse como administrador.
              Cierre y reinicie la aplicación con permisos elevados.
            </p>
          </div>
        </div>
      )}

      {!connected && !restricted && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          No se pueden obtener métricas en vivo en este momento
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard
          title="CPU"
          icon={Cpu}
          color="bg-cyan-50"
          dataKey="cpu"
          data={history}
          colorHex="#06b6d4"
        />
        <ChartCard
          title="RAM"
          icon={MemoryStick}
          color="bg-purple-50"
          dataKey="ram"
          data={history}
          colorHex="#a855f7"
        />
        <ChartCard
          title="Almacenamiento"
          icon={HardDrive}
          color="bg-amber-50"
          dataKey="disk"
          data={history}
          colorHex="#f59e0b"
        />
        <ChartCard
          title="Temperatura CPU"
          icon={Thermometer}
          color="bg-rose-50"
          dataKey="temp"
          data={history}
          unit="°C"
          domain={hasTemp ? [undefined, undefined] : [0, 100]}
          colorHex="#f43f5e"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={Cpu} label="CPU" value={`${latest?.cpu ?? 0}%`} sub={`Promedio: ${cpuAvg}%`} color="text-cyan-600 bg-cyan-50" />
        <SummaryCard icon={MemoryStick} label="RAM" value={`${latest?.ram ?? 0}%`} sub={`Promedio: ${ramAvg}%`} color="text-purple-600 bg-purple-50" />
        <SummaryCard icon={HardDrive} label="Disco" value={`${latest?.disk ?? 0}%`} sub={`Promedio: ${diskAvg}%`} color="text-amber-600 bg-amber-50" />
        <SummaryCard icon={Thermometer} label="Temperatura" value={latest?.temp != null ? `${latest.temp}°C` : '—'} sub="CPU" color="text-rose-600 bg-rose-50" />
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-400">
        <Clock className="w-3.5 h-3.5" />
        <span>Actualizando cada 5 segundos — muestras: {history.length} / 60 ({Math.round(history.length * 5 / 60 * 100)}% de 5 min)</span>
      </div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof Cpu
  label: string
  value: string
  sub: string
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200/60 p-4 flex items-center gap-3 shadow-sm">
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-lg font-extrabold text-primary-900">{value}</p>
        <p className="text-[11px] text-neutral-500 font-medium">{sub}</p>
      </div>
    </div>
  )
}
