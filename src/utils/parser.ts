import type { Finding, InfoLine, ScanMeta } from '../types'

export interface ParseResult {
  findings: Finding[]
  infoLines: InfoLine[]
  scanMeta: ScanMeta
}

export function parseLog(text: string, filename: string): ParseResult {
  const lines = text.split(/\r?\n/)
  const total = lines.length
  const findings: Finding[] = []
  const infoLines: InfoLine[] = []
  const scanMeta: ScanMeta = {
    filename,
    complete: false,
    hosts: new Set(),
    users: new Set(),
    timestamps: [],
    lineCount: total,
  }

  const isTSV = lines.slice(0, 20).some(l => (l.match(/\t/g) || []).length >= 3)

  for (let i = 0; i < total; i++) {
    const line = lines[i]
    if (!line || !line.trim()) continue
    parseLine(line, isTSV, findings, infoLines, scanMeta)
  }

  return { findings, infoLines, scanMeta }
}

function parseLine(
  line: string,
  isTSV: boolean,
  findings: Finding[],
  infoLines: InfoLine[],
  scanMeta: ScanMeta,
) {
  if (line.includes('Snaffler out.')) {
    scanMeta.complete = true
  }

  if (isTSV) {
    parseTSVLine(line, findings, infoLines, scanMeta)
    return
  }

  // PLAIN FORMAT
  const hostMatch = line.match(/\[([^\]]*\\[^\]]*@[^\]]*)\]/)
  let rest = line
  if (hostMatch) {
    extractHostInfo(hostMatch[1], scanMeta)
    rest = line.substring(line.indexOf(']', line.indexOf(hostMatch[0])) + 1).trim()
  }

  const tsMatch = rest.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}Z?)/)
  let timestamp: Date | null = null
  if (tsMatch) {
    timestamp = parseTimestamp(tsMatch[1], scanMeta)
    rest = rest.substring(rest.indexOf(tsMatch[0]) + tsMatch[0].length).trim()
  }

  const typeMatch = rest.match(/^\[(\w+)\]\s*/)
  if (!typeMatch) return
  const msgType = typeMatch[1]
  rest = rest.substring(typeMatch[0].length)

  if (msgType === 'File') parsePlainFileResult(rest, timestamp, findings)
  else if (msgType === 'Share') parsePlainShareResult(rest, timestamp, findings)
  else if (msgType === 'Dir') parsePlainDirResult(rest, timestamp, findings)
  else infoLines.push({ type: msgType, message: rest, timestamp })
}

function extractHostInfo(hostStr: string, scanMeta: ScanMeta) {
  const atIdx = hostStr.lastIndexOf('@')
  if (atIdx > -1) {
    scanMeta.users.add(hostStr.substring(0, atIdx))
    scanMeta.hosts.add(hostStr.substring(atIdx + 1))
  }
}

function parseTimestamp(str: string, scanMeta: ScanMeta): Date | null {
  const ts = new Date(str.replace(/Z$/, '') + 'Z')
  if (!isNaN(ts.getTime())) scanMeta.timestamps.push(ts)
  return isNaN(ts.getTime()) ? null : ts
}

// PLAIN FORMAT PARSERS

function parsePlainFileResult(str: string, timestamp: Date | null, findings: Finding[]) {
  const m = str.match(/^\{(\w+)\}<([^>]*)>\(([^)]*)\)\s*(.*)?$/)
  if (!m) return
  const fields = m[2].split('|')
  let filePath = m[3], altPath = ''
  if (filePath.includes('#_as_#')) {
    const pp = filePath.split('#_as_#')
    filePath = pp[0]; altPath = pp[1]
  }
  findings.push({
    severity: m[1], type: 'File', rule: fields[0] || '', matchedString: fields[2] || '',
    path: filePath, altPath, size: fields[3] || '', sizeBytes: parseSizeToBytes(fields[3] || ''),
    modified: fields[4] || '', access: fields[1] || '',
    context: (m[4] || '').trim(), server: extractServer(filePath), ext: extractExt(filePath), timestamp,
  })
}

function parsePlainShareResult(str: string, timestamp: Date | null, findings: Finding[]) {
  const m = str.match(/^\{(\w+)\}<([^>]*)>\(([^)]*)\)\s*(.*)?$/)
  if (!m) return
  findings.push({
    severity: m[1], type: 'Share', rule: '', matchedString: '',
    path: m[2], altPath: '', size: '', sizeBytes: 0,
    modified: '', access: m[3], context: (m[4] || '').trim(),
    server: extractServer(m[2]), ext: '', timestamp,
  })
}

