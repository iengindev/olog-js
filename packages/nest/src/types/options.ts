import type { FactoryProvider, ModuleMetadata, MiddlewareConsumer } from '@nestjs/common'
import type { LevelName, LoggerOptions } from '@olog-js/core'

export type OlogExcludeRoute = Parameters<ReturnType<MiddlewareConsumer['apply']>['exclude']>[number]

export interface OlogHttpOptions {
  exclude?: OlogExcludeRoute[]
  header?: string
  level?: LevelName
}

export interface OlogModuleOptions extends LoggerOptions {
  http?: OlogHttpOptions | boolean
}

export interface OlogModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  inject?: FactoryProvider['inject']
  useFactory: (...args: never[]) => OlogModuleOptions | Promise<OlogModuleOptions>
}
