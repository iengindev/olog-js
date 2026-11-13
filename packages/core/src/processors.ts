import type { Meta, Processor, LogRecord } from './types/olog'
import { IsPlainObject } from './utils/serialize'

const RedactDeep = (val: unknown, keys: Set<string>, censor: string, seen: WeakSet<object>): unknown => {
  if (typeof val !== 'object' || val === null || seen.has(val)) {
    return val
  }

  seen.add(val)

  if (Array.isArray(val)) {
    return val.map((v) => RedactDeep(v, keys, censor, seen))
  }

  if (!IsPlainObject(val)) {
    return val
  }

  const out: Meta = {}
  
  for (const [key, v] of Object.entries(val)) {
    out[key] = keys.has(key.toLowerCase()) ? censor : RedactDeep(v, keys, censor, seen)
  }

  return out
}

export const Processors = {
  redact: (keys: string[], opts: { censor?: string; patterns?: RegExp[] } = {}): Processor => {
    const censor = opts.censor ?? '***'
    const set = new Set(keys.map((k) => k.toLowerCase()))

    const patterns = [
      ...keys.map((k) => new RegExp(`(${k}\\s*[:=]\\s*)\\S+`, 'gi')),
      ...(opts.patterns ?? []),
    ]

    return (r) => ({
      ...r,
      message: typeof r.message === 'string' ? patterns.reduce((msg, re) => msg.replace(re, (_m, prefix?: string) => typeof prefix === 'string' ? prefix + censor : censor), r.message) : r.message,
      meta: RedactDeep(r.meta, set, censor, new WeakSet()) as Meta
    })
  },

  filter: (predicate: (r: LogRecord) => boolean): Processor => {
    return (r) => (predicate(r) ? r : null)
  },

  addMeta: (source: Meta | ((r: LogRecord) => Meta)): Processor => {
    return (r) => ({
      ...r,
      meta: {
        ...(typeof source === 'function' ? source(r) : source),
        ...r.meta
      }
    })
  }
}
