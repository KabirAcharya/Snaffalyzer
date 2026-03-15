import { useState, useCallback, useMemo } from 'react'
import type { Finding, InfoLine, ScanMeta } from '../types'
import { MetricsRow } from './MetricsRow'
import { Charts } from './Charts'
import { FindingsTable } from './FindingsTable'
import { InfoSection } from './InfoSection'
import { SaveModal } from './SaveModal'
import { exportCSV, copyToClipboard } from '../utils/export'

interface Props {
  findings: Finding[]
  infoLines: InfoLine[]
  scanMeta: ScanMeta
  rawLogText: string
  rawLogFilename: string
  onReset: () => void
}

export function Dashboard({ findings, infoLines, scanMeta, rawLogText, rawLogFilename, onReset }: Props) {
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [copyLabel, setCopyLabel] = useState('Copy')

  const headerMeta = useMemo(() => {
    const hosts = [...scanMeta.hosts]
    const users = [...scanMeta.users]
    let meta = ''
    if (hosts.length) meta += hosts.slice(0, 3).join(', ') + (hosts.length > 3 ? ' +' + (hosts.length - 3) : '')
    if (users.length) meta += ' | ' + users[0]
    if (scanMeta.timestamps.length >= 2) {
      const sorted = [...scanMeta.timestamps].sort((a, b) => a.getTime() - b.getTime())
      const dur = sorted[sorted.length - 1].getTime() - sorted[0].getTime()
      const mins = Math.round(dur / 60000)
      meta += ' | ' + (mins < 60 ? mins + 'm' : Math.round(mins / 60) + 'h ' + mins % 60 + 'm')
    }
    return meta
  }, [scanMeta])

  const handleCopy = useCallback(() => {
    copyToClipboard(findings).then(() => {
      setCopyLabel('Copied!')
      setTimeout(() => setCopyLabel('Copy'), 1500)
    })
  }, [findings])

  return (
    <>
      <header className="app-header">
        <div className="brand">
          Snaffalyzer{' '}
          <span className={`scan-badge ${scanMeta.complete ? 'complete' : 'incomplete'}`}>
            {scanMeta.complete ? 'SCAN COMPLETE' : 'SCAN INCOMPLETE'}
          </span>
        </div>
        <div className="header-actions">
          <span className="header-meta">{headerMeta}</span>
          <button className="btn btn-accent" onClick={() => setShowSaveModal(true)}>Save Report</button>
          <button className="btn" onClick={() => exportCSV(findings)}>Export CSV</button>
          <button className="btn" onClick={handleCopy}>{copyLabel}</button>
          <button className="btn" onClick={onReset}>New File</button>
        </div>
      </header>

      <div className="content">
        <MetricsRow findings={findings} scanMeta={scanMeta} />
        <Charts findings={findings} />
        <FindingsTable findings={findings} />
        <InfoSection infoLines={infoLines} />
      </div>

      {showSaveModal && (
        <SaveModal
          rawLogText={rawLogText}
          rawLogFilename={rawLogFilename}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </>
  )
}
