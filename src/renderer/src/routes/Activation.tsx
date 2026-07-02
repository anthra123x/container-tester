import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  ShieldX,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Info,
  Download,
  RefreshCw,
} from 'lucide-react'
import { useIpc } from '../hooks/useIpc'
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels'
import { Button } from '../components/shared/Button'
import type { WindowsActivationStatus, OfficeActivationStatus, MASProgress } from '../../../shared/types/activation.types'

function WindowsCard({
  status,
  loading,
  refreshing,
  onActivate,
  onRefresh,
  activating,
}: {
  status: WindowsActivationStatus | null
  loading: boolean
  refreshing: boolean
  onActivate: () => void
  onRefresh: () => void
  activating: boolean
}) {
  const isActivated = status?.activated

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-neutral-200/60 overflow-hidden shadow-sm"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isActivated ? 'bg-success/10' : 'bg-danger/10'}`}>
              {isActivated
                ? <ShieldCheck className="w-5 h-5 text-success" />
                : <ShieldX className="w-5 h-5 text-danger" />
              }
            </div>
            <div>
              <h3 className="font-bold text-primary-900">Windows</h3>
              <p className="text-xs text-neutral-500">Estado de activación</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading || refreshing ? (
              <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            ) : (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                isActivated ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
              }`}>
                {isActivated ? 'Activado' : 'No activado'}
              </span>
            )}
          </div>
        </div>

        {!loading && !refreshing && status && (
          <div className="space-y-2.5">
            <InfoRow label="Edición" value={status.edition || '—'} />
            <InfoRow label="Producto" value={status.productName || '—'} />
            <InfoRow label="Licencia" value={status.licenseChannel || '—'} />
            <InfoRow label="Clave parcial" value={status.partialProductKey ? `*****-*****-*****-*****-${status.partialProductKey}` : '—'} />
            <InfoRow label="Tipo VL" value={status.vlActivationType || '—'} />
            {status.gracePeriodRemaining != null && (
              <InfoRow
                label="Días de gracia"
                value={`${status.gracePeriodRemaining} días`}
                warn
              />
            )}
          </div>
        )}

        {!loading && !refreshing && !status && (
          <p className="text-sm text-neutral-400 italic">No se pudo obtener información de activación.</p>
        )}

        {refreshing && (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
            <span className="text-xs text-primary-500 font-medium">Refrescando...</span>
          </div>
        )}
      </div>

      <div className="px-6 pb-6 flex gap-2">
        <button
          onClick={onRefresh}
          disabled={loading || refreshing}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-500 hover:text-primary-600 hover:bg-primary-50 border border-neutral-200 transition-colors disabled:opacity-50"
          title="Refrescar estado"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refrescar
        </button>
        {!isActivated && !loading && !refreshing && (
          <Button
            fullWidth
            loading={activating}
            icon={<Download className="w-4 h-4" />}
            onClick={onActivate}
          >
            Activar Windows
          </Button>
        )}
      </div>
    </motion.div>
  )
}

function OfficeCard({
  status,
  loading,
  refreshing,
  onActivate,
  onRefresh,
  activating,
}: {
  status: OfficeActivationStatus | null
  loading: boolean
  refreshing: boolean
  onActivate: () => void
  onRefresh: () => void
  activating: boolean
}) {
  if (!status?.installed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-neutral-200/60 overflow-hidden shadow-sm opacity-60"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-neutral-100">
                <ShieldCheck className="w-5 h-5 text-neutral-400" />
              </div>
              <div>
                <h3 className="font-bold text-primary-900">Microsoft Office</h3>
                <p className="text-xs text-neutral-500">Estado de activación</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-500">
              No instalado
            </span>
          </div>
          <p className="text-sm text-neutral-400 italic">No se detectó una instalación de Office.</p>
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={onRefresh}
            disabled={loading || refreshing}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-500 hover:text-primary-600 hover:bg-primary-50 border border-neutral-200 transition-colors disabled:opacity-50"
            title="Refrescar estado"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
        </div>
      </motion.div>
    )
  }

  const isActivated = status?.activated

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-neutral-200/60 overflow-hidden shadow-sm"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isActivated ? 'bg-success/10' : 'bg-warning/10'}`}>
              {isActivated
                ? <ShieldCheck className="w-5 h-5 text-success" />
                : <AlertTriangle className="w-5 h-5 text-warning" />
              }
            </div>
            <div>
              <h3 className="font-bold text-primary-900">Microsoft Office</h3>
              <p className="text-xs text-neutral-500">Estado de activación</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading || refreshing ? (
              <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            ) : (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                isActivated ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
              }`}>
                {isActivated ? 'Activado' : 'No activado'}
              </span>
            )}
          </div>
        </div>

        {!loading && !refreshing && (
          <div className="space-y-2.5">
            <InfoRow label="Versión" value={status.version || '—'} />
            {status.productName && <InfoRow label="Producto" value={status.productName} />}
            {status.productKey && <InfoRow label="Clave parcial" value={`*****-*****-*****-*****-${status.productKey}`} />}
            {status.licenseStatus && <InfoRow label="Estado de licencia" value={status.licenseStatus} />}
          </div>
        )}

        {refreshing && (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
            <span className="text-xs text-primary-500 font-medium">Refrescando...</span>
          </div>
        )}
      </div>

      <div className="px-6 pb-6 flex gap-2">
        <button
          onClick={onRefresh}
          disabled={loading || refreshing}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-500 hover:text-primary-600 hover:bg-primary-50 border border-neutral-200 transition-colors disabled:opacity-50"
          title="Refrescar estado"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refrescar
        </button>
        {!isActivated && (
          <Button
            fullWidth
            variant="secondary"
            loading={activating}
            icon={<Download className="w-4 h-4" />}
            onClick={onActivate}
          >
            Activar Office
          </Button>
        )}
      </div>
    </motion.div>
  )
}

function InfoRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-neutral-100 last:border-0">
      <span className="text-xs text-neutral-500 font-medium">{label}</span>
      <span className={`text-xs font-bold text-right max-w-[60%] truncate ${warn ? 'text-warning' : 'text-primary-800'}`}>
        {value}
      </span>
    </div>
  )
}

function ProgressModal({ progress, onClose }: { progress: MASProgress | null; onClose: () => void }) {
  if (!progress) return null

  const isError = progress.stage === 'ERROR'
  const isComplete = progress.stage === 'COMPLETE'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl"
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
              <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
            </div>
          )}

          <h3 className="text-lg font-bold text-primary-900 mb-1">
            {isError ? 'Error' : isComplete ? 'Completado' : 'Activando...'}
          </h3>
          <p className="text-sm text-neutral-500">{progress.message}</p>
        </div>

        <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress.progress}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full rounded-full ${isError ? 'bg-danger' : isComplete ? 'bg-success' : 'bg-primary-500'}`}
          />
        </div>

        {(isError || isComplete) && (
          <Button fullWidth onClick={onClose}>
            Cerrar
          </Button>
        )}
      </motion.div>
    </motion.div>
  )
}

