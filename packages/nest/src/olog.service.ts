import { Inject, Injectable } from '@nestjs/common'

import { BuildMeta, SplitContext, ToInput, ToLevel } from './modules/params'
import { OlogRootToken } from './modules/tokens'

import type { LoggerService, LogLevel } from '@nestjs/common'
import type { LevelName, Logger } from '@olog-js/core'

@Injectable()
export class OlogService implements LoggerService {
  private readonly $root: Logger
  private readonly $children = new Map<string, Logger>()

  constructor(@Inject(OlogRootToken) root: Logger) {
    this.$root = root
  }

  private $for(context: string | undefined): Logger {
    if (context === undefined) {
      return this.$root
    }

    const Cached = this.$children.get(context)

    if (Cached !== undefined) {
      return Cached
    }

    const Created = this.$root.child({ context })

    this.$children.set(context, Created)

    return Created
  }

  private $write(level: LevelName, message: unknown, params: readonly unknown[]): void {
    const { context, rest } = SplitContext(params)

    const Target = this.$for(context)

    if (!Target.isLevelEnabled(level)) {
      return
    }

    const Input = ToInput(message)

    Target.log(level, Input, BuildMeta(Input, rest))
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.$write('info', message, optionalParams)
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.$write('error', message, optionalParams)
  }

  warn(message: unknown, ...params: unknown[]): void {
    this.$write('warn', message, params)
  }

  debug(message: unknown, ...params: unknown[]): void {
    this.$write('debug', message, params)
  }

  verbose(message: unknown, ...params: unknown[]): void {
    this.$write('verbose', message, params)
  }

  fatal(message: unknown, ...params: unknown[]): void {
    this.$write('fatal', message, params)
  }

  setLogLevels(levels: LogLevel[]): void {
    this.$root.level = ToLevel(levels)
    this.$children.clear()
  }
}
