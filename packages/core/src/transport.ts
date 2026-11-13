import type { LevelOrSilent } from './levels'
import type { Formatter, LogRecord, Transport } from './types/olog'
import { Format } from './format'

export interface BaseTransportOptions {
  name?: string
  level?: LevelOrSilent
  format?: Formatter
  filter?: (record: LogRecord) => boolean
}

export abstract class BaseTransport implements Transport {
  readonly name: string
  level?: LevelOrSilent | undefined

  protected readonly format: Formatter
  protected readonly filter?: (record: LogRecord) => boolean

  constructor(opts: BaseTransportOptions = {}, defaultFormat: Formatter = Format.simple()) {
    this.name = opts.name ?? new.target.name
    this.level = opts.level
    this.format = opts.format ?? defaultFormat
    this.filter = opts.filter
  }

  log(record: LogRecord): void | Promise<void> {
    if (this.filter && !this.filter(record)) {
      return
    }

    return this.write(record, this.format(record))
  }

  protected abstract write(record: LogRecord, line: string): void | Promise<void>
}

export const CreateTransport = (name: string, log: Transport['log'], opts: Omit<Transport, 'name' | 'log'> = {}): Transport => ({
  name: name,
  log: log,
  ...opts
})
