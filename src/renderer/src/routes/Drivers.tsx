import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cpu,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  RefreshCw,
  Download,
  Filter,
  Info,
  ShieldCheck,
  ShieldX,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react'
import { useIpc } from '../hooks/useIpc'
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels'
import { Button } from '../components/shared/Button'
import type { DriverInfo, DriverUpdate, DriverScanResult, DriverInstallProgress } from '../../../shared/types/drivers.types'

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200/60 p-4 flex items-center gap-3 shadow-sm">
      <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-extrabold text-primary-900">{value}</p>
        <p className="text-xs text-neutral-500 font-medium">{label}</p>
      </div>
    </div>
  )
}

function ProblematicCard({ driver }: { driver: DriverInfo }) {
  return (
    <div className="bg-danger/5 border border-danger/10 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-danger/10 shrink-0">
          <AlertTriangle className="w-4 h-4 text-danger" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-primary-900 truncate">{driver.deviceName}</p>
          <p className="text-xs text-danger font-medium mt-0.5">{driver.errorDescription}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] text-neutral-500">
            <span>Proveedor: {driver.driverProvider || '—'}</span>
            <span>Versión: {driver.driverVersion || '—'}</span>
            {driver.hardwareId && <span className="truncate max-w-[200px]">HWID: {driver.hardwareId}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProgressModal({ progress, onClose }: { progress: DriverInstallProgress | null; onClose: () => void }) {
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
            {isError ? 'Error' : isComplete ? 'Completado' : 'Instalando...'}
          </h3>
          <p className="text-sm text-neutral-500">{progress.message}</p>
          {progress.currentUpdate && !isError && !isComplete && (
            <p className="text-xs text-neutral-400 mt-1 truncate">{progress.currentUpdate}</p>
          )}
        </div>

        <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress.progress}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full rounded-full ${isError ? 'bg-danger' : isComplete ? 'bg-success' : 'bg-primary-500'}`}
          />
        </div>

        {isComplete && progress.needsReboot && (
          <div className="bg-warning/5 border border-warning/10 rounded-xl p-3 mb-4">
            <p className="text-xs text-warning font-medium text-center">
              Se requiere reiniciar el sistema para completar la instalación.
            </p>
          </div>
        )}

        {(isError || isComplete) && (
          <Button fullWidth onClick={onClose}>
            Cerrar
          </Button>
        )}
      </motion.div>
    </motion.div>
  )
}

type FilterType = 'all' | 'problematic' | 'signed' | 'unsigned'
type SortKey = 'deviceName' | 'driverProvider' | 'driverVersion' | 'driverDate'

export function Drivers() {
  const { invoke, on } = useIpc()
  const [scanResult, setScanResult] = useState<DriverScanResult | null>(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)

  const [updates, setUpdates] = useState<DriverUpdate[]>([])
  const [updateCount, setUpdateCount] = useState(0)
  const [updatesLoading, setUpdatesLoading] = useState(false)
  const [updatesError, setUpdatesError] = useState<string | null>(null)

  const [installing, setInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState<DriverInstallProgress | null>(null)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortKey, setSortKey] = useState<SortKey>('deviceName')
  const [sortAsc, setSortAsc] = useState(true)
  const [showProblematic, setShowProblematic] = useState(true)

  useEffect(() => {
    const remove = on(IPC_CHANNELS.DRIVERS_PROGRESS, (progress: DriverInstallProgress) => {
      setInstallProgress(progress)
    })
    return () => { remove?.() }
  }, [on])

  const handleScan = async () => {
    setScanLoading(true)
    setScanError(null)
    try {
      const result = await invoke(IPC_CHANNELS.DRIVERS_SCAN) as DriverScanResult
      setScanResult(result)
      setLastScan(new Date().toLocaleString('es-ES'))
    } catch (err: any) {
      setScanError(err?.message || 'Error al escanear')
    } finally {
      setScanLoading(false)
    }
  }

  const handleCheckUpdates = async () => {
    setUpdatesLoading(true)
    setUpdatesError(null)
    try {
      const result = await invoke(IPC_CHANNELS.DRIVERS_CHECK_UPDATES) as DriverUpdateResult
      setUpdates(result.updates)
      setUpdateCount(result.totalCount)
      if (result.error) setUpdatesError(result.error)
    } catch (err: any) {
      setUpdatesError(err?.message || 'Error al buscar actualizaciones')
    } finally {
      setUpdatesLoading(false)
    }
  }

  const handleInstall = async () => {
    setInstalling(true)
    setInstallProgress({ stage: 'CHECKING', message: 'Iniciando...', progress: 0, needsReboot: false, currentUpdate: '' })
    try {
      const result = await invoke(IPC_CHANNELS.DRIVERS_INSTALL_UPDATES) as { success: boolean; error?: string }
      if (result.success) {
        setInstallProgress(prev => prev?.stage === 'ERROR' ? prev : { stage: 'COMPLETE', message: 'Instalación completada', progress: 100, needsReboot: false, currentUpdate: '' })
      } else {
        setInstallProgress({ stage: 'ERROR', message: result.error || 'Error desconocido', progress: 0, needsReboot: false, currentUpdate: '' })
      }
    } catch (err: any) {
      setInstallProgress({ stage: 'ERROR', message: err?.message || 'Error de conexión', progress: 0, needsReboot: false, currentUpdate: '' })
    } finally {
      setInstalling(false)
    }
  }

  const handleInstallClose = () => {
    setInstallProgress(null)
  }

  const filteredDrivers = useMemo(() => {
    if (!scanResult?.drivers) return []
    let list = [...scanResult.drivers]

    if (filter === 'problematic') {
      list = list.filter(d => d.errorCode !== 0)
    } else if (filter === 'signed') {
      list = list.filter(d => d.isSigned)
    } else if (filter === 'unsigned') {
      list = list.filter(d => !d.isSigned)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(d =>
        d.deviceName.toLowerCase().includes(q) ||
        d.driverProvider.toLowerCase().includes(q) ||
        d.deviceClass.toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'deviceName': cmp = a.deviceName.localeCompare(b.deviceName); break
        case 'driverProvider': cmp = a.driverProvider.localeCompare(b.driverProvider); break
        case 'driverVersion': cmp = a.driverVersion.localeCompare(b.driverVersion); break
        case 'driverDate': cmp = a.driverDate.localeCompare(b.driverDate); break
      }
      return sortAsc ? cmp : -cmp
    })

    return list
  }, [scanResult, filter, search, sortKey, sortAsc])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const problematics = scanResult?.problematics || []

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-xl font-extrabold text-primary-900 mb-1">Drivers del Sistema</h1>
        <p className="text-sm text-neutral-500">
          Escanee, verifique y actualice los controladores de su sistema.
        </p>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard
          icon={<HardDrive className="w-5 h-5 text-primary-600" />}
          label="Controladores"
          value={scanResult?.totalCount ?? '—'}
          color="bg-primary-50"
        />
        <SummaryCard
          icon={<AlertTriangle className="w-5 h-5 text-danger" />}
          label="Con errores"
          value={problematics.length}
          color="bg-danger/5"
        />
        <SummaryCard
          icon={<Download className="w-5 h-5 text-warning" />}
          label="Actualizaciones"
          value={updateCount}
          color="bg-warning/5"
        />
        <SummaryCard
          icon={<RefreshCw className="w-5 h-5 text-neutral-500" />}
          label="Último escaneo"
          value={lastScan || '—'}
          color="bg-neutral-100"
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          loading={scanLoading}
          icon={<RefreshCw className={`w-4 h-4 ${scanLoading ? 'animate-spin' : ''}`} />}
          onClick={handleScan}
        >
          {scanLoading ? 'Escaneando...' : 'Escanear controladores'}
        </Button>
        <Button
          variant="secondary"
          loading={updatesLoading}
          icon={<Download className="w-4 h-4" />}
          onClick={handleCheckUpdates}
        >
          {updatesLoading ? 'Buscando...' : 'Buscar actualizaciones'}
        </Button>
        {updateCount > 0 && (
          <Button
            loading={installing}
            icon={<HardDrive className="w-4 h-4" />}
            onClick={handleInstall}
          >
            {installing ? 'Instalando...' : `Instalar (${updateCount})`}
          </Button>
        )}
      </div>

      {scanError && (
        <div className="bg-danger/5 border border-danger/10 rounded-xl p-4 mb-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-danger">Error al escanear</p>
            <p className="text-xs text-danger/80 mt-0.5">{scanError}</p>
          </div>
        </div>
      )}

      {updatesError && (
        <div className="bg-warning/5 border border-warning/10 rounded-xl p-4 mb-5 flex items-start gap-3">
          <Info className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-warning">Aviso de actualizaciones</p>
            <p className="text-xs text-warning/80 mt-0.5">{updatesError}</p>
          </div>
        </div>
      )}

      {/* Problematic drivers section */}
      {problematics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <button
            onClick={() => setShowProblematic(!showProblematic)}
            className="flex items-center gap-2 mb-3 w-full"
          >
            <div className="flex items-center gap-2 flex-1">
              <AlertTriangle className="w-4 h-4 text-danger" />
              <h2 className="text-sm font-extrabold text-primary-900">
                {problematics.length} controlador{problematics.length !== 1 ? 'es' : ''} con problemas
              </h2>
            </div>
            {showProblematic ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
          </button>
          <AnimatePresence>
            {showProblematic && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {problematics.map((d, i) => (
                  <ProblematicCard key={`${d.hardwareId}-${i}`} driver={d} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Drivers table */}
      {scanResult && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-neutral-200/60 overflow-hidden shadow-sm"
        >
          {/* Search & filters */}
          <div className="p-4 border-b border-neutral-100 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar controlador..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-neutral-50"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-400" />
              <select
                value={filter}
                onChange={e => setFilter(e.target.value as FilterType)}
                className="text-sm border border-neutral-200 rounded-lg px-3 py-2 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="all">Todos</option>
                <option value="problematic">Con errores</option>
                <option value="signed">Firmados</option>
                <option value="unsigned">No firmados</option>
              </select>
            </div>
          </div>

          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 bg-neutral-50 text-[11px] font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-100">
            <button className="col-span-4 flex items-center gap-1 text-left" onClick={() => toggleSort('deviceName')}>
              Dispositivo {sortKey === 'deviceName' && (sortAsc ? '▲' : '▼')}
            </button>
            <button className="col-span-2 flex items-center gap-1 text-left" onClick={() => toggleSort('driverProvider')}>
              Proveedor {sortKey === 'driverProvider' && (sortAsc ? '▲' : '▼')}
            </button>
            <button className="col-span-2 flex items-center gap-1 text-left" onClick={() => toggleSort('driverVersion')}>
              Versión {sortKey === 'driverVersion' && (sortAsc ? '▲' : '▼')}
            </button>
            <button className="col-span-2 flex items-center gap-1 text-left" onClick={() => toggleSort('driverDate')}>
              Fecha {sortKey === 'driverDate' && (sortAsc ? '▲' : '▼')}
            </button>
            <span className="col-span-1 text-center">Firmado</span>
            <span className="col-span-1 text-center">Estado</span>
          </div>

          {/* Table rows */}
          <div className="divide-y divide-neutral-100">
            {filteredDrivers.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-400">
                {search || filter !== 'all'
                  ? 'No se encontraron controladores con ese filtro.'
                  : 'Presione "Escanear controladores" para comenzar.'}
              </div>
            ) : (
              filteredDrivers.map((driver, i) => (
                <div
                  key={`${driver.hardwareId || i}-${i}`}
                  className="grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors"
                >
                  <div className="md:col-span-4">
                    <p className="text-sm font-bold text-primary-900 truncate">{driver.deviceName}</p>
                    <p className="text-[11px] text-neutral-400 md:hidden mt-0.5">
                      {driver.driverProvider} · {driver.driverVersion}
                    </p>
                  </div>
                  <div className="hidden md:block md:col-span-2">
                    <p className="text-sm text-neutral-600 truncate">{driver.driverProvider || '—'}</p>
                  </div>
                  <div className="hidden md:block md:col-span-2">
                    <p className="text-sm text-neutral-600 truncate">{driver.driverVersion || '—'}</p>
                  </div>
                  <div className="hidden md:block md:col-span-2">
                    <p className="text-sm text-neutral-600">{driver.driverDate || '—'}</p>
                  </div>
                  <div className="hidden md:flex md:col-span-1 items-center justify-center">
                    {driver.isSigned
                      ? <ShieldCheck className="w-4 h-4 text-success" />
                      : <ShieldX className="w-4 h-4 text-danger" />
                    }
                  </div>
                  <div className="hidden md:flex md:col-span-1 items-center justify-center">
                    {driver.errorCode === 0 ? (
                      <span className="text-success">
                        <CheckCircle className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="text-danger" title={driver.errorDescription}>
                        <XCircle className="w-4 h-4" />
                      </span>
                    )}
                  </div>

                  {/* Mobile status row */}
                  <div className="flex md:hidden items-center gap-3 text-xs text-neutral-500 mt-1">
                    <span className={`inline-flex items-center gap-1 ${driver.isSigned ? 'text-success' : 'text-danger'}`}>
                      {driver.isSigned ? <ShieldCheck className="w-3 h-3" /> : <ShieldX className="w-3 h-3" />}
                      {driver.isSigned ? 'Firmado' : 'No firmado'}
                    </span>
                    <span className={`inline-flex items-center gap-1 ${driver.errorCode === 0 ? 'text-success' : 'text-danger'}`}>
                      {driver.errorCode === 0 ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {driver.errorCode === 0 ? 'OK' : driver.errorDescription}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-neutral-100 text-[11px] text-neutral-400">
            Mostrando {filteredDrivers.length} de {scanResult.totalCount} controladores
          </div>
        </motion.div>
      )}

      {/* Updates section */}
      {updates.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 bg-white rounded-xl border border-neutral-200/60 overflow-hidden shadow-sm"
        >
          <div className="p-4 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-warning" />
              <h2 className="text-sm font-extrabold text-primary-900">
                {updateCount} actualización{updateCount !== 1 ? 'es' : ''} disponible{updateCount !== 1 ? 's' : ''}
              </h2>
            </div>
          </div>
          <div className="divide-y divide-neutral-100">
            {updates.map((update, i) => (
              <div key={i} className="p-4 hover:bg-neutral-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-warning/5 shrink-0">
                    <Download className="w-3.5 h-3.5 text-warning" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-primary-900">{update.title}</p>
                    {update.description && (
                      <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{update.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] text-neutral-400">
                      {update.driverVersion && <span>Versión: {update.driverVersion}</span>}
                      {update.kbArticle && <span>KB: {update.kbArticle}</span>}
                      {update.categories.length > 0 && <span>{update.categories.join(', ')}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Info note */}
      {!scanResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-5 p-4 bg-neutral-50 rounded-xl border border-neutral-200/60"
        >
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-500 leading-relaxed">
              <p className="font-medium text-neutral-600 mb-1">Notas:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>El escaneo de controladores no requiere permisos de administrador.</li>
                <li>La búsqueda de actualizaciones usa Windows Update y puede tomar varios segundos.</li>
                <li>La instalación de actualizaciones requiere permisos de administrador.</li>
                <li>Algunos controladores pueden requerir reinicio después de la instalación.</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {installProgress && (
          <ProgressModal progress={installProgress} onClose={handleInstallClose} />
        )}
      </AnimatePresence>
    </div>
  )
}


