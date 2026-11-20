import { AsyncLocalStorage } from 'node:async_hooks'

import type { Meta } from '@olog-js/core'

export const RequestStore = new AsyncLocalStorage<Meta>()
export const RequestMeta = (): Meta => RequestStore.getStore() ?? {}

export const SetRequestMeta = (fields: Meta): void => {
  const Store = RequestStore.getStore()

  if (Store !== undefined) {
    Object.assign(Store, fields)
  }
}
