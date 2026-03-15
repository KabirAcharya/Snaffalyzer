import { useState } from 'react'
import { generateReport } from '../utils/reportGenerator'

interface Props {
  rawLogText: string
  rawLogFilename: string
  onClose: () => void
}

export function SaveModal({ rawLogText, rawLogFilename, onClose }: Props) {
  const [encrypt, setEncrypt] = useState(true)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setError('')
    if (encrypt) {
      if (!password) { setError('Enter a password'); return }
      if (password !== confirmPassword) { setError('Passwords do not match'); return }
    }

    setSaving(true)
    try {
      await generateReport({
        logText: rawLogText,
        logFilename: rawLogFilename,
        encrypt,
        password: encrypt ? password : undefined,
        onProgress: setProgress,
      })
      setProgress('Done!')
      setTimeout(onClose, 800)
    } catch (e: any) {
      setError('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay save-modal">
      <div className="modal-box">
        <h2 style={{ marginBottom: 16 }}>Save Report</h2>
        <p style={{ marginBottom: 16 }}>
          Generate a self-contained HTML file that can be opened in any browser without Snaffalyzer.
        </p>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--ink-primary)', fontSize: '0.85rem' }}>
            <input type="checkbox" checked={encrypt} onChange={(e) => setEncrypt(e.target.checked)} />
            Encrypt report
          </label>
          <div style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)', marginTop: 4, marginLeft: 24 }}>
            AES-256-GCM &middot; PBKDF2-SHA256 &middot; 600k rounds
          </div>
        </div>
        {encrypt && (
          <div>
            <input
              className="save-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              className="save-input"
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
        )}
        {error && <div className="save-error">{error}</div>}
        {progress && <div className="save-progress">{progress}</div>}
        <div className="modal-actions" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
          <button className="btn-modal btn-modal-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-modal"
            style={{ background: 'var(--accent)', color: '#fff' }}
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
