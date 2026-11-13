import type { Formatter } from './types/olog'
import { SafeStringify } from './utils/serialize'

export const Format = {
  json: (opts: { space?: number } = {}): Formatter => (r) => {
    return SafeStringify({
      timestamp: r.timestamp.toISOString(),
      level: r.level,
      context: r.context,
      message: r.message,
      ...r.meta,
      error: r.error,
    }, opts.space)
  },

  simple: (): Formatter => (r) => {
    let line = [r.timestamp.toISOString(), r.level.toUpperCase().padEnd(7)].join(' ')

    if (r.context) {
      line += ['[', r.context, ']', ' '].join('')
    }

    line += r.message

    if (Object.keys(r.meta).length) {
      line += [' ', SafeStringify(r.meta)].join('')
    }

    if (r.error?.stack) {
      line += ['\n', r.error.stack].join('')
    }

    return line
  },
}
