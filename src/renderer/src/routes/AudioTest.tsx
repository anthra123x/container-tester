import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Volume2, Check, X, Play, Loader2 } from 'lucide-react'
import { Button } from '../components/shared/Button'

export function AudioTest() {
  const [playing, setPlaying] = useState(false)
  const [result, setResult] = useState<'PASS' | 'FAIL' | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const oscillatorRef = useRef<OscillatorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  const playTone = useCallback(() => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
    }

    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 440
    gain.gain.value = 0.3
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 2)
    oscillator.onended = () => {
      setPlaying(false)
    }

    oscillatorRef.current = oscillator
    gainRef.current = gain
    setPlaying(true)
  }, [])

  const stopTone = useCallback(() => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop()
      oscillatorRef.current.disconnect()
      oscillatorRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    setPlaying(false)
  }, [])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Volume2 className="w-6 h-6 text-primary-500" />
          <h2 className="text-xl font-bold text-primary-800">Prueba de Audio</h2>
        </div>
        <p className="text-sm text-neutral-700">
          Presione "Reproducir Tono" para escuchar un tono de 440 Hz durante 2 segundos.
          Confirme si escuchó el sonido correctamente.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-8 mb-6">
        <div className="flex flex-col items-center gap-6">
          <motion.div
            animate={playing ? { scale: [1, 1.05, 1] } : {}}
            transition={playing ? { repeat: Infinity, duration: 0.5 } : {}}
            className={`p-6 rounded-full ${playing ? 'bg-primary-50' : 'bg-neutral-100'}`}
          >
            <Volume2 className={`w-16 h-16 ${playing ? 'text-primary-500' : 'text-neutral-400'}`} />
          </motion.div>

          {playing && (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  animate={{ height: [20, 40 + Math.random() * 40, 20] }}
                  transition={{ repeat: Infinity, duration: 0.4 + i * 0.1 }}
                  className="w-3 bg-primary-500 rounded-full"
                />
              ))}
            </div>
          )}

          <div className="flex gap-4">
            {!playing ? (
              <Button
                size="lg"
                icon={<Play className="w-5 h-5" />}
                onClick={playTone}
              >
                Reproducir Tono
              </Button>
            ) : (
              <Button
                size="lg"
                variant="danger"
                onClick={stopTone}
              >
                Detener
              </Button>
            )}
          </div>
        </div>
      </div>

      {result && (
        <div className={`mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium ${
          result === 'PASS' ? 'bg-success' : 'bg-danger'
        }`}>
          {result === 'PASS' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {result === 'PASS' ? 'Audio aprobado' : 'Audio no aprobado'}
        </div>
      )}

      <div className="flex gap-4">
        <Button
          variant="danger"
          icon={<X className="w-4 h-4" />}
          onClick={() => setResult('FAIL')}
        >
          No he escuchado nada
        </Button>
        <Button
          icon={<Check className="w-4 h-4" />}
          onClick={() => setResult('PASS')}
        >
          He escuchado el sonido
        </Button>
      </div>
    </div>
  )
}
