# olog-js

Zero-dependency, type-safe logger for every JavaScript runtime.

- **Transports** — send each record to several destinations, each with its own level
- **Processors** — filter, enrich or transform records in a pipeline
- **Secret redaction** — on by default, always runs last, fails closed
- **Safe serialization** — circular refs, `BigInt`, `Map`/`Set`, `Error` with `cause`
- **Child loggers** — inherit transports, add their own context and meta
- **Async-aware** — `flush()` / `close()` wait for pending writes
- **Never throws** — failures in processors or transports go to `onError`
- ESM + CJS, full TypeScript types

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
  db.error('Query failed', { error: err })
}

await logger.close()
```

```
2026-11-19T12:25:30.857Z INFO    [app] Server started {"port":3000}
2026-11-19T12:25:30.865Z INFO    [db] Connected {"pool":"main","password":"[REDACTED]"}
```

## Levels

`fatal` · `error` · `warn` · `info` · `http` · `verbose` · `debug` · `trace`. Use `silent` to disable output.

A record is written when its level is at or above the logger's level, and again at or above the transport's level.

```ts
logger.level = 'warn'
logger.isLevelEnabled('debug') // false
```

## Options

| Option | Type | Default |
|---|---|---|
| `level` | `LevelOrSilent` | `'info'` |
| `context` | `string` | — |
| `meta` | `Record<string, unknown>` | `{}` |
| `transports` | `Transport[]` | `[new ConsoleTransport()]` |
| `processors` | `Processor[]` | `[]` |
| `redact` | `RedactOptions \| false` | default keys and patterns |
| `onError` | `(error, source, record?) => void` | `console.error` |

## Pipeline

```
log() → level check → build record → processors → redact → transports
```

A processor returns a new record, or `null` to drop it. If a processor throws, the record is dropped, so a failing step never leaks unredacted data.

```ts
import { Filter, Enrich } from '@olog-js/core'

new Logger({
  processors: [
    Filter((r) => r.context !== 'healthcheck'),
    Enrich(() => ({ hostname: 'api-1' })),
  ],
})
```

## Formatters and transports

```ts
import { ConsoleTransport, Json, Pretty } from '@olog-js/core'

new Logger({
  transports: [
    new ConsoleTransport({ format: Pretty({ colors: true }) }),
    new ConsoleTransport({ name: 'json', level: 'error', format: Json() }),
  ],
})
```

A custom transport is any object that implements `Transport`:

```ts
const http: Transport = {
  name: 'http',
  level: 'warn',
  log: async (record) => { await fetch(url, { method: 'POST', body: Json()(record) }) },
}
```

## Redaction

On by default. Matching keys are replaced at any depth, including inside `Map`, arrays and errors. Patterns are replaced inside the message and every string value.

```ts
new Logger({
  redact: {
    keys: ['password', /token/i, 'cardNumber'],
    patterns: [/\bBearer\s+\S+/gi],
    censor: '***',
  },
})
```

Pass `redact: false` to turn it off.

## Shutdown

```ts
await logger.flush() // wait for pending async writes
await logger.close() // flush, then close every transport

await using logger = new Logger() // closes automatically
```

## License

MIT
