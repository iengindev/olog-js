import { LevelNames } from './level'
import { SafeStringify } from './serialize'

import type { Formatter, LogRecord, SerializedError } from '../types/logger'
import type { LevelName } from '../types/level'
import type { JsonFormatOptions, PrettyFormatOptions } from '../types/format'

export const Json = (options: JsonFormatOptions = {}): Formatter => (record) => SafeStringify({
  timestamp: record.timestamp.toISOString(),
  level: record.level,
  context: record.context,
  message: record.message,
  ...(Object.keys(record.meta).length > 0 ? { meta: record.meta } : {}),
  error: record.error,
}, options.space)

const Ansi: Record<LevelName, string> = {
  fatal: '\x1b[41;37m',
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[32m',
  http: '\x1b[35m',
  verbose: '\x1b[36m',
  debug: '\x1b[34m',
  trace: '\x1b[90m',
}

const Dim = '\x1b[2m'
const Reset = '\x1b[0m'
const LevelWidth = Math.max(...LevelNames.map((name) => name.length))

const IsSerializedError = (val: unknown): val is SerializedError => typeof val === 'object' && val !== null && 'name' in val && 'message' in val

const ErrorText = (error: SerializedError): string => {
  const Lines: string[] = []

  let current: unknown = error

  while (IsSerializedError(current)) {
    Lines.push(current.stack ?? `${current.name}: ${current.message}`)
    current = current.cause
  }

  return Lines.join('\nCaused by: ')
}

export const Pretty = (options: PrettyFormatOptions = {}): Formatter => {
  const UseColors = options.colors ?? false
  const Paint = (code: string, text: string): string => (UseColors ? `${code}${text}${Reset}` : text)

  return (record: LogRecord) => {
    const Parts = [
      Paint(Dim, record.timestamp.toISOString()),
      Paint(Ansi[record.level], record.level.toUpperCase().padEnd(LevelWidth)),
    ]

    if (record.context !== undefined) {
      Parts.push(Paint(Dim, `[${record.context}]`))
    }

    Parts.push(record.message)

    if (Object.keys(record.meta).length > 0) {
      Parts.push(Paint(Dim, SafeStringify(record.meta)))
    }

    const Line = Parts.join(' ')

    return record.error === undefined ? Line : `${Line}\n${Paint(Ansi.error, ErrorText(record.error))}`
  }
}
