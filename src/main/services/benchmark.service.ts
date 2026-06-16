import { Worker } from 'worker_threads'
import si from 'systeminformation'
import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs/promises'

export interface BenchmarkPhaseResult {
  score: number
  rating: string
  details: string
  metrics: Record<string, string | number>
}

export interface BenchmarkResult {
  cpu: BenchmarkPhaseResult
  memory: BenchmarkPhaseResult
  disk: BenchmarkPhaseResult
  overall: { score: number; rating: string; summary: string }
}

function rateScore(score: number): string {
  if (score >= 7500) return 'Excelente'
  if (score >= 4500) return 'Bueno'
  if (score >= 2000) return 'Regular'
  return 'Bajo'
}

export async function runCPUBenchmark(progress?: (pct: number) => void): Promise<BenchmarkPhaseResult> {
  const cpu = await si.cpu()
  const physCores = cpu.physicalCores || cpu.cores || 4
  const logCores = cpu.cores || physCores

  const workFactor = Math.max(physCores, 2)
  const iterationsPerCore = 60000000

  const workersCount = Math.min(physCores, 16)
  const iterationsPerWorker = Math.floor((iterationsPerCore * workFactor) / workersCount)

  const workerCode = `
    const { parentPort } = require('worker_threads');
    const iterations = ${iterationsPerWorker};
    const reportInterval = Math.max(1, Math.floor(iterations / 20));

    let inside = 0;
    let total = 0;

    for (let i = 0; i < iterations; i++) {
      const x = Math.random();
      const y = Math.random();
      if (x * x + y * y <= 1) inside++;
      total++;
      if (i % reportInterval === 0) {
        parentPort.postMessage({ type: 'progress', pct: Math.round((i / iterations) * 100) });
      }
    }

    const pi = 4 * inside / total;
    parentPort.postMessage({ type: 'done', pi, inside, total });
  `

  const start = performance.now()
  let completed = 0
  let totalInside = 0
  let totalSamples = 0

  const workerPromises: Promise<void>[] = []

  for (let w = 0; w < workersCount; w++) {
    workerPromises.push(new Promise((resolve, reject) => {
      const worker = new Worker(workerCode, { eval: true })
      worker.on('message', (msg) => {
        if (msg.type === 'progress') {
          const overallPct = Math.round(((completed * 100) + msg.pct) / workersCount)
          progress?.(Math.min(overallPct, 99))
        } else if (msg.type === 'done') {
          totalInside += msg.inside
          totalSamples += msg.total
          completed++
          if (completed === workersCount) {
            progress?.(100)
          }
          resolve()
        }
      })
      worker.on('error', reject)
    }))
  }

  try {
    await Promise.all(workerPromises)
  } catch {
    progress?.(100)
  }

  const elapsed = (performance.now() - start) / 1000
  const piEstimate = totalSamples > 0 ? 4 * totalInside / totalSamples : 0
  const piError = Math.abs(Math.PI - piEstimate) / Math.PI * 100

  const opsPerSec = totalSamples / Math.max(elapsed, 0.01)
  const referenceOpsPerSec = 120000000
  const rawScore = (opsPerSec / referenceOpsPerSec) * 5000

  const coreBoost = Math.min(physCores / 4, 2)
  const speed = cpu.speed || 2.5
  const speedBoost = Math.min(speed / 2.5, 1.5)

  const score = Math.round(Math.min(10000, Math.max(0, rawScore * coreBoost * speedBoost)))
  const rating = rateScore(score)

  const details = `Procesador: ${cpu.manufacturer} ${cpu.brand} (${physCores}C/${logCores}T @ ${speed} GHz) • ${workersCount} hilos • ${(totalSamples / 1e6).toFixed(0)}M muestras Monte Carlo`
  const metrics: Record<string, string | number> = {
    'Núcleos físicos': physCores,
    'Hilos de trabajo': workersCount,
    'Muestras': `${(totalSamples / 1e6).toFixed(0)}M`,
    'Tiempo': `${elapsed.toFixed(1)}s`,
    'Throughput': `${Math.round(opsPerSec / 1e6)}M ops/s`,
    'π estimado': piEstimate.toFixed(6),
    'Error π': `${piError.toFixed(4)}%`,
  }

  return { score, rating, details, metrics }
}

