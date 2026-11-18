import type { LoggerOptions } from './types/logger'

export class Logger {
  private readonly options: LoggerOptions

  constructor(options: LoggerOptions = {}) {
    this.options = options
  }
}
