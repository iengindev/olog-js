import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, statSync, rmSync, type WriteStream } from 'node:fs'
import { readdir, stat, unlink } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { createGzip } from 'node:zlib'
import { BaseTransport, Format, type BaseTransportOptions, type LogRecord } from '@olog-js/core'

import { EscapeRegExp, FormatDate, ParseRetention, ParseSize, type ParsedRetention, type Retention } from './utils'

export interface FileTransportOptions extends BaseTransportOptions {
  fresh?:         boolean
  filename:       string
  datePattern?:   string
  maxSize?:       number | string
  maxFiles?:      Retention
  compress?:      boolean
  onError?:       (error: unknown) => void
}

const FileSize = (path: string): number => {
  try {
    return statSync(path).size
  } catch {
    return 0
  }
}

const GzipFile = async (path: string): Promise<void> => {
  await pipeline(createReadStream(path), createGzip(), createWriteStream([path, '.gz'].join('')))
  await unlink(path)
}

export class FileTransport extends BaseTransport {
  private readonly dir: string
  private readonly base: string
  private readonly ext: string
  private readonly hasDate: boolean
  private readonly datePattern: string
  private readonly maxSize: number
  private readonly retention: ParsedRetention
  private readonly compress: boolean
  private readonly onError: (error: unknown) => void
  private readonly filePattern: RegExp
  private stream: WriteStream | null = null
  private currentFile = ''
  private period = ''
  private index = 0
  private size = 0
  private closed = false
  private pendingWrites = 0
  private drainWaiters: Array<() => void> = []
  private readonly tasks = new Set<Promise<void>>()
  private readonly closing = new Set<string>()
  private chain: Promise<void> = Promise.resolve()

  constructor(options: FileTransportOptions) {
    super({
      name: 'file',
      ...options
    }, Format.json())

    const file = resolve(options.filename)

    this.dir = dirname(file)
    this.ext = extname(file)
    this.base = basename(file, this.ext)
    this.hasDate = this.base.includes('%DATE%')
    this.datePattern = options.datePattern ?? 'YYYY-MM-DD'
    this.maxSize = options.maxSize ? ParseSize(options.maxSize) : 0
    this.retention = options.maxFiles ? ParseRetention(options.maxFiles) : {}
    this.compress = options.compress ?? false
    this.onError = options.onError ?? ((error) => console.error('[olog/file]', error))

    const base = EscapeRegExp(this.base).replace('%DATE%', '(?<date>.+?)')

    this.filePattern = new RegExp(`^${base}(?:\\.(?<index>\\d+))?${EscapeRegExp(this.ext)}(?:\\.gz)?$`)

    mkdirSync(this.dir, {
      recursive: true
    })

    if (options.fresh) {
      for (const name of readdirSync(this.dir)) {
        if (this.filePattern.test(name)) {
          rmSync(join(this.dir, name), {
            force: true
          })
        }
      }
    }
  }

  private fileName(period: string, index: number): string {
    const name = this.base.replace('%DATE%', period)

    return join(this.dir, [name, index > 0 ? ['.', index].join('') : '', this.ext].join(''))
  }

  private track(task: Promise<void>): void {
    const tracked: Promise<void> = task.catch((error: unknown) => this.onError(error)).finally(() => this.tasks.delete(tracked))

    this.tasks.add(tracked)
  }

  private async removeOldFiles(): Promise<void> {
    const { count, maxAgeMs } = this.retention

    if (count === undefined && maxAgeMs === undefined) {
      return
    }

    const names = (await readdir(this.dir)).filter((name) => this.filePattern.test(name))
    const entries = await Promise.all(names.map(async (name) => {
        const path = join(this.dir, name)
        const info = await stat(path).catch(() => null)

        return info ? {
          path: path,
          mtime: info.mtimeMs,
        } : null
      }),
    )

    const now = Date.now()
    const files = entries.filter((entry) => entry !== null).sort((a, b) => b.mtime - a.mtime)
    const expired = files.filter((file, i) => file.path !== this.currentFile && ((count !== undefined && i >= count) || (maxAgeMs !== undefined && now - file.mtime > maxAgeMs)))

    await Promise.all(expired.map((file) => unlink(file.path).catch(() => undefined)))
  }

  private async compressLeftovers(): Promise<void> {
    for (const name of await readdir(this.dir)) {
      const path = join(this.dir, name)
      const skip = name.endsWith('.gz') || !this.filePattern.test(name) || path === this.currentFile || this.closing.has(path)
      
      if (!skip) {
        await GzipFile(path)
      }
    }
  }

  private async finalize(stream: WriteStream | null, file: string): Promise<void> {
    try {
      if (stream) {
        await new Promise<void>((done) => stream.end(done))

        if (this.compress) {
          await GzipFile(file)
        }
      }

      if (this.compress) {
        await this.compressLeftovers()
      }

      await this.removeOldFiles()
    } catch (error) {
      this.onError(error)
    } finally {
      this.closing.delete(file)
    }
  }

  async flush(): Promise<void> {
    if (this.pendingWrites > 0) {
      await new Promise<void>((done) => this.drainWaiters.push(done))
    }

    await Promise.allSettled([...this.tasks])
  }

  private open(period: string, startIndex: number): void {
    let index = startIndex
    let file = this.fileName(period, index)
    let size = FileSize(file)

    while ((this.maxSize && size >= this.maxSize) || existsSync(`${file}.gz`)) {
      index++

      file = this.fileName(period, index)
      size = FileSize(file)
    }

    const previous = this.stream
    const previousFile = this.currentFile
    const stream = createWriteStream(file, { flags: 'a' })

    stream.on('error', this.onError)

    this.stream = stream
    this.currentFile = file
    this.period = period
    this.index = index
    this.size = size

    this.track(this.finalize(previous, previousFile))

    if (previous) {
      this.closing.add(previousFile)
    }

    this.chain = this.chain.then(() => this.finalize(previous, previousFile))

    this.track(this.chain)
  }

  async close(): Promise<void> {
    if (this.closed) {
      return
    }

    this.closed = true

    await this.flush()

    const stream = this.stream

    this.stream = null

    if (stream) {
      await new Promise<void>((done) => stream.end(done))
    }

    await Promise.allSettled([...this.tasks])
  }

  private findLatestIndex(period: string): number {
    let max = 0
    let names: string[] = []

    try {
      names = readdirSync(this.dir)
    } catch {
      return 0
    }

    for (const name of names) {
      const groups = this.filePattern.exec(name)?.groups

      if (!groups || (groups.date ?? '') !== period) {
        continue
      }

      max = Math.max(max, Number(groups.index ?? 0))
    }

    return max
  }

  private ensureStream(incoming: number): void {
    const period = this.hasDate ? FormatDate(new Date(), this.datePattern) : ''

    if (!this.stream || period !== this.period) {
      this.open(period, this.findLatestIndex(period))
    } else {
      this.open(period, this.index + 1)
    }
  }

  private onWritten(): void {
    this.pendingWrites--

    if (this.pendingWrites === 0) {
      for (const done of this.drainWaiters.splice(0)) {
        done()
      }
    }
  }

  protected write(_record: LogRecord, line: string): void {
    if (this.closed) {
      return
    }

    const data = `${line}\n`
    const bytes = Buffer.byteLength(data)

    this.ensureStream(bytes)

    this.pendingWrites++
    this.stream?.write(data, () => this.onWritten())
    this.size += bytes
  }
}
