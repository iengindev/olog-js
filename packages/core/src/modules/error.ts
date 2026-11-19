import type { SerializedError } from '../types/logger'

const MaxCauseDepth = 8

const Serialize = (val: unknown, depth: number, seen: WeakSet<object>): SerializedError => {
  if (!(val instanceof Error)) {
    return {
      name: 'NonError',
      message: typeof val === 'string' ? val : 'NonError value thrown',
      value: val,
    }
  }

  if (seen.has(val) || depth > MaxCauseDepth) {
    return {
      name: val.name,
      message: '[Circular]',
    }
  }

  seen.add(val)

  const Out: SerializedError = {
    name: val.name,
    message: val.message,
  }

  if (val.stack !== undefined) {
    Out.stack = val.stack
  }

  for (const [Key, Prop] of Object.entries(val as unknown as Record<string, unknown>)) {
    if (!(Key in Out)) {
      Out[Key] = Prop
    }
  }

  if (val.cause !== undefined) {
    Out.cause = Serialize(val.cause, depth + 1, seen)
  }

  if (val instanceof AggregateError) {
    Out.errors = (val.errors as unknown[]).map((item) => Serialize(item, depth + 1, seen))
  }

  return Out
}

export const SerializeError = (value: unknown): SerializedError => Serialize(value, 0, new WeakSet())
