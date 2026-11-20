import { once } from 'node:events'
import { createWriteStream } from 'node:fs'
import { mkdir, rename, stat } from 'node:fs/promises'
import { finished } from 'node:stream/promises'

import { Json } from '@olog-js/core'

import { CompressFile, NextArchivePath, ParseSize, PeriodKey, PruneArchives, SplitPath } from './modules/rotation'

import type { WriteStream } from 'node:fs'

import type { Formatter, LevelOrSilent, LogRecord, Transport } from '@olog-js/core'

import type { FileTransportOptions, RotationInterval } from './types/file'
import type { PathParts } from './types/rotation'

export class FileTransport implements Transport {
  readonly name: string
  readonly kind = 'file'
  level?: LevelOrSilent

  readonly $path: string
  readonly $parts: PathParts
  readonly $format: Formatter
  readonly $maxSize: number | undefined
  readonly $interval: RotationInterval | undefined
  readonly $maxFiles: number | undefined
  readonly $compress: boolean
  readonly $mode: number

  $buffer: string[] = []
  $draining: Promise<void> | undefined
  $stream: WriteStream | undefined
  $failure: Error | undefined
  $size = 0
  $period: string | undefined
  $closed = false

  constructor(options: FileTransportOptions) {
    this.name = options.name ?? 'file'
    this.$path = options.path
    this.$parts = SplitPath(options.path)
    this.$format = options.format ?? Json()
    this.$maxSize = options.maxSize === undefined ? undefined : ParseSize(options.maxSize)
    this.$interval = options.interval
    this.$maxFiles = options.maxFiles
    this.$compress = options.compress ?? false
    this.$mode = options.mode ?? 0o640

    if (options.level !== undefined) {
      this.level = options.level
    }
  }

  async $sync(): Promise<void> {
    const Stream = this.$stream

    if (Stream === undefined) {
      return
    }

    await new Promise<void>((resolve, reject) => {
      Stream.write('', (error) => {
        if (error === null || error === undefined) {
          resolve()
        } else {
          reject(error)
        }
      })
    })
  }

  async flush(): Promise<void> {
    while (this.$draining !== undefined) {
      await this.$draining.catch(() => undefined)
    }

    if (this.$buffer.length > 0) {
      this.$draining = this.$drain()

      await this.$draining
    }

    await this.$sync()
  }

  async close(): Promise<void> {
    if (this.$closed) {
      return
    }

    this.$closed = true

    try {
      await this.flush()
    } finally {
      await this.$closeStream()
    }
  }

  $reset(): void {
    this.$failure = undefined
    this.$stream?.destroy()
    this.$stream = undefined
  }

  async $open(): Promise<WriteStream> {
    if (this.$stream !== undefined) {
      return this.$stream
    }

    await mkdir(this.$parts.dir, { recursive: true })

    const Stats = await stat(this.$path).catch(() => undefined)

    this.$size = Stats?.size ?? 0
    this.$period = PeriodKey(Stats?.mtime ?? new Date(), this.$interval)

    const Stream = createWriteStream(this.$path, {
      flags: 'a',
      mode: this.$mode,
    })

    Stream.on('error', (error) => {
      this.$failure = error
    })

    this.$stream = Stream

    return Stream
  }

  async $closeStream(): Promise<void> {
    const Stream = this.$stream

    if (Stream === undefined) {
      return
    }

    this.$stream = undefined
    Stream.end()
    await finished(Stream)
  }

  async $rotate(): Promise<void> {
    const Stamp = this.$period ?? PeriodKey(new Date(), this.$interval)

    await this.$closeStream()

    const Archive = await NextArchivePath(this.$parts, Stamp)

    await rename(this.$path, Archive)

    if (this.$compress) {
      await CompressFile(Archive)
    }

    if (this.$maxFiles !== undefined) {
      await PruneArchives(this.$parts, this.$maxFiles)
    }
  }

  $shouldRotate(bytes: number): boolean {
    const Now = PeriodKey(new Date(), this.$interval)

    if (this.$size === 0) {
      this.$period = Now

      return false
    }

    const BySize = this.$maxSize !== undefined && this.$size + bytes > this.$maxSize
    const ByTime = this.$interval !== undefined && this.$period !== Now

    return BySize || ByTime
  }

  async $prepare(bytes: number): Promise<WriteStream> {
    const Stream = await this.$open()

    if (!this.$shouldRotate(bytes)) {
      return Stream
    }

    await this.$rotate()

    return this.$open()
  }

  $takeFailure(): void {
    const Failure = this.$failure

    if (Failure !== undefined) {
      this.$reset()

      throw Failure
    }
  }

  async $write(chunk: string): Promise<void> {
    this.$takeFailure()

    const Bytes = Buffer.byteLength(chunk)
    const Stream = await this.$prepare(Bytes)

    try {
      this.$size += Bytes

      if (!Stream.write(chunk)) {
        await once(Stream, 'drain')
      }
    } catch (error) {
      this.$reset()
      throw error
    }
  }

  async $drain(): Promise<void> {
    try {
      await Promise.resolve()

      while (this.$buffer.length > 0) {
        const Chunk = this.$buffer.join('')

        this.$buffer = []

        await this.$write(Chunk)
      }
    } finally {
      this.$draining = undefined
    }
  }

  log(record: LogRecord): void | Promise<void> {
    if (this.$closed) {
      return undefined
    }

    this.$buffer.push(`${this.$format(record)}\n`)

    if (this.$draining !== undefined) {
      return undefined
    }

    this.$draining = this.$drain()

    return this.$draining
  }
}

export { ParseSize } from './modules/rotation'

export type { FileTransportOptions, RotationInterval } from './types/file'
