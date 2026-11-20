import { Inject, Injectable, Optional, Scope } from '@nestjs/common'
import { INQUIRER } from '@nestjs/core'

import { OlogRootToken } from './modules/tokens'

import type { ChildOptions, LevelName, LogInput, Logger, Meta } from '@olog-js/core'

@Injectable({ scope: Scope.TRANSIENT })
export class OlogLogger {
  readonly logger: Logger

  constructor(@Inject(OlogRootToken) root: Logger, @Optional() @Inject(INQUIRER) parent?: object) {
    const Name = parent?.constructor.name

    this.logger = Name === undefined || Name === 'Object' ? root : root.child({ context: Name })
  }

  fatal(input: LogInput, meta?: Meta): void {
    this.logger.fatal(input, meta)
  }

  error(input: LogInput, meta?: Meta): void {
    this.logger.error(input, meta)
  }

  warn(input: LogInput, meta?: Meta): void {
    this.logger.warn(input, meta)
  }

  info(input: LogInput, meta?: Meta): void {
    this.logger.info(input, meta)
  }

  http(input: LogInput, meta?: Meta): void {
    this.logger.http(input, meta)
  }

  verbose(input: LogInput, meta?: Meta): void {
    this.logger.verbose(input, meta)
  }

  debug(input: LogInput, meta?: Meta): void {
    this.logger.debug(input, meta)
  }

  trace(input: LogInput, meta?: Meta): void {
    this.logger.trace(input, meta)
  }

  log(level: LevelName, input: LogInput, meta?: Meta): void {
    this.logger.log(level, input, meta)
  }

  isLevelEnabled(level: LevelName): boolean {
    return this.logger.isLevelEnabled(level)
  }

  child(options: ChildOptions): Logger {
    return this.logger.child(options)
  }
}
