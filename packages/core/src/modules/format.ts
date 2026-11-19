import { LevelNames } from './level'
import { SafeStringify } from './serialize'

import type { Formatter, LogRecord, SerializedError } from '../types/logger'
import type { LevelName } from '../types/level'
import type { JsonFormatOptions, PrettyFormatOptions } from '../types/format'

import { CreatePalette, type Paint } from '../utils/ansi'
import { SupportsColor } from '../utils/runtime'

const LevelCodes: Record<LevelName, string> = {
  fatal: '41;37',
  error: '31',
  warn: '33',
  info: '32',
  http: '35',
  verbose: '36',
  debug: '34',
  trace: '90',
}

export const Json = (options: JsonFormatOptions = {}): Formatter => (record) => SafeStringify({
  timestamp: record.timestamp.toISOString(),
  level: record.level,
  context: record.context,
  message: record.message,
  ...(Object.keys(record.meta).length > 0 ? { meta: record.meta } : {}),
  error: record.error,
}, options.space)

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
  const Colors = CreatePalette(options.colors ?? SupportsColor())
  const LevelPaint = (level: LevelName): Paint => Colors.code(LevelCodes[level])

  return (record: LogRecord) => {
    const Parts = [
      Colors.dim(record.timestamp.toISOString()),
      LevelPaint(record.level)(record.level.toUpperCase().padEnd(LevelWidth)),
    ]

    if (record.context !== undefined) {
      Parts.push(Colors.dim(`[${record.context}]`))
    }

    Parts.push(record.message)

    if (Object.keys(record.meta).length > 0) {
      Parts.push(Colors.dim(SafeStringify(record.meta)))
    }

    const Line = Parts.join(' ')

    return record.error === undefined ? Line : `${Line}\n${LevelPaint('error')(ErrorText(record.error))}`
  }
}
