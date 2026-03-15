import { useState, useCallback, useEffect } from 'react'
import { parseLog, type ParseResult } from './utils/parser'
import type { Finding, ScanMeta, InfoLine } from './types'
import { DropZone } from './components/DropZone'
import { Dashboard } from './components/Dashboard'
import { InvalidWarningModal } from './components/InvalidWarningModal'

type AppState = 'drop' | 'parsing' | 'warning' | 'dashboard'

export function App() {
  const [state, setState] = useState<AppState>('drop')
  const [parseProgress, setParseProgress] = useState(0)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [rawLogText, setRawLogText] = useState('')
  const [rawLogFilename, setRawLogFilename] = useState('')

  const handleFile = useCallback((file: File) => {
    setState('parsing')
    setParseProgress(0)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setRawLogText(text)
      setRawLogFilename(file.name)
      const result = parseLog(text, file.name)
      setParseResult(result)

      const hasData = result.findings.length > 0 || result.infoLines.length > 0
      if (!hasData) {
        setState('warning')
      } else {
        setState('dashboard')
      }
    }
    reader.onprogress = (e) => {
      if (e.lengthComputable) setParseProgress(Math.round(e.loaded / e.total * 100))
    }
    reader.readAsText(file)
  }, [])

  const handleLoadEmbedded = useCallback((logText: string, filename: string) => {
    setRawLogText(logText)
    setRawLogFilename(filename)
    const result = parseLog(logText, filename)
    setParseResult(result)
    setState('dashboard')
  }, [])

  // Expose hooks for embedded/encrypted report loading
  useEffect(() => {
    (window as any).__snaffalyzerLoadEmbedded = handleLoadEmbedded;
    (window as any).__snaffalyzerLoadEncrypted = handleLoadEmbedded
    return () => {
      delete (window as any).__snaffalyzerLoadEmbedded
      delete (window as any).__snaffalyzerLoadEncrypted
    }
  }, [handleLoadEmbedded])

  const handleReset = useCallback(() => {
    setState('drop')
    setParseResult(null)
    setRawLogText('')
    setRawLogFilename('')
  }, [])

  if (state === 'drop' || state === 'parsing') {
    return (
      <DropZone
        onFile={handleFile}
        parsing={state === 'parsing'}
        progress={parseProgress}
      />
    )
  }

  if (state === 'warning' && parseResult) {
    return (
      <InvalidWarningModal
        scanMeta={parseResult.scanMeta}
        findingsCount={parseResult.findings.length}
        infoCount={parseResult.infoLines.length}
        onForce={() => setState('dashboard')}
        onCancel={handleReset}
      />
    )
  }

  if (state === 'dashboard' && parseResult) {
    return (
      <Dashboard
        findings={parseResult.findings}
        infoLines={parseResult.infoLines}
        scanMeta={parseResult.scanMeta}
        rawLogText={rawLogText}
        rawLogFilename={rawLogFilename}
        onReset={handleReset}
      />
    )
  }

  return null
}
