import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import type { Finding } from '../types'
import { SEV_COLORS } from '../types'

Chart.register(...registerables)

interface Props {
  findings: Finding[]
}

export function Charts({ findings }: Props) {
  const sevRef = useRef<HTMLCanvasElement>(null)
  const rulesRef = useRef<HTMLCanvasElement>(null)
  const serversRef = useRef<HTMLCanvasElement>(null)
  const timelineRef = useRef<HTMLCanvasElement>(null)
  const filetypesRef = useRef<HTMLCanvasElement>(null)
  const chartsRef = useRef<Chart[]>([])

  useEffect(() => {
    // Destroy previous charts
    chartsRef.current.forEach(c => c.destroy())
    chartsRef.current = []

    Chart.defaults.color = '#7c8496'
    Chart.defaults.borderColor = 'rgba(255,255,255,0.06)'
    Chart.defaults.font.family = "'Inter',system-ui,sans-serif"
    Chart.defaults.font.size = 11

    if (sevRef.current) chartsRef.current.push(buildSeverityChart(sevRef.current, findings))
    if (rulesRef.current) chartsRef.current.push(buildBarChart(rulesRef.current, findings, 'rule'))
    if (serversRef.current) chartsRef.current.push(buildBarChart(serversRef.current, findings, 'server', 0.4))
    if (timelineRef.current) {
      const c = buildTimelineChart(timelineRef.current, findings)
      if (c) chartsRef.current.push(c)
    }
    if (filetypesRef.current) chartsRef.current.push(buildBarChart(filetypesRef.current, findings, 'ext', 0.5, true))

    return () => {
      chartsRef.current.forEach(c => c.destroy())
      chartsRef.current = []
    }
  }, [findings])

  const accessData = buildAccessData(findings)

  return (
    <div className="charts-grid fade-in">
      <div className="chart-panel chart-severity">
        <h3>Severity Breakdown</h3>
        <canvas ref={sevRef} />
      </div>
      <div className="chart-panel">
        <h3>Top Rules</h3>
        <canvas ref={rulesRef} />
      </div>
      <div className="chart-panel">
        <h3>Top Servers</h3>
        <canvas ref={serversRef} />
      </div>
      <div className="chart-panel chart-timeline">
        <h3>Findings Timeline</h3>
        <canvas ref={timelineRef} />
      </div>
      <div className="chart-panel">
        <h3>File Types</h3>
        <canvas ref={filetypesRef} />
      </div>
      <div className="chart-panel">
        <h3>Access Summary</h3>
        <div className="access-bars">
          {accessData.map(b => (
            <div className="access-bar-row" key={b.label}>
              <span className="lbl">{b.label}</span>
              <div className="track">
                <div className="fill" style={{ width: `${b.pct}%`, background: b.color }} />
              </div>
              <span className="count">{b.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function buildSeverityChart(canvas: HTMLCanvasElement, findings: Finding[]): Chart {
  const counts: Record<string, number> = { Black: 0, Red: 0, Yellow: 0, Green: 0 }
  findings.forEach(f => { if (f.severity in counts) counts[f.severity]++ })
  const labels = Object.keys(counts)
  const data = Object.values(counts)
  const colors = labels.map(l => SEV_COLORS[l])
  const total = data.reduce((a, b) => a + b, 0)
  const borderColors = labels.map(l => l === 'Black' ? 'rgba(255,255,255,0.7)' : 'transparent')
  const borderWidths = labels.map(l => l === 'Black' ? 2 : 0)

  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels.map(l => '{' + l + '}'),
      datasets: [{ data, backgroundColor: colors, borderColor: borderColors, borderWidth: borderWidths, hoverOffset: 4 }],
    },
    options: {
      responsive: true, cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true, pointStyle: 'circle', padding: 10,
            font: { family: "'JetBrains Mono',monospace", size: 11 },
            generateLabels(chart) {
              const ds = chart.data.datasets[0]
              return chart.data.labels!.map((label, i) => ({
                text: label as string,
                fontColor: '#7c8496',
                fillStyle: label === '{Black}' ? '#333' : (ds.backgroundColor as string[])[i],
                strokeStyle: label === '{Black}' ? '#fff' : (ds.backgroundColor as string[])[i],
                lineWidth: label === '{Black}' ? 2 : 0,
                pointStyle: 'circle' as const,
                hidden: false, index: i,
              }))
            },
            color: '#7c8496',
          },
        },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} (${((ctx.raw as number) / total * 100).toFixed(1)}%)` } },
      },
    },
    plugins: [{
      id: 'centerText',
      beforeDraw(chart) {
        const { ctx, chartArea: { width, height, top } } = chart
        ctx.save()
        ctx.fillStyle = '#c8cdd8'
        ctx.font = "700 24px 'JetBrains Mono',monospace"
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(total), width / 2, top + height / 2 - 8)
        ctx.font = "500 11px 'Inter',sans-serif"
        ctx.fillStyle = '#7c8496'
        ctx.fillText('findings', width / 2, top + height / 2 + 16)
        ctx.restore()
      },
    }],
  })
}

function buildBarChart(canvas: HTMLCanvasElement, findings: Finding[], field: keyof Finding, opacity = 0.6, prefixDot = false): Chart {
  const counts: Record<string, number> = {}
  findings.forEach(f => { const v = f[field] as string; if (v) counts[v] = (counts[v] || 0) + 1 })
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const labels = sorted.map(s => prefixDot ? '.' + s[0] : s[0])
  const data = sorted.map(s => s[1])

  return new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: `rgba(99,102,241,${opacity})`, borderRadius: 3 }] },
    options: {
      indexAxis: 'y', responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { family: "'JetBrains Mono',monospace" } } },
        y: { grid: { display: false }, ticks: { font: { family: "'JetBrains Mono',monospace", size: 10 } } },
      },
    },
  })
}

function buildTimelineChart(canvas: HTMLCanvasElement, findings: Finding[]): Chart | null {
  const timestamps = findings.filter(f => f.timestamp).map(f => f.timestamp!.getTime()).sort()
  if (timestamps.length < 2) return null

  const minT = timestamps[0], maxT = timestamps[timestamps.length - 1]
  const range = maxT - minT
  const binMs = range > 3600000 * 4 ? 3600000 : 60000
  const bins: Record<number, number> = {}
  timestamps.forEach(t => {
    const k = Math.floor(t / binMs) * binMs
    bins[k] = (bins[k] || 0) + 1
  })
  const sortedKeys = Object.keys(bins).map(Number).sort()
  const labels = sortedKeys.map(k => {
    const d = new Date(k)
    return binMs >= 3600000 ? d.getUTCHours() + ':00' : d.getUTCHours() + ':' + String(d.getUTCMinutes()).padStart(2, '0')
  })
  const data = sortedKeys.map(k => bins[k])

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data, fill: true,
        borderColor: 'rgba(99,102,241,0.8)', backgroundColor: 'rgba(99,102,241,0.1)',
        tension: 0.3, pointRadius: 0, borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { maxTicksLimit: 12, font: { family: "'JetBrains Mono',monospace" } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { family: "'JetBrains Mono',monospace" } }, beginAtZero: true },
      },
    },
  })
}

function buildAccessData(findings: Finding[]) {
  let r = 0, w = 0, m = 0
  const total = findings.length || 1
  findings.forEach(f => {
    if (f.access.includes('R')) r++
    if (f.access.includes('W')) w++
    if (f.access.includes('M')) m++
  })
  return [
    { label: 'Readable', count: r, pct: r / total * 100, color: 'var(--sev-green)' },
    { label: 'Writable', count: w, pct: w / total * 100, color: 'var(--sev-yellow)' },
    { label: 'Modifiable', count: m, pct: m / total * 100, color: 'var(--sev-red)' },
  ]
}