function DisclaimerModal({
  target,
  onConfirm,
  onCancel,
}: {
  target: 'windows' | 'office' | null
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!target) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl"
      >
        <div className="w-14 h-14 mx-auto rounded-full bg-warning/10 flex items-center justify-center mb-3">
          <AlertTriangle className="w-7 h-7 text-warning" />
        </div>

        <h3 className="text-lg font-bold text-primary-900 mb-2 text-center">Confirmar Activación</h3>

        <div className="bg-neutral-50 rounded-xl p-4 mb-4 text-sm text-neutral-600 leading-relaxed space-y-2">
          <p>
            Se descargará y ejecutará <strong>Microsoft Activation Scripts (MAS)</strong> de{' '}
            <a
              href="https://massgrave.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-500 underline inline-flex items-center gap-1"
            >
              massgrave.dev <ExternalLink className="w-3 h-3" />
            </a>
          </p>
          <div className="flex items-start gap-2 text-xs text-neutral-500">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>MAS es un script open-source. El código fuente está disponible en GitHub. Se verificará la integridad del script mediante SHA256 antes de ejecutarlo.</span>
          </div>
          <p className="text-xs font-medium text-warning">
            El script se ejecutará con permisos de administrador.{'\n'}Su antivirus puede bloquear la ejecución — es normal para este tipo de herramientas.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onCancel}>
            Cancelar
          </Button>
          <Button fullWidth onClick={onConfirm}>
            Confirmar y Activar
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function Activation() {
  const { invoke, on } = useIpc()
  const [windowsStatus, setWindowsStatus] = useState<WindowsActivationStatus | null>(null)
  const [officeStatus, setOfficeStatus] = useState<OfficeActivationStatus | null>(null)
  const [loadingWindows, setLoadingWindows] = useState(true)
  const [loadingOffice, setLoadingOffice] = useState(true)
  const [refreshingWindows, setRefreshingWindows] = useState(false)
  const [refreshingOffice, setRefreshingOffice] = useState(false)
  const [activating, setActivating] = useState<'windows' | 'office' | null>(null)
  const [masProgress, setMasProgress] = useState<MASProgress | null>(null)
  const [showDisclaimer, setShowDisclaimer] = useState<'windows' | 'office' | null>(null)
  const refreshCountRef = useRef(0)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadStatus = useCallback(async () => {
    setLoadingWindows(true)
    setLoadingOffice(true)
    try {
      const [win, off] = await Promise.all([
        invoke(IPC_CHANNELS.ACTIVATION_GET_WINDOWS),
        invoke(IPC_CHANNELS.ACTIVATION_GET_OFFICE),
      ])
      if (win) setWindowsStatus(win as WindowsActivationStatus)
      if (off) setOfficeStatus(off as OfficeActivationStatus)
    } catch {
    } finally {
      setLoadingWindows(false)
      setLoadingOffice(false)
    }
  }, [invoke])

  const refreshWithRetry = useCallback(async (maxAttempts = 5) => {
    refreshCountRef.current = 0
    setRefreshingWindows(true)
    setRefreshingOffice(true)

    const attempt = async (): Promise<boolean> => {
      refreshCountRef.current++
      let winActivated = false
      let offStatus: OfficeActivationStatus | null = null

      try {
        const [win, off] = await Promise.all([
          invoke(IPC_CHANNELS.ACTIVATION_GET_WINDOWS),
          invoke(IPC_CHANNELS.ACTIVATION_GET_OFFICE),
        ])
        if (win) {
          setWindowsStatus(win as WindowsActivationStatus)
          winActivated = (win as WindowsActivationStatus).activated
        }
        if (off) {
          setOfficeStatus(off as OfficeActivationStatus)
          offStatus = off as OfficeActivationStatus
        }
      } catch {
        return false
      }

      return winActivated
    }

    const result = await attempt()
    if (result) {
      setRefreshingWindows(false)
      setRefreshingOffice(false)
      return
    }

    if (refreshCountRef.current < maxAttempts) {
      await sleep(2000)
      await attempt()
    }

    if (refreshCountRef.current < maxAttempts) {
      await sleep(2000)
      await attempt()
    }

    if (refreshCountRef.current < maxAttempts) {
      await sleep(2000)
      await attempt()
    }

    if (refreshCountRef.current < maxAttempts) {
      await sleep(2000)
      await attempt()
    }

    setRefreshingWindows(false)
    setRefreshingOffice(false)
  }, [invoke])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  useEffect(() => {
    const remove = on(IPC_CHANNELS.ACTIVATION_PROGRESS, (progress: MASProgress) => {
      setMasProgress(progress)
    })
    return () => { remove?.() }
  }, [on])

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [])

  const handleActivate = async (target: 'windows' | 'office') => {
    setShowDisclaimer(target)
  }

  const confirmActivation = async () => {
    const target = showDisclaimer
    if (!target) return

    setShowDisclaimer(null)
    setActivating(target)
    setMasProgress({ stage: 'DOWNLOADING', message: 'Iniciando...', progress: 0 })

    try {
      const result = await invoke(IPC_CHANNELS.ACTIVATION_RUN_MAS, target) as { success: boolean; error?: string }

      if (result.success) {
        setMasProgress({ stage: 'COMPLETE', message: 'Activación completada. Verifique el estado.', progress: 100 })
      } else {
        setMasProgress({ stage: 'ERROR', message: result.error || 'Error desconocido', progress: 0 })
      }
    } catch (err: any) {
      setMasProgress({ stage: 'ERROR', message: err?.message || 'Error de conexión', progress: 0 })
    } finally {
      setActivating(null)
    }
  }

  const handleProgressClose = async () => {
    setMasProgress(null)
    const wasComplete = masProgress?.stage === 'COMPLETE'
    if (wasComplete) {
      refreshWithRetry()
    } else {
      loadStatus()
    }
  }

  const handleRefresh = () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshWithRetry()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-xl font-extrabold text-primary-900 mb-1">Activación de Windows y Office</h1>
        <p className="text-sm text-neutral-500">
          Verifique el estado de activación de su sistema y active si es necesario.
        </p>
      </motion.div>

      <div className="space-y-5">
        <WindowsCard
          status={windowsStatus}
          loading={loadingWindows}
          refreshing={refreshingWindows}
          onActivate={() => handleActivate('windows')}
          onRefresh={handleRefresh}
          activating={activating === 'windows'}
        />
        <OfficeCard
          status={officeStatus}
          loading={loadingOffice}
          refreshing={refreshingOffice}
          onActivate={() => handleActivate('office')}
          onRefresh={handleRefresh}
          activating={activating === 'office'}
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-6 p-4 bg-neutral-50 rounded-xl border border-neutral-200/60"
      >
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
          <div className="text-xs text-neutral-500 leading-relaxed">
            <p className="font-medium text-neutral-600 mb-1">Notas:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>La detección de activación funciona sin permisos de administrador en la mayoría de sistemas.</li>
              <li>La activación requiere permisos de administrador y puede ser detectada por antivirus como falso positivo.</li>
              <li>Microsoft Activation Scripts es un proyecto open-source de la comunidad. Consulte <a href="https://massgrave.dev" target="_blank" rel="noopener noreferrer" className="text-primary-500 underline">massgrave.dev</a> para más información.</li>
            </ul>
          </div>
        </div>
      </motion.div>

      <DisclaimerModal
        target={showDisclaimer}
        onConfirm={confirmActivation}
        onCancel={() => setShowDisclaimer(null)}
      />

      <AnimatePresence>
        {masProgress && (
          <ProgressModal progress={masProgress} onClose={handleProgressClose} />
        )}
      </AnimatePresence>
    </div>
  )
}
