import { BaseTransport, type BaseTransportOptions, type LevelName, type LogRecord } from '@olog-js/core'
import { PrintBanner, SupportsColor, type BannerOptions } from '@olog-js/banner'

import { CreatePrettyFormatter, type PrettyOptions } from './pretty'
import { LEVEL_STYLES } from './theme'

interface WritableLike {
  write(chunk: string): unknown
}

type ConsoleGlobal = {
  document?:  unknown
  process?: {
    stdout?:  WritableLike
    stderr?:  WritableLike
  }
}

const G = globalThis as unknown as ConsoleGlobal

export interface ConsoleTransportOptions extends BaseTransportOptions, PrettyOptions {
  mode?:          'auto' | 'terminal' | 'browser'
  stderrLevels?:  LevelName[]
  banner?:        boolean | BannerOptions
}

type ConsoleMethod = 'error' | 'warn' | 'info' | 'debug'

const CONSOLE_METHODS: Record<LevelName, ConsoleMethod> = {
  fatal: 'error',
  error: 'error',
  warn: 'warn',
  info: 'info',
  http: 'info',
  verbose: 'debug',
  debug: 'debug',
  trace: 'debug',
}

export class ConsoleTransport extends BaseTransport {
  private readonly browser: boolean
  private readonly structured: boolean
  private readonly stderrLevels: ReadonlySet<LevelName>

  constructor(options: ConsoleTransportOptions = {}) {
    const mode = options.mode ?? 'auto'
    const browser = mode === 'browser' || (mode === 'auto' && G.document !== undefined)
    const colors = options.colors ?? (!browser && SupportsColor())

    super({
      name: 'console',
      ...options
    }, CreatePrettyFormatter({
      ...options,
      colors
    }))

    this.browser = browser
    this.structured = browser && !options.format
    this.stderrLevels = new Set(options.stderrLevels ?? ['fatal', 'error', 'warn'])

    if (options.banner) {
      const bannerOptions = options.banner === true ? {} : options.banner

      PrintBanner({
        ...bannerOptions,
        color: colors,
        print: (text) => this.writeLine('info', text),
      })
    }
  }

  private writeLine(level: LevelName, line: string): void {
    const stream = this.stderrLevels.has(level) ? G.process?.stderr : G.process?.stdout

    if (stream && !this.browser) {
      stream.write([line, '\n'].join(''))
    } else {
      console[CONSOLE_METHODS[level]](line)
    }
  }

  private writeBrowser(record: LogRecord): void {
    const style = LEVEL_STYLES[record.level]
    const styles: string[] = [
      ['background:', style.css, ';color:#fff;border-radius:3px;padding:0 4px;font-weight:600'].join(''),
      '',
    ]

    let template = ['%c', record.level.toUpperCase(), '%c'].join('')

    if (record.context) {
      template += [' %c[', record.context, ']%c'].join('')

      styles.push('color:#888', '')
    }

    template += [' ', record.message.replaceAll('%', '%%')].join('')

    const extras: unknown[] = []

    if (Object.keys(record.meta).length > 0) {
      extras.push(record.meta)
    }

    if (record.error) {
      extras.push(record.error)
    }

    console[CONSOLE_METHODS[record.level]](template, ...styles, ...extras)
  }

  protected write(record: LogRecord, line: string): void {
    this.writeLine(record.level, line)
  }

  override log(record: LogRecord): void {
    if (this.filter && !this.filter(record)) {
      return
    }

    if (this.structured) {
      this.writeBrowser(record)
    } else {
      this.writeLine(record.level, this.format(record))
    }
  }
}
