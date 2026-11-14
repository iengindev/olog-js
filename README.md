<div align="center">
**Modular, type-safe logger for every JavaScript runtime.**

Node.js · Bun · Deno · Browser · Electron — NestJS · Express · Vue · and anything else

[![npm](https://img.shields.io/npm/v/@olog-js/core?color=00afff&label=%40olog-js%2Fcore)](https://www.npmjs.com/package/@olog-js/core)
[![license](https://img.shields.io/badge/license-MIT-8a5cf6)](./LICENSE)
[![types](https://img.shields.io/badge/types-TypeScript-3178c6)](#)
[![deps](https://img.shields.io/badge/core%20dependencies-0-17c964)](#)

</div>

---

## Why olog?

Most loggers make you choose: **pretty** or **structured**, **Node** or **browser**, **tiny** or **powerful**.
olog doesn't. A zero-dependency core gives you levels, child loggers, processors and async-safe
transports — and you plug in only the outputs you need.

```ts
const log = CreateLogger({ context: 'App', transports: [new ConsoleTransport()] })

log.child('Db').info('Connected', { host: '127.0.0.1', port: 5432 })
```

```
14:02:11.123 ● INFO    [App:Db] Connected host=127.0.0.1 port=5432
```

## ✨ Features

- 🪶 **Zero-dependency core** — universal, side-effect free, works in Node, Bun, Deno, browsers and Electron
- ✍🏻 **8 log levels** — `fatal` `error` `warn` `info` `http` `verbose` `debug` `trace`, plus `silent`
- 🧬 **Child loggers** — nested contexts (`App:Db:Pool`) with inherited metadata
- 🔀 **Flexible arguments** — pass message, meta and errors in any order
- 🛡️ **Processors** — redact secrets, filter, enrich records before they leave the process
- 💥 **First-class errors** — stack, `code`, custom fields and the full `cause` chain are serialized
- 🔁 **Safe serialization** — circular refs, `BigInt`, `Map`, `Set` never crash your logger
- ⚡ **Async-safe transports** — failures never throw into your code; `flush()` / `close()` for graceful shutdown
- ⏱️ **Built-in timers** — measure anything with `startTimer()`
- 🎨 **Beautiful console** — icons, colors, per-context colors, highlighted stack traces, native DevTools output
- 📁 **Production-grade files** — daily/hourly + size rotation, retention, gzip, crash-safe resume
- 🟦 **TypeScript-first** — strict types, ESM + CJS builds

## 📦 Packages

| Package | Description | Runtime |
| --- | --- | --- |
| [`@olog-js/core`](./packages/core) | Logger, levels, processors, formatters, transport base | Universal |
| [`@olog-js/console-transport`](./packages/transports/console-transport) | Pretty terminal & DevTools output | Universal |
| [`@olog-js/file-transport`](./packages/transports/file-transport) | Rotating files with retention & gzip | Node.js |

## 🚀 Installation

```bash
pnpm add @olog-js/core @olog-js/console-transport
# optional
pnpm add @olog-js/file-transport
```

<details>
<summary>npm / yarn / bun</summary>

```bash
npm install @olog-js/core @olog-js/console-transport
yarn add @olog-js/core @olog-js/console-transport
bun add @olog-js/core @olog-js/console-transport
```
</details>

## ⚡ Quick start

```ts
import { CreateLogger, Processors } from '@olog-js/core'
import { ConsoleTransport } from '@olog-js/console-transport'
import { FileTransport } from '@olog-js/file-transport'

export const log = CreateLogger({
  level: 'debug',
  context: 'App',
  meta: {
    service: 'orders-api',
  },
  processors: [
    Processors.redact(['password', 'token']),
  ],
  transports: [
    new ConsoleTransport({
      banner: {
        name: 'orders-api',
        version: '1.0.0',
      }
    }),
    new FileTransport({
      filename: 'logs/app-%DATE%.log',
      maxSize: '20m',
      maxFiles: '14d',
      compress: true,
    }),
  ],
})

log.info('Server started', { port: 3000 })

const db = log.child('Db')

db.error(new Error('Timeout', {
  cause: new Error('ECONNRESET')
}), 'Query failed', {
  sql: 'SELECT 1'
})
```

---

## 📖 Core concepts

### How a record flows

```
log.info(...)  →  level check  →  record  →  processors  →  transports (own level + format)
                                               redact          console · file · your own
                                               filter
                                               enrich
```

### Levels

| Level | Severity | Use for |
| --- | :-: | --- |
| `fatal` | 0 | The app cannot continue |
| `error` | 1 | Failed operations |
| `warn` | 2 | Unexpected but handled situations |
| `info` | 3 | Business events, lifecycle *(default)* |
| `http` | 4 | Requests / responses |
| `verbose` | 5 | Detailed operational info |
| `debug` | 6 | Developer diagnostics |
| `trace` | 7 | Extremely fine-grained tracing |

A record is emitted when its severity is **≤** the threshold. Use `'silent'` to turn everything off.

```ts
log.level = 'warn'
log.isLevelEnabled('debug') // false — skip expensive work
```

### Logging arguments

Arguments are recognized by type, so the order is up to you:

```ts
log.info('User signed in', {
  userId: 42
})

log.info({
  userId: 42
}, 'User signed in')

log.error(err)                               // message = err.message

log.error(err, 'Payment failed', {
  orderId: orderId
})

log.error('Payment failed', err, {
  orderId: orderId
})

log.error('Payment failed', {
  error: err
})  // `error` key is extracted too

log.info('Items in cart:', 3)                 // primitives join the message
```

### Child loggers

Children share transports, processors and level with the root, and add their own context and metadata.

```ts
const http = log.child('Http')                         // [App:Http]
const req = http.child({
  context: 'Req',
  meta: {
    requestId: 'a1b2'
  }
})

req.info('Incoming request')                           // [App:Http:Req] … requestId=a1b2
```

### Timers

```ts
const done = log.startTimer('Import users')

await importUsers()

done({
  count: 1200
})
// ● INFO  Import users (812.4 ms) count=1200 durationMs=812.4

const end = log.startTimer('SQL', 'debug')             // custom level
```

### Processors

Processors run before transports. They can change a record, or drop it by returning `null`.

```ts
import { Processors } from '@olog-js/core'

createLogger({
  processors: [
    // masks keys at any depth + "password=..." inside messages
    Processors.redact([
      'password',
      'token',
      'authorization',
    ], {
      censor: '***',
      patterns: [/Bearer\s+\S+/g],
    }),
    // drop noisy records
    Processors.filter((r) => !r.message.includes('healthcheck')),
    // enrich every record
    Processors.addMeta(() => ({
      hostname: os.hostname(),
      pid: process.pid,
    })),
  ],
})

// or later
log.use((record) => ({
  ...record,
  meta: {
    ...record.meta,
    region: 'eu-west-1'
  }
}))
```

> 🔒 If a processor throws, the record is **dropped** rather than sent unprocessed — secrets never leak because of a bug.

### Formatters

```ts
import { Format } from '@olog-js/core'

Format.json()            // {"timestamp":"…","level":"info","context":"App","message":"…",…}
Format.json({ space: 2 }) // pretty-printed JSON
Format.simple()          // 2026-11-15T10:00:00.000Z INFO    [App] message {"a":1}
```

Any transport accepts a `format` option — e.g. JSON lines in production.

### Error handling & shutdown

Transport failures never throw into your code. They are reported through `onError`:

```ts
CreateLogger({
  onError: (error, source, record) => {
    // source: 'processor' | 'transport:<name>'
    metrics.increment('logger.errors', { source })
  },
})
```

Flush buffers before exit:

```ts
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await log.close() // flush + close every transport
    process.exit(0)
  })
}
```

### Logger API

| Member | Description |
| --- | --- |
| `fatal` … `trace(...args)` | Log at a given level |
| `log(level, ...args)` | Log at a dynamic level |
| `level` | Get / set the threshold |
| `isLevelEnabled(level)` | Check before doing expensive work |
| `child(context, meta?)` / `child({ context, meta })` | Create a child logger |
| `startTimer(label, level?)` | Returns `done(meta?) => durationMs` |
| `addTransport(t)` / `removeTransport(t \| name)` | Manage transports at runtime |
| `use(processor)` | Add a processor |
| `flush()` | Wait for pending async writes |
| `close()` | Flush and close all transports |

---

## 🎨 Console transport

```ts
import { ConsoleTransport } from '@olog-js/console-transport'

new ConsoleTransport({
  timestamp: 'time',   // 'time' | 'datetime' | 'iso' | false | (date) => string
  meta: 'inline',      // 'inline' | 'tree' | 'json' | false
  stack: 'short',      // 'short' (hide node_modules) | 'full' | false
  icons: true,
  banner: true,
})
```

```
14:02:11.123 ● INFO    [App:Db] Connected host=127.0.0.1 port=5432 password=[REDACTED]
14:02:11.130 ▲ WARN    [App:Http] Slow request path=/orders durationMs=1240
14:02:11.135 ✖ ERROR   [App:Db] Query failed sql="SELECT 1"
             Error: Timeout
               at query (/app/src/db.ts:42:11)
               … 6 internal frames hidden
             ↳ Caused by:
               Error: ECONNRESET
```

- **Smart colors** — auto-detects TTY, respects `NO_COLOR` and `FORCE_COLOR`
- **Per-context colors** — every context gets its own stable color
- **stderr routing** — `fatal`, `error` and `warn` go to `stderr` by default
- **Browser & Electron renderer** — native `console.*` with CSS badges; meta and errors stay expandable in DevTools

| Option | Type | Default |
| --- | --- | --- |
| `mode` | `'auto' \| 'terminal' \| 'browser'` | `'auto'` |
| `colors` | `boolean` | auto |
| `timestamp` | `TimestampFormat` | `'time'` |
| `icons` | `boolean` | `true` |
| `meta` | `'inline' \| 'tree' \| 'json' \| false` | `'inline'` |
| `stack` | `'short' \| 'full' \| false` | `'short'` |
| `stderrLevels` | `LevelName[]` | `['fatal', 'error', 'warn']` |
| `banner` | `boolean \| BannerOptions` | `false` |
| `level` · `format` · `filter` · `name` | common transport options | — |

## 📁 File transport

```ts
import { FileTransport } from '@olog-js/file-transport'

// everything: a new file every day, max 20 MB each, keep 14 days, gzip old ones
new FileTransport({
  filename: 'logs/app-%DATE%.log',
  maxSize: '20m',
  maxFiles: '14d',
  compress: true,
})

// errors only, separate file, keep last 5
new FileTransport({
  filename: 'logs/error.log',
  level: 'error',
  maxSize: '10m',
  maxFiles: 5,
})
```

```
logs/
├─ app-2026-11-13.log.gz
├─ app-2026-11-14.log.gz
├─ app-2026-11-15.log        ← active
├─ app-2026-11-15.1.log      ← size rotation
└─ error.log
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `filename` | `string` | — | Path; `%DATE%` is replaced with the current period |
| `datePattern` | `string` | `'YYYY-MM-DD'` | Tokens `YYYY MM DD HH mm`; `'YYYY-MM-DD-HH'` rotates hourly |
| `maxSize` | `number \| string` | — | `'500k'`, `'10m'`, `'1g'` |
| `maxFiles` | `number \| '${n}d'` | — | Keep N files or N days |
| `compress` | `boolean` | `false` | Gzip closed files in the background |
| `fresh` | `boolean` | `false` | Remove previous files on start (handy in development) |
| `onError` | `(error) => void` | `console.error` | Write/rotation errors |
| `level` · `format` · `filter` · `name` | | `format.json()` | Common transport options |

> 💡 Relative paths resolve against `process.cwd()`. Prefer absolute paths in services.
> Don't let several processes write to the same file — give each a unique name (e.g. include `process.pid`).

## 🧩 Custom transports

**Quick — from a function:**

```ts
import { CreateTransport } from '@olog-js/core'

const sentry = CreateTransport(
  'sentry',
  (record) => {
    if (record.error) {
      Sentry.captureException(record.error, {
        extra: record.meta,
      })
    }
  },
  {
    level: 'error',
  },
)
```

**Full — extend `BaseTransport`** (filtering and formatting included):

```ts
import { BaseTransport, Format, type LogRecord } from '@olog-js/core'

export class HttpTransport extends BaseTransport {
  constructor(private readonly url: string) {
    super({ name: 'http' }, Format.json())
  }

  protected async write(_record: LogRecord, line: string): Promise<void> {
    await fetch(this.url, {
      method: 'POST',
      body: line,
      headers: {
        'content-type': 'application/json',
      },
    })
  }
}
```

Returned promises are tracked: errors go to `onError`, and `log.flush()` waits for them.

## 🔌 Framework recipes

<details>
<summary><b>NestJS</b></summary>

```ts
import type { LoggerService } from '@nestjs/common'
import type { Logger } from '@olog-js/core'

export class OlogNestLogger implements LoggerService {
  constructor(private readonly logger: Logger) {}

  private scoped(context?: string) {
    return context ? this.logger.child(context) : this.logger
  }

  log(message: unknown, context?: string) {
    this.scoped(context).info(String(message))
  }

  error(message: unknown, trace?: string, context?: string) {
    this.scoped(context).error(String(message), trace ? { trace } : undefined)
  }

  warn(message: unknown, context?: string) {
    this.scoped(context).warn(String(message))
  }

  debug(message: unknown, context?: string) {
    this.scoped(context).debug(String(message))
  }

  verbose(message: unknown, context?: string) {
    this.scoped(context).verbose(String(message))
  }

  fatal(message: unknown, context?: string) {
    this.scoped(context).fatal(String(message))
  }
}

// main.ts
const app = await NestFactory.create(AppModule, {
  bufferLogs: true
})

app.useLogger(new OlogNestLogger(log))
```
</details>

<details>
<summary><b>Express</b></summary>

```ts
import { randomUUID } from 'node:crypto'

const http = log.child('Http')

app.use((req, res, next) => {
  const requestId = req.get('x-request-id') ?? randomUUID()
  const done = http.startTimer(`${req.method} ${req.originalUrl}`, 'http')

  res.on('finish', () => done({
    status: res.statusCode,
    requestId: requestId,
  }))

  next()
})

app.use((err, req, res, next) => {
  http.error(err, 'Unhandled error', {
    path: req.originalUrl
  })

  res.status(500).json({
    error: 'Internal Server Error'
  })
})
```
</details>

<details>
<summary><b>Vue 3</b></summary>

```ts
import { CreateLogger } from '@olog-js/core'
import { ConsoleTransport } from '@olog-js/console-transport'

const log = CreateLogger({
  level: import.meta.env.DEV ? 'debug' : 'warn',
  context: 'Web',
  transports: [new ConsoleTransport()], // auto-switches to DevTools mode
})

app.config.errorHandler = (err, _instance, info) => {
  log.error(err as Error, 'Vue error', { info })
}

app.provide('log', log)
```
</details>

<details>
<summary><b>Electron</b></summary>

```ts
// main process
import { app } from 'electron'
import path from 'node:path'

const log = CreateLogger({
  context: 'Main',
  transports: [
    new ConsoleTransport(),
    new FileTransport({
      filename: path.join(app.getPath('logs'), 'main-%DATE%.log'),
      maxFiles: 7,
      compress: true,
    }),
  ],
})

app.on('before-quit', async (event) => {
  event.preventDefault()
  await log.close()
  app.exit()
})
```

In the renderer, `ConsoleTransport` uses DevTools output automatically.
</details>

## 🏭 Production setup

```ts
const isProd = process.env.NODE_ENV === 'production'

export const log = createLogger({
  level: (process.env.LOG_LEVEL as LevelName) ?? (isProd ? 'info' : 'debug'),
  context: 'App',
  meta: {
    service: 'orders-api',
    env: process.env.NODE_ENV
  },
  processors: [
    Processors.redact([
      'password',
      'token',
      'authorization',
      'cookie',
    ])
  ],
  transports: [
    new ConsoleTransport(isProd ? { format: format.json() } : { banner: true }),
    ...(isProd ? [new FileTransport({ filename: '/var/log/orders/app-%DATE%.log', maxFiles: '30d', compress: true })] : []),
  ],
})
```

---

## 🛠️ Development

```bash
git clone https://github.com/iengindev/olog-js.git
cd olog-js
pnpm install
pnpm build        # builds all packages in dependency order
pnpm dev          # watch mode
pnpm typecheck
```

```
olog-js/
├─ packages/
│  ├─ core/                  # @olog-js/core
│  ├─ banner/                # @olog-js/banner
│  └─ transports/
│     ├─ console/            # @olog-js/console
│     └─ file/               # @olog-js/file
└─ apps/playground/          # playground
```

## 🗺️ Roadmap

- [x] Core: levels, child loggers, processors, formatters, timers
- [x] Console transport
- [x] File transport with rotation, retention and gzip
- [x] Startup banner
- [ ] `@olog-js/http` — batching + retries (Loki, Elasticsearch, custom endpoints)
- [ ] `@olog-js/nest` — official module & `LoggerService`
- [ ] `@olog-js/express` — middleware with request IDs via `AsyncLocalStorage`
- [ ] `@olog-js/vue` — plugin & error handler
- [ ] `@olog-js/electron` — main ⇄ renderer bridge over IPC
- [ ] `@olog-js/node` — automatic graceful shutdown
- [ ] Custom levels
- [ ] Test suite & benchmarks

## 🤝 Contributing

Issues and pull requests are welcome! Please open an issue first to discuss significant changes.

1. Fork the repo and create a branch: `git checkout -b feat/my-feature`
2. Make your changes and run `pnpm build && pnpm typecheck`
3. Open a pull request

## 📄 License

[MIT](./LICENSE) iengindev
