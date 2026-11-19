import type { LevelName, LevelOrSilent } from '../types/level'

export const Levels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  http: 4,
  verbose: 5,
  debug: 6,
  trace: 7,
} as const

export const LevelNames = Object.keys(Levels) as LevelName[]

export const IsLevelName = (val: unknown): val is LevelName => typeof val === 'string' && Object.hasOwn(Levels, val)
export const IsLevelOrSilent = (val: unknown): val is LevelOrSilent => val === 'silent' || IsLevelName(val)

export const IsLevelEnabled = (level: LevelName, threshold: LevelOrSilent): boolean => threshold !== 'silent' && Levels[level] <= Levels[threshold]

export const AssertLevel = (val: unknown, where: string): LevelOrSilent => {
  if (!IsLevelOrSilent(val)) {
    throw new TypeError(`[olog] invalid level "${String(val)}" in ${where}`)
  }

  return val
}
