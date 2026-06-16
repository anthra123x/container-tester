import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Search, Eye, File as FileIcon, Clock, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '../components/shared/Button'
import { useIpc } from '../hooks/useIpc'
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels'
import type { Diagnostic } from '../../../shared/types/diagnostic.types'

const statusColors: Record<string, string> = {
  APROBADO: 'bg-success',
  APROBADO_CON_OBSERVACIONES: 'bg-warning',
  REQUIERE_REPARACION: 'bg-warning',
  NO_APROBADO: 'bg-danger',
}

export function Reports() {
  const [search, setSearch] = useState('')
  const [reports, setReports] = useState<Diagnostic[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { invoke } = useIpc()

  const loadReports = async () => {
    setLoading(true)
    try {
      const list = await invoke(IPC_CHANNELS.REPORT_LIST)
      setReports(list)
    } catch {
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReports() }, [])

  const filtered = reports.filter((r) =>
    r.deviceId?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FileText className="w-6 h-6 text-primary-500" />
            <h2 className="text-xl font-bold text-primary-800">Reportes</h2>
          </div>
          <p className="text-sm text-neutral-700">Reportes generados de diagnósticos</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por equipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 w-64"
          />
        </div>
      </div>

      {loading && (
        <div className="text-center py-20 text-sm text-neutral-400">Cargando reportes...</div>
      )}

      {!loading && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <FileIcon className="w-16 h-16 text-neutral-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-700 mb-1">Sin reportes</h3>
          <p className="text-sm text-neutral-400">
            {search ? 'No se encontraron reportes con ese nombre.' : 'No hay reportes generados todavía.'}
          </p>
        </motion.div>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-neutral-50 text-xs font-semibold text-neutral-700 uppercase tracking-wider">
          <span className="col-span-3">Fecha</span>
          <span className="col-span-3">Equipo</span>
          <span className="col-span-3">Estado</span>
          <span className="col-span-3 text-right">Acciones</span>
        </div>

        <AnimatePresence>
          {filtered.map((report, i) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div
                onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                className="grid grid-cols-12 gap-4 px-5 py-4 items-center border-t border-neutral-100 hover:bg-neutral-50 cursor-pointer"
              >
                <span className="col-span-3 text-sm text-neutral-700">
                  {new Date(report.startedAt).toLocaleString('es-MX')}
                </span>
                <span className="col-span-3 text-sm font-medium text-primary-800">{report.deviceId || '—'}</span>
                <span className="col-span-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium text-white ${statusColors[report.status] || 'bg-neutral-400'}`}>
                    {report.status.replace(/_/g, ' ')}
                  </span>
                </span>
                <span className="col-span-3 flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Eye className="w-4 h-4" />}
                    onClick={(e) => { e?.stopPropagation?.(); setExpandedId(expandedId === report.id ? null : report.id) }}
                  >
                    Abrir
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={expandedId === report.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  />
                </span>
              </div>

              <AnimatePresence>
                {expandedId === report.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 py-4 bg-neutral-50 border-t border-neutral-100 space-y-4">
                      {report.summary && (
                        <p className="text-sm text-neutral-700">{report.summary}</p>
                      )}

                      {report.results.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-primary-800 mb-2">Resultados</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {report.results.map(r => (
                              <div key={r.id} className="flex items-center justify-between bg-white rounded-lg border border-neutral-200 px-3 py-2">
                                <span className="text-xs text-neutral-700">{r.testName}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-neutral-500">{r.value || ''}</span>
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                    r.status === 'PASS' ? 'text-green-700 bg-green-100' :
                                    r.status === 'FAIL' ? 'text-red-700 bg-red-100' :
                                    r.status === 'WARN' ? 'text-orange-700 bg-orange-100' :
                                    'text-neutral-500 bg-neutral-100'
                                  }`}>
                                    {r.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {report.manualTests.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-primary-800 mb-2">Pruebas Manuales</h4>
                          <div className="space-y-1">
                            {report.manualTests.map(t => (
                              <div key={t.id} className="flex items-center justify-between bg-white rounded-lg border border-neutral-200 px-3 py-2">
                                <span className="text-xs text-neutral-700">{t.testType}</span>
                                <div className="flex items-center gap-2">
                                  {t.observations && <span className="text-xs text-neutral-500">{t.observations}</span>}
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                    t.result === 'PASS' ? 'text-green-700 bg-green-100' :
                                    t.result === 'FAIL' ? 'text-red-700 bg-red-100' :
                                    'text-orange-700 bg-orange-100'
                                  }`}>
                                    {t.result}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {!loading && filtered.length === 0 && null}
      </div>
    </div>
  )
}
