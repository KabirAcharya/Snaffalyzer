import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import type { Finding } from '../types'
import { SEV_ORDER, SEV_COLORS } from '../types'

const PAGE_SIZE = 100

interface Props {
  findings: Finding[]
}

type SortCol = 'severity' | 'type' | 'rule' | 'matchedString' | 'path' | 'size' | 'modified' | 'access' | 'context'

const COLUMNS: { key: SortCol; label: string }[] = [
  { key: 'severity', label: 'Severity' },
  { key: 'type', label: 'Type' },
  { key: 'rule', label: 'Rule' },
  { key: 'matchedString', label: 'Matched' },
  { key: 'path', label: 'File Path' },
  { key: 'size', label: 'Size' },
  { key: 'modified', label: 'Modified' },
  { key: 'access', label: 'Access' },
  { key: 'context', label: 'Context' },
]

export function FindingsTable({ findings }: Props) {
  const [sortCol, setSortCol] = useState<SortCol>('severity')
  const [sortAsc, setSortAsc] = useState(true)
  const [activeSevs, setActiveSevs] = useState(new Set(['Black', 'Red', 'Yellow', 'Green']))
  const [filterType, setFilterType] = useState('')
  const [filterRule, setFilterRule] = useState('')
  const [filterExt, setFilterExt] = useState('')
  const [filterServer, setFilterServer] = useState('')
  const [searchText, setSearchText] = useState('')
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const tbodyRef = useRef<HTMLTableSectionElement>(null)

  // Build filter options
  const { rules, exts, servers } = useMemo(() => {
    const rules = new Set<string>()
    const exts = new Set<string>()
    const servers = new Set<string>()
    findings.forEach(f => {
      if (f.rule) rules.add(f.rule)
      if (f.ext) exts.add(f.ext)
      if (f.server) servers.add(f.server)
    })
    return { rules: [...rules].sort(), exts: [...exts].sort(), servers: [...servers].sort() }
  }, [findings])

  // Filter and sort
  const filtered = useMemo(() => {
    const search = searchText.toLowerCase()
    let result = findings.filter(f => {
      if (!activeSevs.has(f.severity)) return false
      if (filterType && f.type !== filterType) return false
      if (filterRule && f.rule !== filterRule) return false
      if (filterExt && f.ext !== filterExt) return false
      if (filterServer && f.server !== filterServer) return false
      if (search) {
        const hay = (f.severity + ' ' + f.type + ' ' + f.rule + ' ' + f.matchedString + ' ' + f.path + ' ' + f.context + ' ' + f.server).toLowerCase()
        if (!hay.includes(search)) return false
      }
      return true
    })

    result.sort((a, b) => {
      let va: any, vb: any
      switch (sortCol) {
        case 'severity':
          va = sortCol in SEV_ORDER ? SEV_ORDER[a.severity] ?? 9 : 9
          vb = sortCol in SEV_ORDER ? SEV_ORDER[b.severity] ?? 9 : 9
          va = a.severity in SEV_ORDER ? SEV_ORDER[a.severity] : 9
          vb = b.severity in SEV_ORDER ? SEV_ORDER[b.severity] : 9
          break
        case 'size': va = a.sizeBytes; vb = b.sizeBytes; break
        case 'modified': va = a.modified; vb = b.modified; break
        default: va = (a[sortCol] || '').toLowerCase(); vb = (b[sortCol] || '').toLowerCase()
      }
      if (va < vb) return sortAsc ? -1 : 1
      if (va > vb) return sortAsc ? 1 : -1
      return 0
    })

    return result
  }, [findings, activeSevs, filterType, filterRule, filterExt, filterServer, searchText, sortCol, sortAsc])

  // Reset display count when filters change
  useEffect(() => { setDisplayCount(PAGE_SIZE) }, [filtered])

  const handleSort = useCallback((col: SortCol) => {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(true) }
  }, [sortCol, sortAsc])

  const toggleSev = useCallback((sev: string) => {
    setActiveSevs(prev => {
      const next = new Set(prev)
      if (next.has(sev)) next.delete(sev)
      else next.add(sev)
      return next
    })
  }, [])

  const displayed = filtered.slice(0, displayCount)
  const hasMore = displayCount < filtered.length

  // Auto-scroll context cells to highlighted match
  useEffect(() => {
    if (!tbodyRef.current) return
    requestAnimationFrame(() => {
      tbodyRef.current?.querySelectorAll('.cell-context .match-hl').forEach(hl => {
        const cell = hl.closest('.cell-context') as HTMLElement
        if (cell && cell.scrollWidth > cell.clientWidth) {
          const hlEl = hl as HTMLElement
          cell.scrollLeft = hlEl.offsetLeft - cell.offsetLeft - cell.clientWidth / 2 + hlEl.offsetWidth / 2
        }
      })
    })
  }, [displayed])

  return (
    <>
      {/* Filter Bar */}
      <div className="filter-bar fade-in">
        <span className="section-label">Severity</span>
        {['Black', 'Red', 'Yellow', 'Green'].map(sev => (
          <div
            key={sev}
            className={`sev-toggle${activeSevs.has(sev) ? ' active' : ''}`}
            data-sev={sev}
            onClick={() => toggleSev(sev)}
          >
            {'{' + sev + '}'}
          </div>
        ))}
        <div className="filter-sep" />
        <select className="filter-input" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          <option value="File">File</option>
          <option value="Share">Share</option>
          <option value="Dir">Dir</option>
        </select>
        <select className="filter-input" value={filterRule} onChange={e => setFilterRule(e.target.value)}>
          <option value="">All Rules</option>
          {rules.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="filter-input" value={filterExt} onChange={e => setFilterExt(e.target.value)}>
          <option value="">All Extensions</option>
          {exts.map(e => <option key={e} value={e}>.{e}</option>)}
        </select>
        <select className="filter-input" value={filterServer} onChange={e => setFilterServer(e.target.value)}>
          <option value="">All Servers</option>
          {servers.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          className="filter-input search"
          type="text"
          placeholder="Search..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
        <span className="results-count">
          {displayed.length} of {filtered.length === findings.length
            ? findings.length
            : `${filtered.length} (${findings.length} total)`}
        </span>
      </div>

      {/* Table */}
      <div className="table-wrap fade-in">
        <table className="log-table">
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={sortCol === col.key ? 'sorted' : ''}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}{' '}
                  <span className="sort-arrow">
                    {sortCol === col.key ? (sortAsc ? '▲' : '▼') : '▲'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {displayed.map((f, i) => (
              <tr key={i} data-sev={f.severity}>
                <td className="cell-sev">
                  {f.severity === 'Black'
                    ? <span>{'{Black}'}</span>
                    : <span style={{ color: SEV_COLORS[f.severity] || 'inherit' }}>{'{' + f.severity + '}'}</span>
                  }
                </td>
                <td className="cell-mono">{f.type}</td>
                <td className="cell-mono">{f.rule}</td>
                <td className="cell-mono">{f.matchedString}</td>
                <td
                  className="cell-path"
                  {...(f.path.length > 40 ? { 'data-tooltip': f.path } : {})}
                >
                  {f.path}
                </td>
                <td className="cell-mono">{f.size}</td>
                <td className="cell-mono">{f.modified}</td>
                <td className="cell-mono">{f.access}</td>
                <td
                  className="cell-context"
                  dangerouslySetInnerHTML={{ __html: highlightContext(f.context, f.matchedString) }}
                />
              </tr>
            ))}
          </tbody>
        </table>
        {hasMore && (
          <div className="load-more-row">
            <button className="load-more-btn" onClick={() => setDisplayCount(d => d + PAGE_SIZE)}>
              Load More
            </button>
          </div>
        )}
      </div>
    </>
  )
}

function esc(s: string): string {
  if (!s) return ''
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function highlightContext(context: string, matched: string): string {
  if (!context) return ''
  const escaped = esc(context)
  if (!matched) return escaped
  const escapedMatch = esc(matched)
  if (!escapedMatch) return escaped
  const idx = escaped.toLowerCase().indexOf(escapedMatch.toLowerCase())
  if (idx === -1) return escaped
  return escaped.substring(0, idx) + '<span class="match-hl">' + escaped.substring(idx, idx + escapedMatch.length) + '</span>' + escaped.substring(idx + escapedMatch.length)
}
