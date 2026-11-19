import { SerializeError } from './modules/error'
import { AssertLevel, IsLevelEnabled, Levels } from './modules/level'
import { CreateRedactor } from './modules/redact'

import { ConsoleTransport } from './utils/console'

import type { LevelName, LevelOrSilent } from './types/level'
import type { ChildOptions, ErrorHandler, LogInput, LogRecord, LoggerOptions, Meta, Shared } from './types/logger'

const DefaultOnError: ErrorHandler = (error, source) => {
  try {
    console.error(`[olog] ${source} failed:`, error)
  } catch {}
}

export class Logger {
  $level: LevelOrSilent
  $context: string | undefined
  $meta: Meta
  $shared: Shared

  constructor(options: LoggerOptions = {}) {
    this.$level = AssertLevel(options.level ?? 'info', 'LoggerOptions.level')
    this.$context = options.context
    this.$meta = { ...options.meta }

    const Redactor = options.redact === false ? [] : [CreateRedactor(options.redact)]

    this.$shared = {
      transports: [...(options.transports ?? [new ConsoleTransport()])],
      pipeline: [...(options.processors ?? []), ...Redactor],
      onError: options.onError ?? DefaultOnError,
      pending: new Set(),
      closed: false,
    }
  }

  get level(): LevelOrSilent {
    return this.$level
  }

  set level(level: LevelOrSilent) {
    this.$level = AssertLevel(level, 'Logger.level')
  }

  get context(): string | undefined {
    return this.$context
  }

  isLevelEnabled(level: LevelName): boolean {
    return IsLevelEnabled(level, this.$level)
  }

  child(options: ChildOptions = {}): Logger {
    const Child = new Logger({
      level: options.level ?? this.$level,
      transports: [],
      redact: false,
    })

    Child.$context = options.context ?? this.$context
    Child.$meta = { ...this.$meta, ...options.meta }
    Child.$shared = this.$shared

    return Child
  }

  $fail(error: unknown, source: string, record?: LogRecord): void {
    try {
      this.$shared.onError(error, source, record)
    } catch {}
  }

  $process(initial: LogRecord): LogRecord | null {
    let current: LogRecord = initial

    for (const Step of this.$shared.pipeline) {
      let next: LogRecord | null

      try {
        next = Step(current)
      } catch (err) {
        this.$fail(err, 'processor', current)

        return null
      }

      if (next === null) {
        return null
      }

      current = next
    }

    return current
  }

  $build(level: LevelName, input: LogInput, meta?: Meta): LogRecord {
    const Rec: LogRecord = {
      level,
      severity: Levels[level],
      message: typeof input === 'string' ? input : input.message,
      timestamp: new Date(),
      meta: {
        ...this.$meta,
        ...meta,
      },
    }

    if (this.$context !== undefined) {
      Rec.context = this.$context
    }

    const RawError: unknown = typeof input === 'string' ? Rec.meta.error : input

    if (RawError !== undefined) {
      Rec.error = SerializeError(RawError)

      delete Rec.meta.error
    }

    return Rec
  }

  $track(promise: Promise<void>, source: string, record: LogRecord): void {
    const Tracked: Promise<void> = promise.catch((err: unknown) => {
      this.$fail(err, source, record)
    }).finally(() => {
      this.$shared.pending.delete(Tracked)
    })

    this.$shared.pending.add(Tracked)
  }

  async $callTransports(action: 'flush' | 'close'): Promise<void> {
    await Promise.all(this.$shared.transports.map(async (target) => {
      try {
        await target[action]?.()
      } catch (err) {
        this.$fail(err, `transport:${target.name}:${action}`)
      }
    }))
  }

  $dispatch(record: LogRecord): void {
    for (const Target of this.$shared.transports) {
      if (Target.level !== undefined && !IsLevelEnabled(record.level, Target.level)) {
        continue
      }

      try {
        const Result = Target.log(record)

        if (Result instanceof Promise) {
          this.$track(Result, `transport:${Target.name}`, record)
        }
      } catch (err) {
        this.$fail(err, `transport:${Target.name}`, record)
      }
    }
  }

  log(level: LevelName, input: LogInput, meta?: Meta): void {
    if (this.$shared.closed || !IsLevelEnabled(level, this.$level)) {
      return
    }

    const Rec = this.$process(this.$build(level, input, meta))

    if (Rec !== null) {
      this.$dispatch(Rec)
    }
  }

  async flush(): Promise<void> {
    while (this.$shared.pending.size > 0) {
      await Promise.allSettled([...this.$shared.pending])
    }

    await this.$callTransports('flush')
  }

  async close(): Promise<void> {
    if (this.$shared.closed) {
      return
    }

    this.$shared.closed = true

    await this.flush()
    await this.$callTransports('close')
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close()
  }

  fatal(input: LogInput, meta?: Meta): void {
    this.log('fatal', input, meta)
  }

  error(input: LogInput, meta?: Meta): void {
    this.log('error', input, meta)
  }

  warn(input: LogInput, meta?: Meta): void {
    this.log('warn', input, meta)
  }

  info(input: LogInput, meta?: Meta): void {
    this.log('info', input, meta)
  }

  http(input: LogInput, meta?: Meta): void {
    this.log('http', input, meta)
  }

  verbose(input: LogInput, meta?: Meta): void {
    this.log('verbose', input, meta)
  }

  debug(input: LogInput, meta?: Meta): void {
    this.log('debug', input, meta)
  }

  trace(input: LogInput, meta?: Meta): void {
    this.log('trace', input, meta)
  }
}

export { Levels, LevelNames, IsLevelName, IsLevelEnabled } from './modules/level'
export { SerializeError } from './modules/error'
export { SafeStringify, ToSerializable } from './modules/serialize'
export { CreateRedactor, DefaultRedactKeys, DefaultRedactPatterns } from './modules/redact'
export { Filter, Enrich } from './modules/filter'
export { Json, Pretty } from './modules/format'

export { ConsoleTransport } from './utils/console'

export type { ConsoleTransportOptions } from './utils/console'

export type * from './types/level'
export type * from './types/logger'
export type * from './types/format'