export async function runMemoryBenchmark(progress?: (pct: number) => void): Promise<BenchmarkPhaseResult> {
  const mem = await si.mem()
  const totalGB = (mem.total || 4294967296) / 1073741824

  const allocMB = Math.min(Math.floor(totalGB * 0.3), 1024)
  const allocBytes = allocMB * 1024 * 1024

  const chunkSize = 64 * 1024
  const chunkCount = Math.floor(allocBytes / chunkSize)

  progress?.(5)

  const buf = Buffer.allocUnsafe(allocBytes)
  for (let i = 0; i < buf.length; i++) {
    buf[i] = (i * 7 + 13) & 0xFF
  }

  progress?.(20)

  const start = performance.now()

  let accum = 0
  const randIndexes: number[] = []

  progress?.(25)

  for (let pass = 0; pass < 3; pass++) {
    const reportBase = 25 + pass * 23

    for (let ci = 0; ci < chunkCount; ci++) {
      const offset = ci * chunkSize
      let chunkSum = 0
      for (let j = 0; j < chunkSize; j += 64) {
        chunkSum += buf[offset + j]
        buf[offset + j] = (buf[offset + j] + pass) & 0xFF
      }
      accum += chunkSum

      if (ci % Math.max(1, Math.floor(chunkCount / 15)) === 0) {
        progress?.(Math.min(reportBase + Math.round((ci / chunkCount) * 20), reportBase + 19))
      }
    }

    randIndexes.length = 0
    for (let r = 0; r < 500000; r++) {
      randIndexes.push(Math.floor(Math.random() * buf.length))
    }
    progress?.(reportBase + 20)

    for (let ri = 0; ri < randIndexes.length; ri++) {
      const idx = randIndexes[ri]
      accum += buf[idx]
      buf[idx] = (buf[idx] + ri) & 0xFF
    }
  }

  progress?.(95)

  const elapsed = (performance.now() - start) / 1000

  const totalBytesProcessed = (allocBytes * 3)
    + (allocBytes * 3)
    + (500000 * 3)

  const processedGB = totalBytesProcessed / 1073741824
  const throughput = processedGB / Math.max(elapsed, 0.01)

  const referenceThroughput = 25
  const rawScore = (throughput / referenceThroughput) * 5000
  const score = Math.round(Math.min(10000, Math.max(0, rawScore)))
  const rating = rateScore(score)

  const details = `Memoria: ${totalGB.toFixed(1)} GB (${allocMB} MB probados) • ${throughput.toFixed(1)} GB/s throughput • 3 pasadas secuenciales + 3 × 500K accesos aleatorios`
  const metrics: Record<string, string | number> = {
    'RAM total': `${totalGB.toFixed(1)} GB`,
    'Buffer': `${allocMB} MB`,
    'Throughput': `${throughput.toFixed(1)} GB/s`,
    'Pasadas secuenciales': 3,
    'Accesos aleatorios': '3 × 500K',
    'Tiempo': `${elapsed.toFixed(1)}s`,
  }

  return { score, rating, details, metrics }
}

