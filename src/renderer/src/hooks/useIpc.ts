export function useIpc() {
  const api = (window as any).api

  return {
    invoke: api.invoke.bind(api),
    on: api.on.bind(api),
    send: api.send.bind(api),
  }
}
