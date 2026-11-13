import type { Meta, SerializedError } from '../types/olog'

export const IsError = (v: unknown): v is Error => v instanceof Error || (typeof v === 'object' && v !== null && 'message' in v && 'stack' in v)

export const IsPlainObject = (v: unknown): v is Meta => {
  if (typeof v !== 'object' || v === null) {
    return false
  }

  return Object.getPrototypeOf(v)
}

export const SerializeError = (err: Error, seen = new WeakSet<object>()): SerializedError  => {
  seen.add(err)

  const out: SerializedError = {
    name: err.name,
    message: err.message,
  }

  if (err.stack) {
    out.stack = err.stack
  }

  for (const key of Object.keys(err)) {
    if (!(key in out)) {
      out[key] = (err as unknown as Meta)[key]
    }
  }

  const cause = (err as { cause?: unknown }).cause

  if (cause !== undefined) {
    out.cause = IsError(cause) && !seen.has(cause) ? SerializeError(cause, seen) : cause
  }

  return out
}

export const SafeStringify = (value: unknown, space?: number): string => {
  const seen = new WeakSet<object>()

  return JSON.stringify(value, (_key, val: unknown) => {
    if (typeof val === 'bigint') {
      return [val, 'n'].join('')
    }

    if (typeof val === 'function') {
      return ['[Function]:', val || 'anonymous'].join(' ')
    }

    if (typeof val === 'symbol') {
      return val.toString()
    }

    if (IsError(val)) {
      return SerializeError(val)
    }

    if (val instanceof Map) {
      return Object.fromEntries(val)
    }

    if (val instanceof Set) {
      return [...val]
    }

    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) {
        return '[Circular]'
      }

      seen.add(val)
    }

    return val
  }, space)
}
