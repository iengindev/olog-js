<div align="center">

# olog-js

**Modular, type-safe logger for every JavaScript runtime.**

Node.js · Bun · Deno · Browser · Electron

[![npm](https://img.shields.io/npm/v/@olog-js/core?color=00afff&label=%40olog-js%2Fcore)](https://www.npmjs.com/package/@olog-js/core)
[![license](https://img.shields.io/badge/license-MIT-8a5cf6)](./LICENSE)
[![types](https://img.shields.io/badge/types-TypeScript-3178c6)](#)
[![deps](https://img.shields.io/badge/core%20dependencies-0-17c964)](#)

</div>

## Features

- **Zero dependencies**: the core runs anywhere `globalThis` and `console` exist
- **Transports**: console out of the box, plus any number of your own, each with its own level
- **Processors**: filter, enrich or transform records in a pipeline
- **Secret redaction**: on by default, runs last, fails closed
- **Safe serialization**: circular references, `BigInt`, `Map`/`Set`, `Error` with `cause`
- **Child loggers** with their own context and meta
- **Startup banner** with runtime info, printed through the console transport
- **Never throws**: failures go to `onError`, not to your app
- ESM + CJS, full TypeScript types

## Packages

| Package | Description | Status |
|---|---|---|
| [`@olog-js/core`](./packages/core) | Logger, pipeline, formatters, console transport, banner | ✅ |
| [`@olog-js/nest`](./packages//nest) | NestJS integration for olog-js: module, LoggerService, request context and HTTP logging | ✅ |
| [`@olog-js/transport-file`](./packages/transports/transport-file) | File transport with size and time rotation | ✅ |
| `@olog-js/transport-*` | stream, HTTP transports, more | 🚧 planned |

## Quick start

```bash
npm install @olog-js/core
```

```ts
import { Logger } from '@olog-js/core'

const logger = new Logger({ level: 'debug', context: 'app' })

logger.info('Server started', { port: 3000 })
logger.child({ context: 'db' }).info('Connected', { password: 'hunter2' }) // → [REDACTED]

await logger.close()
```

Full documentation: **[packages/core](./packages/core#readme)**

## Development

```bash
pnpm install
pnpm build      # build every package
pnpm lint       # eslint across the workspace

pnpm --filter @olog-js/testing start   # run the playground app
```

```
apps/
  testing/        playground app
packages/
  core/           @olog-js/core
  nest/           @olog-js/nest
  transports/     @olog-js/transports/transport-file
                  @olog-js/transports/* (planned)
```

## Roadmap

- [ ] `@olog-js/transport-*`: stream with backpressure, HTTP with batching and retries
- [ ] Custom levels
- [ ] Lazy messages for expensive debug output
- [ ] Test suite and benchmarks

## License

[MIT](./LICENSE)
