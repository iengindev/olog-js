import { SerializeError } from './error'

import type { LogRecord, Meta, Processor, RedactOptions, SerializedError } from '../types/logger'

export const DefaultRedactKeys: readonly (string | RegExp)[] = [
  /pass(word|wd)?$/i,
  /secret/i,
  /token/i,
  /api[-_]?key/i,
  /authorization/i,
  /cookie/i,
  /private[-_]?key/i,
  /credential/i,
  /session[-_]?id/i,
]

export const DefaultRedactPatterns: readonly RegExp[] = [
  /\bBearer\s+[\w\-.~+/]+=*/gi,
]

const DefaultCensor = '[REDACTED]'
const DefaultMaxDepth = 10

export const CreateRedactor = (options: RedactOptions = {}): Processor => {
  const Keys = options.keys ?? DefaultRedactKeys
  const Patterns = options.patterns ?? DefaultRedactPatterns
  const Censor = options.censor ?? DefaultCensor
  const MaxDepth = options.maxDepth ?? DefaultMaxDepth

  const ExactKeys = new Set(Keys.filter((key) => typeof key === 'string').map((key) => key.toLowerCase()))
  const KeyPatterns = Keys.filter((key) => key instanceof RegExp)

  const IsSecretKey = (key: string): boolean => ExactKeys.has(key.toLowerCase()) || KeyPatterns.some((re) => {
    re.lastIndex = 0

    return re.test(key)
  })

  const Scrub = (text: string): string => Patterns.reduce((acc, re) => acc.replace(re, Censor), text)

  const WalkObject = (val: object, ancestors: object[]): unknown => {
    if (val instanceof Error) {
      return Walk(SerializeError(val), ancestors)
    }

    if (Array.isArray(val)) {
      return val.map((item) => Walk(item, ancestors))
    }

    if (val instanceof Map) {
      return new Map([...(val as Map<unknown, unknown>)].map(([key, item]) => [key, typeof key === 'string' && IsSecretKey(key) ? Censor : Walk(item, ancestors)]))
    }

    if (val instanceof Set) {
      return new Set([...(val as Set<unknown>)].map((item) => Walk(item, ancestors)))
    }

    const Out: Record<string, unknown> = {}

    for (const [Key, Item] of Object.entries(val as Record<string, unknown>)) {
      Out[Key] = IsSecretKey(Key) ? Censor : Walk(Item, ancestors)
    }

    return Out
  }

  const Walk = (val: unknown, ancestors: object[]): unknown => {
    if (typeof val === 'string') {
      return Scrub(val)
    }

    if (val === null || typeof val !== 'object' || val instanceof Date) {
      return val
    }

    if (ancestors.includes(val)) {
      return '[Circular]'
    }

    if (ancestors.length > MaxDepth) {
      return '[MaxDepth]'
    }

    ancestors.push(val)

    try {
      return WalkObject(val, ancestors)
    } finally {
      ancestors.pop()
    }
  }

  return (record: LogRecord): LogRecord => {
    const Out: LogRecord = {
      ...record,
      message: Scrub(record.message),
      meta: Walk(record.meta, []) as Meta,
    }

    if (record.error !== undefined) {
      Out.error = Walk(record.error, []) as SerializedError
    }

    return Out
  }
}
