import type { Finding, ScanMeta } from '../types'
import { useMemo } from 'react'

interface Props {
  findings: Finding[]
  scanMeta: ScanMeta
}

export function MetricsRow({ findings, scanMeta }: Props) {
  const metrics = useMemo(() => {
    const sevCounts: Record<string, number> = {}
    const servers = new Set<string>()
    const exts = new Set<string>()

    findings.forEach(f => {
      sevCounts[f.severity] = (sevCounts[f.severity] || 0) + 1
      if (f.server) servers.add(f.server)
      if (f.ext) exts.add(f.ext)
    })

    let durStr = '-'
    if (scanMeta.timestamps.length >= 2) {
      const sorted = [...scanMeta.timestamps].sort((a, b) => a.getTime() - b.getTime())
      const dur = sorted[sorted.length - 1].getTime() - sorted[0].getTime()
      const mins = Math.round(dur / 60000)
      durStr = mins < 60 ? mins + 'm' : Math.floor(mins / 60) + 'h ' + mins % 60 + 'm'
    }

    return [
      { label: 'Total Findings', value: findings.length, sub: `${scanMeta.lineCount.toLocaleString()} lines parsed` },
      { label: 'Critical', value: sevCounts['Black'] || 0, sub: '{Black}', color: '#c8cdd8' },
      { label: 'High', value: sevCounts['Red'] || 0, sub: '{Red}', color: 'var(--sev-red)' },
      { label: 'Medium', value: sevCounts['Yellow'] || 0, sub: '{Yellow}', color: 'var(--sev-yellow)' },
      { label: 'Servers', value: servers.size, sub: 'unique hosts' },
      { label: 'File Types', value: exts.size, sub: 'unique extensions' },
      { label: 'Duration', value: durStr, sub: scanMeta.complete ? 'complete' : 'incomplete' },
    ]
  }, [findings, scanMeta])

  return (
    <div className="metrics-row fade-in">
      {metrics.map(m => (
        <div className="metric-card" key={m.label}>
          <div className="label">{m.label}</div>
          <div className="value" style={m.color ? { color: m.color } : undefined}>{m.value}</div>
          <div className="sub">{m.sub}</div>
        </div>
      ))}
    </div>
  )
}
