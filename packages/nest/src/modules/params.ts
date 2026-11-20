import { Levels, SafeStringify } from '@olog-js/core'

import type { LogLevel } from '@nestjs/common'
import type { LevelName, LevelOrSilent, LogInput, Meta } from '@olog-js/core'

import type { SplitParams } from '../types/params'

const IsStack = (val: unknown): val is string => typeof val === 'string' && /\n\s+at /.test(val)

export const SplitContext = (params: readonly unknown[]): SplitParams => {
  const Last = params.at(-1)

  if (typeof Last === 'string' && !IsStack(Last)) {
    return {
      context: Last,
      rest: params.slice(0, -1),
    }
  }

  return {
    context: undefined,
    rest: [...params],
  }
}

export const ToInput = (message: unknown): LogInput => {
  if (typeof message === 'string' || message instanceof Error) {
    return message
  }

  return SafeStringify(message)
}

export const BuildMeta = (input: LogInput, rest: readonly unknown[]): Meta | undefined => {
  const [First, ...Extra] = rest

  if (typeof input === 'string' && IsStack(First)) {
    const Restored = new Error(input)

    Restored.stack = First

    return Extra.length > 0 ? {
      error: Restored,
      params: Extra,
    } : {
      error: Restored,
    }
  }

  return rest.length > 0 ? {
    params: [...rest],
  } : undefined
}

const NestLevels: Record<LogLevel, LevelName> = {
  fatal: 'fatal',
  error: 'error',
  warn: 'warn',
  log: 'info',
  debug: 'debug',
  verbose: 'verbose',
}

export const ToLevel = (levels: readonly LogLevel[]): LevelOrSilent => levels.reduce<LevelOrSilent>((cur, l) => {
  const Mapped = NestLevels[l]

  return cur === 'silent' || Levels[Mapped] > Levels[cur] ? Mapped : cur
}, 'silent')