export async function runDiskBenchmark(progress?: (pct: number) => void): Promise<BenchmarkPhaseResult> {
  const tmpDir = app.getPath('temp')
  const testFile = path.join(tmpDir, `cds-benchmark-${Date.now()}.tmp`)
  const sizeMB = 200
  const buf1MB = Buffer.alloc(1024 * 1024, 0xBB)

  try {
    progress?.(3)

    const writeStart = performance.now()
    const wFd = await fs.open(testFile, 'w')
    for (let i = 0; i < sizeMB; i++) {
      await wFd.write(buf1MB, 0, buf1MB.length)
      if (i % 20 === 0) {
        progress?.(3 + Math.round((i / sizeMB) * 22))
      }
    }
    await wFd.close()
    const writeTime = (performance.now() - writeStart) / 1000
    progress?.(27)

    const writeMBps = writeTime > 0 ? Math.round(sizeMB / writeTime) : 0

    const readStart = performance.now()
    const rFd = await fs.open(testFile, 'r')
    const readBuf = Buffer.alloc(1024 * 1024)
    for (let i = 0; i < sizeMB; i++) {
      await rFd.read(readBuf, 0, readBuf.length, i * 1024 * 1024)
      if (i % 20 === 0) {
        progress?.(30 + Math.round((i / sizeMB) * 22))
      }
    }
    await rFd.close()
    const seqReadTime = (performance.now() - readStart) / 1000
    progress?.(55)

    const readMBps = seqReadTime > 0 ? Math.round(sizeMB / seqReadTime) : 0

    const iopsStart = performance.now()
    const rFd2 = await fs.open(testFile, 'r')
    const iopsBuf = Buffer.alloc(4096)
    let iopsCompleted = 0
    const iopsTarget = 5000
    const maxIopsTime = 8

    for (let i = 0; i < iopsTarget; i++) {
      const pos = Math.floor(Math.random() * sizeMB * 1024 * 1024 / 4096) * 4096
      try {
        await rFd2.read(iopsBuf, 0, 4096, pos)
        iopsCompleted++
      } catch { }
      if (i % 200 === 0) {
        const elapsedSec = (performance.now() - iopsStart) / 1000
        if (elapsedSec >= maxIopsTime) break
        progress?.(58 + Math.min(Math.round((elapsedSec / maxIopsTime) * 37), 37))
      }
    }
    const iopsTime = (performance.now() - iopsStart) / 1000
    await rFd2.close()
    progress?.(97)

    const iops = Math.round(iopsCompleted / Math.max(iopsTime, 0.01))

    const refWrite = 500
    const refRead = 1500
    const refIOPS = 15000

    const writeScore = (writeMBps / refWrite) * 3000
    const readScore = (readMBps / refRead) * 3500
    const iopsScore = (iops / refIOPS) * 3500

    const score = Math.round(Math.min(10000, Math.max(0, writeScore + readScore + iopsScore)))
    const rating = rateScore(score)

    const diskInfo = await si.diskLayout().catch(() => [])
    const primaryDisk = diskInfo[0]
    const diskName = primaryDisk ? `${primaryDisk.type || '?'} ${primaryDisk.name || ''}`.trim() : '?'

    const details = `Disco: ${diskName} • Escritura sec: ${writeMBps} MB/s • Lectura sec: ${readMBps} MB/s • IOPS 4K: ${iops.toLocaleString()}`
    const metrics: Record<string, string | number> = {
      'Tipo': primaryDisk?.type || '?',
      'Escritura sec.': `${writeMBps} MB/s`,
      'Lectura sec.': `${readMBps} MB/s`,
      'IOPS 4K aleat.': iops,
      'Tamaño archivo': `${sizeMB} MB`,
      'Tiempo total': `${(writeTime + seqReadTime + iopsTime).toFixed(1)}s`,
    }

    return { score, rating, details, metrics }
  } finally {
    try { await fs.unlink(testFile) } catch { }
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
  const overallRating = rateScore(overallScore)

  const parts: string[] = []
  if (cpu.rating === 'Bajo' || cpu.rating === 'Regular') parts.push('CPU podría ser cuello de botella')
  else if (cpu.rating === 'Excelente') parts.push('CPU con excelente rendimiento')

  if (memory.rating === 'Bajo' || memory.rating === 'Regular') parts.push('rendimiento de memoria limitado')
  else if (memory.rating === 'Excelente') parts.push('memoria de alto rendimiento')

  if (disk.rating === 'Bajo' || disk.rating === 'Regular') parts.push('disco de almacenamiento lento')
  else if (disk.rating === 'Excelente') parts.push('disco de alta velocidad')

  const summary = parts.length > 0
    ? `Rendimiento ${overallRating.toLowerCase()}. ${parts.join('. ')}.`
    : `Rendimiento ${overallRating.toLowerCase()}. Todos los componentes dentro de parámetros normales.`

  return { cpu, memory, disk, overall: { score: overallScore, rating: overallRating, summary } }
}
