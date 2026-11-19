import { Pretty } from '../modules/format'

import type { LevelName, LevelOrSilent } from '../types/level'
import type { Formatter, LogRecord, Transport } from '../types/logger'

export interface ConsoleTransportOptions {
  name?: string
  level?: LevelOrSilent
  format?: Formatter
}

const Methods: Record<LevelName, 'error' | 'warn' | 'info' | 'log' | 'debug'> = {
  fatal: 'error',
  error: 'error',
  warn: 'warn',
  info: 'info',
  http: 'log',
  verbose: 'log',
  debug: 'debug',
  trace: 'debug',
}

export class ConsoleTransport implements Transport {
  private readonly console: Console = console

  readonly name: string
  readonly kind = 'console'

  level?: LevelOrSilent
  readonly format: Formatter

  constructor(options: ConsoleTransportOptions = {}) {
    this.name = options.name ?? 'console'
    this.format = options.format ?? Pretty()

    if (options.level !== undefined) {
      this.level = options.level
    }
  }

  log(record: LogRecord): void | Promise<void> {
    this.console[Methods[record.level]](this.format(record))
  }

  write(text: string): void {
    if (this.level === 'silent') {
      return
    }

    this.console.log(text)
  }
}
