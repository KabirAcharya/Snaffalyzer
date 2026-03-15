import type { ScanMeta } from '../types'

interface Props {
  scanMeta: ScanMeta
  findingsCount: number
  infoCount: number
  onForce: () => void
  onCancel: () => void
}

export function InvalidWarningModal({ scanMeta, findingsCount, infoCount, onForce, onCancel }: Props) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="warn-icon">&#9888;</div>
        <h2>This doesn't look like a Snaffler log</h2>
        <p>The file could not be parsed as a valid Snaffler scan output. No findings, shares, or directory results were detected.</p>
        <div className="warn-stats">
          Lines parsed: {scanMeta.lineCount.toLocaleString()}<br />
          Findings detected: {findingsCount}<br />
          Info/Error lines: {infoCount}<br />
          File: {scanMeta.filename}
        </div>
        <div className="modal-actions">
          <button className="btn-modal btn-modal-secondary" onClick={onForce}>Try Anyway</button>
          <button className="btn-modal btn-modal-primary" onClick={onCancel}>Go Back</button>
        </div>
      </div>
    </div>
  )
}
