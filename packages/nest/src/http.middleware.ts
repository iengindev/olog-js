import { randomUUID } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'

import { RequestStore } from './modules/context'
import { OlogOptionsToken, OlogRootToken } from './modules/tokens'

import type { NestMiddleware } from '@nestjs/common'
import type { LevelName, Logger } from '@olog-js/core'

import type { OlogModuleOptions } from './types/options'

interface HttpRequest {
  method?: string
  url?: string
  originalUrl?: string
  headers: Record<string, string | string[] | undefined>
}

interface HttpResponse {
  statusCode: number
  writableFinished: boolean
  setHeader(name: string, value: string): unknown
  once(event: 'close', listener: () => void): unknown
}

const SafeId = /^[\w.-]{1,128}$/

const StatusLevel = (status: number, success: LevelName): LevelName => {
  if (status >= 500) {
    return 'error'
  }

  if (status >= 400) {
    return 'warn'
  }

  return success
}

const ResolveId = (value: string | string[] | undefined): string => {
  const Raw = Array.isArray(value) ? value[0] : value

  return Raw !== undefined && SafeId.test(Raw) ? Raw : randomUUID()
}

@Injectable()
export class OlogHttpMiddleware implements NestMiddleware<HttpRequest, HttpResponse> {
  private readonly $logger: Logger
  private readonly $header: string
  private readonly $level: LevelName

  constructor(@Inject(OlogRootToken) root: Logger, @Inject(OlogOptionsToken) options: OlogModuleOptions) {
    const Http = typeof options.http === 'object' ? options.http : {}

    this.$logger = root.child({ context: 'HTTP' })
    this.$header = (Http.header ?? 'x-request-id').toLowerCase()
    this.$level = Http.level ?? 'info'
  }

  use(req: HttpRequest, res: HttpResponse, next: () => void): void {
    const RequestId = ResolveId(req.headers[this.$header])
    const Method = req.method ?? 'GET'
    const Url = req.originalUrl ?? req.url ?? '/'
    const Start = performance.now()

    res.setHeader(this.$header, RequestId)

    res.once('close', () => {
      const Status = res.statusCode
      const Duration = Math.round(performance.now() - Start)

      this.$logger.log(StatusLevel(Status, this.$level), `${Method} ${Url} ${String(Status)} ${String(Duration)}ms`, {
        requestId: RequestId,
        method: Method,
        url: Url,
        statusCode: Status,
        durationMs: Duration,
        ...(res.writableFinished ? {} : { aborted: true }),
      })
    })

    RequestStore.run({ requestId: RequestId }, next)
  }
}
