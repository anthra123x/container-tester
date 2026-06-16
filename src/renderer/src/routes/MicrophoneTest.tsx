import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mic, Play, Check, X, Loader2 } from 'lucide-react'
import { Button } from '../components/shared/Button'

export function MicrophoneTest() {
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [playing, setPlaying] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [result, setResult] = useState<'PASS' | 'FAIL' | null>(null)
  const [countdown, setCountdown] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
      setCountdown(3)

      const updateLevel = () => {
        if (analyserRef.current) {
          const data = new Uint8Array(analyserRef.current.frequencyBinCount)
          analyserRef.current.getByteFrequencyData(data)
          const avg = data.reduce((a, b) => a + b, 0) / data.length
          setAudioLevel(Math.min(avg / 128, 1))
        }
        animFrameRef.current = requestAnimationFrame(updateLevel)
      }
      updateLevel()

      let count = 3
      const interval = setInterval(() => {
        count--
        setCountdown(count)
        if (count <= 0) {
          clearInterval(interval)
          stopRecording()
        }
      }, 1000)
    } catch {
      setRecording(false)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
    cancelAnimationFrame(animFrameRef.current)
    setRecording(false)
    setCountdown(0)
    setAudioLevel(0)
  }, [])

  const playRecording = useCallback(() => {
    if (!audioBlob) return
    const url = URL.createObjectURL(audioBlob)
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onended = () => {
      setPlaying(false)
      URL.revokeObjectURL(url)
    }
    audio.play()
    setPlaying(true)
  }, [audioBlob])

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Mic className="w-6 h-6 text-primary-500" />
          <h2 className="text-xl font-bold text-primary-800">Prueba de Micrófono</h2>
        </div>
        <p className="text-sm text-neutral-700">
          Presione "Grabar" para grabar 3 segundos de audio. Luego reproduzca la
          grabación para verificar el micrófono.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-8 mb-6">
        <div className="flex flex-col items-center gap-6">
          {recording && (
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="p-4 rounded-full bg-red-50"
            >
              <Mic className="w-10 h-10 text-danger" />
            </motion.div>
          )}

          {!recording && !audioBlob && (
            <div className="p-4 rounded-full bg-primary-50">
              <Mic className="w-10 h-10 text-primary-500" />
            </div>
          )}

          {audioBlob && !recording && (
            <div className="p-4 rounded-full bg-green-50">
              <Mic className="w-10 h-10 text-success" />
            </div>
          )}

          {recording && (
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-800">{countdown}</p>
              <p className="text-sm text-neutral-700">Grabando...</p>
            </div>
          )}

          {!recording && !audioBlob && (
            <p className="text-center text-neutral-700">Listo para grabar</p>
          )}

          {audioBlob && !recording && (
            <p className="text-center text-success font-medium">Grabación completada</p>
          )}

          {recording && (
            <div className="w-full max-w-xs h-3 bg-neutral-100 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${audioLevel * 100}%` }}
                className="h-full bg-primary-500 rounded-full"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {!recording && !audioBlob && (
          <Button icon={<Mic className="w-4 h-4" />} onClick={startRecording}>
            Grabar (3s)
          </Button>
        )}
        {audioBlob && !recording && (
          <Button
            icon={playing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            onClick={playRecording}
            disabled={playing}
          >
            Reproducir
          </Button>
        )}
      </div>

      {result && (
        <div className={`mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium ${
          result === 'PASS' ? 'bg-success' : 'bg-danger'
        }`}>
          {result === 'PASS' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {result === 'PASS' ? 'Micrófono aprobado' : 'Micrófono no aprobado'}
        </div>
      )}

      <div className="flex gap-4">
        <Button variant="danger" icon={<X className="w-4 h-4" />} onClick={() => setResult('FAIL')}>
          Marcar como Falló
        </Button>
        <Button icon={<Check className="w-4 h-4" />} onClick={() => setResult('PASS')}>
          Marcar como Aprobado
        </Button>
      </div>
    </div>
  )
}
