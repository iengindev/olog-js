import { CreatePalette, type Paint, type Palette } from './ansi'
import { DetectRuntime, Env, SupportsColor } from './runtime'

export interface BannerOptions {
  name?: string
  version?: string
  description?: string
  env?: string
  fields?: Record<string, string | number | boolean | undefined>
  art?: string | false
  color?: boolean
  system?: boolean
}

export interface PrintBannerOptions extends BannerOptions {
  enabled?: boolean
  once?: boolean
  print?: (text: string) => void
}

const DefaultArt = `
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

const Gradient = [51, 45, 39, 33, 99, 135]
const PrintedKey = Symbol.for('olog.banner.printed')

type BannerGlobal = typeof globalThis & {
  [PrintedKey]?: boolean
}

type Segment = [text: string, paint?: Paint]
type Row = [label: string, value: string]

const Len = (text: string): number => text.split('').length
const LineLen = (line: readonly Segment[]): number => line.reduce((sum, [text]) => sum + Len(text), 0)

const Title = (options: BannerOptions): string => {
  const Name = options.name ?? Env('npm_package_name') ?? 'app'
  const Version = options.version ?? Env('npm_package_version')

  return Version === undefined ? Name : `${Name} v${Version}`
}

const SystemRows = (): Row[] => {
  const Runtime = DetectRuntime()
  const Rows: Row[] = [['Runtime', `${Runtime.name} ${Runtime.version}`.trim()]]

  if (Runtime.platform !== undefined) {
    Rows.push(['Platform', Runtime.platform])
  }

  if (Runtime.pid !== undefined) {
    Rows.push(['PID', String(Runtime.pid)])
  }

  Rows.push(['Started', new Date().toLocaleString('sv-SE')])

  return Rows
}

const CollectRows = (options: BannerOptions): Row[] => {
  const Rows: Row[] = [['Environment', options.env ?? Env('NODE_ENV') ?? 'development']]

  if (options.system === true) {
    Rows.push(...SystemRows())
  }

  for (const [Key, Value] of Object.entries(options.fields ?? {})) {
    if (Value !== undefined) {
      Rows.push([Key, String(Value)])
    }
  }

  return Rows
}

const RenderArt = (art: string | false | undefined, colors: Palette): string[] => {
  if (art === false) {
    return []
  }

  return (art ?? DefaultArt).split('\n').filter((line) => line.trim() !== '').map((line, index) => `  ${colors.color256(Gradient[Math.min(index, Gradient.length - 1)] ?? 39)(line)}`)
}

export const RenderBanner = (options: BannerOptions = {}): string => {
  const Colors = CreatePalette(options.color ?? SupportsColor())
  const Rows = CollectRows(options)
  const LabelWidth = Math.max(...Rows.map(([label]) => Len(label))) + 3

  const Lines: Segment[][] = [
    [[Title(options), Colors.bold]],
    ...(options.description !== undefined ? [[[options.description, Colors.dim] as Segment]] : []),
    [],
    ...Rows.map(([label, value]): Segment[] => [[`${label}${' '.repeat(LabelWidth - Len(label))}`, Colors.dim], [value]]),
  ]

  const Border = Colors.color256(39)
  const Inner = Math.max(...Lines.map(LineLen)) + 4

  const Out = [
    ...RenderArt(options.art, Colors),
    `  ${Border(`╭${'─'.repeat(Inner)}╮`)}`,
    ...Lines.map((line) => {
      const Body = line.map(([text, paint]) => (paint === undefined ? text : paint(text))).join('')

      return `  ${Border('│')} ${Body}${' '.repeat(Inner - 1 - LineLen(line))}${Border('│')}`
    }),
    `  ${Border(`╰${'─'.repeat(Inner)}╯`)}`,
  ]

  return `\n${Out.join('\n')}\n`
}

export const PrintBanner = (options: PrintBannerOptions = {}): void => {
  const {
    enabled = true,
    once = true,
    print = (text: string) => {
      console.log(text)
    },
  } = options

  if (!enabled) {
    return
  }

  const Root = globalThis as BannerGlobal

  if (once && Root[PrintedKey] === true) {
    return
  }

  Root[PrintedKey] = true

  print(RenderBanner(options))
}
