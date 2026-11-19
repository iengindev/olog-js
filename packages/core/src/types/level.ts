import type { Levels } from '../modules/level'

export type LevelName = keyof typeof Levels
export type LevelOrSilent = LevelName | 'silent'
