import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Camera, Check, X, RotateCcw, Image } from 'lucide-react'
import { Button } from '../components/shared/Button'

export function CameraTest() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<'PASS' | 'FAIL' | null>(null)
  const [resolution, setResolution] = useState('')

  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      setStream(s)
      if (videoRef.current) {
        videoRef.current.srcObject = s
        await videoRef.current.play()
      }
      const track = s.getVideoTracks()[0]
      const cap = track.getCapabilities()
      setResolution(`${cap.width?.max || '—'}x${cap.height?.max || '—'}`)
    } catch (err: any) {
      setError(err?.message || 'No se pudo acceder a la cámara')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      setStream(null)
    }
  }, [stream])

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0)
      setCapturedImage(canvas.toDataURL('image/png'))
    }
  }, [])

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
  }, [stream])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Camera className="w-6 h-6 text-primary-500" />
          <h2 className="text-xl font-bold text-primary-800">Prueba de Cámara</h2>
        </div>
        <p className="text-sm text-neutral-700">
          Inicie la cámara, verifique la imagen y capture una foto para confirmar
          que funciona correctamente.
        </p>
      </div>

      <div className="bg-black rounded-xl overflow-hidden mb-4 aspect-video relative">
        {!stream && !capturedImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="w-16 h-16 text-neutral-600" />
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-contain ${stream ? '' : 'hidden'}`}
        />
        {capturedImage && (
          <img src={capturedImage} alt="Captura" className="w-full h-full object-contain" />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-danger text-sm">{error}</div>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        {!stream && !capturedImage && (
          <Button icon={<Camera className="w-4 h-4" />} onClick={startCamera}>
            Iniciar Cámara
          </Button>
        )}
        {stream && (
          <>
            <Button icon={<Image className="w-4 h-4" />} onClick={captureImage}>
              Capturar Imagen
            </Button>
            <Button variant="danger" onClick={stopCamera}>
              Detener Cámara
            </Button>
          </>
        )}
        {capturedImage && (
          <Button variant="secondary" icon={<RotateCcw className="w-4 h-4" />} onClick={() => { setCapturedImage(null); startCamera() }}>
            Reintentar
          </Button>
        )}
      </div>

      {resolution && (
        <div className="mb-6 p-3 bg-neutral-100 rounded-lg text-sm text-neutral-700">
          Resolución máxima: <strong>{resolution}</strong>
        </div>
      )}

      {result && (
        <div className={`mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium ${
          result === 'PASS' ? 'bg-success' : 'bg-danger'
        }`}>
          {result === 'PASS' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {result === 'PASS' ? 'Cámara aprobada' : 'Cámara no aprobada'}
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
