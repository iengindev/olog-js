import type { Formatter, LevelOrSilent } from '@olog-js/core'

export type RotationInterval = 'hourly' | 'daily'

export interface FileTransportOptions {
  path: string
  name?: string
  level?: LevelOrSilent
  format?: Formatter
  maxSize?: number | string
  interval?: RotationInterval
  maxFiles?: number
  compress?: boolean
  mode?: number
}
