# Container Diagnostic Suite

Aplicación portable de escritorio para diagnóstico profundo de hardware en equipos Windows. Analiza CPU, RAM, GPU, almacenamiento, batería, sensores y red — todo en un solo `.exe`.

## Descargar

Descarga la última versión desde [GitHub Releases](https://github.com/anthra123x/container-tester/releases).

No requiere instalación — solo descarga el `.exe` y ejecútalo.

## Funcionalidades

### Diagnóstico Automático (8 fases)
| Fase | Qué analiza |
|------|-------------|
| **Sistema** | OS, edición, activación, Secure Boot, TPM, Virtualización, plan de energía, uptime |
| **CPU** | modelo, núcleos, velocidades, throttling, uso por núcleo, temperatura, voltaje, caché L1/L2/L3 |
| **RAM** | total/uso/libre, slots, factor de forma, tipo (DDR3/4/5), velocidades, timings, paginación |
| **GPU** | modelo, VRAM, controlador, clocks, temperatura, ventilador, consumo, pantallas |
| **Almacenamiento** | tipo (HDD/SSD/NVMe), SMART, desgaste SSD, horas encendido, temperatura, interfaz |
| **Batería** | química, fecha fabricación, desgaste, salud, ciclos, voltaje, temperatura, runtime |
| **Sensores** | temperaturas CPU/GPU/disco, ventiladores, zonas térmicas |
| **Red** | interfaces, ping, latencia, DNS, puerta de enlace, firewall, WiFi |

### Pruebas Manuales
- Pantalla, teclado, touchpad, cámara, micrófono, audio, USB, Bluetooth, WiFi

### Especificaciones del equipo
- Modal con información detallada de todo el hardware detectado

## Tecnologías

- **Electron** — runtime multiplataforma
- **React + TypeScript** — interfaz de usuario
- **TailwindCSS** — estilos
- **systeminformation** — detección de hardware
- **PowerShell** — datos profundos (WMI, SMART, sensores)
- **Zustand** — estado global

## Requisitos

- Windows 10/11 (64-bit)
- No requiere instalación de dependencias externas ni permisos de administrador

## Desarrollo

```bash
npm install
npm run dev              # hot-reload
npm run build            # compilar
npx electron .           # ejecutar sin empaquetar
npx electron-builder --win portable  # generar .exe portable
```

## Estructura

```
src/
  main/
    ipc/                 # handlers de comunicación
    services/            # systeminformation, PowerShell
  renderer/
    routes/              # páginas: Dashboard, AutoDiagnostic, ManualTests, Settings
    components/          # componentes reutilizables
    hooks/               # custom hooks
    stores/              # Zustand stores
  shared/                # tipos y constantes compartidas
dist/
  CDS-Portable-1.0.0.exe # archivo portable listo para usar
scripts/                 # scripts PowerShell para diagnósticos profundos
```

## Notas

- El `.exe` portable incluye todo: Electron + la app. Sin base de datos externa.
- Los resultados de diagnóstico se muestran en la app al finalizar — no se guardan en disco.
- No requiere permisos de administrador (solo lectura de hardware vía WMI).

## Licencia

MIT
