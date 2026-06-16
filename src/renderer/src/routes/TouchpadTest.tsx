import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mouse, Check, X, MousePointerClick, Scroll } from 'lucide-react'
import { Button } from '../components/shared/Button'

interface TrailPoint {
  x: number
  y: number
  time: number
}

export function TouchpadTest() {
  const areaRef = useRef<HTMLDivElement>(null)
  const [trail, setTrail] = useState<TrailPoint[]>([])
  const [leftClick, setLeftClick] = useState(false)
  const [rightClick, setRightClick] = useState(false)
  const [scrollDetected, setScrollDetected] = useState(false)
  const [result, setResult] = useState<'PASS' | 'FAIL' | null>(null)

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!areaRef.current) return
    const rect = areaRef.current.getBoundingClientRect()
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top, time: Date.now() }
    setTrail((prev) => {
      const next = [...prev, point]
      if (next.length > 100) next.splice(0, next.length - 100)
      return next
    })
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 0) setLeftClick(true)
    if (e.button === 2) setRightClick(true)
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  useEffect(() => {
    const handleWheel = () => {
      setScrollDetected(true)
    }
    const area = areaRef.current
    if (area) {
      area.addEventListener('wheel', handleWheel)
    }
    return () => {
      if (area) area.removeEventListener('wheel', handleWheel)
    }
  }, [])

  const clearTrail = useCallback(() => {
    setTrail([])
    setLeftClick(false)
    setRightClick(false)
    setScrollDetected(false)
  }, [])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Mouse className="w-6 h-6 text-primary-500" />
          <h2 className="text-xl font-bold text-primary-800">Prueba de Touchpad</h2>
        </div>
        <p className="text-sm text-neutral-700">
          Mueva el cursor sobre el área, haga clic izquierdo, clic derecho y
          desplazamiento para verificar el touchpad.
        </p>
      </div>

      <div
        ref={areaRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onContextMenu={handleContextMenu}
        className="relative bg-white rounded-xl border-2 border-dashed border-neutral-200 h-80 mb-6 overflow-hidden cursor-crosshair"
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {trail.length > 1 && (
            <polyline
              points={trail.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#1E3A5F"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.5}
            />
          )}
          {trail.length > 0 && (
            <circle
              cx={trail[trail.length - 1].x}
              cy={trail[trail.length - 1].y}
              r={4}
              fill="#1E3A5F"
            />
          )}
        </svg>

        <div className="absolute bottom-3 left-3 flex gap-3">
          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
            leftClick ? 'bg-success text-white' : 'bg-neutral-100 text-neutral-700'
          }`}>
            <MousePointerClick className="w-3 h-3" /> Izquierdo
          </span>
          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
            rightClick ? 'bg-success text-white' : 'bg-neutral-100 text-neutral-700'
          }`}>
            <MousePointerClick className="w-3 h-3" /> Derecho
          </span>
          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
            scrollDetected ? 'bg-success text-white' : 'bg-neutral-100 text-neutral-700'
          }`}>
            <Scroll className="w-3 h-3" /> Scroll
          </span>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <Button variant="ghost" onClick={clearTrail}>Limpiar Rastro</Button>
      </div>

      {result && (
        <div className={`mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium ${
          result === 'PASS' ? 'bg-success' : 'bg-danger'
        }`}>
          {result === 'PASS' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {result === 'PASS' ? 'Touchpad aprobado' : 'Touchpad no aprobado'}
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
