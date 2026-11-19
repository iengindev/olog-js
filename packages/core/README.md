<div align="center">

# @olog-js/core

**Zero-dependency, type-safe logger core for every JavaScript runtime.**

[![npm](https://img.shields.io/npm/v/@olog-js/core?color=00afff)](https://www.npmjs.com/package/@olog-js/core)
[![license](https://img.shields.io/badge/license-MIT-8a5cf6)](../../LICENSE)
[![deps](https://img.shields.io/badge/dependencies-0-17c964)](#)

</div>

## Install

```bash
npm install @olog-js/core
```

## Quick start

```ts
import { Logger } from '@olog-js/core'

const logger = new Logger({ level: 'debug', context: 'app' })

logger.info('Server started', { port: 3000 })

const db = logger.child({ context: 'db', meta: { pool: 'main' } })
db.info('Connected', { password: 'hunter2' }) // password → [REDACTED]

try {
  // ...
} catch (err) {
  db.error('Query failed', { error: err }) // err can be `unknown`
}

await logger.close()
```

```
2026-11-19T12:25:30.857Z INFO    [app] Server started {"port":3000}
2026-11-19T12:25:30.865Z INFO    [db] Connected {"pool":"main","password":"[REDACTED]"}
```

## Options

| Option | Type | Default |
|---|---|---|
| `level` | `LevelOrSilent` | `'info'` |
| `context` | `string` | — |
| `meta` | `Record<string, unknown>` | `{}` |
| `transports` | `Transport[]` | `[]` (console is added automatically) |
| `console` | `ConsoleTransportOptions \| false` | `{}` |
| `banner` | `BannerOptions \| boolean` | `true` |
| `processors` | `Processor[]` | `[]` |
| `redact` | `RedactOptions \| false` | default keys and patterns |
| `onError` | `(error, source, record?) => void` | `console.error` |

## Levels

`fatal` · `error` · `warn` · `info` · `http` · `verbose` · `debug` · `trace`. Use `silent` to disable output.

A record is written when its level passes the logger's level and then the transport's level.

```ts
logger.warn('Disk almost full')
logger.error(new Error('boom'))
logger.log('info', 'Same as logger.info')

logger.level = 'warn'
logger.isLevelEnabled('debug') // false
```

## Pipeline

```
log() → level check → build record → processors → redact → transports
```

A processor returns a new record, or `null` to drop it. If a processor throws, the record is dropped, so a failing step never leaks unredacted data.

```ts
import { Filter, Enrich } from '@olog-js/core'

new Logger({
  processors: [
    Filter((record) => record.context !== 'healthcheck'),
    Enrich(() => ({ hostname: 'api-1' })),
  ],
})
```

## Transports

### Console

A console transport is always present. If `transports` does not contain one, the logger adds it automatically.

| `transports` | `console` | Result |
|---|---|---|
| omitted or `[]` | omitted | console |
| `[file]` | omitted | console + file |
| `[file]` | `{ level: 'warn', format: Json() }` | console with these options + file |
| `[new ConsoleTransport(...), file]` | any | your console is used, no duplicate |
| `[file]` | `false` | file only, no banner |

```ts
import { ConsoleTransport, Json } from '@olog-js/core'

new Logger({ console: { level: 'warn', format: Json() } })
new Logger({ console: false, transports: [file] })
```

### Custom transports

A transport is any object that implements `Transport`. `log` may be sync or async: async writes are tracked by `flush()`.

```ts
import { Json, type Transport } from '@olog-js/core'

const format = Json()

const http: Transport = {
  name: 'http',
  level: 'warn',
  log: async (record) => {
    await fetch(url, { method: 'POST', body: format(record) })
  },
  flush: async () => { /* send buffered batch */ },
  close: async () => { /* release resources */ },
}

new Logger({ transports: [http] })
```

Set `kind: 'console'` on your own console-like transport, and the logger will use it instead of adding the default one. Implement `write(text)` to receive the banner.

## Formatters

```ts
import { Json, Pretty } from '@olog-js/core'

Pretty()                  // colors auto-detected (TTY, NO_COLOR, FORCE_COLOR)
Pretty({ colors: false })
Json()                    // one line per record
Json({ space: 2 })
```

A formatter is a plain function `(record: LogRecord) => string`.

## Redaction

On by default. Matching keys are replaced at any depth, including in arrays, `Map`, `Set` and errors. Patterns are replaced inside the message and every string value.

```ts
import { DefaultRedactKeys } from '@olog-js/core'

new Logger({
  redact: {
    keys: [...DefaultRedactKeys, 'cardNumber'], // `keys` replaces the defaults
    patterns: [/\bBearer\s+\S+/gi],
    censor: '***',
  },
})
```

Default keys cover `password`, `secret`, `token`, `apiKey`, `authorization`, `cookie`, `privateKey`, `credential`, `sessionId`. Pass `redact: false` to turn redaction off.

## Errors

Pass an `Error` as the message, or any thrown value as `meta.error`. Both are serialized with `name`, `message`, `stack`, own properties, `cause` chain and `AggregateError.errors`.

```ts
logger.error(err)
logger.error('Request failed', { error: err, url })
```

## Child loggers

Children share transports and the pipeline with the parent, and add their own context and meta.

```ts
const db = logger.child({ context: 'db', meta: { pool: 'main' }, level: 'debug' })
```

## Banner

Printed once at startup through the console transport, with runtime info and logger settings.

```ts
new Logger({
  banner: {
    name: 'my-api',
    version: '1.2.0',
    description: 'Orders service',
    system: true,           // runtime, platform, PID, start time
    fields: { Port: 3000 },
    art: false,             // hide the ASCII art
  },
})
```

The banner is skipped when `banner: false`, `console: false`, or `level: 'silent'`. It bypasses formatters and never goes to other transports.

## Shutdown

```ts
await logger.flush() // wait for pending async writes and call transport.flush()
await logger.close() // flush, then close every transport; later logs are ignored

await using logger = new Logger() // closes automatically
```

## Error handling

The logger never throws from `log()`. Failures in processors, transports, `flush` and `close` go to `onError`:

```ts
new Logger({
  onError: (error, source, record) => {
    // source: 'processor' | 'transport:<name>' | 'transport:<name>:flush' | ...
  },
})
```

For processor failures `record` is not redacted yet, so do not log it as is.

## Utilities

| Export | Purpose |
|---|---|
| `SafeStringify(value, space?)` | `JSON.stringify` that never throws |
| `SerializeError(value)` | Error → plain object |
| `CreateRedactor(options)` | Redaction as a standalone processor |
| `RenderBanner(options)` / `PrintBanner(options)` | Banner without a logger |
| `DetectRuntime()` / `SupportsColor()` | Runtime and color detection |
| `IsConsoleTransport(t)` / `ResolveTransports(options)` | Transport helpers |
| `Levels`, `LevelNames`, `IsLevelName`, `IsLevelEnabled` | Level helpers |

## License

[MIT](../../LICENSE)
