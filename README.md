# Container Diagnostic Suite

Aplicación portable de escritorio para diagnóstico de hardware en equipos Windows. Genera reportes detallados de CPU, RAM, GPU, almacenamiento, batería, sensores y red.

## Descargar

Descarga el `.exe` portable desde [Releases](https://github.com/anthra123x/container-tester/releases) o directamente del repositorio en `dist/CDS-Portable-1.0.0.exe`.

No requiere instalación — solo ejecuta el archivo.

## Funcionalidades

- **Diagnóstico automático**: analiza CPU, RAM, GPU, almacenamiento (SMART), batería, sensores térmicos y conectividad de red.
- **Pruebas manuales**: prueba de pantalla, teclado, touchpad, cámara, micrófono, audio y puertos USB.
- **Reportes en-app**: visualiza los resultados de cada diagnóstico directamente en la aplicación, con detalles por componente.
- **Historial completo**: todas las ejecuciones anteriores quedan guardadas en base de datos local (sql.js).
- **Especificaciones del equipo**: modal con información detallada del hardware detectado.

## Tecnologías

- **Electron** — runtime multiplataforma
- **React + TypeScript** — interfaz de usuario
- **TailwindCSS** — estilos
- **sql.js** (SQLite compilado a WebAssembly) — base de datos local embebida
- **systeminformation** — detección de hardware
- **Zustand** — estado global

## Requisitos

- Windows 10/11 (64-bit)
- No requiere instalación de dependencias externas

## Desarrollo

```bash
npm install
npm run dev        # hot-reload
npm run build      # compilar
npx electron .     # ejecutar sin empaquetar
npx electron-builder --win portable  # generar .exe portable
```

## Estructura del proyecto

```
src/
  main/             # proceso principal (Electron)
    ipc/             # handlers de comunicación
    database/        # sql.js (esquema, repositorios, wrapper)
    services/        # systeminformation, PowerShell
  renderer/          # interfaz React
    routes/          # páginas: Dashboard, AutoDiagnostic, ManualTests, Reports, History, Settings
    components/      # componentes reutilizables
    hooks/           # custom hooks (useDiagnostic, useIpc)
    stores/          # Zustand stores
  shared/            # tipos y constantes compartidas
dist/
  CDS-Portable-1.0.0.exe  # archivo portable listo para usar
scripts/             # scripts PowerShell para diagnósticos
```

## Notas

- El `.exe` portable incluye todo lo necesario: Electron, la app, y la base de datos.
- Los diagnósticos se guardan automáticamente en una base de datos SQLite local.
- La sección **Reportes** muestra los resultados guardados al hacer clic en "Abrir".
