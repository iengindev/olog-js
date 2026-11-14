import type { LevelName } from '@olog-js/core'

export interface LevelStyle {
  icon:     string
  color:    number
  css:      string
  badge?:   boolean
}

export const LEVEL_STYLES: Record<LevelName, LevelStyle> = {
  fatal: {
    icon: '✖',
    color: 196,
    css: '#d7263d',
    badge: true,
  },

  error: {
    icon: '✖',
    color: 203,
    css: '#e5484d',
  },

  warn: {
    icon: '▲',
    color: 214,
    css: '#f5a524',
  },

  info: {
    icon: '●',
    color: 42,
    css: '#17c964',
  },

  http: {
    icon: '⇄',
    color: 75,
    css: '#3e9cf5',
  },

  verbose: {
    icon: '◆',
    color: 141,
    css: '#9b6cf6',
  },

  debug: {
    icon: '◇',
    color: 245,
    css: '#8a8f98',
  },

  trace: {
    icon: '·',
    color: 240,
    css: '#6b7079',
  },
}

export const VALUE_COLORS = {
  key: 110,
  string: 114,
  number: 179,
  boolean: 141,
  nullish: 244,
  file: 81,
} as const

const CONTEXT_COLORS = [39, 45, 81, 117, 141, 177, 213, 222, 150, 114, 80, 209]

export function ContextColor(context: string): number {
  let hash = 0

  for (let i = 0; i < context.length; i++) {
    hash = (hash * 31 + context.charCodeAt(i)) | 0
  }

  return CONTEXT_COLORS[Math.abs(hash) % CONTEXT_COLORS.length] ?? 39
}
