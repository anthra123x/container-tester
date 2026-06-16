import si from 'systeminformation'

export interface WifiInfo {
  networks: WifiNetwork[]
  interfaces: WifiInterface[]
}

export interface WifiNetwork {
  ssid: string
  bssid: string
  mode: string
  channel: number
  frequency: number
  signalLevel: number | null
  quality: number | null
  security: string
  wpaFlags: string
  rsnFlags: string
}

export interface WifiInterface {
  id: string
  iface: string
  model: string
  vendor: string
  mac: string
}

export interface BluetoothInfo {
  devices: BluetoothDevice[]
}

export interface BluetoothDevice {
  name: string
  deviceName: string
  mac: string
  manufacturer: string | null
  connected: boolean | null
  type: string | null
  batteryPercent: number | null
}

export interface EthernetInfo {
  interfaces: EthernetInterface[]
}

export interface EthernetInterface {
  id: string
  iface: string
  ifaceName: string
  ip4: string
  ip6: string
  mac: string
  type: string
  speed: number | null
  duplex: string
  mtu: number | null
  operstate: string
  default: boolean
}

export async function getWifiInfo(): Promise<WifiInfo> {
  const [networks, interfaces] = await Promise.all([
    si.wifiNetworks().catch(() => []),
    si.wifiInterfaces().catch(() => [])
  ])

  return {
    networks: networks.map(n => ({
      ssid: n.ssid || 'Unknown',
      bssid: n.bssid || '',
      mode: n.mode || '',
      channel: n.channel || 0,
      frequency: n.frequency || 0,
      signalLevel: n.signalLevel ?? null,
      quality: n.quality ?? null,
      security: (n.security || []).join(', '),
      wpaFlags: (n.wpaFlags || []).join(', '),
      rsnFlags: (n.rsnFlags || []).join(', ')
    })),
    interfaces: interfaces.map(i => ({
      id: i.id || '',
      iface: i.iface || '',
      model: i.model || '',
      vendor: i.vendor || '',
      mac: i.mac || ''
    }))
  }
}

export async function getBluetoothInfo(): Promise<BluetoothInfo> {
  const btDevices = await si.bluetoothDevices().catch(() => [])

  return {
    devices: btDevices.map(d => ({
      name: d.name || 'Unknown',
      deviceName: d.device || '',
      mac: d.macDevice || '',
      manufacturer: d.manufacturer ?? null,
      connected: d.connected ?? null,
      type: d.type ?? null,
      batteryPercent: d.batteryPercent ?? null
    }))
  }
}

export async function getEthernetInfo(): Promise<EthernetInfo> {
  const networkInterfaces = await si.networkInterfaces().catch(() => [])

  return {
    interfaces: networkInterfaces
      .filter(ni => ni.type === 'wired' || (ni.iface || '').toLowerCase().includes('eth') || (ni.iface || '').toLowerCase().includes('en'))
      .map(ni => ({
        id: ni.iface || '',
        iface: ni.iface || '',
        ifaceName: ni.ifaceName || '',
        ip4: ni.ip4 || '',
        ip6: ni.ip6 || '',
        mac: ni.mac || '',
        type: ni.type || 'wired',
        speed: ni.speed ?? null,
        duplex: ni.duplex || '',
        mtu: ni.mtu ?? null,
        operstate: ni.operstate || '',
        default: ni.default || false
      }))
  }
}
