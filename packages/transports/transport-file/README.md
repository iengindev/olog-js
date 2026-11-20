<div align="center">

# @olog-js/transport-file

**File transport for [olog-js](https://github.com/iengindev/olog-js) with size and time rotation.**

[![npm](https://img.shields.io/npm/v/@olog-js/transport-file?color=00afff)](https://www.npmjs.com/package/@olog-js/transport-file)
[![license](https://img.shields.io/badge/license-MIT-8a5cf6)](../../../LICENSE)

Node.js · Bun · Deno

</div>

## Install

```bash
npm install @olog-js/core @olog-js/transport-file
```

`@olog-js/core` is a peer dependency, so your logger and the transport share one copy.

## Quick start

```ts
import { Logger } from '@olog-js/core'
import { FileTransport } from '@olog-js/transport-file'

const logger = new Logger({
  transports: [
    new FileTransport({ path: 'logs/app.log' }),
  ],
})

logger.info('Server started', { port: 3000 })

await logger.close() // flush the buffer and close the file
```

Console output stays on: the logger adds its console transport automatically.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `path` | `string` | required | Active log file. Missing folders are created |
| `name` | `string` | `'file'` | Transport name, used in `onError` sources |
| `level` | `LevelOrSilent` | logger's level | Minimum level for this file |
| `format` | `Formatter` | `Json()` | How each record becomes a line |
| `maxSize` | `number \| string` | — | Rotate when the file would exceed this size: bytes or `'500KB'`, `'10MB'`, `'1GB'` |
| `interval` | `'daily' \| 'hourly'` | — | Rotate when the day or hour changes (local time) |
| `maxFiles` | `number` | keep all | How many rotated files to keep |
| `compress` | `boolean` | `false` | Gzip rotated files |
| `mode` | `number` | `0o640` | Permissions for a newly created file |

## Rotation

Size and time rotation can be combined. The active file keeps its name, and rotated files get the period and an index:

```
logs/
├── app.log                  ← active
├── app.2026-11-20.1.log.gz
├── app.2026-11-20.2.log.gz
└── app.2026-11-19.1.log.gz
```

```ts
new FileTransport({
  path: 'logs/app.log',
  maxSize: '10MB',
  interval: 'daily',
  maxFiles: 14,
  compress: true,
})
```

- After a restart the transport continues the existing file and keeps its size and period, so rotation stays correct.
- An empty file is never rotated.
- A single batch larger than `maxSize` is still written whole, and the file rotates before the next batch.
- `maxFiles` keeps the newest files by modification time, and removes older ones after each rotation.

## Recipes

### Errors in a separate file

```ts
import { Pretty } from '@olog-js/core'

new Logger({
  transports: [
    new FileTransport({ path: 'logs/app.log' }),
    new FileTransport({
      name: 'errors',
      path: 'logs/error.log',
      level: 'error',
      format: Pretty({ colors: false }),
    }),
  ],
})
```

### File only, no console

```ts
new Logger({
  console: false,
  transports: [new FileTransport({ path: 'logs/app.log' })],
})
```

### Graceful shutdown

Records are buffered in memory and written in batches. Close the logger before the process exits, or the last records are lost:

```ts
const shutdown = async () => {
  await logger.close()
  process.exit(0)
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
```

## How it works

- **Batching**: `log()` only pushes a line to a buffer. Everything logged in the same tick goes to disk in one write.
- **Backpressure**: when the stream is full, the transport waits for `drain`, and new records keep collecting in the buffer.
- **Errors**: write and rotation failures go to the logger's `onError` with source `transport:<name>`. The broken stream is reset, and the next batch reopens the file.
- **Banner**: the transport has `kind: 'file'` and no `write()`, so the startup banner never goes to the file.

## Limitations

- **One writer per file.** Several processes writing and rotating the same file will conflict. In a cluster, give each process its own path, for example `` `logs/app-${process.pid}.log` ``.
- **Rotation pauses writing.** Renaming, compression and pruning run before the next batch, and records wait in memory meanwhile. This is fine for typical sizes, but compressing very large files takes noticeable time.
- **Server runtimes only.** The transport needs `node:fs`, which Node.js, Bun and Deno provide. It does not work in browsers.

## Utilities

```ts
import { ParseSize } from '@olog-js/transport-file'

ParseSize('10MB') // 10485760
```

## License

[MIT](../../../LICENSE)
