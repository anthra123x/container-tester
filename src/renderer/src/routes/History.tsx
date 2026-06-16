import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Search, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '../components/shared/Button'
import { useIpc } from '../hooks/useIpc'
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels'
import type { Diagnostic, DiagnosticStatus } from '../../../shared/types/diagnostic.types'

const statusColors: Record<string, string> = {
  APROBADO: 'bg-success',
  APROBADO_CON_OBSERVACIONES: 'bg-warning',
  REQUIERE_REPARACION: 'bg-warning',
  NO_APROBADO: 'bg-danger',
}

const statusFilters = ['TODOS', 'APROBADO', 'APROBADO_CON_OBSERVACIONES', 'NO_APROBADO'] as const

export function History() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('TODOS')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [history, setHistory] = useState<Diagnostic[]>([])
  const [loading, setLoading] = useState(true)
  const { invoke } = useIpc()

  const loadHistory = async () => {
    setLoading(true)
    try {
      const list = await invoke(IPC_CHANNELS.HISTORY_LIST)
      setHistory(list)
    } catch {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadHistory() }, [])

  const handleDelete = async (id: string) => {
    await invoke(IPC_CHANNELS.HISTORY_DELETE, id)
    setHistory(prev => prev.filter(h => h.id !== id))
  }

  const filtered = history.filter((h) => {
    const matchesSearch = h.deviceId?.toLowerCase().includes(search.toLowerCase()) ||
      h.id?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'TODOS' || h.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Clock className="w-6 h-6 text-primary-500" />
            <h2 className="text-xl font-bold text-primary-800">Historial</h2>
          </div>
          <p className="text-sm text-neutral-700">Historial completo de diagnósticos</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por equipo o ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 w-full"
          />
        </div>
        <div className="flex gap-1">
          {statusFilters.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === f
                  ? 'bg-primary-500 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {f === 'TODOS' ? 'Todos' : f.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-sm text-neutral-400">Cargando historial...</div>
      )}

      {!loading && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-neutral-50 text-xs font-semibold text-neutral-700 uppercase tracking-wider">
            <span className="col-span-3">Fecha</span>
            <span className="col-span-2">Equipo</span>
            <span className="col-span-3">Estado</span>
            <span className="col-span-4 text-right">Acciones</span>
          </div>

          <AnimatePresence>
            {filtered.map((h) => (
              <motion.div
                key={h.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
                  className="grid grid-cols-12 gap-4 px-5 py-4 items-center border-t border-neutral-100 hover:bg-neutral-50 cursor-pointer"
                >
                  <span className="col-span-3 text-sm text-neutral-700">{new Date(h.startedAt).toLocaleString('es-MX')}</span>
                  <span className="col-span-2 text-sm font-medium text-primary-800">{h.deviceId || '—'}</span>
                  <span className="col-span-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium text-white ${statusColors[h.status]}`}>
                      {h.status.replace(/_/g, ' ')}
                    </span>
                  </span>
                  <span className="col-span-4 flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={(e) => { e?.stopPropagation?.(); handleDelete(h.id) }} icon={<Trash2 className="w-4 h-4 text-danger" />} />
                    <Button variant="ghost" size="sm" icon={expandedId === h.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} />
                  </span>
                </div>

                <AnimatePresence>
                  {expandedId === h.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 py-4 bg-neutral-50 border-t border-neutral-100 space-y-2">
                        <p className="text-sm text-neutral-700">{h.summary || 'Sin observaciones'}</p>
                        <div className="flex flex-wrap gap-2">
                          {h.results.slice(0, 6).map(r => (
                            <span key={r.id} className="text-xs px-2 py-0.5 rounded bg-white border border-neutral-200">
                              {r.testName}: {r.value}
                            </span>
                          ))}
                          {h.results.length > 6 && (
                            <span className="text-xs text-neutral-400">+{h.results.length - 6} más</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-neutral-400">
              No se encontraron resultados
            </div>
          )}
        </div>
      )}
    </div>
  )
}
