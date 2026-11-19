import type { LevelName, LevelOrSilent } from './level'

import type { PrintBannerOptions } from '../utils/banner'
import type { ConsoleTransportOptions } from '../utils/console'

export type Meta = Record<string, unknown>

export interface SerializedError {
  name: string
  message: string
  stack?: string
  cause?: unknown
  [key: string]: unknown
}

export interface LogRecord {
  level: LevelName
  severity: number
  message: string
  timestamp: Date
  context?: string
  meta: Meta
  error?: SerializedError
}

export type Processor = (record: LogRecord) => LogRecord | null

export type Formatter = (record: LogRecord) => string

export interface Transport {
  readonly name: string
  readonly kind?: string
  level?: LevelOrSilent
  log(record: LogRecord): void | Promise<void>
  write?(text: string): void
  flush?(): Promise<void>
  close?(): Promise<void>
}

export type ErrorHandler = (error: unknown, source: string, record?: LogRecord) => void

export interface RedactOptions {
  keys?: readonly (string | RegExp)[]
  patterns?: readonly RegExp[]
  censor?: string
  maxDepth?: number
}

export interface LoggerOptions {
  banner?: Omit<PrintBannerOptions, 'print'> | boolean
  level?: LevelOrSilent
  context?: string
  meta?: Meta
  console?: ConsoleTransportOptions | false
  transports?: Transport[]
  processors?: Processor[]
  redact?: RedactOptions | false
  onError?: ErrorHandler
}

export interface ChildOptions {
  context?: string
  meta?: Meta
  level?: LevelOrSilent
}

export type LogInput = string | Error

export interface Shared {
  readonly transports: readonly Transport[]
  readonly pipeline: readonly Processor[]
  readonly onError: ErrorHandler
  readonly pending: Set<Promise<void>>
  closed: boolean
}
