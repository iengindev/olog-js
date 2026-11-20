import { createReadStream, createWriteStream } from 'node:fs'
import { readdir, stat, unlink } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { createGzip } from 'node:zlib'

import type { RotationInterval } from '../types/file'
import type { PathParts } from '../types/rotation'

const Units: Record<string, number> = {
  b: 1,
  kb: 1024,
  mb: 1024 ** 2,
  gb: 1024 ** 3,
}

export const ParseSize = (value: number | string): number => {
  const Match = typeof value === 'number' ? null : /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i.exec(value.trim())
  const Unit = Units[(Match?.[2] ?? 'b').toLowerCase()] ?? 1
  const Bytes = typeof value === 'number' ? value : Math.floor(Number(Match?.[1]) * Unit)

  if (!Number.isFinite(Bytes) || Bytes <= 0) {
    throw new TypeError(`olog: invalid size "${String(value)}"`)
  }

  return Bytes
}

const Pad = (n: number): string => String(n).padStart(2, '0')

export const PeriodKey = (date: Date, interval: RotationInterval | undefined): string => {
  const Day = `${String(date.getFullYear())}-${Pad(date.getMonth() + 1)}-${Pad(date.getDate())}`

  return interval === 'hourly' ? `${Day}T${Pad(date.getHours())}` : Day
}

export const SplitPath = (path: string): PathParts => {
  const Ext = extname(path)

  return {
    dir: dirname(path),
    base: basename(path, Ext),
    ext: Ext,
  }
}

const ArchiveName = (parts: PathParts, stamp: string, index: number): string => `${parts.base}.${stamp}.${String(index)}${parts.ext}`

const IsArchive = (name: string, parts: PathParts): boolean => {
  return name !== `${parts.base}${parts.ext}` && name.startsWith(`${parts.base}.`) && (name.endsWith(parts.ext) || name.endsWith(`${parts.ext}.gz`))
}

export const NextArchivePath = async (parts: PathParts, stamp: string): Promise<string> => {
  const Existing = new Set(await readdir(parts.dir))

  let index = 1

  while (Existing.has(ArchiveName(parts, stamp, index)) || Existing.has(`${ArchiveName(parts, stamp, index)}.gz`)) {
    index += 1
  }

  return join(parts.dir, ArchiveName(parts, stamp, index))
}

export const CompressFile = async (path: string): Promise<void> => {
  await pipeline(createReadStream(path), createGzip(), createWriteStream(`${path}.gz`))
  await unlink(path)
}

export const PruneArchives = async (parts: PathParts, keep: number): Promise<void> => {
  const Names = (await readdir(parts.dir)).filter((name) => IsArchive(name, parts))

  const Entries = await Promise.all(Names.map(async (name) => {
    const Full = join(parts.dir, name)
    const Stats = await stat(Full).catch(() => undefined)

    return {
      path: Full,
      time: Stats?.mtimeMs ?? 0,
    }
  }))

  Entries.sort((a, b) => b.time - a.time)

  await Promise.all(Entries.slice(keep).map(async (entry) => {
    await unlink(entry.path).catch(() => undefined)
  }))
}
