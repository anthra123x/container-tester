import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Save, User, Monitor, Folder, Info } from 'lucide-react'
import { Button } from '../components/shared/Button'
import { useIpc } from '../hooks/useIpc'
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels'

export function Settings() {
  const [technician, setTechnician] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [outputDir, setOutputDir] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const { invoke } = useIpc()

  useEffect(() => {
    invoke(IPC_CHANNELS.SETTINGS_GET).then((s: any) => {
      if (s) {
        if (s.technician) setTechnician(s.technician)
        if (s.theme) setTheme(s.theme)
        if (s.outputDir) setOutputDir(s.outputDir)
      }
    }).finally(() => setLoading(false))
  }, [invoke])

  const handleSave = async () => {
    await invoke(IPC_CHANNELS.SETTINGS_SET, { technician, theme, outputDir })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleFolderPick = async () => {
    try {
      const dir = await invoke(IPC_CHANNELS.SETTINGS_SELECT_DIR)
      if (dir) setOutputDir(dir)
    } catch {
    }
  }

  if (loading) return null

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <SettingsIcon className="w-6 h-6 text-primary-500" />
          <h2 className="text-xl font-bold text-primary-800">Configuración</h2>
        </div>
        <p className="text-sm text-neutral-700">Ajustes de la aplicación</p>
      </div>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-neutral-200 p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-primary-800">Técnico</h3>
          </div>
          <label className="block text-sm text-neutral-700 mb-1.5">Nombre del técnico</label>
          <input
            type="text"
            value={technician}
            onChange={(e) => setTechnician(e.target.value)}
            placeholder="Ingrese su nombre"
            className="w-full px-4 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-xl border border-neutral-200 p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <Monitor className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-primary-800">Apariencia</h3>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme('light')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                theme === 'light'
                  ? 'border-primary-500 bg-primary-50 text-primary-500'
                  : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Claro
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                theme === 'dark'
                  ? 'border-primary-500 bg-primary-50 text-primary-500'
                  : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Oscuro
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-neutral-200 p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <Folder className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-primary-800">Reportes</h3>
          </div>
          <label className="block text-sm text-neutral-700 mb-1.5">Directorio de salida</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={outputDir}
              readOnly
              className="flex-1 px-4 py-2 rounded-lg border border-neutral-200 text-sm bg-neutral-50 text-neutral-700"
            />
            <Button variant="secondary" onClick={handleFolderPick}>
              Examinar
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-xl border border-neutral-200 p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-primary-800">Acerca de</h3>
          </div>
          <p className="text-sm text-neutral-700">
            <strong className="text-primary-800">Container Diagnostic Suite</strong> v1.0.0
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Aplicación de diagnóstico de hardware para equipos de cómputo
          </p>
        </motion.div>

        <div className="flex justify-end">
          <Button
            size="lg"
            icon={<Save className="w-5 h-5" />}
            onClick={handleSave}
            className={saved ? 'bg-success' : ''}
          >
            {saved ? 'Guardado' : 'Guardar Configuración'}
          </Button>
        </div>
      </div>
    </div>
  )
}
