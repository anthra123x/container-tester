import { motion } from 'framer-motion'
import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Gauge,
  Cpu,
  MemoryStick,
  HardDrive,
  Loader2,
  Trophy,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
} from 'lucide-react'
import { useIpc } from '../hooks/useIpc'
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels'
import { Button } from '../components/shared/Button'

interface BenchmarkPhaseResult {
  score: number
  rating: string
  details: string
}

interface BenchmarkData {
  cpu: BenchmarkPhaseResult
  memory: BenchmarkPhaseResult
  disk: BenchmarkPhaseResult
  overall: { score: number; rating: string; summary: string }
}

const phasesMeta = [
  { key: 'cpu', icon: Cpu, color: 'from-amber-500/20 to-orange-500/10', border: 'border-amber-200/50', textColor: 'text-amber-700', label: 'CPU', bg: 'bg-amber-50' },
  { key: 'memory', icon: MemoryStick, color: 'from-purple-500/20 to-fuchsia-500/10', border: 'border-purple-200/50', textColor: 'text-purple-700', label: 'Memoria', bg: 'bg-purple-50' },
  { key: 'disk', icon: HardDrive, color: 'from-cyan-500/20 to-sky-500/10', border: 'border-cyan-200/50', textColor: 'text-cyan-700', label: 'Disco', bg: 'bg-cyan-50' },
]

function ratingColor(rating: string): string {
  if (rating === 'Excelente') return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  if (rating === 'Bueno') return 'text-blue-600 bg-blue-50 border-blue-200'
  if (rating === 'Regular') return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-red-600 bg-red-50 border-red-200'
}

function ratingIcon(rating: string) {
  if (rating === 'Excelente' || rating === 'Bueno') return <CheckCircle2 className="w-4 h-4" />
  return <AlertCircle className="w-4 h-4" />
}

function PhaseCard({
  meta,
  result,
  running,
  progress,
  current,
}: {
  meta: typeof phasesMeta[0]
  result?: BenchmarkPhaseResult
  running: boolean
  progress: number
  current: boolean
}) {
  const Icon = meta.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-5 border ${meta.color} ${meta.border} bg-white shadow-sm ${current ? 'ring-2 ring-primary-400 ring-offset-2' : ''}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-xl ${meta.bg}`}>
          <Icon className={`w-5 h-5 ${meta.textColor}`} />
        </div>
        <div>
          <h3 className="font-bold text-sm text-primary-900">{meta.label}</h3>
          {running && <p className="text-xs text-neutral-500">{progress}%</p>}
        </div>
        {running && (
          <div className="ml-auto">
            <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
          </div>
        )}
      </div>

      {running && (
        <div className="w-full bg-neutral-100 rounded-full h-2 mb-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-300 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-primary-900">{result.score}</span>
            <span className="text-xs text-neutral-400">pts</span>
            <span className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${ratingColor(result.rating)}`}>
              {ratingIcon(result.rating)}
              {result.rating}
            </span>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">{result.details}</p>
        </div>
      )}
    </motion.div>
  )
}

export function Benchmark() {
  const { invoke, on } = useIpc()
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ cpu: 0, memory: 0, disk: 0 })
  const [result, setResult] = useState<BenchmarkData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const cleanup = on('benchmark:progress', (data: { phase: string; pct: number }) => {
      if (mountedRef.current) {
        setProgress(prev => ({ ...prev, [data.phase]: data.pct }))
      }
    })
    return () => {
      mountedRef.current = false
      if (typeof cleanup === 'function') cleanup()
    }
  }, [on])

  const runFull = useCallback(async () => {
    setRunning(true)
    setResult(null)
    setError(null)
    setProgress({ cpu: 0, memory: 0, disk: 0 })

    try {
      const data: BenchmarkData = await invoke(IPC_CHANNELS.BENCHMARK_RESULT)
      if (mountedRef.current) {
        setResult(data)
        setRunning(false)
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err?.message || 'Error ejecutando benchmark')
        setRunning(false)
      }
    }
  }, [invoke])

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl shadow-lg shadow-red-500/20">
              <Gauge className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-900">Benchmark</h1>
              <p className="text-sm text-neutral-500">
                Evalúa el rendimiento de CPU, memoria y almacenamiento con pruebas de estrés
              </p>
            </div>
          </div>
          <div className="w-20 h-1 bg-gradient-to-r from-red-500 to-orange-300 rounded-full mt-4" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {!running && !result && !error && (
            <div className="bg-gradient-to-br from-neutral-50 to-neutral-100/50 rounded-2xl border border-neutral-200/60 p-8 text-center">
              <div className="p-4 bg-red-500/10 rounded-2xl inline-block mb-4">
                <Gauge className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-primary-800 mb-2">Prueba de Rendimiento</h3>
              <p className="text-sm text-neutral-600 mb-6 max-w-lg mx-auto leading-relaxed">
                Esta prueba estresará tu equipo para evaluar su rendimiento real.
                <strong className="block mt-2 text-amber-700">Recomendación: cierra otras aplicaciones antes de ejecutar.</strong>
              </p>
              <Button size="lg" icon={<Gauge className="w-5 h-5" />} onClick={runFull}>
                Iniciar Benchmark Completo <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {running && (
            <div className="space-y-4">
              {phasesMeta.map(m => (
                <PhaseCard
                  key={m.key}
                  meta={m}
                  running={true}
                  current={false}
                  progress={progress[m.key as keyof typeof progress]}
                />
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-700 font-medium mb-2">Error al ejecutar benchmark</p>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <Button variant="secondary" onClick={() => setError(null)}>
                Reintentar
              </Button>
            </div>
          )}

          {result && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-6 text-white shadow-lg shadow-primary-500/20 mb-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Resultado General</h2>
                    <p className="text-sm text-primary-200">{result.overall.summary}</p>
                  </div>
                </div>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-extrabold tracking-tight">{result.overall.score}</span>
                  <span className="text-primary-200 mb-1">pts</span>
                  <span className="ml-auto self-center flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border bg-white/15 border-white/20">
                    {ratingIcon(result.overall.rating)}
                    {result.overall.rating}
                  </span>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {phasesMeta.map(m => (
                  <PhaseCard
                    key={m.key}
                    meta={m}
                    result={result[m.key as keyof BenchmarkData] as BenchmarkPhaseResult}
                    running={false}
                    current={false}
                    progress={100}
                  />
                ))}
              </div>

              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  icon={<RotateCcw className="w-4 h-4" />}
                  onClick={runFull}
                >
                  Ejecutar de nuevo
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
