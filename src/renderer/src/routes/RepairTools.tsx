import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  RefreshCw,
  HardDrive,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ScrollText,
} from 'lucide-react'
import { useIpc } from '../hooks/useIpc'
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels'
import { Button } from '../components/shared/Button'
import type { RepairTool, RepairStage, RepairProgress } from '../../../shared/types/repair.types'

const REPAIR_TOOL_INFO: Record<RepairTool, { label: string; description: string; icon: typeof Shield }> = {
  sfc: { label: 'SFC /scannow', description: 'Verifica la integridad de archivos protegidos del sistema', icon: Shield },
  dism: { label: 'DISM /RestoreHealth', description: 'Repara la imagen de Windows y el almacén de componentes', icon: RefreshCw },
  chkdsk: { label: 'chkdsk /scan', description: 'Escanea el disco en busca de errores del sistema de archivos', icon: HardDrive },
}

function toolStatus(tool: RepairTool, progress: RepairProgress | null, running: boolean, completed: Record<string, boolean>): { label: string; color: string; dot: string } {
  if (progress && progress.tool === tool && progress.stage === 'ERROR') {
    return { label: 'Error', color: 'text-danger bg-danger/10', dot: 'bg-danger' }
  }
  if (progress && progress.tool === tool && (progress.stage === 'COMPLETE' || progress.stage === 'DONE')) {
    return { label: 'Completado', color: 'text-success bg-success/10', dot: 'bg-success' }
  }
  if (running && progress?.tool === tool) {
    return { label: 'Ejecutando...', color: 'text-primary-500 bg-primary-50', dot: 'bg-primary-500 animate-pulse' }
  }
  if (completed[tool]) {
    return { label: 'Completado', color: 'text-success bg-success/10', dot: 'bg-success' }
  }
  return { label: 'Sin ejecutar', color: 'text-neutral-400 bg-neutral-100', dot: 'bg-neutral-400' }
}

function ProgressModal({
  progress,
  onClose,
}: {
  progress: RepairProgress | null
  onClose: () => void
}) {
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [progress?.logLines])

  if (!progress) return null

  const isError = progress.stage === 'ERROR'
  const isComplete = progress.stage === 'COMPLETE'
  const icon = REPAIR_TOOL_INFO[progress.tool]?.icon || Shield
  const IconComponent = icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[80vh] flex flex-col"
      >
        <div className="text-center mb-4">
          {isError ? (
            <div className="w-14 h-14 mx-auto rounded-full bg-danger/10 flex items-center justify-center mb-3">
              <XCircle className="w-7 h-7 text-danger" />
            </div>
          ) : isComplete ? (
            <div className="w-14 h-14 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-3">
              <CheckCircle className="w-7 h-7 text-success" />
            </div>
          ) : (
            <div className="w-14 h-14 mx-auto rounded-full bg-primary-50 flex items-center justify-center mb-3">
              <IconComponent className="w-7 h-7 text-primary-500" />
            </div>
          )}
          <h3 className="text-lg font-bold text-primary-900 mb-1">
            {isError ? 'Error' : isComplete ? 'Completado' : REPAIR_TOOL_INFO[progress.tool]?.label || progress.tool}
          </h3>
          <p className="text-sm text-neutral-500">{progress.message}</p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto bg-neutral-900 text-green-400 rounded-xl p-4 font-mono text-xs leading-relaxed">
          {progress.logLines.length === 0 ? (
            <span className="text-neutral-500">Esperando salida...</span>
          ) : (
            progress.logLines.map((line, i) => {
              const display = line.includes('|') ? line.split('|').slice(1).join('|') : line
              return <div key={i}>{display}</div>
            })
          )}
          <div ref={logEndRef} />
        </div>

        {(isError || isComplete) && (
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export function RepairTools() {
  const { invoke, on } = useIpc()
  const [running, setRunning] = useState(false)
  const [currentTool, setCurrentTool] = useState<RepairTool | null>(null)
  const [progress, setProgress] = useState<RepairProgress | null>(null)
  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    const remove = on<RepairProgress>(IPC_CHANNELS.REPAIR_PROGRESS, (data) => {
      if (!mountedRef.current) return
      setProgress(data)
      if (data.stage === 'COMPLETE' || data.stage === 'ERROR') {
        setRunning(false)
        if (data.stage === 'COMPLETE') {
          setCompleted(prev => ({ ...prev, [data.tool]: true }))
        }
      }
    })
    return remove
  }, [on])

  const handleRun = useCallback(async (tool: RepairTool) => {
    if (running) return
    setRunning(true)
    setCurrentTool(tool)
    setProgress({
      tool,
      stage: 'INIT',
      message: `Iniciando ${REPAIR_TOOL_INFO[tool].label}...`,
      logLines: [],
    })

    try {
      await invoke(IPC_CHANNELS.REPAIR_RUN, tool)
    } catch (err: any) {
      if (mountedRef.current) {
        setProgress(prev => prev ? {
          ...prev,
          stage: 'ERROR',
          message: `Error: ${err.message}`,
        } : null)
        setRunning(false)
      }
    }
  }, [invoke, running])

  const handleCloseModal = useCallback(() => {
    setProgress(null)
    setCurrentTool(null)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-primary-900">Herramientas de Reparación</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Utilidades del sistema para diagnosticar y reparar problemas comunes de Windows
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.entries(REPAIR_TOOL_INFO) as [RepairTool, typeof REPAIR_TOOL_INFO[RepairTool]][]).map(([tool, info]) => {
          const IconComponent = info.icon
          const status = toolStatus(tool, progress, running && currentTool === tool, completed)

          return (
            <motion.div
              key={tool}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-neutral-200/60 overflow-hidden shadow-sm flex flex-col"
            >
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-primary-50">
                    <IconComponent className="w-5 h-5 text-primary-500" />
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${status.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </div>
                <h3 className="font-bold text-primary-900 mb-1 text-base">{info.label}</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">{info.description}</p>
              </div>
              <div className="px-5 pb-5">
                <Button
                  variant={running && currentTool === tool ? 'secondary' : 'primary'}
                  fullWidth
                  loading={running && currentTool === tool}
                  disabled={running && currentTool !== tool}
                  onClick={() => handleRun(tool)}
                >
                  {running && currentTool === tool ? 'Ejecutando...' : 'Ejecutar'}
                </Button>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-neutral-200/60 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-50 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-primary-900 mb-1">Información importante</h4>
            <ul className="text-xs text-neutral-500 space-y-1">
              <li>• Estas herramientas requieren permisos de administrador</li>
              <li>• SFC /scannow puede tardar entre 15-30 minutos en completarse</li>
              <li>• DISM /RestoreHealth requiere conexión a Internet o fuente de instalación de Windows</li>
              <li>• chkdsk /scan solo escanea sin realizar reparaciones (usar /f para reparar)</li>
            </ul>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {progress && !(progress.stage === 'COMPLETE' || progress.stage === 'ERROR') && (
          <ProgressModal progress={progress} onClose={handleCloseModal} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {progress && (progress.stage === 'COMPLETE' || progress.stage === 'ERROR') && (
          <ProgressModal progress={progress} onClose={handleCloseModal} />
        )}
      </AnimatePresence>

      {completed && Object.keys(completed).length > 0 && (
        <div className="bg-success/5 border border-success/10 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <p className="text-sm text-success font-medium">
              Herramientas completadas: {Object.keys(completed).map(t => REPAIR_TOOL_INFO[t as RepairTool]?.label || t).join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
