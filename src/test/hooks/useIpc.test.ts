import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useIpc } from '../../renderer/src/hooks/useIpc'

describe('useIpc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.api = {
      invoke: vi.fn().mockResolvedValue('invoked'),
      send: vi.fn(),
      on: vi.fn().mockReturnValue(vi.fn()),
      once: vi.fn(),
    }
  })

  it('returns invoke that calls window.api.invoke', async () => {
    const { result } = renderHook(() => useIpc())
    const response = await result.current.invoke('test:channel', 'arg1')
    expect(window.api.invoke).toHaveBeenCalledWith('test:channel', 'arg1')
    expect(response).toBe('invoked')
  })

  it('returns send that calls window.api.send', () => {
    const { result } = renderHook(() => useIpc())
    result.current.send('test:send', 'data')
    expect(window.api.send).toHaveBeenCalledWith('test:send', 'data')
  })

  it('returns on that calls window.api.on', () => {
    const { result } = renderHook(() => useIpc())
    const callback = vi.fn()
    result.current.on('test:event', callback)
    expect(window.api.on).toHaveBeenCalledWith('test:event', callback)
  })

  it('returns a stable reference across renders', () => {
    const { result, rerender } = renderHook(() => useIpc())
    const first = result.current
    rerender()
    expect(result.current.invoke).toBe(first.invoke)
    expect(result.current.send).toBe(first.send)
    expect(result.current.on).toBe(first.on)
  })
})
