import '@testing-library/jest-dom'

globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number
globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id)

const mockInvoke = vi.fn((_channel: string, ..._args: unknown[]) => {
  return Promise.resolve(null)
})

Object.defineProperty(window, 'api', {
  value: {
    invoke: mockInvoke,
    send: vi.fn(),
    on: vi.fn(() => vi.fn()),
    once: vi.fn(),
  },
  writable: true,
  configurable: true,
})
