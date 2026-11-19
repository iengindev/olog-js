import { ConsoleTransport } from '../utils/console'

import type { LoggerOptions, Transport } from '../types/logger'

export interface ResolvedTransports {
  transports: Transport[]
  console: Transport | undefined
}

export const IsConsoleTransport = (transport: Transport): boolean => transport.kind === 'console'

export const ResolveTransports = (options: Pick<LoggerOptions, 'transports' | 'console'>): ResolvedTransports => {
  const Given = options.transports ?? []
  const Existing = Given.find(IsConsoleTransport)

  if (Existing !== undefined || options.console === false) {
    return {
      transports: [...Given],
      console: Existing,
    }
  }

  const Created = new ConsoleTransport(options.console)

  return {
    transports: [Created, ...Given],
    console: Created,
  }
}