function parsePlainDirResult(str: string, timestamp: Date | null, findings: Finding[]) {
  const m = str.match(/^\{(\w+)\}\(([^)]*)\)$/)
  if (!m) return
  findings.push({
    severity: m[1], type: 'Dir', rule: '', matchedString: '',
    path: m[2], altPath: '', size: '', sizeBytes: 0,
    modified: '', access: '', context: '',
    server: extractServer(m[2]), ext: '', timestamp,
  })
}

// TSV FORMAT PARSER

function parseTSVLine(
  line: string,
  findings: Finding[],
  infoLines: InfoLine[],
  scanMeta: ScanMeta,
) {
  const parts = line.split('\t')
  if (parts.length < 2) return

  let timestamp: Date | null = null
  let typeIdx = -1

  for (let i = 0; i < Math.min(parts.length, 5); i++) {
    const p = parts[i].trim()
    const hostM = p.match(/^\[([^\]]*\\[^\]]*@[^\]]*)\]$/)
    if (hostM) { extractHostInfo(hostM[1], scanMeta); continue }
    const tsM = p.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}Z?)$/)
    if (tsM) { timestamp = parseTimestamp(tsM[1], scanMeta); continue }
    const typeM = p.match(/^\[(\w+)\]$/)
    if (typeM) { typeIdx = i; break }
  }

  if (typeIdx === -1) return

  const msgType = parts[typeIdx].trim().replace(/[\[\]]/g, '')
  const payload = parts.slice(typeIdx + 1)

  if (msgType === 'File') parseTSVFileResult(payload, timestamp, findings)
  else if (msgType === 'Share') parseTSVShareResult(payload, timestamp, findings)
  else if (msgType === 'Dir') parseTSVDirResult(payload, timestamp, findings)
  else infoLines.push({ type: msgType, message: payload.join('\t'), timestamp })
}

function parseTSVFileResult(p: string[], timestamp: Date | null, findings: Finding[]) {
  if (p.length < 7) return
  const triage = p[0] || 'Green'
  const rule = p[1] || ''
  const access = (p[2] || '') + (p[3] || '') + (p[4] || '')
  const matchedString = p[5] || ''
  const fileSize = p[6] || ''
  const modified = p[7] || ''
  const filePath = p[8] || ''
  const altPath = p[9] || ''
  const context = p.length > 10 ? p.slice(10).join('\t') : ''

  findings.push({
    severity: triage, type: 'File', rule, matchedString,
    path: filePath, altPath, size: fileSize, sizeBytes: parseSizeToBytes(fileSize),
    modified, access, context, server: extractServer(filePath), ext: extractExt(filePath), timestamp,
  })
}

function parseTSVShareResult(p: string[], timestamp: Date | null, findings: Finding[]) {
  if (p.length < 2) return
  findings.push({
    severity: p[0] || 'Green', type: 'Share', rule: '', matchedString: '',
    path: p[1] || '', altPath: '', size: '', sizeBytes: 0,
    modified: '', access: p[2] || '', context: '',
    server: extractServer(p[1] || ''), ext: '', timestamp,
  })
}

function parseTSVDirResult(p: string[], timestamp: Date | null, findings: Finding[]) {
  if (p.length < 2) return
  findings.push({
    severity: p[0] || 'Green', type: 'Dir', rule: '', matchedString: '',
    path: p[1] || '', altPath: '', size: '', sizeBytes: 0,
    modified: '', access: '', context: '',
    server: extractServer(p[1] || ''), ext: '', timestamp,
  })
}

// HELPERS

function extractServer(path: string): string {
  const m = path.match(/^\\\\([^\\]+)/)
  return m ? m[1].toUpperCase() : ''
}

function extractExt(path: string): string {
  const m = path.match(/\.([a-zA-Z0-9]{1,10})$/)
  return m ? m[1].toLowerCase() : ''
}

function parseSizeToBytes(s: string): number {
  if (!s) return 0
  s = s.trim()
  const m = s.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i)
  if (!m) return parseInt(s) || 0
  const n = parseFloat(m[1])
  const u = (m[2] || 'B').toUpperCase()
  const mult: Record<string, number> = { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 }
  return Math.round(n * (mult[u] || 1))
}
