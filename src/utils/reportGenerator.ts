import { encryptData } from './crypto'

interface GenerateReportOptions {
  logText: string
  logFilename: string
  encrypt: boolean
  password?: string
  onProgress?: (msg: string) => void
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

export async function generateReport(opts: GenerateReportOptions): Promise<void> {
  const { logText, logFilename, encrypt, password, onProgress } = opts

  onProgress?.('Fetching template...')
  const resp = await fetch('/report-template.html')
  if (!resp.ok) throw new Error('Could not load report template')
  const template = await resp.text()

  let payload: string
  let mode: string

  if (encrypt && password) {
    const encrypted = await encryptData(
      JSON.stringify({ log: logText, filename: logFilename }),
      password,
      onProgress,
    )
    // Base64-encode the encrypted payload JSON
    payload = utf8ToBase64(JSON.stringify(encrypted))
    mode = 'encrypted'
  } else {
    onProgress?.('Encoding log data...')
    // Base64-encode the log data JSON
    payload = utf8ToBase64(JSON.stringify({ log: logText, filename: logFilename }))
    mode = 'plain'
  }

  onProgress?.('Building report...')

  // Just fill in the data attributes — no HTML or script injection
  const output = template
    .replace('data-payload=""', 'data-payload="' + payload + '"')
    .replace('data-mode=""', 'data-mode="' + mode + '"')

  const blob = new Blob([output], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const baseName = logFilename.replace(/\.[^.]*$/, '') || 'snaffalyzer'
  a.href = url
  a.download = baseName + '-report.html'
  a.click()
  URL.revokeObjectURL(url)
}
