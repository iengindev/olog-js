import { Levels, IsLevelEnabled, type LevelName, type LevelOrSilent } from './levels'
import type { ErrorHandler, LogRecord, LoggerOptions, Meta, Processor, Transport } from './types/olog'
import { IsError, SafeStringify, SerializeError } from './utils/serialize'

export type LogArg = string | number | boolean | Error | Meta | null | undefined
export type LogArgs = LogArg[]

export interface SharedState {
  level:        LevelOrSilent
  transports:   Transport[]
  processors:   Processor[]
  pending:      Set<Promise<unknown>>
  onError:      ErrorHandler
}

const DefaultOnError: ErrorHandler = (error, source) => {
  console.error(['[olog]', source, 'failed:', error].join(' '))
}

export class Logger {
  readonly context: string | undefined
  readonly meta: Meta
  private readonly state: SharedState

  constructor(options: LoggerOptions = {}, state?: SharedState) {
    this.context = options.context
    this.meta = options.meta ?? {}
    this.state = state ?? {
      level: options.level ?? 'info',
      transports: [...(options.transports ?? [])],
      processors: [...(options.processors ?? [])],
      pending: new Set(),
      onError: options.onError ?? DefaultOnError,
    }
  }

  isLevelEnabled(level: LevelName): boolean {
    return IsLevelEnabled(level, this.state.level)
  }

  private createRecord(level: LevelName, args: LogArgs): LogRecord {
    const parts: string[] = []
    const meta: Meta = { ...this.meta }

    let error: Error | undefined

    for (const arg of args) {
      if (arg === null || arg === undefined) {
        continue
      }

      if (typeof arg === 'string') {
        parts.push(arg)
      } else if (IsError(arg)) {
        error ??= arg
      } else if (typeof arg === 'object' && !Array.isArray(arg)) {
        Object.assign(meta, arg)
      } else {
        parts.push(typeof arg === 'object' ? SafeStringify(arg) : String(arg))
      }
    }

    if (!error && IsError(meta.error)) {
      error = meta.error

      delete meta.error
    }

    const record: LogRecord = {
      level: level,
      severity: Levels[level],
      message: parts.join(' ') || error?.message || '',
      timestamp: new Date(),
      context: this.context,
      meta: meta
    }

    if (error) {
      record.error = SerializeError(error)
    }

    return record
  }

  private track(promise: Promise<unknown>, transport: Transport, record: LogRecord): void {
    const { pending, onError } = this.state

    const tracked: Promise<unknown> = promise
      .catch((err) => onError(err, ['transport: ', transport.name].join(''), record))
      .finally(() => pending.delete(tracked))

    pending.add(tracked)
  }

  private dispatch(record: LogRecord): void {
    for (const transport of this.state.transports) {
      if (transport.level && !IsLevelEnabled(record.level, transport.level)) {
        continue
      }

      try {
        const result = transport.log(record)

        if (result instanceof Promise) {
          this.track(result, transport, record)
        }
      } catch(err) {
        this.state.onError(err, ['transport: ', transport.name].join(''), record)
      }
    }
  }

  log(level: LevelName, ...args: LogArgs): void {
    if (!this.isLevelEnabled(level)) {
      return
    }

    let record: LogRecord = this.createRecord(level, args)

    for (const processor of this.state.processors) {
      let next: LogRecord | null

      try {
        next = processor(record)
      } catch (err) {
        this.state.onError(err, 'processor', record)
        return
      }

      if (!next) {
        return
      }

      record = next
    }

    this.dispatch(record)
  }

  fatal(...args: LogArgs): void {
    this.log('fatal', ...args)
  }

  error(...args: LogArgs): void {
    this.log('error', ...args)
  }

  warn(...args: LogArgs): void {
    this.log('warn', ...args)
  }

  info(...args: LogArgs): void {
    this.log('info', ...args)
  }

  http(...args: LogArgs): void {
    this.log('http', ...args)
  }

  verbose(...args: LogArgs): void {
    this.log('verbose', ...args)
  }

  debug(...args: LogArgs): void {
    this.log('debug', ...args)
  }

  trace(...args: LogArgs): void {
    this.log('trace', ...args)
  }

  get level(): LevelOrSilent {
    return this.state.level
  }

  set level(level: LevelOrSilent) {
    this.state.level = level
  }

  useTransport(transport: Transport): this {
    this.state.transports.push(transport)

    return this
  }

  removeTransport(transport: Transport | string): this {
    this.state.transports = this.state.transports.filter((t) => t !== transport && t.name !== transport)

    return this
  }

  useProcessor(processor: Processor): this {
    this.state.processors.push(processor)

    return this
  }

  child(context: string, meta?: Meta): Logger
  child(options: { context?: string, meta?: Meta }): Logger
  child(arg: string | { context?: string, meta?: Meta }, meta?: Meta): Logger {
    const opts = typeof arg === 'string' ? { context: arg, meta } : arg
    const context = opts.context ?? this.context

    return new Logger({ context, meta: { ...this.meta, ...opts.meta } }, this.state)
  }

  startTimer(label: string, level: LevelName = 'info'): (meta?: Meta) => number {
    const start = performance.now()

    return (meta) => {
      const durationMs = Math.round((performance.now() - start) * 100) / 100

      this.log(level, [label, [' (', durationMs, 'ms)'].join('')].join(''), { ...meta, durationMs })

      return durationMs
    }
  }

  async flush(): Promise<void> {
    await Promise.allSettled([...this.state.pending])
    await Promise.allSettled(this.state.transports.map((t) => t.flush?.()))
  }

  async close(): Promise<void> {
    await this.flush()
    await Promise.allSettled(this.state.transports.map((t) => t.close?.()))
  }
}

export const CreateLogger = (options?: LoggerOptions): Logger => new Logger(options)
