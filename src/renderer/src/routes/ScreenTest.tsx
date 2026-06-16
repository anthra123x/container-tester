import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Monitor } from 'lucide-react'
import { Button } from '../components/shared/Button'

const colors = [
  { name: 'Blanco', bg: 'bg-white', border: 'border-neutral-200' },
  { name: 'Negro', bg: 'bg-black', border: 'border-neutral-700' },
  { name: 'Rojo', bg: 'bg-red-600', border: 'border-red-800' },
  { name: 'Verde', bg: 'bg-green-600', border: 'border-green-800' },
  { name: 'Azul', bg: 'bg-blue-600', border: 'border-blue-800' },
]

type ColorResult = {
  color: string
  passed: boolean | null
  note: string
}

export function ScreenTest() {
  const [fullscreenColor, setFullscreenColor] = useState<string | null>(null)
  const [results, setResults] = useState<ColorResult[]>(
    colors.map((c) => ({ color: c.name, passed: null, note: '' }))
  )

  const handleColorClick = useCallback((colorName: string) => {
    setFullscreenColor(colorName)
  }, [])

  const handleFullscreenClick = useCallback((passed: boolean) => {
    setResults((prev) =>
      prev.map((r) =>
        r.color === fullscreenColor ? { ...r, passed } : r
      )
    )
    setFullscreenColor(null)
  }, [fullscreenColor])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenColor) {
        setFullscreenColor(null)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [fullscreenColor])

  const currentColor = colors.find((c) => c.name === fullscreenColor)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Monitor className="w-6 h-6 text-primary-500" />
          <h2 className="text-xl font-bold text-primary-800">Prueba de Pantalla</h2>
        </div>
        <p className="text-sm text-neutral-700">
          Seleccione un color para mostrarlo en pantalla completa. Verifique que no haya
          píxeles muertos, quemados o decoloración.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-8">
        {colors.map((color, i) => {
          const result = results[i]
          return (
            <motion.button
              key={color.name}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleColorClick(color.name)}
              className={`aspect-square rounded-xl border-2 ${color.bg} ${color.border} flex items-center justify-center shadow-sm hover:shadow-md transition-shadow`}
            >
              <span className={`text-xs font-bold ${
                color.name === 'Negro' || color.name === 'Azul' ? 'text-white' : 'text-primary-800'
              }`}>
                {color.name}
              </span>
            </motion.button>
          )
        })}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-primary-800">Resultados</h3>
        {results.map((r) => (
          <div key={r.color} className="flex items-center justify-between bg-white rounded-lg border border-neutral-200 p-3">
            <span className="font-medium text-primary-800">{r.color}</span>
            <div className="flex items-center gap-2">
              {r.passed === null && <span className="text-sm text-neutral-400">Pendiente</span>}
              {r.passed === true && <span className="flex items-center gap-1 text-sm text-success font-medium"><Check className="w-4 h-4" /> OK</span>}
              {r.passed === false && <span className="flex items-center gap-1 text-sm text-danger font-medium"><X className="w-4 h-4" /> Falló</span>}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {fullscreenColor && currentColor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 ${currentColor.bg} flex items-center justify-center`}
            onClick={() => handleFullscreenClick(true)}
          >
            <div className="absolute top-6 left-6 text-white/80 text-lg font-bold">
              {fullscreenColor}
            </div>
            <div className="absolute bottom-8 flex gap-4">
              <Button
                variant="secondary"
                size="lg"
                icon={<X className="w-5 h-5" />}
                onClick={(e) => { e.stopPropagation(); handleFullscreenClick(false) }}
              >
                FALLÓ
              </Button>
              <Button
                size="lg"
                icon={<Check className="w-5 h-5" />}
                onClick={(e) => { e.stopPropagation(); handleFullscreenClick(true) }}
              >
                APROBADO
              </Button>
            </div>
            <div className="absolute top-6 right-6 text-white/60 text-sm">
              Click para APROBADO • ESC para salir
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
