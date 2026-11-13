import type { LevelName, LevelOrSilent } from '../levels'

export type Meta = Record<string, unknown>

export interface SerializedError {
  name:           string
  message:        string
  stack?:         string
  cause?:         unknown
  [key: string]:  unknown
}

export interface LogRecord {
  level:      LevelName
  severity:   number
  message:    string
  timestamp:  Date
  context?:   string
  meta:       Meta
  error?:     SerializedError
}

export type Processor = (record: LogRecord) => LogRecord | null
export type Formatter = (record: LogRecord) => string

export interface Transport {
  readonly name:            string
  level?:                   LevelOrSilent
  log(record: LogRecord):   void | Promise<void>
  flush?():                 Promise<void>
  close?():                 Promise<void>
}

export type ErrorHandler = (error: unknown, source: string, record: LogRecord) => void

export interface LoggerOptions {
  level?:       LevelOrSilent
  context?:     string
  meta?:        Meta
  transports?:  Transport[]
  processors?:  Processor[]
  onError?:     ErrorHandler
}
