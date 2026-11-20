import { Inject } from '@nestjs/common'

import { OlogRootToken } from './modules/tokens'

export { OlogModule } from './olog.module'
export { OlogService } from './olog.service'
export { OlogLogger } from './olog.logger'
export { OlogHttpMiddleware } from './http.middleware'
export { OlogRootToken, OlogOptionsToken } from './modules/tokens'
export { RequestMeta, SetRequestMeta } from './modules/context'

export type { OlogExcludeRoute, OlogHttpOptions, OlogModuleAsyncOptions, OlogModuleOptions } from './types/options'

export const InjectRootLogger = (): ParameterDecorator => Inject(OlogRootToken)
