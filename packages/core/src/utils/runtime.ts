interface RuntimeGlobal {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Bun?: {
    version: string
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Deno?: {
    version: {
      deno: string
    }
  }
  navigator?: {
    userAgent: string
  }
  process?: {
    versions?: Record<string, string | undefined>
    env?: Record<string, string | undefined>
    platform?: string
    arch?: string
    pid?: number
    stdout?: {
      isTTY?: boolean
    }
  }
}

const Root = globalThis as unknown as RuntimeGlobal

export interface RuntimeInfo {
  name: string
  version: string
  platform?: string
  pid?: number
}

export const Env = (key: string): string | undefined => {
  try {
    return Root.process?.env?.[key]
  } catch {
    return undefined
  }
}

const IsSet = (key: string): boolean => {
  const Value = Env(key)

  return Value !== undefined && Value !== '' && Value !== '0'
}

const DetectName = (): Pick<RuntimeInfo, 'name' | 'version'> => {
  const Versions = Root.process?.versions

  if (Root.Bun !== undefined) {
    return {
      name: 'Bun',
      version: Root.Bun.version,
    }
  }

  if (Root.Deno !== undefined) {
    return {
      name: 'Deno',
      version: Root.Deno.version.deno,
    }
  }

  if (Versions?.electron !== undefined) {
    return {
      name: 'Electron',
      version: Versions.electron,
    }
  }

  if (Versions?.node !== undefined) {
    return {
      name: 'Node.js',
      version: Versions.node,
    }
  }

  if (Root.navigator !== undefined) {
    return {
      name: 'Browser',
      version: '',
    }
  }

  return {
    name: 'unknown',
    version: '',
  }
}

export const DetectRuntime = (): RuntimeInfo => {
  const Info: RuntimeInfo = DetectName()
  const Proc = Root.process

  if (Proc?.platform !== undefined) {
    Info.platform = [Proc.platform, Proc.arch ?? ''].join(' ').trim()
  }

  if (Proc?.pid !== undefined) {
    Info.pid = Proc.pid
  }

  return Info
}

export const SupportsColor = (): boolean => {
  if (IsSet('NO_COLOR')) {
    return false
  }

  if (IsSet('FORCE_COLOR')) {
    return true
  }

  return Root.process?.stdout?.isTTY === true
}
