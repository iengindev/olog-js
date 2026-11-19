import type { LogRecord, Meta, Processor } from '../types/logger'

export const Filter = (predicate: (record: LogRecord) => boolean): Processor => (record) => (predicate(record) ? record : null)
export const Enrich = (fields: (record: LogRecord) => Meta): Processor => (record) => ({
  ...record,
  meta: {
    ...record.meta,
    ...fields(record),
  },
})
