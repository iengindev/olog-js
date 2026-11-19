export type Paint = (text: string) => string

export interface Palette {
  bold: Paint
  dim: Paint
  code: (sgr: string) => Paint
  color256: (n: number) => Paint
}

const Wrap = (sgr: string): Paint => (text) => `\x1b[${sgr}m${text}\x1b[0m`
const None: Paint = (text) => text

export const CreatePalette = (enabled: boolean): Palette => ({
  bold: enabled ? Wrap('1') : None,
  dim: enabled ? Wrap('2') : None,
  code: (sgr) => (enabled ? Wrap(sgr) : None),
  color256: (n) => (enabled ? Wrap(`38;5;${String(n)}`) : None),
})
