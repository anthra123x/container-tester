import si from 'systeminformation'
import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { getLiveMetrics } from './live-data.service'

export interface BenchmarkResult {
  cpu: { score: number; rating: string; details: string }
  memory: { score: number; rating: string; details: string }
  disk: { score: number; rating: string; details: string }
  overall: { score: number; rating: string; summary: string }
}

function rateScore(score: number, thresholds: { low: number; mid: number; high: number }): string {
  if (score < thresholds.low) return 'Bajo'
  if (score < thresholds.mid) return 'Regular'
  if (score < thresholds.high) return 'Bueno'
  return 'Excelente'
}

export async function runCPUBenchmark(progress?: (pct: number) => void): Promise<{ score: number; rating: string; details: string }> {
  const cpu = await si.cpu()
  const coreCount = cpu.physicalCores || cpu.cores || 4

  const iterations = 500000 * Math.max(1, Math.floor(coreCount / 2))

  const start = performance.now()

  const workers = Math.min(coreCount, 8)
  const chunkSize = Math.floor(iterations / workers)

  const tasks: Promise<number>[] = []
  for (let w = 0; w < workers; w++) {
    tasks.push(new Promise((resolve) => {
      let result = 0
      const end = w === workers - 1 ? iterations : (w + 1) * chunkSize
      for (let i = w * chunkSize; i < end; i++) {
        result += Math.sin(i) * Math.cos(i) + Math.sqrt(Math.abs(Math.tan(i)))
        if (i % 100000 === 0 && progress) {
          progress(Math.round((i / iterations) * 100))
        }
      }
      resolve(result)
    }))
  }

  await Promise.all(tasks)
  const elapsed = (performance.now() - start) / 1000

  const baseScore = Math.round(10000 / Math.max(elapsed, 0.1))
  const speedBonus = cpu.speed ? Math.round(cpu.speed * 500) : 0
  const coreBonus = coreCount * 200

  const score = Math.min(9999, baseScore + speedBonus + coreBonus)
  const rating = rateScore(score, { low: 2000, mid: 4000, high: 7000 })

  const details = `Procesador: ${cpu.manufacturer} ${cpu.brand} (${coreCount} núcleos físicos) • ${elapsed.toFixed(2)}s en ${(iterations / 1e6).toFixed(1)}M operaciones`

  return { score, rating, details }
}

export async function runMemoryBenchmark(progress?: (pct: number) => void): Promise<{ score: number; rating: string; details: string }> {
  const mem = await si.mem()
  const availableMB = Math.floor((mem.total || 1073741824) / (1024 * 1024))

  const allocSize = Math.min(availableMB, 256)
  const start = performance.now()

  progress?.(10)

  const buf = Buffer.alloc(allocSize * 1024 * 1024, 0xAA)

  progress?.(30)

  let checksum = 0
  for (let pass = 0; pass < 5; pass++) {
    for (let i = 0; i < buf.length; i += 4096) {
      checksum += buf[i]
      buf[i] = pass
    }
    progress?.(30 + pass * 12)
  }

  progress?.(90)

  const elapsed = (performance.now() - start) / 1000

  const mbPerSec = Math.round((allocSize * 5) / Math.max(elapsed, 0.1))
  const score = Math.min(9999, Math.round(mbPerSec * 10))
  const rating = rateScore(score, { low: 2000, mid: 5000, high: 8000 })

  const details = `Memoria: ${(mem.total / 1073741824).toFixed(1)} GB • ${mbPerSec} MB/s throughput • ${allocSize}MB buffer × 5 pasadas`

  return { score, rating, details }
}

export async function runDiskBenchmark(progress?: (pct: number) => void): Promise<{ score: number; rating: string; details: string }> {
  const tmpDir = app.getPath('temp')
  const testFile = path.join(tmpDir, `cds-benchmark-${Date.now()}.tmp`)
  const sizeMB = 100
  const buf = Buffer.alloc(1024 * 1024, 0xBB)

  try {
    progress?.(10)

    const writeStart = performance.now()
    const wFd = fs.openSync(testFile, 'w')
    for (let i = 0; i < sizeMB; i++) {
      fs.writeSync(wFd, buf, 0, buf.length)
      if (i % 25 === 0) progress?.(10 + Math.round((i / sizeMB) * 35))
    }
    fs.closeSync(wFd)
    const writeTime = (performance.now() - writeStart) / 1000

    progress?.(50)

    const readStart = performance.now()
    const rFd = fs.openSync(testFile, 'r')
    const readBuf = Buffer.alloc(1024 * 1024)
    for (let i = 0; i < sizeMB; i++) {
      fs.readSync(rFd, readBuf, 0, readBuf.length, null)
      if (i % 25 === 0) progress?.(50 + Math.round((i / sizeMB) * 35))
    }
    fs.closeSync(rFd)
    const readTime = (performance.now() - readStart) / 1000

    progress?.(90)

    const writeMBps = Math.round(sizeMB / Math.max(writeTime, 0.01))
    const readMBps = Math.round(sizeMB / Math.max(readTime, 0.01))

    const score = Math.min(9999, Math.round((writeMBps + readMBps) * 25))
    const rating = rateScore(score, { low: 1500, mid: 3500, high: 6000 })

    const diskInfo = await si.diskLayout().catch(() => [])
    const primaryDisk = diskInfo[0]
    const diskName = primaryDisk ? `${primaryDisk.type || '?'} ${primaryDisk.name || ''}` : '?'

    const details = `Disco: ${diskName} • Escritura: ${writeMBps} MB/s • Lectura: ${readMBps} MB/s • ${sizeMB}MB archivo`

    return { score, rating, details }
  } finally {
    try { fs.unlinkSync(testFile) } catch { }
  }
}

export async function runFullBenchmark(onProgress?: (phase: string, pct: number) => void): Promise<BenchmarkResult> {
  onProgress?.('cpu', 0)
  const cpu = await runCPUBenchmark((pct) => onProgress?.('cpu', pct))
  onProgress?.('cpu', 100)

  onProgress?.('memory', 0)
  const memory = await runMemoryBenchmark((pct) => onProgress?.('memory', pct))
  onProgress?.('memory', 100)

  onProgress?.('disk', 0)
  const disk = await runDiskBenchmark((pct) => onProgress?.('disk', pct))
  onProgress?.('disk', 100)

  const overallScore = Math.round((cpu.score + memory.score + disk.score) / 3)
  const overallRating = rateScore(overallScore, { low: 2000, mid: 4000, high: 7000 })

  const parts: string[] = []
  if (cpu.rating === 'Bajo' || cpu.rating === 'Regular') parts.push('CPU podría ser un cuello de botella')
  else if (cpu.rating === 'Excelente') parts.push('CPU con excelente rendimiento')

  if (memory.rating === 'Bajo' || memory.rating === 'Regular') parts.push('rendimiento de memoria limitado')
  else if (memory.rating === 'Excelente') parts.push('memoria de alto rendimiento')

  if (disk.rating === 'Bajo' || disk.rating === 'Regular') parts.push('disco de almacenamiento lento')
  else if (disk.rating === 'Excelente') parts.push('disco de alta velocidad')

  const summary = parts.length > 0
    ? `Rendimiento ${overallRating.toLowerCase()}. ${parts.join('. ')}.`
    : `Rendimiento ${overallRating.toLowerCase()}. Todos los componentes funcionan dentro de parámetros normales.`

  return { cpu, memory, disk, overall: { score: overallScore, rating: overallRating, summary } }
}
