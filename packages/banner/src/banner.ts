import { CreatePalette, type Paint } from './ansi'
import { DetectRuntime, Env, SupportsColor } from './runtime'

export interface BannerOptions {
  name?:          string
  version?:       string
  description?:   string
  env?:           string
  fields?:        Record<string, string | number | boolean | undefined>
  art?:           string | false
  color?:         boolean
  system?:        boolean
}

export interface PrintBannerOptions extends BannerOptions {
  enabled?:   boolean
  once?:      boolean
  print?:     (text: string) => void
}

const DEFAULT_ART = `
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⠀⠀⠀⠀⠀
⢸⠉⣹⠋⠉⢉⡟⢩⢋⠋⣽⡻⠭⢽⢉⠯⠭⠭⠭⢽⡍⢹⡍⠙⣯⠉⠉⠉⠉⠉⣿⢫⠉⠉⠉⢉⡟⠉⢿⢹⠉⢉⣉⢿⡝⡉⢩⢿⣻⢍⠉⠉⠩⢹⣟⡏⠉⠹⡉⢻⡍⡇
⢸⢠⢹⠀⠀⢸⠁⣼⠀⣼⡝⠀⠀⢸⠘⠀⠀⠀⠀⠈⢿⠀⡟⡄⠹⣣⠀⠀⠐⠀⢸⡘⡄⣤⠀⡼⠁⠀⢺⡘⠉⠀⠀⠀⠫⣪⣌⡌⢳⡻⣦⠀⠀⢃⡽⡼⡀⠀⢣⢸⠸⡇
⢸⡸⢸⠀⠀⣿⠀⣇⢠⡿⠀⠀⠀⠸⡇⠀⠀⠀⠀⠀⠘⢇⠸⠘⡀⠻⣇⠀⠀⠄⠀⡇⢣⢛⠀⡇⠀⠀⣸⠇⠀⠀⠀⠀⠀⠘⠄⢻⡀⠻⣻⣧⠀⠀⠃⢧⡇⠀⢸⢸⡇⡇
⢸⡇⢸⣠⠀⣿⢠⣿⡾⠁⠀⢀⡀⠤⢇⣀⣐⣀⠀⠤⢀⠈⠢⡡⡈⢦⡙⣷⡀⠀⠀⢿⠈⢻⣡⠁⠀⢀⠏⠀⠀⠀⢀⠀⠄⣀⣐⣀⣙⠢⡌⣻⣷⡀⢹⢸⡅⠀⢸⠸⡇⡇
⢸⡇⢸⣟⠀⢿⢸⡿⠀⣀⣶⣷⣾⡿⠿⣿⣿⣿⣿⣿⣶⣬⡀⠐⠰⣄⠙⠪⣻⣦⡀⠘⣧⠀⠙⠄⠀⠀⠀⠀⠀⣨⣴⣾⣿⠿⣿⣿⣿⣿⣿⣶⣯⣿⣼⢼⡇⠀⢸⡇⡇⠇
⢸⢧⠀⣿⡅⢸⣼⡷⣾⣿⡟⠋⣿⠓⢲⣿⣿⣿⡟⠙⣿⠛⢯⡳⡀⠈⠓⠄⡈⠚⠿⣧⣌⢧⠀⠀⠀⠀⠀⣠⣺⠟⢫⡿⠓⢺⣿⣿⣿⠏⠙⣏⠛⣿⣿⣾⡇⢀⡿⢠⠀⡇
⢸⢸⠀⢹⣷⡀⢿⡁⠀⠻⣇⠀⣇⠀⠘⣿⣿⡿⠁⠐⣉⡀⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠉⠓⠳⠄⠀⠀⠀⠀⠋⠀⠘⡇⠀⠸⣿⣿⠟⠀⢈⣉⢠⡿⠁⣼⠁⣼⠃⣼⠀⡇
⢸⠸⣀⠈⣯⢳⡘⣇⠀⠀⠈⡂⣜⣆⡀⠀⠀⢀⣀⡴⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢽⣆⣀⠀⠀⠀⣀⣜⠕⡊⠀⣸⠇⣼⡟⢠⠏⠀⡇
⢸⠀⡟⠀⢸⡆⢹⡜⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⠋⣾⡏⡇⡎⡇⠀⡇
⢸⠀⢃⡆⠀⢿⡄⠑⢽⣄⠀⠀⠀⢀⠂⠠⢁⠈⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠠⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠄⡐⢀⠂⠀⠀⣠⣮⡟⢹⣯⣸⣱⠁⠀⡇
⠈⠉⠉⠉⠉⠉⠉⠉⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠉⠉⠉⠉⠉⠉⠉⠁`

const GRADIENT = [51, 45, 39, 33, 99, 135]
const PRINTED_KEY = Symbol.for('olog.banner.printed')

type BannerGlobal = typeof globalThis & {
  [PRINTED_KEY]?: boolean
}

type Segment = [text: string, paint?: Paint]

const Len = (s: string): number => [...s].length
const LineLen = (line: Segment[]): number => line.reduce((n, [t]) => n + Len(t), 0)

export const RenderBanner = (o: BannerOptions = {}): string => {
  const c = CreatePalette(o.color ?? SupportsColor())
  const out: string[] = []

  const art = o.art === false ? [] : (o.art ?? DEFAULT_ART).split('\n').filter((l) => l.trim())

  art.forEach((line, i) => {
    const paint = c.color256(GRADIENT[Math.min(i, GRADIENT.length - 1)] ?? 39)

    out.push([' ', paint(line)].join(' '))
  })

  const name = o.name ?? Env('npm_package_name') ?? 'app'
  const version = o.version ?? Env('npm_package_version')

  const rows: [string, string][] = [['Environment', o.env ?? Env('NODE_ENV') ?? 'development']]

  if (o.system) {
    const rt = DetectRuntime()

    rows.push(['Runtime', `${rt.name} ${rt.version}`.trim()])

    if (rt.platform) {
      rows.push(['Platform', rt.platform])
    }

    if (rt.pid) {
      rows.push(['PID', String(rt.pid)])
    }

    rows.push(['Started', new Date().toLocaleString('sv-SE')])
  }

  for (const [k, v] of Object.entries(o.fields ?? {})) {
    if (v !== undefined) {
      rows.push([k, String(v)])
    }
  }

  const labelWidth = Math.max(...rows.map(([k]) => Len(k))) + 3
  const lines: Segment[][] = [
    [[version ? `${name} v${version}` : name, c.bold]],
    ...(o.description ? [[[o.description, c.dim] as Segment]] : []),
    [],
    ...rows.map(([k, v]): Segment[] => [[k + ' '.repeat(labelWidth - Len(k)), c.dim], [v]]),
  ]

  const border = c.color256(39)
  const inner = Math.max(...lines.map(LineLen)) + 4

  out.push([' ', border(['╭', '-'.repeat(inner), '╮'].join(''))].join(' '))

  for (const line of lines) {
    const body = line.map(([t, paint]) => (paint ? paint(t) : t)).join('')

    out.push([' ', border('│'), [body, ' '.repeat(inner - 1 - LineLen(line)), border('│')].join('')].join(' '))
  }

  out.push([' ', border(['╰', '-'.repeat(inner), '╯'].join(''))].join(' '))

  return ['\n', out.join('\n'), '\n'].join('')
}

export const PrintBanner = (options: PrintBannerOptions = {}): void => {
  const { enabled = true, once = true, print = console.log } = options

  if (!enabled) return

  const root = globalThis as BannerGlobal

  if (once && root[PRINTED_KEY]) {
    return
  }

  root[PRINTED_KEY] = true

  print(RenderBanner(options))
}
