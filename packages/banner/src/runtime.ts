type Global = {
  Bun?: {
    version:    string
  }
  Deno?: {
    version: {
      deno:     string
    }
  }
  navigator?: {
    userAgent:  string
  }
  process?: {
    versions?:  Record<string, string | undefined>
    env?:       Record<string, string | undefined>
    platform?:  string
    arch?:      string
    pid?:       number
    stdout?: {
      isTTY?:   boolean
    }
  }
}

const G = globalThis as unknown as Global

export interface RuntimeInfo {
  name:       string
  version:    string
  platform?:  string
  pid?:       number
}

export const Env = (key: string): string | undefined => G.process?.env?.[key]

export const DetectRuntime = (): RuntimeInfo => {
  const p = G.process
  const base = {
    platform: p?.platform ? [p.platform, p.arch ?? ''].join(' ').trim() : undefined,
    pid: p?.pid,
  }

  if (G.Bun) {
    return {
      name: 'Bun',
      version: G.Bun.version,
      ...base,
    }
  }

  if (G.Deno) {
    return {
      name: 'Deno',
      version: G.Deno.version.deno,
      ...base,
    }
  }

  if (p?.versions?.electron) {
    return {
      name: 'Electron',
      version: p.versions.electron,
      ...base,
    }
  }

  if (p?.versions?.node) {
    return {
      name: 'Node.js',
      version: p.versions.node,
      ...base,
    }
  }

  if (G.navigator) {
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

export const SupportsColor = (): boolean => {
  if (Env('NO_COLOR')) {
    return false
  }

  if (Env('FORCE_COLOR')) {
    return true
  }

  return Boolean(G.process?.stdout?.isTTY)
}
