import type { Finding } from '../types'

export function exportCSV(findings: Finding[]) {
  const rows = [['Severity', 'Type', 'Rule', 'Matched', 'Path', 'Size', 'Modified', 'Access', 'Context', 'Server', 'Extension']]
  findings.forEach(f => {
    rows.push([f.severity, f.type, f.rule, f.matchedString, f.path, f.size, f.modified, f.access, f.context, f.server, f.ext])
  })
  const csv = rows.map(r => r.map(c => '"' + (c || '').replace(/"/g, '""') + '"').join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'snaffalyzer-export.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function copyToClipboard(findings: Finding[]): Promise<void> {
  const lines = findings.map(f => `{${f.severity}} [${f.type}] ${f.rule} | ${f.path} | ${f.context}`)
  return navigator.clipboard.writeText(lines.join('\n'))
}
