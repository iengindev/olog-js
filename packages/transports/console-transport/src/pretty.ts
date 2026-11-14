import { SafeStringify, type Formatter, type LogRecord, type Meta, type SerializedError } from '@olog-js/core'
import { CreateStyler, type Styler } from './ansi'
import { LEVEL_STYLES, VALUE_COLORS, ContextColor } from './theme'

export type TimestampFormat = 'time' | 'datetime' | 'iso' | false | ((date: Date) => string)

export interface PrettyOptions {
  colors?:      boolean
  timestamp?:   TimestampFormat
  icons?:       boolean
  meta?:        'inline' | 'tree' | 'json' | false
  stack?:       'short' | 'full' | false
}

const Pad = (n: number, width = 2): string => String(n).padStart(width, '0')

const FormatTime = (date: Date, format: TimestampFormat): string => {
  if (format === false) {
    return ''
  }

  if (typeof format === 'function') {
    return format(date)
  }

  if (format === 'iso') {
    return date.toISOString()
  }

  const time = [Pad(date.getHours()), ':', Pad(date.getMinutes()), ':', Pad(date.getSeconds()), '.', Pad(date.getMilliseconds(), 3)].join('')

  if (format === 'time') {
    return time
  }

  return [date.getFullYear(), '-', Pad(date.getMonth() + 1), '-', Pad(date.getDate()), ' ', time].join('')
}

const FormatValue = (value: unknown, s: Styler): string => {
  if (value === null || value === undefined) {
    return s.fg(VALUE_COLORS.nullish)(String(value))
  }

  switch (typeof value) {
    case 'string':
      return s.fg(VALUE_COLORS.string)(value === '' || /\s/.test(value) ? JSON.stringify(value) : value)
    case 'number':
    case 'bigint':
      return s.fg(VALUE_COLORS.number)(String(value))
    case 'boolean':
      return s.fg(VALUE_COLORS.boolean)(String(value))
    default:
      return s.dim(SafeStringify(value))
  }
}

interface FormattedMeta {
  inline:   string
  block:    string[]
}

const FormatMeta = (meta: Meta, mode: PrettyOptions['meta'], s: Styler): FormattedMeta => {
  const entries = Object.entries(meta)

  if (mode === false || entries.length === 0) {
    return {
      inline: '',
      block: [],
    }
  }

  if (mode === 'json') {
    return {
      inline: s.dim(SafeStringify(meta)),
      block: [],
    }
  }

  if (mode === 'tree') {
    const block = entries.map(([key, value], i) => {
      return `${s.dim(i === entries.length - 1 ? '└─' : '├─')} ${s.fg(VALUE_COLORS.key)(key)}: ${FormatValue(value, s)}`
    })

    return {
      inline: '',
      block: block,
    }
  }

  return {
    inline: entries.map(([key, value]) => `${s.fg(VALUE_COLORS.key)(key)}=${FormatValue(value, s)}`).join(' '),
    block: [],
  }
}

const IsSerializedError = (v: unknown): v is SerializedError => typeof v === 'object' && v !== null && 'name' in v && 'message' in v
const IsInternalFrame = (frame: string): boolean => frame.includes('node_modules') || frame.includes('node:internal') || frame.includes('(internal/')

const HighlightFrame = (frame: string, s: Styler): string => {
  return frame.replace(/([^\s()]+):(\d+):(\d+)/, (_m, file: string, line: string, col: string) => [s.fg(VALUE_COLORS.file)(file), ':', s.fg(VALUE_COLORS.number)(line), ':', s.dim(col)].join(''))
}

const FormatError = (error: SerializedError, mode: 'short' | 'full', s: Styler, color: number, depth = 0): string[] => {
  const code = error['code']
  const title = [error.name, code !== undefined ? ['[', String(code), ']: '].join('') : ': ', error.message].join('')
  const lines = [s.bold(s.fg(color)(title))]
  const frames = (error.stack ?? '').split('\n').slice(1).map((line) => line.trim()).filter((line) => line.startsWith('at ') || line.includes('@'))

  let hidden = 0

  for (const frame of frames) {
    const internal = IsInternalFrame(frame)

    if (mode === 'short' && internal) {
      hidden++

      continue
    }

    lines.push(`  ${internal ? s.dim(frame) : HighlightFrame(frame, s)}`)
  }

  if (hidden > 0) {
    lines.push(s.dim(['  …', hidden, 'internal frames hidden'].join(' ')))
  }

  if (depth < 5 && IsSerializedError(error.cause)) {
    lines.push(s.dim('↳ Caused by:'))
    lines.push(...FormatError(error.cause, mode, s, color, depth + 1).map((l) => `  ${l}`))
  }

  return lines
}

export function CreatePrettyFormatter(options: PrettyOptions = {}): Formatter {
  const s = CreateStyler(options.colors ?? false)
  const timestampFormat = options.timestamp ?? 'time'
  const showIcons = options.icons ?? true
  const metaMode = options.meta ?? 'inline'
  const stackMode = options.stack ?? 'short'

  return (record: LogRecord): string => {
    const style = LEVEL_STYLES[record.level]
    const paint = s.fg(style.color)
    const isProblem = record.level === 'error' || record.level === 'fatal'
    const head: string[] = []
    const time = FormatTime(record.timestamp, timestampFormat)

    if (time) {
      head.push(s.dim(time))
    }

    const levelText = [showIcons ? style.icon : '', record.level.toUpperCase().padEnd(7)].join('')

    head.push(style.badge ? s.bold(s.bg(style.color)(s.fg(231)(levelText))) : paint(levelText))

    if (record.context) {
      head.push(s.fg(ContextColor(record.context))(['[', record.context, ']'].join('')))
    }

    head.push(isProblem ? paint(record.message) : record.message)

    const meta = FormatMeta(record.meta, metaMode, s)

    if (meta.inline) {
      head.push(meta.inline)
    }

    const indent = time ? ' '.repeat(time.length + 1) : ''
    const lines = [head.join(' ')]

    lines.push(...meta.block.map((l) => indent + l))

    if (record.error) {
      const errorLines = !stackMode ? [paint([record.error.name, ': ', record.error.message].join(''))] : FormatError(record.error, stackMode, s, style.color)

      lines.push(...errorLines.map((l) => indent + l))
    }

    return lines.join('\n')
  }
}
