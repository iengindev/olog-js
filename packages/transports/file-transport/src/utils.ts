const SIZE_UNITS: Record<string, number> = {
  b: 1,
  k: 1024,
  m: 1024 ** 2,
  g: 1024 ** 3
}

export const ParseSize = (size: number | string): number => {
  if (typeof size === 'number') {
    return size
  }

  const match = /^(\d+(?:\.\d+)?)\s*([bkmg])?b?$/i.exec(size.trim())

  if (!match) {
    throw new Error(['[olog/file] Invalid size:', size].join(' '))
  }

  const unit = SIZE_UNITS[(match[2] ?? 'b').toLowerCase()] ?? 1

  return Math.floor(Number(match[1]) * unit)
}

export type Retention = number | `${number}d`

export interface ParsedRetention {
  count?:     number
  maxAgeMs?:  number
}

export function ParseRetention(value: Retention): ParsedRetention {
  if (typeof value === 'number') {
    return {
      count: value,
    }
  }

  return {
    maxAgeMs: Number.parseInt(value, 10) * 86_400_000
  }
}

const Pad = (n: number): string => String(n).padStart(2, '0')

export const FormatDate = (date: Date, pattern: string): string => {
   return pattern.replace('YYYY', String(date.getFullYear())).replace('MM', Pad(date.getMonth() + 1)).replace('DD', Pad(date.getDate())).replace('HH', Pad(date.getHours())).replace('mm', Pad(date.getMinutes()))
}

export const EscapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
