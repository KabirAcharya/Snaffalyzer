export interface Finding {
  severity: string
  type: string
  rule: string
  matchedString: string
  path: string
  altPath: string
  size: string
  sizeBytes: number
  modified: string
  access: string
  context: string
  server: string
  ext: string
  timestamp: Date | null
}

export interface InfoLine {
  type: string
  message: string
  timestamp: Date | null
}

export interface ScanMeta {
  filename: string
  complete: boolean
  hosts: Set<string>
  users: Set<string>
  timestamps: Date[]
  lineCount: number
}

export type SeverityLevel = 'Black' | 'Red' | 'Yellow' | 'Green'

export const SEV_ORDER: Record<string, number> = { Black: 0, Red: 1, Yellow: 2, Green: 3 }

export const SEV_COLORS: Record<string, string> = {
  Black: '#111111',
  Red: '#ef4444',
  Yellow: '#eab308',
  Green: '#22c55e',
}
