import { useMediaQuery } from './useMediaQuery'

const LOW_END_CORES = 4
const LOW_END_MEMORY_GB = 4

function isLowEndDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const cores = navigator.hardwareConcurrency || 8
  const memory = (navigator as any).deviceMemory || 8
  return cores <= LOW_END_CORES || memory <= LOW_END_MEMORY_GB
}

export function useReducedMotion(): boolean {
  const prefersReduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  return prefersReduced || isLowEndDevice()
}
