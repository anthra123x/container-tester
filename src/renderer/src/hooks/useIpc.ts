import { useRef, useMemo } from 'react'

export function useIpc() {
  const apiRef = useRef((window as any).api)

  return useMemo(() => ({
    invoke: apiRef.current.invoke.bind(apiRef.current),
    on: apiRef.current.on.bind(apiRef.current),
    send: apiRef.current.send.bind(apiRef.current),
  }), [])
}
