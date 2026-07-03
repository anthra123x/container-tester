import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { lazy, Suspense, useEffect } from 'react'
import { useReducedMotion } from './hooks/useReducedMotion'
import { MainLayout } from './components/layout/MainLayout'
import { Dashboard } from './routes/Dashboard'
import { AutoDiagnostic } from './routes/AutoDiagnostic'
import { ManualTests } from './routes/ManualTests'
import { ScreenTest } from './routes/ScreenTest'
import { KeyboardTest } from './routes/KeyboardTest'
import { TouchpadTest } from './routes/TouchpadTest'
import { CameraTest } from './routes/CameraTest'
import { MicrophoneTest } from './routes/MicrophoneTest'
import { AudioTest } from './routes/AudioTest'
import { WiFiTest } from './routes/WiFiTest'
import { BluetoothTest } from './routes/BluetoothTest'
import { USBTest } from './routes/USBTest'
import { Settings } from './routes/Settings'
import { useIpc } from './hooks/useIpc'
import { useSystemInfo } from './hooks/useSystemInfo'
import { Loader2 } from 'lucide-react'

const Benchmark = lazy(() => import('./routes/Benchmark').then(m => ({ default: m.Benchmark })))
const Activation = lazy(() => import('./routes/Activation').then(m => ({ default: m.Activation })))
const Drivers = lazy(() => import('./routes/Drivers').then(m => ({ default: m.Drivers })))
const RepairTools = lazy(() => import('./routes/RepairTools').then(m => ({ default: m.RepairTools })))
const PerformanceMonitor = lazy(() => import('./routes/PerformanceMonitor').then(m => ({ default: m.PerformanceMonitor })))

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
    </div>
  )
}

function AnimatedPage({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : -12 }}
      transition={{ duration: reduced ? 0 : 0.2 }}
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const location = useLocation()
  const { on } = useIpc()
  useSystemInfo()
  const reduced = useReducedMotion()

  useEffect(() => {
    const removeListeners: (() => void)[] = []
    return () => {
      removeListeners.forEach((remove) => remove?.())
    }
  }, [on])

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/diagnostic/auto" element={<AnimatedPage><AutoDiagnostic /></AnimatedPage>} />
            <Route path="/diagnostic/manual" element={<AnimatedPage><ManualTests /></AnimatedPage>} />
            <Route path="/diagnostic/manual/screen" element={<AnimatedPage><ScreenTest /></AnimatedPage>} />
            <Route path="/diagnostic/manual/keyboard" element={<AnimatedPage><KeyboardTest /></AnimatedPage>} />
            <Route path="/diagnostic/manual/touchpad" element={<AnimatedPage><TouchpadTest /></AnimatedPage>} />
            <Route path="/diagnostic/manual/camera" element={<AnimatedPage><CameraTest /></AnimatedPage>} />
            <Route path="/diagnostic/manual/mic" element={<AnimatedPage><MicrophoneTest /></AnimatedPage>} />
            <Route path="/diagnostic/manual/audio" element={<AnimatedPage><AudioTest /></AnimatedPage>} />
            <Route path="/diagnostic/manual/wifi" element={<AnimatedPage><WiFiTest /></AnimatedPage>} />
            <Route path="/diagnostic/manual/bluetooth" element={<AnimatedPage><BluetoothTest /></AnimatedPage>} />
            <Route path="/diagnostic/manual/usb" element={<AnimatedPage><USBTest /></AnimatedPage>} />
            <Route path="/benchmark" element={<AnimatedPage><Suspense fallback={<PageFallback />}><Benchmark /></Suspense></AnimatedPage>} />
            <Route path="/performance" element={<AnimatedPage><Suspense fallback={<PageFallback />}><PerformanceMonitor /></Suspense></AnimatedPage>} />
            <Route path="/activation" element={<AnimatedPage><Suspense fallback={<PageFallback />}><Activation /></Suspense></AnimatedPage>} />
            <Route path="/drivers" element={<AnimatedPage><Suspense fallback={<PageFallback />}><Drivers /></Suspense></AnimatedPage>} />
            <Route path="/repair" element={<AnimatedPage><Suspense fallback={<PageFallback />}><RepairTools /></Suspense></AnimatedPage>} />
            <Route path="/settings" element={<AnimatedPage><Settings /></AnimatedPage>} />
          </Route>
        </Routes>
      </AnimatePresence>
    </MotionConfig>
  )
}
