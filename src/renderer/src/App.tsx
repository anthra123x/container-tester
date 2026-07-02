import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
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
import { Benchmark } from './routes/Benchmark'
import { Settings } from './routes/Settings'
import { Activation } from './routes/Activation'
import { Drivers } from './routes/Drivers'
import { useEffect } from 'react'
import { useIpc } from './hooks/useIpc'
import { useSystemInfo } from './hooks/useSystemInfo'

function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const location = useLocation()
  const { on } = useIpc()
  useSystemInfo()

  useEffect(() => {
    const removeListeners: (() => void)[] = []
    return () => {
      removeListeners.forEach((remove) => remove?.())
    }
  }, [on])

  return (
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
          <Route path="/benchmark" element={<AnimatedPage><Benchmark /></AnimatedPage>} />
          <Route path="/activation" element={<AnimatedPage><Activation /></AnimatedPage>} />
          <Route path="/drivers" element={<AnimatedPage><Drivers /></AnimatedPage>} />
          <Route path="/settings" element={<AnimatedPage><Settings /></AnimatedPage>} />
        </Route>
      </Routes>
    </AnimatePresence>
  )
}
