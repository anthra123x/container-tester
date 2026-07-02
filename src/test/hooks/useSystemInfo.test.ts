import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSystemInfo } from '../../renderer/src/hooks/useSystemInfo'

vi.mock('../../renderer/src/stores/diagnostic.store', () => ({
  useDiagnosticStore: (selector: any) => {
    const state = {
      systemInfo: null,
      systemSpecs: null,
      setSystemInfo: vi.fn(),
      setSystemSpecs: vi.fn(),
    }
    return selector(state)
  },
}))

describe('useSystemInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.api = {
      invoke: vi.fn().mockResolvedValue({ hostname: 'TEST-PC', model: 'X1', serial: 'SN-001' }),
      send: vi.fn(),
      on: vi.fn().mockReturnValue(vi.fn()),
      once: vi.fn(),
    }
  })

  it('calls invoke on mount', async () => {
    renderHook(() => useSystemInfo())
    await waitFor(() => {
      expect(window.api.invoke).toHaveBeenCalled()
    })
  })

  it('returns loading state initially', () => {
    window.api.invoke = vi.fn(() => new Promise(() => {}))
    const { result } = renderHook(() => useSystemInfo())
    expect(result.current.loading).toBe(true)
  })
})
