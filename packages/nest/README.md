<div align="center">

# @olog-js/nest

**NestJS integration for [olog-js](https://github.com/iengindev/olog-js).**

Module · LoggerService · per-class loggers · request context · HTTP logging

[![npm](https://img.shields.io/npm/v/@olog-js/nest?color=00afff)](https://www.npmjs.com/package/@olog-js/nest)
[![license](https://img.shields.io/badge/license-MIT-8a5cf6)](../../LICENSE)

NestJS 10 · 11 — Express · Fastify

</div>

## Features

- **`OlogModule`**: a global module with `forRoot()` and `forRootAsync()`, closes the logger on shutdown
- **`OlogService`**: Nest's own logs (`NestFactory`, `RouterExplorer`, `ExceptionsHandler`) go through olog
- **`OlogLogger`**: inject it into any class, and the context becomes the class name automatically
- **Request context**: a `requestId` is added to every record logged during a request, from any service
- **HTTP logging**: method, URL, status and duration for each request, with the level chosen by status

## Install

```bash
npm install @olog-js/core @olog-js/nest
```

`@olog-js/core`, `@nestjs/common` and `@nestjs/core` are peer dependencies.

## Quick start

**app.module.ts**

```ts
import { Module } from '@nestjs/common'
import { OlogModule } from '@olog-js/nest'

@Module({
  imports: [
    OlogModule.forRoot({ level: 'debug' }),
  ],
})
export class AppModule {}
```

**main.ts**

```ts
import { NestFactory } from '@nestjs/core'
import { OlogService } from '@olog-js/nest'
import { AppModule } from './app.module'

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })

  app.useLogger(app.get(OlogService))
  app.enableShutdownHooks()

  await app.listen(3000)
}

void bootstrap()
```

`bufferLogs: true` holds Nest's startup logs until `useLogger()` is called, so they go through olog too. `enableShutdownHooks()` lets `SIGTERM` close the logger and flush pending writes.

**users.service.ts**

```ts
import { Injectable } from '@nestjs/common'
import { OlogLogger } from '@olog-js/nest'

@Injectable()
export class UsersService {
  constructor(private readonly logger: OlogLogger) {}

  findOne(id: string) {
    this.logger.info('Loading user', { id })
  }
}
```

```
2026-11-20T10:00:00.000Z INFO    [NestApplication] Nest application successfully started
2026-11-20T10:00:01.120Z INFO    [UsersService] Loading user {"requestId":"5f1c…","id":"42"}
2026-11-20T10:00:01.134Z HTTP    [HTTP] GET /users/42 200 14ms {"requestId":"5f1c…","method":"GET",…}
```

## Configuration

`forRoot()` accepts every [`@olog-js/core` option](../core#options), plus `http`:

```ts
import { FileTransport } from '@olog-js/transport-file'

OlogModule.forRoot({
  level: 'info',
  transports: [new FileTransport({ path: 'logs/app.log', interval: 'daily', maxFiles: 14 })],
  redact: { keys: ['password', /token/i] },
  http: { exclude: ['health'] },
})
```

### Async configuration

```ts
import { ConfigModule, ConfigService } from '@nestjs/config'

OlogModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    level: config.get('LOG_LEVEL', 'info'),
  }),
})
```

## Loggers

### `OlogLogger`: for your code

A transient provider: each class that injects it gets its own instance, and the context is set to the class name.

```ts
this.logger.info('Order created', { orderId })
this.logger.error('Payment failed', { error: err })
this.logger.child({ context: 'Payments' }).warn('Retrying')
this.logger.isLevelEnabled('debug')
```

Methods: `fatal`, `error`, `warn`, `info`, `http`, `verbose`, `debug`, `trace`, `log(level, …)`, `isLevelEnabled`, `child`. The underlying core logger is available as `logger.logger`.

### `OlogService`: for Nest

Implements Nest's `LoggerService`. Pass it to `app.useLogger()`. It maps Nest's calls to olog:

| Nest | olog |
|---|---|
| `log(message, context)` | `info`, context from the last argument |
| `error(message, stack, context)` | `error`, the stack is restored as `error` |
| `warn` / `debug` / `verbose` / `fatal` | same level |
| `setLogLevels(levels)` | the most verbose of the given levels becomes the threshold |

### The root logger

```ts
import { InjectRootLogger } from '@olog-js/nest'
import type { Logger } from '@olog-js/core'

constructor(@InjectRootLogger() private readonly logger: Logger) {}
```

## Request context

Every HTTP request runs in its own context. Anything logged while handling it gets the `requestId`, including logs from services, guards and interceptors.

Add your own fields with `SetRequestMeta`, for example after authentication:

```ts
import { SetRequestMeta } from '@olog-js/nest'

SetRequestMeta({ userId: user.id, tenant: user.tenantId })
```

Read the current fields with `RequestMeta()`.

The id comes from the `x-request-id` header when it looks safe (letters, digits, `_`, `.`, `-`, up to 128 characters). Otherwise a UUID is generated. The id is also set on the response header.

## HTTP logging

On by default. Each finished request is logged once:

| Status | Level |
|---|---|
| 5xx | `error` |
| 4xx | `warn` |
| other | `http.level`, `info` by default |

Fields: `requestId`, `method`, `url`, `statusCode`, `durationMs`, and `aborted: true` when the client disconnects before the response.

```ts
import { RequestMethod } from '@nestjs/common'

OlogModule.forRoot({
  http: {
    exclude: ['health', { path: 'metrics', method: RequestMethod.GET }],
    header: 'x-correlation-id',
    level: 'http',
  },
})

OlogModule.forRoot({ http: false }) // no HTTP logging and no request context
```

Successful requests are logged at `info` by default. Set `http.level: 'http'` to hide them at the default `info` level and show them only when you need them, while errors and warnings stay visible.

## Notes

- **Your app needs decorator metadata.** Injecting `OlogLogger` by type requires `experimentalDecorators` and `emitDecoratorMetadata` in your `tsconfig`, as in any Nest project. The package itself does not rely on them.
- **Failed requests show up twice**: once from `ExceptionsHandler` with the stack, once as the `[HTTP] … 500` line. Drop one with a `Filter` processor if you prefer.
- **Child levels.** `setLogLevels()` updates loggers used by Nest, but `OlogLogger` instances keep the level they had when they were created.

## License

[MIT](../../LICENSE)
