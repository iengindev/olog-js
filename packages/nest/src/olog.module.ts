import { Global, Inject, Module } from '@nestjs/common'
import { Enrich, Logger } from '@olog-js/core'

import { OlogHttpMiddleware } from './http.middleware'
import { RequestMeta } from './modules/context'
import { OlogOptionsToken, OlogRootToken } from './modules/tokens'
import { OlogLogger } from './olog.logger'
import { OlogService } from './olog.service'

import type { DynamicModule, MiddlewareConsumer, NestModule, OnApplicationShutdown, Provider } from '@nestjs/common'

import type { OlogModuleAsyncOptions, OlogModuleOptions } from './types/options'

const RootProvider: Provider = {
  provide: OlogRootToken,
  inject: [OlogOptionsToken],
  useFactory: (options: OlogModuleOptions): Logger => new Logger({
    ...options,
    processors: [Enrich(RequestMeta), ...(options.processors ?? [])],
  }),
}

const Providers = (options: Provider): Provider[] => [options, RootProvider, OlogService, OlogLogger]
const Exports = [OlogRootToken, OlogService, OlogLogger]

@Global()
@Module({})
export class OlogModule implements NestModule, OnApplicationShutdown {
  private readonly $root: Logger
  private readonly $options: OlogModuleOptions

  constructor(@Inject(OlogRootToken) root: Logger, @Inject(OlogOptionsToken) options: OlogModuleOptions) {
    this.$root = root
    this.$options = options
  }

  static forRoot(options: OlogModuleOptions = {}): DynamicModule {
    return {
      module: OlogModule,
      global: true,
      providers: Providers({
        provide: OlogOptionsToken,
        useValue: options,
      }),
      exports: Exports,
    }
  }

  static forRootAsync(options: OlogModuleAsyncOptions): DynamicModule {
    return {
      module: OlogModule,
      global: true,
      imports: options.imports ?? [],
      providers: Providers({
        provide: OlogOptionsToken,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      }),
      exports: Exports,
    }
  }

  configure(consumer: MiddlewareConsumer): void {
    const Http = this.$options.http ?? true

    if (Http === false) {
      return
    }

    const Exclude = Http === true ? [] : (Http.exclude ?? [])

    consumer.apply(OlogHttpMiddleware).exclude(...Exclude).forRoutes('*')
  }

  async onApplicationShutdown(): Promise<void> {
    await this.$root.close()
  }
}
