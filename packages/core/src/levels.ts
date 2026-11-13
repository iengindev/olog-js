export const Levels = {
  fatal:    0,
  error:    1,
  warn:     2,
  info:     3,
  http:     4,
  verbose:  5,
  debug:    6,
  trace:    7,
} as const

export type LevelName = keyof typeof Levels
export type LevelOrSilent = LevelName | 'silent'

export const IsLevelName = (v: unknown): v is LevelName => typeof v === 'string' && v in Levels
export const IsLevelEnabled = (level: LevelName, threshold: LevelOrSilent): boolean => threshold !== 'silent' && Levels[level] <= Levels[threshold]
