import { SerializeError } from './error'

const MaxDepth = 20

const HasToJson = (val: object): val is { toJSON: () => unknown, } => typeof (val as { toJSON?: unknown, }).toJSON === 'function'

const SerializePrimitive = (val: unknown): unknown => {
  if (typeof val === 'bigint' || typeof val === 'symbol') {
    return val.toString()
  }

  if (typeof val === 'function') {
    return `[Function ${val.name !== '' ? val.name : 'anonymous'}]`
  }

  return val
}

const SerializeObject = (val: object, ancestors: object[]): unknown => {
  if (val instanceof Error) {
    return ToJsonSafe(SerializeError(val), ancestors)
  }

  if (Array.isArray(val)) {
    return val.map((item) => ToJsonSafe(item, ancestors) ?? null)
  }

  if (val instanceof Map) {
    return Object.fromEntries([...(val as Map<unknown, unknown>)].map(([key, item]) => [String(key), ToJsonSafe(item, ancestors)]))
  }

  if (val instanceof Set) {
    return [...(val as Set<unknown>)].map((item) => ToJsonSafe(item, ancestors))
  }

  if (HasToJson(val)) {
    return ToJsonSafe(val.toJSON(), ancestors)
  }

  const Out: Record<string, unknown> = {}

  for (const [Key, Item] of Object.entries(val as Record<string, unknown>)) {
    Out[Key] = ToJsonSafe(Item, ancestors)
  }

  return Out
}

const ToJsonSafe = (val: unknown, ancestors: object[]): unknown => {
  if (val === null || typeof val !== 'object') {
    return SerializePrimitive(val)
  }

  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? 'Invalid Date' : val.toISOString()
  }

  if (ancestors.includes(val)) {
    return '[Circular]'
  }

  if (ancestors.length >= MaxDepth) {
    return '[MaxDepth]'
  }

  ancestors.push(val)

  try {
    return SerializeObject(val, ancestors)
  } finally {
    ancestors.pop()
  }
}

export const ToSerializable = (val: unknown): unknown => ToJsonSafe(val, [])

export const SafeStringify = (val: unknown, space?: number): string => {
  try {
    return JSON.stringify(ToJsonSafe(val, []), null, space)
  } catch (err) {
    return JSON.stringify(`[Unserializable: ${err instanceof Error ? err.message : 'unknown'}]`)
  }
}
