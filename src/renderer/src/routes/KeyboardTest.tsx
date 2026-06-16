import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Keyboard, Check, X } from 'lucide-react'
import { VirtualKeyboard } from '../components/keyboard/VirtualKeyboard'
import { Button } from '../components/shared/Button'

export function KeyboardTest() {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set())
  const [totalPresses, setTotalPresses] = useState(0)
  const [result, setResult] = useState<'PASS' | 'FAIL' | null>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault()
    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key
    const mappedKey = key === ' ' ? ' ' : key === 'Escape' ? 'Esc' : key === 'CapsLock' ? 'Caps' : key

    setPressedKeys((prev) => {
      const next = new Set(prev)
      next.add(mappedKey)
      return next
    })
    setTotalPresses((p) => p + 1)
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    e.preventDefault()
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  const virtualKeyPress = useCallback((key: string) => {
    setPressedKeys((prev) => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
    setTotalPresses((p) => p + 1)
  }, [])

  const totalKeys = 104
  const progress = Math.round((pressedKeys.size / totalKeys) * 100)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Keyboard className="w-6 h-6 text-primary-500" />
          <h2 className="text-xl font-bold text-primary-800">Prueba de Teclado</h2>
        </div>
        <p className="text-sm text-neutral-700">
          Presione cada tecla del teclado físico para verificarla. Las teclas verificadas
          se marcarán en verde.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-700">
              Teclas: <strong className="text-primary-800">{pressedKeys.size}</strong> / {totalKeys}
            </span>
            <span className="text-sm text-neutral-700">
              Pulsaciones: <strong className="text-primary-800">{totalPresses}</strong>
            </span>
          </div>
          <span className="text-sm font-medium text-primary-800">{progress}%</span>
        </div>

        <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden mb-6">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-success rounded-full"
          />
        </div>

        <VirtualKeyboard onKeyPress={virtualKeyPress} testedKeys={pressedKeys} />
      </div>

      {result && (
        <div className={`mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium ${
          result === 'PASS' ? 'bg-success' : 'bg-danger'
        }`}>
          {result === 'PASS' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {result === 'PASS' ? 'Teclado aprobado' : 'Teclado no aprobado'}
        </div>
      )}

      <div className="flex gap-4">
        <Button
          variant="danger"
          icon={<X className="w-4 h-4" />}
          onClick={() => setResult('FAIL')}
        >
          Marcar como Falló
        </Button>
        <Button
          icon={<Check className="w-4 h-4" />}
          onClick={() => setResult('PASS')}
        >
          Marcar como Aprobado
        </Button>
      </div>
    </div>
  )
}
