interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

let hits = 0
let misses = 0

export function getCacheStats() {
  return { size: store.size, hits, misses }
}

export function cached<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const existing = store.get(key)
  if (existing && now < existing.expiresAt) {
    hits++
    return Promise.resolve(existing.data as T)
  }

  misses++
  return fetcher().then((data) => {
    store.set(key, { data, expiresAt: now + ttl })
    return data
  })
}

export function clearCache(pattern?: string): void {
  if (!pattern) {
    store.clear()
    return
  }
  for (const key of store.keys()) {
    if (key.startsWith(pattern)) store.delete(key)
  }
}
