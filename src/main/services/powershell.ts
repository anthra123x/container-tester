import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function runPowerShell(script: string): Promise<string> {
  const { stdout } = await execFileAsync('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script
  ], { timeout: 30000 })
  return stdout.trim()
}

export async function runPowerShellJson<T>(script: string): Promise<T> {
  const result = await runPowerShell(`${script} | ConvertTo-Json -Compress`)
  return JSON.parse(result) as T
}
