import { execFile } from 'child_process'
import { promisify } from 'util'
import { setTimeout as sleep } from 'timers/promises'

const execFileAsync = promisify(execFile)

const DEFAULT_TIMEOUT = 8000

export async function runPowerShell(script: string, timeout = DEFAULT_TIMEOUT): Promise<string> {
  const { stdout } = await execFileAsync('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script
  ], { timeout, maxBuffer: 5 * 1024 * 1024 })
  return stdout.trim()
}

export async function runPowerShellJson<T>(script: string, timeout = DEFAULT_TIMEOUT): Promise<T> {
  const result = await runPowerShell(`${script} | ConvertTo-Json -Compress`, timeout)
  return JSON.parse(result) as T
}

export async function runPowerShellWithRetry<T>(
  script: string,
  parser: (raw: string) => T,
  retries = 2,
  timeout = DEFAULT_TIMEOUT
): Promise<T | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const raw = await runPowerShell(script, timeout)
      if (raw && raw !== 'null' && raw !== '') {
        return parser(raw)
      }
    } catch {
      if (attempt < retries) await sleep(200)
    }
  }
  return null
}
