export type Paint = (s: string) => string

const Wrap = (code: string): Paint => (s) => `\x1b[${code}m${s}\x1b[0m`
const None: Paint = (s) => s

export const CreatePalette = (enabled: boolean) => ({
  bold: enabled ? Wrap('1') : None,
  dim: enabled ? Wrap('2') : None,
  color256: (n: number): Paint => (enabled ? Wrap(`38;5;${n}`) : None),
})
