import { useState } from 'react'
import type { InfoLine } from '../types'

interface Props {
  infoLines: InfoLine[]
}

function esc(s: string): string {
  if (!s) return ''
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function InfoSection({ infoLines }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="info-section fade-in">
      <div
        className={`info-header${open ? ' open' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <h3>Scan Log <span style={{ opacity: 0.5 }}>({infoLines.length})</span></h3>
        <span className="toggle-icon">&#9660;</span>
      </div>
      <div className={`info-body${open ? ' open' : ''}`}>
        {infoLines.map((l, i) => (
          <div
            key={i}
            className={`info-line${l.type === 'Error' || l.type === 'Fatal' ? ' error' : ''}`}
          >
            [{esc(l.type)}] {esc(l.message)}
          </div>
        ))}
      </div>
    </div>
  )
}
