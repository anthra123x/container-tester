import { randomUUID } from 'crypto'
import { dbRun, dbGet, dbAll, rowToCamel, rowsToCamel } from '../db-wrapper'

export interface Device {
  id: string
  name: string
  model: string | null
  serialNumber: string | null
  manufacturer: string | null
  createdAt: string
  updatedAt: string
}

export async function findDeviceBySerial(serial: string): Promise<Device | undefined> {
  const row = await dbGet<Record<string, unknown>>(
    'SELECT * FROM devices WHERE serial_number = ?',
    [serial]
  )
  return row ? rowToCamel<Device>(row) : undefined
}

export async function createDevice(device: Omit<Device, 'createdAt' | 'updatedAt'>): Promise<Device> {
  const id = device.id || randomUUID()
  const now = new Date().toISOString()
  await dbRun(
    'INSERT INTO devices (id, name, model, serial_number, manufacturer, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, device.name, device.model, device.serialNumber, device.manufacturer, now, now]
  )
  return { ...device, id, createdAt: now, updatedAt: now }
}

export async function findOrCreateDevice(info: { name: string; model: string | null; serial: string | null; manufacturer: string | null }): Promise<Device> {
  if (info.serial) {
    const existing = await findDeviceBySerial(info.serial)
    if (existing) return existing
  }
  return createDevice({
    id: randomUUID(),
    name: info.name,
    model: info.model,
    serialNumber: info.serial,
    manufacturer: info.manufacturer
  })
}

export async function getAllDevices(): Promise<Device[]> {
  const rows = await dbAll<Record<string, unknown>>('SELECT * FROM devices ORDER BY created_at DESC')
  return rowsToCamel<Device>(rows)
}
