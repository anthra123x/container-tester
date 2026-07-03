import { dialog, BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'
import type { ReportData, ReportSectionItem } from '../../shared/types/report.types'

function sectionHTML(title: string, items: ReportSectionItem[]): string {
  if (!items || items.length === 0) return ''
  return `
<h2>${title}</h2>
<table>
  <tr><th>Prueba</th><th>Valor</th><th>Estado</th></tr>
  ${items.map(i => `<tr>
    <td>${i.name}</td>
    <td>${i.value}</td>
    <td class="${i.status.toLowerCase()}">${i.status}</td>
  </tr>`).join('\n  ')}
</table>`
}

function generateHTML(data: ReportData): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte de Diagnóstico — ${data.deviceName}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:960px;margin:0 auto;padding:48px 24px;color:#1e293b;background:#f8fafc}
h1{font-size:28px;font-weight:800;color:#0f172a;border-bottom:3px solid #3b82f6;padding-bottom:12px;margin-bottom:24px}
h2{font-size:20px;font-weight:700;color:#3b82f6;margin-top:36px;margin-bottom:8px}
table{width:100%;border-collapse:collapse;margin:12px 0 24px;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)}
th,td{text-align:left;padding:10px 16px;border-bottom:1px solid #e2e8f0;font-size:14px}
th{background:#f1f5f9;font-weight:600;color:#475569;text-transform:uppercase;font-size:11px;letter-spacing:.5px}
tr:last-child td{border-bottom:none}
.pass{color:#16a34a;font-weight:700}
.fail{color:#dc2626;font-weight:700}
.warn{color:#d97706;font-weight:700}
.skip{color:#94a3b8}
.observations{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-top:12px;color:#92400e;font-size:14px;line-height:1.6}
.footer{margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center}
.badge{display:inline-block;padding:2px 12px;border-radius:999px;font-size:12px;font-weight:700}
.badge.pass{background:#dcfce7;color:#16a34a}
.badge.fail{background:#fee2e2;color:#dc2626}
.badge.warn{background:#fef3c7;color:#d97706}
</style>
</head>
<body>
<h1>Reporte de Diagnóstico</h1>

<table>
  <tr><th>Equipo</th><td>${data.deviceName}</td></tr>
  <tr><th>Modelo</th><td>${data.model}</td></tr>
  <tr><th>Número de Serie</th><td>${data.serialNumber}</td></tr>
  <tr><th>Fabricante</th><td>${data.manufacturer}</td></tr>
  <tr><th>Sistema Operativo</th><td>${data.osInfo}</td></tr>
  <tr><th>Fecha</th><td>${data.diagnosticDate}</td></tr>
  <tr><th>Técnico</th><td>${data.technician || '—'}</td></tr>
  <tr><th>Estado General</th><td><span class="badge ${data.status === 'APROBADO' ? 'pass' : data.status === 'APROBADO_CON_OBSERVACIONES' ? 'warn' : 'fail'}">${data.status}</span></td></tr>
</table>

${sectionHTML('Hardware', data.hardwareResults)}
${sectionHTML('Almacenamiento', data.storageResults)}
${sectionHTML('Batería', data.batteryResults)}
${sectionHTML('Pruebas Manuales', data.manualTestResults)}

${data.observations ? `<h2>Observaciones</h2><div class="observations">${data.observations.replace(/\n/g, '<br>')}</div>` : ''}

<div class="footer">
  Generado por <strong>Container Diagnostic Suite</strong> — ${new Date().toLocaleString('es-MX')}
</div>
</body>
</html>`
}

export async function generateReport(data: ReportData): Promise<string | null> {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
  if (!win) throw new Error('No window available')

  const result = await dialog.showSaveDialog(win, {
    title: 'Guardar Reporte de Diagnóstico',
    defaultPath: `Reporte_${data.deviceName || 'equipo'}_${data.diagnosticDate?.replace(/[/:]/g, '-') || new Date().toISOString().slice(0, 10)}.html`,
    filters: [
      { name: 'HTML', extensions: ['html'] },
      { name: 'Todos los archivos', extensions: ['*'] },
    ],
  })

  if (result.canceled || !result.filePath) return null

  const html = generateHTML(data)
  writeFileSync(result.filePath, html, 'utf8')
  return result.filePath
}
