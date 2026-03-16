import { useRef, useState, useCallback, useEffect } from 'react'

interface DropZoneProps {
  onFile: (file: File) => void
  parsing: boolean
  progress: number
}

export function DropZone({ onFile, parsing, progress }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer?.files[0]
    if (f) onFile(f)
  }, [onFile])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  useEffect(() => {
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('drop', handleDrop)
    return () => {
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('drop', handleDrop)
    }
  }, [handleDrop, handleDragOver, handleDragLeave])

  return (
    <div className={`drop-zone${dragOver ? ' drag-over' : ''}`}>
      <div className="logo">Snaffalyzer</div>
      <div className="tagline">Snaffler log parser &amp; triage dashboard</div>
      <div className="severity-strip">
        <div className="sev-tag sev-tag-black">{'{Black}'}</div>
        <div className="sev-tag sev-tag-red">{'{Red}'}</div>
        <div className="sev-tag sev-tag-yellow">{'{Yellow}'}</div>
        <div className="sev-tag sev-tag-green">{'{Green}'}</div>
      </div>
      <div
        className="drop-box"
        onClick={() => fileInputRef.current?.click()}
      >
        <p>Drop a Snaffler log file here</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--ink-tertiary)', marginBottom: 16 }}>
          .log &middot; .txt &middot; .tsv
        </p>
        <button className="browse-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
          Browse File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".log,.txt,.tsv,.csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
          }}
        />
      </div>
      <a href="https://github.com/KabirAcharya/Snaffalyzer" target="_blank" rel="noopener noreferrer" className="github-link">GitHub</a>
      {parsing && (
        <div className="parse-progress">
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="label">Parsing... {progress}%</div>
        </div>
      )}
    </div>
  )
}
